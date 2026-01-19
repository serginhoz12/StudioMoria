
import React, { useState, useEffect } from 'react';
import { SalonSettings, Service, Customer, Booking } from '../types.ts';

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
  const [bookingModal, setBookingModal] = useState<{ open: boolean; service: Service | null; step: 1 | 2 }>({ open: false, service: null, step: 1 });
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name,
        whatsapp: currentUser.whatsapp
      }));
    } else {
      setFormData({ name: '', whatsapp: '', message: '' });
    }
  }, [currentUser]);

  const hours = Array.from({ length: 30 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30; 
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const confirmBooking = () => {
    if (bookingModal.service && selectedProfessional && selectedTime) {
      const fullDateTime = `${selectedDate} ${selectedTime}`;
      onBook(bookingModal.service.id, fullDateTime, selectedProfessional);
      setBookingModal({ open: false, service: null, step: 1 });
      setSelectedProfessional('');
      setSelectedTime('');
    } else {
      alert("Por favor, selecione um horário.");
    }
  };

  const getAvailableHours = () => {
    const startHour = settings?.businessHours?.start || "08:00";
    const endHour = settings?.businessHours?.end || "19:00";

    return hours.filter(hour => {
      if (hour < startHour || hour >= endHour) return false;
      const isOccupied = bookings.some(b => 
        b.teamMemberId === selectedProfessional && 
        b.dateTime === `${selectedDate} ${hour}` &&
        b.status !== 'cancelled'
      );
      return !isOccupied;
    });
  };

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá! Me chamo ${formData.name}. ${formData.message}`;
    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const availableProfessionals = bookingModal.service 
    ? settings.teamMembers.filter(m => m.assignedServiceIds.includes(bookingModal.service!.id))
    : [];

  return (
    <div className="animate-fade-in bg-white text-gray-900">
      {/* Hero - Fundo Verde Folha (tea-900) e Conteúdo Elevado */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center force-brand-bg bg-tea-900 overflow-hidden px-4">
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center -mt-24 md:-mt-36">
          
          {/* Logotipo Centralizado */}
          <div className="mb-6 md:mb-10">
            <img 
              src={settings.logo} 
              className="h-[12rem] md:h-[22rem] lg:h-[32rem] w-auto drop-shadow-[0_45px_100px_rgba(0,0,0,0.6)] object-contain animate-float" 
              alt="Logo Studio Moriá" 
            />
          </div>

          {/* Slogan Elevado */}
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-serif text-white mb-10 italic tracking-tight leading-tight max-w-4xl mx-auto px-4">
              Cuidando do seu bem estar
            </h2>

            {/* Tríade de Botões - Sempre um abaixo do outro (Stack Vertical) */}
            <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
              {/* Botão 1: Ver Serviços */}
              <button 
                onClick={() => scrollToId('procedimentos')} 
                className="w-full bg-white text-tea-900 px-8 py-5 rounded-full font-bold shadow-2xl uppercase tracking-widest hover:scale-105 hover:bg-tea-50 transition-all text-[11px]"
              >
                Ver Serviços
              </button>
              
              {/* Botão 2: Agendar Agora */}
              <button 
                onClick={() => currentUser ? scrollToId('procedimentos') : onAuthClick()} 
                className="w-full bg-tea-800 text-white border-2 border-tea-700 px-8 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-tea-950 transition-all text-[11px] shadow-xl"
              >
                Agendar Agora
              </button>

              {/* Botão 3: Fale Conosco */}
              <button 
                onClick={() => scrollToId('contato')} 
                className="w-full border-2 border-white/30 text-white px-8 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-[11px]"
              >
                Fale Conosco
              </button>
            </div>
          </div>
        </div>
        
        {/* Background Decorativo - Listras */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
        </div>
      </section>

      {/* Seção de Serviços */}
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
              <button onClick={() => { if(!currentUser) onAuthClick(); else setBookingModal({open: true, service, step: 1}); }} className="w-full py-4 rounded-xl border border-tea-100 text-tea-700 font-bold uppercase tracking-widest text-xs hover:bg-tea-800 hover:text-white transition-all">Agendar Horário</button>
            </div>
          ))}
        </div>
      </section>

      {/* Seção Fale Conosco */}
      <section id="contato" className="bg-tea-50 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-tea-900 mb-4">Fale Conosco</h2>
            <p className="text-gray-500 italic">Dúvidas ou agendamentos especiais? Nossa equipe está pronta para te ouvir.</p>
          </div>
          
          <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl border border-white">
            <form onSubmit={handleContactSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Seu nome"
                    className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-transparent focus:bg-white focus:border-tea-200 outline-none transition-all shadow-inner"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="(00) 00000-0000"
                    className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-transparent focus:bg-white focus:border-tea-200 outline-none transition-all shadow-inner"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-tea-700 uppercase tracking-[0.2em] ml-2">Como podemos ajudar?</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Escreva sua mensagem aqui..."
                  className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-transparent focus:bg-white focus:border-tea-200 outline-none transition-all shadow-inner resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                ></textarea>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-tea-800 text-white py-6 rounded-3xl font-bold text-xl hover:bg-tea-950 transition-all shadow-xl shadow-tea-100 flex items-center justify-center gap-4"
              >
                <span>Enviar Mensagem via WhatsApp</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.041-.534c1.019.568 2.126.966 3.283.967 3.18 0 5.767-2.587 5.768-5.766.001-3.18-2.586-5.767-5.766-5.767zm3.336 8.3c-.145.412-.731.762-1.209.809-.434.043-.913.064-2.142-.444-1.648-.678-2.675-2.333-2.756-2.44-.083-.109-.667-.883-.667-1.685 0-.802.417-1.196.565-1.353.148-.155.32-.234.426-.234.106 0 .214.002.307.006.097.004.227-.037.355.271.132.318.453 1.102.492 1.182.04.081.066.175.012.285-.054.11-.082.179-.163.272-.081.094-.171.21-.244.281-.082.079-.168.165-.072.331.097.166.428.705.918 1.141.63.562 1.16.736 1.326.821.166.086.264.072.361-.039.097-.11.417-.484.529-.648.112-.165.223-.138.377-.081.155.056.979.462 1.148.546.17.085.283.126.324.198.041.071.041.412-.104.825z"/></svg>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Modal Agendamento */}
      {bookingModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-900 mb-4">{bookingModal.step === 1 ? 'Quem irá te atender?' : 'Escolha o melhor horário'}</h3>
            {bookingModal.step === 1 ? (
              <div className="space-y-4 mb-8">
                {availableProfessionals.map(pro => (
                  <button key={pro.id} onClick={() => { setSelectedProfessional(pro.id); setBookingModal({...bookingModal, step: 2}); }} className="w-full p-5 rounded-2xl border-2 border-gray-50 bg-gray-50 hover:border-tea-200 transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-tea-800 flex items-center justify-center text-white font-bold">{pro.name.charAt(0)}</div>
                    <span className="font-bold text-tea-950">{pro.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 border-2 border-tea-50 rounded-xl outline-none" min={new Date().toISOString().split('T')[0]} />
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-50 rounded-xl">
                  {getAvailableHours().map(h => (
                    <button key={h} onClick={() => setSelectedTime(h)} className={`p-2 rounded-lg text-xs font-bold transition-all ${selectedTime === h ? 'bg-tea-800 text-white' : 'bg-tea-50 text-tea-700 hover:bg-tea-100'}`}>{h}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBookingModal({...bookingModal, step: 1})} className="flex-1 py-4 text-gray-400 font-bold">Voltar</button>
                  <button onClick={confirmBooking} disabled={!selectedTime} className="flex-[2] bg-tea-800 text-white py-4 rounded-xl font-bold shadow-xl">Confirmar Horário</button>
                </div>
              </div>
            )}
            <button onClick={() => setBookingModal({open: false, service: null, step: 1})} className="w-full mt-4 text-gray-400 text-sm font-bold">Fechar</button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CustomerHome;