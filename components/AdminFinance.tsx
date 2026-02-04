
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Booking } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

interface AdminFinanceProps {
  transactions: Transaction[];
  bookings: Booking[];
  customers: Customer[];
  onAdd?: (data: any) => Promise<void>;
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
      paidAt: newTrans.status === 'paid' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    };

    try {
      if (!(db as any)._isMock) {
        await addDoc(collection(db, "transactions"), transData);
        
        // Vínculo inteligente: Atualiza agendamento se for um recebimento liquidado
        if (newTrans.bookingId && newTrans.status === 'paid' && newTrans.type === 'receivable') {
          const bookingRef = doc(db, "bookings", newTrans.bookingId);
          await updateDoc(bookingRef, { 
            paymentReceived: newTrans.amount,
            paymentDate: new Date().toISOString(),
            status: 'completed',
            depositStatus: 'paid'
          });
        }
      }
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      alert("Erro ao salvar. Verifique sua conexão.");
    }
  };

  const resetForm = () => {
    setNewTrans({ 
      type: 'receivable', 
      description: '', 
      amount: 0, 
      date: new Date().toISOString().split('T')[0], 
      customerId: '', 
      bookingId: '', 
      status: 'paid' 
    });
    setCustomerSearch('');
  };

  const totals = useMemo(() => {
    const revenue = transactions.filter(t => t.type === 'receivable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter(t => t.type === 'payable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const pending = transactions.filter(t => t.type === 'receivable' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
    return { revenue, expenses, pending, balance: revenue - expenses };
  }, [transactions]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3.5rem] border border-gray-100 shadow-sm gap-6">
        <div>
          <h2 className="text-3xl font-bold text-tea-950 font-serif italic">Caixa Moriá</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Ganhos e Despesas</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="w-full md:w-auto bg-tea-900 text-white px-10 py-5 rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-xl">+ Lançar Movimentação</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 shadow-sm">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Entradas</p>
          <p className="text-3xl font-serif font-bold text-green-900">R$ {totals.revenue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">Saídas</p>
          <p className="text-3xl font-serif font-bold text-red-900">R$ {totals.expenses.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 shadow-sm">
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1">Pendente</p>
          <p className="text-3xl font-serif font-bold text-orange-900">R$ {totals.pending.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-tea-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">💰</div>
          <p className="text-[10px] font-bold text-tea-300 uppercase tracking-widest mb-1">Saldo Líquido</p>
          <p className="text-3xl font-serif font-bold">R$ {totals.balance.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Procedimento</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className="hover:bg-tea-50/10 transition-colors group">
                  <td className="px-10 py-8 text-xs font-bold text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-tea-950 text-sm">{t.description}</p>
                    {t.customerName && <p className="text-[9px] text-tea-600 font-bold uppercase mt-1 tracking-tighter">{t.customerName}</p>}
                  </td>
                  <td className="px-10 py-8">
                    {t.serviceName ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-700">{t.serviceName}</p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase italic">{t.procedureDate}</p>
                      </div>
                    ) : (
                      <span className="text-gray-300 italic text-[10px]">Lançamento Avulso</span>
                    )}
                  </td>
                  <td className={`px-10 py-8 text-right font-bold text-base ${t.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                    {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={4} className="py-24 text-center text-gray-300 italic font-serif text-lg">Nenhum registro financeiro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-3xl space-y-8 max-h-[90vh] overflow-y-auto custom-scroll">
            <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">Novo Lançamento</h3>
            
            <div className="space-y-6">
               <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  <button onClick={() => setNewTrans({...newTrans, type: 'receivable'})} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${newTrans.type === 'receivable' ? 'bg-white text-tea-900 shadow-md' : 'text-gray-400'}`}>Receita</button>
                  <button onClick={() => setNewTrans({...newTrans, type: 'payable'})} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${newTrans.type === 'payable' ? 'bg-white text-red-600 shadow-md' : 'text-gray-400'}`}>Despesa</button>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Descrição</label>
                  <input type="text" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" placeholder="Ex: Procedimento Estético ou Luz" />
               </div>

               <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Valor R$</label>
                    <input type="number" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-lg text-tea-900 shadow-inner" placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Data</label>
                    <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                  </div>
               </div>

               {newTrans.type === 'receivable' && (
                 <div className="p-8 bg-tea-50/50 rounded-[2.5rem] border border-tea-100 space-y-5">
                    <p className="text-[10px] font-bold text-tea-900 uppercase tracking-widest text-center mb-2">Vincular Cliente & Agenda</p>
                    <input type="text" placeholder="Filtrar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs outline-none shadow-sm font-bold" />
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scroll">
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => { setNewTrans({...newTrans, customerId: c.id}); setCustomerSearch(c.name); }} className={`w-full p-3 text-left text-xs rounded-xl transition-all ${newTrans.customerId === c.id ? 'bg-tea-900 text-white font-bold' : 'bg-white hover:bg-tea-100 text-gray-600'}`}>{c.name}</button>
                      ))}
                    </div>

                    {newTrans.customerId && (
                      <div className="space-y-2 animate-fade-in pt-4 border-t border-tea-100">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Qual agendamento foi pago?</label>
                        <select value={newTrans.bookingId} onChange={e => setNewTrans({...newTrans, bookingId: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-[11px] outline-none font-bold appearance-none">
                           <option value="">Lançamento Avulso (Não altera agenda)</option>
                           {bookings.filter(b => b.customerId === newTrans.customerId && b.status !== 'cancelled' && b.status !== 'completed').map(b => (
                             <option key={b.id} value={b.id}>{b.serviceName} - {b.dateTime}</option>
                           ))}
                        </select>
                      </div>
                    )}
                 </div>
               )}

               <div className="pt-6 space-y-4">
                 <button onClick={handleSave} className="w-full py-6 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95">Salvar e Baixar Agenda</button>
                 <button onClick={() => setShowAddForm(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinance;
