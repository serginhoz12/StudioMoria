
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDocs, query, where } from "firebase/firestore";

interface AdminCalendarProps {
  bookings: Booking[];
  services: Service[];
  customers: Customer[];
  teamMembers: TeamMember[];
  settings?: SalonSettings;
  onUpdateStatus?: (id: string, status: any) => void;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, customers, teamMembers, settings }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(teamMembers[0]?.id || '');
  const [modal, setModal] = useState<{ open: boolean; hour: string; type: 'free' | 'occupied' | 'opened' }>({ open: false, hour: '', type: 'free' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [manualTime, setManualTime] = useState('');

  // Added resetForm function to fix "Cannot find name 'resetForm'" error
  const resetForm = () => {
    setCustomerSearch('');
    setSelectedCustomerId('');
    setSelectedServiceId('');
    setManualTime('');
  };

  const startHourNum = parseInt((settings?.businessHours?.start || "08:00").split(':')[0]);
  const endHourNum = parseInt((settings?.businessHours?.end || "19:00").split(':')[0]);

  const timeSlots = Array.from({ length: (endHourNum - startHourNum) * 2 }, (_, i) => {
    const totalMinutes = startHourNum * 60 + i * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const getSlotData = (hour: string) => {
    const fullDateTime = `${selectedDate} ${hour}`;
    const booking = bookings.find(b => b.dateTime === fullDateTime && b.teamMemberId === selectedProId && b.status !== 'cancelled');
    if (!booking) return { type: 'locked' };
    return { type: booking.status, booking };
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
      if (!confirm(`Deseja liberar TODOS os horários de ${settings?.businessHours?.start} às ${settings?.businessHours?.end} para o dia ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}?`)) return;
      
      setIsProcessing(true);
      try {
        for (const hour of timeSlots) {
          const slot = getSlotData(hour);
          if (slot.type === 'locked') {
            await addDoc(collection(db, "bookings"), {
              dateTime: `${selectedDate} ${hour}`,
              status: 'open',
              teamMemberId: selectedProId,
              teamMemberName: teamMembers.find(m => m.id === selectedProId)?.name,
              customerName: 'LIBERADO PARA CLIENTES',
              customerId: 'none',
              createdAt: new Date().toISOString()
            });
          }
        }
        alert("Agenda do dia liberada com sucesso!");
      } catch (e) {
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
        const openBookings = bookings.filter(b => b.status === 'open' && b.dateTime.startsWith(selectedDate) && b.teamMemberId === selectedProId);
        for (const b of openBookings) {
          await deleteDoc(doc(db, "bookings", b.id));
        }
        alert("Horários bloqueados com sucesso.");
      } catch (e) {
        alert("Erro ao bloquear horários.");
      } finally {
        setIsProcessing(false);
      }
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
          status: 'scheduled',
          depositStatus: 'paid',
          agreedToCancellationPolicy: true,
          policyAgreedAt: new Date().toISOString()
        });
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
      try {
        // 1. Update booking status
        await updateDoc(doc(db, "bookings", booking.id), {
          status: 'completed',
          paymentReceived: services.find(s => s.id === booking.serviceId)?.price || 0,
          paymentDate: new Date().toISOString()
        });

        // 2. Create transaction
        await addDoc(collection(db, "transactions"), {
          type: 'receivable',
          description: `Atendimento: ${booking.serviceName} - ${booking.customerName}`,
          amount: services.find(s => s.id === booking.serviceId)?.price || 0,
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

        alert("Atendimento concluído e lançado no caixa!");
      } catch (e) {
        alert("Erro ao concluir atendimento.");
      }
    }
    setModal({ open: false, hour: '', type: 'free' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header e Filtros */}
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
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleReleaseFullDay} 
            disabled={isProcessing}
            className="flex-1 bg-tea-100 text-tea-900 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-200 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processando...' : 'Liberar Dia'}
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
            } else if (data.type === 'scheduled' || data.type === 'completed') {
              style = "bg-tea-900 text-white border-tea-900 cursor-pointer shadow-lg";
              label = data.booking?.customerName.split(' ')[0] || "Ocupado";
            } else {
              // Bloqueado mas clicável para abrir
              style = "bg-gray-50 text-gray-300 border-2 border-dashed border-gray-100 cursor-pointer hover:border-tea-200 hover:text-tea-300";
              label = "+ Abrir";
            }

            return (
              <button 
                key={hour} 
                disabled={isProcessing}
                onClick={() => setModal({ open: true, hour, type: data.type === 'locked' ? 'free' : (data.type === 'open' ? 'opened' : 'occupied') })}
                className={`p-6 rounded-3xl transition-all flex flex-col items-center justify-center min-h-[100px] ${style} hover:scale-105 active:scale-95`}
              >
                <span className="text-xl font-serif font-bold italic">{hour}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-center">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

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
                    onChange={e => setSelectedServiceId(e.target.value)} 
                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none font-bold appearance-none"
                  >
                    <option value="">Selecione o serviço...</option>
                    {services.filter(s => s.isVisible).map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                  </select>

                  <button 
                    onClick={handleManualBooking} 
                    className="w-full py-5 bg-tea-950 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                  >
                    Confirmar Agendamento
                  </button>
                </div>
              </div>
            )}

            {modal.type === 'opened' && (
              <div className="space-y-4">
                 <div className="p-6 bg-tea-50 rounded-3xl text-center border border-tea-100">
                    <p className="text-tea-900 font-bold text-sm">Este horário está aberto no site.</p>
                    <p className="text-[10px] text-tea-600 italic">As clientes podem ver e agendar este slot agora mesmo.</p>
                 </div>
                 <button 
                  onClick={() => handleCloseSlot(getSlotData(modal.hour).booking!.id)} 
                  className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-red-100 hover:bg-red-100 transition-all"
                 >
                  🔒 Bloquear Horário
                 </button>
              </div>
            )}

            {modal.type === 'occupied' && (
               <div className="space-y-6">
                  <div className="p-8 bg-tea-900 text-white rounded-[2.5rem] text-center shadow-xl">
                     <p className="text-[10px] font-bold text-tea-300 uppercase tracking-widest mb-2">Cliente Agendada</p>
                     <p className="font-serif text-2xl font-bold italic">{getSlotData(modal.hour).booking?.customerName}</p>
                     <p className="text-xs text-tea-100 mt-2 font-medium">{getSlotData(modal.hour).booking?.serviceName}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => handleCompleteBooking(getSlotData(modal.hour).booking!)} 
                      className="w-full py-5 bg-tea-100 text-tea-900 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-200 transition-all shadow-md"
                    >
                      ✅ Concluir Atendimento
                    </button>
                    <button 
                      onClick={() => handleCloseSlot(getSlotData(modal.hour).booking!.id)} 
                      className="w-full py-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      Cancelar Agendamento
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
    </div>
  );
};

export default AdminCalendar;
