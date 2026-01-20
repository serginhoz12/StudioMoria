
import React, { useState, useMemo } from 'react';
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

// Fixed missing default export and completed truncated component
const CustomerHome: React.FC<CustomerHomeProps> = ({ settings, services, onAuthClick, onAddToWaitlist, currentUser }) => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [waitlistModal, setWaitlistModal] = useState<{ open: boolean, service: Service | null }>({ open: false, service: null });
  
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const highlightedServices = useMemo(() => services.filter(s => s.isVisible && s.isHighlighted), [services]);
  const regularServices = useMemo(() => services.filter(s => s.isVisible && !s.isHighlighted), [services]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá! Me chamo ${formData.name}. ${formData.message}`;
    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleWaitlistClick = (service: Service) => {
    if (!currentUser) {
      onAuthClick();
      return;
    }
    setWaitlistModal({ open: true, service });
  };

  const confirmWaitlist = () => {
    if (waitlistModal.service) {
      onAddToWaitlist(waitlistModal.service.id, new Date().toISOString().split('T')[0]);
      setWaitlistModal({ open: false, service: null });
    }
  };

  return (
    <div className="animate-fade-in bg-white text-gray-900">
      <section className="relative min-h-[90vh] flex flex-col items-center justify-start bg-tea-900 overflow-hidden px-4 rounded-b-[3rem] md:rounded-b-[6rem]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-tea-400/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center pt-2 md:pt-6">
          <div className="mb-4 md:mb-8 flex justify-center w-full">
            <img 
              src={settings.logo} 
              className="w-full max-w-[320px] sm:max-w-[450px] md:max-w-[650px] lg:max-w-[850px] h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] object-contain" 
              alt="Logo Studio Moriá" 
            />
          </div>
          <div className="text-center w-full max-w-md mx-auto space-y-3">
            <div className="flex flex-col gap-3 px-4">
              <button onClick={() => scrollToId('procedimentos')} className="w-full bg-white text-tea-900 py-4 rounded-full font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-50 transition-all active:scale-95">Conheça nossos serviços</button>
              <button onClick={onAuthClick} className="w-full bg-tea-800 text-white border border-white/10 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-950 transition-all shadow-xl active:scale-95">Agende sua sessão</button>
              <button onClick={() => scrollToId('contato')} className="w-full bg-transparent text-white/90 border border-white/20 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-white/5 transition-all active:scale-95">Fale com a Moriá</button>
            </div>
            <div className="mt-8 px-6 animate-slide-up">
              <div className="inline-flex items-center gap-2 text-white/90 font-medium leading-relaxed max-w-[360px] mx-auto">
                <span className="text-lg">📍</span>
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em]">{settings.address}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Procedimentos em Destaque */}
      {highlightedServices.length > 0 && (
        <section id="destaques" className="max-w-7xl mx-auto px-6 pt-16 md:pt-32">
          <div className="text-center mb-12">
            <p className="text-orange-600 font-bold text-[9px] uppercase tracking-[0.4em] mb-2">Exclusividade</p>
            <h2 className="text-3xl md:text-5xl font-serif text-gray-900 italic">Destaques da Moriá ⭐</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {highlightedServices.map(service => (
              <div 
                key={service.id} 
                className="bg-tea-50/20 p-8 md:p-12 rounded-[4rem] border-2 border-orange-100 shadow-xl flex flex-col md:flex-row gap-8 items-center relative overflow-hidden group hover:border-orange-200 transition-all"
              >
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <span className="inline-block bg-orange-400 text-white px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest mb-2 shadow-sm">Mais Pedido ✨</span>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">{service.name}</h3>
                  <p className="text-gray-500 text-sm md:text-base leading-relaxed">{service.description}</p>
                  <div className="flex items-center justify-center md:justify-start gap-6 pt-4">
                    <div className="text-2xl font-serif font-bold text-tea-900 italic">R$ {service.price.toFixed(2)}</div>
                    <button onClick={onAuthClick} className="bg-tea-900 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all">Agendar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Serviços Regulares */}
      <section id="procedimentos" className="max-w-7xl mx-auto px-6 pt-16 md:pt-32">
        <div className="text-center mb-12">
          <p className="text-tea-600 font-bold text-[9px] uppercase tracking-[0.4em] mb-2">{settings.servicesSectionSubtitle}</p>
          <h2 className="text-3xl md:text-5xl font-serif text-gray-900 italic">{settings.servicesSectionTitle}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularServices.map(service => (
            <div key={service.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:border-tea-100 group">
              <h3 className="text-xl font-serif font-bold text-tea-950 mb-2">{service.name}</h3>
              <p className="text-gray-400 text-xs mb-6 line-clamp-2">{service.description}</p>
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                <span className="text-lg font-serif font-bold text-tea-900 italic">R$ {service.price.toFixed(2)}</span>
                <button onClick={() => handleWaitlistClick(service)} className="text-[9px] font-bold text-tea-600 uppercase tracking-widest hover:underline">Ver Detalhes</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="bg-tea-50 p-12 md:p-20 rounded-[4rem] border border-tea-100 shadow-inner">
          <h2 className="text-3xl md:text-4xl font-serif text-tea-950 mb-4 italic">Fale Conosco</h2>
          <p className="text-gray-500 mb-10 text-sm md:text-base">Dúvidas sobre procedimentos ou horários especiais? Nossa equipe está pronta para te atender via WhatsApp.</p>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Seu Nome" 
              required 
              className="w-full p-5 rounded-2xl border-none bg-white shadow-sm outline-none focus:ring-2 focus:ring-tea-200 transition-all font-medium"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <textarea 
              placeholder="Como podemos te ajudar?" 
              required 
              className="w-full p-5 rounded-2xl border-none bg-white shadow-sm outline-none focus:ring-2 focus:ring-tea-200 transition-all h-32 font-medium"
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
            />
            <button type="submit" className="w-full bg-tea-950 text-white py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-black transition-all">Enviar Mensagem</button>
          </form>
        </div>
      </section>

      {/* Waitlist Modal */}
      {waitlistModal.open && waitlistModal.service && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-6">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic text-center">{waitlistModal.service.name}</h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed">{waitlistModal.service.description}</p>
            <div className="bg-tea-50 p-6 rounded-2xl text-center">
               <p className="text-[10px] text-tea-700 font-bold uppercase tracking-widest mb-1">Duração Estimada</p>
               <p className="text-lg font-bold text-tea-900">{waitlistModal.service.duration} minutos</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setWaitlistModal({ open: false, service: null })} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Fechar</button>
              <button onClick={() => { onAuthClick(); setWaitlistModal({ open: false, service: null }); }} className="flex-[2] py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Agendar Agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerHome;
