
import React, { useState, useMemo } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer, Transaction, WaitlistEntry, InventoryItem } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDocs, query, where, increment } from "firebase/firestore";
import CustomerHistoryModal from './CustomerHistoryModal';

interface AdminCalendarProps {
  bookings: Booking[];
  services: Service[];
  customers: Customer[];
  transactions: Transaction[];
  waitlist: WaitlistEntry[];
  teamMembers: TeamMember[];
  inventory: InventoryItem[];
  settings?: SalonSettings;
  onUpdateStatus?: (id: string, status: any) => void;
  onUpdateInventory?: (id: string, data: Partial<InventoryItem>) => void;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, customers, transactions, waitlist, teamMembers, inventory, settings, onUpdateInventory }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(teamMembers[0]?.id || '');
  const [modal, setModal] = useState<{ open: boolean; hour: string; type: 'free' | 'occupied' | 'opened' }>({ open: false, hour: '', type: 'free' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const [manualTime, setManualTime] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState(selectedDate);
  const [bulkEndDate, setBulkEndDate] = useState(selectedDate);

  // State for product usage during completion
  const [usedProducts, setUsedProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [editingPriceValue, setEditingPriceValue] = useState<number | null>(null);

  // Added resetForm function to fix "Cannot find name 'resetForm'" error
  const resetForm = () => {
    setCustomerSearch('');
    setSelectedCustomerId('');
    setSelectedServiceId('');
    setManualPrice(0);
    setManualTime('');
  };

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const monthlyBookings = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    return bookings.filter(b => {
      if (b.status === 'open' || b.status === 'cancelled' || b.status === 'blocked') return false;
      const bDate = new Date(b.dateTime.replace(' ', 'T'));
      return bDate.getFullYear() === year && (bDate.getMonth() + 1) === month;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [bookings, selectedDate]);

  const selectedPro = useMemo(() => teamMembers.find(m => m.id === selectedProId), [teamMembers, selectedProId]);

  const timeSlots = useMemo(() => {
    const salonStart = settings?.businessHours?.start || "08:00";
    const salonEnd = settings?.businessHours?.end || "19:00";
    
    // Profissional pode ter horário próprio, mas respeitamos o limite do expediente do salão
    const rawStart = selectedPro?.businessHours?.start || salonStart;
    const rawEnd = selectedPro?.businessHours?.end || salonEnd;
    
    // Interseção: o mais tarde dos inícios e o mais cedo dos fins (expediente)
    const startMin = Math.max(timeToMinutes(rawStart), timeToMinutes(salonStart));
    const endMin = Math.min(timeToMinutes(rawEnd), timeToMinutes(salonEnd));
    
    const slots = [];
    for (let t = startMin; t < endMin; t += 30) {
      slots.push(minutesToTime(t));
    }
    return slots;
  }, [selectedPro, settings?.businessHours]);

  const getSlotData = (hour: string) => {
    const fullDateTime = `${selectedDate} ${hour}`;
    const currentTime = new Date(`${selectedDate}T${hour}`).getTime();

    const slotStart = currentTime;
    const slotEnd = currentTime + 30 * 60 * 1000;

    // Find ALL appointments that cover this slot
    const appointments = bookings.filter(b => {
      if (b.teamMemberId !== selectedProId || b.status === 'cancelled' || b.status === 'open' || b.status === 'blocked') return false;
      if (!b.dateTime.startsWith(selectedDate)) return false;
      
      const bStart = new Date(b.dateTime.replace(' ', 'T')).getTime();
      const bDuration = b.duration || 30;
      const bEnd = bStart + bDuration * 60 * 1000;
      
      // Overlap check: bStart < slotEnd && bEnd > slotStart
      return bStart < slotEnd && bEnd > slotStart;
    });

    if (appointments.length > 0) {
      const isExact = appointments.some(b => b.dateTime === fullDateTime);
      return { 
        type: 'occupied', 
        bookings: appointments,
        isDurationBlock: !isExact && appointments.every(b => b.dateTime !== fullDateTime)
      };
    }

    // 2. If no appointment, check for "open" slots (liberated for site)
    const openSlots = bookings.filter(b => b.dateTime === fullDateTime && b.teamMemberId === selectedProId && b.status === 'open');
    if (openSlots.length > 0) return { type: 'open', bookings: openSlots };

    return { type: 'locked' };
  };

  const handleOpenSlot = async (hour: string) => {
    if ((db as any)._isMock) return alert("Modo visual: Horário liberado simulado.");
    try {
      await addDoc(collection(db, "bookings"), {
        dateTime: `${selectedDate} ${hour}`,
        status: 'open',
        teamMemberId: selectedProId,
        teamMemberName: teamMembers.find(m => m.id === selectedProId)?.name,
        customerName: 'LIBERADO PARA CLIENTES',
        customerId: 'none',
        createdAt: new Date().toISOString()
      });
      alert("Horário liberado para clientes no site!");
      setModal({ open: false, hour: '', type: 'free' });
    } catch (e) {
      alert("Erro ao liberar horário.");
    }
  };

  const handleReleaseFullDay = async () => {
    if (!(db as any)._isMock) {
      const pro = teamMembers.find(m => m.id === selectedProId);
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
      
      if (pro?.offDays?.includes(dayOfWeek)) {
        if (!confirm(`Hoje é dia de folga de ${pro.name}. Deseja liberar a agenda mesmo assim?`)) return;
      }

      const salonStart = settings?.businessHours?.start || "08:00";
      const salonEnd = settings?.businessHours?.end || "19:00";
      const rawStart = pro?.businessHours?.start || salonStart;
      const rawEnd = pro?.businessHours?.end || salonEnd;
      
      const startMin = Math.max(timeToMinutes(rawStart), timeToMinutes(salonStart));
      const endMin = Math.min(timeToMinutes(rawEnd), timeToMinutes(salonEnd));
      const start = minutesToTime(startMin);
      const end = minutesToTime(endMin);

      if (!confirm(`Deseja liberar TODOS os horários de ${start} às ${end} para o dia ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}?`)) return;
      
      setIsProcessing(true);
      try {
        const batch = writeBatch(db);
        let count = 0;
        for (const hour of timeSlots) {
          const slot = getSlotData(hour);
          if (slot.type === 'locked') {
            const newDocRef = doc(collection(db, "bookings"));
            batch.set(newDocRef, {
              dateTime: `${selectedDate} ${hour}`,
              status: 'open',
              teamMemberId: selectedProId,
              teamMemberName: pro?.name || 'Profissional',
              customerName: 'LIBERADO PARA CLIENTES',
              customerId: 'none',
              createdAt: new Date().toISOString()
            });
            count++;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
        alert(`${count} horários liberados com sucesso!`);
      } catch (e) {
        console.error(e);
        alert("Erro ao liberar agenda.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBlockFullDay = async () => {
    if (!(db as any)._isMock) {
      if (!confirm("Deseja bloquear todos os horários ABERTOS deste dia? Agendamentos de clientes não serão afetados.")) return;
      
      setIsProcessing(true);
      try {
        const batch = writeBatch(db);
        const openBookings = bookings.filter(b => b.status === 'open' && b.dateTime.startsWith(selectedDate) && b.teamMemberId === selectedProId);
        openBookings.forEach(b => {
          batch.delete(doc(db, "bookings", b.id));
        });
        await batch.commit();
        alert(`${openBookings.length} horários bloqueados com sucesso.`);
      } catch (e) {
        console.error(e);
        alert("Erro ao bloquear horários.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleUpdatePrice = async (bookingId: string, newPrice: number) => {
    if ((db as any)._isMock) return;
    try {
      setIsProcessing(true);
      await updateDoc(doc(db, "bookings", bookingId), {
        originalPrice: newPrice,
        updatedAt: new Date().toISOString()
      });
      alert("Valor atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar valor:", error);
      alert("Erro ao atualizar valor.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSlot = async (bookingId: string) => {
    if ((db as any)._isMock) return;
    // Se for um slot apenas aberto, deletamos. Se for agendamento, cancelamos.
    const b = bookings.find(item => item.id === bookingId);
    if (b?.status === 'open') {
      await deleteDoc(doc(db, "bookings", bookingId));
    } else {
      await updateDoc(doc(db, "bookings", bookingId), { status: 'cancelled', cancelledAt: new Date().toISOString() });
    }
    setModal({ open: false, hour: '', type: 'free' });
  };

  const handleManualBooking = async (overrideHour?: string) => {
    const hour = overrideHour || manualTime || modal.hour;
    const customer = customers.find(c => c.id === selectedCustomerId);
    const service = services.find(s => s.id === selectedServiceId);
    if (!customer || !service) return alert("Selecione cliente e serviço.");
    if (hour === 'Extra' && !manualTime) return alert("Defina o horário do atendimento.");

    // Check for conflicts
    const newStart = new Date(`${selectedDate}T${hour}`).getTime();
    const newEnd = newStart + service.duration * 60 * 1000;

    const conflict = bookings.find(b => {
      if (b.teamMemberId !== selectedProId || b.status === 'cancelled' || b.status === 'open' || b.status === 'blocked') return false;
      if (!b.dateTime.startsWith(selectedDate)) return false;
      
      const bStart = new Date(b.dateTime.replace(' ', 'T')).getTime();
      const bDuration = b.duration || 30;
      const bEnd = bStart + bDuration * 60 * 1000;
      
      // Overlap check: newStart < bEnd && newEnd > bStart
      return newStart < bEnd && newEnd > bStart;
    });

    if (conflict) {
      if (!confirm(`Atenção: Este agendamento sobrepõe o atendimento de ${conflict.customerName} (${conflict.dateTime.split(' ')[1]}). Deseja continuar mesmo assim?`)) return;
    }

    try {
      if (!(db as any)._isMock) {
        await addDoc(collection(db, "bookings"), {
          customerId: customer.id,
          customerName: customer.name,
          serviceId: service.id,
          serviceName: service.name,
          teamMemberId: selectedProId,
          teamMemberName: teamMembers.find(m => m.id === selectedProId)?.name,
          dateTime: `${selectedDate} ${hour}`,
          duration: service.duration,
          originalPrice: manualPrice || service.price,
          status: 'scheduled',
          isManual: true,
          depositStatus: 'paid',
          agreedToCancellationPolicy: true,
          policyAgreedAt: new Date().toISOString()
        });

        // Remove from waitlist if exists
        try {
          const q = query(
            collection(db, "waitlist"), 
            where("customerId", "==", customer.id), 
            where("serviceId", "==", service.id),
            where("status", "==", "active")
          );
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await deleteDoc(doc(db, "waitlist", d.id));
          }
        } catch (waitlistErr) {
          console.error("Erro ao remover da lista de espera (manual booking):", waitlistErr);
        }
      }
      alert("Agendamento manual realizado com sucesso!");
      setModal({ open: false, hour: '', type: 'free' });
      resetForm();
    } catch (e) {
      alert("Erro ao realizar agendamento manual.");
    }
  };

  const handleCompleteBooking = async (booking: Booking) => {
    if (!(db as any)._isMock) {
      setIsProcessing(true);
      try {
        // 1. Update booking status
        await updateDoc(doc(db, "bookings", booking.id), {
          status: 'completed',
          paymentReceived: booking.originalPrice || services.find(s => s.id === booking.serviceId)?.price || 0,
          paymentDate: new Date().toISOString(),
          usedProducts: usedProducts // Store what was used
        });

        // 2. Create transaction
        await addDoc(collection(db, "transactions"), {
          type: 'receivable',
          description: `Atendimento: ${booking.serviceName} - ${booking.customerName}`,
          amount: booking.originalPrice || services.find(s => s.id === booking.serviceId)?.price || 0,
          date: booking.dateTime.split(' ')[0],
          status: 'paid',
          customerId: booking.customerId,
          customerName: booking.customerName,
          bookingId: booking.id,
          serviceName: booking.serviceName,
          procedureDate: booking.dateTime,
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });

        // 3. Update Inventory
        if (onUpdateInventory) {
          for (const used of usedProducts) {
            const item = inventory.find(i => i.id === used.productId);
            if (item) {
              await onUpdateInventory(item.id, {
                quantity: Math.max(0, item.quantity - used.quantity)
              });
            }
          }
        }

        // 4. Award Loyalty Points
        if (settings?.loyaltyConfig?.enabled) {
          const customer = customers.find(c => c.id === booking.customerId);
          // Award points if program is enabled globally AND customer is enabled (or not explicitly disabled)
          if (customer && customer.isLoyaltyEnabled !== false) {
            const pointsToAward = Math.floor((booking.originalPrice || 0) * (settings.loyaltyConfig.pointsPerReal || 1));
            if (pointsToAward > 0) {
              await updateDoc(doc(db, "customers", customer.id), {
                loyaltyPoints: increment(pointsToAward)
              });
            }
          }
        }

        alert("Atendimento concluído, lançado no caixa e estoque atualizado!");
      } catch (e) {
        console.error("Erro ao concluir atendimento:", e);
        alert("Erro ao concluir atendimento.");
      } finally {
        setIsProcessing(false);
      }
    }
    setModal({ open: false, hour: '', type: 'free' });
    setUsedProducts([]);
  };

  const handleBulkRelease = async () => {
    if ((db as any)._isMock) return alert("Modo visual: Período liberado simulado.");
    
    const start = new Date(bulkStartDate + 'T00:00:00');
    const end = new Date(bulkEndDate + 'T00:00:00');
    
    if (end < start) return alert("A data final deve ser maior ou igual à data inicial.");
    
    setIsProcessing(true);
    try {
      let currentDate = new Date(start);
      const pro = teamMembers.find(m => m.id === selectedProId);
      
      let batch = writeBatch(db);
      let operationCount = 0;

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();

        // Pula dias de folga do profissional
        if (!pro?.offDays?.includes(dayOfWeek)) {
          // Respeita o horário de funcionamento do salão (timeSlots já é baseado nisso)
          for (const hour of timeSlots) {
            const fullDateTime = `${dateStr} ${hour}`;
            
            // Verifica se já existe algo nesse horário para evitar duplicatas
            const exists = bookings.some(b => 
              b.dateTime === fullDateTime && 
              b.teamMemberId === selectedProId && 
              b.status !== 'cancelled'
            );
            
            if (!exists) {
              const newDocRef = doc(collection(db, "bookings"));
              batch.set(newDocRef, {
                dateTime: fullDateTime,
                status: 'open',
                teamMemberId: selectedProId,
                teamMemberName: pro?.name || 'Profissional',
                customerName: 'LIBERADO PARA CLIENTES',
                customerId: 'none',
                createdAt: new Date().toISOString()
              });
              operationCount++;

              if (operationCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
              }
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (operationCount > 0) {
        await batch.commit();
      }
      
      alert("Período liberado com sucesso!");
      setIsBulkModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao liberar período.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if ((db as any)._isMock) return;
    if (!confirm("Deseja EXCLUIR PERMANENTEMENTE este agendamento? Esta ação não pode ser desfeita e removerá o registro do sistema.")) return;
    
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      alert("Agendamento excluído com sucesso.");
      setModal({ open: false, hour: '', type: 'free' });
    } catch (e) {
      alert("Erro ao excluir agendamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* View Mode Toggle */}
      <div className="flex gap-4 border-b border-gray-100 pb-4">
        <button 
          onClick={() => setViewMode('daily')} 
          className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
        >
          Visão Diária
        </button>
        <button 
          onClick={() => setViewMode('monthly')} 
          className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
        >
          Agenda do Mês
        </button>
      </div>

      {/* Header e Filtros */}
      {viewMode === 'daily' ? (
        <>
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Dia da Agenda</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Profissional</label>
          <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none">
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={handleReleaseFullDay} 
            disabled={isProcessing}
            className="flex-1 bg-tea-100 text-tea-900 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-200 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processando...' : 'Liberar Dia'}
          </button>
          <button 
            onClick={() => {
              setBulkStartDate(selectedDate);
              setBulkEndDate(selectedDate);
              setIsBulkModalOpen(true);
            }} 
            disabled={isProcessing}
            className="flex-1 bg-tea-900 text-white px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-800 transition-all disabled:opacity-50"
          >
            Liberar Período
          </button>
          <button 
            onClick={handleBlockFullDay} 
            disabled={isProcessing}
            className="flex-1 bg-gray-100 text-gray-400 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
          >
            Bloquear Dia
          </button>
          <button 
            onClick={() => setModal({ open: true, hour: 'Extra', type: 'free' })} 
            className="flex-1 bg-tea-950 text-white px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg"
          >
            + Lançar Extra
          </button>
        </div>
      </div>

      {/* Agendamentos Extra / Fora do Horário */}
      {bookings.filter(b => {
        if (b.teamMemberId !== selectedProId || b.status === 'cancelled' || b.status === 'open' || b.status === 'blocked') return false;
        if (!b.dateTime.startsWith(selectedDate)) return false;
        const hour = b.dateTime.split(' ')[1];
        return !timeSlots.includes(hour);
      }).length > 0 && (
        <div className="bg-orange-50/50 p-6 rounded-[2.5rem] border border-orange-100 space-y-4">
          <h4 className="text-[10px] font-bold text-orange-800 uppercase tracking-widest ml-2">Agendamentos Fora do Horário Padrão</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.filter(b => {
              if (b.teamMemberId !== selectedProId || b.status === 'cancelled' || b.status === 'open' || b.status === 'blocked') return false;
              if (!b.dateTime.startsWith(selectedDate)) return false;
              const hour = b.dateTime.split(' ')[1];
              return !timeSlots.includes(hour);
            }).map(b => (
              <button 
                key={b.id}
                onClick={() => setModal({ open: true, hour: b.dateTime.split(' ')[1], type: 'occupied' })}
                className="p-4 bg-white rounded-2xl border border-orange-100 shadow-sm flex items-center justify-between hover:scale-105 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="font-serif font-bold italic text-tea-900">{b.dateTime.split(' ')[1]}</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-900">{b.customerName}</span>
                    <span className="text-[8px] font-medium text-tea-600 uppercase tracking-wider">{b.serviceName}</span>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-orange-600 uppercase tracking-tighter bg-orange-50 px-2 py-1 rounded-full">Extra</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Horários */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden p-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {timeSlots.map(hour => {
            const data = getSlotData(hour);
            let style = "bg-gray-50 text-gray-300 border-2 border-transparent";
            let label = "Bloqueado";

            if (data.type === 'open') {
              style = "bg-white border-tea-500 text-tea-900 border-2 cursor-pointer shadow-md shadow-tea-50";
              label = "Aberto p/ Site";
            } else if (data.type === 'occupied') {
              const appointments = (data as any).bookings as Booking[];
              if ((data as any).isDurationBlock) {
                style = "bg-tea-800/80 text-white/80 border-tea-800 cursor-pointer shadow-inner";
                const names = appointments.map(b => b.customerName.split(' ')[0]).join(' & ');
                label = `Ocupado: ${names}`;
              } else {
                style = "bg-tea-900 text-white border-tea-900 cursor-pointer shadow-lg";
                const names = appointments.map(b => b.customerName.split(' ')[0]).join(' & ');
                label = names;
              }
            } else {
              // Bloqueado mas clicável para abrir
              style = "bg-gray-50 text-gray-300 border-2 border-dashed border-gray-100 cursor-pointer hover:border-tea-200 hover:text-tea-300";
              label = "+ Abrir";
            }

            return (
              <button 
                key={hour} 
                disabled={isProcessing}
                onClick={() => {
                  const data = getSlotData(hour);
                  setModal({ open: true, hour, type: data.type === 'locked' ? 'free' : (data.type === 'open' ? 'opened' : 'occupied') });
                  if ((data as any).bookings && (data as any).bookings.length > 0) {
                    setEditingPriceValue((data as any).bookings[0].originalPrice || 0);
                  }
                }}
                className={`p-6 rounded-3xl transition-all flex flex-col items-center justify-center min-h-[100px] ${style} hover:scale-105 active:scale-95`}
              >
                <span className="text-xl font-serif font-bold italic">{hour}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-center line-clamp-2">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      </>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden p-8">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Agendamentos de {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
            <div className="text-[10px] font-bold text-tea-600 uppercase tracking-widest bg-tea-50 px-4 py-2 rounded-full">
              {monthlyBookings.length} Atendimentos
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data / Hora</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Procedimento</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Profissional</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthlyBookings.map(b => (
                  <tr key={b.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-tea-900">{new Date(b.dateTime.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">
                        {b.dateTime.split(' ')[1]} - {(() => {
                          const start = new Date(b.dateTime.replace(' ', 'T'));
                          const end = new Date(start.getTime() + (b.duration || 30) * 60000);
                          return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        })()}
                      </div>
                    </td>
                    <td className="py-4">
                      <button 
                        onClick={() => b.customerId && b.customerId !== 'none' && setHistoryCustomerId(b.customerId)}
                        className="font-bold text-tea-950 hover:text-tea-700 transition-colors"
                      >
                        {b.customerName}
                      </button>
                    </td>
                    <td className="py-4">
                      <div className="text-xs font-medium text-tea-800 flex items-center gap-2">
                        {b.serviceName}
                        {b.isManual && <span className="text-[7px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Manual</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[9px] text-gray-400 uppercase tracking-tighter">R$ {b.originalPrice?.toFixed(2) || '0,00'}</div>
                        <button 
                          onClick={() => {
                            const newPrice = prompt("Novo valor para este procedimento:", b.originalPrice?.toString());
                            if (newPrice !== null && !isNaN(Number(newPrice))) {
                              handleUpdatePrice(b.id, Number(newPrice));
                            }
                          }}
                          className="text-[8px] text-tea-600 font-bold uppercase hover:underline"
                        >
                          Ajustar
                        </button>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-[10px] font-bold text-gray-500 uppercase">{b.teamMemberName}</div>
                    </td>
                    <td className="py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                        b.status === 'completed' ? 'bg-green-100 text-green-600' : 
                        b.status === 'scheduled' ? 'bg-tea-100 text-tea-700' : 
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {b.status === 'completed' ? 'Concluído' : b.status === 'scheduled' ? 'Agendado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
                {monthlyBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-gray-300 italic font-serif text-lg">
                      Nenhum agendamento encontrado para este mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Ação do Slot */}
      {modal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl space-y-6 animate-slide-up">
            <div className="text-center">
              <p className="text-[10px] font-bold text-tea-600 uppercase tracking-[0.2em] mb-1">Gerenciar Horário</p>
              <h3 className="text-3xl font-serif text-tea-950 font-bold italic">{modal.hour}</h3>
            </div>
            
            {modal.type === 'free' && (
              <div className="space-y-6">
                <button 
                  onClick={() => handleOpenSlot(modal.hour)} 
                  className="w-full py-5 bg-tea-50 text-tea-900 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-100 transition-all border-2 border-tea-100 shadow-sm"
                >
                  🔓 Liberar para Clientes (Site)
                </button>
                
                <div className="p-8 bg-gray-50 rounded-[2.5rem] space-y-5 border border-gray-100">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center border-b border-gray-200 pb-3">Agendar Manualmente</p>
                  
                  {modal.hour === 'Extra' && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Horário do Atendimento</label>
                      <input 
                        type="time" 
                        value={manualTime}
                        onChange={e => setManualTime(e.target.value)}
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..." 
                      value={customerSearch} 
                      onChange={e => setCustomerSearch(e.target.value)} 
                      className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold" 
                    />
                    <div className="max-h-28 overflow-y-auto space-y-1 custom-scroll pr-2">
                      {customers.filter(c => {
                        const isMatch = c.name.toLowerCase().includes(customerSearch.toLowerCase());
                        const isTestUser = c.cpf.replace(/\D/g, '') === '33426618877';
                        return isMatch && !isTestUser;
                      }).slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-[10px] rounded-xl font-bold transition-all ${selectedCustomerId === c.id ? 'bg-tea-900 text-white' : 'bg-white hover:bg-tea-50 text-gray-600'}`}>
                          {c.name}
                        </button>
                      ))}
                      {customerSearch && customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                        <p className="text-center text-[9px] text-gray-300 py-2 italic">Nenhuma cliente encontrada.</p>
                      )}
                    </div>
                  </div>

                  <select 
                    value={selectedServiceId} 
                    onChange={e => {
                      const sid = e.target.value;
                      setSelectedServiceId(sid);
                      const s = services.find(item => item.id === sid);
                      if (s) setManualPrice(s.price);
                    }} 
                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold appearance-none"
                  >
                    <option value="">Selecione o serviço...</option>
                    {services.filter(s => s.isVisible).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {selectedServiceId && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Valor Acordado (R$)</label>
                      <input 
                        type="number" 
                        value={manualPrice}
                        onChange={e => setManualPrice(Number(e.target.value))}
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold text-tea-900"
                      />
                    </div>
                  )}

                  <button 
                    onClick={() => handleManualBooking()} 
                    className="w-full py-5 bg-tea-950 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                  >
                    Confirmar Agendamento
                  </button>
                </div>
              </div>
            )}

            {modal.type === 'opened' && (
              <div className="space-y-6">
                 <div className="p-8 bg-tea-50 rounded-[2.5rem] text-center border border-tea-100 space-y-2">
                    <p className="text-tea-900 font-bold text-lg">Horário Aberto no Site</p>
                    <p className="text-[10px] text-tea-600 italic font-medium uppercase tracking-widest">
                      {getSlotData(modal.hour).bookings?.length} vaga(s) disponível(is)
                    </p>
                 </div>
                 
                 <div className="space-y-3">
                   <button 
                    onClick={() => handleOpenSlot(modal.hour)} 
                    className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all"
                   >
                    ➕ Adicionar Mais uma Vaga
                   </button>

                   <div className="pt-4 border-t border-gray-100 space-y-2">
                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center mb-2">Gerenciar Vagas Abertas</p>
                     {getSlotData(modal.hour).bookings?.map((b: Booking, idx: number) => (
                       <div key={b.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                         <span className="text-[10px] font-bold text-tea-900 uppercase">Vaga #{idx + 1}</span>
                         <button 
                          onClick={() => handleCloseSlot(b.id)} 
                          className="text-red-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest"
                         >
                          Bloquear
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div className="p-8 bg-gray-50 rounded-[2.5rem] space-y-5 border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center border-b border-gray-200 pb-3">Agendamento Direto (Manual)</p>
                    
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        value={customerSearch} 
                        onChange={e => setCustomerSearch(e.target.value)} 
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold" 
                      />
                      <div className="max-h-28 overflow-y-auto space-y-1 custom-scroll pr-2">
                        {customers.filter(c => {
                          const isMatch = c.name.toLowerCase().includes(customerSearch.toLowerCase());
                          const isTestUser = c.cpf.replace(/\D/g, '') === '33426618877';
                          return isMatch && !isTestUser;
                        }).slice(0, 5).map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-[10px] rounded-xl font-bold transition-all ${selectedCustomerId === c.id ? 'bg-tea-900 text-white' : 'bg-white hover:bg-tea-50 text-gray-600'}`}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <select 
                      value={selectedServiceId} 
                      onChange={e => {
                        const sid = e.target.value;
                        setSelectedServiceId(sid);
                        const s = services.find(item => item.id === sid);
                        if (s) setManualPrice(s.price);
                      }} 
                      className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold appearance-none"
                    >
                      <option value="">Selecione o serviço...</option>
                      {services.filter(s => s.isVisible).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <button 
                      onClick={() => handleManualBooking()} 
                      className="w-full py-5 bg-tea-950 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                    >
                      Confirmar Agendamento
                    </button>
                  </div>
              </div>
            )}

            {modal.type === 'occupied' && (
               <div className="space-y-6">
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scroll">
                    {getSlotData(modal.hour).bookings?.map((booking: Booking) => (
                      <div key={booking.id} className="p-6 bg-tea-900 text-white rounded-[2.5rem] shadow-xl space-y-4">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-tea-300 uppercase tracking-widest mb-1">Cliente Agendada</p>
                          <button 
                            onClick={() => {
                              if (booking.customerId && booking.customerId !== 'none') {
                                setHistoryCustomerId(booking.customerId);
                              }
                            }}
                            className="font-serif text-xl font-bold italic hover:text-tea-100 transition-colors"
                          >
                            {booking.customerName}
                          </button>
                          <p className="text-[10px] text-tea-100 mt-1 font-medium">
                            {booking.serviceName} - R$ {booking.originalPrice?.toFixed(2)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleCompleteBooking(booking)} 
                            disabled={isProcessing}
                            className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase text-[8px] tracking-widest transition-all"
                          >
                            Concluir
                          </button>
                          <button 
                            onClick={() => handleCloseSlot(booking.id)} 
                            className="py-3 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl font-bold uppercase text-[8px] tracking-widest transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-8 bg-gray-50 rounded-[2.5rem] space-y-5 border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center border-b border-gray-200 pb-3">Novo Agendamento neste Horário</p>
                    
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        value={customerSearch} 
                        onChange={e => setCustomerSearch(e.target.value)} 
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold" 
                      />
                      <div className="max-h-28 overflow-y-auto space-y-1 custom-scroll pr-2">
                        {customers.filter(c => {
                          const isMatch = c.name.toLowerCase().includes(customerSearch.toLowerCase());
                          const isTestUser = c.cpf.replace(/\D/g, '') === '33426618877';
                          return isMatch && !isTestUser;
                        }).slice(0, 5).map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-[10px] rounded-xl font-bold transition-all ${selectedCustomerId === c.id ? 'bg-tea-900 text-white' : 'bg-white hover:bg-tea-50 text-gray-600'}`}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <select 
                      value={selectedServiceId} 
                      onChange={e => {
                        const sid = e.target.value;
                        setSelectedServiceId(sid);
                        const s = services.find(item => item.id === sid);
                        if (s) setManualPrice(s.price);
                      }} 
                      className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold appearance-none"
                    >
                      <option value="">Selecione o serviço...</option>
                      {services.filter(s => s.isVisible).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <button 
                      onClick={() => handleManualBooking()} 
                      className="w-full py-5 bg-tea-950 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                    >
                      Confirmar Novo Agendamento
                    </button>
                  </div>
               </div>
            )}

            <button onClick={() => { setModal({ open: false, hour: '', type: 'free' }); resetForm(); }} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Fechar Janela</button>
          </div>
        </div>
      )}
      
      {/* Legenda */}
      <div className="flex flex-wrap justify-center gap-6 px-4">
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded-md bg-gray-50 border border-gray-100"></div>
           <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bloqueado</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded-md bg-white border-2 border-tea-500"></div>
           <span className="text-[9px] font-bold text-tea-600 uppercase tracking-widest">Aberto p/ Clientes</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded-md bg-tea-900"></div>
           <span className="text-[9px] font-bold text-tea-950 uppercase tracking-widest">Agendado</span>
        </div>
      </div>

      {/* Modal de Liberação em Massa */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-tea-950/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-scale-in">
            <h3 className="text-2xl font-serif font-bold text-tea-950 italic mb-6">Liberar Período</h3>
            
            <div className="space-y-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data Início</label>
                <input 
                  type="date" 
                  value={bulkStartDate} 
                  onChange={e => setBulkStartDate(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data Fim</label>
                <input 
                  type="date" 
                  value={bulkEndDate} 
                  onChange={e => setBulkEndDate(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100" 
                />
              </div>
              <p className="text-[10px] text-gray-400 italic px-2">
                * Os horários serão liberados respeitando o horário de funcionamento do salão ({settings?.businessHours?.start} às {settings?.businessHours?.end}).
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleBulkRelease}
                disabled={isProcessing}
                className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-800 transition-all shadow-lg disabled:opacity-50"
              >
                {isProcessing ? 'Processando...' : 'Confirmar Liberação'}
              </button>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Histórico da Cliente */}
      {historyCustomerId && (
        <CustomerHistoryModal 
          customer={customers.find(c => c.id === historyCustomerId)!}
          bookings={bookings}
          transactions={transactions}
          waitlist={waitlist}
          onClose={() => setHistoryCustomerId(null)}
        />
      )}
    </div>
  );
};

export default AdminCalendar;
