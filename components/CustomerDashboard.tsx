
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Booking, Service, SalonSettings, TeamMember, WaitlistEntry, Promotion } from '../types';
import { db } from '../firebase.ts';
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";

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
  waitlist?: WaitlistEntry[];
  onRemoveWaitlist?: (id: string) => void;
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
  const [activeTab, setActiveTab] = useState<'home' | 'ofertas' | 'agendar' | 'agenda' | 'perfil'>('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProId, setSelectedProId] = useState<string>('');
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [agreedToCancellation, setAgreedToCancellation] = useState(false);
  const [viewingPromo, setViewingPromo] = useState<Promotion | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');

  // Filtros de Marketing
  const allMyPromotions = useMemo(() => 
    promotions.filter(p => (p.targetCustomerIds || []).includes(customer.id))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [promotions, customer.id]);

  const activePromotions = useMemo(() => 
    allMyPromotions.filter(p => p.type === 'promotion' && p.isActive), [allMyPromotions]);

  const activeTips = useMemo(() => 
    allMyPromotions.filter(p => p.type === 'tip' && p.isActive), [allMyPromotions]);

  // Serviços em Destaque (Vindos da Home para o Dashboard)
  const highlightedServices = useMemo(() => 
    services.filter(s => s.isVisible && s.isHighlighted), [services]);

  const filteredServices = useMemo(() => {
    return services
      .filter(s => s.isVisible && s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
      .sort((a, b) => (a.isHighlighted ? -1 : 1));
  }, [services, serviceSearch]);

  const activePromoForService = useMemo(() => {
    if (!selectedService) return null;
    return activePromotions.find(p => {
      if (p.linkedServiceId) return p.linkedServiceId === selectedService.id;
      return p.applicableServiceIds.length === 0 || p.applicableServiceIds.includes(selectedService.id);
    });
  }, [selectedService, activePromotions]);

  const priceInfo = useMemo(() => {
    if (!selectedService) return { original: 0, final: 0, discount: 0 };
    const original = selectedService.price;
    const discountPercent = activePromoForService?.discountPercentage || 0;
    const discountVal = (original * discountPercent) / 100;
    return { original, final: Math.max(0, original - discountVal), discount: discountVal };
  }, [selectedService, activePromoForService]);

  const allPossibleSlots = useMemo(() => {
    const slots: string[] = [];
    const start = parseInt((settings.businessHours?.start || "08:00").split(':')[0]);
    const end = parseInt((settings.businessHours?.end || "19:00").split(':')[0]);
    for (let h = start; h < end; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, [settings.businessHours]);

  const currentSlotsAvailability = useMemo(() => {
    if (!selectedService) return {};
    const availability: Record<string, TeamMember[]> = {};
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const pros = settings.teamMembers.filter(m => m.assignedServiceIds.includes(selectedService.id));

    allPossibleSlots.forEach(slot => {
      const slotStartMin = (h:string)=>parseInt(h.split(':')[0])*60+parseInt(h.split(':')[1]);
      const sStartMin = slotStartMin(slot);
      const sEndMin = sStartMin + selectedService.duration;
      const freePros = pros.filter(pro => {
        if (pro.offDays?.includes(dayOfWeek)) return false;
        const pStartMin = slotStartMin(pro.businessHours?.start || settings.businessHours.start);
        const pEndMin = slotStartMin(pro.businessHours?.end || settings.businessHours.end);
        if (sStartMin < pStartMin || sEndMin > pEndMin) return false;
        return !bookings.some(b => b.teamMemberId === pro.id && b.status !== 'cancelled' && b.dateTime === `${selectedDate} ${slot}`);
      });
      if (freePros.length > 0) availability[slot] = freePros;
    });
    return availability;
  }, [selectedService, selectedDate, settings, bookings, allPossibleSlots]);

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
        promotionId: activePromoForService?.id,
        promotionTitle: activePromoForService?.title,
        originalPrice: priceInfo.original,
        discountApplied: priceInfo.discount,
        finalPrice: priceInfo.final
      });
      setBookingStep(3);
    }
  };

  const myBookings = bookings.filter(b => b.customerId === customer.id).sort((a,b) => b.dateTime.localeCompare(a.dateTime));

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in">
      <header className="bg-tea-900 pt-12 pb-24 px-8 rounded-b-[4.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tea-800 rounded-full -mr-32 -mt-32 opacity-20"></div>
        <div className="max-w-md mx-auto flex flex-col items-center gap-6 relative z-10 text-white">
          <div className="w-full flex justify-between items-start">
            <button onClick={onLogout} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">🚪</button>
            <div className="text-right">
              <p className="text-[9px] font-bold text-tea-300 uppercase tracking-widest">Studio Moriá</p>
              <h2 className="text-xl font-serif font-bold italic">Painel da Cliente</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 w-full mt-4">
             <div className="w-20 h-20 bg-white/10 rounded-3xl border border-white/20 flex items-center justify-center text-3xl font-serif shadow-inner">{customer.name.charAt(0)}</div>
             <div>
                <p className="text-[10px] font-bold uppercase text-tea-200">Bem-vinda,</p>
                <h1 className="text-2xl font-serif font-bold italic">{customer.name.split(' ')[0]}</h1>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 -mt-12 relative z-20 pb-20">
        {activeTab === 'home' && (
          <div className="space-y-10 animate-slide-up">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-gray-50 text-center space-y-6">
               <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Sua beleza começa aqui</h3>
               <button onClick={() => setActiveTab('agendar')} className="w-full py-5 bg-tea-800 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-tea-950 transition-all">Novo Agendamento</button>
            </div>

            {/* Promoções e Dicas */}
            {(activePromotions.length > 0 || activeTips.length > 0) && (
              <section className="space-y-4">
                <div className="flex justify-between items-center px-4">
                  <h4 className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Para Você ✨</h4>
                  <button onClick={() => setActiveTab('ofertas')} className="text-[9px] font-bold text-tea-600 uppercase hover:underline">Ver Tudo</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {activePromotions.map(p => (
                    <div key={p.id} onClick={() => { setViewingPromo(p); setActiveTab('ofertas'); }} className="min-w-[260px] cursor-pointer bg-tea-900 p-8 rounded-[3rem] text-white shadow-lg space-y-4 transform hover:scale-[1.02] transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10 text-4xl">🎁</div>
                      <div className="flex justify-between items-start">
                        <span className="text-3xl font-bold">{p.discountPercentage === 100 ? 'FREE' : `${p.discountPercentage}%`}</span>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest">OFF</span>
                      </div>
                      <h5 className="font-bold text-sm leading-tight line-clamp-2">{p.title}</h5>
                      <p className="text-[9px] text-tea-300 font-bold uppercase tracking-widest">Expira em {new Date(p.endDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {activeTips.map(p => (
                    <div key={p.id} onClick={() => { setViewingPromo(p); setActiveTab('ofertas'); }} className="min-w-[260px] cursor-pointer bg-tea-50 p-8 rounded-[3rem] text-tea-900 border border-tea-100 shadow-sm space-y-4 transform hover:scale-[1.02] transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10 text-4xl text-tea-900">✨</div>
                      <span className="bg-tea-900/10 text-tea-900 px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest inline-block">Dica Moriá</span>
                      <h5 className="font-bold text-sm leading-tight line-clamp-2">{p.title}</h5>
                      <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest">Leia Agora</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Especialidades Moriá (Destaques) */}
            {highlightedServices.length > 0 && (
              <section className="space-y-4">
                <div className="px-4">
                  <h4 className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Especialidades Moriá ⭐</h4>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
                  {highlightedServices.map(service => (
                    <div 
                      key={service.id} 
                      className="min-w-[280px] bg-white p-8 rounded-[3.5rem] border border-orange-50 shadow-md flex flex-col justify-between relative group hover:border-orange-100 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="bg-orange-400 text-white px-3 py-1 rounded-full text-[7px] font-bold uppercase tracking-widest">Favorito</span>
                          <span className="text-tea-900 font-serif font-bold text-sm italic">R$ {service.price.toFixed(2)}</span>
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 leading-tight">{service.name}</h3>
                        <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-2">{service.description}</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedService(service); setActiveTab('agendar'); setBookingStep(2); }} 
                        className="mt-6 w-full py-4 bg-tea-950 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                        Agendar Agora
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'ofertas' && (
          <div className="space-y-6 animate-slide-up pb-10">
            <h3 className="text-center font-serif text-2xl font-bold text-tea-950 italic mb-8">Novidades & Ofertas</h3>
            {allMyPromotions.map(promo => (
              <div key={promo.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${promo.type === 'promotion' ? 'bg-tea-900 text-white' : 'bg-tea-50 text-tea-900'}`}>
                     {promo.type === 'promotion' ? 'Oferta' : 'Dica'}
                   </span>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(promo.createdAt).toLocaleDateString()}</p>
                </div>
                <h4 className="font-bold text-tea-950 text-xl font-serif italic">{promo.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{promo.content}</p>
                {promo.type === 'promotion' && promo.linkedServiceId && (
                  <button 
                    onClick={() => { 
                      const s = services.find(x => x.id === promo.linkedServiceId);
                      if(s) { setSelectedService(s); setActiveTab('agendar'); setBookingStep(2); }
                    }} 
                    className="w-full py-4 bg-tea-50 text-tea-900 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-100"
                  >
                    Agendar com Desconto
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'agendar' && (
          <div className="space-y-6 animate-slide-up pb-10">
             {bookingStep === 1 && (
              <div className="space-y-6">
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-lg">🔍</span>
                  <input 
                    type="text" 
                    placeholder="O que deseja realizar hoje?" 
                    value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    className="w-full p-5 pl-14 bg-white rounded-3xl shadow-sm border border-gray-100 outline-none focus:ring-2 focus:ring-tea-100 transition-all font-medium"
                  />
                </div>
                
                <div className="space-y-4">
                  {filteredServices.map(service => (
                    <div key={service.id} className={`bg-white p-8 rounded-[3rem] border transition-all flex flex-col h-full relative overflow-hidden ${service.isHighlighted ? 'border-orange-100 bg-orange-50/5' : 'border-gray-50 shadow-sm'}`}>
                      {service.isHighlighted && (
                        <div className="absolute top-0 right-0 bg-orange-400 text-white px-4 py-1.5 rounded-bl-3xl text-[8px] font-bold uppercase tracking-widest">
                          Destaque ⭐
                        </div>
                      )}
                      <h4 className="font-bold text-tea-950 text-xl font-serif italic mb-2">{service.name}</h4>
                      <p className="text-gray-400 text-xs mb-8 line-clamp-2">{service.description}</p>
                      <div className="flex justify-between items-center mt-auto">
                         <div className="text-tea-800 font-bold font-serif italic">R$ {service.price.toFixed(2)}</div>
                         <button onClick={() => { setSelectedService(service); setBookingStep(2); }} className="px-10 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Agendar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-tea-50 space-y-10 animate-slide-up">
                <div className="flex items-center gap-5">
                   <button onClick={() => setBookingStep(1)} className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-tea-900 font-bold hover:bg-tea-100 transition-all">←</button>
                   <div>
                      <h3 className="font-bold text-tea-950 text-lg font-serif italic">{selectedService.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Finalizando Reserva</p>
                   </div>
                </div>
                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Escolha a Data</label>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-5 bg-gray-50 rounded-3xl font-bold outline-none border-none shadow-inner" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Horários Disponíveis</label>
                      <div className="grid grid-cols-3 gap-3">
                        {allPossibleSlots.map(slot => {
                           const available = !!currentSlotsAvailability[slot];
                           return (
                             <button key={slot} disabled={!available} onClick={() => setSelectedTime(slot)} className={`p-5 rounded-2xl text-[11px] font-bold border-2 transition-all ${selectedTime === slot ? 'bg-tea-900 text-white border-tea-900 shadow-xl scale-105' : available ? 'bg-white border-tea-100 text-tea-900 hover:bg-tea-50' : 'bg-gray-100 text-gray-300 border-transparent opacity-50 cursor-not-allowed'}`}>{slot}</button>
                           );
                        })}
                      </div>
                   </div>
                   {selectedTime && (
                     <div className="space-y-3 animate-fade-in">
                        <label className="text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Profissional Responsável</label>
                        <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-5 bg-gray-50 rounded-3xl font-bold outline-none appearance-none shadow-inner">
                           <option value="">Selecione a profissional...</option>
                           {currentSlotsAvailability[selectedTime]?.map(pro => <option key={pro.id} value={pro.id}>{pro.name}</option>)}
                        </select>
                     </div>
                   )}
                   <label className="flex items-start gap-4 p-6 bg-red-50/50 rounded-[2.5rem] cursor-pointer border border-red-100">
                      <input type="checkbox" checked={agreedToCancellation} onChange={e => setAgreedToCancellation(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600" />
                      <span className="text-[10px] font-bold text-red-900 uppercase leading-relaxed tracking-wider">Concordo com a taxa de reserva de 30%.</span>
                   </label>
                </div>
                <button disabled={!selectedTime || !selectedProId || !agreedToCancellation} onClick={handleBookSubmit} className="w-full py-7 bg-tea-950 text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl disabled:bg-gray-100 disabled:text-gray-400 transition-all">Solicitar Agendamento</button>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-tea-100 text-center space-y-8 animate-slide-up">
                 <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">✓</div>
                 <div>
                    <h3 className="text-3xl font-serif text-tea-950 font-bold italic mb-3">Solicitado com Sucesso!</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Sua reserva foi enviada para a equipe Moriá. Você receberá uma confirmação via WhatsApp assim que aprovado.</p>
                 </div>
                 <button onClick={() => { setActiveTab('agenda'); setBookingStep(1); }} className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase text-[11px] tracking-widest shadow-xl">Ver Meus Pedidos</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-6 animate-slide-up pb-10">
            <h3 className="text-center font-serif text-2xl font-bold text-tea-950 italic mb-8">Minha Agenda</h3>
            {myBookings.map(b => (
              <div key={b.id} className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-bold text-tea-950 text-xl font-serif italic mb-1">{b.serviceName}</h4>
                     <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">{new Date(b.dateTime.replace(' ', 'T')).toLocaleDateString()} • {b.dateTime.split(' ')[1]}</p>
                   </div>
                   <span className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                     b.status === 'completed' ? 'bg-green-50 text-green-700' : 
                     b.status === 'cancelled' ? 'bg-red-50 text-red-700' : 
                     b.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                     'bg-orange-50 text-orange-700'
                   }`}>
                     {b.status === 'pending' ? 'Pendente' : b.status === 'scheduled' ? 'Confirmado' : b.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                   </span>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                   <span>Profissional: {b.teamMemberName || 'Padrão'}</span>
                </div>
              </div>
            ))}
            {myBookings.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-serif italic">Você ainda não tem agendamentos registrados.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="space-y-8 animate-slide-up pb-10">
             <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-tea-50 rounded-full -mr-16 -mt-16 opacity-40"></div>
                <div className="w-24 h-24 bg-tea-900 text-white rounded-[2rem] flex items-center justify-center text-4xl font-serif mx-auto mb-6 shadow-2xl">
                  {customer.name.charAt(0)}
                </div>
                <h3 className="text-3xl font-serif text-tea-950 font-bold italic mb-2">{customer.name}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-10">CPF: {customer.cpf}</p>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl">
                      <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">WhatsApp</span>
                      <span className="font-bold text-tea-800">{customer.whatsapp}</span>
                   </div>
                   <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all mt-6">Sair da Conta</button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Navegação Inferior (Mobile-first Floating) */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-gray-100 p-6 flex justify-between rounded-[3rem] z-50 shadow-[0_40px_80px_rgba(0,0,0,0.15)] max-w-md mx-auto">
         {[
           { id: 'home', icon: '🏠', label: 'Início' },
           { id: 'agendar', icon: '✨', label: 'Agendar' },
           { id: 'agenda', icon: '🗓️', label: 'Agenda' },
           { id: 'ofertas', icon: '🎁', label: 'Ofertas' },
           { id: 'perfil', icon: '👤', label: 'Perfil' }
         ].map(tab => (
           <button 
             key={tab.id} 
             onClick={() => setActiveTab(tab.id as any)} 
             className={`flex flex-col items-center gap-2 transition-all group ${activeTab === tab.id ? 'text-tea-900' : 'text-gray-300'}`}
           >
              <span className={`text-2xl transition-transform duration-300 ${activeTab === tab.id ? 'scale-125 -translate-y-1' : 'group-hover:scale-110'}`}>{tab.icon}</span>
              <span className={`text-[8px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 scale-50'}`}>{tab.label}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default CustomerDashboard;
