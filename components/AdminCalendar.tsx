
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

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
    // Se não há nada no banco, por padrão é bloqueado
    return activeBooking ? { type: activeBooking.status, booking: activeBooking } : { type: 'blocked' };
  };

  const handleLiberateSlot = async (hour: string) => {
    await addDoc(collection(db, "bookings"), {
      customerId: 'liberated',
      customerName: 'HORÁRIO LIBERADO',
      serviceId: 'liberated',
      serviceName: 'Aberto para Agendamento',
      teamMemberId: selectedProId,
      teamMemberName: selectedPro?.name,
      dateTime: `${selectedDate} ${hour}`,
      duration: 30,
      status: 'liberated',
      depositStatus: 'paid',
      agreedToCancellationPolicy: true,
      policyAgreedAt: new Date().toISOString()
    });
    setActionModal({ open: false, booking: null, hour: '' });
  };

  const handleReleaseSlot = async (bookingId: string) => {
    await deleteDoc(doc(db, "bookings", bookingId));
    setActionModal({ open: false, booking: null, hour: '' });
  };

  const handleLiberateDay = async () => {
    if(!confirm("Deseja liberar TODOS os horários deste dia para agendamento das clientes?")) return;
    
    for (const hour of timeSlots) {
      const status = getSlotStatus(hour);
      if (status.type === 'blocked') {
        await addDoc(collection(db, "bookings"), {
          customerId: 'liberated',
          customerName: 'HORÁRIO LIBERADO',
          serviceId: 'liberated',
          serviceName: 'Aberto para Agendamento',
          teamMemberId: selectedProId,
          teamMemberName: selectedPro?.name,
          dateTime: `${selectedDate} ${hour}`,
          duration: 30,
          status: 'liberated',
          depositStatus: 'paid',
          agreedToCancellationPolicy: true,
          policyAgreedAt: new Date().toISOString()
        });
      }
    }
    alert("Dia liberado com sucesso!");
  };

  const handleBlockDay = async () => {
    if(!confirm("Deseja BLOQUEAR todos os horários livres e liberados deste dia? Agendamentos de clientes não serão afetados.")) return;
    
    const dayBookings = bookings.filter(b => 
      b.teamMemberId === selectedProId && 
      b.dateTime.startsWith(selectedDate) && 
      (b.status === 'liberated' || b.status === 'blocked')
    );

    for (const b of dayBookings) {
      await deleteDoc(doc(db, "bookings", b.id));
    }
    alert("Dia bloqueado com sucesso!");
  };

  const confirmBooking = async () => {
    if (!selectedCustomerId || !selectedServiceId) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    const service = services.find(s => s.id === selectedServiceId);
    if (!customer || !service) return;

    // Se houver uma liberação prévia nesse horário, removemos ela primeiro
    const existing = getSlotStatus(bookingModal.hour);
    if (existing.booking && (existing.type === 'liberated' || existing.type === 'blocked')) {
      await deleteDoc(doc(db, "bookings", existing.booking.id));
    }

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
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data da Agenda</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Colaboradora</label>
          <select 
            value={selectedProId} 
            onChange={e => isOwner && setSelectedProId(e.target.value)} 
            disabled={!isOwner}
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold disabled:opacity-50"
          >
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
           <button onClick={handleLiberateDay} className="px-6 py-4 bg-tea-50 text-tea-900 border-2 border-tea-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-tea-100 transition-all">🔓 Liberar Dia</button>
           <button onClick={handleBlockDay} className="px-6 py-4 bg-gray-800 text-gray-300 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-black transition-all">🔒 Bloquear Dia</button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 p-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {timeSlots.map(hour => {
          const status = getSlotStatus(hour);
          
          let slotStyles = "bg-gray-50 text-gray-300 border-transparent grayscale shadow-inner";
          let label = "🔒 Bloqueado";

          if (status.type === 'scheduled' || status.type === 'pending') {
            slotStyles = "bg-tea-800 text-white border-tea-800 shadow-md";
            label = status.booking?.customerName.split(' ')[0] || '';
          } else if (status.type === 'completed') {
            slotStyles = "bg-green-600 text-white border-green-600";
            label = "Concluído";
          } else if (status.type === 'liberated') {
            slotStyles = "bg-white text-tea-900 border-tea-100 shadow-sm";
            label = "✨ Vago (Liberado)";
          }
          
          return (
            <button 
              key={hour} 
              onClick={() => setActionModal({open: true, booking: status.booking || null, hour})} 
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center min-h-[95px] relative group ${slotStyles}`}
            >
               <span className="text-lg font-serif font-bold italic">{hour}</span>
               <span className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-80 text-center line-clamp-1">
                 {label}
               </span>
               <div className="absolute inset-0 bg-tea-950 text-white opacity-0 group-hover:opacity-100 rounded-3xl flex items-center justify-center transition-opacity z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Configurar</span>
               </div>
            </button>
          );
        })}
      </div>

      {actionModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[3rem] p-10 shadow-3xl text-center space-y-6 border border-tea-50">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-tea-600 uppercase tracking-widest">Gestão de Horário</span>
              <h3 className="text-3xl font-serif font-bold italic text-tea-950">{actionModal.hour}</h3>
            </div>

            <div className="space-y-3">
              {actionModal.booking && (actionModal.booking.status === 'scheduled' || actionModal.booking.status === 'pending') ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cliente Agendada</p>
                      <p className="font-bold text-tea-900 text-lg uppercase tracking-tight">{actionModal.booking.customerName}</p>
                      <p className="text-[9px] text-tea-600 font-bold">{actionModal.booking.serviceName}</p>
                  </div>
                  <button onClick={() => updateDoc(doc(db, "bookings", actionModal.booking!.id), {status: 'completed'}).then(() => setActionModal({open:false, booking:null, hour:''}))} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest">Atendimento Concluído</button>
                  <button onClick={() => handleReleaseSlot(actionModal.booking!.id)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar Registro</button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => { setBookingModal({open: true, hour: actionModal.hour}); setActionModal({open:false, booking:null, hour:''}); }} 
                    className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                  >
                    📅 Agendar Manualmente
                  </button>
                  {actionModal.booking?.status === 'liberated' ? (
                    <button 
                      onClick={() => handleReleaseSlot(actionModal.booking!.id)}
                      className="w-full py-5 bg-gray-800 text-gray-300 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                    >
                      🔒 Bloquear este Horário
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleLiberateSlot(actionModal.hour)}
                      className="w-full py-5 bg-tea-50 text-tea-900 border-2 border-tea-100 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-100 transition-all"
                    >
                      ✨ Liberar para Clientes
                    </button>
                  )}
                </>
              )}
            </div>
            <button onClick={() => setActionModal({open:false, booking:null, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest mt-4">Sair</button>
          </div>
        </div>
      )}

      {bookingModal.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-8 border-4 border-tea-100 shadow-3xl">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif font-bold italic text-tea-950">Agendar Cliente</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Para {selectedDate} às {bookingModal.hour}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-tea-900 uppercase tracking-widest ml-2">Selecionar Cliente</label>
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100">
                  <option value="">Buscar cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-tea-900 uppercase tracking-widest ml-2">Procedimento</label>
                <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100">
                  <option value="">Selecionar serviço...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button onClick={confirmBooking} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Salvar na Agenda</button>
              <button onClick={() => setBookingModal({open:false, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
