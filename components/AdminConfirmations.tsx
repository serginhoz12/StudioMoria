
import React, { useState } from 'react';
import { Booking, Customer, WaitlistEntry } from '../types';

interface AdminConfirmationsProps {
  bookings: Booking[];
  customers: Customer[];
  onUpdateStatus: (id: string, status: 'scheduled' | 'cancelled' | 'completed') => void;
  waitlist: WaitlistEntry[];
  onRemoveWaitlist: (id: string) => void;
}

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ bookings, customers, onUpdateStatus, waitlist = [], onRemoveWaitlist }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'waitlist'>('pending');
  const pending = bookings.filter(b => b.status === 'pending');

  const notifyWaitlist = (entry: WaitlistEntry) => {
    const text = `Olá ${entry.customerName}! O Studio Moriá Estética está com uma vaga disponível para ${entry.serviceName}. Você ainda tem interesse? Responda para confirmarmos seu horário!`;
    const wa = entry.customerWhatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center gap-4 border-b border-gray-100 pb-4">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('pending')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all ${activeTab === 'pending' ? 'bg-tea-800 text-white' : 'bg-gray-100 text-gray-400'}`}>Pedidos Pendentes ({pending.length})</button>
          <button onClick={() => setActiveTab('waitlist')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all ${activeTab === 'waitlist' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'}`}>Lista de Espera ({waitlist.length})</button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="grid grid-cols-1 gap-6">
          {pending.map(booking => (
            <div key={booking.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 hover:border-tea-200 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-tea-50 rounded-2xl flex items-center justify-center text-tea-600 text-2xl font-serif font-bold">{booking.customerName.charAt(0)}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{booking.customerName}</h3>
                  <p className="text-sm text-tea-600 font-bold uppercase tracking-widest">{booking.serviceName}</p>
                  <p className="text-xs text-gray-400 font-medium">🗓️ {booking.dateTime}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => onUpdateStatus(booking.id, 'scheduled')} className="px-8 py-4 bg-tea-600 text-white rounded-2xl font-bold uppercase text-xs">Confirmar</button>
                <button onClick={() => onUpdateStatus(booking.id, 'cancelled')} className="px-8 py-4 bg-white border-2 border-red-50 text-red-400 rounded-2xl font-bold uppercase text-xs">Recusar</button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-center py-20 text-gray-400 italic">Nenhum pedido pendente.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {waitlist.map(entry => (
            <div key={entry.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-orange-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 text-2xl font-serif font-bold">✨</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{entry.customerName}</h3>
                  <p className="text-sm text-orange-600 font-bold uppercase tracking-widest">Interesse: {entry.serviceName}</p>
                  <p className="text-xs text-gray-400 font-medium tracking-tight">Data de interesse: {new Date(entry.preferredDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => notifyWaitlist(entry)} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold uppercase text-xs shadow-lg shadow-orange-100">Avisar Vaga 📱</button>
                <button onClick={() => onRemoveWaitlist(entry.id)} className="px-8 py-4 text-gray-300 font-bold uppercase text-xs">Remover</button>
              </div>
            </div>
          ))}
          {waitlist.length === 0 && <p className="text-center py-20 text-gray-400 italic">Lista de espera vazia.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminConfirmations;
