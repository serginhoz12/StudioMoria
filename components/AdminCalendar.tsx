
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";

interface AdminCalendarProps {
  bookings: Booking[];
  services: Service[];
  customers: Customer[];
  teamMembers: TeamMember[];
  settings?: SalonSettings;
  // Added onUpdateStatus to match passing in App.tsx
  onUpdateStatus?: (id: string, status: any) => void;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, customers, teamMembers, settings }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(teamMembers[0]?.id || '');
  const [modal, setModal] = useState<{ open: boolean; hour: string; type: 'free' | 'occupied' | 'opened' }>({ open: false, hour: '', type: 'free' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const startHourNum = parseInt((settings?.businessHours?.start || "08:00").split(':')[0]);
  const endHourNum = parseInt((settings?.businessHours?.end || "19:00").split(':')[0]);

  const timeSlots = Array.from({ length: (endHourNum - startHourNum) * 2 }, (_, i) => {
    const totalMinutes = startHourNum * 60 + i * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const getSlotData = (hour: string) => {
    const fullDateTime = `${selectedDate} ${hour}`;
    const booking = bookings.find(b => b.dateTime === fullDateTime && b.teamMemberId === selectedProId && b.status !== 'cancelled');
    if (!booking) return { type: 'locked' };
    return { type: booking.status, booking };
  };

  const handleOpenSlot = async (hour: string) => {
    if ((db as any)._isMock) return alert("Modo visual: Horário liberado simulado.");
    await addDoc(collection(db, "bookings"), {
      dateTime: `${selectedDate} ${hour}`,
      status: 'open',
      teamMemberId: selectedProId,
      teamMemberName: teamMembers.find(m => m.id === selectedProId)?.name,
      customerName: 'LIBERADO PARA CLIENTES',
      customerId: 'none'
    });
    setModal({ open: false, hour: '', type: 'free' });
  };

  const handleCloseSlot = async (bookingId: string) => {
    if ((db as any)._isMock) return;
    await updateDoc(doc(db, "bookings", bookingId), { status: 'cancelled' });
    setModal({ open: false, hour: '', type: 'free' });
  };

  const handleManualBooking = async () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    const service = services.find(s => s.id === selectedServiceId);
    if (!customer || !service) return alert("Selecione cliente e serviço.");

    await addDoc(collection(db, "bookings"), {
      customerId: customer.id,
      customerName: customer.name,
      serviceId: service.id,
      serviceName: service.name,
      teamMemberId: selectedProId,
      teamMemberName: teamMembers.find(m => m.id === selectedProId)?.name,
      dateTime: `${selectedDate} ${modal.hour}`,
      duration: service.duration,
      status: 'scheduled',
      depositStatus: 'paid',
      agreedToCancellationPolicy: true,
      policyAgreedAt: new Date().toISOString()
    });
    setModal({ open: false, hour: '', type: 'free' });
    setCustomerSearch(''); setSelectedCustomerId(''); setSelectedServiceId('');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Dia da Agenda</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Profissional</label>
          <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold">
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden p-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {timeSlots.map(hour => {
            const data = getSlotData(hour);
            let style = "bg-gray-50 text-gray-300 border-transparent cursor-not-allowed";
            let label = "Bloqueado";

            if (data.type === 'open') {
              style = "bg-white border-tea-500 text-tea-900 border-2 cursor-pointer";
              label = "Aberto p/ Clientes";
            } else if (data.type === 'scheduled' || data.type === 'completed') {
              style = "bg-tea-900 text-white border-tea-900 cursor-pointer shadow-lg";
              label = data.booking?.customerName.split(' ')[0] || "Ocupado";
            }

            return (
              <button 
                key={hour} 
                onClick={() => setModal({ open: true, hour, type: data.type === 'locked' ? 'free' : (data.type === 'open' ? 'opened' : 'occupied') })}
                className={`p-6 rounded-3xl transition-all flex flex-col items-center justify-center min-h-[100px] ${style} hover:scale-105`}
              >
                <span className="text-xl font-serif font-bold italic">{hour}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl space-y-6">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic text-center">Horário: {modal.hour}</h3>
            
            {modal.type === 'free' && (
              <div className="space-y-4">
                <button onClick={() => handleOpenSlot(modal.hour)} className="w-full py-5 bg-tea-100 text-tea-900 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-200 transition-all">Liberar para Clientes (Site)</button>
                <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Ou Agendar Manualmente</p>
                  <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-3 bg-white border border-gray-100 rounded-xl text-xs outline-none" />
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 3).map(c => (
                      <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className={`w-full p-2 text-left text-[10px] rounded-lg ${selectedCustomerId === c.id ? 'bg-tea-900 text-white' : 'bg-white'}`}>{c.name}</button>
                    ))}
                  </div>
                  <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full p-3 bg-white border border-gray-100 rounded-xl text-xs outline-none">
                    <option value="">Selecione o serviço...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                  </select>
                  <button onClick={handleManualBooking} className="w-full py-4 bg-tea-900 text-white rounded-xl font-bold uppercase text-[10px]">Agendar Agora</button>
                </div>
              </div>
            )}

            {modal.type === 'opened' && (
              <button onClick={() => handleCloseSlot(getSlotData(modal.hour).booking!.id)} className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-red-100">Bloquear / Fechar Horário</button>
            )}

            {modal.type === 'occupied' && (
               <div className="text-center space-y-4">
                  <p className="font-bold text-tea-950">{getSlotData(modal.hour).booking?.customerName}</p>
                  <p className="text-xs text-gray-400">{getSlotData(modal.hour).booking?.serviceName}</p>
                  <button onClick={() => handleCloseSlot(getSlotData(modal.hour).booking!.id)} className="w-full py-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold">Cancelar Agendamento</button>
               </div>
            )}

            <button onClick={() => setModal({ open: false, hour: '', type: 'free' })} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px]">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
