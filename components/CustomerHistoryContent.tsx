
import React, { useState } from 'react';
import { Customer, Booking, Transaction, WaitlistEntry, Service } from '../types';

interface CustomerHistoryContentProps {
  customer: Customer;
  bookings: Booking[];
  transactions: Transaction[];
  waitlist: WaitlistEntry[];
  services?: Service[];
  onUpdateBooking?: (id: string, data: Partial<Booking>) => void;
  onUpdateTransaction?: (id: string, data: Partial<Transaction>) => void;
}

const CustomerHistoryContent: React.FC<CustomerHistoryContentProps> = ({ customer, bookings, transactions, waitlist, services = [], onUpdateBooking, onUpdateTransaction }) => {
  const myBookings = bookings.filter(b => b.customerId === customer.id).sort((a,b) => new Date(b.dateTime.replace(' ', 'T')).getTime() - new Date(a.dateTime.replace(' ', 'T')).getTime());
  const myTransactions = transactions.filter(t => t.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myWaitlist = waitlist.filter(w => w.customerId === customer.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const totalSpent = myTransactions.filter(t => t.type === 'receivable' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
  const totalVisits = myBookings.filter(b => b.status === 'completed').length;

  const canEdit = Boolean(onUpdateBooking || onUpdateTransaction);

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
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">🗓️ {booking.dateTime} {booking.teamMemberName ? `• 👤 ${booking.teamMemberName}` : ''}</p>
                  {booking.rescheduledCount ? <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded italic">Remarcado {booking.rescheduledCount}x</span> : null}
                </div>
                {(booking.status === 'completed' && (booking.paymentReceived != null || booking.finalPrice != null)) && (
                  <p className="text-[10px] text-tea-600 font-bold mt-1">Valor: R$ {(booking.paymentReceived ?? booking.finalPrice ?? 0).toFixed(2)}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {canEdit && onUpdateBooking && (
                  <button onClick={() => setEditingBooking(booking)} className="p-2 bg-tea-50 text-tea-700 rounded-xl hover:bg-tea-100 transition-colors text-xs font-bold uppercase tracking-widest" title="Editar atendimento">✏️ Editar</button>
                )}
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

      {/* Modal Editar Atendimento */}
      {editingBooking && onUpdateBooking && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl space-y-6">
            <h3 className="text-xl font-serif font-bold text-tea-950 italic">Editar atendimento</h3>
            <div className="space-y-4">
              {services.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Procedimento</label>
                  <select
                    value={editingBooking.serviceId}
                    onChange={e => {
                      const s = services.find(sv => sv.id === e.target.value);
                      setEditingBooking({ ...editingBooking, serviceId: e.target.value, serviceName: s?.name ?? editingBooking.serviceName });
                    }}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                  >
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Data e hora</label>
                <input
                  type="datetime-local"
                  value={(editingBooking.dateTime || '').replace(' ', 'T').slice(0, 16) || new Date().toISOString().slice(0, 16)}
                  onChange={e => setEditingBooking({ ...editingBooking, dateTime: e.target.value.replace('T', ' ') })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Valor cobrado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBooking.paymentReceived ?? editingBooking.finalPrice ?? ''}
                  onChange={e => setEditingBooking({ ...editingBooking, paymentReceived: parseFloat(e.target.value) || 0, finalPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Status</label>
                <select
                  value={editingBooking.status}
                  onChange={e => setEditingBooking({ ...editingBooking, status: e.target.value as Booking['status'] })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                >
                  <option value="pending">Pendente</option>
                  <option value="scheduled">Agendado</option>
                  <option value="completed">Finalizado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const payload = { serviceId: editingBooking.serviceId, serviceName: editingBooking.serviceName, dateTime: editingBooking.dateTime, paymentReceived: editingBooking.paymentReceived, finalPrice: editingBooking.finalPrice, status: editingBooking.status };
                  onUpdateBooking(editingBooking.id, payload);
                  const valor = editingBooking.paymentReceived ?? editingBooking.finalPrice ?? 0;
                  const linkedTrans = myTransactions.find(t => t.bookingId === editingBooking.id);
                  if (linkedTrans && onUpdateTransaction) {
                    onUpdateTransaction(linkedTrans.id, { amount: valor, description: `Atendimento: ${editingBooking.serviceName || linkedTrans.serviceName} - ${customer.name}`, serviceName: editingBooking.serviceName });
                  }
                  setEditingBooking(null);
                }}
                className="flex-1 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-950"
              >
                Salvar
              </button>
              <button onClick={() => setEditingBooking(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Pagamentos */}
      <section>
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Histórico de Pagamentos</h4>
        <div className="space-y-3">
          {myTransactions.map(trans => (
            <div key={trans.id} className="flex justify-between p-6 bg-gray-50/30 rounded-[2rem] items-center border border-gray-50 hover:border-tea-100 transition-all group">
              <div>
                <p className="font-bold text-tea-900 text-sm">{trans.description}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{new Date(trans.date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && onUpdateTransaction && (
                  <button onClick={() => setEditingTransaction(trans)} className="p-2 bg-tea-50 text-tea-700 rounded-xl hover:bg-tea-100 transition-colors text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100" title="Editar lançamento">✏️ Editar</button>
                )}
                <div className="text-right">
                  <p className={`font-bold text-sm ${trans.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                    {trans.type === 'receivable' ? '+' : '-'} R$ {trans.amount.toFixed(2)}
                  </p>
                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${trans.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {trans.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {myTransactions.length === 0 && (
            <p className="text-center py-10 text-gray-300 italic text-xs">Sem movimentações financeiras registradas.</p>
          )}
        </div>
      </section>

      {/* Modal Editar Pagamento */}
      {editingTransaction && onUpdateTransaction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl space-y-6">
            <h3 className="text-xl font-serif font-bold text-tea-950 italic">Editar lançamento</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingTransaction.description}
                  onChange={e => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTransaction.amount}
                  onChange={e => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Data</label>
                <input
                  type="date"
                  value={editingTransaction.date?.slice(0, 10) ?? ''}
                  onChange={e => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Status</label>
                <select
                  value={editingTransaction.status}
                  onChange={e => setEditingTransaction({ ...editingTransaction, status: e.target.value as 'paid' | 'pending' })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-gray-100"
                >
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onUpdateTransaction!(editingTransaction.id, { description: editingTransaction.description, amount: editingTransaction.amount, date: editingTransaction.date, status: editingTransaction.status });
                  const linkedBooking = editingTransaction.bookingId ? myBookings.find(b => b.id === editingTransaction.bookingId) : null;
                  if (linkedBooking && onUpdateBooking) {
                    onUpdateBooking(linkedBooking.id, { paymentReceived: editingTransaction.amount, finalPrice: editingTransaction.amount });
                  }
                  setEditingTransaction(null);
                }}
                className="flex-1 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-950"
              >
                Salvar
              </button>
              <button onClick={() => setEditingTransaction(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
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
