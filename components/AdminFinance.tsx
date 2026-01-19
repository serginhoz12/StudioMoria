
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Service } from '../types';

interface AdminFinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  services: Service[];
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ transactions, setTransactions, customers, services }) => {
  const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [period, setPeriod] = useState<'current' | 'next' | 'custom'>('current');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ 
    description: '', 
    amount: 0, 
    type: 'receivable' as 'payable' | 'receivable',
    customerId: '',
    serviceId: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'paid',
    observation: ''
  });

  const handlePeriodChange = (p: 'current' | 'next' | 'custom') => {
    setPeriod(p);
    const now = new Date();
    if (p === 'current') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
    } else if (p === 'next') {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
    }
  };

  const handleServiceChange = (id: string) => {
    const service = services.find(s => s.id === id);
    if (service) {
      setNewTransaction({
        ...newTransaction,
        serviceId: id,
        description: service.name,
        amount: service.price
      });
    } else {
      setNewTransaction({ ...newTransaction, serviceId: '', description: '' });
    }
  };

  const handleAdd = () => {
    if (newTransaction.description && newTransaction.amount > 0) {
      const selectedCustomer = customers.find(c => c.id === newTransaction.customerId);
      const selectedService = services.find(s => s.id === newTransaction.serviceId);
      
      const transaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        description: newTransaction.description,
        amount: newTransaction.amount,
        type: newTransaction.type,
        date: new Date().toISOString(),
        dueDate: newTransaction.dueDate,
        paidAt: newTransaction.status === 'paid' ? new Date().toISOString() : undefined,
        status: newTransaction.status,
        customerId: newTransaction.customerId || undefined,
        customerName: selectedCustomer?.name,
        serviceId: newTransaction.serviceId || undefined,
        serviceName: selectedService?.name,
        observation: newTransaction.observation || undefined
      };
      setTransactions(prev => [...prev, transaction]);
      setShowAdd(false);
      setNewTransaction({ 
        description: '', 
        amount: 0, 
        type: 'receivable', 
        customerId: '', 
        serviceId: '',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        observation: ''
      });
    }
  };

  const toggleStatus = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const newStatus = t.status === 'paid' ? 'pending' : 'paid';
        return { 
          ...t, 
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined
        };
      }
      return t;
    }));
  };

  const sendReminder = (t: Transaction) => {
    const customer = customers.find(c => c.id === t.customerId);
    if (!customer) return;
    
    const message = `Olá ${customer.name}! Passando para lembrar do seu pagamento de R$ ${t.amount.toFixed(2)} (${t.description}) que vence em ${new Date(t.dueDate!).toLocaleDateString()}. Studio Moriá Estética.`;
    window.open(`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filtered = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();

    return transactions.filter(t => {
      const d = new Date(t.date).getTime();
      const inPeriod = d >= start && d <= end;
      const matchType = filter === 'all' || t.type === filter;
      return inPeriod && matchType;
    });
  }, [transactions, filter, dateRange]);

  const summary = useMemo(() => {
    const rec = filtered.filter(t => t.type === 'receivable').reduce((a, b) => a + b.amount, 0);
    const pay = filtered.filter(t => t.type === 'payable').reduce((a, b) => a + b.amount, 0);
    return { rec, pay, balance: rec - pay };
  }, [filtered]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-tea-950">Contas Financeiras</h2>
          <p className="text-gray-500 text-sm">Controle seu fluxo de caixa por período.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
            <button onClick={() => handlePeriodChange('current')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === 'current' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Mês Atual</button>
            <button onClick={() => handlePeriodChange('next')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === 'next' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Próximo</button>
            <button onClick={() => setPeriod('custom')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === 'custom' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Personalizado</button>
          </div>
          
          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="p-2 bg-gray-50 rounded-xl text-[10px] font-bold border-none" />
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="p-2 bg-gray-50 rounded-xl text-[10px] font-bold border-none" />
            </div>
          )}

          <button onClick={() => setShowAdd(true)} className="bg-tea-900 text-white px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg">+ Novo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Receitas do Período</p>
          <p className="text-2xl font-bold text-green-900">R$ {summary.rec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">Despesas do Período</p>
          <p className="text-2xl font-bold text-red-900">R$ {summary.pay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`${summary.balance >= 0 ? 'bg-tea-50 border-tea-100' : 'bg-orange-50 border-orange-100'} p-6 rounded-[2rem] border`}>
          <p className={`text-[10px] font-bold ${summary.balance >= 0 ? 'text-tea-700' : 'text-orange-700'} uppercase tracking-widest mb-1`}>Saldo Operacional</p>
          <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-tea-900' : 'text-orange-900'}`}>R$ {summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'receivable', 'payable'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-tea-900 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
          >
            {f === 'all' ? 'Tudo' : f === 'receivable' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-tea-100 animate-slide-up">
          <h3 className="text-xl font-bold text-tea-900 mb-8 font-serif italic">Novo Registro Financeiro</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Serviço (Catálogo)</label>
              <select className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newTransaction.serviceId} onChange={(e) => handleServiceChange(e.target.value)}>
                <option value="">Lançamento Manual...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Descrição</label>
              <input className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newTransaction.description} onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Valor R$</label>
              <input type="number" className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newTransaction.amount || ''} onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Tipo</label>
              <select className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newTransaction.type} onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as 'payable' | 'receivable'})}>
                <option value="receivable">Receita (Entrada)</option>
                <option value="payable">Despesa (Saída)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Cliente</label>
              <select className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newTransaction.customerId} onChange={(e) => setNewTransaction({...newTransaction, customerId: e.target.value})}>
                <option value="">Lançamento Avulso</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Vencimento</label>
              <input type="date" className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newTransaction.dueDate} onChange={(e) => setNewTransaction({...newTransaction, dueDate: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button onClick={() => setShowAdd(false)} className="px-8 py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
            <button onClick={handleAdd} className="bg-tea-900 text-white px-12 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl">Salvar Registro</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data / Vencimento</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-tea-50/20 transition-all group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-tea-950 text-xs">{new Date(t.dueDate || t.date).toLocaleDateString()}</p>
                    <p className="text-[8px] text-gray-300 uppercase font-bold">Lançado: {new Date(t.date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                    <div className="flex gap-2 mt-1">
                      {t.customerName && <span className="text-[8px] bg-tea-50 text-tea-700 px-1.5 py-0.5 rounded font-bold uppercase">{t.customerName}</span>}
                      {t.serviceName && <span className="text-[8px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{t.serviceName}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => toggleStatus(t.id)}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 shadow-sm'}`}
                    >
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </button>
                  </td>
                  <td className={`px-8 py-6 font-bold text-right text-sm ${t.type === 'receivable' ? 'text-tea-700' : 'text-red-500'}`}>
                    {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex justify-center gap-2">
                      {t.customerId && t.status === 'pending' && (
                        <button onClick={() => sendReminder(t)} className="p-3 bg-white border border-tea-50 rounded-xl text-lg shadow-sm hover:scale-110 transition-transform">📱</button>
                      )}
                      <button onClick={() => setTransactions(prev => prev.filter(x => x.id !== t.id))} className="p-3 text-red-200 hover:text-red-500 transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center text-gray-300 italic font-serif">Nenhum registro encontrado para este período e filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminFinance;
