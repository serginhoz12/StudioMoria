
import React from 'react';
import { Customer, Booking, Transaction, WaitlistEntry } from '../types';

interface CustomerHistoryContentProps {
  customer: Customer;
  bookings: Booking[];
  transactions: Transaction[];
  waitlist: WaitlistEntry[];
  onUpdatePrice?: (bookingId: string, newPrice: number) => Promise<void>;
}

const CustomerHistoryContent: React.FC<CustomerHistoryContentProps> = ({ customer, bookings, transactions, waitlist, onUpdatePrice }) => {
  const myBookings = bookings.filter(b => b.customerId === customer.id && !(b.status === 'cancelled' && b.cancelledBy === 'admin')).sort((a,b) => new Date(b.dateTime.replace(' ', 'T')).getTime() - new Date(a.dateTime.replace(' ', 'T')).getTime());
  const myTransactions = transactions
    .filter(t => t.customerId === customer.id && t.category !== 'Abatimento' && !t.parentTransactionId)
    .sort((a,b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
  const myWaitlist = waitlist.filter(w => w.customerId === customer.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSpent = myTransactions
    .filter(t => t.type === 'receivable')
    .reduce((acc, t) => acc + (t.paidAmount || (t.status === 'paid' ? t.amount : 0)), 0);
  const totalVisits = myBookings.filter(b => b.status === 'completed').length;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-tea-50 p-8 rounded-[2.5rem] border border-tea-100 shadow-sm">
          <p className="text-[10px] font-bold text-tea-700 uppercase tracking-widest mb-2">Total em Procedimentos</p>
          <p className="text-3xl font-serif font-bold text-tea-900">R$ {totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Frequência Total</p>
          <p className="text-3xl font-serif font-bold text-gray-900">{totalVisits} Visitas</p>
        </div>
      </div>

      {/* Histórico de Atendimentos */}
      <section>
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Histórico Moriá</h4>
        <div className="space-y-4">
          {myBookings.map(booking => (
            <div key={booking.id} className="flex justify-between p-8 bg-white border border-gray-50 rounded-[2.5rem] items-center hover:border-tea-100 transition-all shadow-sm group/item">
              <div>
                <p className="font-bold text-tea-950 text-lg leading-tight">{booking.serviceName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      🗓️ {booking.dateTime.replace(/\[object Object\]/gi, '').trim()} 
                      {booking.originalPrice ? ` • R$ ${booking.originalPrice.toFixed(2)}` : ''}
                      {booking.teamMemberName ? ` • 👤 ${booking.teamMemberName}` : ''}
                    </p>
                    {onUpdatePrice && (
                      <button 
                        onClick={() => {
                          const newPrice = prompt("Novo valor para este procedimento:", booking.originalPrice?.toString());
                          if (newPrice !== null && !isNaN(Number(newPrice))) {
                            onUpdatePrice(booking.id, Number(newPrice));
                          }
                        }}
                        className="text-[8px] text-tea-600 font-bold uppercase hover:underline bg-tea-50 px-2 py-0.5 rounded"
                      >
                        Ajustar Valor
                      </button>
                    )}
                  </div>
                  {booking.paymentMethod && (
                    <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest bg-tea-50 px-2 py-0.5 rounded">
                      💳 {booking.paymentMethod === 'pix' ? 'PIX' : booking.paymentMethod === 'debit' ? 'Débito' : 'Crédito'}
                      {booking.paymentType === 'installments' && ` (${booking.installmentsCount}x)`}
                    </p>
                  )}
                  {booking.rescheduledCount ? <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded italic">Remarcado {booking.rescheduledCount}x</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : 
                  booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 
                  'bg-tea-900 text-white'
                }`}>
                  {booking.status === 'completed' ? 'Finalizado' : booking.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                </span>
              </div>
            </div>
          ))}
          {myBookings.length === 0 && (
            <p className="text-center py-10 text-gray-300 italic">Sem agendamentos registrados.</p>
          )}
        </div>
      </section>

      {/* Histórico de Pagamentos */}
      <section>
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Histórico de Pagamentos</h4>
        <div className="space-y-3">
          {myTransactions.map(trans => (
            <div key={trans.id} className="flex justify-between p-6 bg-gray-50/30 rounded-[2rem] items-center border border-gray-50 hover:border-tea-100 transition-all">
              <div>
                <p className="font-bold text-tea-900 text-sm">{trans.description}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{new Date(trans.date + 'T00:00:00').toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${trans.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                  {trans.type === 'receivable' ? '+' : '-'} R$ {trans.amount.toFixed(2)}
                </p>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${trans.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {trans.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                  {trans.status === 'pending' && trans.paidAmount && trans.paidAmount > 0 && (
                    <span className="text-[8px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                      Pago: R$ {trans.paidAmount.toFixed(2)} | Resta: R$ {(trans.amount - trans.paidAmount).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {myTransactions.length === 0 && (
            <p className="text-center py-10 text-gray-300 italic text-xs">Sem movimentações financeiras registradas.</p>
          )}
        </div>
      </section>

      {/* Histórico de Produtos */}
      {customer.productHistory && customer.productHistory.length > 0 && (
        <section>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Produtos Adquiridos</h4>
          <div className="space-y-4">
            {customer.productHistory.sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).map(sale => (
              <div key={sale.id} className="flex justify-between p-6 bg-white border border-gray-50 rounded-[2rem] items-center hover:border-tea-100 transition-all shadow-sm">
                <div className="flex-1">
                  <p className="font-bold text-tea-950 text-sm leading-tight">{sale.productName}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      💰 R$ {sale.price.toFixed(2)} • 📦 Qtd: {sale.quantity} • 🗓️ Compra: {new Date(sale.saleDate + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                  {sale.expiryDate && (
                    <p className={`text-[9px] font-bold uppercase mt-1 ${new Date(sale.expiryDate).getTime() < new Date().getTime() + (15 * 24 * 60 * 60 * 1000) ? 'text-red-500' : 'text-orange-600'}`}>
                      ⚠️ Vencimento do Produto: {new Date(sale.expiryDate + 'T00:00:00').toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 bg-tea-50 text-tea-700 rounded-xl flex items-center justify-center text-lg">
                  🛍️
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Histórico de Lista de Espera */}
      {myWaitlist.length > 0 && (
        <section>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Histórico em Lista de Espera</h4>
          <div className="space-y-3">
            {myWaitlist.map(w => (
              <div key={w.id} className="flex justify-between items-center p-6 bg-tea-50/20 border border-tea-50 rounded-[2rem]">
                <div>
                  <p className="font-bold text-tea-900 text-sm">{w.serviceName}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">🗓️ Preferência: {w.preferredDate}</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                  w.status === 'active' ? 'bg-tea-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {w.status === 'active' ? 'Aguardando' : 'Concluído/Removido'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomerHistoryContent;
