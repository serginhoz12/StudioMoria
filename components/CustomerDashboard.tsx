
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

  // Derived categories from existing services
  const availableCategories = useMemo(() => {
    const cats = new Set(services.filter(s => s.isVisible).map(s => s.category));
    return ['Todos', ...Array.from(cats).sort()];
  }, [services]);

  const filteredServices = useMemo(() => {
    const base = services.filter(s => s.isVisible);
    if (activeCategory === 'Todos') return base;
    return base.filter(s => s.category === activeCategory);
  }, [services, activeCategory]);

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

  const availableSlotsForDate = useMemo(() => {
    if (!selectedService) return {};
    return getAvailabilityForDate(selectedDate, selectedService);
  }, [selectedService, selectedDate, bookings, settings]);

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

      <main className="max-w-md mx-auto px-6 -mt-16 relative z-20 space-y-12 pb-10">
        
        {activeTab === 'home' && (
          <div className="space-y-12 animate-slide-up">
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
                         <span className="text-[8px] font-bold text-tea-300 uppercase tracking-widest mb-4 block">{service.category}</span>
                         <h4 className="text-xl font-serif font-bold text-white italic mb-2 leading-tight">{service.name}</h4>
                         <p className="text-[10px] text-tea-100 font-bold uppercase tracking-widest mb-8">R$ {service.price.toFixed(2)}</p>
                         <button className="w-full py-4 bg-white text-tea-900 rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Reservar</button>
                      </div>
                    ))}
                 </div>
              </section>
            )}

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
                       <p className="text-gray-600 text-xs leading-relaxed italic line-clamp-3">{promo.content}</p>
                       {promo.linkedServiceId && (
                         <button onClick={() => { 
                           const srv = services.find(s => s.id === promo.linkedServiceId);
                           if (srv) { setSelectedService(srv); setActiveTab('agendar'); setBookingStep(2); }
                         }} className="w-full py-3 bg-tea-950 text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest">Aproveitar agora</button>
                       )}
                    </div>
                  )) : (
                    <div className="text-center py-10 opacity-30 italic text-sm">Nenhuma novidade hoje.</div>
                  )}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'agendar' && (
          <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between px-2">
               <button onClick={() => { if(bookingStep > 1) setBookingStep(prev => (prev - 1) as any); else setActiveTab('home'); }} className="p-3 bg-white rounded-2xl shadow-sm">←</button>
               <h3 className="text-xl font-serif font-bold text-tea-950 italic">{bookingStep === 1 ? 'Procedimentos' : bookingStep === 2 ? 'Horário' : 'Confirmado'}</h3>
               <div className="w-10"></div>
            </div>

            {bookingStep === 1 && (
              <>
                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-2">
                  {availableCategories.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setActiveCategory(cat)}
                      className={`px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border-2 ${activeCategory === cat ? 'bg-tea-900 border-tea-900 text-white shadow-lg' : 'bg-white border-tea-50 text-gray-400'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {filteredServices.map(service => (
                    <button key={service.id} onClick={() => { setSelectedService(service); setBookingStep(2); }} className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-tea-200 transition-all text-left">
                       <div>
                          <p className="text-[8px] text-tea-600 font-bold uppercase tracking-widest mb-1">{service.category}</p>
                          <p className="font-bold text-tea-950 text-lg group-hover:text-tea-800">{service.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">R$ {service.price.toFixed(2)} • {service.duration}min</p>
                       </div>
                       <div className="w-10 h-10 bg-tea-50 rounded-xl flex items-center justify-center text-tea-900 group-hover:bg-tea-900 group-hover:text-white transition-all">+</div>
                    </button>
                  ))}
                  {filteredServices.length === 0 && <p className="text-center py-20 text-gray-300 italic">Nenhum serviço nesta categoria.</p>}
                </div>
              </>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="space-y-8">
                 <div className="p-6 bg-tea-900 rounded-[2.5rem] text-white space-y-2 shadow-xl">
                    <p className="text-[8px] font-bold text-tea-300 uppercase tracking-widest">Procedimento Selecionado</p>
                    <h4 className="text-xl font-serif italic font-bold">{selectedService.name}</h4>
                    <p className="text-xs font-bold text-tea-100 uppercase tracking-widest">R$ {selectedService.price.toFixed(2)}</p>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Selecione o Dia</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 px-2 no-scrollbar">
                       {calendarDays.map(day => (
                         <button 
                          key={day.date} 
                          disabled={!day.isAvailable}
                          onClick={() => { setSelectedDate(day.date); setSelectedTime(''); }}
                          className={`min-w-[70px] p-4 rounded-3xl border-2 flex flex-col items-center transition-all ${!day.isAvailable ? 'opacity-20 border-transparent grayscale' : selectedDate === day.date ? 'bg-tea-100 border-tea-400 scale-110 shadow-md' : 'bg-white border-tea-50'}`}
                         >
                            <span className="text-[8px] font-bold text-tea-800 uppercase tracking-widest">{day.dayName}</span>
                            <span className="text-lg font-serif font-bold italic text-tea-950">{day.dayNum}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Selecione o Horário</h4>
                    <div className="grid grid-cols-4 gap-3">
                       {Object.keys(availableSlotsForDate).map(time => (
                         <button 
                          key={time} 
                          onClick={() => { setSelectedTime(time); setSelectedProId(availableSlotsForDate[time][0]?.id || ''); }}
                          className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all ${selectedTime === time ? 'bg-tea-800 border-tea-800 text-white shadow-lg scale-105' : 'bg-white border-tea-50 text-tea-900 hover:border-tea-200'}`}
                         >
                           {time}
                         </button>
                       ))}
                       {Object.keys(availableSlotsForDate).length === 0 && (
                         <div className="col-span-4 text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                            <p className="text-xs text-gray-400 italic">Sem horários disponíveis para este dia.</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {selectedTime && (
                   <div className="pt-4 animate-slide-up space-y-6">
                      <label className="flex items-start gap-4 cursor-pointer p-4 bg-white rounded-3xl border-2 border-tea-50 hover:bg-tea-50 transition-all">
                         <input 
                          type="checkbox" 
                          checked={agreedToCancellation}
                          onChange={e => setAgreedToCancellation(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded text-tea-900 border-tea-100 focus:ring-tea-900" 
                         />
                         <span className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                           Aceito a <button onClick={(e) => {e.preventDefault(); setShowPolicyModal(true);}} className="text-tea-700 font-bold underline">Política de Cancelamento</button> e reserva do Studio Moriá.
                         </span>
                      </label>
                      <button 
                        onClick={() => setShowPolicyModal(true)}
                        disabled={!agreedToCancellation}
                        className={`w-full py-6 rounded-3xl font-bold uppercase text-[11px] tracking-widest shadow-2xl transition-all ${agreedToCancellation ? 'bg-tea-900 text-white hover:bg-black shadow-tea-200' : 'bg-gray-100 text-gray-300'}`}
                      >
                        Finalizar Reserva
                      </button>
                   </div>
                 )}
              </div>
            )}

            {bookingStep === 3 && (
              <div className="text-center py-20 space-y-8 animate-slide-up">
                 <div className="w-32 h-32 bg-tea-50 text-tea-900 rounded-[3rem] flex items-center justify-center text-6xl mx-auto shadow-inner">🎉</div>
                 <div className="space-y-4 px-10">
                    <h3 className="text-3xl font-serif text-tea-950 font-bold italic leading-tight">Agendamento Realizado!</h3>
                    <p className="text-gray-500 text-xs leading-relaxed italic">Seu pedido foi enviado para o Studio Moriá. Avisaremos pelo WhatsApp assim que for confirmado.</p>
                 </div>
                 <button onClick={() => { setActiveTab('agenda'); setBookingStep(1); }} className="w-full py-6 bg-tea-900 text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-xl">Ver Meus Horários</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-8 animate-slide-up">
             <div className="flex items-center justify-between px-2">
                <button onClick={() => setActiveTab('home')} className="p-3 bg-white rounded-2xl shadow-sm">←</button>
                <h3 className="text-xl font-serif font-bold text-tea-950 italic">Meus Horários</h3>
                <div className="w-10"></div>
             </div>

             <div className="space-y-6">
                {myBookings.map(booking => {
                  const bDate = new Date(booking.dateTime.replace(' ', 'T'));
                  const isPast = bDate < new Date();
                  
                  return (
                    <div key={booking.id} className={`p-8 bg-white rounded-[3rem] border-2 shadow-sm transition-all ${isPast ? 'opacity-50 grayscale border-transparent' : 'border-tea-50 shadow-tea-100/10'}`}>
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <p className="text-[8px] text-tea-600 font-bold uppercase tracking-widest mb-1">Studio Moriá</p>
                             <h4 className="text-xl font-serif font-bold text-tea-950 italic">{booking.serviceName}</h4>
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                            booking.status === 'scheduled' ? 'bg-tea-800 text-white' : 
                            booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                            booking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {booking.status === 'scheduled' ? 'Confirmado' : 
                             booking.status === 'completed' ? 'Concluído' :
                             booking.status === 'cancelled' ? 'Cancelado' :
                             'Pendente'}
                          </span>
                       </div>
                       <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
                          <div className="flex flex-col">
                             <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Data</span>
                             <span className="text-sm font-bold text-gray-700">{bDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Horário</span>
                             <span className="text-sm font-bold text-gray-700">{booking.dateTime.split(' ')[1]}</span>
                          </div>
                       </div>
                    </div>
                  );
                })}
                {myBookings.length === 0 && (
                  <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
                     <p className="text-gray-400 font-serif italic text-lg">Nenhum agendamento ainda.</p>
                     <button onClick={() => setActiveTab('agendar')} className="text-tea-700 font-bold uppercase text-[9px] tracking-widest mt-4">Agendar Agora</button>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2">
         <div className="max-w-md mx-auto bg-tea-950/80 backdrop-blur-2xl rounded-[3rem] p-3 flex justify-between items-center border border-white/10 shadow-2xl">
            {[
              { id: 'home', label: 'Início', icon: '🏠' },
              { id: 'agendar', label: 'Agendar', icon: '✨' },
              { id: 'agenda', label: 'Agenda', icon: '🗓️' },
              { id: 'logout', label: 'Sair', icon: '👋' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => tab.id === 'logout' ? onLogout() : setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center py-4 transition-all ${activeTab === tab.id ? 'text-tea-300 scale-110' : 'text-tea-100/40 hover:text-white'}`}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.2em]">{tab.label}</span>
              </button>
            ))}
         </div>
      </nav>
    </div>
  );
};

export default CustomerDashboard;
