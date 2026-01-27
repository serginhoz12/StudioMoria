
import React, { useState } from 'react';
import { Booking, Customer, WaitlistEntry } from '../types';

interface AdminConfirmationsProps {
  bookings: Booking[];
  customers: Customer[];
  onUpdateStatus: (id: string, status: 'scheduled' | 'cancelled' | 'completed') => void;
  onUpdateDeposit: (id: string, status: 'paid' | 'pending') => void;
  onDeleteBooking: (id: string) => void;
  waitlist: WaitlistEntry[];
  onRemoveWaitlist: (id: string) => void;
}

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ 
  bookings, 
  onUpdateStatus, 
  onUpdateDeposit, 
  onDeleteBooking,
  waitlist = [], 
  onRemoveWaitlist
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'waitlist' | 'history'>('pending');
  
  const pending = bookings.filter(b => b.status === 'pending');
  const activeWaitlist = waitlist.filter(w => w.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const openWhatsApp = (whatsapp: string, message: string) => {
    const cleanPhone = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap gap-3 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('pending')} className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Pendentes ({pending.length})</button>
        <button onClick={() => setActiveTab('waitlist')} className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'waitlist' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Fila de Espera ({activeWaitlist.length})</button>
        <button onClick={() => setActiveTab('history')} className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-red-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Cancelados</button>
      </div>

      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 gap-6">
          {pending.map(booking => (
            <div key={booking.id} className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-10 hover:border-tea-200 transition-all group relative overflow-hidden">
              {booking.agreedToCancellationPolicy && (
                <div className="absolute top-0 right-10 bg-tea-900 text-white px-6 py-2 rounded-b-2xl text-[8px] font-bold uppercase tracking-[0.2em] shadow-sm">
                  Ciente da Taxa ✓
                </div>
              )}
              
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 bg-tea-50 rounded-[2.5rem] flex items-center justify-center text-tea-700 text-4xl font-serif font-bold group-hover:bg-tea-100 transition-colors">{booking.customerName.charAt(0)}</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-tea-950 font-serif italic">{booking.customerName}</h3>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="text-[10px] text-tea-600 font-bold uppercase tracking-widest bg-tea-50 px-4 py-1.5 rounded-full border border-tea-100">{booking.serviceName}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-gray-100 px-4 py-1.5 rounded-full">🗓️ {booking.dateTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                <button 
                  onClick={() => openWhatsApp(booking.customerWhatsapp || '', `Olá ${booking.customerName}! Aqui é o Studio Moriá. Vimos seu pedido para ${booking.serviceName}. Gostaria de confirmar seu horário?`)}
                  className="p-5 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors"
                >
                  📱
                </button>
                <button 
                  onClick={() => onUpdateStatus(booking.id, 'scheduled')} 
                  className="px-10 py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                >
                  Aprovar Agenda
                </button>
                <button 
                  onClick={() => onUpdateStatus(booking.id, 'cancelled')} 
                  className="px-6 py-5 bg-red-50 text-red-400 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
               <p className="text-gray-300 italic font-serif text-2xl">Nenhum pedido pendente hoje ✨</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="grid grid-cols-1 gap-6 animate-slide-up">
           {activeWaitlist.map(entry => (
             <div key={entry.id} className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-orange-50 flex flex-col md:flex-row justify-between items-center gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-10 bg-orange-500 text-white px-6 py-2 rounded-b-2xl text-[8px] font-bold uppercase tracking-[0.2em]">
                  Fila Ativa ✨
                </div>

                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-orange-50 rounded-[2.5rem] flex items-center justify-center text-orange-600 text-4xl font-serif font-bold">{entry.customerName.charAt(0)}</div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-800">{entry.customerName}</h3>
                    <div className="flex flex-wrap gap-3 mt-2">
                       <span className="text-[10px] text-orange-700 font-bold uppercase tracking-widest bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">{entry.serviceName}</span>
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-gray-100 px-4 py-1.5 rounded-full italic">Preferencia: {entry.preferredDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                   <button 
                     onClick={() => openWhatsApp(entry.customerWhatsapp, `Olá ${entry.customerName}! Aqui é do Studio Moriá. Temos uma vaga para ${entry.serviceName}. Você ainda tem interesse?`)}
                     className="flex-1 px-8 py-5 bg-orange-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                   >
                     📱 Chamar agora
                   </button>
                   <button 
                     onClick={() => onRemoveWaitlist(entry.id)}
                     className="p-5 bg-white border-2 border-gray-100 text-gray-300 rounded-2xl hover:text-red-500 transition-all"
                   >
                     🗑️
                   </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 gap-4">
          {cancelledBookings.map(b => (
            <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border border-red-50 flex justify-between items-center opacity-70">
              <div className="flex items-center gap-6">
                <div className="text-2xl opacity-20">🚫</div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{b.customerName}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{b.serviceName} • {b.dateTime}</p>
                </div>
              </div>
              <button onClick={() => onDeleteBooking(b.id)} className="text-[8px] font-bold text-red-300 uppercase hover:text-red-600 underline">Apagar Registro</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminConfirmations;
