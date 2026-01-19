
import React, { useState, useEffect, useMemo } from 'react';
import { SalonSettings, Service, Customer, Booking, TeamMember } from '../types.ts';

interface CustomerHomeProps {
  settings: SalonSettings;
  services: Service[];
  bookings: Booking[];
  onBook: (serviceId: string, dateTime: string, teamMemberId?: string) => void;
  onAuthClick: () => void;
  onAddToWaitlist: (serviceId: string, date: string) => void;
  currentUser: Customer | null;
}

const CustomerHome: React.FC<CustomerHomeProps> = ({ settings, services, bookings, onBook, onAuthClick, onAddToWaitlist, currentUser }) => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [bookingModal, setBookingModal] = useState<{ open: boolean; service: Service | null; step: 1 | 2 | 3 }>({ open: false, service: null, step: 1 });
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, name: currentUser.name, whatsapp: currentUser.whatsapp }));
    }
  }, [currentUser]);

  // Gera todos os horários possíveis baseados no funcionamento do salão
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

  // Filtra profissionais que fazem o serviço selecionado
  const professionalsForService = useMemo(() => {
    if (!bookingModal.service) return [];
    return settings.teamMembers.filter(m => m.assignedServiceIds.includes(bookingModal.service!.id));
  }, [bookingModal.service, settings.teamMembers]);

  // Verifica quais horários têm pelo menos uma profissional livre
  const slotsAvailability = useMemo(() => {
    if (!bookingModal.service) return {};
    
    const availability: Record<string, TeamMember[]> = {};
    
    allPossibleSlots.forEach(slot => {
      const fullDateTime = `${selectedDate} ${slot}`;
      
      // Encontra profissionais que NÃO têm agendamento nesse horário
      const freePros = professionalsForService.filter(pro => {
        const isOccupied = bookings.some(b => 
          b.teamMemberId === pro.id && 
          b.dateTime === fullDateTime && 
          b.status !== 'cancelled'
        );
        return !isOccupied;
      });

      if (freePros.length > 0) {
        availability[slot] = freePros;
      }
    });

    return availability;
  }, [allPossibleSlots, selectedDate, professionalsForService, bookings, bookingModal.service]);

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    const availablePros = slotsAvailability[time];
    
    if (availablePros.length === 1) {
      setSelectedProfessional(availablePros[0].id);
      setBookingModal(prev => ({ ...prev, step: 2 }));
    } else {
      setBookingModal(prev => ({ ...prev, step: 2 }));
    }
  };

  const confirmBooking = () => {
    if (bookingModal.service && selectedProfessional && selectedTime) {
      const fullDateTime = `${selectedDate} ${selectedTime}`;
      onBook(bookingModal.service.id, fullDateTime, selectedProfessional);
      setBookingModal({ ...bookingModal, step: 3 });
    }
  };

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá! Me chamo ${formData.name}. ${formData.message}`;
    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="animate-fade-in bg-white text-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center force-brand-bg bg-tea-900 overflow-hidden px-4">
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center -mt-24 md:-mt-36">
          <div className="mb-6 md:mb-10">
            <img src={settings.logo} className="h-[12rem] md:h-[22rem] lg:h-[32rem] w-auto drop-shadow-[0_45px_100px_rgba(0,0,0,0.6)] object-contain animate-float" alt="Logo Studio Moriá" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-serif text-white mb-10 italic tracking-tight leading-tight max-w-4xl mx-auto px-4">Cuidando do seu bem estar</h2>
            <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
              <button onClick={() => scrollToId('procedimentos')} className="w-full bg-white text-tea-900 px-8 py-5 rounded-full font-bold shadow-2xl uppercase tracking-widest hover:scale-105 hover:bg-tea-50 transition-all text-[11px]">Ver Serviços</button>
              <button onClick={() => currentUser ? scrollToId('procedimentos') : onAuthClick()} className="w-full bg-tea-800 text-white border-2 border-tea-700 px-8 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-tea-950 transition-all text-[11px] shadow-xl">Agendar Agora</button>
              <button onClick={() => scrollToId('contato')} className="w-full bg-transparent text-white border-2 border-white/20 px-8 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-[11px]">Fale Conosco</button>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      </section>

      {/* Procedimentos Section */}
      <section id="procedimentos" className="max-w-7xl mx-auto px-4 py-24 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif text-gray-900 mb-4">Procedimentos</h2>
          <div className="h-1 w-20 bg-tea-600 mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.filter(s => s.isVisible).map(service => (
            <div key={service.id} className="bg-gray-50 p-8 rounded-[2.5rem] flex flex-col justify-between border-2 border-transparent hover:border-tea-100 hover:bg-white transition-all group shadow-sm">
              <div>
                <h3 className="text-xl font-serif font-bold text-tea-950 mb-4">{service.name}</h3>
                <p className="text-gray-500 text-sm font-light mb-8 line-clamp-3">{service.description}</p>
                {currentUser && <p className="text-tea-800 font-bold text-xl mb-6">R$ {service.price.toFixed(2)}</p>}
              </div>
              <button onClick={() => { if(!currentUser) onAuthClick(); else setBookingModal({open: true, service, step: 1}); }} className="w-full py-4 rounded-xl border border-tea-100 text-tea-700 font-bold uppercase tracking-widest text-xs hover:bg-tea-800 hover:text-white transition-all">Ver Horários</button>
            </div>
          ))}
        </div>
      </section>

      {/* Contato Section */}
      <section id="contato" className="bg-tea-50 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
           <h2 className="text-4xl font-serif text-tea-900 mb-4">Fale Conosco</h2>
           <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl border border-white mt-10">
            <form onSubmit={handleContactSubmit} className="space-y-8 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input required placeholder="Seu nome" className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-none outline-none shadow-inner" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="Seu WhatsApp" className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-none outline-none shadow-inner" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <textarea required rows={4} placeholder="Como podemos ajudar?" className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-none outline-none shadow-inner resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-tea-800 text-white py-6 rounded-3xl font-bold text-xl shadow-xl hover:bg-tea-900 transition-all">Enviar via WhatsApp</button>
            </form>
           </div>
        </div>
      </section>

      {/* MODAL DE AGENDAMENTO COM GRADE DE HORÁRIOS */}
      {bookingModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto custom-scroll">
            
            {/* Passo 1: Seleção de Data e Horário (A Grade) */}
            {bookingModal.step === 1 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-serif text-tea-900">Horários Disponíveis</h3>
                  <button onClick={() => setBookingModal({open: false, service: null, step: 1})} className="text-gray-400 hover:text-tea-800 text-2xl">&times;</button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Selecione o Dia</label>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }} 
                    className="w-full p-4 border-2 border-tea-50 rounded-2xl outline-none focus:border-tea-200 transition-all font-bold text-tea-900" 
                    min={new Date().toISOString().split('T')[0]} 
                  />
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Horários para {bookingModal.service?.name}</label>
                   <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {allPossibleSlots.map(slot => {
                        const isAvailable = !!slotsAvailability[slot];
                        return (
                          <button 
                            key={slot}
                            disabled={!isAvailable}
                            onClick={() => handleTimeSelect(slot)}
                            className={`p-4 rounded-2xl text-xs font-bold transition-all border-2 ${
                              isAvailable 
                              ? 'bg-tea-50 border-tea-100 text-tea-800 hover:bg-tea-800 hover:text-white hover:scale-105' 
                              : 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                   </div>
                </div>

                {Object.keys(slotsAvailability).length === 0 && (
                  <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center space-y-3">
                    <p className="text-orange-800 font-bold text-sm">Poxa, sem horários para este dia!</p>
                    <button 
                      onClick={() => onAddToWaitlist(bookingModal.service!.id, selectedDate)}
                      className="text-[10px] bg-orange-600 text-white px-4 py-2 rounded-full font-bold uppercase tracking-widest"
                    >
                      Entrar na Lista de Espera
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Passo 2: Seleção de Profissional (Se houver mais de uma livre) */}
            {bookingModal.step === 2 && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-serif text-tea-900 mb-2">Com quem deseja agendar?</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Horário: {selectedDate} às {selectedTime}</p>
                </div>

                <div className="space-y-3">
                   {slotsAvailability[selectedTime]?.map(pro => (
                     <button 
                        key={pro.id} 
                        onClick={() => setSelectedProfessional(pro.id)}
                        className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${
                          selectedProfessional === pro.id 
                          ? 'border-tea-600 bg-tea-50' 
                          : 'border-gray-50 bg-gray-50 hover:border-tea-200'
                        }`}
                     >
                        <div className="w-12 h-12 bg-tea-800 text-white rounded-2xl flex items-center justify-center font-bold text-xl">{pro.name.charAt(0)}</div>
                        <div className="text-left">
                          <p className="font-bold text-tea-950">{pro.name}</p>
                          <p className="text-[10px] text-tea-600 uppercase font-bold tracking-tighter">Disponível agora</p>
                        </div>
                     </button>
                   ))}
                </div>

                <div className="bg-orange-50 p-5 rounded-3xl border border-orange-100">
                  <p className="text-[10px] text-orange-700 font-bold uppercase tracking-widest mb-1">⚠️ Aviso de Garantia</p>
                  <p className="text-[11px] text-orange-800 leading-relaxed">Seu agendamento só será validado após a análise da equipe e o pagamento do sinal.</p>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setBookingModal(prev => ({ ...prev, step: 1 }))} className="flex-1 py-4 text-gray-400 font-bold">Voltar</button>
                   <button 
                    onClick={confirmBooking} 
                    disabled={!selectedProfessional}
                    className="flex-[2] bg-tea-800 text-white py-4 rounded-2xl font-bold shadow-xl disabled:opacity-50"
                   >
                     Solicitar Agendamento
                   </button>
                </div>
              </div>
            )}

            {/* Passo 3: Feedback de Envio */}
            {bookingModal.step === 3 && (
              <div className="text-center py-10 space-y-6">
                <div className="w-24 h-24 bg-tea-50 text-tea-600 rounded-full flex items-center justify-center text-5xl mx-auto animate-bounce">⏳</div>
                <h3 className="text-3xl font-serif text-tea-900 font-bold italic">Quase lá!</h3>
                <p className="text-gray-500 text-sm leading-relaxed px-4">
                  Sua solicitação para <b>{bookingModal.service?.name}</b> foi enviada. <br/><br/>
                  Para garantir sua vaga, envie agora o <b>comprovante do sinal</b> clicando no botão abaixo.
                </p>
                <button 
                  onClick={() => {
                    const msg = `Olá Studio Moriá! Solicitei ${bookingModal.service?.name} para ${selectedDate} às ${selectedTime}. Segue o comprovante do sinal.`;
                    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    setBookingModal({open: false, service: null, step: 1});
                  }}
                  className="w-full bg-tea-800 text-white py-6 rounded-3xl font-bold shadow-2xl flex items-center justify-center gap-4 hover:scale-105 transition-transform"
                >
                  Confirmar via WhatsApp 📱
                </button>
                <button onClick={() => setBookingModal({open: false, service: null, step: 1})} className="text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-tea-800">Fechar e ver depois</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 7s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default CustomerHome;
