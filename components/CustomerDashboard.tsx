
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
      {/* Header Estilo Mobile */}
      <header className="bg-tea-900 pt-10 pb-20 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="max-w-md mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-tea-800 border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-inner relative group">
              {customer.profilePhoto ? (
                <img src={customer.profilePhoto} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                <span className="text-3xl font-serif text-white">{customer.name.charAt(0)}</span>
              )}
              <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity">
                <span className="text-[8px] text-white font-bold uppercase">Mudar</span>
                <input type="file" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <p className="text-[9px] font-bold text-tea-300 uppercase tracking-widest mb-0.5">Olá, querida</p>
              <h1 className="text-xl font-serif font-bold text-white italic">{customer.name.split(' ')[0]}</h1>
            </div>
          </div>
          <button onClick={onLogout} className="p-3 bg-white/10 rounded-2xl text-white">🚪</button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-10 relative z-20">
        
        {/* Aba HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-slide-up">
            {nextBooking ? (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-tea-50 overflow-hidden">
                <div className="bg-tea-50/50 px-6 py-3 border-b border-tea-100 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-tea-700 uppercase tracking-widest">Sua Próxima Sessão</span>
                  <div className="w-1.5 h-1.5 bg-tea-500 rounded-full animate-pulse"></div>
                </div>
                <div className="p-8 text-center">
                  <h3 className="text-2xl font-serif font-bold text-tea-950 mb-1">{nextBooking.serviceName}</h3>
                  <p className="text-xs text-tea-400 font-bold uppercase tracking-tight mb-8">Com {nextBooking.teamMemberName || 'nossa equipe'}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Dia</p>
                      <p className="font-bold text-tea-900">{new Date(nextBooking.dateTime).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hora</p>
                      <p className="font-bold text-tea-900">{new Date(nextBooking.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  
                  <button onClick={() => setActiveTab('agenda')} className="w-full py-5 bg-tea-800 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-widest shadow-xl">Ver Detalhes</button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-100 text-center space-y-6">
                <div className="w-20 h-20 bg-tea-50 rounded-full flex items-center justify-center text-4xl mx-auto">💆‍♀️</div>
                <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Pausa para Você</h3>
                <p className="text-xs text-gray-400 font-light">Nenhum agendamento ativo. Que tal reservar um momento especial agora?</p>
                <button onClick={() => setActiveTab('agendar')} className="bg-tea-800 text-white px-10 py-5 rounded-[2rem] font-bold text-[10px] uppercase tracking-widest shadow-lg">Agendar Agora</button>
              </div>
            )}

            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-tea-50 flex items-center justify-between group active:bg-tea-50 transition-colors"
            >
               <div className="flex items-center gap-4">
                  <div className="text-3xl">📍</div>
                  <div className="text-left">
                     <p className="text-[9px] font-bold text-tea-600 uppercase tracking-widest mb-1">Onde Estamos</p>
                     <p className="text-xs text-tea-950 font-bold max-w-[180px] leading-tight">{settings.address?.split(' - ')[0]}</p>
                  </div>
               </div>
               <span className="text-tea-400 group-hover:translate-x-1 transition-transform">→</span>
            </a>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-tea-50 relative overflow-hidden">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-tea-50 rounded-xl flex items-center justify-center text-xl shadow-sm">✨</div>
                  <h4 className="font-bold text-tea-900 text-sm">Dicas de Beleza</h4>
               </div>
               {isLoadingTips ? (
                 <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
               ) : (
                 <div className="text-xs text-gray-500 leading-relaxed italic font-light">
                   {careTips || "Reserve um horário para receber dicas personalizadas da nossa IA."}
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
                <h3 className="text-2xl font-serif font-bold text-tea-950 italic px-2 mb-2">Qual seu desejo hoje?</h3>
                <div className="space-y-4">
                  {services.filter(s => s.isVisible).map(service => (
                    <button 
                      key={service.id}
                      onClick={() => { setSelectedService(service); setBookingStep(2); }}
                      className="w-full bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm flex items-center justify-between group active:bg-tea-50 transition-all text-left"
                    >
                      <div className="flex-1">
                        <h4 className="font-bold text-tea-900 text-lg mb-1">{service.name}</h4>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-tea-600 bg-tea-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">R$ {service.price.toFixed(2)}</span>
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">🕒 {service.duration} min</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-tea-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">✨</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {bookingStep === 2 && selectedService && (
              <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-tea-50 space-y-8 animate-fade-in">
                <div className="flex items-center gap-4">
                   <button onClick={() => setBookingStep(1)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">←</button>
                   <div>
                     <h3 className="font-bold text-tea-950">{selectedService.name}</h3>
                     <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Personalize seu momento</p>
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Selecione o Dia</label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      max={settings.agendaOpenUntil || undefined}
                      onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                      className="w-full p-5 bg-gray-50 rounded-3xl border-none font-bold text-tea-900 outline-none focus:ring-4 focus:ring-tea-100"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Escolha o Horário</label>
                    <div className="grid grid-cols-3 gap-3">
                      {allPossibleSlots.map(slot => {
                        const available = !!currentSlotsAvailability[slot];
                        return (
                          <button 
                            key={slot}
                            disabled={!available}
                            onClick={() => setSelectedTime(slot)}
                            className={`p-4 rounded-2xl text-[10px] font-bold border-2 transition-all ${
                              selectedTime === slot ? 'bg-tea-800 border-tea-800 text-white shadow-xl shadow-tea-900/20' :
                              available ? 'bg-white border-tea-50 text-tea-900 hover:border-tea-200' :
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
                    <div className="space-y-3 animate-fade-in">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Com quem deseja?</label>
                       <div className="space-y-3">
                          {currentSlotsAvailability[selectedTime]?.map(pro => (
                            <button 
                              key={pro.id}
                              onClick={() => setSelectedProId(pro.id)}
                              className={`w-full p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all ${selectedProId === pro.id ? 'border-tea-600 bg-tea-50' : 'bg-white border-gray-50'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-tea-800 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-lg">{pro.name.charAt(0)}</div>
                                <span className="font-bold text-sm text-tea-900">{pro.name}</span>
                              </div>
                              {selectedProId === pro.id && <span className="text-tea-600 text-xs font-bold">✓</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                  )}
                </div>

                <button 
                  disabled={!selectedTime || !selectedProId}
                  onClick={handleBookSubmit}
                  className="w-full py-6 bg-tea-800 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-widest shadow-2xl disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none transition-all"
                >
                  Confirmar Agendamento
                </button>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="text-center py-16 space-y-8 animate-slide-up bg-white rounded-[4rem] border border-tea-50 shadow-xl px-8">
                <div className="w-28 h-28 bg-tea-50 rounded-full flex items-center justify-center text-6xl mx-auto shadow-inner animate-bounce">⏳</div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-serif font-bold text-tea-950 italic">Solicitado!</h3>
                  <p className="text-gray-400 text-xs leading-relaxed max-w-[240px] mx-auto font-light">Para garantir sua vaga, envie agora o comprovante do sinal via WhatsApp.</p>
                </div>
                <button 
                  onClick={() => {
                    const msg = `Olá Studio Moriá! Solicitei ${selectedService?.name} para ${selectedDate} às ${selectedTime}. Segue comprovante do sinal.`;
                    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    setActiveTab('agenda');
                    setBookingStep(1);
                  }}
                  className="w-full py-6 bg-tea-900 text-white rounded-[2.5rem] font-bold text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"
                >
                   📱 Enviar Comprovante
                </button>
              </div>
            )}
          </div>
        )}

        {/* Aba AGENDA */}
        {activeTab === 'agenda' && (
          <div className="space-y-6 animate-slide-up">
             <h3 className="text-2xl font-serif font-bold text-tea-950 italic px-4">Minhas Visitas</h3>
             <div className="space-y-4">
                {myBookings.length > 0 ? myBookings.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-tea-50 text-tea-700 shadow-inner'}`}>
                         {b.status === 'completed' ? '✨' : '📅'}
                      </div>
                      <div>
                        <h4 className="font-bold text-tea-950 text-base">{b.serviceName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{new Date(b.dateTime).toLocaleDateString()} às {new Date(b.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest border ${
                      b.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                      b.status === 'pending' ? 'bg-orange-50 text-orange-700 border-orange-100 animate-pulse' :
                      'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {b.status === 'completed' ? 'Finalizado' : b.status === 'pending' ? 'Pendente' : 'Confirmado'}
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center opacity-30 italic font-serif text-lg">Seu histórico está vazio.</div>
                )}
             </div>
          </div>
        )}

        {/* Aba PERFIL */}
        {activeTab === 'perfil' && (
          <div className="space-y-6 animate-slide-up">
             <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">Sua Identificação</label>
                     <div className="p-5 bg-gray-50 rounded-2xl font-bold text-tea-950 text-sm shadow-inner">{customer.name}</div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">WhatsApp de Contato</label>
                     <div className="p-5 bg-gray-50 rounded-2xl font-bold text-tea-950 text-sm shadow-inner">{customer.whatsapp}</div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">Documento (CPF)</label>
                     <div className="p-5 bg-gray-50 rounded-2xl font-bold text-gray-400 text-sm shadow-inner italic">***.***.{customer.cpf.slice(-5)}</div>
                  </div>
                </div>
                
                <div className="pt-6 grid grid-cols-1 gap-4">
                   <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-red-100 active:scale-95 transition-all">Sair da Conta</button>
                </div>
             </div>
             
             <div className="text-center py-8 opacity-20 flex flex-col items-center gap-3">
                <img src={settings.logo} className="h-10 w-auto grayscale" alt="Logo" />
                <p className="text-[9px] font-bold uppercase tracking-[0.5em]">Studio Moriá Estética</p>
             </div>
          </div>
        )}
      </main>

      {/* Navegação Inferior Fixa */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-8 py-6 flex justify-between items-center z-[100] shadow-[0_-15px_50px_rgba(0,0,0,0.06)] rounded-t-[3.5rem]">
         {[
           { id: 'home', icon: '🏠', label: 'Início' },
           { id: 'agendar', icon: '✨', label: 'Agendar' },
           { id: 'agenda', icon: '🗓️', label: 'Agenda' },
           { id: 'perfil', icon: '👤', label: 'Conta' }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => { setActiveTab(tab.id as any); if(tab.id === 'agendar') setBookingStep(1); }}
             className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === tab.id ? 'text-tea-900 scale-110 -translate-y-2' : 'text-gray-300'}`}
           >
              <span className={`text-2xl ${activeTab === tab.id ? 'drop-shadow-[0_0_8px_rgba(41,91,53,0.3)]' : ''}`}>{tab.icon}</span>
              <span className={`text-[8px] font-bold uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`}>{tab.label}</span>
              {activeTab === tab.id && <div className="w-1.5 h-1.5 bg-tea-900 rounded-full mt-0.5"></div>}
           </button>
         ))}
      </nav>
    </div>
  );
};

export default CustomerDashboard;
