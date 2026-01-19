
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

  // Gera horários de 30 em 30 min das 07:00 as 21:00 para controle total
  const timeSlots = Array.from({ length: 29 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30; 
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const toggleSlot = async (hour: string) => {
    const dateTime = `${selectedDate} ${hour}`;
    if (!selectedPro) return;

    const existing = bookings.find(b => 
      b.teamMemberId === selectedProId && 
      b.dateTime === dateTime && 
      b.status !== 'cancelled'
    );

    if (existing) {
      if (existing.status === 'blocked') {
        // Se estava bloqueado, libera (deleta o registro de bloqueio)
        await deleteDoc(doc(db, "bookings", existing.id));
      } else {
        // Se for um agendamento real, não permite alternar por aqui para evitar erros
        alert("Este horário possui um agendamento. Use a aba de Confirmações para gerenciar o cliente.");
      }
    } else {
      // Se estava livre, bloqueia
      const newBlocked = {
        customerId: 'admin-block',
        customerName: 'HORÁRIO BLOQUEADO',
        serviceId: 'block',
        serviceName: 'Indisponível (Pausa/Bloqueio)',
        teamMemberId: selectedProId,
        teamMemberName: selectedPro.name,
        dateTime: dateTime,
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
      const dateTime = `${selectedDate} ${hour}`;
      const existing = bookings.find(b => b.teamMemberId === selectedProId && b.dateTime === dateTime && b.status !== 'cancelled');

      if (action === 'block' && !existing) {
        await addDoc(collection(db, "bookings"), {
          customerId: 'admin-block',
          customerName: 'HORÁRIO BLOQUEADO',
          serviceId: 'block',
          serviceName: 'Bloqueio em Massa',
          teamMemberId: selectedProId,
          teamMemberName: selectedPro.name,
          dateTime: dateTime,
          status: 'blocked',
          depositStatus: 'paid'
        });
      } else if (action === 'open' && existing?.status === 'blocked') {
        await deleteDoc(doc(db, "bookings", existing.id));
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 px-2 md:px-0">
      {/* Cabeçalho de Controle */}
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
              <p className="text-orange-800 font-bold text-sm uppercase">Atenção: Hoje é folga padrão de {selectedPro.name}</p>
              <p className="text-orange-600 text-[10px] font-medium leading-tight">A agenda para clientes está fechada. Você pode abrir horários específicos clicando neles abaixo se desejar realizar um atendimento extra.</p>
            </div>
          </div>
        )}
      </div>

      {/* Grade de Horários Estilo Seletor */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-tea-900 text-white px-8 py-5 flex justify-between items-center">
           <div>
              <h3 className="font-serif font-bold italic text-lg">Gestão de Disponibilidade</h3>
              <p className="text-[9px] uppercase tracking-[0.2em] text-tea-300">Toque em um horário para abrir ou fechar</p>
           </div>
           <div className="hidden md:flex gap-6 items-center">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/20 border border-white/40"></div> <span className="text-[9px] font-bold uppercase">Livre</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-tea-500"></div> <span className="text-[9px] font-bold uppercase">Agendado</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"></div> <span className="text-[9px] font-bold uppercase">Fechado</span></div>
           </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-8">
          {timeSlots.map(hour => {
            const booking = bookings.find(b => b.teamMemberId === selectedProId && b.dateTime === `${selectedDate} ${hour}` && b.status !== 'cancelled');
            
            const isBlocked = booking?.status === 'blocked';
            const isScheduled = booking && booking.status !== 'blocked';
            const proStart = selectedPro?.businessHours?.start || startHour;
            const proEnd = selectedPro?.businessHours?.end || endHour;
            const isOutsidePattern = hour < proStart || hour >= proEnd;
            const isStandardOffDay = selectedPro?.offDays?.includes(dayOfWeek);

            // Definindo se está efetivamente livre para o cliente
            const isEffectivelyFree = !booking && !isStandardOffDay && !isOutsidePattern;

            return (
              <button
                key={hour}
                onClick={() => toggleSlot(hour)}
                className={`relative group p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                  isScheduled 
                    ? 'bg-tea-600 border-tea-600 text-white cursor-default' 
                    : isBlocked || isStandardOffDay || isOutsidePattern 
                      ? 'bg-gray-50 border-gray-100 text-gray-400 hover:border-tea-200' 
                      : 'bg-white border-tea-50 text-tea-900 hover:border-tea-400 shadow-sm'
                }`}
              >
                <span className="text-xl font-serif font-bold italic leading-none">{hour}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                  {isScheduled ? 'Agendado' : isBlocked ? 'Fechado' : isEffectivelyFree ? 'Livre' : 'Inativo'}
                </span>

                {/* Badge de Horário Especial (fora do turno padrão mas aberto) */}
                {!booking && (isStandardOffDay || isOutsidePattern) && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white shadow-sm" title="Horário fora do padrão/folga"></div>
                )}
                
                {/* Hover Indicator */}
                {!isScheduled && (
                  <div className="absolute inset-0 bg-tea-900/5 opacity-0 group-hover:opacity-100 rounded-[inherit] transition-opacity"></div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="bg-gray-50 p-6 border-t border-gray-100 flex flex-wrap gap-6 justify-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Horário Extra / Folga</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-tea-600"></span> Cliente Confirmado</div>
           <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-200"></span> Bloqueio Administrativo</div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
