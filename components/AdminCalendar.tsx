
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
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, customers, teamMembers, settings }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(teamMembers[0]?.id || '');
  
  // Estados para o Modal de Agendamento Assistido
  const [bookingModal, setBookingModal] = useState<{ open: boolean; hour: string }>({ open: false, hour: '' });
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
      const bDuration = (b as any).duration || 30;
      const bEndMin = bStartMin + bDuration;

      return slotStartMin >= bStartMin && slotStartMin < bEndMin;
    });

    if (!activeBooking) return { type: 'free' };
    
    const isStart = activeBooking.dateTime.split(' ')[1] === hour;
    
    return { 
      type: activeBooking.status === 'blocked' ? 'blocked' : 'scheduled',
      booking: activeBooking,
      isStart
    };
  };

  const handleSlotClick = (hour: string) => {
    const status = getSlotStatus(hour);
    if (status.type === 'free') {
      setBookingModal({ open: true, hour });
    } else if (status.type === 'blocked' && status.booking) {
      if (confirm("Deseja reabrir este horário?")) {
        deleteDoc(doc(db, "bookings", status.booking.id));
      }
    } else if (status.type === 'scheduled' && status.booking) {
      alert(`Agendamento de ${status.booking.customerName} (${status.booking.serviceName})`);
    }
  };

  const confirmQuickBlock = async () => {
    if (!selectedPro || !bookingModal.hour) return;
    const dateTime = `${selectedDate} ${bookingModal.hour}`;
    
    await addDoc(collection(db, "bookings"), {
      customerId: 'admin-block',
      customerName: 'HORÁRIO BLOQUEADO',
      serviceId: 'block',
      serviceName: 'Indisponível (Pausa/Bloqueio)',
      teamMemberId: selectedProId,
      teamMemberName: selectedPro.name,
      dateTime: dateTime,
      duration: 30,
      status: 'blocked',
      depositStatus: 'paid'
    });
    setBookingModal({ open: false, hour: '' });
  };

  const confirmCustomerBooking = async () => {
    if (!selectedPro || !bookingModal.hour || !selectedCustomerId || !selectedServiceId) {
      alert("Por favor, selecione a cliente e o serviço.");
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    const service = services.find(s => s.id === selectedServiceId);

    if (customer && service) {
      await addDoc(collection(db, "bookings"), {
        customerId: customer.id,
        customerName: customer.name,
        serviceId: service.id,
        serviceName: service.name,
        teamMemberId: selectedProId,
        teamMemberName: selectedPro.name,
        dateTime: `${selectedDate} ${bookingModal.hour}`,
        duration: service.duration,
        status: 'scheduled', // Já entra como confirmado pois foi feito pela equipe
        depositStatus: 'paid' // Consideramos como 'pago' ou 'presencial'
      });
      setBookingModal({ open: false, hour: '' });
      setSelectedCustomerId('');
      setSelectedServiceId('');
      setCustomerSearch('');
    }
  };

  const massAction = async (action: 'block' | 'open', period: 'all' | 'morning' | 'afternoon') => {
    if (!selectedPro) return;
    
    let targetHours = [...timeSlots];
    if (period === 'morning') targetHours = timeSlots.filter(h => h < "12:00");
    if (period === 'afternoon') targetHours = timeSlots.filter(h => h >= "12:00");

    for (const hour of targetHours) {
      const status = getSlotStatus(hour);
      if (action === 'block' && status.type === 'free') {
        await addDoc(collection(db, "bookings"), {
          customerId: 'admin-block',
          customerName: 'HORÁRIO BLOQUEADO',
          serviceId: 'block',
          serviceName: 'Bloqueio em Massa',
          teamMemberId: selectedProId,
          teamMemberName: selectedPro.name,
          dateTime: `${selectedDate} ${hour}`,
          duration: 30,
          status: 'blocked',
          depositStatus: 'paid'
        });
      } else if (action === 'open' && status.type === 'blocked' && status.booking) {
        await deleteDoc(doc(db, "bookings", status.booking.id));
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.cpf.includes(customerSearch)
  ).slice(0, 5);

  const isAgendaOpenToPublic = settings?.agendaOpenUntil ? selectedDate <= settings.agendaOpenUntil : true;

  return (
    <div className="space-y-8 animate-fade-in pb-20 px-2 md:px-0">
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest block mb-1">Selecione o Dia</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className={`w-full p-4 border-2 rounded-2xl outline-none font-bold transition-all ${isAgendaOpenToPublic ? 'bg-tea-50/30 border-tea-100 text-tea-900 focus:border-tea-400' : 'bg-gray-50 border-gray-200 text-gray-500 focus:border-gray-400'}`} 
              />
            </div>
            <div className="flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest block mb-1">Profissional</label>
              <select 
                value={selectedProId} 
                onChange={(e) => setSelectedProId(e.target.value)} 
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-tea-200 rounded-2xl outline-none font-bold text-tea-900"
              >
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
             <button onClick={() => massAction('block', 'all')} className="flex-1 md:flex-none px-6 py-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-2xl hover:bg-red-100 transition-all uppercase tracking-widest border border-red-100">Bloquear Tudo</button>
             <button onClick={() => massAction('open', 'all')} className="flex-1 md:flex-none px-6 py-4 bg-tea-50 text-tea-700 text-[10px] font-bold rounded-2xl hover:bg-tea-100 transition-all uppercase tracking-widest border border-tea-100">Abrir Tudo</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-tea-900 text-white px-8 py-5 flex justify-between items-center">
            <div>
              <h3 className="font-serif font-bold italic text-lg">Controle da Agenda</h3>
              <p className="text-[9px] uppercase tracking-[0.2em] text-tea-300">Clique em um horário para agendar ou bloquear</p>
            </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-8">
          {timeSlots.map(hour => {
            const status = getSlotStatus(hour);
            const isStandardOffDay = selectedPro?.offDays?.includes(dayOfWeek);
            const proStart = selectedPro?.businessHours?.start || startHour;
            const proEnd = selectedPro?.businessHours?.end || endHour;
            const isOutsidePattern = hour < proStart || hour >= proEnd;

            let bgColor = 'bg-white border-tea-50 text-tea-900';
            let labelText = 'Livre';
            let subText = '';

            if (status.type === 'scheduled') {
              bgColor = 'bg-tea-600 border-tea-600 text-white';
              labelText = status.isStart ? status.booking?.customerName?.split(' ')[0] : '●';
              subText = status.isStart ? status.booking?.serviceName : '';
            } else if (status.type === 'blocked') {
              bgColor = 'bg-gray-100 border-gray-200 text-gray-400';
              labelText = 'Fechado';
            } else if (isStandardOffDay || isOutsidePattern) {
              bgColor = 'bg-gray-50 border-gray-50 text-gray-300';
              labelText = 'Inativo';
            }

            return (
              <button
                key={hour}
                onClick={() => handleSlotClick(hour)}
                className={`relative group p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center min-h-[85px] ${bgColor} ${status.type === 'free' ? 'hover:border-tea-400 shadow-sm' : ''}`}
              >
                <span className="text-lg font-serif font-bold italic leading-none">{hour}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1 line-clamp-1">
                  {labelText}
                </span>
                {subText && (
                  <span className="text-[7px] font-medium uppercase tracking-tighter opacity-80 line-clamp-1 mt-0.5">
                    {subText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de Agendamento Assistido */}
      {bookingModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl animate-slide-up space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-serif text-tea-900 font-bold italic">Agendamento Assistido</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Horário: {bookingModal.hour} em {new Date(selectedDate).toLocaleDateString()}</p>
            </div>

            <div className="space-y-6">
              {/* Opção 1: Bloquear Horário */}
              <button 
                onClick={confirmQuickBlock}
                className="w-full p-4 border-2 border-dashed border-red-100 text-red-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all"
              >
                🚫 Bloquear apenas este horário
              </button>

              <div className="h-px bg-gray-100 w-full"></div>

              {/* Opção 2: Agendar Cliente */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Buscar Cliente</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Nome ou CPF da cliente..."
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-tea-200 transition-all"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  {customerSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-2xl mt-2 shadow-xl z-10 overflow-hidden divide-y divide-gray-50">
                      {filteredCustomers.map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                          className={`w-full p-4 text-left hover:bg-tea-50 transition-colors ${selectedCustomerId === c.id ? 'bg-tea-50' : ''}`}
                        >
                          <p className="font-bold text-sm text-gray-800">{c.name}</p>
                          <p className="text-[10px] text-gray-400">CPF: {c.cpf}</p>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <p className="p-4 text-[10px] text-gray-400 italic">Nenhuma cliente encontrada.</p>
                      )}
                    </div>
                  )}
                </div>

                <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1 block mt-4">Procedimento</label>
                <select 
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-tea-200 transition-all font-bold text-tea-900"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                >
                  <option value="">Selecione um serviço...</option>
                  {services.filter(s => s.isVisible).map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setBookingModal({ open: false, hour: '' })}
                  className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmCustomerBooking}
                  className="flex-[2] bg-tea-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[10px]"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
