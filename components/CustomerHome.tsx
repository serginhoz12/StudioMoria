
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
      <section className="relative min-h-[90vh] flex flex-col items-center justify-start bg-tea-900 overflow-hidden px-4 rounded-b-[3rem] md:rounded-b-[6rem]">
        {/* Decorative Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-tea-400/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center pt-2 md:pt-6">
          {/* Logotipo Estático e Maximizada */}
          <div className="mb-4 md:mb-8 flex justify-center w-full">
            <img 
              src={settings.logo} 
              className="w-full max-w-[320px] sm:max-w-[450px] md:max-w-[650px] lg:max-w-[850px] h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] object-contain" 
              alt="Logo Studio Moriá" 
            />
          </div>
          
          <div className="text-center w-full max-w-md mx-auto space-y-3">
            {/* Botões Principais no Topo (Zero Scroll) */}
            <div className="flex flex-col gap-3 px-4">
              <button 
                onClick={() => scrollToId('procedimentos')} 
                className="w-full bg-white text-tea-900 py-4 rounded-full font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-50 transition-all active:scale-95"
              >
                Ver serviços
              </button>
              <button 
                onClick={onAuthClick} 
                className="w-full bg-tea-800 text-white border border-white/10 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-950 transition-all shadow-xl active:scale-95"
              >
                Agendar agora
              </button>
              <button 
                onClick={() => scrollToId('contato')}
                className="w-full bg-transparent text-white/90 border border-white/20 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-white/5 transition-all active:scale-95"
              >
                Fale conosco
              </button>
            </div>

            {/* Endereço em destaque logo abaixo dos botões principais */}
            <div className="mt-8 px-6 animate-slide-up">
              <div className="inline-flex items-center gap-2 text-white/90 font-medium leading-relaxed max-w-[360px] mx-auto">
                <span className="text-lg">📍</span>
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em]">
                  {settings.address || "Rua Santa Monica, Sítio Novo - Cubatão SP, próximo ao material de construção do Fabio"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="procedimentos" className="max-w-7xl mx-auto px-6 py-16 md:py-32">
        <div className="text-center mb-12 md:mb-20">
          <p className="text-tea-600 font-bold text-[9px] uppercase tracking-[0.4em] mb-2">Excelência Moriá</p>
          <h2 className="text-3xl md:text-5xl font-serif text-gray-900 italic">Procedimentos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {services.filter(s => s.isVisible).map(service => (
            <div key={service.id} className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 hover:border-tea-100 transition-all group shadow-sm">
              <h3 className="text-xl md:text-2xl font-serif font-bold text-tea-950 mb-3">{service.name}</h3>
              <p className="text-gray-400 text-xs md:text-sm font-light mb-8 leading-relaxed line-clamp-3">{service.description}</p>
              <div className="mb-8">
                {currentUser ? (
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">a partir de</span>
                    <p className="text-tea-800 font-bold text-xl md:text-2xl">R$ {service.price.toFixed(2)}</p>
                  </div>
                ) : (
                  <p className="text-tea-800/40 font-bold text-xs uppercase tracking-tight italic">Consulte após login</p>
                )}
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{service.duration} min</p>
              </div>
              <button 
                onClick={onAuthClick} 
                className="w-full py-4 rounded-2xl bg-tea-50 text-tea-800 font-bold uppercase tracking-widest text-[9px] hover:bg-tea-900 hover:text-white transition-all"
              >
                Agendar agora
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="localizacao" className="bg-gray-50 py-16 md:py-32 px-6 rounded-[3rem] md:rounded-[5rem]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 md:gap-20 items-center">
          <div className="flex-1 space-y-6 md:space-y-10 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-serif text-tea-950 italic">Localização</h2>
              <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto lg:mx-0 whitespace-pre-line">
                {settings.address}
              </p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-4 bg-tea-900 text-white px-10 md:px-12 py-4 md:py-6 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-black transition-all shadow-xl"
            >
              <span>Traçar rota pelo GPS</span>
              <span className="text-xl">📍</span>
            </a>
          </div>
          <div className="flex-1 w-full bg-white p-3 md:p-5 rounded-[2.5rem] md:rounded-[5rem] shadow-2xl border border-gray-100 h-[300px] md:h-[500px]">
            <iframe 
              src="https://maps.google.com/maps?q=-23.9004600,-46.4425140&hl=pt&z=15&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '2rem' }} 
              allowFullScreen={true} 
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>

      <section id="contato" className="py-16 md:py-32 px-6">
        <div className="max-w-4xl mx-auto bg-tea-900 rounded-[2.5rem] md:rounded-[5rem] p-8 md:p-24 text-center shadow-3xl relative overflow-hidden">
           <h2 className="text-3xl md:text-4xl font-serif text-white mb-8 md:mb-12 italic">Fale conosco</h2>
           <form onSubmit={handleContactSubmit} className="space-y-4 md:space-y-6 text-left relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <input required placeholder="Nome Completo" className="w-full px-6 md:px-8 py-4 md:py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="WhatsApp" className="w-full px-6 md:px-8 py-4 md:py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <textarea required rows={4} placeholder="Sua mensagem especial..." className="w-full px-6 md:px-8 py-4 md:py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-white text-tea-900 py-5 md:py-6 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-50 transition-all shadow-2xl">Enviar mensagem agora</button>
           </form>
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
