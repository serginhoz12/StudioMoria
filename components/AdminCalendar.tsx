
import React, { useState } from 'react';
import { Booking, Service, TeamMember, SalonSettings } from '../types';

interface AdminCalendarProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  services: Service[];
  teamMembers: TeamMember[];
  settings?: SalonSettings; // Tornando opcional para evitar quebra mas usando se houver
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, setBookings, services, teamMembers, settings }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPro, setSelectedPro] = useState(teamMembers[0]?.id || '');

  const startHour = settings?.businessHours?.start || "08:00";
  const endHour = settings?.businessHours?.end || "19:00";

  const hours = Array.from({ length: 30 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30; // Começa as 07:00
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const blockSlot = (hour: string) => {
    const dateTime = `${selectedDate} ${hour}`;
    const pro = teamMembers.find(m => m.id === selectedPro);
    if (!pro) return;

    // Verifica se já existe algo
    if (bookings.some(b => b.teamMemberId === selectedPro && b.dateTime === dateTime && b.status !== 'cancelled')) return;

    // FIX: Added missing depositStatus property
    const newBlocked: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: 'admin-block',
      customerName: 'HORÁRIO BLOQUEADO',
      serviceId: 'block',
      serviceName: 'Indisponível (Folga/Pausa)',
      teamMemberId: selectedPro,
      teamMemberName: pro.name,
      dateTime: dateTime,
      status: 'blocked',
      depositStatus: 'paid'
    };
    setBookings(prev => [...prev, newBlocked]);
  };

  const massBlock = (type: 'day' | 'morning' | 'afternoon') => {
    const pro = teamMembers.find(m => m.id === selectedPro);
    if (!pro) return;

    let targetHours: string[] = [];
    if (type === 'day') targetHours = hours;
    if (type === 'morning') targetHours = hours.filter(h => h < "12:00");
    if (type === 'afternoon') targetHours = hours.filter(h => h >= "12:00");

    // FIX: Added missing depositStatus property
    const newBlocks: Booking[] = targetHours
      .filter(hour => !bookings.some(b => b.teamMemberId === selectedPro && b.dateTime === `${selectedDate} ${hour}` && b.status !== 'cancelled'))
      .map(hour => ({
        id: Math.random().toString(36).substr(2, 9),
        customerId: 'admin-block',
        customerName: 'HORÁRIO BLOQUEADO',
        serviceId: 'block',
        serviceName: 'Bloqueio em Massa',
        teamMemberId: selectedPro,
        teamMemberName: pro.name,
        dateTime: `${selectedDate} ${hour}`,
        status: 'blocked',
        depositStatus: 'paid'
      }));

    setBookings(prev => [...prev, ...newBlocks]);
    alert(`Bloqueio de ${type === 'day' ? 'dia inteiro' : type === 'morning' ? 'manhã' : 'tarde'} realizado!`);
  };

  const removeBlock = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Data Agenda</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-3 bg-gray-50 border-2 border-transparent focus:border-tea-200 rounded-xl outline-none text-sm font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Profissional</label>
            <select value={selectedPro} onChange={(e) => setSelectedPro(e.target.value)} className="p-3 bg-gray-50 border-2 border-transparent focus:border-tea-200 rounded-xl outline-none text-sm font-bold">
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => massBlock('morning')} className="px-4 py-2 bg-tea-50 text-tea-700 text-[10px] font-bold rounded-lg hover:bg-tea-100 transition-all uppercase tracking-widest border border-tea-100">Bloquear Manhã</button>
          <button onClick={() => massBlock('afternoon')} className="px-4 py-2 bg-tea-50 text-tea-700 text-[10px] font-bold rounded-lg hover:bg-tea-100 transition-all uppercase tracking-widest border border-tea-100">Bloquear Tarde</button>
          <button onClick={() => massBlock('day')} className="px-4 py-2 bg-tea-800 text-white text-[10px] font-bold rounded-lg hover:bg-tea-950 transition-all uppercase tracking-widest shadow-lg shadow-tea-100">Bloquear Dia Inteiro</button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        <div className="bg-gray-50 px-8 py-3 flex justify-between items-center">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grade de Horários</span>
           <span className="text-[10px] font-bold text-tea-600 uppercase tracking-widest">Funcionamento: {startHour} - {endHour}</span>
        </div>
        
        {hours.map(hour => {
          const booking = bookings.find(b => b.teamMemberId === selectedPro && b.dateTime === `${selectedDate} ${hour}` && b.status !== 'cancelled');
          const isOutsideHours = hour < startHour || hour >= endHour;
          
          return (
            <div key={hour} className={`flex items-center p-6 transition-all ${isOutsideHours ? 'bg-gray-50/40 opacity-60' : 'hover:bg-gray-50/30'}`}>
              <div className="w-24 font-serif font-bold text-tea-900 text-lg border-r border-gray-100 pr-6 relative">
                 {hour}
                 {isOutsideHours && <span className="absolute -bottom-4 left-0 text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Extra-Expediente</span>}
              </div>
              <div className="flex-grow pl-8">
                {booking ? (
                  <div className={`p-5 rounded-[1.5rem] flex justify-between items-center shadow-sm ${booking.status === 'blocked' ? 'bg-white border-2 border-gray-100' : 'bg-tea-50 border-l-4 border-tea-600'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                         <p className={`font-bold text-sm ${booking.status === 'blocked' ? 'text-gray-400 italic' : 'text-tea-950'}`}>{booking.customerName}</p>
                         {booking.status === 'blocked' && <span className="text-[8px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">BLOQUEADO</span>}
                      </div>
                      <p className="text-[10px] text-tea-700 font-medium uppercase tracking-tight mt-0.5">{booking.serviceName}</p>
                    </div>
                    <div className="flex gap-2">
                       {booking.status === 'blocked' ? (
                         <button onClick={() => removeBlock(booking.id)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-bold text-tea-600 hover:border-tea-300 transition-all uppercase tracking-widest shadow-sm">Liberar Vaga</button>
                       ) : (
                         <div className="text-right">
                           <p className="text-[9px] font-bold text-tea-500 uppercase tracking-widest">Agendamento Ativo</p>
                           <p className="text-[8px] text-gray-400">Status: {booking.status}</p>
                         </div>
                       )}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => blockSlot(hour)} 
                    className={`w-full text-left py-5 px-8 border-2 border-dashed rounded-[1.5rem] text-[10px] font-medium uppercase tracking-widest transition-all ${isOutsideHours ? 'border-gray-200 text-gray-300' : 'border-gray-50 text-gray-400 hover:border-tea-100 hover:text-tea-600 hover:bg-white'}`}
                  >
                    {isOutsideHours ? '🚫 Horário Fora de Funcionamento • Clique para Bloquear' : '➕ Horário Livre • Clique para Bloquear'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCalendar;
