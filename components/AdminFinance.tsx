
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Booking } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

interface AdminFinanceProps {
  transactions: Transaction[];
  bookings: Booking[];
  customers: Customer[];
  onAdd?: (data: any) => Promise<void>;
  // Added onUpdate and onDelete to match passing in App.tsx
  onUpdate?: (id: string, data: any) => void;
  onDelete?: (id: string) => void;
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ transactions, bookings, customers }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTrans, setNewTrans] = useState({
    type: 'receivable' as 'payable' | 'receivable',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    bookingId: '',
    status: 'paid' as 'paid' | 'pending'
  });

  const [customerSearch, setCustomerSearch] = useState('');

  const handleSave = async () => {
    if (!newTrans.description || newTrans.amount <= 0) return alert("Dados insuficientes.");
    
    const customer = customers.find(c => c.id === newTrans.customerId);
    const booking = bookings.find(b => b.id === newTrans.bookingId);

    const transData = {
      ...newTrans,
      customerName: customer?.name || '',
      serviceName: booking?.serviceName || '',
      procedureDate: booking?.dateTime || '',
      paidAt: newTrans.status === 'paid' ? new Date().toISOString() : null
    };

    if (!(db as any)._isMock) {
      await addDoc(collection(db, "transactions"), transData);
      // Se for pagamento de um serviço, atualizamos o agendamento
      if (newTrans.bookingId && newTrans.status === 'paid') {
        await updateDoc(doc(db, "bookings", newTrans.bookingId), { 
          paymentReceived: newTrans.amount,
          paymentDate: new Date().toISOString(),
          status: 'completed' 
        });
      }
    }

    setShowAddForm(false);
    setNewTrans({ type: 'receivable', description: '', amount: 0, date: new Date().toISOString().split('T')[0], customerId: '', bookingId: '', status: 'paid' });
  };

  const totals = useMemo(() => {
    const revenue = transactions.filter(t => t.type === 'receivable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter(t => t.type === 'payable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    return { revenue, expenses, balance: revenue - expenses };
  }, [transactions]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-tea-950 font-serif italic">Fluxo Moriá</h2>
          <p className="text-gray-400 text-xs">Gestão detalhada de ganhos e despesas.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black shadow-lg">+ Novo Lançamento</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100">
          <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest mb-1">Total Ganhos</p>
          <p className="text-3xl font-bold text-green-900">R$ {totals.revenue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
          <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest mb-1">Total Despesas</p>
          <p className="text-3xl font-bold text-red-900">R$ {totals.expenses.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-tea-950 p-8 rounded-[2.5rem] text-white shadow-xl">
          <p className="text-[9px] font-bold text-tea-300 uppercase tracking-widest mb-1">Saldo em Caixa</p>
          <p className="text-3xl font-bold">R$ {totals.balance.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Descrição / Cliente</th>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Procedimento</th>
              <th className="px-8 py-5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
              <tr key={t.id} className="hover:bg-tea-50/20">
                <td className="px-8 py-6 text-xs font-bold text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-8 py-6">
                  <p className="font-bold text-tea-950">{t.description}</p>
                  {t.customerName && <p className="text-[9px] text-tea-600 font-bold uppercase">{t.customerName}</p>}
                </td>
                <td className="px-8 py-6">
                  <p className="text-xs text-gray-500 italic">{t.serviceName || 'Lançamento Geral'}</p>
                </td>
                <td className={`px-8 py-6 text-right font-bold ${t.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                  {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-3xl space-y-8 max-h-[90vh] overflow-y-auto custom-scroll">
            <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">Lançamento de Caixa</h3>
            
            <div className="space-y-6">
               <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button onClick={() => setNewTrans({...newTrans, type: 'receivable'})} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest ${newTrans.type === 'receivable' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400'}`}>Ganhos (Entrada)</button>
                  <button onClick={() => setNewTrans({...newTrans, type: 'payable'})} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest ${newTrans.type === 'payable' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>Despesas (Saída)</button>
               </div>

               <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Descrição</label>
                  <input type="text" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Ex: Pagamento Unha em Gel" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Valor R$</label>
                    <input type="number" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data</label>
                    <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                  </div>
               </div>

               {newTrans.type === 'receivable' && (
                 <div className="p-6 bg-tea-50/50 rounded-3xl border border-tea-100 space-y-4">
                    <p className="text-[9px] font-bold text-tea-900 uppercase tracking-widest text-center">Vincular a Cliente</p>
                    <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-3 bg-white border border-gray-100 rounded-xl text-xs outline-none" />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 4).map(c => (
                        <button key={c.id} onClick={() => { setNewTrans({...newTrans, customerId: c.id}); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-[11px] rounded-lg ${newTrans.customerId === c.id ? 'bg-tea-900 text-white font-bold' : 'bg-white'}`}>{c.name}</button>
                      ))}
                    </div>

                    {newTrans.customerId && (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Vincular Agendamento</label>
                        <select value={newTrans.bookingId} onChange={e => setNewTrans({...newTrans, bookingId: e.target.value})} className="w-full p-3 bg-white border border-gray-100 rounded-xl text-[10px] outline-none">
                           <option value="">Lançamento Avulso</option>
                           {bookings.filter(b => b.customerId === newTrans.customerId && b.status !== 'cancelled').map(b => (
                             <option key={b.id} value={b.id}>{b.serviceName} - {b.dateTime}</option>
                           ))}
                        </select>
                      </div>
                    )}
                 </div>
               )}

               <button onClick={handleSave} className="w-full py-6 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-xl">Salvar no Caixa</button>
               <button onClick={() => setShowAddForm(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinance;
