
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Service } from '../types';

interface AdminFinanceProps {
  transactions: Transaction[];
  onAdd: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  customers: Customer[];
  services: Service[];
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ transactions, onAdd, onUpdate, onDelete, customers, services }) => {
  const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  const filtered = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();
    return transactions.filter(t => {
      const d = new Date(t.dueDate || t.date).getTime();
      return d >= start && d <= end && (filter === 'all' || t.type === filter);
    });
  }, [transactions, filter, dateRange]);

  const summary = useMemo(() => {
    const rec = filtered.filter(t => t.type === 'receivable').reduce((a, b) => a + b.amount, 0);
    const pay = filtered.filter(t => t.type === 'payable').reduce((a, b) => a + b.amount, 0);
    return { rec, pay, balance: rec - pay };
  }, [filtered]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-tea-950 font-serif italic">Fluxo Moriá</h2>
          <p className="text-gray-500 text-sm">Controle de entradas e saídas.</p>
        </div>
        <div className="flex gap-4">
           <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-[10px] font-bold" />
           <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-[10px] font-bold" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">Entradas Líquidas</p>
          <p className="text-3xl font-bold text-green-900">R$ {summary.rec.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-2">Despesas</p>
          <p className="text-3xl font-bold text-red-900">R$ {summary.pay.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-tea-950 p-8 rounded-[2.5rem] text-white">
          <p className="text-[10px] font-bold text-tea-400 uppercase tracking-widest mb-2">Saldo em Caixa</p>
          <p className="text-3xl font-bold">R$ {summary.balance.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-tea-50/20">
                <td className="px-8 py-6 font-bold text-xs">{new Date(t.dueDate || t.date).toLocaleDateString()}</td>
                <td className="px-8 py-6">
                  <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                  {t.promotionId && <span className="text-[7px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">PROMOÇÃO APLICADA</span>}
                </td>
                <td className={`px-8 py-6 font-bold text-right text-sm ${t.type === 'receivable' ? 'text-tea-700' : 'text-red-500'}`}>
                  {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFinance;
