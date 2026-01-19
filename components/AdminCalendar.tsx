
import React, { useState } from 'react';
import { Booking, Service } from '../types';

interface AdminCalendarProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  services: Service[];
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ bookings, setBookings, services }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleData, setRescheduleData] = useState<{id: string, newDate: string} | null>(null);

  const hours = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`);

  const toggleStatus = (id: string) => {
    setBookings(prev => prev.map(b => 
      b.id === id ? { ...b, status: b.status === 'completed' ? 'scheduled' : 'completed' } : b
    ));
  };

  const handleReschedule = (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const newDateTime = prompt("Digite a nova data e hora (AAAA-MM-DD HH:MM):", booking.dateTime);
    if (newDateTime && newDateTime !== booking.dateTime) {
      setBookings(prev => prev.map(b => 
        b.id === id ? { 
          ...b, 
          dateTime: newDateTime, 
          rescheduledCount: (b.rescheduledCount || 0) + 1 
        } : b
      ));
      alert("Horário alterado com sucesso! O histórico da cliente foi atualizado.");
    }
  };

  const removeBooking = (id: string) => {
    if(confirm("Deseja realmente cancelar este agendamento? Isso contará como cancelamento no histórico da cliente.")) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Agenda Diária</h2>
          <p className="text-sm text-gray-400">Gerencie horários e remarque atendimentos.</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-tea-200 shadow-sm"
        />
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-gray-50">
          {hours.map((hour) => {
            const bookingAtHour = bookings.find(b => 
              (b.status === 'scheduled' || b.status === 'completed') && 
              b.dateTime.includes(hour) && 
              b.dateTime.startsWith(selectedDate)
            );
            
            return (
              <div key={hour} className="flex p-6 hover:bg-gray-50/50 transition min-h-[120px]">
                <div className="w-24 pt-1 border-r border-gray-50 mr-6">
                  <span className="text-lg font-serif font-bold text-tea-900">{hour}</span>
                </div>
                <div className="flex-grow">
                  {bookingAtHour ? (
                    <div className={`p-5 rounded-2xl border-l-4 shadow-sm flex justify-between items-center ${bookingAtHour.status === 'completed' ? 'bg-gray-50 border-gray-300' : 'bg-tea-50 border-tea-500'}`}>
                      <div>
                        <p className={`font-bold text-lg ${bookingAtHour.status === 'completed' ? 'text-gray-400 line-through' : 'text-tea-950'}`}>
                          {bookingAtHour.customerName}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                           <p className="text-xs font-bold text-tea-700 uppercase tracking-tighter">{bookingAtHour.serviceName}</p>
                           {bookingAtHour.rescheduledCount && bookingAtHour.rescheduledCount > 0 && (
                             <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                               Remarcado {bookingAtHour.rescheduledCount}x
                             </span>
                           )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleReschedule(bookingAtHour.id)}
                          className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-tea-50 text-tea-600 transition shadow-sm"
                          title="Remarcar Horário"
                        >
                          🔄
                        </button>
                        <button 
                          onClick={() => toggleStatus(bookingAtHour.id)}
                          className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-green-50 text-green-600 transition shadow-sm"
                          title="Concluir"
                        >
                          {bookingAtHour.status === 'completed' ? '↩️' : '✅'}
                        </button>
                        <button 
                          onClick={() => removeBooking(bookingAtHour.id)}
                          className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-red-50 text-red-500 transition shadow-sm"
                          title="Cancelar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center border-2 border-dashed border-gray-100 rounded-2xl px-6 text-gray-300 text-sm italic font-light">
                      Livre para novos agendamentos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
