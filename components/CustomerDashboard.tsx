
import React, { useState, useMemo } from 'react';
import { Customer, Booking, Service, SalonSettings, WaitlistEntry, Promotion } from '../types';

interface CustomerDashboardProps {
  customer: Customer;
  bookings: Booking[];
  services: Service[];
  settings: SalonSettings;
  onLogout: () => void;
  // Added missing props passed from App.tsx
  onBook: () => void;
  onUpdateProfile: (upd: any) => void;
  onCancelBooking: (id: string) => void;
  onAddToWaitlist: () => void;
  waitlist: WaitlistEntry[];
  onRemoveWaitlist: (id: string) => void;
  promotions: Promotion[];
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ customer, bookings, services, settings, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agenda'>('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Lógica crítica: Filtra apenas bookings com status 'open' para exibir como slots disponíveis
  const availableSlots = useMemo(() => {
    return bookings.filter(b => b.status === 'open' && b.dateTime.startsWith(selectedDate));
  }, [bookings, selectedDate]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 animate-fade-in font-sans">
      <header className="bg-gradient-to-b from-tea-900 to-tea-950 pt-16 pb-28 px-8 rounded-b-[5rem] shadow-2xl relative overflow-hidden">
        <div className="max-w-md mx-auto relative z-10 text-center space-y-4">
           <h1 className="text-3xl font-serif text-white font-bold italic">Olá, {customer.name.split(' ')[0]}</h1>
           <p className="text-tea-100/60 text-xs italic tracking-widest uppercase font-bold">Studio Moriá Estética</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 -mt-16 relative z-20 space-y-10 pb-10">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setActiveTab('agendar')} className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50 flex flex-col items-center gap-4 group">
            <div className="w-12 h-12 bg-tea-100 text-tea-900 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">✨</div>
            <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Procedimentos</span>
          </button>
          <button onClick={() => setActiveTab('agenda')} className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center gap-4 group">
            <div className="w-12 h-12 bg-gray-50 text-tea-800 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🗓️</div>
            <span className="text-[10px] font-bold text-tea-950 uppercase tracking-widest">Minha Agenda</span>
          </button>
        </div>

        {activeTab === 'agendar' && (
          <div className="space-y-8 animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-950 italic font-bold text-center">Selecione o Cuidado</h3>
            <div className="space-y-4">
              {services.filter(s => s.isVisible).map(s => (
                <button key={s.id} onClick={() => setSelectedService(s)} className={`w-full p-8 rounded-[2.5rem] border-2 transition-all flex justify-between items-center ${selectedService?.id === s.id ? 'bg-tea-50 border-tea-500' : 'bg-white border-gray-50'}`}>
                   <div className="text-left">
                      <p className="font-bold text-tea-950 text-lg">{s.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">R$ {s.price.toFixed(2)} • {s.duration}min</p>
                   </div>
                   <div className="text-2xl">🌿</div>
                </button>
              ))}
            </div>

            {selectedService && (
              <div className="space-y-6 pt-6 border-t border-gray-100 animate-slide-up">
                 <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Horários Liberados pela Moriá</h4>
                 <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold outline-none" />
                 
                 <div className="grid grid-cols-4 gap-3">
                    {availableSlots.map(slot => (
                      <button key={slot.id} className="p-3 bg-tea-900 text-white rounded-xl font-bold text-xs shadow-lg">
                        {slot.dateTime.split(' ')[1]}
                      </button>
                    ))}
                    {availableSlots.length === 0 && (
                      <div className="col-span-4 text-center py-10 opacity-30 italic text-sm">Nenhum horário liberado para este dia ainda.</div>
                    )}
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-6 animate-slide-up">
             <h3 className="text-2xl font-serif text-tea-950 italic font-bold text-center">Minha Agenda</h3>
             {bookings.filter(b => b.customerId === customer.id).map(b => (
                <div key={b.id} className="p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-start">
                      <h4 className="text-xl font-serif font-bold text-tea-950 italic">{b.serviceName}</h4>
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-tea-900 text-white'}`}>
                        {b.status === 'completed' ? 'Realizado' : 'Confirmado ✓'}
                      </span>
                   </div>
                   <div className="flex gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest pt-4 border-t border-gray-50">
                      <span>🗓️ {b.dateTime.split(' ')[0]}</span>
                      <span>⏰ {b.dateTime.split(' ')[1]}</span>
                   </div>
                   {b.paymentReceived && (
                     <p className="text-[10px] text-green-600 font-bold uppercase pt-2">Pago: R$ {b.paymentReceived.toFixed(2)} ✓</p>
                   )}
                </div>
             ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center">
         <div className="w-full max-w-xs bg-tea-950 rounded-[3rem] p-3 flex justify-around items-center border border-white/10 shadow-2xl">
            <button onClick={() => setActiveTab('home')} className={`text-xl ${activeTab === 'home' ? 'text-tea-400 scale-110' : 'text-white/40'}`}>🏠</button>
            <button onClick={() => setActiveTab('agendar')} className={`text-xl ${activeTab === 'agendar' ? 'text-tea-400 scale-110' : 'text-white/40'}`}>✨</button>
            <button onClick={() => setActiveTab('agenda')} className={`text-xl ${activeTab === 'agenda' ? 'text-tea-400 scale-110' : 'text-white/40'}`}>🗓️</button>
            <button onClick={onLogout} className="text-xl text-white/20">👋</button>
         </div>
      </nav>
    </div>
  );
};

export default CustomerDashboard;
