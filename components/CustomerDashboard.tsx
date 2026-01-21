
import React, { useState, useMemo } from 'react';
import { Customer, Booking, Service, SalonSettings, TeamMember, Promotion } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc } from "firebase/firestore";

interface CustomerDashboardProps {
  customer: Customer;
  bookings: Booking[];
  services: Service[];
  settings: SalonSettings;
  onBook: (serviceId: string, dateTime: string, teamMemberId?: string, promoData?: any) => void;
  onUpdateProfile: (updated: Partial<Customer>) => void;
  onLogout: () => void;
  onCancelBooking: (id: string) => void;
  onAddToWaitlist?: (serviceId: string, date: string) => void;
  promotions?: Promotion[];
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  customer, 
  bookings, 
  services, 
  settings,
  onLogout,
  promotions = []
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agenda' | 'perfil'>('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProId, setSelectedProId] = useState<string>('');
  const [agreedToCancellation, setAgreedToCancellation] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const POLICY_MODAL_TEXT = "Declaro ciência da taxa de reserva de 30%. Em caso de falta, 50% desse valor (no caso 15% do valor do serviço) será retido ao salão.";

  // Dados Derivados
  const myBookings = useMemo(() => 
    bookings.filter(b => b.customerId === customer.id).sort((a,b) => b.dateTime.localeCompare(a.dateTime)),
  [bookings, customer.id]);

  const completedCount = useMemo(() => myBookings.filter(b => b.status === 'completed').length, [myBookings]);
  const loyaltyProgress = (completedCount % 10);

  const highlightedServices = useMemo(() => services.filter(s => s.isVisible && s.isHighlighted), [services]);
  
  const activePromosAndTips = useMemo(() => {
    return promotions.filter(p => 
      p.isActive && 
      (p.targetCustomerIds.length === 0 || p.targetCustomerIds.includes(customer.id))
    ).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }, [promotions, customer.id]);

  const filteredServices = useMemo(() => {
    if (activeCategory === 'Todos') return services.filter(s => s.isVisible);
    return services.filter(s => 
      s.isVisible && 
      (s.description.toLowerCase().includes(activeCategory.toLowerCase()) || 
       s.name.toLowerCase().includes(activeCategory.toLowerCase()))
    );
  }, [services, activeCategory]);

  // Função Auxiliar de Verificação de Horário (Overlap Check)
  const getAvailabilityForDate = (date: string, service: Service) => {
    const slots: Record<string, TeamMember[]> = {};
    const startH = parseInt(settings.businessHours.start.split(':')[0]);
    const endH = parseInt(settings.businessHours.end.split(':')[0]);

    const timeToMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const possibleTimes: string[] = [];
    for (let h = startH; h < endH; h++) {
      possibleTimes.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`);
    }

    possibleTimes.forEach(time => {
      const sStart = timeToMin(time);
      const sEnd = sStart + service.duration;

      const pros = settings.teamMembers.filter(pro => {
        if (!pro.assignedServiceIds.includes(service.id)) return false;
        const dayOfWeek = new Date(date + 'T12:00:00').getDay();
        if (pro.offDays?.includes(dayOfWeek)) return false;

        const hasConflict = bookings.some(b => {
          if (b.teamMemberId !== pro.id || b.status === 'cancelled' || !b.dateTime.startsWith(date)) return false;
          const bStart = timeToMin(b.dateTime.split(' ')[1]);
          const bDuration = b.duration || 30;
          const bEnd = bStart + bDuration;
          return (sStart < bEnd && sEnd > bStart);
        });

        return !hasConflict;
      });

      if (pros.length > 0) slots[time] = pros;
    });

    return slots;
  };

  // Memo para slots do dia selecionado
  const availableSlotsForDate = useMemo(() => {
    if (!selectedService) return {};
    return getAvailabilityForDate(selectedDate, selectedService);
  }, [selectedService, selectedDate, bookings, settings]);

  // Gerador de Dias para o Calendário (Próximos 14 dias ou até agendaOpenUntil)
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    const limit = settings.agendaOpenUntil ? new Date(settings.agendaOpenUntil) : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    let current = new Date(today);
    current.setHours(0,0,0,0);

    while (current <= limit) {
      const dateStr = current.toISOString().split('T')[0];
      const slots = selectedService ? getAvailabilityForDate(dateStr, selectedService) : {};
      const isAvailable = Object.keys(slots).length > 0;
      
      days.push({
        date: dateStr,
        dayName: current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        dayNum: current.getDate(),
        isAvailable
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [selectedService, bookings, settings]);

  const handleBookSubmit = async () => {
    if (selectedService && selectedProId && selectedTime && agreedToCancellation) {
      const pro = settings.teamMembers.find(m => m.id === selectedProId);
      await addDoc(collection(db, "bookings"), {
        customerId: customer.id,
        customerName: customer.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        dateTime: `${selectedDate} ${selectedTime}`,
        duration: selectedService.duration,
        status: 'pending',
        depositStatus: 'pending',
        teamMemberId: selectedProId,
        teamMemberName: pro?.name,
        agreedToCancellationPolicy: true,
        policyAgreedAt: new Date().toISOString(),
        policyAgreedText: POLICY_MODAL_TEXT,
        originalPrice: selectedService.price,
        finalPrice: selectedService.price
      });
      setShowPolicyModal(false);
      setBookingStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in font-sans">
      
      {/* Modal de Política de Cancelamento */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-3xl animate-slide-up space-y-8 text-center border-4 border-tea-100">
            <div className="w-20 h-20 bg-tea-50 text-tea-900 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">📄</div>
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-tea-950 italic">Compromisso Moriá</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{POLICY_MODAL_TEXT}</p>
            </div>
            <button onClick={handleBookSubmit} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl">Confirmar e Reservar</button>
            <button onClick={() => setShowPolicyModal(false)} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px]">Cancelar</button>
          </div>
        </div>
      )}

      {/* Header com Cartão Fidelidade */}
      <header className="bg-gradient-to-b from-tea-900 to-tea-950 pt-16 pb-28 px-8 rounded-b-[5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-tea-400/10 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none"></div>
        <div className="max-w-md mx-auto relative z-10 space-y-8">
          <div className="w-full flex justify-between items-center">
             <div className="w-16 h-16 bg-white/10 rounded-3xl backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <span className="text-white text-2xl font-serif italic font-bold">{customer.name.charAt(0)}</span>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-bold text-tea-300 uppercase tracking-[0.3em] mb-1">Studio Moriá</p>
                <h1 className="text-2xl font-serif text-white font-bold italic leading-none">{customer.name.split(' ')[0]}</h1>
             </div>
          </div>
          <div className="w-full bg-white/5 backdrop-blur-md rounded-[3rem] p-8 border border-white/10 shadow-2xl space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-tea-200 uppercase tracking-widest">Cartão Fidelidade</span>
                <span className="text-[10px] text-white font-serif italic">{completedCount} Visitas</span>
             </div>
             <div className="flex justify-between gap-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-700 ${i < loyaltyProgress ? 'bg-tea-300 shadow-[0_0_10px_rgba(142,201,154,0.6)]' : 'bg-white/10'}`}></div>
                ))}
             </div>
             <p className="text-[10px] text-tea-100 font-medium italic text-center">Ganhe um presente especial após 10 sessões ✨</p>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-md mx-auto px-6 -mt-16 relative z-20 space-y-12 pb-10">
        
        {activeTab === 'home' && (
          <div className="space-y-12 animate-slide-up">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setActiveTab('agendar')} className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50 flex flex-col items-center gap-4 group hover:bg-tea-50 transition-all">
                  <div className="w-12 h-12 bg-tea-100 text-tea-900 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">✨</div>
                  <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Agendar</span>
               </button>
               <button onClick={() => setActiveTab('agenda')} className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center gap-4 group hover:bg-tea-50 transition-all">
                  <div className="w-12 h-12 bg-gray-50 text-tea-800 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🗓️</div>
                  <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Agenda</span>
               </button>
            </div>

            {/* Destaques */}
            {highlightedServices.length > 0 && (
              <section className="space-y-6">
                 <div className="flex justify-between items-end px-2">
                    <h3 className="text-2xl font-serif text-tea-950 italic font-bold">Desejos Moriá</h3>
                    <button onClick={() => setActiveTab('agendar')} className="text-[9px] font-bold text-tea-600 uppercase tracking-widest hover:underline">Ver Todos</button>
                 </div>
                 <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {highlightedServices.map(service => (
                      <div 
                        key={service.id} 
                        onClick={() => { setSelectedService(service); setActiveTab('agendar'); setBookingStep(2); }}
                        className="min-w-[240px] bg-tea-900 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group cursor-pointer"
                      >
                         <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                         <span className="text-[8px] font-bold text-tea-300 uppercase tracking-widest mb-4 block">Especialidade VIP</span>
                         <h4 className="text-xl font-serif font-bold text-white italic mb-2 leading-tight">{service.name}</h4>
                         <p className="text-[10px] text-tea-100 font-bold uppercase tracking-widest mb-8">R$ {service.price.toFixed(2)}</p>
                         <button className="w-full py-4 bg-white text-tea-900 rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Reservar</button>
                      </div>
                    ))}
                 </div>
              </section>
            )}

            {/* Feed (Promoções e Dicas) */}
            <section className="space-y-6">
               <h3 className="text-2xl font-serif text-tea-950 italic font-bold px-2">Feed Studio Moriá</h3>
               <div className="space-y-6">
                  {activePromosAndTips.length > 0 ? activePromosAndTips.map(promo => (
                    <div 
                      key={promo.id} 
                      className={`p-8 rounded-[3.5rem] border shadow-sm space-y-4 relative overflow-hidden transition-all hover:shadow-md ${promo.type === 'promotion' ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}
                    >
                       <div className="flex justify-between items-start">
                          <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${promo.type === 'promotion' ? 'bg-orange-500 text-white' : 'bg-tea-50 text-tea-900'}`}>
                             {promo.type === 'promotion' ? 'Oferta Moriá' : 'Dica Especial ✨'}
                          </span>
                       </div>
                       <h4 className="text-lg font-serif font-bold text-tea-950 italic leading-tight">{promo.title}</h4>
                       <p className="text-gray-600 text-xs leading-relaxed italic">{promo.content}</p>
                       {promo.type === 'promotion' && (
                         <button onClick={() => setActiveTab('agendar')} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-lg">Agendar com Desconto</button>
                       )}
                    </div>
                  )) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                       <p className="text-gray-400 font-serif italic text-sm">Em breve, novas dicas e ofertas exclusivas!</p>
                    </div>
                  )}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'agendar' && (
          <div className="space-y-8 animate-slide-up">
            {bookingStep === 1 && (
              <div className="space-y-8">
                 <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                    {['Todos', 'Olhar', 'Rosto', 'Unhas', 'Corpo'].map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-tea-900 text-white shadow-xl' : 'bg-white text-gray-400 border border-gray-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
                 <div className="space-y-4">
                    {filteredServices.map(service => (
                      <div key={service.id} onClick={() => { setSelectedService(service); setBookingStep(2); }} className="bg-white p-8 rounded-[3.5rem] border border-gray-50 shadow-sm flex items-center justify-between group hover:border-tea-200 transition-all cursor-pointer">
                         <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-bold text-tea-950 text-xl italic">{service.name}</h4>
                              {service.isHighlighted && <span className="bg-orange-100 text-orange-600 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase">VIP</span>}
                            </div>
                            <p className="text-[10px] text-tea-800 font-bold uppercase tracking-widest">R$ {service.price.toFixed(2)} • {service.duration}min</p>
                         </div>
                         <div className="w-12 h-12 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center text-xl group-hover:bg-tea-900 group-hover:text-white transition-all">→</div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="bg-white rounded-[4rem] p-10 shadow-2xl space-y-10 animate-slide-up border border-tea-50">
                <button onClick={() => setBookingStep(1)} className="text-tea-800 font-bold text-[10px] uppercase tracking-widest">← Outro Serviço</button>
                
                <div className="space-y-8">
                   {/* Novo Calendário de Dias Inteligente */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Escolha o Dia do seu Cuidado</label>
                      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                         {calendarDays.map((day) => (
                           <button 
                             key={day.date}
                             disabled={!day.isAvailable}
                             onClick={() => { setSelectedDate(day.date); setSelectedTime(''); }}
                             className={`min-w-[70px] py-6 rounded-[2.5rem] border-2 flex flex-col items-center justify-center transition-all ${
                               selectedDate === day.date 
                                 ? 'bg-tea-900 border-tea-900 text-white shadow-xl scale-105' 
                                 : day.isAvailable 
                                   ? 'bg-tea-50/30 border-tea-100 text-tea-900 hover:bg-tea-50' 
                                   : 'bg-gray-50 border-transparent text-gray-300 opacity-40 cursor-not-allowed'
                             }`}
                           >
                             <span className="text-[8px] font-bold uppercase tracking-widest mb-1">{day.dayName}</span>
                             <span className="text-lg font-serif font-bold italic">{day.dayNum}</span>
                             {!day.isAvailable && <span className="text-[8px] mt-1 italic">Lotado</span>}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Horários */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Horários para {selectedService.duration}min</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(availableSlotsForDate).sort().map(t => (
                          <button key={t} onClick={() => setSelectedTime(t)} className={`py-4 rounded-2xl text-[10px] font-bold border-2 transition-all ${selectedTime === t ? 'bg-tea-900 text-white border-tea-900 shadow-lg' : 'bg-white border-gray-100 text-tea-900 hover:bg-tea-50'}`}>{t}</button>
                        ))}
                      </div>
                      {Object.keys(availableSlotsForDate).length === 0 && (
                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center animate-pulse">
                           <p className="text-[10px] text-orange-700 font-bold uppercase tracking-widest">Agenda fechada para este dia.</p>
                           <p className="text-[9px] text-orange-600 italic mt-1">Por favor, selecione outra data ao lado.</p>
                        </div>
                      )}
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Profissional Especialista</label>
                      <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-5 bg-gray-50 rounded-3xl font-bold outline-none appearance-none shadow-inner">
                         <option value="">Aguardando horário...</option>
                         {(availableSlotsForDate[selectedTime] || []).map(pro => <option key={pro.id} value={pro.id}>{pro.name}</option>)}
                      </select>
                   </div>

                   <div className="p-6 bg-red-50 rounded-3xl border-2 border-red-100 space-y-4">
                      <p className="text-[9px] font-bold text-red-900 uppercase tracking-widest leading-relaxed">O Studio Moriá solicita sinal de 30% para confirmar a exclusividade da sua vaga.</p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={agreedToCancellation} onChange={e => setAgreedToCancellation(e.target.checked)} className="w-5 h-5 accent-red-600 rounded" />
                        <span className="text-[10px] font-bold text-red-800 uppercase leading-tight">Ciente e aceito a política de reserva.</span>
                      </label>
                   </div>
                </div>
                <button disabled={!selectedTime || !selectedProId || !agreedToCancellation} onClick={() => setShowPolicyModal(true)} className="w-full py-6 bg-tea-950 text-white rounded-3xl font-bold uppercase text-[11px] tracking-widest shadow-2xl disabled:bg-gray-100 disabled:text-gray-400 transition-all">Solicitar Atendimento</button>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="bg-white rounded-[4rem] p-16 shadow-2xl text-center space-y-8 animate-slide-up border border-tea-100">
                 <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">✓</div>
                 <h3 className="text-3xl font-serif text-tea-950 font-bold italic">Pedido Enviado!</h3>
                 <p className="text-gray-500 text-sm leading-relaxed italic">Agora basta realizar o sinal de 30% via WhatsApp para que Moriá valide seu horário e reserve sua vaga.</p>
                 <button onClick={() => { setActiveTab('agenda'); setBookingStep(1); }} className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase text-[11px] tracking-widest shadow-xl">Ver Minha Agenda</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-8 animate-slide-up">
            <h3 className="text-center font-serif text-2xl font-bold text-tea-950 italic">Sua Jornada Moriá</h3>
            {myBookings.length > 0 ? myBookings.map(b => (
              <div key={b.id} className="bg-white p-8 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-4 transition-all hover:border-tea-200">
                <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-bold text-tea-950 text-xl font-serif italic leading-tight">{b.serviceName}</h4>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(b.dateTime.replace(' ', 'T')).toLocaleDateString()} • {b.dateTime.split(' ')[1]}</p>
                   </div>
                   <span className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                     b.status === 'completed' ? 'bg-green-50 text-green-700' : 
                     b.status === 'cancelled' ? 'bg-red-50 text-red-700' : 
                     'bg-tea-50 text-tea-900 shadow-sm'
                   }`}>
                     {b.status === 'pending' ? 'Em Análise' : b.status}
                   </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                 <p className="text-gray-400 italic">Nenhum agendamento futuro encontrado.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="space-y-8 animate-slide-up">
             <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 text-center relative overflow-hidden">
                <div className="w-24 h-24 bg-tea-900 text-white rounded-3xl flex items-center justify-center text-4xl font-serif mx-auto mb-6 shadow-2xl">{customer.name.charAt(0)}</div>
                <h3 className="text-3xl font-serif text-tea-950 font-bold italic mb-2">{customer.name}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-10">CPF: {customer.cpf}</p>
                <div className="space-y-3">
                   <button className="w-full py-5 bg-gray-50 text-tea-900 rounded-3xl font-bold uppercase text-[9px] tracking-widest hover:bg-tea-100 transition-all">Meus Dados</button>
                   <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all">Sair da Conta</button>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* Navegação Flutuante */}
      <nav className="fixed bottom-8 left-6 right-6 bg-tea-950/90 backdrop-blur-2xl border border-white/10 p-6 flex justify-around rounded-[3rem] z-50 shadow-2xl max-w-md mx-auto">
         {[
           { id: 'home', icon: '🏠' },
           { id: 'agendar', icon: '✨' },
           { id: 'agenda', icon: '🗓️' },
           { id: 'perfil', icon: '👤' }
         ].map(tab => (
           <button 
             key={tab.id} 
             onClick={() => setActiveTab(tab.id as any)} 
             className={`p-3 rounded-2xl transition-all duration-500 ${activeTab === tab.id ? 'bg-white text-tea-950 scale-110 shadow-lg' : 'text-white/40 hover:text-white'}`}
           >
              <span className="text-2xl">{tab.icon}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default CustomerDashboard;
