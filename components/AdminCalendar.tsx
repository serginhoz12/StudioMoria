
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

interface AdminCalendarProps {
  bookings: Booking[];
  setBookings?: React.Dispatch<React.SetStateAction<Booking[]>>;
  services: Service[];
  teamMembers: TeamMember[];
  settings?: SalonSettings; 
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, services, teamMembers, settings }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProId, setSelectedProId] = useState(teamMembers[0]?.id || '');

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
    
    // Procura por qualquer agendamento que cubra este horário
    const activeBooking = bookings.find(b => {
      if (b.teamMemberId !== selectedProId || b.status === 'cancelled' || !b.dateTime.startsWith(selectedDate)) return false;
      
      const bStartMin = timeToMinutes(b.dateTime.split(' ')[1]);
      const bDuration = (b as any).duration || 30;
      const bEndMin = bStartMin + bDuration;

      // O slot atual de 30min está contido no intervalo do serviço?
      return slotStartMin >= bStartMin && slotStartMin < bEndMin;
    });

    if (!activeBooking) return { type: 'free' };
    
    // Verifica se este é exatamente o slot de início do agendamento
    const isStart = activeBooking.dateTime.split(' ')[1] === hour;
    
    return { 
      type: activeBooking.status === 'blocked' ? 'blocked' : 'scheduled',
      booking: activeBooking,
      isStart
    };
  };

  const toggleSlot = async (hour: string) => {
    const dateTime = `${selectedDate} ${hour}`;
    if (!selectedPro) return;

    const status = getSlotStatus(hour);

    if (status.type !== 'free' && status.booking) {
      if (status.type === 'blocked') {
        await deleteDoc(doc(db, "bookings", status.booking.id));
      } else {
        alert(`Este horário faz parte do serviço "${status.booking.serviceName}" para ${status.booking.customerName}.`);
      }
    } else {
      const newBlocked = {
        customerId: 'admin-block',
        customerName: 'HORÁRIO BLOQUEADO',
        serviceId: 'block',
        serviceName: 'Indisponível (Pausa/Bloqueio)',
        teamMemberId: selectedProId,
        teamMemberName: selectedPro.name,
        dateTime: dateTime,
        duration: 30, // Bloqueios manuais por padrão ocupam 30min
        status: 'blocked',
        depositStatus: 'paid'
      };
      await addDoc(collection(db, "bookings"), newBlocked);
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
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-tea-200 rounded-2xl outline-none font-bold text-tea-900" 
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

        {selectedPro?.offDays?.includes(dayOfWeek) && (
          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex items-center gap-4 animate-pulse">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-orange-800 font-bold text-sm uppercase">Hoje é folga de {selectedPro.name}</p>
              <p className="text-orange-600 text-[10px] font-medium leading-tight">Agenda fechada para o público. Clique nos slots abaixo se quiser abrir algum horário extra.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-tea-900 text-white px-8 py-5">
            <h3 className="font-serif font-bold italic text-lg">Controle de Intervalos</h3>
            <p className="text-[9px] uppercase tracking-[0.2em] text-tea-300">Serviços agora ocupam múltiplos slots baseados na duração</p>
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
                onClick={() => toggleSlot(hour)}
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
                
                {status.type === 'free' && (isStandardOffDay || isOutsidePattern) && (
                   <div className="absolute top-1 right-1 w-2 h-2 bg-orange-300 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="bg-gray-50 p-6 border-t border-gray-100 flex flex-wrap gap-6 justify-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-tea-600"></span> Ocupado (Serviço)</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-200"></span> Bloqueio Administrativo</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-300"></span> Horário Extra/Folga</div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
