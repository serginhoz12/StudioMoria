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

const CustomerHome: React.FC<CustomerHomeProps> = ({ settings, services, onAuthClick, currentUser }) => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<Service | null>(null);
  
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const regularServices = useMemo(() => services.filter(s => s.isVisible), [services]);

  const handleContactSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const message = `Olá Moriá! Me chamo ${formData.name || 'uma cliente'} e gostaria de saber mais sobre o Studio.`;
    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Limpa o endereço apenas para a exibição na home
  const displayAddress = useMemo(() => {
    return (settings.address || "").replace(', próximo ao material de construção do Fabio', '');
  }, [settings.address]);

  return (
    <div className="animate-fade-in bg-white text-gray-900">
      {/* Botão Flutuante WhatsApp */}
      <button 
        onClick={() => handleContactSubmit()}
        className="fixed bottom-6 right-6 z-[100] bg-tea-600 text-white p-4 rounded-full shadow-2xl hover:bg-tea-700 hover:scale-110 transition-all group"
      >
        <span className="text-2xl">📱</span>
        <span className="absolute right-full mr-4 bg-tea-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Fale com a Moriá</span>
      </button>

      {/* Hero Section - Compactação máxima para 6.7" */}
      <section className="relative min-h-[95vh] md:min-h-[85vh] flex flex-col items-center justify-start bg-tea-900 overflow-hidden px-4 rounded-b-[4rem] md:rounded-b-[10rem] pt-0 md:pt-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[35vh] bg-tea-400/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center text-center">
          
          {/* Aviso de Retorno - Colado no topo no mobile */}
          <div className="mt-4 mb-1 animate-pulse">
            <span className="bg-orange-50/5 backdrop-blur-md text-orange-200 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border border-orange-200/5">
              ✨ RETORNAREMOS EM BREVE
            </span>
          </div>

          {/* Logotipo - TAMANHO GIGANTE E SCALE 125 NO MOBILE */}
          <div className="mb-1 md:mb-4 flex justify-center w-full transform scale-125 md:scale-105 transition-transform duration-1000 origin-center">
            <img 
              src={settings.logo} 
              className="w-full max-w-[420px] sm:max-w-[520px] md:max-w-[720px] h-auto drop-shadow-[0_25px_60px_rgba(0,0,0,0.6)] object-contain animate-slide-up" 
              alt="Logo Studio Moriá" 
            />
          </div>

          {/* Chamada Atrativa - Transparente e colada ao logo */}
          <div className="max-w-lg mx-auto mb-4 px-6 py-2 bg-transparent">
            <p className="text-white/80 font-serif italic text-base md:text-lg leading-tight font-medium tracking-tight">
              Cadastre-se, selecione o serviço e entre na lista de espera.
            </p>
          </div>
          
          {/* Botões - Aumentados para preencher largura (max-w-md) */}
          <div className="w-full max-w-md mx-auto space-y-2.5 px-6 animate-slide-up pb-6">
            <div className="flex flex-col gap-2">
              <button onClick={() => scrollToId('procedimentos')} className="w-full bg-white text-tea-900 py-5 rounded-2xl font-bold shadow-xl uppercase tracking-[0.2em] text-[10px] hover:bg-tea-50 transition-all transform active:scale-95">Ver Nossos Serviços</button>
              <button onClick={() => scrollToId('contato')} className="w-full bg-tea-800 text-white border border-white/5 py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-tea-950 transition-all shadow-lg">Fale com a Moriá</button>
              <button onClick={onAuthClick} className="w-full bg-transparent text-white/30 py-1 font-bold uppercase tracking-[0.2em] text-[8px] hover:text-white transition-all">Acessar Minha Conta</button>
            </div>
            
            <div className="pt-0">
              <div className="inline-flex items-center gap-2.5 text-white/60 font-medium px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                <span className="text-sm">📍</span>
                <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] leading-tight">
                  {displayAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo Geral */}
      <section id="procedimentos" className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center mb-14">
          <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em] mb-3">Estética Studio Moriá</p>
          <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">{settings.servicesSectionTitle}</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularServices.map(service => (
            <div 
              key={service.id} 
              onClick={() => setSelectedServiceDetail(service)}
              className="group bg-white p-10 rounded-[4rem] border border-gray-100 hover:border-tea-100 transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)] flex flex-col h-full relative cursor-pointer"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-serif font-bold text-tea-950 mb-3 group-hover:text-tea-800 transition-colors">{service.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 italic">
                  {service.description}
                </p>
                <span className="text-[9px] text-tea-600 font-bold uppercase tracking-widest mt-4 block">Toque para ver detalhes</span>
              </div>
              <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                <div>
                   <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mb-1">Cuidado Moriá</p>
                   <span className="text-xs font-bold text-tea-800 uppercase tracking-widest">Ver Detalhes</span>
                </div>
                <div className="w-12 h-12 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center text-xl group-hover:bg-tea-900 group-hover:text-white transition-all shadow-sm">✨</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Localização */}
      <section id="localizacao" className="bg-gray-50 py-20 md:py-32 px-6 rounded-[5rem] md:rounded-[10rem] mx-4 md:mx-12 my-12 overflow-hidden relative border border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 md:gap-24 items-center">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em]">Onde Nos Encontrar</p>
              <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Localização</h2>
              <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                {displayAddress}
              </p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-6 bg-tea-900 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-2xl"
            >
              <span>Abrir Mapa</span>
              <span className="text-2xl">🌍</span>
            </a>
          </div>
          <div className="flex-1 w-full bg-white p-4 rounded-[4rem] md:rounded-[6rem] shadow-3xl border border-gray-100 h-[320px] md:h-[500px]">
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

      {/* Contato */}
      <section id="contato" className="py-20 md:py-40 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-serif text-tea-950 italic">Fale com a Moriá</h2>
            <p className="text-gray-500 font-light text-lg md:text-xl">Estamos prontas para cuidar da sua melhor versão.</p>
          </div>
          
          <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto bg-white p-10 md:p-20 rounded-[4rem] md:rounded-[6rem] shadow-[0_50px_100px_rgba(0,0,0,0.06)] border border-tea-50 space-y-8 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-tea-900 rounded-3xl flex items-center justify-center text-3xl shadow-2xl">🌿</div>
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
                placeholder="Como podemos te ajudar?" 
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
              Enviar via WhatsApp
            </button>
          </form>
        </div>
      </section>

      {/* Modal de Detalhes do Serviço */}
      {selectedServiceDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-tea-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-3xl animate-slide-up flex flex-col border border-tea-50 max-h-[90vh]">
            <div className="p-10 md:p-14 overflow-y-auto custom-scroll space-y-8">
              <div className="flex justify-between items-start">
                 <div className="space-y-2">
                    <span className="bg-tea-50 text-tea-700 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block border border-tea-100">Procedimento Studio Moriá</span>
                    <h3 className="text-3xl md:text-4xl font-serif text-tea-950 font-bold italic leading-tight">{selectedServiceDetail.name}</h3>
                 </div>
                 <button onClick={() => setSelectedServiceDetail(null)} className="p-4 hover:bg-tea-50 rounded-2xl transition-all text-gray-300 hover:text-tea-900">✕</button>
              </div>
              
              <div className="space-y-4">
                 <h4 className="text-[11px] font-bold text-tea-900 uppercase tracking-widest border-b border-gray-100 pb-2">Sobre este cuidado</h4>
                 <p className="text-gray-600 text-lg font-light leading-relaxed whitespace-pre-line">
                   {selectedServiceDetail.description}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6">
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duração Média</p>
                    <p className="text-xl font-serif text-tea-900 font-bold italic">{selectedServiceDetail.duration} min</p>
                 </div>
                 <div className="p-6 bg-tea-900 rounded-3xl text-white">
                    <p className="text-[9px] font-bold text-tea-300 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold uppercase tracking-widest">Pré-Lançamento</p>
                 </div>
              </div>
            </div>
            
            <div className="p-10 bg-gray-50 border-t border-gray-100 space-y-4">
               <button 
                 onClick={() => { onAuthClick(); setSelectedServiceDetail(null); }} 
                 className="w-full py-6 bg-tea-950 text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all"
               >
                 Acessar & Entrar na Lista
               </button>
               <button 
                 onClick={() => setSelectedServiceDetail(null)} 
                 className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest"
               >
                 Voltar para o Menu
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerHome;