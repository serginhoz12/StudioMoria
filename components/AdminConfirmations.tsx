
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
    customerId: ''
  });

  const [usedProducts, setUsedProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPrices, setEditingPrices] = useState<{ [key: string]: number }>({});

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
          paymentReceived: performanceData.price,
          paymentDate: new Date().toISOString(),
          agreedToCancellationPolicy: true,
          policyAgreedAt: new Date().toISOString(),
          usedProducts: usedProducts
        });

        // 2. Create transaction
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
        
        if (status === 'scheduled' && editingPrices[id] !== undefined) {
          updateData.originalPrice = editingPrices[id];
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
                   <p className="text-[12px] text-tea-800 font-bold uppercase tracking-wider mb-1">
                     {b.serviceName || 'Procedimento não identificado'}
                   </p>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] font-bold text-gray-400 uppercase">R$</span>
                     <input 
                       type="number" 
                       value={editingPrices[b.id] !== undefined ? editingPrices[b.id] : (b.originalPrice || 0)}
                       onChange={e => setEditingPrices({ ...editingPrices, [b.id]: Number(e.target.value) })}
                       className="w-20 p-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-tea-900 outline-none focus:ring-1 focus:ring-tea-200"
                     />
                     <span className="text-[8px] text-orange-500 font-bold uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-full">Ajustar Valor</span>
                   </div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">🗓️ {b.dateTime}</p>
                   {b.teamMemberName && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">👤 Profissional: {b.teamMemberName}</p>}
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                 <button 
                  onClick={() => handleAction(b.id, 'scheduled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-tea-800 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-tea-950 transition-all shadow-md active:scale-95"
                 >
                  Aprovar ✓
                 </button>
                 <button 
                  onClick={() => handleAction(b.id, 'cancelled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-red-50 text-red-500 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all active:scale-95"
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
