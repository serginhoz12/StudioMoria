
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Service, Booking } from '../types';

interface AdminFinanceProps {
  transactions: Transaction[];
  bookings: Booking[];
  customers: Customer[];
  onAdd: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ transactions, bookings, customers, onAdd, onUpdate, onDelete }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // Estado do Novo Lançamento
  const [newTrans, setNewTrans] = useState({
    type: 'receivable' as 'payable' | 'receivable',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'paid' as 'paid' | 'pending',
    customerId: '',
    bookingId: ''
  });

  const [customerSearch, setCustomerSearch] = useState('');

  const filtered = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();
    return transactions.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end && (filter === 'all' || t.type === filter);
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, dateRange]);

  const summary = useMemo(() => {
    const rec = filtered.filter(t => t.type === 'receivable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const pay = filtered.filter(t => t.type === 'payable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const pendingRec = filtered.filter(t => t.type === 'receivable' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
    return { rec, pay, balance: rec - pay, pendingRec };
  }, [filtered]);

  const selectedCustomer = customers.find(c => c.id === newTrans.customerId);
  const customerBookings = bookings.filter(b => b.customerId === newTrans.customerId && b.status !== 'cancelled');

  const handleSave = async () => {
    if (!newTrans.description || newTrans.amount <= 0) return alert("Preencha descrição e valor.");
    
    const booking = bookings.find(b => b.id === newTrans.bookingId);
    
    const data = {
      ...newTrans,
      customerName: selectedCustomer?.name || '',
      serviceName: booking?.serviceName || '',
      procedureDate: booking?.dateTime || '',
      paidAt: newTrans.status === 'paid' ? new Date().toISOString() : null
    };

    await onAdd(data);
    setShowAddForm(false);
    setNewTrans({ type: 'receivable', description: '', amount: 0, date: new Date().toISOString().split('T')[0], status: 'paid', customerId: '', bookingId: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-bold text-tea-950 font-serif italic">Fluxo Moriá</h2>
          <p className="text-gray-500 text-sm">Gestão de entradas, saídas e vínculos de serviços.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
           <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase ${filter === 'all' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Tudo</button>
              <button onClick={() => setFilter('receivable')} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase ${filter === 'receivable' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Entradas</button>
              <button onClick={() => setFilter('payable')} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase ${filter === 'payable' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Saídas</button>
           </div>
           <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="p-2.5 bg-gray-50 rounded-xl text-[10px] font-bold outline-none" />
           <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="p-2.5 bg-gray-50 rounded-xl text-[10px] font-bold outline-none" />
           <button onClick={() => setShowAddForm(true)} className="bg-tea-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg">+ Novo Lançamento</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
          <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest mb-1">Entradas (Pagas)</p>
          <p className="text-2xl font-bold text-green-900">R$ {summary.rec.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
          <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest mb-1">Despesas Pagas</p>
          <p className="text-2xl font-bold text-red-900">R$ {summary.pay.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
          <p className="text-[9px] font-bold text-orange-700 uppercase tracking-widest mb-1">A Receber (Pendente)</p>
          <p className="text-2xl font-bold text-orange-900">R$ {summary.pendingRec.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-tea-950 p-6 rounded-[2rem] text-white">
          <p className="text-[9px] font-bold text-tea-400 uppercase tracking-widest mb-1">Saldo Líquido</p>
          <p className="text-2xl font-bold">R$ {summary.balance.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data Lanc.</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Descrição / Cliente</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Vínculo Procedimento</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-tea-50/20 group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-xs text-gray-700">{new Date(t.date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-gray-900 text-sm">{t.description}</p>
                    {t.customerName && <p className="text-[10px] text-tea-600 font-bold uppercase">{t.customerName}</p>}
                  </td>
                  <td className="px-8 py-6">
                    {t.serviceName ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-gray-600">{t.serviceName}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter italic">Sessão: {t.procedureDate}</p>
                      </div>
                    ) : (
                      <span className="text-gray-300 italic text-[10px]">Sem vínculo</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className={`px-8 py-6 font-bold text-right text-sm ${t.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                    {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-gray-300 italic">Nenhum lançamento no período selecionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-3xl animate-slide-up space-y-6 max-h-[90vh] overflow-y-auto custom-scroll">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic text-center">Novo Lançamento Financeiro</h3>
            
            <div className="space-y-6">
               <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  <button onClick={() => setNewTrans({...newTrans, type: 'receivable'})} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${newTrans.type === 'receivable' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Entrada (Receita)</button>
                  <button onClick={() => setNewTrans({...newTrans, type: 'payable'})} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${newTrans.type === 'payable' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>Saída (Despesa)</button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data</label>
                    <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Status</label>
                    <select value={newTrans.status} onChange={e => setNewTrans({...newTrans, status: e.target.value as any})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm">
                       <option value="paid">Confirmado (Pago)</option>
                       <option value="pending">Pendente (A Receber)</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Descrição</label>
                  <input type="text" placeholder="Ex: Pagamento Sobrancelha ou Aluguel Unidade" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Valor R$</label>
                  <input type="number" placeholder="0,00" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-lg text-tea-900" />
               </div>

               {newTrans.type === 'receivable' && (
                 <div className="p-6 bg-tea-50/50 rounded-3xl border border-tea-100 space-y-4">
                    <p className="text-[9px] font-bold text-tea-800 uppercase tracking-widest text-center">Vincular a Cliente & Serviço</p>
                    <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-3 bg-white rounded-xl text-xs outline-none border border-gray-100" />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                       {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 4).map(c => (
                         <button key={c.id} onClick={() => { setNewTrans({...newTrans, customerId: c.id}); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-[11px] rounded-lg transition-all ${newTrans.customerId === c.id ? 'bg-tea-800 text-white font-bold' : 'bg-white hover:bg-tea-50'}`}>{c.name}</button>
                       ))}
                    </div>

                    {newTrans.customerId && (
                      <div className="space-y-2 animate-fade-in">
                         <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Selecione o Agendamento</label>
                         <select value={newTrans.bookingId} onChange={e => setNewTrans({...newTrans, bookingId: e.target.value})} className="w-full p-3 bg-white rounded-xl text-xs font-bold outline-none border border-gray-100">
                            <option value="">Lançamento Avulso (Sem agendamento)</option>
                            {customerBookings.map(b => (
                              <option key={b.id} value={b.id}>{b.serviceName} - {b.dateTime}</option>
                            ))}
                         </select>
                         <p className="text-[8px] text-tea-600 font-bold uppercase tracking-widest text-center italic">* Vincular ajuda no controle do histórico da cliente.</p>
                      </div>
                    )}
                 </div>
               )}

               <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddForm(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button onClick={handleSave} className="flex-[2] bg-tea-900 text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black">Salvar Lançamento</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinance;
