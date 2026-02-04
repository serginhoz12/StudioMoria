
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

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
  const [actionModal, setActionModal] = useState<{ open: boolean; booking: Booking | null; hour: string }>({ open: false, booking: null, hour: '' });
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const selectedPro = teamMembers.find(m => m.id === selectedProId);
  const startHourNum = parseInt((settings?.businessHours?.start || "08:00").split(':')[0]);
  const endHourNum = parseInt((settings?.businessHours?.end || "19:00").split(':')[0]);

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dayOfWeek = dateObj.getDay();

  const timeSlots = Array.from({ length: (endHourNum - startHourNum) * 2 + 1 }, (_, i) => {
    const totalMinutes = startHourNum * 60 + i * 30; 
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
    } else {
      setActionModal({ open: true, booking: status.booking || null, hour });
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
        discountApplied: 0,
        agreedToCancellationPolicy: true,
        policyAgreedAt: new Date().toISOString()
      });
      setBookingModal({ open: false, hour: '' });
      setCustomerSearch(''); setSelectedCustomerId(''); setSelectedServiceId('');
    }
  };

  const handleBlockSlot = async (hour: string) => {
    await addDoc(collection(db, "bookings"), {
      customerId: 'blocked',
      customerName: 'HORÁRIO BLOQUEADO',
      serviceId: 'blocked',
      serviceName: 'Bloqueio Manual',
      teamMemberId: selectedProId,
      teamMemberName: selectedPro?.name,
      dateTime: `${selectedDate} ${hour}`,
      duration: 30,
      status: 'blocked',
      depositStatus: 'paid',
      agreedToCancellationPolicy: false,
      policyAgreedAt: new Date().toISOString()
    });
    setBookingModal({ open: false, hour: '' });
  };

  const handleBlockFullDay = async () => {
    if (!confirm(`Deseja bloquear todos os horários livres de ${selectedPro?.name} para o dia ${new Date(selectedDate).toLocaleDateString()}?`)) return;
    
    for (const slot of timeSlots) {
      const status = getSlotStatus(slot);
      if (status.type === 'free') {
        await addDoc(collection(db, "bookings"), {
          customerId: 'blocked',
          customerName: 'BLOQUEIO TOTAL',
          serviceId: 'blocked',
          serviceName: 'Bloqueio de Agenda',
          teamMemberId: selectedProId,
          teamMemberName: selectedPro?.name,
          dateTime: `${selectedDate} ${slot}`,
          duration: 30,
          status: 'blocked',
          depositStatus: 'paid',
          agreedToCancellationPolicy: false,
          policyAgreedAt: new Date().toISOString()
        });
      }
    }
    alert("Agenda bloqueada com sucesso.");
  };

  const handleUnblockOrCancel = async (bookingId: string) => {
    if (!confirm("Tem certeza que deseja remover este registro da agenda?")) return;
    await updateDoc(doc(db, "bookings", bookingId), { status: 'cancelled', cancelledAt: new Date().toISOString() });
    setActionModal({ open: false, booking: null, hour: '' });
  };

  const handleComplete = async (bookingId: string) => {
    await updateDoc(doc(db, "bookings", bookingId), { status: 'completed' });
    setActionModal({ open: false, booking: null, hour: '' });
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
        <button 
          onClick={handleBlockFullDay}
          className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all border border-red-100"
        >
          Bloquear Dia Todo 🚫
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-8">
          {timeSlots.map(hour => {
            const status = getSlotStatus(hour);
            const isOff = selectedPro?.offDays?.includes(dayOfWeek);
            
            let color = 'bg-white border-tea-50 text-tea-950';
            let label = 'Disponível';
            
            if (status.type === 'scheduled') {
              color = 'bg-tea-800 text-white border-tea-800';
              label = status.isStart ? status.booking?.customerName.split(' ')[0] : '●';
            } else if (status.type === 'completed') {
              color = 'bg-green-600 text-white border-green-600';
              label = 'Concluído';
            } else if (status.type === 'blocked' || isOff) {
              color = 'bg-gray-100 text-gray-400 border-transparent';
              label = 'Bloqueado';
            }

            return (
              <button key={hour} onClick={() => handleSlotClick(hour)} className={`relative p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center min-h-[90px] ${color} hover:shadow-lg transform active:scale-95`}>
                 <span className="text-lg font-serif font-bold italic leading-none">{hour}</span>
                 <span className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-80">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {actionModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic mb-2">
                {actionModal.booking ? actionModal.booking.customerName : 'Horário Bloqueado'}
              </h3>
              <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">
                {actionModal.booking ? actionModal.booking.serviceName : actionModal.hour}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {actionModal.booking && actionModal.booking.status !== 'blocked' && (
                <button onClick={() => handleComplete(actionModal.booking!.id)} className="w-full py-5 bg-green-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Marcar como Concluído</button>
              )}
              <button 
                onClick={() => {
                  if (actionModal.booking) {
                    handleUnblockOrCancel(actionModal.booking.id);
                  } else {
                    // Se clicou num slot ocupado mas não tem objeto de booking (raro)
                    setActionModal({open:false, booking:null, hour:''});
                  }
                }} 
                className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-red-100"
              >
                {actionModal.booking?.status === 'blocked' ? 'Desbloquear Horário' : 'Cancelar Procedimento'}
              </button>
              <button onClick={() => setActionModal({open:false, booking:null, hour:''})} className="w-full py-4 text-gray-400 font-bold uppercase text-[10px]">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {bookingModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-6">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic text-center">Opções para {bookingModal.hour}</h3>
            
            <div className="space-y-6">
               <div className="p-6 bg-tea-50/50 rounded-3xl border border-tea-100 space-y-4">
                  <p className="text-[10px] font-bold text-tea-900 uppercase tracking-widest text-center">Agendar para Cliente</p>
                  <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-4 bg-white rounded-2xl outline-none shadow-sm border border-gray-100" />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 4).map(c => (
                      <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-xs rounded-xl transition-all ${selectedCustomerId === c.id ? 'bg-tea-800 text-white font-bold' : 'bg-white hover:bg-tea-50'}`}>{c.name}</button>
                    ))}
                  </div>
                  <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full p-4 bg-white rounded-2xl outline-none font-bold border border-gray-100 shadow-sm">
                    <option value="">Selecione o serviço...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                  </select>
                  <button onClick={confirmCustomerBooking} disabled={!selectedCustomerId || !selectedServiceId} className="w-full py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50">Confirmar Agendamento</button>
               </div>

               <div className="pt-4 border-t border-gray-100">
                  <button onClick={() => handleBlockSlot(bookingModal.hour)} className="w-full py-4 bg-red-50 text-red-700 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-red-100 hover:bg-red-100">Bloquear Horário Individual 🔒</button>
               </div>
            </div>

            <button onClick={() => setBookingModal({open:false, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
