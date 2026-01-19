
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

  const professionalsForService = useMemo(() => {
    if (!bookingModal.service) return [];
    return settings.teamMembers.filter(m => m.assignedServiceIds.includes(bookingModal.service!.id));
  }, [bookingModal.service, settings.teamMembers]);

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const slotsAvailability = useMemo(() => {
    if (!bookingModal.service) return {};
    const availability: Record<string, TeamMember[]> = {};
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const serviceDuration = bookingModal.service.duration;

    if (settings.agendaOpenUntil && selectedDate > settings.agendaOpenUntil) return {};

    allPossibleSlots.forEach(slot => {
      const slotStartMin = timeToMinutes(slot);
      const slotEndMin = slotStartMin + serviceDuration;
      const freePros = professionalsForService.filter(pro => {
        if (pro.offDays?.includes(dayOfWeek)) return false;
        const proStartMin = timeToMinutes(pro.businessHours?.start || settings.businessHours.start);
        const proEndMin = timeToMinutes(pro.businessHours?.end || settings.businessHours.end);
        if (slotStartMin < proStartMin || slotEndMin > proEndMin) return false;
        const hasConflict = bookings.some(b => {
          if (b.teamMemberId !== pro.id || b.status === 'cancelled' || !b.dateTime.startsWith(selectedDate)) return false;
          const bStartMin = timeToMinutes(b.dateTime.split(' ')[1]);
          const bDuration = b.duration || 30;
          return slotStartMin < (bStartMin + bDuration) && (slotStartMin + serviceDuration) > bStartMin;
        });
        return !hasConflict;
      });
      if (freePros.length > 0) availability[slot] = freePros;
    });
    return availability;
  }, [allPossibleSlots, selectedDate, professionalsForService, bookings, bookingModal.service, settings]);

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
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-tea-900 overflow-hidden px-4 rounded-b-[4rem]">
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
          <div className="mb-10">
            <img src={settings.logo} className="h-48 md:h-72 w-auto drop-shadow-2xl animate-float" alt="Logo Studio Moriá" />
          </div>
          <div className="text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-serif text-white italic tracking-tight">Cuidando do seu bem estar</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => scrollToId('procedimentos')} className="w-full sm:w-auto bg-white text-tea-900 px-10 py-5 rounded-full font-bold shadow-2xl uppercase tracking-widest text-[11px] hover:scale-105 transition-all">Ver Serviços</button>
              <button onClick={() => scrollToId('localizacao')} className="w-full sm:w-auto bg-transparent text-white border-2 border-white/20 px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">Localização</button>
            </div>
          </div>
        </div>
      </section>

      <section id="procedimentos" className="max-w-7xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif text-gray-900 mb-4 italic">Procedimentos</h2>
          <div className="h-1 w-20 bg-tea-600 mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.filter(s => s.isVisible).map(service => (
            <div key={service.id} className="bg-gray-50 p-8 rounded-[3rem] border border-transparent hover:border-tea-100 hover:bg-white transition-all shadow-sm">
              <h3 className="text-xl font-serif font-bold text-tea-950 mb-3">{service.name}</h3>
              <p className="text-gray-500 text-xs font-light mb-6 line-clamp-2 leading-relaxed">{service.description}</p>
              <div className="mb-6">
                <p className="text-tea-800 font-bold text-xl">R$ {service.price.toFixed(2)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Duração: {service.duration} min</p>
              </div>
              <button onClick={() => onAuthClick()} className="w-full py-4 rounded-2xl border border-tea-100 text-tea-700 font-bold uppercase tracking-widest text-[10px] hover:bg-tea-800 hover:text-white transition-all">Agendar Agora</button>
            </div>
          ))}
        </div>
      </section>

      <section id="localizacao" className="bg-tea-50 py-24 px-4 overflow-hidden rounded-[4rem]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left px-4">
            <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Onde estamos</h2>
            <div className="space-y-4">
              <p className="text-gray-600 text-lg font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                {settings.address}
              </p>
              <div className="h-0.5 w-12 bg-tea-400 mx-auto lg:mx-0"></div>
              <p className="text-tea-600 text-xs font-bold uppercase tracking-widest">Atendimento Premium em São Vicente</p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-tea-900 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-2xl"
            >
              <span>Traçar Rota no Google Maps</span>
              <span className="text-xl">📍</span>
            </a>
          </div>
          <div className="bg-white p-4 rounded-[4rem] shadow-2xl h-[400px] border border-tea-100">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.409384784747!2d-46.3989182!3d-23.9813872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce197f884f856f%3A0x6d1f93f77341e978!2sR.%20Frei%20Gaspar%2C%203033%20-%20Cidade%20N%C3%A1utica%2C%20S%C3%A3o%20Vicente%20-%20SP%2C%2011355-000!5e0!3m2!1spt-BR!2sbr!4v1741100000000!5m2!1spt-BR!2sbr" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '3.5rem' }} 
              allowFullScreen={true} 
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>

      <section id="contato" className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center bg-gray-50 p-12 rounded-[4rem] border border-gray-100 shadow-sm">
           <h2 className="text-4xl font-serif text-tea-900 mb-8 italic">Fale Conosco</h2>
           <form onSubmit={handleContactSubmit} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required placeholder="Nome" className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 outline-none shadow-inner" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="WhatsApp" className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 outline-none shadow-inner" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <textarea required rows={4} placeholder="Mensagem" className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 outline-none shadow-inner resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-tea-900 transition-all shadow-xl">Enviar Mensagem</button>
           </form>
        </div>
      </section>

      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default CustomerHome;
