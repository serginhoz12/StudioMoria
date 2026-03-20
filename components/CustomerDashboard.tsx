
import React, { useState, useMemo } from 'react';
import { Customer, Booking, Service, SalonSettings, WaitlistEntry, Promotion, Transaction, InventoryItem, PaymentMethod } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

interface CustomerDashboardProps {
  customer: Customer;
  bookings: Booking[];
  services: Service[];
  transactions: Transaction[];
  settings: SalonSettings;
  inventory: InventoryItem[];
  onLogout: () => void;
  onUpdateProfile: (upd: any) => void;
  onCancelBooking: (id: string) => void;
  onGoToProfile: () => void;
  waitlist: WaitlistEntry[];
  onRemoveWaitlist: (id: string) => void;
  promotions: Promotion[];
  onPlaceOrder: (order: any) => void;
  onAddInterest: (interest: any) => void;
  initialTab?: 'home' | 'agendar' | 'agenda' | 'faturas' | 'loja';
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  customer, 
  bookings, 
  services, 
  transactions,
  settings, 
  inventory,
  onLogout,
  onUpdateProfile,
  onCancelBooking,
  onGoToProfile,
  waitlist,
  onRemoveWaitlist,
  promotions,
  onPlaceOrder,
  onAddInterest,
  initialTab = 'home'
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agenda' | 'faturas' | 'loja'>(initialTab);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [orderData, setOrderData] = useState({
    paymentMethod: 'pix' as PaymentMethod,
    deliveryMethod: 'pickup' as 'pickup' | 'delivery',
    installmentsCount: 1
  });
  const [interestData, setInterestData] = useState({
    whatsapp: customer.whatsapp || '',
    name: customer.name || ''
  });

  const handleCancelBooking = async (id: string) => {
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;
    if ((db as any)._isMock) {
      alert("Modo de Demonstração: Agendamento cancelado com sucesso!");
      return;
    }
    try {
      await updateDoc(doc(db, "bookings", id), { 
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      alert("Agendamento cancelado com sucesso.");
    } catch (e) {
      console.error("Erro ao cancelar agendamento:", e);
      alert("Erro ao cancelar agendamento.");
    }
  };

  // Filtra slots abertos pela Moriá de hoje em diante, considerando a duração de agendamentos existentes
  const availableSlots = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Get all active bookings (pending, scheduled, completed)
    const activeBookings = bookings.filter(b => 
      ['pending', 'scheduled', 'completed'].includes(b.status) && 
      b.dateTime >= today
    );

    // 2. Identify slots that are open
    const openSlots = bookings.filter(slot => {
      if (slot.status !== 'open' || slot.dateTime < today) return false;
      return true;
    });

    // 3. If a service is selected, ensure the entire duration fits without hitting closing time
    if (selectedService) {
      const serviceDurationMs = selectedService.duration * 60 * 1000;
      
      return openSlots.filter(slot => {
        const slotStart = new Date(slot.dateTime.replace(' ', 'T')).getTime();
        const slotEnd = slotStart + serviceDurationMs;

        // Check if the service exceeds business hours (Allow up to 2 hours overtime per CLT)
        const [date] = slot.dateTime.split(' ');
        const pro = settings.teamMembers.find(m => m.id === slot.teamMemberId);
        const closingTimeStr = pro?.businessHours?.end || settings.businessHours.end;
        
        // Use a more robust date construction to avoid timezone issues
        const closingTime = new Date(`${date}T${closingTimeStr}:00`).getTime();
        
        // CLT: Max 2 hours overtime (120 minutes). 
        // We block if the service ends even 1 second after the 2h limit.
        const maxEndTime = closingTime + (120 * 60 * 1000); 
        if (slotEnd > maxEndTime) return false;

        return true;
      }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    }

    return openSlots.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [bookings, selectedService, settings.businessHours.end, settings.teamMembers]);

  const groupedSlots = useMemo(() => {
    const groups: { [key: string]: Booking[] } = {};
    availableSlots.forEach(slot => {
      const date = slot.dateTime.split(' ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(slot);
    });
    return groups;
  }, [availableSlots]);

  const availableDays = useMemo(() => {
    return Object.keys(groupedSlots).sort();
  }, [groupedSlots]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return groupedSlots[selectedDay] || [];
  }, [groupedSlots, selectedDay]);

  const pendingInvoices = useMemo(() => {
    return transactions.filter(t => t.customerId === customer.id && t.type === 'receivable' && t.status === 'pending');
  }, [transactions, customer.id]);

  const paidInvoices = useMemo(() => {
    return transactions.filter(t => t.customerId === customer.id && t.type === 'receivable' && t.status === 'paid');
  }, [transactions, customer.id]);

  const handleBookSlot = async (slot: Booking) => {
    if (!selectedService) return;
    if ((db as any)._isMock) {
      alert("Modo de Demonstração: Agendamento simulado com sucesso!");
      setActiveTab('agenda');
      return;
    }
    setIsBooking(true);
    try {
      const bookingRef = doc(db, "bookings", slot.id);
      const serviceToBook = selectedService || services.find(s => s.id === slot.serviceId);
      
      if (!serviceToBook) {
        alert("Erro: Procedimento não identificado. Por favor, selecione o serviço novamente.");
        return;
      }

      await updateDoc(bookingRef, {
        customerId: customer.id,
        customerName: customer.name,
        serviceId: serviceToBook.id,
        serviceName: serviceToBook.name,
        status: 'pending', // Vai para aprovação da Moriá
        originalPrice: serviceToBook.price,
        duration: serviceToBook.duration,
        updatedAt: new Date().toISOString()
      });

      // Remove from waitlist if exists
      try {
        const { query, where, getDocs, collection, deleteDoc } = await import("firebase/firestore");
        const q = query(
          collection(db, "waitlist"), 
          where("customerId", "==", customer.id), 
          where("serviceId", "==", selectedService.id),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "waitlist", d.id));
        }
      } catch (waitlistErr) {
        console.error("Erro ao remover da lista de espera:", waitlistErr);
      }

      alert("Pedido de agendamento enviado! Aguarde a confirmação da Moriá.");
      setActiveTab('agenda');
    } catch (e: any) {
      console.error("Erro ao realizar agendamento:", e);
      if (e.code === 'permission-denied') {
        window.dispatchEvent(new Event('moria_permission_denied'));
        alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
      } else {
        alert("Erro ao realizar agendamento.");
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedService) return;
    if ((db as any)._isMock) {
      alert("Modo de Demonstração: Você entrou na lista de espera simulada!");
      setSelectedService(null);
      setActiveTab('home');
      return;
    }
    setIsBooking(true);
    try {
      if (!customer.id) throw new Error("ID do cliente não encontrado.");
      
      await addDoc(collection(db, "waitlist"), {
        customerId: customer.id,
        customerName: customer.name,
        customerWhatsapp: customer.whatsapp,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        preferredDate: new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString()
      });
      alert("Você entrou na lista de espera para este dia! Avisaremos se surgir uma vaga.");
      setSelectedService(null);
      setActiveTab('home');
    } catch (e: any) {
      console.error("Erro ao entrar na lista de espera:", e);
      if (e.code === 'permission-denied') {
        window.dispatchEvent(new Event('moria_permission_denied'));
        alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
      } else {
        alert(`Erro ao entrar na lista de espera: ${e.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsBooking(false);
    }
  };

  const lastProcedure = useMemo(() => {
    return bookings
      .filter(b => b.customerId === customer.id && b.status === 'completed')
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))[0];
  }, [bookings, customer.id]);

  const nextEstimate = useMemo(() => {
    if (!lastProcedure) return null;
    const service = services.find(s => s.id === lastProcedure.serviceId);
    if (!service || !service.returnPeriodDays) return null;

    const lastDate = new Date(lastProcedure.dateTime.split(' ')[0] + 'T00:00:00');
    const estimateDate = new Date(lastDate);
    estimateDate.setDate(lastDate.getDate() + service.returnPeriodDays);
    
    return {
      date: estimateDate,
      serviceName: service.name,
      isOverdue: estimateDate < new Date()
    };
  }, [lastProcedure, services]);

  const expiringProducts = useMemo(() => {
    if (!customer.productHistory) return [];
    const fifteenDaysFromNow = new Date().getTime() + (15 * 24 * 60 * 60 * 1000);
    return customer.productHistory.filter(sale => 
      sale.expiryDate && new Date(sale.expiryDate).getTime() <= fifteenDaysFromNow
    );
  }, [customer.productHistory]);

  const storeProducts = useMemo(() => {
    return inventory.filter(item => item.showOnSite && !item.isSalonUseOnly);
  }, [inventory]);

  const getProductPrice = (product: InventoryItem) => {
    if (product.customerPrice && product.customerPrice > 0) return product.customerPrice;
    const markup = settings.visitorMarkupPercent || 0;
    const basePrice = product.purchasePrice || 0;
    const calculatedPrice = basePrice * (1 + markup / 100);
    return calculatedPrice > 0 ? calculatedPrice : (product.customerPrice || 0);
  };

  const handleConfirmOrder = () => {
    if (!selectedProduct) return;
    
    const order = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: customer.id,
      customerName: customer.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      amount: getProductPrice(selectedProduct),
      paymentMethod: orderData.paymentMethod,
      deliveryMethod: orderData.deliveryMethod,
      installmentsCount: orderData.installmentsCount,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    onPlaceOrder(order);
    setShowCheckoutModal(false);
    setSelectedProduct(null);
    alert("Pedido realizado com sucesso! A Moriá entrará em contato para combinar a entrega.");
  };

  const handleConfirmInterest = () => {
    if (!selectedProduct) return;
    
    const interest = {
      id: Math.random().toString(36).substr(2, 9),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      customerName: interestData.name,
      customerWhatsapp: interestData.whatsapp,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    onAddInterest(interest);
    setShowInterestModal(false);
    setSelectedProduct(null);
    alert("Interesse registrado! Avisaremos você assim que o produto estiver disponível.");
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in font-sans">
      <header className="bg-gradient-to-b from-tea-900 to-tea-950 pt-16 pb-28 px-8 rounded-b-[5rem] shadow-2xl relative overflow-hidden">
        <div className="max-w-md mx-auto relative z-10 text-center space-y-4">
           <h1 className="text-3xl font-serif text-white font-bold italic">Olá, {customer.name.split(' ')[0]}</h1>
           <p className="text-tea-100/60 text-xs italic tracking-widest uppercase font-bold">Studio Moriá Estética</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 -mt-16 relative z-20 space-y-10 pb-10">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setActiveTab('agendar')} className={`p-8 rounded-[3rem] shadow-xl border flex flex-col items-center gap-4 transition-all ${activeTab === 'agendar' ? 'bg-tea-50 border-tea-200' : 'bg-white border-gray-50'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${activeTab === 'agendar' ? 'bg-tea-900 text-white' : 'bg-tea-50 text-tea-900'}`}>✨</div>
            <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Procedimentos</span>
          </button>
          <button onClick={() => setActiveTab('agenda')} className={`p-8 rounded-[3rem] shadow-xl border flex flex-col items-center gap-4 transition-all ${activeTab === 'agenda' ? 'bg-tea-50 border-tea-200' : 'bg-white border-gray-50'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${activeTab === 'agenda' ? 'bg-tea-900 text-white' : 'bg-tea-50 text-tea-800'}`}>🗓️</div>
            <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Minha Agenda</span>
          </button>
          <button onClick={() => setActiveTab('faturas')} className={`p-8 rounded-[3rem] shadow-xl border flex flex-col items-center gap-4 transition-all ${activeTab === 'faturas' ? 'bg-tea-50 border-tea-200' : 'bg-white border-gray-50'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${activeTab === 'faturas' ? 'bg-tea-900 text-white' : 'bg-tea-50 text-tea-800'}`}>💳</div>
            <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Faturas</span>
          </button>
          <button onClick={() => setActiveTab('loja')} className={`p-8 rounded-[3rem] shadow-xl border flex flex-col items-center gap-4 transition-all ${activeTab === 'loja' ? 'bg-tea-50 border-tea-200' : 'bg-white border-gray-50'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${activeTab === 'loja' ? 'bg-tea-900 text-white' : 'bg-tea-50 text-tea-800'}`}>🛍️</div>
            <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Loja</span>
          </button>
        </div>

        {activeTab === 'home' && settings.loyaltyConfig?.enabled && customer.isLoyaltyEnabled !== false && (
          <div className="bg-white p-8 rounded-[3.5rem] border border-tea-100 shadow-xl relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl">💎</div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-tea-800 uppercase tracking-widest mb-2">Programa de Fidelidade</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-serif font-bold text-tea-950 italic">{customer.loyaltyPoints || 0}</span>
                <span className="text-xs font-bold text-tea-600 uppercase tracking-widest mb-2">Pontos</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-tea-900 transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((customer.loyaltyPoints || 0) / (settings.loyaltyConfig.minPointsToRedeem)) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  { (customer.loyaltyPoints || 0) >= settings.loyaltyConfig.minPointsToRedeem 
                    ? "🎉 Parabéns! Você já pode resgatar seu prêmio: " + settings.loyaltyConfig.rewardDescription
                    : `Faltam ${settings.loyaltyConfig.minPointsToRedeem - (customer.loyaltyPoints || 0)} pontos para você ganhar: ${settings.loyaltyConfig.rewardDescription}`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'home' && expiringProducts.length > 0 && (
          <div className="bg-red-50 p-8 rounded-[3.5rem] border border-red-100 shadow-xl animate-slide-up mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl">⚠️</div>
              <h4 className="text-sm font-bold text-red-900 uppercase tracking-widest">Atenção ao Vencimento</h4>
            </div>
            <p className="text-xs text-red-700 mb-4">Você possui produtos adquiridos que estão próximos do vencimento ou já venceram:</p>
            <div className="space-y-3">
              {expiringProducts.map(sale => (
                <div key={sale.id} className="bg-white/60 p-4 rounded-2xl border border-red-50">
                  <p className="text-xs font-bold text-red-900">{sale.productName}</p>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">
                    {new Date(sale.expiryDate!).getTime() < new Date().getTime() ? 'VENCIDO EM: ' : 'VENCE EM: '}
                    {new Date(sale.expiryDate! + 'T00:00:00').toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {activeTab === 'agendar' && (
          <div className="space-y-8 animate-slide-up">
            {!selectedService ? (
              <div className="space-y-6">
                <h3 className="text-2xl font-serif text-tea-950 italic font-bold text-center">Escolha o Procedimento</h3>
                <div className="space-y-4">
                  {services.filter(s => s.isVisible).map(s => (
                    <button key={s.id} onClick={() => setSelectedService(s)} className="w-full p-8 rounded-[2.5rem] border-2 bg-white border-gray-50 hover:border-tea-200 transition-all flex justify-between items-center group">
                       <div className="text-left">
                          <p className="font-bold text-tea-950 text-lg group-hover:text-tea-800">{s.name}</p>
                          <div className="flex gap-4 mt-1">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.duration}min</p>
                             <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">A partir de R$ {s.price.toFixed(0)}</p>
                          </div>
                       </div>
                       <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">🌿</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-slide-up">
                <button onClick={() => { setSelectedService(null); setSelectedDay(null); }} className="text-[10px] font-bold text-tea-600 uppercase tracking-widest flex items-center gap-2">
                  ← Voltar para Serviços
                </button>
                
                <div className="p-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-4 text-center">
                  <h3 className="text-2xl font-serif text-tea-950 font-bold italic">{selectedService.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {selectedDay ? 'Escolha o melhor horário' : 'Escolha o melhor dia'}
                  </p>
                </div>

                <div className="space-y-8">
                  {availableDays.length > 0 ? (
                    <div className="animate-fade-in">
                      {!selectedDay ? (
                        <div className="grid grid-cols-2 gap-3">
                          {availableDays.map(day => (
                            <button 
                              key={day} 
                              onClick={() => setSelectedDay(day)}
                              className="p-6 bg-white border border-tea-100 text-tea-900 rounded-[2rem] font-bold text-xs shadow-sm hover:bg-tea-50 transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                              <span className="opacity-40 text-[8px] uppercase">
                                {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                              </span>
                              <span>{new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-bold text-tea-800 uppercase tracking-widest">
                              Horários para {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                            <button 
                              onClick={() => setSelectedDay(null)}
                              className="text-[9px] font-bold text-tea-600 uppercase tracking-widest hover:underline"
                            >
                              ← Mudar Dia
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {slotsForSelectedDay.map(slot => (
                              <button 
                                key={slot.id} 
                                disabled={isBooking}
                                onClick={() => handleBookSlot(slot)}
                                className="p-4 bg-tea-900 text-white rounded-2xl font-bold text-xs shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                              >
                                {slot.dateTime.split(' ')[1]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-10 bg-tea-50 rounded-[3rem] border border-tea-100 text-center space-y-6">
                       <div className="text-4xl">📬</div>
                       <div className="space-y-2">
                          <h4 className="text-lg font-serif font-bold text-tea-900 italic">Nenhum horário livre</h4>
                          <p className="text-xs text-tea-700 leading-relaxed">
                            Infelizmente não há horários liberados no momento.
                          </p>
                       </div>
                       <button 
                        onClick={handleJoinWaitlist}
                        disabled={isBooking}
                        className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50"
                       >
                        {isBooking ? 'Entrando...' : 'Entrar na Lista de Espera'}
                       </button>
                       <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest">Avisaremos você via WhatsApp se uma vaga surgir!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-6 animate-slide-up">
             <h3 className="text-2xl font-serif text-tea-950 italic font-bold text-center">Meus Cuidados</h3>
             {bookings.filter(b => b.customerId === customer.id).sort((a,b) => b.dateTime.localeCompare(a.dateTime)).map(b => (
                <div key={b.id} className="p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm space-y-4 relative overflow-hidden">
                   <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xl font-serif font-bold text-tea-950 italic leading-tight">{b.serviceName || 'Serviço'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                           {b.originalPrice ? `Valor: R$ ${b.originalPrice.toFixed(2)}` : 'Valor sob consulta'}
                        </p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                        b.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        b.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                        b.status === 'cancelled' ? 'bg-red-50 text-red-400' :
                        'bg-tea-900 text-white'
                      }`}>
                        {b.status === 'completed' ? 'Realizado' : b.status === 'pending' ? 'Em Aprovação' : b.status === 'cancelled' ? 'Cancelado' : 'Confirmado'}
                      </span>
                   </div>
                   <div className="flex gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest pt-4 border-t border-gray-50">
                      <span>🗓️ {b.dateTime.replace(/\[object Object\]/gi, '').split(' ')[0]}</span>
                      <span>⏰ {b.dateTime.replace(/\[object Object\]/gi, '').split(' ')[1] || '--:--'}</span>
                      {b.teamMemberName && <span className="ml-4">👤 {b.teamMemberName}</span>}
                   </div>
                   {b.status === 'pending' && (
                     <button 
                      onClick={() => onCancelBooking(b.id)}
                      className="w-full py-3 text-red-300 font-bold uppercase text-[9px] tracking-widest hover:text-red-500"
                     >
                      Desistir do Agendamento
                     </button>
                   )}
                   {b.status === 'scheduled' && (
                     <button 
                      onClick={() => handleCancelBooking(b.id)}
                      className="w-full py-3 text-red-300 font-bold uppercase text-[9px] tracking-widest hover:text-red-500"
                     >
                      Cancelar Agendamento
                     </button>
                   )}
                </div>
             ))}
             {bookings.filter(b => b.customerId === customer.id).length === 0 && waitlist.length === 0 && (
               <div className="text-center py-20 opacity-30 italic text-sm">Você ainda não tem agendamentos ou esperas.</div>
             )}

             {waitlist.length > 0 && (
               <div className="space-y-4 pt-8 border-t border-gray-100">
                 <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest text-center">Minha Lista de Espera</h4>
                 {waitlist.map(w => {
                   const service = services.find(s => s.id === w.serviceId);
                   return (
                     <div key={w.id} className="p-6 bg-tea-50/50 rounded-[2.5rem] border border-tea-100/50 space-y-3 relative">
                       <div className="flex justify-between items-start">
                         <div>
                           <h5 className="text-sm font-serif font-bold text-tea-950 italic">{service?.name || 'Procedimento'}</h5>
                           <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest">Aguardando vaga para {w.date}</p>
                         </div>
                         <button 
                           onClick={() => onRemoveWaitlist(w.id)}
                           className="text-tea-300 hover:text-red-400 transition-colors text-xs"
                         >
                           ✕
                         </button>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="w-2 h-2 bg-tea-400 rounded-full animate-pulse"></span>
                         <span className="text-[9px] text-tea-700 font-bold uppercase tracking-widest">Status: Na fila</span>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        )}

        {activeTab === 'faturas' && (
          <div className="space-y-6 animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-950 italic font-bold text-center">Minhas Faturas</h3>
            
            {pendingInvoices.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest ml-4">Pagamentos Pendentes</p>
                {pendingInvoices.map(t => (
                  <div key={t.id} className="p-8 bg-orange-50/50 rounded-[3rem] border border-orange-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-serif font-bold text-tea-950 italic">{t.description}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Vencimento: {t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : 'A definir'}</p>
                      </div>
                      <span className="text-lg font-bold text-tea-900">R$ {t.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                       <span className="text-[9px] text-orange-700 font-bold uppercase tracking-widest">Aguardando Pagamento</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {paidInvoices.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-tea-600 uppercase tracking-widest ml-4">Histórico de Pagamentos</p>
                {paidInvoices.map(t => (
                  <div key={t.id} className="p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm space-y-3 opacity-70">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-serif font-bold text-tea-950 italic">{t.description}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pago em: {t.paidAt ? new Date(t.paidAt).toLocaleDateString('pt-BR') : new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="text-lg font-bold text-tea-900">R$ {t.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                       <span className="text-[9px] text-green-700 font-bold uppercase tracking-widest">Pagamento Realizado</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingInvoices.length === 0 && paidInvoices.length === 0 && (
              <div className="text-center py-20 opacity-30 italic text-sm">Nenhuma fatura encontrada.</div>
            )}
          </div>
        )}

        {activeTab === 'loja' && (
          <div className="space-y-8 animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-950 italic font-bold text-center">Loja Moriá</h3>
            <div className="grid grid-cols-1 gap-8">
              {storeProducts.map(product => {
                const price = getProductPrice(product);
                const canBuy = product.quantity >= 2;
                
                return (
                  <div 
                    key={product.id} 
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowProductDetailModal(true);
                    }}
                    className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-all group"
                  >
                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-tea-200 text-6xl">🛍️</div>
                      )}
                      {!canBuy && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                          <p className="text-tea-900 font-bold text-xs uppercase tracking-widest">Estoque Limitado</p>
                        </div>
                      )}
                    </div>
                    <div className="p-8 space-y-4">
                      <div>
                        <h4 className="text-xl font-serif font-bold text-tea-950 italic">{product.name}</h4>
                        <p className="text-xs text-gray-500 italic line-clamp-2 mt-2">{product.description}</p>
                        <span className="text-[9px] text-tea-600 font-bold uppercase tracking-widest mt-2 block">Toque para ver detalhes</span>
                      </div>
                      <div className="text-2xl font-serif font-bold text-tea-900 italic">R$ {price.toFixed(2)}</div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          if (canBuy) setShowCheckoutModal(true);
                          else setShowInterestModal(true);
                        }}
                        className="w-full py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all"
                      >
                        {canBuy ? 'Comprar Agora' : 'Tenho Interesse'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {storeProducts.length === 0 && (
                <div className="text-center py-20 opacity-30 italic text-sm">Nenhum produto disponível no momento.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-8 animate-slide-up">
             {pendingInvoices.length > 0 && (
               <div className="p-8 bg-red-50 rounded-[3.5rem] border border-red-100 shadow-xl space-y-4 relative overflow-hidden animate-pulse">
                  <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl">💳</div>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Aviso de Fatura</p>
                      <h4 className="text-2xl font-serif font-bold text-tea-950 italic leading-tight">Pagamento Pendente</h4>
                    </div>
                  </div>
                  <p className="text-sm text-red-800 leading-relaxed font-medium">
                    Você possui {pendingInvoices.length} {pendingInvoices.length === 1 ? 'fatura pendente' : 'faturas pendentes'}. 
                    Por favor, verifique os detalhes na aba de faturas.
                  </p>
                  <button 
                    onClick={() => setActiveTab('faturas')}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700 transition-all"
                  >
                    Ver Minhas Faturas
                  </button>
               </div>
             )}

             {nextEstimate && (
               <div className={`p-8 rounded-[3.5rem] border shadow-2xl space-y-4 relative overflow-hidden transition-all transform hover:scale-[1.02] ${nextEstimate.isOverdue ? 'bg-orange-50 border-orange-200 ring-4 ring-orange-100/50' : 'bg-white border-tea-100'}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${nextEstimate.isOverdue ? 'text-orange-600' : 'text-tea-800'}`}>
                        {nextEstimate.isOverdue ? '⚠️ Atenção: Hora de Voltar!' : 'Seu próximo cuidado'}
                      </p>
                      <h4 className="text-2xl font-serif font-bold text-tea-950 italic leading-tight">{nextEstimate.serviceName}</h4>
                    </div>
                    <div className={`text-3xl ${nextEstimate.isOverdue ? 'animate-bounce' : ''}`}>
                      {nextEstimate.isOverdue ? '⏰' : '✨'}
                    </div>
                  </div>
                  
                  <div className={`pt-4 border-t space-y-4 ${nextEstimate.isOverdue ? 'border-orange-100' : 'border-tea-50'}`}>
                    <p className={`text-sm leading-relaxed ${nextEstimate.isOverdue ? 'text-orange-800 font-medium' : 'text-gray-500'}`}>
                      {nextEstimate.isOverdue 
                        ? "Já passou do tempo ideal para refazer seu procedimento! Sua pele e bem-estar agradecem a manutenção." 
                        : (
                          <>
                            Oi, {customer.name.split(' ')[0]}! 💛<br/><br/>
                            Passando para lembrar que sua data ideal para manutenção do procedimento <strong>{nextEstimate.serviceName}</strong> é dia <strong>{nextEstimate.date.toLocaleDateString('pt-BR')}</strong>.<br/><br/>
                            Esse intervalo é importante para manter o resultado bonito e, principalmente, a saúde do seu cabelo em dia ✨<br/><br/>
                            Se quiser, posso reservar um horário para você com calma 💆‍♀️
                          </>
                        )}
                    </p>
                    <button 
                      onClick={() => setActiveTab('agendar')}
                      className={`w-full py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg transition-all ${nextEstimate.isOverdue ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-tea-900 text-white hover:bg-black'}`}
                    >
                      {nextEstimate.isOverdue ? 'Agendar Retorno Agora' : 'Ver Horários Disponíveis'}
                    </button>
                  </div>
               </div>
             )}

             {promotions.filter(p => p.isActive).length > 0 && (
               <div className="space-y-4">
                 <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Destaques para Você</h4>
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scroll snap-x">
                    {promotions.filter(p => p.isActive).map(p => (
                      <div key={p.id} className="min-w-[280px] snap-center bg-tea-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">✨</div>
                        <h5 className="font-serif italic text-xl mb-2">{p.title}</h5>
                        <p className="text-xs text-tea-100/80 line-clamp-2 mb-4 leading-relaxed">{p.content}</p>
                        <button onClick={() => setActiveTab('agendar')} className="bg-white text-tea-900 px-6 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest">Saber Mais</button>
                      </div>
                    ))}
                 </div>
               </div>
             )}

             <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mx-auto border border-gray-100">🌿</div>
                <h3 className="text-2xl font-serif text-tea-950 italic font-bold">Studio Moriá</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Sempre buscando a sua melhor versão através da estética avançada e cuidados personalizados.
                </p>
                <div className="pt-4 flex justify-center gap-6">
                   <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-tea-900 transition-colors">Instagram</a>
                   <a href={`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-tea-900 transition-colors">WhatsApp</a>
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center">
         <div className="w-full max-w-xs bg-tea-950 rounded-[3rem] p-3 flex justify-around items-center border border-white/10 shadow-2xl backdrop-blur-md">
            <button onClick={() => setActiveTab('home')} className={`text-xl transition-all ${activeTab === 'home' ? 'text-tea-400 scale-125' : 'text-white/30'}`}>🏠</button>
            <button onClick={() => setActiveTab('agendar')} className={`text-xl transition-all ${activeTab === 'agendar' ? 'text-tea-400 scale-125' : 'text-white/30'}`}>✨</button>
            <button onClick={() => setActiveTab('loja')} className={`text-xl transition-all ${activeTab === 'loja' ? 'text-tea-400 scale-125' : 'text-white/30'}`}>🛍️</button>
            <button onClick={() => setActiveTab('agenda')} className={`text-xl transition-all ${activeTab === 'agenda' ? 'text-tea-400 scale-125' : 'text-white/30'}`}>🗓️</button>
            <button onClick={onGoToProfile} className="text-xl text-white/30 hover:text-tea-400 transition-all">👤</button>
            <button onClick={onLogout} className="text-xl text-red-900/40">👋</button>
         </div>
      </nav>

      {/* Modais da Loja */}
      {showProductDetailModal && selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-3xl animate-slide-up flex flex-col border border-tea-50 max-h-[90vh]">
            <div className="relative aspect-square bg-gray-50">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-tea-200 text-8xl">🛍️</div>
              )}
              <button 
                onClick={() => setShowProductDetailModal(false)} 
                className="absolute top-6 right-6 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-tea-950 shadow-lg hover:bg-white transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="p-10 md:p-14 overflow-y-auto custom-scroll space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-3xl font-serif text-tea-950 font-bold italic leading-tight">{selectedProduct.name}</h3>
                  <div className="text-2xl font-serif font-bold text-tea-900 italic whitespace-nowrap">
                    R$ {getProductPrice(selectedProduct).toFixed(2)}
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest">Descrição do Produto</h4>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {selectedProduct.description || 'Sem descrição disponível.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowProductDetailModal(false);
                  if (selectedProduct.quantity >= 2) setShowCheckoutModal(true);
                  else setShowInterestModal(true);
                }}
                className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl"
              >
                {selectedProduct.quantity >= 2 ? 'Comprar Agora' : 'Tenho Interesse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-3xl animate-slide-up flex flex-col border border-tea-50 max-h-[90vh]">
            <div className="p-10 md:p-14 overflow-y-auto custom-scroll space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="bg-tea-50 text-tea-700 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block border border-tea-100">Finalizar Pedido</span>
                  <h3 className="text-3xl font-serif text-tea-950 font-bold italic leading-tight">{selectedProduct.name}</h3>
                </div>
                <button onClick={() => setShowCheckoutModal(false)} className="p-4 hover:bg-tea-50 rounded-2xl transition-all text-gray-300 hover:text-tea-900">✕</button>
              </div>

              <div className="space-y-6">
                <div className="bg-tea-50 p-6 rounded-3xl border border-tea-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-tea-900 uppercase tracking-widest">Valor do Produto</span>
                  <span className="text-2xl font-serif font-bold text-tea-950 italic">R$ {getProductPrice(selectedProduct).toFixed(2)}</span>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest border-b border-gray-100 pb-2">Forma de Pagamento</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'pix', label: 'PIX', icon: '📱' },
                      { id: 'credit', label: 'Crédito', icon: '💳' },
                      { id: 'debit', label: 'Débito', icon: '🏧' },
                      { id: 'store_installments', label: 'A Prazo', icon: '📅' },
                      { id: 'cash', label: 'Dinheiro', icon: '💵' }
                    ].map(method => (
                      <button 
                        key={method.id}
                        onClick={() => setOrderData({ ...orderData, paymentMethod: method.id as any, installmentsCount: 1 })}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${orderData.paymentMethod === method.id ? 'border-tea-900 bg-tea-50' : 'border-gray-50 bg-white'}`}
                      >
                        <span className="text-xl">{method.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {['credit', 'store_installments'].includes(orderData.paymentMethod) && (
                  <div className="space-y-4 animate-fade-in">
                    <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest border-b border-gray-100 pb-2">Parcelamento</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nº de Parcelas</label>
                        <select
                          value={orderData.installmentsCount}
                          onChange={(e) => setOrderData({ ...orderData, installmentsCount: Number(e.target.value) })}
                          className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100 text-xs"
                        >
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Valor da Parcela</label>
                        <div className="w-full p-4 bg-gray-100 border-none rounded-2xl font-bold text-tea-900 flex items-center text-xs">
                          R$ {(getProductPrice(selectedProduct) / orderData.installmentsCount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest border-b border-gray-100 pb-2">Entrega / Retirada</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setOrderData({ ...orderData, deliveryMethod: 'pickup' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${orderData.deliveryMethod === 'pickup' ? 'border-tea-900 bg-tea-50' : 'border-gray-50 bg-white'}`}
                    >
                      <span className="text-xl">🏪</span>
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Retirada</p>
                        <p className="text-[8px] text-gray-400">No Studio Moriá</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => setOrderData({ ...orderData, deliveryMethod: 'delivery' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${orderData.deliveryMethod === 'delivery' ? 'border-tea-900 bg-tea-50' : 'border-gray-50 bg-white'}`}
                    >
                      <span className="text-xl">🛵</span>
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Entrega</p>
                        <p className="text-[8px] text-gray-400">A combinar</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleConfirmOrder}
                className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-black transition-all"
              >
                Confirmar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {showInterestModal && selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-3xl animate-slide-up flex flex-col border border-tea-50">
            <div className="p-10 md:p-14 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="bg-tea-50 text-tea-700 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block border border-tea-100">Tenho Interesse</span>
                  <h3 className="text-3xl font-serif text-tea-950 font-bold italic leading-tight">{selectedProduct.name}</h3>
                </div>
                <button onClick={() => setShowInterestModal(false)} className="p-4 hover:bg-tea-50 rounded-2xl transition-all text-gray-300 hover:text-tea-900">✕</button>
              </div>

              <p className="text-sm text-gray-500 italic leading-relaxed">
                Este produto está com estoque limitado. Deixe seu contato e avisaremos você assim que estiver disponível para compra!
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">Seu Nome</label>
                  <input 
                    type="text" 
                    value={interestData.name}
                    onChange={e => setInterestData({ ...interestData, name: e.target.value })}
                    className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-tea-100 outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">Seu WhatsApp</label>
                  <input 
                    type="text" 
                    value={interestData.whatsapp}
                    onChange={e => setInterestData({ ...interestData, whatsapp: e.target.value })}
                    className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-tea-100 outline-none font-medium"
                  />
                </div>
              </div>

              <button 
                onClick={handleConfirmInterest}
                className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-black transition-all"
              >
                Registrar Interesse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
