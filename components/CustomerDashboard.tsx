
import React, { useState, useMemo } from 'react';
import { Customer, Booking, Service, SalonSettings, WaitlistEntry, Promotion } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

interface CustomerDashboardProps {
  customer: Customer;
  bookings: Booking[];
  services: Service[];
  settings: SalonSettings;
  onLogout: () => void;
  onUpdateProfile: (upd: any) => void;
  onCancelBooking: (id: string) => void;
  onGoToProfile: () => void;
  waitlist: WaitlistEntry[];
  onRemoveWaitlist: (id: string) => void;
  promotions: Promotion[];
  initialTab?: 'home' | 'agendar' | 'agenda';
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  customer, 
  bookings, 
  services, 
  settings, 
  onLogout,
  onUpdateProfile,
  onCancelBooking,
  onGoToProfile,
  waitlist,
  onRemoveWaitlist,
  promotions,
  initialTab = 'home'
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agenda'>(initialTab);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Filtra slots abertos pela Moriá de hoje em diante
  const availableSlots = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(b => 
      b.status === 'open' && 
      b.dateTime >= today
    ).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [bookings]);

  const groupedSlots = useMemo(() => {
    const groups: { [key: string]: Booking[] } = {};
    availableSlots.forEach(slot => {
      const date = slot.dateTime.split(' ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(slot);
    });
    return groups;
  }, [availableSlots]);

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
      await updateDoc(bookingRef, {
        customerId: customer.id,
        customerName: customer.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        status: 'pending', // Vai para aprovação da Moriá
        originalPrice: selectedService.price,
        duration: selectedService.duration,
        updatedAt: new Date().toISOString()
      });
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
        </div>

        {activeTab === 'home' && settings.loyaltyConfig?.enabled && (
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
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">A partir de R$ {s.price.toFixed(2)} • {s.duration}min</p>
                       </div>
                       <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">🌿</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-slide-up">
                <button onClick={() => setSelectedService(null)} className="text-[10px] font-bold text-tea-600 uppercase tracking-widest flex items-center gap-2">
                  ← Voltar para Serviços
                </button>
                
                <div className="p-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-4 text-center">
                  <h3 className="text-2xl font-serif text-tea-950 font-bold italic">{selectedService.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Escolha o melhor horário para você</p>
                </div>

                <div className="space-y-8">
                  {Object.keys(groupedSlots).length > 0 ? (
                    <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-2 custom-scroll">
                      {Object.entries(groupedSlots).map(([date, slots]: [string, any]) => (
                        <div key={date} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-gray-100"></div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                            </span>
                            <div className="h-px flex-1 bg-gray-100"></div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {(slots as Booking[]).map(slot => (
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
                      ))}
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
                        <h4 className="text-xl font-serif font-bold text-tea-950 italic leading-tight">{b.serviceName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">A partir de R$ {b.originalPrice?.toFixed(2)}</p>
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
                      <span>🗓️ {b.dateTime.split(' ')[0]}</span>
                      <span>⏰ {b.dateTime.split(' ')[1]}</span>
                   </div>
                   {b.status === 'pending' && (
                     <button 
                      onClick={() => onCancelBooking(b.id)}
                      className="w-full py-3 text-red-300 font-bold uppercase text-[9px] tracking-widest hover:text-red-500"
                     >
                      Desistir do Agendamento
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

        {activeTab === 'home' && (
          <div className="space-y-8 animate-slide-up">
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
            <button onClick={() => setActiveTab('agenda')} className={`text-xl transition-all ${activeTab === 'agenda' ? 'text-tea-400 scale-125' : 'text-white/30'}`}>🗓️</button>
            <button onClick={onGoToProfile} className="text-xl text-white/30 hover:text-tea-400 transition-all">👤</button>
            <button onClick={onLogout} className="text-xl text-red-900/40">👋</button>
         </div>
      </nav>
    </div>
  );
};

export default CustomerDashboard;
