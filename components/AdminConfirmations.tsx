
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
            <div key={booking.id} className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-10 hover:border-tea-200 transition-all group relative overflow-hidden">
              {/* Selo de Ciência da Política */}
              {booking.agreedToCancellationPolicy && (
                <div className="absolute top-0 right-10 bg-tea-900 text-white px-6 py-1.5 rounded-b-2xl text-[8px] font-bold uppercase tracking-[0.2em] shadow-sm">
                  Ciente da Taxa ✓
                </div>
              )}
              
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 bg-tea-50 rounded-[2.5rem] flex items-center justify-center text-tea-700 text-4xl font-serif font-bold group-hover:bg-tea-100 transition-colors">{booking.customerName.charAt(0)}</div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-800">{booking.customerName}</h3>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="text-[10px] text-tea-600 font-bold uppercase tracking-widest bg-tea-50 px-4 py-1.5 rounded-full border border-tea-100">{booking.serviceName}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-gray-100 px-4 py-1.5 rounded-full">🗓️ {booking.dateTime}</span>
                  </div>
                  {booking.policyAgreedAt && (
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic pt-2">
                      Aceitou política em: {new Date(booking.policyAgreedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                {booking.depositStatus !== 'paid' && (
                  <button 
                    onClick={() => onUpdateDeposit(booking.id, 'paid')}
                    className="px-8 py-4 bg-white border-2 border-orange-200 text-orange-700 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-orange-50 transition-all"
                  >
                    Confirmar Sinal
                  </button>
                )}
                <button 
                  onClick={() => onUpdateStatus(booking.id, 'scheduled')} 
                  className={`px-10 py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all ${booking.depositStatus === 'paid' ? 'bg-tea-800 text-white hover:bg-tea-950' : 'bg-gray-200 text-gray-400'}`}
                >
                  Aprovar Agenda
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-center py-24 text-gray-300 italic font-serif text-lg">Nenhum pedido aguardando sua análise.</p>}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-12">
           <section>
              <h4 className="text-[10px] font-bold text-red-900 uppercase tracking-[0.3em] mb-6 ml-4">Cancelados (Histórico para Auditoria)</h4>
              <div className="grid grid-cols-1 gap-4">
                {cancelledBookings.map(b => (
                  <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border border-red-50 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="text-3xl opacity-20">🚫</div>
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{b.customerName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{b.serviceName} • {b.dateTime}</p>
                        {b.agreedToCancellationPolicy && (
                          <p className="text-[8px] text-red-600 font-bold uppercase tracking-widest mt-1">Ciente da Retenção de 15% ✓</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Data do Cancelamento:</p>
                       <p className="text-[10px] text-red-800 font-bold">{b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : 'Não registrado'}</p>
                    </div>
                  </div>
                ))}
              </div>
           </section>
        </div>
      )}
    </div>
  );
};

export default AdminConfirmations;
