
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
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-tea-900 overflow-hidden px-4 rounded-b-[5rem]">
        {/* Background Decorative Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-tea-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center pt-10">
          <div className="mb-12 relative">
            {/* Logo com escala aumentada e sombra luxuosa */}
            <img 
              src={settings.logo} 
              className="h-72 sm:h-96 md:h-[30rem] lg:h-[34rem] w-auto drop-shadow-[0_35px_60px_rgba(0,0,0,0.5)] animate-float object-contain" 
              alt="Logo Studio Moriá" 
            />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/20 blur-xl rounded-full"></div>
          </div>
          
          <div className="text-center space-y-10">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-4xl font-serif text-white/90 italic tracking-wide font-light">
                {settings.name}
              </h2>
              <div className="h-px w-16 bg-white/20 mx-auto"></div>
              <p className="text-sm md:text-lg text-white/60 font-light tracking-[0.2em] uppercase">
                Cuidando do seu bem estar
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <button 
                onClick={() => scrollToId('procedimentos')} 
                className="w-full sm:w-auto bg-white text-tea-900 px-12 py-5 rounded-full font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-tea-50 hover:scale-105 active:scale-95 transition-all"
              >
                Ver Serviços
              </button>
              <button 
                onClick={onAuthClick} 
                className="w-full sm:w-auto bg-tea-800 text-white border-2 border-white/10 px-12 py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-tea-950 hover:border-white/30 transition-all shadow-xl"
              >
                Agendar Agora
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </section>

      <section id="procedimentos" className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-4">Experiência Única</p>
          <h2 className="text-5xl font-serif text-gray-900 italic">Procedimentos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.filter(s => s.isVisible).map(service => (
            <div key={service.id} className="bg-white p-10 rounded-[4rem] border border-gray-100 hover:border-tea-100 hover:shadow-2xl hover:shadow-tea-900/5 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-tea-50 rounded-bl-[4rem] -mr-10 -mt-10 group-hover:bg-tea-100 transition-colors"></div>
              <h3 className="text-2xl font-serif font-bold text-tea-950 mb-4 relative z-10">{service.name}</h3>
              <p className="text-gray-400 text-sm font-light mb-10 leading-relaxed line-clamp-3">{service.description}</p>
              <div className="mb-10">
                <p className="text-tea-800 font-bold text-2xl">R$ {service.price.toFixed(2)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-2 tracking-widest">Tempo estimado: {service.duration} min</p>
              </div>
              <button 
                onClick={onAuthClick} 
                className="w-full py-5 rounded-3xl bg-tea-50 text-tea-800 font-bold uppercase tracking-widest text-[10px] hover:bg-tea-900 hover:text-white transition-all shadow-sm"
              >
                Ver Disponibilidade
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="localizacao" className="bg-gray-50 py-32 px-6 rounded-[5rem]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
          <div className="flex-1 space-y-10">
            <div className="space-y-4">
              <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.4em]">Localização</p>
              <h2 className="text-5xl font-serif text-tea-950 italic">Onde estamos</h2>
              <p className="text-gray-500 text-xl font-light leading-relaxed">
                {settings.address}
              </p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-4 bg-tea-900 text-white px-12 py-6 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-2xl"
            >
              <span>Abrir no Google Maps</span>
              <span className="text-xl">📍</span>
            </a>
          </div>
          <div className="flex-1 w-full bg-white p-5 rounded-[5rem] shadow-2xl border border-gray-100 h-[500px]">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.409384784747!2d-46.3989182!3d-23.9813872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce197f884f856f%3A0x6d1f93f77341e978!2sR.%20Frei%20Gaspar%2C%203033%20-%20Cidade%20N%C3%A1utica%2C%20S%C3%A3o%20Vicente%20-%20SP%2C%2011355-000!5e0!3m2!1spt-BR!2sbr!4v1741100000000!5m2!1spt-BR!2sbr" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '4rem' }} 
              allowFullScreen={true} 
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>

      <section id="contato" className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-tea-900 rounded-[5rem] p-12 md:p-24 text-center shadow-3xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <h2 className="text-4xl font-serif text-white mb-12 italic">Fale com Moriá</h2>
           <form onSubmit={handleContactSubmit} className="space-y-6 text-left relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required placeholder="Nome Completo" className="w-full px-8 py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 focus:border-white/40 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="WhatsApp" className="w-full px-8 py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 focus:border-white/40 transition-all" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <textarea required rows={4} placeholder="Sua dúvida ou mensagem especial..." className="w-full px-8 py-5 rounded-3xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:bg-white/20 focus:border-white/40 transition-all resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-white text-tea-900 py-6 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-xs hover:bg-tea-50 transition-all shadow-2xl">Enviar Mensagem via WhatsApp</button>
           </form>
        </div>
      </section>

      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default CustomerHome;
