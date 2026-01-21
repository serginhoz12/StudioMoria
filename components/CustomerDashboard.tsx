
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
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProId, setSelectedProId] = useState<string>('');
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [agreedToCancellation, setAgreedToCancellation] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  
  const [viewingServiceDetail, setViewingServiceDetail] = useState<Service | null>(null);

  // Textos Legais
  const POLICY_CHECKBOX_TEXT = "Declaro ciência da taxa de reserva de 30% em caso de falta.";
  const POLICY_MODAL_TEXT = "Declaro ciência da taxa de reserva de 30%. Em caso de falta, 50% desse valor (no caso 15% do valor do serviço) será retido ao salão.";

  const filteredServices = useMemo(() => {
    return services
      .filter(s => s.isVisible && s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
      .sort((a, b) => (a.isHighlighted ? -1 : 1));
  }, [services, serviceSearch]);

  const activePromotions = useMemo(() => 
    promotions.filter(p => (p.targetCustomerIds || []).includes(customer.id) && p.type === 'promotion' && p.isActive),
    [promotions, customer.id]);

  const activePromoForService = useMemo(() => {
    if (!selectedService) return null;
    return activePromotions.find(p => p.linkedServiceId === selectedService.id || p.applicableServiceIds.includes(selectedService.id));
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
        
        return !bookings.some(b => 
          b.teamMemberId === pro.id && 
          b.status !== 'cancelled' && 
          b.dateTime === `${selectedDate} ${slot}`
        );
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
        policyAgreedText: POLICY_MODAL_TEXT, // Registro de auditoria solicitado
        promotionId: activePromoForService?.id,
        promotionTitle: activePromoForService?.title,
        originalPrice: priceInfo.original,
        discountApplied: priceInfo.discount,
        finalPrice: priceInfo.final
      });
      setShowPolicyModal(false);
      setBookingStep(3);
    }
  };

  const myBookings = bookings.filter(b => b.customerId === customer.id).sort((a,b) => b.dateTime.localeCompare(a.dateTime));

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in">
      {/* Pop-up de Confirmação Final de Ciência da Taxa */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/90 backdrop-blur-lg animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-3xl animate-slide-up space-y-8 text-center border-4 border-tea-100">
            <div className="w-20 h-20 bg-tea-50 text-tea-900 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">📄</div>
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-tea-950 italic">Confirmação de Ciência</h3>
              <p className="text-gray-600 text-sm leading-relaxed font-medium">
                {POLICY_MODAL_TEXT}
              </p>
            </div>
            <div className="flex flex-col gap-3">
               <button 
                 onClick={handleBookSubmit}
                 className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all"
               >
                 Estou Ciente e Confirmo
               </button>
               <button 
                 onClick={() => setShowPolicyModal(false)}
                 className="w-full py-3 text-gray-400 font-bold uppercase text-[9px] tracking-widest"
               >
                 Voltar e Ajustar
               </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-tea-900 pt-12 pb-24 px-8 rounded-b-[4.5rem] shadow-2xl relative overflow-hidden">
        <div className="max-w-md mx-auto flex flex-col items-center gap-6 relative z-10 text-white">
          <div className="w-full flex justify-between items-start">
            <button onClick={onLogout} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">🚪</button>
            <div className="text-right">
              <p className="text-[9px] font-bold text-tea-300 uppercase tracking-widest">Studio Moriá</p>
              <h2 className="text-xl font-serif font-bold italic">Painel Exclusivo</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 w-full mt-4">
             <div className="w-20 h-20 bg-white/10 rounded-3xl border border-white/20 flex items-center justify-center text-3xl font-serif shadow-inner">{customer.name.charAt(0)}</div>
             <div>
                <p className="text-[10px] font-bold uppercase text-tea-200">Bem-vinda de volta,</p>
                <h1 className="text-2xl font-serif font-bold italic">{customer.name.split(' ')[0]}</h1>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 -mt-12 relative z-20 pb-20">
        {activeTab === 'home' && (
          <div className="space-y-10 animate-slide-up">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-gray-50 text-center space-y-6">
               <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Sua Melhor Versão</h3>
               <button onClick={() => setActiveTab('agendar')} className="w-full py-5 bg-tea-800 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-tea-950 transition-all">Novo Agendamento</button>
            </div>
          </div>
        )}

        {activeTab === 'agendar' && (
          <div className="space-y-6 animate-slide-up pb-10">
             {bookingStep === 1 && (
              <div className="space-y-6">
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-lg">🔍</span>
                  <input type="text" placeholder="Qual procedimento deseja?" value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} className="w-full p-5 pl-14 bg-white rounded-3xl shadow-sm border border-gray-100 outline-none font-medium" />
                </div>
                <div className="space-y-4">
                  {filteredServices.map(service => (
                    <div key={service.id} onClick={() => { setSelectedService(service); setBookingStep(2); }} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm transition-all hover:border-tea-200 cursor-pointer">
                      <h4 className="font-bold text-tea-950 text-xl font-serif italic mb-2">{service.name}</h4>
                      <p className="text-gray-400 text-xs mb-8 line-clamp-2 italic">{service.description}</p>
                      <div className="flex justify-between items-center">
                         <div className="text-tea-800 font-bold font-serif italic text-lg">R$ {service.price.toFixed(2)}</div>
                         <button className="px-10 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Agendar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-tea-50 space-y-10 animate-slide-up">
                <div className="flex items-center gap-5">
                   <button onClick={() => setBookingStep(1)} className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-tea-900 font-bold">←</button>
                   <div>
                      <h3 className="font-bold text-tea-950 text-lg font-serif italic">{selectedService.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Escolha Horário & Profissional</p>
                   </div>
                </div>
                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Data da Sessão</label>
                      <input type="date" min={todayStr} max={settings.agendaOpenUntil} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-5 bg-gray-50 rounded-3xl font-bold outline-none border-none shadow-inner" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Horários Disponíveis</label>
                      <div className="grid grid-cols-3 gap-3">
                        {allPossibleSlots.map(slot => {
                           const available = !!currentSlotsAvailability[slot];
                           return (
                             <button key={slot} disabled={!available} onClick={() => setSelectedTime(slot)} className={`p-5 rounded-2xl text-[11px] font-bold border-2 transition-all ${selectedTime === slot ? 'bg-tea-900 text-white border-tea-900 shadow-xl scale-105' : available ? 'bg-white border-tea-100 text-tea-900 hover:bg-tea-50' : 'bg-gray-100 text-gray-300 border-transparent opacity-40 cursor-not-allowed'}`}>{slot}</button>
                           );
                        })}
                      </div>
                   </div>
                   {selectedTime && (
                     <div className="space-y-3 animate-fade-in">
                        <label className="text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Profissional</label>
                        <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-5 bg-gray-50 rounded-3xl font-bold outline-none appearance-none shadow-inner">
                           <option value="">Selecione...</option>
                           {currentSlotsAvailability[selectedTime]?.map(pro => <option key={pro.id} value={pro.id}>{pro.name}</option>)}
                        </select>
                     </div>
                   )}
                   
                   {/* Aviso de Destaque solicitado: Taxa de 30% */}
                   <div className="p-8 bg-tea-50 rounded-[2.5rem] border-2 border-tea-100 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 w-6 h-6 flex-shrink-0 bg-tea-900 text-white rounded-lg flex items-center justify-center text-xs font-bold">!</div>
                        <p className="text-[10px] font-bold text-tea-900 uppercase leading-relaxed tracking-wider">
                          Para garantir seu horário, o Studio Moriá requer uma taxa de reserva de 30% do valor do serviço.
                        </p>
                      </div>
                      <label className="flex items-center gap-4 cursor-pointer group pt-2">
                        <div className="relative">
                          <input type="checkbox" checked={agreedToCancellation} onChange={e => setAgreedToCancellation(e.target.checked)} className="peer appearance-none w-7 h-7 bg-white border-2 border-tea-200 rounded-xl checked:bg-tea-900 checked:border-tea-900 transition-all cursor-pointer" />
                          <svg className="absolute top-1.5 left-1.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <span className="text-[11px] font-bold text-tea-950 uppercase tracking-widest">{POLICY_CHECKBOX_TEXT}</span>
                      </label>
                   </div>
                </div>
                <button 
                  disabled={!selectedTime || !selectedProId || !agreedToCancellation} 
                  onClick={() => setShowPolicyModal(true)} 
                  className="w-full py-7 bg-tea-950 text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl disabled:bg-gray-100 disabled:text-gray-400 transition-all"
                >
                  Solicitar Horário
                </button>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-tea-100 text-center space-y-8 animate-slide-up">
                 <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">✓</div>
                 <div>
                    <h3 className="text-3xl font-serif text-tea-950 font-bold italic mb-3">Enviado com Sucesso!</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Sua solicitação está em análise. Fique atenta ao seu WhatsApp para a confirmação do sinal.</p>
                 </div>
                 <button onClick={() => { setActiveTab('agenda'); setBookingStep(1); }} className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase text-[11px] tracking-widest shadow-xl">Ver Minha Agenda</button>
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
                   <span className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${b.status === 'completed' ? 'bg-green-50 text-green-700' : b.status === 'cancelled' ? 'bg-red-50 text-red-700' : b.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                     {b.status === 'pending' ? 'Em Análise' : b.status === 'scheduled' ? 'Confirmado' : b.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="space-y-8 animate-slide-up pb-10">
             <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 text-center relative overflow-hidden">
                <div className="w-24 h-24 bg-tea-900 text-white rounded-[2rem] flex items-center justify-center text-4xl font-serif mx-auto mb-6 shadow-2xl">{customer.name.charAt(0)}</div>
                <h3 className="text-3xl font-serif text-tea-950 font-bold italic mb-2">{customer.name}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-10">CPF: {customer.cpf}</p>
                <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-bold uppercase text-[10px] tracking-widest">Sair da Conta</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-gray-100 p-6 flex justify-between rounded-[3rem] z-50 shadow-[0_40px_80px_rgba(0,0,0,0.15)] max-w-md mx-auto">
         {[
           { id: 'home', icon: '🏠', label: 'Início' },
           { id: 'agendar', icon: '✨', label: 'Agendar' },
           { id: 'agenda', icon: '🗓️', label: 'Agenda' },
           { id: 'perfil', icon: '👤', label: 'Perfil' }
         ].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-2 transition-all ${activeTab === tab.id ? 'text-tea-900' : 'text-gray-300'}`}>
              <span className={`text-2xl transition-transform ${activeTab === tab.id ? 'scale-125 -translate-y-1' : ''}`}>{tab.icon}</span>
              <span className={`text-[8px] font-bold uppercase tracking-[0.2em] ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`}>{tab.label}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default CustomerDashboard;
