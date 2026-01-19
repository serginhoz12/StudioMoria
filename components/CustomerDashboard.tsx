
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Booking, Service, SalonSettings, TeamMember } from '../types';
import { GoogleGenAI } from '@google/genai';

interface CustomerDashboardProps {
  customer: Customer;
  bookings: Booking[];
  services: Service[];
  settings: SalonSettings;
  onBook: (serviceId: string, dateTime: string, teamMemberId?: string) => void;
  onUpdateProfile: (updated: Partial<Customer>) => void;
  onLogout: () => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  customer, 
  bookings, 
  services, 
  settings,
  onBook,
  onUpdateProfile, 
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agenda' | 'perfil'>('home');
  const [careTips, setCareTips] = useState<string>('');
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProId, setSelectedProId] = useState<string>('');

  const myBookings = useMemo(() => 
    bookings.filter(b => b.customerId === customer.id && b.status !== 'cancelled')
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    [bookings, customer.id]
  );

  const nextBooking = useMemo(() => 
    myBookings.find(b => b.status === 'scheduled' || b.status === 'pending'),
    [myBookings]
  );

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

  const handleBookSubmit = () => {
    if (selectedService && selectedProId && selectedTime) {
      onBook(selectedService.id, `${selectedDate} ${selectedTime}`, selectedProId);
      setBookingStep(3);
    }
  };

  useEffect(() => {
    if (activeTab === 'home' && myBookings.length > 0 && !careTips) {
      generateCareTips();
    }
  }, [activeTab]);

  const generateCareTips = async () => {
    setIsLoadingTips(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const lastService = myBookings[0]?.serviceName || "Estética";
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Dê 3 dicas curtas de cuidados para quem acabou de fazer ${lastService}. Seja elegante e carinhosa. Use emojis de beleza.`,
      });
      setCareTips(response.text || "");
    } catch (e) {
      setCareTips("Lembre-se de hidratar a pele e usar protetor solar diariamente.");
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpdateProfile({ profilePhoto: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in">
      {/* Header Estilo Mobile com Ícone M Dominante */}
      <header className="bg-tea-900 pt-12 pb-24 px-8 rounded-b-[4.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
        <div className="max-w-md mx-auto flex flex-col items-center gap-6 relative z-10">
          <div className="w-full flex justify-between items-start mb-2">
            <button onClick={onLogout} className="p-4 bg-white/10 rounded-2xl text-white">🚪</button>
            <div className="text-right">
              <p className="text-[9px] font-bold text-tea-300 uppercase tracking-[0.3em] mb-1">Bem-vinda de volta</p>
              <h2 className="text-xl font-serif font-bold text-white italic">Studio Moriá</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full mt-4">
            <div className="w-24 h-24 rounded-[2.5rem] bg-white p-1.5 shadow-2xl relative group overflow-hidden flex-shrink-0">
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-tea-800 flex items-center justify-center">
                {customer.profilePhoto ? (
                  <img src={customer.profilePhoto} className="w-full h-full object-cover" alt="Perfil" />
                ) : (
                  <span className="text-white font-serif font-bold text-4xl">M</span>
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/60 flex flex-col items-center justify-center transition-opacity">
                <span className="text-[7px] text-white font-bold uppercase tracking-widest">Alterar Foto</span>
                <input type="file" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-tea-200 uppercase tracking-widest mb-1">Olá, querida</p>
              <h1 className="text-2xl font-serif font-bold text-white italic tracking-wide">
                {customer.name.split(' ')[0]}
              </h1>
              <div className="h-px w-10 bg-tea-400/30 mt-2"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 -mt-12 relative z-20">
        
        {/* Aba HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-slide-up">
            {nextBooking ? (
              <div className="bg-white rounded-[3rem] shadow-2xl border border-tea-50 overflow-hidden">
                <div className="bg-tea-50/50 px-8 py-4 border-b border-tea-100 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-tea-700 uppercase tracking-widest">Seu Próximo Cuidado</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-tea-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-tea-500 rounded-full animate-pulse delay-75"></div>
                  </div>
                </div>
                <div className="p-10 text-center">
                  <h3 className="text-3xl font-serif font-bold text-tea-950 mb-2">{nextBooking.serviceName}</h3>
                  <p className="text-xs text-tea-500 font-bold uppercase tracking-widest mb-10 italic">Com nossa equipe</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-gray-50/80 p-5 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Data</p>
                      <p className="font-bold text-tea-900 text-lg">{new Date(nextBooking.dateTime).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-50/80 p-5 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Hora</p>
                      <p className="font-bold text-tea-900 text-lg">{new Date(nextBooking.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  
                  <button onClick={() => setActiveTab('agenda')} className="w-full py-6 bg-tea-800 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-tea-900/10 active:scale-95 transition-all">Ver agendamento</button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-14 rounded-[4rem] shadow-xl border border-gray-50 text-center space-y-8">
                <div className="w-24 h-24 bg-tea-50 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner border-2 border-white">✨</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Cuidado Studio Moriá</h3>
                  <p className="text-[11px] text-gray-400 font-light leading-relaxed max-w-[200px] mx-auto">Sua jornada de autocuidado merece um novo capítulo.</p>
                </div>
                <button onClick={() => setActiveTab('agendar')} className="bg-tea-800 text-white px-12 py-5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Escolher procedimento</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <a 
                href={settings.googleMapsLink} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white p-8 rounded-[3rem] shadow-sm border border-tea-50 flex flex-col items-center gap-4 active:scale-95 transition-all"
              >
                 <div className="text-3xl">📍</div>
                 <div className="text-center">
                    <p className="text-[9px] font-bold text-tea-600 uppercase tracking-widest mb-1">Localização</p>
                    <p className="text-[10px] text-tea-950 font-bold uppercase tracking-tight">Ver no Mapa</p>
                 </div>
              </a>
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-tea-50 flex flex-col items-center gap-4">
                 <div className="text-3xl">🎁</div>
                 <div className="text-center">
                    <p className="text-[9px] font-bold text-tea-600 uppercase tracking-widest mb-1">Pontos</p>
                    <p className="text-[10px] text-tea-950 font-bold uppercase tracking-tight">Fidelidade</p>
                 </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-tea-50 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-tea-600"></div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🌿</div>
                  <h4 className="font-bold text-tea-900 text-sm tracking-widest uppercase">Dica Especial</h4>
               </div>
               {isLoadingTips ? (
                 <div className="space-y-3 animate-pulse">
                    <div className="h-3 bg-gray-100 rounded-full w-full"></div>
                    <div className="h-3 bg-gray-100 rounded-full w-4/5"></div>
                 </div>
               ) : (
                 <div className="text-xs text-gray-500 leading-relaxed italic font-light">
                   {careTips || "Realize um serviço para receber orientações personalizadas pós-procedimento."}
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Aba AGENDAR */}
        {activeTab === 'agendar' && (
          <div className="space-y-6 animate-slide-up">
            {bookingStep === 1 && (
              <>
                <div className="flex items-center justify-between px-2 mb-4">
                   <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Catálogo de Serviços</h3>
                   <span className="text-[10px] text-tea-400 font-bold uppercase tracking-widest">Moriá</span>
                </div>
                <div className="space-y-4">
                  {services.filter(s => s.isVisible).map(service => (
                    <button 
                      key={service.id}
                      onClick={() => { setSelectedService(service); setBookingStep(2); }}
                      className="w-full bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all text-left"
                    >
                      <div className="flex-1">
                        <h4 className="font-bold text-tea-950 text-xl mb-2">{service.name}</h4>
                        <div className="flex items-center gap-5">
                          <span className="text-[10px] font-bold text-tea-700 bg-tea-50 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                            <span className="opacity-50 text-[8px] mr-1">a partir de</span>
                            R$ {service.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                             {service.duration} min
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-tea-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl group-hover:bg-tea-800 transition-colors">✨</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-tea-50 space-y-10 animate-fade-in mb-10">
                <div className="flex items-center gap-5 border-b border-gray-50 pb-8">
                   <button onClick={() => setBookingStep(1)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-tea-800">←</button>
                   <div>
                     <h3 className="font-bold text-tea-950 text-lg">{selectedService.name}</h3>
                     <p className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.3em]">Escolha data e horário</p>
                   </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Data</label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      max={settings.agendaOpenUntil || undefined}
                      onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                      className="w-full p-6 bg-gray-50/80 rounded-[2rem] border-none font-bold text-tea-900 outline-none focus:ring-4 focus:ring-tea-50 transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Horário disponível</label>
                    <div className="grid grid-cols-3 gap-3">
                      {allPossibleSlots.map(slot => {
                        const available = !!currentSlotsAvailability[slot];
                        return (
                          <button 
                            key={slot}
                            disabled={!available}
                            onClick={() => setSelectedTime(slot)}
                            className={`p-5 rounded-2xl text-[10px] font-bold border-2 transition-all ${
                              selectedTime === slot ? 'bg-tea-800 border-tea-800 text-white shadow-2xl shadow-tea-900/20' :
                              available ? 'bg-white border-tea-50 text-tea-900 hover:border-tea-200 shadow-sm' :
                              'bg-gray-50 border-transparent text-gray-200 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedTime && (
                    <div className="space-y-4 animate-fade-in pt-4">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Profissional</label>
                       <div className="space-y-3">
                          {currentSlotsAvailability[selectedTime]?.map(pro => (
                            <button 
                              key={pro.id}
                              onClick={() => setSelectedProId(pro.id)}
                              className={`w-full p-6 rounded-[2.5rem] border-2 flex items-center justify-between transition-all ${selectedProId === pro.id ? 'border-tea-600 bg-tea-50 shadow-md' : 'bg-white border-gray-50 hover:border-tea-100'}`}
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-tea-900 text-white rounded-2xl flex items-center justify-center font-bold text-base shadow-lg">{pro.name.charAt(0)}</div>
                                <span className="font-bold text-base text-tea-900">{pro.name}</span>
                              </div>
                              {selectedProId === pro.id && (
                                <div className="w-8 h-8 bg-tea-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
                              )}
                            </button>
                          ))}
                       </div>
                    </div>
                  )}
                </div>

                <button 
                  disabled={!selectedTime || !selectedProId}
                  onClick={handleBookSubmit}
                  className="w-full py-7 bg-tea-800 text-white rounded-[2.5rem] font-bold text-[11px] uppercase tracking-[0.2em] shadow-2xl disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none transition-all active:scale-95"
                >
                  Confirmar agora
                </button>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="text-center py-20 space-y-10 animate-slide-up bg-white rounded-[4rem] border border-tea-50 shadow-2xl px-10">
                <div className="w-32 h-32 bg-tea-50 rounded-full flex items-center justify-center text-7xl mx-auto shadow-inner border-4 border-white animate-bounce">⏳</div>
                <div className="space-y-3">
                  <h3 className="text-4xl font-serif font-bold text-tea-950 italic">Solicitado!</h3>
                  <p className="text-gray-400 text-[11px] leading-relaxed max-w-[220px] mx-auto font-light">Para validar sua vaga, envie agora o comprovante do sinal pelo WhatsApp.</p>
                </div>
                <button 
                  onClick={() => {
                    const msg = `Olá Studio Moriá! Solicitei ${selectedService?.name} para ${selectedDate} às ${selectedTime}. Segue comprovante do sinal.`;
                    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    setActiveTab('agenda');
                    setBookingStep(1);
                  }}
                  className="w-full py-7 bg-tea-950 text-white rounded-[2.5rem] font-bold text-[10px] uppercase tracking-[0.2em] shadow-3xl flex items-center justify-center gap-4 hover:bg-black transition-colors"
                >
                   📱 Validar no WhatsApp
                </button>
              </div>
            )}
          </div>
        )}

        {/* Outras abas permanecem com o mesmo fluxo lógico */}
        {activeTab === 'agenda' && (
          <div className="space-y-6 animate-slide-up">
             <div className="flex items-center justify-between px-4">
                <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Minha Agenda</h3>
             </div>
             <div className="space-y-4">
                {myBookings.length > 0 ? myBookings.map(b => (
                  <div key={b.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-tea-50 text-tea-700 shadow-inner'}`}>
                         {b.status === 'completed' ? '✨' : '📅'}
                      </div>
                      <div>
                        <h4 className="font-bold text-tea-950 text-lg mb-1">{b.serviceName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                           {new Date(b.dateTime).toLocaleDateString()} às {new Date(b.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                      b.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                      b.status === 'pending' ? 'bg-orange-50 text-orange-700 border-orange-100 animate-pulse' :
                      'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {b.status === 'completed' ? 'Finalizado' : b.status === 'pending' ? 'Pendente' : 'Confirmado'}
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center opacity-30 italic font-serif text-xl px-10 leading-relaxed">Você ainda não possui atendimentos registrados.</div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="space-y-8 animate-slide-up">
             <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-gray-100 space-y-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] ml-3">Nome</label>
                     <div className="p-6 bg-gray-50 rounded-[2rem] font-bold text-tea-950 text-sm shadow-inner">{customer.name}</div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] ml-3">WhatsApp</label>
                     <div className="p-6 bg-gray-50 rounded-[2rem] font-bold text-tea-950 text-sm shadow-inner">{customer.whatsapp}</div>
                  </div>
                </div>
                <button onClick={onLogout} className="w-full py-6 bg-red-50 text-red-500 rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.2em] border border-red-100 active:scale-95 transition-all">Sair da Conta</button>
             </div>
             
             <div className="text-center py-12 opacity-30 flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-tea-900 rounded-2xl flex items-center justify-center shadow-lg">
                   <span className="text-white font-serif font-bold text-2xl">M</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.8em]">Studio Moriá</p>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 px-10 py-8 flex justify-between items-center z-[100] shadow-[0_-20px_60px_rgba(0,0,0,0.08)] rounded-t-[4rem]">
         {[
           { id: 'home', icon: '🏠', label: 'Início' },
           { id: 'agendar', icon: '✨', label: 'Agendar' },
           { id: 'agenda', icon: '🗓️', label: 'Agenda' },
           { id: 'perfil', icon: '👤', label: 'Eu' }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => { setActiveTab(tab.id as any); if(tab.id === 'agendar') setBookingStep(1); }}
             className={`flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === tab.id ? 'text-tea-900 scale-110 -translate-y-2' : 'text-gray-300'}`}
           >
              <span className={`text-2xl ${activeTab === tab.id ? 'drop-shadow-[0_0_12px_rgba(41,91,53,0.4)]' : ''}`}>{tab.icon}</span>
              <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{tab.label}</span>
              {activeTab === tab.id && <div className="w-1.5 h-1.5 bg-tea-900 rounded-full mt-1"></div>}
           </button>
         ))}
      </nav>
    </div>
  );
};

export default CustomerDashboard;
