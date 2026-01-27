
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings, Customer } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

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
  
  // Se a Moriá não faz serviços, a agenda inicia selecionando o primeiro membro da equipe que faz serviços (se existir)
  const initialPro = teamMembers.find(m => m.assignedServiceIds.length > 0) || teamMembers[0];
  const [selectedProId, setSelectedProId] = useState(initialPro?.id);
  
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
    // REGRA: Tudo é BLOQUEADO se não houver registro de agendamento ou liberação explícita
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
    if(!confirm("Deseja LIBERAR todos os horários deste dia para o site?")) return;
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
    alert("Dia liberado para o público!");
  };

  const handleBlockDay = async () => {
    if(!confirm("Deseja BLOQUEAR todo este dia? Isso remove as vagas do site. Agendamentos de clientes serão mantidos.")) return;
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
        <div className="flex-1 space-y-2 w-full">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Data da Agenda</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" />
        </div>
        <div className="flex-1 space-y-2 w-full">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Profissional em Exibição</label>
          <select 
            value={selectedProId} 
            onChange={e => setSelectedProId(e.target.value)} 
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
          >
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} {m.role === 'owner' ? '(ADM)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={handleLiberateDay} className="flex-1 px-4 py-4 bg-tea-50 text-tea-900 border-2 border-tea-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-tea-100 transition-all">🔓 Liberar Dia</button>
           <button onClick={handleBlockDay} className="flex-1 px-4 py-4 bg-gray-800 text-gray-300 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-black transition-all">🔒 Bloquear Dia</button>
        </div>
      </div>

      {selectedPro && selectedPro.assignedServiceIds.length === 0 && (
        <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 text-center">
           <p className="text-sm text-orange-800 font-bold italic">Atenção: {selectedPro.name} está como perfil administrativo e não possui serviços para agendamento direto.</p>
        </div>
      )}

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
            label = "✨ Aberto no Site";
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
            </button>
          );
        })}
      </div>

      {actionModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[3rem] p-10 shadow-3xl text-center space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-tea-600 uppercase tracking-widest">Gestão de Horário</span>
              <h3 className="text-3xl font-serif font-bold italic text-tea-950">{actionModal.hour}</h3>
            </div>

            <div className="space-y-3">
              {actionModal.booking && (actionModal.booking.status === 'scheduled' || actionModal.booking.status === 'pending') ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Agendamento Ativo</p>
                      <p className="font-bold text-tea-900 text-lg">{actionModal.booking.customerName}</p>
                      <p className="text-[9px] text-tea-600 font-bold uppercase">{actionModal.booking.serviceName}</p>
                  </div>
                  <button onClick={() => updateDoc(doc(db, "bookings", actionModal.booking!.id), {status: 'completed'}).then(() => setActionModal({open:false, booking:null, hour:''}))} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Finalizar Atendimento</button>
                  <button onClick={() => handleReleaseSlot(actionModal.booking!.id)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar Registro</button>
                </div>
              ) : (
                <>
                  <button onClick={() => { setBookingModal({open: true, hour: actionModal.hour}); setActionModal({open:false, booking:null, hour:''}); }} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">📅 Agendar Manualmente</button>
                  {actionModal.booking?.status === 'liberated' ? (
                    <button onClick={() => handleReleaseSlot(actionModal.booking!.id)} className="w-full py-5 bg-gray-800 text-gray-300 rounded-2xl font-bold uppercase text-[10px] tracking-widest">🔒 Bloquear para Clientes</button>
                  ) : (
                    <button onClick={() => handleLiberateSlot(actionModal.hour)} className="w-full py-5 bg-tea-50 text-tea-900 border-2 border-tea-100 rounded-2xl font-bold uppercase text-[10px] tracking-widest">✨ Abrir Vaga no Site</button>
                  )}
                </>
              )}
            </div>
            <button onClick={() => setActionModal({open:false, booking:null, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Fechar</button>
          </div>
        </div>
      )}

      {bookingModal.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-8 border-4 border-tea-100 shadow-3xl">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif font-bold italic text-tea-950">Agendamento Manual</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Para {selectedDate} às {bookingModal.hour}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-bold text-tea-900 uppercase tracking-widest ml-2">Cliente do Studio</label>
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100 appearance-none">
                  <option value="">Selecione a cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-bold text-tea-900 uppercase tracking-widest ml-2">Procedimento</label>
                <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100 appearance-none">
                  <option value="">Escolha o serviço...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button onClick={confirmBooking} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Confirmar e Salvar</button>
              <button onClick={() => setBookingModal({open:false, hour:''})} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px]">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
