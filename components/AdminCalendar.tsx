
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

interface AdminCalendarProps {
  bookings: Booking[];
  services: Service[];
  customers: Customer[];
  teamMembers: TeamMember[];
  settings?: SalonSettings; 
  onUpdateStatus?: (id: string, status: 'scheduled' | 'cancelled' | 'completed') => void;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, customers, teamMembers, settings, onUpdateStatus }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(teamMembers[0]?.id || '');
  
  const [bookingModal, setBookingModal] = useState<{ open: boolean; hour: string }>({ open: false, hour: '' });
  const [actionModal, setActionModal] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const selectedPro = teamMembers.find(m => m.id === selectedProId);
  const startHour = settings?.businessHours?.start || "08:00";
  const endHour = settings?.businessHours?.end || "19:00";

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dayOfWeek = dateObj.getDay();

  const timeSlots = Array.from({ length: 29 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30; 
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getSlotStatus = (hour: string) => {
    const slotStartMin = timeToMinutes(hour);
    
    const activeBooking = bookings.find(b => {
      if (b.teamMemberId !== selectedProId || b.status === 'cancelled' || !b.dateTime.startsWith(selectedDate)) return false;
      const bStartMin = timeToMinutes(b.dateTime.split(' ')[1]);
      const bDuration = b.duration || 30;
      const bEndMin = bStartMin + bDuration;
      return slotStartMin >= bStartMin && slotStartMin < bEndMin;
    });

    if (!activeBooking) return { type: 'free' };
    const isStart = activeBooking.dateTime.split(' ')[1] === hour;
    return { 
      type: activeBooking.status === 'blocked' ? 'blocked' : (activeBooking.status === 'completed' ? 'completed' : 'scheduled'),
      booking: activeBooking,
      isStart
    };
  };

  const handleSlotClick = (hour: string) => {
    const status = getSlotStatus(hour);
    if (status.type === 'free') {
      setBookingModal({ open: true, hour });
    } else if (status.booking) {
      setActionModal({ open: true, booking: status.booking });
    }
  };

  const confirmCustomerBooking = async () => {
    if (!selectedCustomerId || !selectedServiceId) return alert("Selecione cliente e serviço.");
    const customer = customers.find(c => c.id === selectedCustomerId);
    const service = services.find(s => s.id === selectedServiceId);

    if (customer && service) {
      await addDoc(collection(db, "bookings"), {
        customerId: customer.id,
        customerName: customer.name,
        serviceId: service.id,
        serviceName: service.name,
        teamMemberId: selectedProId,
        teamMemberName: selectedPro?.name,
        dateTime: `${selectedDate} ${bookingModal.hour}`,
        duration: service.duration,
        status: 'scheduled', 
        depositStatus: 'paid',
        finalPrice: service.price,
        originalPrice: service.price,
        discountApplied: 0
      });
      setBookingModal({ open: false, hour: '' });
      setCustomerSearch(''); setSelectedCustomerId(''); setSelectedServiceId('');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data da Agenda</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Profissional</label>
          <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold">
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-8">
          {timeSlots.map(hour => {
            const status = getSlotStatus(hour);
            const isOff = selectedPro?.offDays?.includes(dayOfWeek);
            
            let color = 'bg-white border-tea-50 text-tea-950';
            let label = 'Livre';
            
            if (status.type === 'scheduled') {
              color = 'bg-tea-800 text-white border-tea-800';
              label = status.isStart ? status.booking?.customerName.split(' ')[0] : '●';
            } else if (status.type === 'completed') {
              color = 'bg-green-600 text-white border-green-600';
              label = 'Concluído';
            } else if (status.type === 'blocked' || isOff) {
              color = 'bg-gray-100 text-gray-400 border-transparent';
              label = 'Fechado';
            }

            return (
              <button key={hour} onClick={() => handleSlotClick(hour)} className={`relative p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center min-h-[90px] ${color} hover:shadow-lg transform active:scale-95`}>
                 <span className="text-lg font-serif font-bold italic leading-none">{hour}</span>
                 <span className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-80">{label}</span>
                 {status.isStart && status.booking?.promotionId && (
                   <span className="absolute top-2 right-2 text-[7px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold shadow-sm">PROMO</span>
                 )}
              </button>
            );
          })}
        </div>
      </div>

      {actionModal.open && actionModal.booking && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic mb-2">{actionModal.booking.customerName}</h3>
              <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">{actionModal.booking.serviceName}</p>
            </div>

            {actionModal.booking.promotionId && (
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 text-center">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-1">Atenção Equipe</p>
                <p className="text-xs font-bold text-orange-950">Cliente Participando da Campanha:</p>
                <p className="text-sm font-serif italic font-bold text-orange-900">"{actionModal.booking.promotionTitle}"</p>
                <div className="flex justify-between mt-4 text-[10px] font-bold uppercase border-t border-orange-100 pt-3">
                   <span>Valor Líquido:</span>
                   <span className="text-lg text-orange-950">R$ {actionModal.booking.finalPrice?.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={() => onUpdateStatus?.(actionModal.booking!.id, 'completed')} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest">Finalizar Atendimento</button>
              <button onClick={() => setActionModal({open:false, booking:null})} className="w-full py-4 text-gray-400 font-bold uppercase text-[10px]">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {bookingModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-6">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic text-center">Agendamento Manual</h3>
            <div className="space-y-4">
               <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
               <div className="max-h-32 overflow-y-auto space-y-1">
                 {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 3).map(c => (
                   <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-xs rounded-xl ${selectedCustomerId === c.id ? 'bg-tea-50 font-bold' : 'bg-white'}`}>{c.name}</button>
                 ))}
               </div>
               <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold">
                 <option value="">Selecione o serviço...</option>
                 {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
               </select>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setBookingModal({open:false, hour:''})} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
              <button onClick={confirmCustomerBooking} className="flex-[2] py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px]">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
