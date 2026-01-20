
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

const CustomerHome: React.FC<CustomerHomeProps> = ({ settings, services, onAuthClick, onAddToWaitlist, currentUser }) => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [waitlistModal, setWaitlistModal] = useState<{ open: boolean, service: Service | null }>({ open: false, service: null });
  
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const regularServices = useMemo(() => services.filter(s => s.isVisible), [services]);

  const handleContactSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const message = `Olá Moriá! Me chamo ${formData.name || 'uma cliente'} e gostaria de tirar uma dúvida sobre os procedimentos do Studio.`;
    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleWaitlistClick = (service: Service) => {
    if (!currentUser) {
      onAuthClick();
      return;
    }
    setWaitlistModal({ open: true, service });
  };

  return (
    <div className="animate-fade-in bg-white text-gray-900">
      {/* Botão Flutuante WhatsApp */}
      <button 
        onClick={() => handleContactSubmit()}
        className="fixed bottom-8 right-8 z-[100] bg-tea-600 text-white p-4 rounded-full shadow-2xl hover:bg-tea-700 hover:scale-110 transition-all group"
      >
        <span className="text-2xl">📱</span>
        <span className="absolute right-full mr-4 bg-tea-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Fale com a Moriá</span>
      </button>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-start bg-tea-900 overflow-hidden px-4 rounded-b-[4rem] md:rounded-b-[10rem]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-tea-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center pt-10 md:pt-16 text-center">
          <div className="mb-8 md:mb-14 flex justify-center w-full">
            <img 
              src={settings.logo} 
              className="w-full max-w-[280px] sm:max-w-[420px] md:max-w-[580px] lg:max-w-[750px] h-auto drop-shadow-2xl object-contain" 
              alt="Logo Studio Moriá" 
            />
          </div>
          
          <div className="w-full max-w-md mx-auto space-y-6 px-6">
            <div className="flex flex-col gap-3">
              <button onClick={() => scrollToId('procedimentos')} className="w-full bg-white text-tea-900 py-5 rounded-3xl font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-tea-50 transition-all transform active:scale-95">Ver Nossos Serviços</button>
              <button onClick={() => scrollToId('contato')} className="w-full bg-tea-800 text-white border border-white/10 py-5 rounded-3xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-tea-950 transition-all shadow-xl">Fale com a Moriá</button>
              <button onClick={onAuthClick} className="w-full bg-transparent text-white/40 py-2 font-bold uppercase tracking-[0.2em] text-[9px] hover:text-white transition-all">Acessar Minha Conta</button>
            </div>
            
            <div className="pt-6 animate-slide-up">
              <div className="inline-flex items-center gap-3 text-white/90 font-medium px-8 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                <span className="text-xl">📍</span>
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
                  {settings.address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo Geral (Sem Preços para Público Geral) */}
      <section id="procedimentos" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16">
          <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em] mb-3">Estética Avançada</p>
          <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">{settings.servicesSectionTitle}</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {regularServices.map(service => (
            <div key={service.id} className="group bg-white p-10 rounded-[4rem] border border-gray-100 hover:border-tea-100 transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)] flex flex-col h-full relative">
              <div className="mb-8">
                <h3 className="text-2xl font-serif font-bold text-tea-950 mb-3 group-hover:text-tea-800 transition-colors">{service.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
              </div>
              <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                <div>
                   <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest mb-1">Status</p>
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor sob consulta</span>
                </div>
                <button onClick={() => handleWaitlistClick(service)} className="w-12 h-12 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center text-xl hover:bg-tea-900 hover:text-white transition-all shadow-sm">✨</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
           <p className="text-gray-400 text-sm italic">Para visualizar os valores e agendar sua sessão, acesse sua conta no Studio Moriá.</p>
        </div>
      </section>

      {/* Localização */}
      <section id="localizacao" className="bg-gray-50 py-24 md:py-32 px-6 rounded-[5rem] md:rounded-[10rem] mx-4 md:mx-12 my-12 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 md:gap-24 items-center">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em]">Studio Moriá</p>
              <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Localização</h2>
              <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                {settings.address}
              </p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-6 bg-tea-900 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-2xl"
            >
              <span>Traçar Rota no Mapa</span>
              <span className="text-2xl">🌍</span>
            </a>
          </div>
          <div className="flex-1 w-full bg-white p-5 rounded-[4rem] md:rounded-[6rem] shadow-3xl border border-gray-100 h-[350px] md:h-[500px]">
            <iframe 
              src="https://maps.google.com/maps?q=-23.9004600,-46.4425140&hl=pt&z=15&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '3rem' }} 
              allowFullScreen={true} 
              loading="lazy"
              title="Localização Studio Moriá"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Fale com a Moriá */}
      <section id="contato" className="py-24 md:py-40 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-6">
            <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em]">Atendimento</p>
            <h2 className="text-4xl md:text-6xl font-serif text-tea-950 italic">Fale com a Moriá</h2>
            <p className="text-gray-500 font-light text-lg md:text-xl max-w-lg mx-auto">Tire suas dúvidas ou solicite um procedimento personalizado pelo WhatsApp.</p>
          </div>
          
          <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto bg-white p-12 md:p-20 rounded-[4rem] md:rounded-[6rem] shadow-[0_50px_100px_rgba(0,0,0,0.06)] border border-tea-50 space-y-8 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-tea-900 rounded-3xl flex items-center justify-center text-3xl shadow-2xl">👩‍🎨</div>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Seu Nome" 
                required 
                className="w-full p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-tea-100 outline-none font-medium shadow-inner"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <textarea 
                placeholder="Sua mensagem..." 
                required 
                className="w-full p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-tea-100 outline-none h-40 font-medium shadow-inner resize-none"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-tea-900 text-white py-6 rounded-3xl font-bold uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:bg-black transition-all"
            >
              Falar no WhatsApp
            </button>
          </form>
        </div>
      </section>

      {/* Waitlist Modal */}
      {waitlistModal.open && waitlistModal.service && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-3xl animate-slide-up space-y-8 text-center border border-tea-50">
            <div className="w-24 h-24 bg-tea-50 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">💎</div>
            <div>
               <h3 className="text-3xl font-serif text-tea-950 font-bold italic mb-3">{waitlistModal.service.name}</h3>
               <p className="text-sm text-gray-400 font-light leading-relaxed">Faça login para consultar valores e agendar sua sessão.</p>
            </div>
            <div className="flex flex-col gap-4 pt-4">
              <button onClick={() => { onAuthClick(); setWaitlistModal({ open: false, service: null }); }} className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase text-[11px] tracking-widest shadow-2xl">Acessar Minha Conta</button>
              <button onClick={() => setWaitlistModal({ open: false, service: null })} className="w-full py-4 text-gray-300 font-bold uppercase text-[10px] tracking-widest">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerHome;
