
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
      <section className="relative min-h-[95vh] flex flex-col items-center justify-start bg-tea-900 overflow-hidden px-4 rounded-b-[4rem]">
        {/* Background Decorative Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] bg-tea-400/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center pt-4 md:pt-10">
          {/* Logotipo Estático e Escalonado para Mobile */}
          <div className="mb-4 md:mb-12 flex justify-center w-full">
            <img 
              src={settings.logo} 
              className="w-full max-w-[280px] sm:max-w-[400px] md:max-w-[600px] lg:max-w-[800px] h-auto drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] object-contain" 
              alt="Logo Studio Moriá" 
            />
          </div>
          
          <div className="text-center w-full max-w-md mx-auto space-y-4 md:space-y-8">
            {/* Botões restaurados e posicionados para cima */}
            <div className="flex flex-col gap-3 md:gap-4 px-4">
              <button 
                onClick={() => scrollToId('procedimentos')} 
                className="w-full bg-white text-tea-900 py-4 md:py-5 rounded-full font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-50 transition-all active:scale-95"
              >
                Ver serviços
              </button>
              <button 
                onClick={onAuthClick} 
                className="w-full bg-tea-800 text-white border border-white/10 py-4 md:py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-950 transition-all shadow-xl active:scale-95"
              >
                Agendar agora
              </button>
              <button 
                onClick={() => scrollToId('contato')}
                className="w-full bg-transparent text-white/80 border border-white/20 py-4 md:py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-white/5 transition-all active:scale-95"
              >
                Fale conosco
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Indicator - Lower Opacity */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-10 hidden md:block">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </section>

      <section id="procedimentos" className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center mb-16">
          <p className="text-tea-600 font-bold text-[9px] uppercase tracking-[0.4em] mb-3">Studio Moriá</p>
          <h2 className="text-4xl md:text-5xl font-serif text-gray-900 italic">Procedimentos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {services.filter(s => s.isVisible).map(service => (
            <div key={service.id} className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 hover:border-tea-100 transition-all group relative overflow-hidden shadow-sm">
              <h3 className="text-xl md:text-2xl font-serif font-bold text-tea-950 mb-3">{service.name}</h3>
              <p className="text-gray-400 text-xs md:text-sm font-light mb-8 leading-relaxed line-clamp-2">{service.description}</p>
              <div className="mb-8">
                <p className="text-tea-800 font-bold text-xl md:text-2xl">R$ {service.price.toFixed(2)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{service.duration} min</p>
              </div>
              <button 
                onClick={onAuthClick} 
                className="w-full py-4 rounded-2xl bg-tea-50 text-tea-800 font-bold uppercase tracking-widest text-[9px] hover:bg-tea-900 hover:text-white transition-all shadow-sm"
              >
                Agendar agora
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="localizacao" className="bg-gray-50 py-20 md:py-32 px-6 rounded-[3rem] md:rounded-[5rem]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 md:gap-20 items-center">
          <div className="flex-1 space-y-6 md:space-y-10 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Onde estamos</h2>
              <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                {settings.address}
              </p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-4 bg-tea-900 text-white px-10 md:px-12 py-5 md:py-6 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-black transition-all shadow-2xl"
            >
              <span>Abrir no Maps</span>
              <span className="text-xl">📍</span>
            </a>
          </div>
          <div className="flex-1 w-full bg-white p-4 rounded-[3rem] md:rounded-[5rem] shadow-2xl border border-gray-100 h-[350px] md:h-[500px]">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.409384784747!2d-46.3989182!3d-23.9813872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce197f884f856f%3A0x6d1f93f77341e978!2sR.%20Frei%20Gaspar%2C%203033%20-%20Cidade%20N%C3%A1utica%2C%20S%C3%A3o%20Vicente%20-%20SP%2C%2011355-000!5e0!3m2!1spt-BR!2sbr!4v1741100000000!5m2!1spt-BR!2sbr" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '2.5rem md:4rem' }} 
              allowFullScreen={true} 
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>

      <section id="contato" className="py-20 md:py-32 px-6">
        <div className="max-w-4xl mx-auto bg-tea-900 rounded-[3rem] md:rounded-[5rem] p-8 md:p-24 text-center shadow-3xl relative overflow-hidden">
           <h2 className="text-3xl md:text-4xl font-serif text-white mb-8 md:mb-12 italic">Fale conosco</h2>
           <form onSubmit={handleContactSubmit} className="space-y-4 md:space-y-6 text-left relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <input required placeholder="Nome Completo" className="w-full px-6 md:px-8 py-4 md:py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="WhatsApp" className="w-full px-6 md:px-8 py-4 md:py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <textarea required rows={4} placeholder="Como podemos te ajudar?" className="w-full px-6 md:px-8 py-4 md:py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-white text-tea-900 py-5 md:py-6 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-tea-50 transition-all shadow-2xl">Enviar mensagem agora</button>
           </form>
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
