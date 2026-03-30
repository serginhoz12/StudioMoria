
import React, { useState } from 'react';
import { Booking, Customer, WaitlistEntry, Service, TeamMember, Transaction, InventoryItem, SalonSettings } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc, increment } from "firebase/firestore";
import CustomerHistoryModal from './CustomerHistoryModal';

interface AdminConfirmationsProps {
  bookings: Booking[];
  customers: Customer[];
  waitlist: WaitlistEntry[];
  services: Service[];
  transactions: Transaction[];
  teamMembers: TeamMember[];
  inventory: InventoryItem[];
  settings: SalonSettings;
  onUpdateStatus?: (id: string, status: any) => void;
  onUpdateDeposit?: (id: string, status: any) => void;
  onDeleteBooking?: (id: string) => void;
  onRemoveWaitlist?: (id: string) => void;
  onUpdateInventory?: (id: string, data: Partial<InventoryItem>) => void;
}

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ bookings, customers, waitlist, services, transactions, teamMembers, inventory, settings, onUpdateStatus, onUpdateInventory }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'waitlist'>('pending');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [manualEntry, setManualEntry] = useState({ name: '', whatsapp: '', serviceId: '', date: '', customerId: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [performingService, setPerformingService] = useState<WaitlistEntry | null>(null);
  const [performanceData, setPerformanceData] = useState({
    teamMemberId: teamMembers[0]?.id || '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: 0,
    customerId: '',
    isPackageSession: false
  });

  const [usedProducts, setUsedProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPrices, setEditingPrices] = useState<{ [key: string]: number }>({});
  const [editingServices, setEditingServices] = useState<{ [key: string]: string }>({});
  const [editingPros, setEditingPros] = useState<{ [key: string]: string }>({});
  const [packageSessions, setPackageSessions] = useState<{ [key: string]: boolean }>({});

  // Initialize editing states from bookings
  React.useEffect(() => {
    const initialPackageSessions: { [key: string]: boolean } = {};
    const initialPrices: { [key: string]: number } = {};
    bookings.forEach(b => {
      if (b.isPackageSession) {
        initialPackageSessions[b.id] = true;
        if (editingPrices[b.id] === undefined) {
          initialPrices[b.id] = 0;
        }
      }
    });
    if (Object.keys(initialPackageSessions).length > 0) {
      setPackageSessions(prev => ({ ...initialPackageSessions, ...prev }));
    }
    if (Object.keys(initialPrices).length > 0) {
      setEditingPrices(prev => ({ ...initialPrices, ...prev }));
    }
  }, [bookings]);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'store_installments'>('pix');
  const [paymentType, setPaymentType] = useState<'sight' | 'installments'>('sight');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [installmentValue, setInstallmentValue] = useState(0);
  const [dueDate, setDueDate] = useState(new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Auto-calculate installment value
  React.useEffect(() => {
    if (selectedBookingForPayment) {
      const total = editingPrices[selectedBookingForPayment.id] !== undefined 
        ? editingPrices[selectedBookingForPayment.id] 
        : (selectedBookingForPayment.originalPrice || services.find(s => s.id === selectedBookingForPayment.serviceId)?.price || 0);
      
      if (paymentType === 'sight') {
        setInstallmentValue(total);
        setInstallmentsCount(1);
      } else {
        setInstallmentValue(Number((total / installmentsCount).toFixed(2)));
      }
    }
  }, [installmentsCount, paymentType, selectedBookingForPayment, services, editingPrices]);

  const handleApproveWithPayment = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
    setIsPaymentModalOpen(true);
  };

  const confirmPaymentAndApprove = async () => {
    if (!selectedBookingForPayment) return;
    
    setIsProcessing(true);
    try {
      const selectedServiceId = editingServices[selectedBookingForPayment.id] || selectedBookingForPayment.serviceId;
      const selectedService = services.find(s => s.id === selectedServiceId);
      
      const totalAmount = editingPrices[selectedBookingForPayment.id] !== undefined 
        ? editingPrices[selectedBookingForPayment.id] 
        : (selectedBookingForPayment.originalPrice || selectedService?.price || 0);

      if (!(db as any)._isMock) {
        // 1. Update booking
        const updateData: any = {
          status: 'scheduled',
          isPackageSession: packageSessions[selectedBookingForPayment.id] || false,
          depositStatus: paymentMethod === 'store_installments' ? 'pending' : 'paid',
          paymentReceived: totalAmount,
          paymentDate: new Date().toISOString(),
          paymentMethod: paymentMethod,
          paymentType: paymentType,
          installmentsCount: paymentType === 'installments' ? installmentsCount : 1,
          originalPrice: totalAmount,
          dueDate: paymentMethod === 'store_installments' ? dueDate : null,
          updatedAt: new Date().toISOString()
        };

        if (editingServices[selectedBookingForPayment.id]) {
          updateData.serviceId = selectedService?.id;
          updateData.serviceName = selectedService?.name;
        }

        if (editingPros[selectedBookingForPayment.id]) {
          const selectedPro = teamMembers.find(m => m.id === editingPros[selectedBookingForPayment.id]);
          if (selectedPro) {
            updateData.teamMemberId = selectedPro.id;
            updateData.teamMemberName = selectedPro.name;
          }
        }

        await updateDoc(doc(db, "bookings", selectedBookingForPayment.id), updateData);

        // 2. Create transaction if not a package session
        if (!packageSessions[selectedBookingForPayment.id]) {
          await addDoc(collection(db, "transactions"), {
            type: 'receivable',
            description: `Atendimento: ${selectedService?.name || selectedBookingForPayment.serviceName} - ${selectedBookingForPayment.customerName}${paymentType === 'installments' ? ` (${installmentsCount}x)` : ''} (Pagamento Antecipado)${paymentMethod === 'store_installments' ? ' (A Prazo)' : ''}`,
            amount: totalAmount,
            date: new Date().toISOString().split('T')[0],
            dueDate: paymentMethod === 'store_installments' ? dueDate : new Date().toISOString().split('T')[0],
            status: paymentMethod === 'store_installments' ? 'pending' : 'paid',
            customerId: selectedBookingForPayment.customerId,
            customerName: selectedBookingForPayment.customerName,
            bookingId: selectedBookingForPayment.id,
            serviceName: selectedService?.name || selectedBookingForPayment.serviceName,
            procedureDate: selectedBookingForPayment.dateTime,
            paymentMethod: paymentMethod,
            paymentType: paymentType,
            installmentsCount: paymentType === 'installments' ? installmentsCount : 1,
            paidAt: paymentMethod === 'store_installments' ? null : new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }
      }

      if (onUpdateStatus) {
        onUpdateStatus(selectedBookingForPayment.id, 'scheduled');
      }

      alert("Pedido aprovado e pagamento antecipado confirmado!");
    } catch (e) {
      console.error("Erro ao aprovar com pagamento:", e);
      alert("Erro ao processar.");
    } finally {
      setIsProcessing(false);
      setIsPaymentModalOpen(false);
      setSelectedBookingForPayment(null);
      // Reset payment states
      setPaymentMethod('pix');
      setPaymentType('sight');
      setInstallmentsCount(1);
    }
  };

  const handleCompleteService = async () => {
    if (!performingService || !performanceData.teamMemberId || !performanceData.serviceId || !performanceData.price) return alert("Preencha todos os campos.");
    
    // Ensure we have a customer ID
    const finalCustomerId = performingService.customerId && performingService.customerId !== 'manual' 
      ? performingService.customerId 
      : performanceData.customerId;

    if (!finalCustomerId || finalCustomerId === 'manual') {
      return alert("Associe este atendimento a uma cliente cadastrada.");
    }

    const teamMember = teamMembers.find(m => m.id === performanceData.teamMemberId);
    const service = services.find(s => s.id === performanceData.serviceId);
    
    try {
      setIsProcessing(true);
      if (!(db as any)._isMock) {
        // 1. Create completed booking
        const bookingRef = await addDoc(collection(db, "bookings"), {
          customerId: finalCustomerId,
          customerName: performingService.customerName,
          serviceId: performanceData.serviceId,
          serviceName: service?.name || performingService.serviceName,
          teamMemberId: performanceData.teamMemberId,
          teamMemberName: teamMember?.name || '',
          dateTime: `${performanceData.date} ${performanceData.time}`,
          duration: service?.duration || 30,
          originalPrice: performanceData.price,
          status: 'completed',
          depositStatus: 'paid',
          paymentReceived: performanceData.isPackageSession ? 0 : performanceData.price,
          paymentDate: new Date().toISOString(),
          agreedToCancellationPolicy: true,
          policyAgreedAt: new Date().toISOString(),
          usedProducts: usedProducts,
          isPackageSession: performanceData.isPackageSession
        });

        // 2. Create transaction
        if (!performanceData.isPackageSession) {
          await addDoc(collection(db, "transactions"), {
            type: 'receivable',
            description: `Atendimento: ${service?.name || performingService.serviceName} - ${performingService.customerName}`,
            amount: performanceData.price,
            date: performanceData.date,
            status: 'paid',
            customerId: finalCustomerId,
            customerName: performingService.customerName,
            bookingId: bookingRef.id,
            serviceName: service?.name || performingService.serviceName,
            procedureDate: `${performanceData.date} ${performanceData.time}`,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }

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

        // 4. Remove from waitlist
        await deleteDoc(doc(db, "waitlist", performingService.id));

        // 5. Award Loyalty Points
        if (settings?.loyaltyConfig?.enabled) {
          const customer = customers.find(c => c.id === finalCustomerId);
          if (customer && customer.isLoyaltyEnabled !== false) {
            const pointsToAward = Math.floor(performanceData.price * (settings.loyaltyConfig.pointsPerReal || 1));
            if (pointsToAward > 0) {
              await updateDoc(doc(db, "customers", customer.id), {
                loyaltyPoints: increment(pointsToAward)
              });
            }
          }
        }
      }
      
      setPerformingService(null);
      setPerformanceData({ ...performanceData, customerId: '' });
      setCustomerSearch('');
      setUsedProducts([]);
      alert("Atendimento registrado com sucesso e estoque atualizado!");
    } catch (error: any) {
      console.error("Erro ao registrar atendimento:", error);
      if (error.code === 'permission-denied') {
        window.dispatchEvent(new Event('moria_permission_denied'));
        alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
      } else {
        alert("Erro ao salvar. Tente novamente.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddManualWaitlist = async () => {
    if (!manualEntry.name || !manualEntry.whatsapp || !manualEntry.serviceId) return alert("Preencha todos os campos.");
    if (!manualEntry.customerId || manualEntry.customerId === 'manual') return alert("Selecione uma cliente cadastrada para incluir na espera.");
    
    const service = services.find(s => s.id === manualEntry.serviceId);
    
    if (!(db as any)._isMock) {
      try {
        await addDoc(collection(db, "waitlist"), {
          customerName: manualEntry.name,
          customerWhatsapp: manualEntry.whatsapp,
          serviceId: manualEntry.serviceId,
          serviceName: service?.name || '',
          preferredDate: manualEntry.date,
          status: 'active',
          createdAt: new Date().toISOString(),
          customerId: manualEntry.customerId || 'manual'
        });
      } catch (error: any) {
        console.error("Erro ao adicionar à espera:", error);
        if (error.code === 'permission-denied') {
          window.dispatchEvent(new Event('moria_permission_denied'));
          alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
        } else {
          alert("Erro ao salvar. Tente novamente.");
        }
        return;
      }
    }

    setShowWaitlistForm(false);
    setManualEntry({ name: '', whatsapp: '', serviceId: '', date: '', customerId: '' });
    setCustomerSearch('');
  };

  const handleUpdateWaitlist = async () => {
    if (!editingEntry) return;
    const service = services.find(s => s.id === editingEntry.serviceId);
    
    if (!(db as any)._isMock) {
      const waitlistRef = doc(db, "waitlist", editingEntry.id);
      await updateDoc(waitlistRef, {
        customerName: editingEntry.customerName,
        customerWhatsapp: editingEntry.customerWhatsapp,
        serviceId: editingEntry.serviceId,
        serviceName: service?.name || editingEntry.serviceName,
        preferredDate: editingEntry.preferredDate
      });
    }
    setEditingEntry(null);
  };

  const handleAction = async (id: string, status: 'scheduled' | 'cancelled') => {
    try {
      if (!(db as any)._isMock) {
        const updateData: any = { 
          status,
          updatedAt: new Date().toISOString()
        };
        
        if (status === 'scheduled') {
          if (packageSessions[id]) {
            updateData.isPackageSession = true;
            updateData.depositStatus = 'paid'; // Mark as paid if it's a package session
          }

          if (editingPrices[id] !== undefined) {
            updateData.originalPrice = editingPrices[id];
          }
          
          if (editingServices[id]) {
            const selectedService = services.find(s => s.id === editingServices[id]);
            if (selectedService) {
              updateData.serviceId = selectedService.id;
              updateData.serviceName = selectedService.name;
              if (editingPrices[id] === undefined) {
                updateData.originalPrice = selectedService.price;
              }
            }
          }

          if (editingPros[id]) {
            const selectedPro = teamMembers.find(m => m.id === editingPros[id]);
            if (selectedPro) {
              updateData.teamMemberId = selectedPro.id;
              updateData.teamMemberName = selectedPro.name;
            }
          }
        }

        await updateDoc(doc(db, "bookings", id), updateData);
      }
      if (onUpdateStatus) {
        onUpdateStatus(id, status);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao processar pedido. Tente novamente.");
    }
  };

  // Ordenação por ordem de chegada (mais antigo primeiro)
  const sortedWaitlist = [...waitlist]
    .filter(w => {
      const testCustomer = customers.find(c => c.cpf.replace(/\D/g, '') === '33426618877');
      return !(testCustomer && w.customerId === testCustomer.id);
    })
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex gap-4 border-b border-gray-100 pb-4">
        <button 
          onClick={() => setActiveTab('pending')} 
          className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
        >
          Pedidos Site
        </button>
        <button 
          onClick={() => setActiveTab('waitlist')} 
          className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'waitlist' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
        >
          Lista de Espera
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-6">
          {bookings.filter(b => b.status === 'pending').map(b => (
            <div key={b.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 animate-slide-up">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner">{(b.customerName || '?').charAt(0)}</div>
                <div>
                   <button 
                    onClick={() => setSelectedCustomerId(b.customerId)}
                    className="text-xl font-bold text-tea-950 hover:text-tea-700 transition-colors text-left"
                   >
                    {b.customerName || 'Cliente'}
                   </button>
                   <div className="space-y-2">
                     <p className="text-[12px] text-tea-800 font-bold uppercase tracking-wider">
                       {b.serviceName || 'Procedimento não identificado'}
                     </p>
                     <div className="flex flex-col gap-1">
                       <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Corrigir Procedimento:</label>
                       <select 
                         value={editingServices[b.id] || b.serviceId}
                         onChange={e => {
                           const sId = e.target.value;
                           const srv = services.find(s => s.id === sId);
                           setEditingServices({ ...editingServices, [b.id]: sId });
                           if (srv && editingPrices[b.id] === undefined) {
                             setEditingPrices({ ...editingPrices, [b.id]: srv.price });
                           }
                         }}
                         className="w-full max-w-[200px] p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-tea-900 outline-none focus:ring-1 focus:ring-tea-200 appearance-none"
                       >
                         <option value="">Selecione o serviço...</option>
                         {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                     </div>

                     <div className="flex flex-col gap-1">
                       <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Atribuir Profissional:</label>
                       <select 
                         value={editingPros[b.id] || b.teamMemberId || ''}
                         onChange={e => setEditingPros({ ...editingPros, [b.id]: e.target.value })}
                         className="w-full max-w-[200px] p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-tea-900 outline-none focus:ring-1 focus:ring-tea-200 appearance-none"
                       >
                         <option value="">Selecione o profissional...</option>
                         {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] font-bold text-gray-400 uppercase">R$</span>
                     <input 
                       type="number" 
                       value={editingPrices[b.id] !== undefined ? editingPrices[b.id] : (b.originalPrice || 0)}
                       id={`price-input-${b.id}`}
                        onChange={e => setEditingPrices({ ...editingPrices, [b.id]: Number(e.target.value) })}
                       className="w-20 p-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-tea-900 outline-none focus:ring-1 focus:ring-tea-200"
                     />
                     <button 
                        onClick={() => {
                          const input = document.getElementById(`price-input-${b.id}`) as HTMLInputElement;
                          if (input) input.focus();
                        }}
                        className="text-[8px] text-orange-500 font-bold uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-full hover:bg-orange-100 transition-colors"
                      >
                        Ajustar Valor
                      </button>
                   </div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">🗓️ {b.dateTime}</p>
                   {b.teamMemberName && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">👤 Profissional: {b.teamMemberName}</p>}
                   
                    <div className={`mt-3 flex items-center gap-2 p-2 rounded-xl transition-all ${packageSessions[b.id] ? 'bg-blue-50 border border-blue-100' : ''}`}>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={packageSessions[b.id] || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setPackageSessions({ ...packageSessions, [b.id]: isChecked });
                            if (isChecked) {
                              setEditingPrices({ ...editingPrices, [b.id]: 0 });
                            } else {
                              const srv = services.find(s => s.id === (editingServices[b.id] || b.serviceId));
                              setEditingPrices({ ...editingPrices, [b.id]: srv?.price || b.originalPrice || 0 });
                            }
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-2 text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Sessão de Pacote / Etapa de Tratamento</span>
                      </label>
                    </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                 <button 
                  onClick={() => handleAction(b.id, 'scheduled')}
                  className="flex-1 md:flex-none px-6 py-4 bg-tea-100 text-tea-900 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-tea-200 transition-all shadow-sm active:scale-95"
                 >
                  Aprovar ✓
                 </button>
                 <button 
                  onClick={() => handleApproveWithPayment(b)}
                  className="flex-1 md:flex-none px-6 py-4 bg-tea-800 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-tea-950 transition-all shadow-md active:scale-95"
                 >
                  💰 Aprovar com Pagamento
                 </button>
                 <button 
                  onClick={() => handleAction(b.id, 'cancelled')}
                  className="flex-1 md:flex-none px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all active:scale-95"
                 >
                  Recusar ✕
                 </button>
              </div>
            </div>
          ))}
          {bookings.filter(b => b.status === 'pending').length === 0 && (
            <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
               <p className="text-gray-300 font-serif italic text-xl">Nenhum pedido aguardando no momento.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 gap-4">
             <div>
                <h3 className="text-2xl font-serif font-bold text-tea-950 italic leading-tight">Fila Moriá</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Organizada por ordem de registro</p>
             </div>
             <button onClick={() => setShowWaitlistForm(true)} className="w-full sm:w-auto bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg">+ Adicionar à Espera</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedWaitlist.map((w, index) => {
              const regDate = w.createdAt ? new Date(w.createdAt) : new Date();
              return (
                <div key={w.id} className="bg-white p-8 rounded-[3rem] border border-tea-50 flex flex-col justify-between shadow-sm hover:border-tea-200 transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-10 font-serif text-7xl italic font-bold text-tea-900">{index + 1}º</div>
                   <div className="space-y-3 relative z-10">
                      <div className="flex justify-between items-start">
                        <button 
                          onClick={() => w.customerId && w.customerId !== 'manual' && setSelectedCustomerId(w.customerId)}
                          className="font-bold text-tea-950 text-lg leading-tight pr-12 hover:text-tea-700 transition-colors text-left"
                        >
                          {w.customerName}
                        </button>
                        <span className="text-[8px] bg-tea-800 text-white px-3 py-1 rounded-full font-bold uppercase shadow-sm">Posição {index + 1}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-tea-700 font-bold uppercase tracking-widest">{w.serviceName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Interesse: {w.preferredDate || 'Livre'}</p>
                        <div className="pt-2">
                           <p className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter">
                             Registrado: {regDate.toLocaleDateString()} às {regDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </div>
                   </div>
                   <div className="mt-8 pt-4 border-t border-gray-50 flex flex-col gap-4 relative z-10">
                      <button 
                        onClick={() => {
                          const service = services.find(s => s.id === w.serviceId);
                          setPerformingService(w);
                          setPerformanceData({
                            ...performanceData,
                            serviceId: w.serviceId,
                            price: service?.price || 0
                          });
                        }}
                        className="w-full py-3 bg-tea-900 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-black transition-all shadow-md"
                      >
                        ✨ Realizar Atendimento
                      </button>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                          <a 
                            href={`https://wa.me/${w.customerWhatsapp.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] font-bold text-tea-800 uppercase tracking-widest hover:underline"
                          >
                            📱 Whats
                          </a>
                          <a 
                            href={`https://wa.me/${w.customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${w.customerName.split(' ')[0]}! A agenda do Studio Moriá foi liberada até o dia ${settings.agendaOpenUntil ? new Date(settings.agendaOpenUntil + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}. Você já pode realizar seu agendamento pelo site!`)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] font-bold text-orange-600 uppercase tracking-widest hover:underline"
                          >
                            🔔 Notificar Agenda
                          </a>
                          <button 
                            onClick={() => setEditingEntry(w)}
                            className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-tea-900"
                          >
                            Editar
                          </button>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm("Remover esta cliente da lista de espera?")) {
                              !(db as any)._isMock && await deleteDoc(doc(db, "waitlist", w.id));
                            }
                          }}
                          className="text-[9px] font-bold text-red-200 uppercase hover:text-red-500 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                   </div>
                </div>
              );
            })}
            {waitlist.length === 0 && (
               <div className="col-span-full text-center py-20 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 italic font-serif text-lg">Ninguém aguardando no momento.</p>
               </div>
            )}
          </div>

          {/* Modal Realizar Atendimento */}
          {performingService && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up">
                 <div className="text-center">
                    <h3 className="text-3xl font-serif text-tea-950 font-bold italic">Registrar Atendimento</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{performingService.customerName}</p>
                 </div>
                 
                 <div className="space-y-5">
                    {(!performingService.customerId || performingService.customerId === 'manual') && (
                      <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 space-y-4">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest text-center">Vincular Cliente Cadastrada</p>
                        <input 
                          type="text" 
                          placeholder="Buscar cliente..." 
                          value={customerSearch} 
                          onChange={e => setCustomerSearch(e.target.value)} 
                          className="w-full p-4 bg-white border border-orange-200 rounded-2xl text-xs outline-none font-bold shadow-sm" 
                        />
                        <div className="max-h-28 overflow-y-auto space-y-1 custom-scroll">
                          {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5).map(c => (
                            <button 
                              key={c.id} 
                              type="button"
                              onClick={() => { 
                                setPerformanceData({ ...performanceData, customerId: c.id }); 
                                setCustomerSearch(c.name); 
                              }} 
                              className={`w-full p-3 text-left text-[10px] rounded-xl font-bold transition-all ${performanceData.customerId === c.id ? 'bg-tea-900 text-white' : 'bg-white hover:bg-orange-100 text-gray-600'}`}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Procedimento Realizado</label>
                      <select 
                        value={performanceData.serviceId} 
                        onChange={e => {
                          const s = services.find(srv => srv.id === e.target.value);
                          setPerformanceData({...performanceData, serviceId: e.target.value, price: s?.price || 0});
                        }} 
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner appearance-none"
                      >
                         <option value="">Selecione o serviço...</option>
                         {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Profissional</label>
                      <select 
                        value={performanceData.teamMemberId} 
                        onChange={e => setPerformanceData({...performanceData, teamMemberId: e.target.value})} 
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner appearance-none"
                      >
                         {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data</label>
                        <input type="date" value={performanceData.date} onChange={e => setPerformanceData({...performanceData, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Hora</label>
                        <input type="time" value={performanceData.time} onChange={e => setPerformanceData({...performanceData, time: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Valor Recebido (R$)</label>
                      <input 
                        type="number" 
                        value={performanceData.price} 
                        onChange={e => setPerformanceData({...performanceData, price: parseFloat(e.target.value)})} 
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-lg text-tea-900 shadow-inner" 
                      />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="isPackageSessionPerf"
                        checked={performanceData.isPackageSession}
                        onChange={e => setPerformanceData({...performanceData, isPackageSession: e.target.checked})}
                        className="w-5 h-5 accent-tea-900 rounded-lg cursor-pointer"
                      />
                      <label htmlFor="isPackageSessionPerf" className="text-[10px] font-bold text-gray-600 uppercase tracking-widest cursor-pointer select-none">
                        Sessão de Pacote / Etapa de Tratamento (Não cobrar)
                      </label>
                    </div>
                    
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Produtos Utilizados</p>
                      <input 
                        type="text" 
                        placeholder="Buscar produto..." 
                        value={productSearch} 
                        onChange={e => setProductSearch(e.target.value)} 
                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-xs outline-none font-bold shadow-sm" 
                      />
                      <div className="max-h-28 overflow-y-auto space-y-1 custom-scroll">
                        {inventory.filter(i => i.name.toLowerCase().includes(productSearch.toLowerCase()) && i.quantity > 0).slice(0, 5).map(i => (
                          <button 
                            key={i.id} 
                            onClick={() => {
                              if (!usedProducts.find(up => up.productId === i.id)) {
                                setUsedProducts([...usedProducts, { productId: i.id, quantity: 1 }]);
                              }
                              setProductSearch('');
                            }} 
                            className="w-full p-3 text-left text-[10px] rounded-xl font-bold bg-white hover:bg-tea-50 text-gray-600 border border-gray-100"
                          >
                            {i.name} ({i.quantity} {i.unit})
                          </button>
                        ))}
                      </div>
                      {usedProducts.length > 0 && (
                        <div className="space-y-2 pt-2">
                          {usedProducts.map(p => {
                            const item = inventory.find(i => i.id === p.productId);
                            return (
                              <div key={p.productId} className="flex items-center justify-between bg-white p-3 rounded-xl border border-tea-50">
                                <span className="text-[10px] font-bold text-tea-900 truncate flex-1">{item?.name}</span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    value={p.quantity} 
                                    onChange={e => setUsedProducts(usedProducts.map(up => up.productId === p.productId ? { ...up, quantity: Number(e.target.value) } : up))}
                                    className="w-12 p-2 bg-gray-50 rounded-lg text-center text-[10px] font-bold outline-none"
                                  />
                                  <span className="text-[9px] text-gray-400">{item?.unit}</span>
                                  <button onClick={() => setUsedProducts(usedProducts.filter(up => up.productId !== p.productId))} className="text-red-300 hover:text-red-500">✕</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 space-y-3">
                      <button 
                        onClick={handleCompleteService} 
                        disabled={isProcessing}
                        className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50"
                      >
                        {isProcessing ? 'Processando...' : 'Concluir e Lançar no Caixa'}
                      </button>
                      <button onClick={() => { setPerformingService(null); setCustomerSearch(''); setUsedProducts([]); }} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Modal Adicionar Cliente Manualmente na Espera */}
          {showWaitlistForm && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up">
                 <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">Incluir na Espera</h3>
                 <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Buscar Cliente Cadastrada</label>
                      <input 
                        type="text" 
                        placeholder="Nome da cliente..." 
                        value={customerSearch} 
                        onChange={e => setCustomerSearch(e.target.value)} 
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none font-bold" 
                      />
                      <div className="max-h-28 overflow-y-auto space-y-1 custom-scroll pr-2">
                        {customers.filter(c => {
                          const isMatch = c.name.toLowerCase().includes(customerSearch.toLowerCase());
                          const isTestUser = c.cpf.replace(/\D/g, '') === '33426618877';
                          return isMatch && !isTestUser;
                        }).slice(0, 5).map(c => (
                          <button 
                            key={c.id} 
                            type="button"
                            onClick={() => { 
                              setManualEntry({ ...manualEntry, customerId: c.id, name: c.name, whatsapp: c.whatsapp }); 
                              setCustomerSearch(c.name); 
                            }} 
                            className={`w-full p-3 text-left text-[10px] rounded-xl font-bold transition-all ${manualEntry.customerId === c.id ? 'bg-tea-900 text-white' : 'bg-white hover:bg-tea-50 text-gray-600'}`}
                          >
                            {c.name} - {c.whatsapp}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome da Cliente</label>
                      <input placeholder="Ex: Ana Maria" value={manualEntry.name} onChange={e => setManualEntry({...manualEntry, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">WhatsApp</label>
                      <input placeholder="(13) 99999-9999" value={manualEntry.whatsapp} onChange={e => setManualEntry({...manualEntry, whatsapp: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Procedimento Desejado</label>
                      <select value={manualEntry.serviceId} onChange={e => setManualEntry({...manualEntry, serviceId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner appearance-none">
                         <option value="">Selecione...</option>
                         {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data de Preferência</label>
                      <input type="date" value={manualEntry.date} onChange={e => setManualEntry({...manualEntry, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button onClick={handleAddManualWaitlist} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Salvar na Fila</button>
                      <button onClick={() => setShowWaitlistForm(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Modal de Edição da Espera */}
          {editingEntry && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up">
                 <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center leading-tight">Ajustar Registro</h3>
                 <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome</label>
                      <input value={editingEntry.customerName} onChange={e => setEditingEntry({...editingEntry, customerName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Whats</label>
                      <input value={editingEntry.customerWhatsapp} onChange={e => setEditingEntry({...editingEntry, customerWhatsapp: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Procedimento</label>
                      <select value={editingEntry.serviceId} onChange={e => setEditingEntry({...editingEntry, serviceId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner appearance-none">
                         {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data Preferencial</label>
                      <input type="date" value={editingEntry.preferredDate} onChange={e => setEditingEntry({...editingEntry, preferredDate: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button onClick={handleUpdateWaitlist} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Confirmar Alterações</button>
                      <button onClick={() => setEditingEntry(null)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Modal de Pagamento Antecipado */}
      {isPaymentModalOpen && selectedBookingForPayment && (
        <div className="fixed inset-0 bg-tea-950/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-8">
            <div className="text-center">
              <p className="text-[10px] font-bold text-tea-600 uppercase tracking-[0.2em] mb-1">Confirmar Pagamento Antecipado</p>
              <h3 className="text-3xl font-serif text-tea-950 font-bold italic">{selectedBookingForPayment.customerName}</h3>
              <p className="text-sm text-gray-400 mt-1">{selectedBookingForPayment.serviceName}</p>
            </div>

            <div className="bg-tea-50 p-6 rounded-3xl border border-tea-100 flex justify-between items-center">
              <span className="text-xs font-bold text-tea-900 uppercase tracking-widest">Valor a Receber</span>
              <span className="text-2xl font-serif font-bold text-tea-950 italic">
                R$ {(editingPrices[selectedBookingForPayment.id] !== undefined ? editingPrices[selectedBookingForPayment.id] : (selectedBookingForPayment.originalPrice || services.find(s => s.id === selectedBookingForPayment.serviceId)?.price || 0)).toFixed(2)}
              </span>
            </div>

            <div className="space-y-6">
              {/* Meio de Pagamento */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Meio de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['pix', 'debit', 'credit', 'store_installments'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border-2 ${
                        paymentMethod === method 
                          ? 'bg-tea-900 text-white border-tea-900 shadow-lg' 
                          : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {method === 'pix' ? 'PIX' : method === 'debit' ? 'Débito' : method === 'credit' ? 'Crédito' : 'A Prazo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data de Promessa (Apenas para A Prazo) */}
              {paymentMethod === 'store_installments' && (
                <div className="space-y-3 animate-fade-in">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data da Promessa de Pagamento</label>
                  <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100"
                  />
                </div>
              )}

              {/* Tipo de Pagamento */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Forma de Recebimento</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['sight', 'installments'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPaymentType(type)}
                      className={`py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border-2 ${
                        paymentType === type 
                          ? 'bg-tea-900 text-white border-tea-900 shadow-lg' 
                          : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {type === 'sight' ? 'À Vista' : 'Parcelado'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parcelamento */}
              {paymentType === 'installments' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Nº de Parcelas</label>
                    <select
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Valor da Parcela</label>
                    <div className="w-full p-4 bg-gray-100 border-none rounded-2xl font-bold text-tea-900 flex items-center">
                      R$ {installmentValue.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={confirmPaymentAndApprove}
                disabled={isProcessing}
                className="w-full py-6 bg-tea-950 text-white rounded-3xl font-bold uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Processando...' : 'Confirmar Pagamento e Aprovar'}
              </button>
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedBookingForPayment(null);
                }}
                className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest hover:text-gray-600"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Histórico da Cliente */}
      {selectedCustomerId && (
        <CustomerHistoryModal 
          customer={customers.find(c => c.id === selectedCustomerId)!}
          bookings={bookings}
          transactions={transactions}
          waitlist={waitlist}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
};

export default AdminConfirmations;
