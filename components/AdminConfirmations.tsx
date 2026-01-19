
import React from 'react';
import { Booking, Customer } from '../types';

interface AdminConfirmationsProps {
  bookings: Booking[];
  customers: Customer[];
  onUpdateStatus: (id: string, status: 'scheduled' | 'cancelled' | 'completed') => void;
}

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ bookings, customers, onUpdateStatus }) => {
  const pending = bookings.filter(b => b.status === 'pending');

  const handleAction = (booking: Booking, status: 'scheduled' | 'cancelled') => {
    onUpdateStatus(booking.id, status);
    
    // Opcional: Sugestão de envio de WhatsApp automático
    if (confirm(`Deseja notificar a cliente ${booking.customerName} via WhatsApp agora?`)) {
      const customer = customers.find(c => c.id === booking.customerId);
      const text = status === 'scheduled' 
        ? `Olá ${booking.customerName}! Seu agendamento para ${booking.serviceName} foi CONFIRMADO pelo Studio Moriá Estética para o dia/horário selecionado. Aguardamos você!`
        : `Olá ${booking.customerName}, o Studio Moriá Estética não pôde confirmar seu pedido para ${booking.serviceName} neste horário. Por favor, entre em contato para escolhermos um novo horário.`;
      
      const whatsapp = customer?.whatsapp.replace(/\D/g, '') || '';
      window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-tea-950">Confirmar Agendamentos</h2>
          <p className="text-gray-500 text-sm italic">Análise de novos pedidos vindos do site.</p>
        </div>
        <div className="bg-tea-50 px-6 py-3 rounded-2xl border border-tea-100">
          <p className="text-xs font-bold text-tea-700 uppercase tracking-widest">Pendentes agora: {pending.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pending.map(booking => {
          const customer = customers.find(c => c.id === booking.customerId);
          return (
            <div key={booking.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 group hover:shadow-xl hover:border-tea-100 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-tea-50 rounded-2xl flex items-center justify-center text-tea-600 text-2xl font-serif font-bold shadow-inner">
                  {booking.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{booking.customerName}</h3>
                  <p className="text-sm text-tea-600 font-bold uppercase tracking-widest mb-1">{booking.serviceName}</p>
                  <div className="flex gap-4 text-xs text-gray-400 font-medium">
                    <span>📱 {customer?.whatsapp}</span>
                    <span>🗓️ {new Date(booking.dateTime).toLocaleDateString()} às {new Date(booking.dateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => handleAction(booking, 'scheduled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-tea-600 text-white rounded-2xl font-bold hover:bg-tea-700 transition shadow-lg shadow-tea-100 uppercase tracking-widest text-xs"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => handleAction(booking, 'cancelled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-white border-2 border-red-50 text-red-400 rounded-2xl font-bold hover:bg-red-50 transition uppercase tracking-widest text-xs"
                >
                  Recusar
                </button>
              </div>
            </div>
          );
        })}

        {pending.length === 0 && (
          <div className="py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center">
            <div className="text-6xl mb-6 opacity-30">✅</div>
            <h3 className="text-xl font-serif text-tea-900 mb-2">Tudo em dia!</h3>
            <p className="text-gray-400 max-w-xs mx-auto text-sm italic">Não há novos pedidos de agendamento aguardando confirmação no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConfirmations;
