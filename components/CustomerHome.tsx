
import React, { useState } from 'react';
import { SalonSettings, Service, Customer, TeamMember } from '../types';

interface CustomerHomeProps {
  settings: SalonSettings;
  services: Service[];
  onBook: (serviceId: string, dateTime: string, teamMemberId?: string) => void;
  onRegisterClick: () => void;
  currentUser: Customer | null;
}

const CustomerHome: React.FC<CustomerHomeProps> = ({ settings, services, onBook, onRegisterClick, currentUser }) => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [bookingModal, setBookingModal] = useState<{ open: boolean; service: Service | null }>({ open: false, service: null });
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, whatsapp, message } = formData;
    if (!name || !whatsapp || !message) {
      alert("Por favor, preencha todos os campos para falar conosco.");
      return;
    }
    const text = `Olá Studio Moriá!\n\nVi no site e gostaria de informações:\n\n*Nome:* ${name}\n*WhatsApp:* ${whatsapp}\n*Dúvida:* ${message}`;
    const encodedText = encodeURIComponent(text);
    const waNumber = settings.socialLinks.whatsapp.replace(/\D/g, ''); 
    window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank');
  };

  const openBookingSelection = (service: Service) => {
    if (!currentUser) {
      onRegisterClick();
      return;
    }
    setBookingModal({ open: true, service });
  };

  const confirmBooking = () => {
    if (bookingModal.service && selectedProfessional) {
      onBook(bookingModal.service.id, new Date().toISOString(), selectedProfessional);
      setBookingModal({ open: false, service: null });
      setSelectedProfessional('');
    } else {
      alert("Por favor, selecione uma profissional para o atendimento.");
    }
  };

  const availableProfessionals = bookingModal.service 
    ? settings.teamMembers.filter(m => m.assignedServiceIds.includes(bookingModal.service!.id))
    : [];

  const visibleServices = services.filter(s => s.isVisible);

  return (
    <div className="animate-fade-in bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[75vh] flex flex-col items-center justify-center bg-[#23492d] overflow-hidden py-16 px-4">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>
        <div className="relative z-10 w-full max-w-4xl text-center flex flex-col items-center">
          <div className="mb-8 transform hover:scale-105 transition-transform duration-700 w-full max-w-[450px] md:max-w-[550px] flex justify-center items-center">
             <img src={settings.logo} alt="Studio Moriá Estética" className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]" crossOrigin="anonymous" />
          </div>
          <h2 className="text-2xl md:text-4xl font-serif text-white/90 mb-12 italic tracking-wide font-light">Cuidando do seu bem estar.</h2>
          <div className="flex flex-col sm:flex-row gap-6">
            {!currentUser ? (
              <button onClick={onRegisterClick} className="bg-white text-[#23492d] px-12 py-5 rounded-full font-bold text-lg hover:bg-tea-50 transition-all shadow-2xl hover:-translate-y-1 active:scale-95 uppercase tracking-widest">
                Ver Serviços e Preços
              </button>
            ) : (
              <div className="bg-white/10 backdrop-blur-md px-10 py-5 rounded-full border border-white/20 text-white font-medium text-lg">
                Bem-vinda, <span className="font-bold text-tea-200">{currentUser.name.split(' ')[0]}</span>!
              </div>
            )}
            <a href="#fale-conosco" className="bg-transparent border-2 border-white/30 text-white px-12 py-5 rounded-full font-bold text-lg hover:bg-white/10 transition-all uppercase tracking-widest text-center">Fale Conosco</a>
          </div>
        </div>
      </section>

      {/* Booking Selection Modal */}
      {bookingModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-900 mb-2">Selecione a Profissional</h3>
            <p className="text-gray-500 mb-8 font-light text-sm italic">Procedimento: <span className="font-bold text-tea-700 uppercase tracking-tighter">{bookingModal.service?.name}</span></p>
            
            <div className="space-y-4 mb-10">
              {availableProfessionals.length > 0 ? availableProfessionals.map(pro => (
                <button 
                  key={pro.id}
                  onClick={() => setSelectedProfessional(pro.id)}
                  className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${selectedProfessional === pro.id ? 'border-tea-600 bg-tea-50' : 'border-gray-50 hover:border-tea-100 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${selectedProfessional === pro.id ? 'bg-tea-600' : 'bg-gray-300'}`}>
                      {pro.name.charAt(0)}
                    </div>
                    <span className={`font-bold ${selectedProfessional === pro.id ? 'text-tea-900' : 'text-gray-600'}`}>{pro.name}</span>
                  </div>
                  {selectedProfessional === pro.id && <span className="text-tea-600">✓</span>}
                </button>
              )) : (
                <div className="p-8 text-center text-gray-400 italic bg-gray-50 rounded-2xl">
                  Nenhuma profissional cadastrada para este serviço no momento.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmBooking}
                disabled={!selectedProfessional}
                className="w-full bg-[#23492d] text-white py-5 rounded-2xl font-bold text-lg hover:bg-tea-900 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                Confirmar Agendamento
              </button>
              <button onClick={() => setBookingModal({ open: false, service: null })} className="w-full py-3 text-gray-400 text-sm font-bold hover:text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Services Section */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <span className="text-tea-600 font-bold tracking-[0.3em] uppercase text-xs block mb-4">{settings.servicesSectionTitle || "Especialidades"}</span>
          <h2 className="text-4xl md:text-5xl font-serif text-gray-900 mb-6">{settings.servicesSectionSubtitle || "Nossos Procedimentos"}</h2>
          <div className="h-1 w-24 bg-tea-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {visibleServices.map(service => (
            <div key={service.id} className="bg-gray-50 p-8 rounded-[2.5rem] border border-transparent hover:border-tea-100 hover:bg-white hover:shadow-2xl transition-all duration-500 group flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-serif font-bold text-gray-800 mb-4 group-hover:text-tea-700 transition-colors">{service.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 font-light">{service.description}</p>
                {currentUser && <p className="text-tea-700 font-bold text-xl mb-6">R$ {service.price.toFixed(2)}</p>}
              </div>
              <button onClick={() => openBookingSelection(service)} className="w-full py-4 rounded-2xl bg-white border border-tea-100 text-tea-700 font-bold text-sm hover:bg-tea-700 hover:text-white transition-all shadow-sm uppercase tracking-widest">
                Agendar Horário
              </button>
            </div>
          ))}
          {visibleServices.length === 0 && (
             <p className="col-span-full text-center py-12 text-gray-400 italic">No momento, não há procedimentos disponíveis para exibição pública.</p>
          )}
        </div>
      </section>

      {/* Fale Conosco Section */}
      <section id="fale-conosco" className="bg-[#23492d] py-24 relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-tea-900 rounded-full opacity-20"></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-2/5 bg-tea-50 p-12 flex flex-col justify-center text-center lg:text-left">
              <span className="text-tea-600 font-bold uppercase tracking-widest text-[10px] mb-4">Contato Direto</span>
              <h3 className="text-4xl font-serif text-tea-950 mb-8 leading-tight">Dúvidas? <br/>Fale agora conosco.</h3>
              <p className="text-gray-600 text-lg font-light leading-relaxed mb-10">Estamos prontas para cuidar de você. Envie sua mensagem agora.</p>
              <div className="space-y-6 inline-block mx-auto lg:mx-0">
                <div className="flex items-center gap-4 text-tea-900"><div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-tea-600">📍</div><span className="text-xs font-bold uppercase tracking-widest">Praia Grande - SP</span></div>
                <div className="flex items-center gap-4 text-tea-900"><div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-tea-600">📸</div><a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-widest hover:text-tea-600 transition-colors">@studio_moria_estetica</a></div>
              </div>
            </div>
            <div className="lg:w-3/5 p-12 md:p-16">
              <form onSubmit={handleContactSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Seu Nome</label>
                    <input required type="text" placeholder="Nome completo" className="w-full px-8 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800 shadow-inner" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input required type="tel" placeholder="(00) 00000-0000" className="w-full px-8 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800 shadow-inner" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Mensagem</label>
                  <textarea required placeholder="Como podemos te ajudar hoje?" className="w-full px-8 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800 h-40 resize-none shadow-inner" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-[#23492d] text-white py-6 rounded-2xl font-bold text-xl hover:bg-tea-900 transition-all shadow-2xl flex items-center justify-center gap-4 group uppercase tracking-widest">
                  FALAR NO WHATSAPP <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-50 py-16 text-center border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block p-4 mb-8">
            <img src={settings.logo} className="h-24 md:h-32 w-auto grayscale brightness-50 hover:grayscale-0 hover:brightness-100 transition-all cursor-pointer" alt="Footer Logo" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} />
          </div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em]">© 2024 Studio Moriá Estética • Beleza e Bem-Estar em Praia Grande</p>
        </div>
      </footer>
    </div>
  );
};

export default CustomerHome;
