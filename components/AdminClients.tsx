
import React, { useState } from 'react';
import { Customer, Booking, Transaction } from '../types';

interface AdminClientsProps {
  customers: Customer[];
  bookings: Booking[];
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Customer>) => void;
}

const AdminClients: React.FC<AdminClientsProps> = ({ customers, bookings, transactions, onDelete, onUpdate }) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Customer>>({});

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.whatsapp.includes(search) ||
    c.cpf.includes(search)
  );

  const handleEditClick = () => {
    if (selectedCustomer) {
      setEditData({ name: selectedCustomer.name, whatsapp: selectedCustomer.whatsapp, cpf: selectedCustomer.cpf });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedCustomer && editData.name && editData.whatsapp && editData.cpf) {
      onUpdate(selectedCustomer.id, editData);
      setSelectedCustomer({ ...selectedCustomer, ...editData });
      setIsEditing(false);
    }
  };

  const handleDeleteClick = () => {
    if (selectedCustomer) {
      onDelete(selectedCustomer.id);
      setSelectedCustomer(null);
    }
  };

  // Cálculo de histórico e métricas EXCLUSIVAS ADMIN
  const getClientStats = (customerId: string) => {
    const myBookings = bookings.filter(b => b.customerId === customerId);
    const myTransactions = transactions.filter(t => t.customerId === customerId);

    const cancelledCount = myBookings.filter(b => b.status === 'cancelled').length;
    const reschedules = myBookings.reduce((sum, b) => sum + (b.rescheduledCount || 0), 0);
    
    // Lógica rigorosa de atraso: compara data de pagamento real com vencimento
    const latePayments = myTransactions.filter(t => {
      if (t.status === 'paid' && t.dueDate && t.paidAt) {
        const dDate = new Date(t.dueDate);
        dDate.setHours(0,0,0,0);
        const pDate = new Date(t.paidAt);
        pDate.setHours(0,0,0,0);
        return pDate > dDate;
      }
      return false;
    }).length;

    const paid = myTransactions
      .filter(t => t.status === 'paid' && t.type === 'receivable')
      .reduce((sum, t) => sum + t.amount, 0);
    const pending = myTransactions
      .filter(t => t.status === 'pending' && t.type === 'receivable')
      .reduce((sum, t) => sum + t.amount, 0);

    return { paid, pending, cancelledCount, reschedules, latePayments };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-tea-950">Gestão de Clientes</h2>
          <p className="text-gray-500 text-sm">Visualize o comportamento e histórico das clientes.</p>
        </div>
        <div className="relative w-full md:w-80">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            placeholder="Nome, WhatsApp ou CPF..." 
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-2xl outline-none focus:border-tea-200 transition-all bg-white shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Clientes */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
          <div className="p-6 bg-tea-50 border-b border-tea-100">
            <h3 className="font-bold text-tea-900 uppercase text-[10px] tracking-widest">Base de Dados ({filtered.length})</h3>
          </div>
          <div className="overflow-y-auto flex-grow custom-scroll divide-y divide-gray-50">
            {filtered.map(customer => {
              const stats = getClientStats(customer.id);
              const hasAlert = stats.cancelledCount > 2 || stats.latePayments > 1;
              return (
                <div 
                  key={customer.id} 
                  onClick={() => { setSelectedCustomer(customer); setIsEditing(false); }}
                  className={`p-6 cursor-pointer hover:bg-tea-50/50 transition-all group ${selectedCustomer?.id === customer.id ? 'bg-tea-50 border-l-4 border-tea-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 group-hover:text-tea-700 transition-colors">{customer.name}</p>
                        {hasAlert && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Índice de cancelamento/atraso alto"></span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">WhatsApp: {customer.whatsapp}</p>
                    </div>
                    <span className="text-[9px] bg-white px-2 py-1 rounded-full border border-gray-100 text-gray-400">Ver Perfil</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalhes da Cliente */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slide-up h-full flex flex-col">
              <div className="p-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-start">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 bg-tea-800 rounded-[2rem] flex items-center justify-center text-white text-3xl font-serif font-bold shadow-lg">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif text-tea-950 font-bold">{selectedCustomer.name}</h3>
                    <p className="text-sm text-gray-400 font-medium tracking-wide">ID: {selectedCustomer.id} | CPF: {selectedCustomer.cpf}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEditClick} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-tea-500 shadow-sm transition-all">✏️</button>
                  <button onClick={handleDeleteClick} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-red-500 shadow-sm transition-all text-red-400">🗑️</button>
                </div>
              </div>

              <div className="p-8 flex-grow overflow-y-auto custom-scroll space-y-10">
                {/* Métricas de Comportamento - EXCLUSIVO ADMIN */}
                <section>
                  <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Dossiê de Comportamento (Privado)</h4>
                    <span className="text-[9px] bg-tea-800 text-white px-2 py-0.5 rounded font-bold uppercase">Uso Interno</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 text-center">
                      <p className="text-[10px] font-bold text-red-700 uppercase mb-3 tracking-widest">Cancelamentos</p>
                      <p className="text-4xl font-serif font-bold text-red-900">{getClientStats(selectedCustomer.id).cancelledCount}</p>
                      <p className="text-[9px] text-red-400 mt-2 italic">Agendamentos cancelados pela cliente</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-center">
                      <p className="text-[10px] font-bold text-blue-700 uppercase mb-3 tracking-widest">Remarcações</p>
                      <p className="text-4xl font-serif font-bold text-blue-900">{getClientStats(selectedCustomer.id).reschedules}</p>
                      <p className="text-[9px] text-blue-400 mt-2 italic">Vezes que alterou o horário original</p>
                    </div>
                    <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 text-center">
                      <p className="text-[10px] font-bold text-orange-700 uppercase mb-3 tracking-widest">Pagtos Atrasados</p>
                      <p className="text-4xl font-serif font-bold text-orange-900">{getClientStats(selectedCustomer.id).latePayments}</p>
                      <p className="text-[9px] text-orange-400 mt-2 italic">Liquidações após o vencimento</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 border-b border-gray-50 pb-2">Financeiro Consolidado</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-tea-50 p-6 rounded-3xl border border-tea-100">
                      <p className="text-[10px] font-bold text-tea-700 uppercase mb-2">Total Consumido (Pago)</p>
                      <p className="text-3xl font-serif font-bold text-tea-900">R$ {getClientStats(selectedCustomer.id).paid.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Dívida Atual (Pendente)</p>
                      <p className="text-3xl font-serif font-bold text-gray-900">R$ {getClientStats(selectedCustomer.id).pending.toFixed(2)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 border-b border-gray-50 pb-2">Histórico de Sessões</h4>
                  <div className="space-y-4">
                    {bookings.filter(b => b.customerId === selectedCustomer.id).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map(booking => (
                      <div key={booking.id} className="flex justify-between p-6 bg-white border border-gray-100 rounded-3xl items-center hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-bold text-gray-800 text-lg">{booking.serviceName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">🗓️ {new Date(booking.dateTime).toLocaleDateString()}</p>
                            {booking.rescheduledCount ? <span className="text-[9px] text-orange-600 font-bold italic">Remarcado {booking.rescheduledCount}x</span> : null}
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-tea-100 text-tea-700'}`}>
                          {booking.status === 'completed' ? 'Concluído' : booking.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-gray-200">👥</div>
              <h3 className="text-2xl font-serif text-tea-900 mb-2 font-bold italic">Perfil da Cliente</h3>
              <p className="text-gray-400 max-w-xs mx-auto font-light leading-relaxed">Selecione uma cliente na lista ao lado para acessar o dossiê completo de pontualidade e histórico financeiro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClients;
