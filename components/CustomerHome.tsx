
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
  const [bookingModal, setBookingModal] = useState<{ open: boolean; service: Service | null; step: 1 | 2 | 3 }>({ open: false, service: null, step: 1 });
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, name: currentUser.name, whatsapp: currentUser.whatsapp }));
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
      setBookingModal({ ...bookingModal, step: 3 });
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
    if (element) element.scrollIntoView({ behavior: 'smooth' });
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
              <button onClick={() => scrollToId('contato')} className="w-full border-2 border-white/30 text-white px-8 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-[11px]">Fale Conosco</button>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      </section>

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
              <button onClick={() => { if(!currentUser) onAuthClick(); else setBookingModal({open: true, service, step: 1}); }} className="w-full py-4 rounded-xl border border-tea-100 text-tea-700 font-bold uppercase tracking-widest text-xs hover:bg-tea-800 hover:text-white transition-all">Solicitar Horário</button>
            </div>
          ))}
        </div>
      </section>

      <section id="contato" className="bg-tea-50 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
           <h2 className="text-4xl font-serif text-tea-900 mb-4">Fale Conosco</h2>
           <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl border border-white mt-10">
            <form onSubmit={handleContactSubmit} className="space-y-8 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input required placeholder="Seu nome" className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-none outline-none shadow-inner" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="(00) 00000-0000" className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-none outline-none shadow-inner" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <textarea required rows={4} placeholder="Sua mensagem..." className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-none outline-none shadow-inner resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-tea-800 text-white py-6 rounded-3xl font-bold text-xl shadow-xl flex items-center justify-center gap-4">Enviar Mensagem WhatsApp</button>
            </form>
           </div>
        </div>
      </section>

      {bookingModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl animate-slide-up">
            {bookingModal.step !== 3 && <h3 className="text-2xl font-serif text-tea-900 mb-4">{bookingModal.step === 1 ? 'Quem irá te atender?' : 'Escolha o melhor horário'}</h3>}
            
            {bookingModal.step === 1 && (
              <div className="space-y-4 mb-8">
                {availableProfessionals.map(pro => (
                  <button key={pro.id} onClick={() => { setSelectedProfessional(pro.id); setBookingModal({...bookingModal, step: 2}); }} className="w-full p-5 rounded-2xl border-2 border-gray-50 bg-gray-50 hover:border-tea-200 transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-tea-800 flex items-center justify-center text-white font-bold">{pro.name.charAt(0)}</div>
                    <span className="font-bold text-tea-950">{pro.name}</span>
                  </button>
                ))}
              </div>
            )}

            {bookingModal.step === 2 && (
              <div className="space-y-6">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 border-2 border-tea-50 rounded-xl outline-none" min={new Date().toISOString().split('T')[0]} />
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-50 rounded-xl">
                  {getAvailableHours().map(h => (
                    <button key={h} onClick={() => setSelectedTime(h)} className={`p-2 rounded-lg text-xs font-bold transition-all ${selectedTime === h ? 'bg-tea-800 text-white' : 'bg-tea-50 text-tea-700 hover:bg-tea-100'}`}>{h}</button>
                  ))}
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-4">
                  <p className="text-[10px] text-orange-700 font-bold uppercase tracking-widest mb-1">⚠️ Aviso de Garantia</p>
                  <p className="text-[11px] text-orange-800 leading-relaxed font-medium">Sua vaga só será confirmada após o pagamento do sinal de garantia. Nossa equipe analisará seu pedido.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBookingModal({...bookingModal, step: 1})} className="flex-1 py-4 text-gray-400 font-bold">Voltar</button>
                  <button onClick={confirmBooking} disabled={!selectedTime} className="flex-[2] bg-tea-800 text-white py-4 rounded-xl font-bold shadow-xl">Solicitar Horário</button>
                </div>
              </div>
            )}

            {bookingModal.step === 3 && (
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-tea-50 text-tea-600 rounded-full flex items-center justify-center text-4xl mx-auto">⏳</div>
                <h3 className="text-2xl font-serif text-tea-900 font-bold">Pedido Enviado!</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Seu horário para <b>{bookingModal.service?.name}</b> está aguardando confirmação. <br/><br/> Para agilizar, clique no botão abaixo e envie o <b>comprovante do sinal</b> via WhatsApp.</p>
                <button 
                  onClick={() => {
                    const msg = `Olá Studio Moriá! Solicitei um horário para ${bookingModal.service?.name} em ${selectedDate} às ${selectedTime}. Segue o comprovante do sinal de garantia.`;
                    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    setBookingModal({open: false, service: null, step: 1});
                  }}
                  className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold shadow-lg hover:bg-tea-950 transition-all flex items-center justify-center gap-3"
                >
                  Enviar Comprovante do Sinal 📱
                </button>
                <button onClick={() => setBookingModal({open: false, service: null, step: 1})} className="text-xs text-gray-400 font-bold uppercase tracking-widest">Fechar e pagar depois</button>
              </div>
            )}
            
            {bookingModal.step !== 3 && <button onClick={() => setBookingModal({open: false, service: null, step: 1})} className="w-full mt-4 text-gray-400 text-sm font-bold">Cancelar</button>}
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
