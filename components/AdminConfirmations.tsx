
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
  onReactivateWaitlist?: (id: string) => void;
}

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ 
  bookings, 
  onUpdateStatus, 
  onUpdateDeposit, 
  onDeleteBooking,
  waitlist = [], 
  onRemoveWaitlist,
  onReactivateWaitlist
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'waitlist' | 'history'>('pending');
  
  const pending = bookings.filter(b => b.status === 'pending');
  const activeWaitlist = waitlist.filter(w => w.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  const cancelledWaitlist = waitlist.filter(w => w.status === 'cancelled');

  const notifyWaitlist = (entry: WaitlistEntry) => {
    const text = `Olá ${entry.customerName}! O Studio Moriá Estética está com uma vaga disponível para ${entry.serviceName}. Você ainda tem interesse? Responda para confirmarmos seu horário!`;
    window.open(`https://wa.me/${entry.customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap gap-3 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Pedidos Pendentes ({pending.length})</button>
        <button onClick={() => setActiveTab('waitlist')} className={`px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'waitlist' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Lista de Espera ({activeWaitlist.length})</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-red-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Histórico / Cancelados</button>
      </div>

      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 gap-6">
          {pending.map(booking => (
            <div key={booking.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 hover:border-tea-200 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-tea-50 rounded-[2rem] flex items-center justify-center text-tea-700 text-3xl font-serif font-bold group-hover:bg-tea-100 transition-colors">{booking.customerName.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{booking.customerName}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] text-tea-600 font-bold uppercase tracking-widest bg-tea-50 px-3 py-1 rounded-full">{booking.serviceName}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-gray-100 px-3 py-1 rounded-full">🗓️ {booking.dateTime}</span>
                    {booking.depositStatus === 'paid' ? (
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold uppercase tracking-widest px-3 py-1 rounded-full">✅ Sinal Pago</span>
                    ) : (
                      <span className="text-[10px] bg-orange-100 text-orange-700 font-bold uppercase tracking-widest px-3 py-1 rounded-full">⏳ Aguardando Sinal</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                {booking.depositStatus !== 'paid' && (
                  <button 
                    onClick={() => onUpdateDeposit(booking.id, 'paid')}
                    className="px-6 py-4 bg-white border-2 border-orange-200 text-orange-700 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-orange-50 transition-all"
                  >
                    Confirmar Sinal
                  </button>
                )}
                <button 
                  onClick={() => {
                    if(booking.depositStatus !== 'paid' && !confirm("O sinal ainda não consta como pago. Deseja confirmar mesmo assim?")) return;
                    onUpdateStatus(booking.id, 'scheduled');
                  }} 
                  className={`px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all ${booking.depositStatus === 'paid' ? 'bg-tea-800 text-white hover:bg-tea-950' : 'bg-gray-200 text-gray-400'}`}
                >
                  Aprovar Agenda
                </button>
                <button onClick={() => onUpdateStatus(booking.id, 'cancelled')} className="px-4 py-4 text-red-300 font-bold uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">Recusar</button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-center py-24 text-gray-300 italic font-serif text-lg">Nenhum pedido aguardando sua análise.</p>}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="grid grid-cols-1 gap-6">
          {activeWaitlist.map(entry => (
            <div key={entry.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-orange-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 text-2xl font-serif font-bold">✨</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{entry.customerName}</h3>
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-widest">Interesse em: {entry.serviceName}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => notifyWaitlist(entry)} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Avisar Vaga 📱</button>
                <button onClick={() => onRemoveWaitlist(entry.id)} className="px-8 py-4 text-gray-300 font-bold uppercase text-[10px] tracking-widest">Remover</button>
              </div>
            </div>
          ))}
          {activeWaitlist.length === 0 && <p className="text-center py-24 text-gray-300 italic">Lista de espera ativa vazia.</p>}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-12">
           <section>
              <h4 className="text-[10px] font-bold text-red-900 uppercase tracking-[0.3em] mb-6 ml-4">Agendamentos Cancelados</h4>
              <div className="grid grid-cols-1 gap-4">
                {cancelledBookings.map(b => (
                  <div key={b.id} className="bg-red-50/20 p-6 rounded-[2rem] border border-red-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl opacity-40">📅</div>
                      <div>
                        <p className="font-bold text-gray-800">{b.customerName}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{b.serviceName} • {b.dateTime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Cancelado em:</p>
                       <p className="text-[10px] text-red-800 font-bold">{b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : 'Não registrado'}</p>
                    </div>
                  </div>
                ))}
                {cancelledBookings.length === 0 && <p className="text-center py-10 text-gray-300 italic text-sm">Nenhum agendamento cancelado.</p>}
              </div>
           </section>

           <section>
              <h4 className="text-[10px] font-bold text-orange-900 uppercase tracking-[0.3em] mb-6 ml-4">Desistências de Lista de Espera</h4>
              <div className="grid grid-cols-1 gap-4">
                {cancelledWaitlist.map(w => (
                  <div key={w.id} className="bg-orange-50/20 p-6 rounded-[2rem] border border-orange-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl opacity-40">✨</div>
                      <div>
                        <p className="font-bold text-gray-800">{w.customerName}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{w.serviceName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right mr-4">
                          <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">Removido em:</p>
                          <p className="text-[10px] text-orange-800 font-bold">{w.cancelledAt ? new Date(w.cancelledAt).toLocaleString() : 'Não registrado'}</p>
                       </div>
                       <button onClick={() => onReactivateWaitlist?.(w.id)} className="px-4 py-2 bg-white text-orange-600 border border-orange-100 rounded-xl text-[8px] font-bold uppercase tracking-widest hover:bg-orange-50 transition-all">Reativar</button>
                    </div>
                  </div>
                ))}
                {cancelledWaitlist.length === 0 && <p className="text-center py-10 text-gray-300 italic text-sm">Nenhuma desistência de espera.</p>}
              </div>
           </section>
        </div>
      )}
    </div>
  );
};

export default AdminConfirmations;
