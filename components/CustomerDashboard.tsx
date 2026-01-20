
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
  onUpdateProfile, 
  onLogout,
  onCancelBooking,
  onAddToWaitlist,
  waitlist = [],
  onRemoveWaitlist,
  promotions = []
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agenda' | 'perfil'>('home');
  
  // Agendamento
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProId, setSelectedProId] = useState<string>('');
  const [agreedToCancellation, setAgreedToCancellation] = useState(false);

  // Lógica de Promoção Ativa para o Cliente Logado
  const activePromoForService = useMemo(() => {
    if (!selectedService) return null;
    const today = new Date().toISOString().split('T')[0];
    
    // Filtra promoções válidas, ativas e que incluem este cliente e este serviço
    return promotions.find(p => 
      p.isActive &&
      today >= p.startDate &&
      today <= p.endDate &&
      p.targetCustomerIds.includes(customer.id) &&
      (p.applicableServiceIds.length === 0 || p.applicableServiceIds.includes(selectedService.id))
    );
  }, [selectedService, promotions, customer.id]);

  const priceInfo = useMemo(() => {
    if (!selectedService) return { original: 0, final: 0, discount: 0 };
    const original = selectedService.price;
    const discountPercent = activePromoForService?.discountPercentage || 0;
    const discountVal = (original * discountPercent) / 100;
    return {
      original,
      final: original - discountVal,
      discount: discountVal
    };
  }, [selectedService, activePromoForService]);

  const allPossibleSlots = useMemo(() => {
    const slots: string[] = [];
    const start = parseInt((settings.businessHours?.start || "08:00").split(':')[0]);
    const end = parseInt((settings.businessHours?.end || "19:00").split(':')[0]);
    for (let h = start; h < end; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, [settings.businessHours]);

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const currentSlotsAvailability = useMemo(() => {
    if (!selectedService) return {};
    const availability: Record<string, TeamMember[]> = {};
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const pros = settings.teamMembers.filter(m => m.assignedServiceIds.includes(selectedService.id));

    allPossibleSlots.forEach(slot => {
      const slotStartMin = timeToMinutes(slot);
      const slotEndMin = slotStartMin + selectedService.duration;
      const freePros = pros.filter(pro => {
        if (pro.offDays?.includes(dayOfWeek)) return false;
        const proStartMin = timeToMinutes(pro.businessHours?.start || settings.businessHours.start);
        const proEndMin = timeToMinutes(pro.businessHours?.end || settings.businessHours.end);
        if (slotStartMin < proStartMin || slotEndMin > proEndMin) return false;
        const hasConflict = bookings.some(b => {
          if (b.teamMemberId !== pro.id || b.status === 'cancelled' || !b.dateTime.startsWith(selectedDate)) return false;
          const bStartMin = timeToMinutes(b.dateTime.split(' ')[1]);
          const bEndMin = bStartMin + (b.duration || 30);
          return slotStartMin < bEndMin && slotEndMin > bStartMin;
        });
        return !hasConflict;
      });
      if (freePros.length > 0) availability[slot] = freePros;
    });
    return availability;
  }, [selectedService, selectedDate, settings, bookings, allPossibleSlots]);

  const handleBookSubmit = async () => {
    if (selectedService && selectedProId && selectedTime && agreedToCancellation) {
      const pro = settings.teamMembers.find(m => m.id === selectedProId);
      
      const bookingData: Omit<Booking, 'id'> = {
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
        // Dados da Promoção
        promotionId: activePromoForService?.id || undefined,
        promotionTitle: activePromoForService?.title || undefined,
        originalPrice: priceInfo.original,
        discountApplied: priceInfo.discount,
        finalPrice: priceInfo.final
      };

      await addDoc(collection(db, "bookings"), bookingData);
      setBookingStep(3);
    }
  };

  const myBookings = bookings.filter(b => b.customerId === customer.id).sort((a,b) => b.dateTime.localeCompare(a.dateTime));

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in">
      <header className="bg-tea-900 pt-12 pb-24 px-8 rounded-b-[4.5rem] shadow-2xl relative">
        <div className="max-w-md mx-auto flex flex-col items-center gap-6 relative z-10 text-white">
          <div className="w-full flex justify-between items-start">
            <button onClick={onLogout} className="p-4 bg-white/10 rounded-2xl">🚪</button>
            <div className="text-right">
              <p className="text-[9px] font-bold text-tea-300 uppercase tracking-widest">Studio Moriá</p>
              <h2 className="text-xl font-serif font-bold italic">Dashboard</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 w-full mt-4">
             <div className="w-20 h-20 bg-white/10 rounded-3xl border border-white/20 flex items-center justify-center text-3xl font-serif">
                {customer.name.charAt(0)}
             </div>
             <div>
                <p className="text-[10px] font-bold uppercase text-tea-200">Bem-vinda de volta,</p>
                <h1 className="text-2xl font-serif font-bold italic">{customer.name.split(' ')[0]}</h1>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 -mt-12 relative z-20">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-gray-50 text-center space-y-6">
               <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Sua beleza começa aqui</h3>
               <button onClick={() => setActiveTab('agendar')} className="w-full py-5 bg-tea-800 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-widest shadow-xl">Novo Agendamento</button>
            </div>
            
            {promotions.filter(p => p.targetCustomerIds.includes(customer.id) && p.isActive).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-tea-950 uppercase tracking-widest ml-4">Minhas Ofertas ✨</h4>
                {promotions.filter(p => p.targetCustomerIds.includes(customer.id) && p.isActive).map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-tea-50 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-tea-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold">{p.discountPercentage}%</div>
                    <div>
                      <h5 className="font-bold text-tea-950 text-sm">{p.title}</h5>
                      <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest">Válido até {new Date(p.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'agendar' && (
          <div className="space-y-6 animate-slide-up">
            {bookingStep === 1 && (
              <div className="space-y-4">
                {services.filter(s => s.isVisible).map(service => (
                  <div key={service.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:border-tea-200 transition-all group">
                    <h4 className="font-bold text-tea-950 text-xl mb-1">{service.name}</h4>
                    <p className="text-gray-400 text-xs mb-6 line-clamp-2">{service.description}</p>
                    <div className="flex justify-between items-center">
                       <div className="text-tea-800 font-bold">R$ {service.price.toFixed(2)}</div>
                       <button onClick={() => { setSelectedService(service); setBookingStep(2); }} className="px-8 py-3 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest group-hover:bg-black transition-all">Selecionar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-tea-50 space-y-8">
                <div className="flex items-center gap-4">
                   <button onClick={() => setBookingStep(1)} className="p-2 bg-tea-50 rounded-xl text-tea-800">←</button>
                   <h3 className="font-bold text-tea-950 text-lg">{selectedService.name}</h3>
                </div>

                {/* Bloco de Preço com Inteligência de Promoção */}
                <div className="bg-tea-50 p-6 rounded-[2.5rem] border border-tea-100 space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-bold text-tea-700 uppercase tracking-widest">Valor do Procedimento</span>
                     <span className={`font-bold ${activePromoForService ? 'line-through text-gray-400' : 'text-tea-950'}`}>R$ {priceInfo.original.toFixed(2)}</span>
                  </div>
                  {activePromoForService && (
                    <div className="flex justify-between items-center pt-2 border-t border-tea-100">
                       <div>
                         <p className="text-[9px] font-bold text-tea-900 uppercase tracking-widest">Bônus: {activePromoForService.title}</p>
                         <p className="text-[8px] text-tea-600 font-bold uppercase tracking-tighter">({activePromoForService.discountPercentage}% OFF aplicado)</p>
                       </div>
                       <span className="text-2xl font-serif font-bold text-tea-900">R$ {priceInfo.final.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Data Preferida</label>
                   <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-none outline-none" />
                   
                   <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1 block mt-4">Horário</label>
                   <div className="grid grid-cols-3 gap-2">
                     {allPossibleSlots.map(slot => {
                        const available = !!currentSlotsAvailability[slot];
                        return (
                          <button key={slot} disabled={!available} onClick={() => setSelectedTime(slot)} className={`p-4 rounded-xl text-[10px] font-bold border-2 transition-all ${selectedTime === slot ? 'bg-tea-900 text-white border-tea-900 shadow-md' : available ? 'bg-white border-tea-100 text-tea-900' : 'bg-gray-50 text-gray-200 opacity-50 border-transparent cursor-not-allowed'}`}>
                             {slot}
                          </button>
                        );
                     })}
                   </div>
                   
                   {selectedTime && (
                     <div className="animate-fade-in space-y-4 pt-2">
                       <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1 block">Profissional Disponível</label>
                       <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-none outline-none">
                          <option value="">Selecione...</option>
                          {currentSlotsAvailability[selectedTime]?.map(pro => <option key={pro.id} value={pro.id}>{pro.name}</option>)}
                       </select>
                     </div>
                   )}

                   <label className="flex items-start gap-4 p-5 bg-red-50 rounded-3xl cursor-pointer border border-red-100 mt-6">
                      <input type="checkbox" checked={agreedToCancellation} onChange={e => setAgreedToCancellation(e.target.checked)} className="mt-1 w-4 h-4 rounded text-red-600 border-red-200 focus:ring-red-500" />
                      <span className="text-[9px] font-bold text-red-900 uppercase leading-relaxed">Ciente: O sinal de agendamento não será devolvido em caso de cancelamento.</span>
                   </label>
                </div>

                <button disabled={!selectedTime || !selectedProId || !agreedToCancellation} onClick={handleBookSubmit} className="w-full py-6 bg-tea-900 text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-widest shadow-2xl disabled:bg-gray-100 disabled:text-gray-400 transition-all transform active:scale-95">Solicitar Agendamento</button>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="text-center py-20 bg-white rounded-[4rem] shadow-2xl px-10 space-y-8 animate-slide-up border border-tea-50">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto">✓</div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-serif font-bold text-tea-950">Solicitado!</h3>
                  <p className="text-xs text-gray-400 font-light leading-relaxed">Seu agendamento para <strong>{selectedService?.name}</strong> está sendo processado. Envie o comprovante de sinal para confirmarmos sua vaga.</p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-3xl space-y-1">
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Valor do Sinal (30%)</p>
                   <p className="text-2xl font-bold text-tea-950">R$ {(priceInfo.final * 0.3).toFixed(2)}</p>
                </div>

                <button onClick={() => {
                  const msg = `Olá Moriá! Solicitei ${selectedService?.name} para o dia ${new Date(selectedDate).toLocaleDateString()} às ${selectedTime}. Segue o comprovante de sinal.`;
                  window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                  setActiveTab('agenda'); setBookingStep(1);
                }} className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black">📱 Enviar Comprovante</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-6 animate-slide-up">
            {myBookings.map(b => (
              <div key={b.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-4 group hover:border-tea-100 transition-all">
                <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-bold text-tea-950 text-lg leading-tight">{b.serviceName}</h4>
                     <p className="text-[11px] text-gray-400 font-medium">{new Date(b.dateTime.replace(' ', 'T')).toLocaleDateString()} às {new Date(b.dateTime.replace(' ', 'T')).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                     b.status === 'completed' ? 'bg-green-50 text-green-700' : 
                     b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                     'bg-tea-50 text-tea-700'
                   }`}>
                     {b.status === 'pending' ? 'Pendente' : b.status === 'scheduled' ? 'Confirmado' : b.status === 'completed' ? 'Concluído' : 'Cancelado'}
                   </span>
                </div>

                {b.promotionId && (
                  <div className="bg-tea-50 p-4 rounded-2xl border border-tea-100 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-tea-700 uppercase tracking-widest">Bônus Aplicado</p>
                      <p className="text-[10px] font-bold text-tea-900 uppercase">{b.promotionTitle}</p>
                    </div>
                    <span className="text-tea-800 font-bold text-xs">- R$ {b.discountApplied?.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center border-t border-gray-50">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor do Atendimento</span>
                   <span className="font-bold text-tea-950 text-lg">R$ {b.finalPrice?.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {myBookings.length === 0 && (
              <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-300 italic font-serif text-lg">Nenhum atendimento agendado.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-gray-100 text-center space-y-8 animate-slide-up">
             <div className="w-24 h-24 bg-tea-900 text-white rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-xl font-serif">{customer.name.charAt(0)}</div>
             <div>
                <h3 className="text-2xl font-serif font-bold text-tea-950 italic">{customer.name}</h3>
                <p className="text-xs text-gray-400">CPF: {customer.cpf}</p>
             </div>
             <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all">Sair da Conta</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-10 py-8 flex justify-between rounded-t-[4rem] z-50 shadow-2xl">
         {[
           { id: 'home', icon: '🏠', label: 'Início' },
           { id: 'agendar', icon: '✨', label: 'Agendar' },
           { id: 'agenda', icon: '🗓️', label: 'Agenda' },
           { id: 'perfil', icon: '👤', label: 'Eu' }
         ].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-tea-900 scale-110' : 'text-gray-300 hover:text-gray-500'}`}>
              <span className="text-2xl">{tab.icon}</span>
              <span className={`text-[8px] font-bold uppercase tracking-[0.2em] transition-opacity duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`}>{tab.label}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default CustomerDashboard;
