
import React, { useState } from 'react';
import { Transaction, Customer, Service } from '../types';

interface AdminFinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  services: Service[];
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ transactions, setTransactions, customers, services }) => {
  const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all');
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

  const filtered = transactions.filter(t => filter === 'all' || t.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Contas Financeiras</h2>
          <p className="text-gray-500 text-sm">Controle de caixa e pagamentos por cliente.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-tea-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-tea-700 transition"
        >
          + Novo Lançamento
        </button>
      </div>

      <div className="flex gap-2">
        {(['all', 'receivable', 'payable'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition ${filter === f ? 'bg-tea-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            {f === 'all' ? 'Tudo' : f === 'receivable' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-tea-100 animate-slide-in">
          <h3 className="font-bold text-tea-900 mb-6">Cadastrar Movimentação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Vincular Serviço (Opcional)</label>
              <select 
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">Selecione um serviço do catálogo...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Descrição</label>
              <input 
                placeholder="Ex: Limpeza de Pele ou Aluguel" 
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Valor R$</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.amount || ''}
                onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tipo</label>
              <select 
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as 'payable' | 'receivable'})}
              >
                <option value="receivable">Receita (Venda/Serviço)</option>
                <option value="payable">Despesa (Custo Salão)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Vincular Cliente</label>
              <select 
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.customerId}
                onChange={(e) => setNewTransaction({...newTransaction, customerId: e.target.value})}
              >
                <option value="">Nenhum Cliente (Lançamento Avulso)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Data de Vencimento</label>
              <input 
                type="date"
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.dueDate}
                onChange={(e) => setNewTransaction({...newTransaction, dueDate: e.target.value})}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Observação Interna (Opcional)</label>
              <input 
                placeholder="Notas sobre o pagamento, descontos ou detalhes do atendimento..."
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.observation}
                onChange={(e) => setNewTransaction({...newTransaction, observation: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Status Inicial</label>
              <select 
                className="w-full p-4 border-2 border-gray-50 bg-gray-50 rounded-2xl outline-none focus:border-tea-200 focus:bg-white"
                value={newTransaction.status}
                onChange={(e) => setNewTransaction({...newTransaction, status: e.target.value as 'pending' | 'paid'})}
              >
                <option value="pending">Pendente (A receber/pagar)</option>
                <option value="paid">Pago (Já liquidado)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAdd(false)} className="px-6 py-3 text-gray-400 font-bold">Cancelar</button>
            <button onClick={handleAdd} className="bg-tea-600 text-white px-10 py-3 rounded-2xl font-bold hover:bg-tea-700 shadow-lg transition">Salvar Lançamento</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Descrição / Observações</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(t => {
              const isLate = t.status === 'paid' && t.dueDate && t.paidAt && 
                new Date(t.paidAt).setHours(0,0,0,0) > new Date(t.dueDate).setHours(0,0,0,0);
              
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition group">
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <p className="font-bold text-gray-800">{t.description}</p>
                      <div className="flex gap-2 items-center flex-wrap">
                        {t.customerName && <span className="text-[9px] bg-tea-50 text-tea-700 font-bold px-2 py-0.5 rounded uppercase">Cliente: {t.customerName}</span>}
                        {t.serviceName && <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded uppercase">Serviço: {t.serviceName}</span>}
                        {isLate && <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded uppercase">Pago com atraso</span>}
                      </div>
                      {t.observation && <p className="text-[10px] text-gray-400 italic mt-1 leading-tight">{t.observation}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(t.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                    >
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </button>
                    {t.paidAt && <p className="text-[8px] text-gray-400 mt-1 uppercase">Em: {new Date(t.paidAt).toLocaleDateString()}</p>}
                  </td>
                  <td className={`px-6 py-4 font-bold text-right ${t.type === 'receivable' ? 'text-tea-700' : 'text-red-500'}`}>
                    {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {t.customerId && t.status === 'pending' && (
                        <button 
                          onClick={() => sendReminder(t)}
                          className="p-2 text-tea-500 hover:bg-tea-50 rounded-lg transition"
                          title="Enviar lembrete WhatsApp"
                        >
                          📱
                        </button>
                      )}
                      <button onClick={() => setTransactions(prev => prev.filter(x => x.id !== t.id))} className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">Nenhum lançamento financeiro registrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFinance;
