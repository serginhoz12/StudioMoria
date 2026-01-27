
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

interface AdminCalendarProps {
  bookings: Booking[];
  services: Service[];
  customers: Customer[];
  teamMembers: TeamMember[];
  settings: SalonSettings; 
  loggedMember: TeamMember;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, customers, teamMembers, settings, loggedMember }) => {
  const isOwner = loggedMember.role === 'owner';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(isOwner ? teamMembers[0]?.id : loggedMember.id);
  
  const [bookingModal, setBookingModal] = useState<{ open: boolean; hour: string }>({ open: false, hour: '' });
  const [actionModal, setActionModal] = useState<{ open: boolean; booking: Booking | null; hour: string }>({ open: false, booking: null, hour: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const selectedPro = teamMembers.find(m => m.id === selectedProId);
  const startHourNum = parseInt(settings.businessHours.start.split(':')[0]);
  const endHourNum = parseInt(settings.businessHours.end.split(':')[0]);

  const timeSlots = Array.from({ length: (endHourNum - startHourNum) * 2 + 1 }, (_, i) => {
    const totalMinutes = startHourNum * 60 + i * 30; 
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const getSlotStatus = (hour: string) => {
    const activeBooking = bookings.find(b => 
      b.teamMemberId === selectedProId && 
      b.status !== 'cancelled' && 
      b.dateTime === `${selectedDate} ${hour}`
    );
    return activeBooking ? { type: activeBooking.status, booking: activeBooking } : { type: 'free' };
  };

  const confirmBooking = async () => {
    if (!selectedCustomerId || !selectedServiceId) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    const service = services.find(s => s.id === selectedServiceId);
    if (!customer || !service) return;

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
      agreedToCancellationPolicy: true,
      policyAgreedAt: new Date().toISOString()
    });
    setBookingModal({ open: false, hour: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Profissional</label>
          <select 
            value={selectedProId} 
            onChange={e => isOwner && setSelectedProId(e.target.value)} 
            disabled={!isOwner}
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold disabled:opacity-50"
          >
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 p-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {timeSlots.map(hour => {
          const status = getSlotStatus(hour);
          const colors = status.type === 'scheduled' ? 'bg-tea-800 text-white' : status.type === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-tea-950 border-tea-50';
          
          return (
            <button key={hour} onClick={() => setActionModal({open: true, booking: status.booking || null, hour})} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center min-h-[90px] ${colors}`}>
               <span className="text-lg font-serif font-bold italic">{hour}</span>
               <span className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-80">
                 {status.booking ? status.booking.customerName.split(' ')[0] : 'Livre'}
               </span>
            </button>
          );
        })}
      </div>

      {actionModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-3xl text-center space-y-6">
            <h3 className="text-2xl font-serif font-bold italic">{actionModal.hour}</h3>
            {actionModal.booking ? (
              <div className="space-y-4">
                 <p className="font-bold text-tea-900">{actionModal.booking.customerName}</p>
                 <button onClick={() => updateDoc(doc(db, "bookings", actionModal.booking!.id), {status: 'completed'}).then(() => setActionModal({open:false, booking:null, hour:''}))} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold uppercase text-[10px]">Concluir</button>
                 <button onClick={() => updateDoc(doc(db, "bookings", actionModal.booking!.id), {status: 'cancelled'}).then(() => setActionModal({open:false, booking:null, hour:''}))} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px]">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => { setBookingModal({open: true, hour: actionModal.hour}); setActionModal({open:false, booking:null, hour:''}); }} className="w-full py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px]">Agendar Horário</button>
            )}
            <button onClick={() => setActionModal({open:false, booking:null, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px]">Fechar</button>
          </div>
        </div>
      )}

      {bookingModal.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6">
            <h3 className="text-2xl font-serif font-bold italic text-center">Agendar {bookingModal.hour}</h3>
            <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold">
              <option value="">Cliente...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold">
              <option value="">Serviço...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={confirmBooking} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Confirmar</button>
            <button onClick={() => setBookingModal({open:false, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px]">Sair</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
