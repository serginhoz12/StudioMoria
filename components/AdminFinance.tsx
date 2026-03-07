
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Booking, Service, InventoryItem } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

interface AdminFinanceProps {
  transactions: Transaction[];
  bookings: Booking[];
  customers: Customer[];
  services: Service[];
  inventory: InventoryItem[];
  onAdd?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => void;
  onDelete?: (id: string) => void;
}

const FIXED_CATEGORIES = ['water', 'electricity', 'internet', 'salary', 'tax', 'rent'] as const;
type FixedCat = (typeof FIXED_CATEGORIES)[number];

const FIXED_CATEGORY_LABELS: Record<FixedCat, string> = { water: 'Água', electricity: 'Luz', internet: 'Internet', salary: 'Pró-labore', tax: 'MEI', rent: 'Aluguel' };

/** Identifica a categoria de custo fixo: pela categoria salva ou pela descrição do lançamento. */
function getEffectiveFixedCategory(t: Transaction): FixedCat | null {
  if (t.type !== 'payable') return null;
  if (t.category && FIXED_CATEGORIES.includes(t.category as FixedCat)) return t.category as FixedCat;
  const d = (t.description || '').toLowerCase().normalize('NFD').replace(/\u0300/g, '');
  if (d.includes('internet')) return 'internet';
  if (d.includes('aluguel')) return 'rent';
  if (d.includes('agua')) return 'water';
  if (d.includes('luz') || d.includes('energia') || d.includes('eletricidade')) return 'electricity';
  if (d.includes('pro-labore') || d.includes('prolabore') || d.includes('salário') || d.includes('salario')) return 'salary';
  if (d.includes('mei') || d.includes('imposto')) return 'tax';
  return null;
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ transactions: allTransactions, bookings, customers, services = [], inventory = [], onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const now = new Date();
  const [periodStart, setPeriodStart] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(() => now.toISOString().split('T')[0]);
  
  // Identificar ID do cliente de teste
  const testCustomerId = useMemo(() => customers.find(c => c.cpf === '33426618877')?.id, [customers]);

  // Filtrar transações de teste e de agendamentos cancelados
  const baseTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const isTestUser = testCustomerId && t.customerId === testCustomerId;
      const linkedBooking = t.bookingId ? bookings.find(b => b.id === t.bookingId) : null;
      const isCancelledBooking = linkedBooking?.status === 'cancelled';
      return !isTestUser && !isCancelledBooking;
    });
  }, [allTransactions, testCustomerId, bookings]);

  // Filtrar por período selecionado
  const transactions = useMemo(() => {
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd + 'T23:59:59').getTime();
    return baseTransactions.filter(t => {
      const tDate = new Date(t.date).getTime();
      return tDate >= start && tDate <= end;
    });
  }, [baseTransactions, periodStart, periodEnd]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTrans, setNewTrans] = useState({
    type: 'receivable' as 'payable' | 'receivable',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    bookingId: '',
    status: 'paid' as 'paid' | 'pending',
    isRecurring: false,
    estimatedAmount: 0,
    realAmount: 0,
    category: 'other' as any,
    paymentMethod: 'pix' as any,
    installmentsCount: 1,
    installments: [] as { amount: number; dueDate: string }[]
  });

  const [customerSearch, setCustomerSearch] = useState('');

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setNewTrans({
      type: t.type,
      description: t.description,
      amount: t.amount,
      date: t.date,
      customerId: t.customerId || '',
      bookingId: t.bookingId || '',
      status: t.status,
      isRecurring: t.isRecurring || false,
      estimatedAmount: t.estimatedAmount || 0,
      realAmount: t.realAmount || 0,
      category: t.category || 'other',
      paymentMethod: t.paymentMethod || 'pix',
      installmentsCount: t.installmentsCount || 1,
      installments: []
    });
    setCustomerSearch(t.customerName || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento financeiro? Esta ação não pode ser desfeita.")) {
      try {
        if (!(db as any)._isMock) {
          await deleteDoc(doc(db, "transactions", id));
        }
        if (onDelete) onDelete(id);
      } catch (error) {
        alert("Erro ao excluir transação.");
      }
    }
  };

  const handleSave = async () => {
    if (!newTrans.description || newTrans.amount <= 0) return alert("Preencha a descrição e o valor.");
    
    const customer = customers.find(c => c.id === newTrans.customerId);
    const booking = bookings.find(b => b.id === newTrans.bookingId);

    const isInstallment = ['credit', 'store_installments'].includes(newTrans.paymentMethod) && newTrans.installmentsCount > 1;

    try {
      if (!(db as any)._isMock) {
        if (editingId) {
          const transData = {
            ...newTrans,
            customerName: customer?.name || '',
            serviceName: booking?.serviceName || '',
            procedureDate: booking?.dateTime || '',
            paidAt: newTrans.status === 'paid' ? (new Date().toISOString()) : null,
            updatedAt: new Date().toISOString()
          };
          await updateDoc(doc(db, "transactions", editingId), transData);
          if (onUpdate) onUpdate(editingId, transData);
        } else if (isInstallment) {
          // Generate multiple transactions for installments
          const parentId = Math.random().toString(36).substr(2, 9);
          for (let i = 0; i < newTrans.installmentsCount; i++) {
            const inst = newTrans.installments[i] || { 
              amount: newTrans.amount / newTrans.installmentsCount, 
              dueDate: new Date(new Date(newTrans.date).setMonth(new Date(newTrans.date).getMonth() + i)).toISOString().split('T')[0] 
            };
            
            const transData = {
              ...newTrans,
              description: `${newTrans.description} (${i + 1}/${newTrans.installmentsCount})`,
              amount: inst.amount,
              date: newTrans.date,
              dueDate: inst.dueDate,
              status: i === 0 && newTrans.status === 'paid' ? 'paid' : 'pending',
              installmentNumber: i + 1,
              parentTransactionId: parentId,
              customerName: customer?.name || '',
              serviceName: booking?.serviceName || '',
              procedureDate: booking?.dateTime || '',
              paidAt: i === 0 && newTrans.status === 'paid' ? (new Date().toISOString()) : null,
              createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, "transactions"), transData);
          }
        } else {
          const transData = {
            ...newTrans,
            customerName: customer?.name || '',
            serviceName: booking?.serviceName || '',
            procedureDate: booking?.dateTime || '',
            paidAt: newTrans.status === 'paid' ? (new Date().toISOString()) : null,
            createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, "transactions"), transData);
        }
        
        // Vínculo inteligente: Se for um agendamento sendo pago agora
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

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      alert("Erro ao salvar. Verifique sua conexão.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewTrans({ 
      type: 'receivable', 
      description: '', 
      amount: 0, 
      date: new Date().toISOString().split('T')[0], 
      customerId: '', 
      bookingId: '', 
      status: 'paid',
      isRecurring: false,
      estimatedAmount: 0,
      realAmount: 0,
      category: 'other',
      paymentMethod: 'pix',
      installmentsCount: 1,
      installments: []
    });
    setCustomerSearch('');
  };

  const totals = useMemo(() => {
    const revenue = transactions.filter(t => t.type === 'receivable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter(t => t.type === 'payable' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const pendingReceivable = transactions.filter(t => t.type === 'receivable' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
    const pendingPayable = transactions.filter(t => t.type === 'payable' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
    return { revenue, expenses, pendingReceivable, pendingPayable, balance: revenue - expenses };
  }, [transactions]);

  // Custos fixos: todos os lançamentos de despesa que são custo fixo (por categoria ou por descrição)
  const fixedCostsForAnalysis = useMemo(() => {
    return transactions.filter(t => getEffectiveFixedCategory(t) !== null);
  }, [transactions]);

  // Custos fixos sempre como valor positivo (despesa a cobrir) — nunca contabilizar como positivo na receita
  const fixedCostsByCategory = useMemo(() => {
    const map: Record<FixedCat, number> = { water: 0, electricity: 0, internet: 0, salary: 0, tax: 0, rent: 0 };
    fixedCostsForAnalysis.forEach(t => {
      const cat = getEffectiveFixedCategory(t);
      if (cat) map[cat] += Math.abs(Number(t.amount));
    });
    return map;
  }, [fixedCostsForAnalysis]);

  const totalFixedCost = useMemo(() => fixedCostsForAnalysis.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0), [fixedCostsForAnalysis]);

  // Análise por procedimento: realizados no período, receita, custo de produtos, sugestão de preço
  const procedureAnalysis = useMemo(() => {
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd + 'T23:59:59').getTime();
    const byService: Record<string, { service: Service; count: number; revenue: number; productCostPerProc: number; totalProductCost: number }> = {};

    const completedInPeriod = bookings.filter(b => {
      if (b.status !== 'completed') return false;
      const t = new Date(b.dateTime.replace(' ', 'T')).getTime();
      return t >= start && t <= end;
    });

    const paidByBookingId: Record<string, number> = {};
    transactions.filter(t => t.type === 'receivable' && t.status === 'paid' && t.bookingId).forEach(t => {
      const tDate = new Date(t.date).getTime();
      if (tDate >= start && tDate <= end) paidByBookingId[t.bookingId!] = (paidByBookingId[t.bookingId!] || 0) + t.amount;
    });

    completedInPeriod.forEach(b => {
      const sid = b.serviceId || b.serviceName;
      if (!sid) return;
      const service = services.find(s => s.id === sid || s.name === b.serviceName) || { id: sid, name: b.serviceName || sid, price: 0, duration: 0, description: '', category: '', isVisible: true, usedProducts: [] } as Service;
      const key = service.id;
      if (!byService[key]) byService[key] = { service, count: 0, revenue: 0, productCostPerProc: 0, totalProductCost: 0 };

      byService[key].count += 1;
      const paid = b.paymentReceived ?? paidByBookingId[b.id] ?? 0;
      byService[key].revenue += paid;
    });

    Object.keys(byService).forEach(key => {
      const row = byService[key];
      let costPerProc = 0;
      if (row.service.usedProducts?.length && inventory.length) {
        row.service.usedProducts.forEach(up => {
          const product = inventory.find(p => p.id === up.productId);
          if (!product?.purchasePrice || !product?.netWeight || product.netWeight <= 0) return;
          const costPerUnit = product.purchasePrice / product.netWeight;
          costPerProc += costPerUnit * (up.consumption || 0);
        });
      }
      row.productCostPerProc = costPerProc;
      row.totalProductCost = costPerProc * row.count;
    });

    return Object.values(byService).sort((a, b) => b.count - a.count);
  }, [bookings, transactions, services, inventory, periodStart, periodEnd]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3.5rem] border border-gray-100 shadow-sm gap-6">
        <div>
          <h2 className="text-3xl font-bold text-tea-950 font-serif italic">Caixa Moriá</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Ganhos e Despesas</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Período</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none border border-gray-100" />
            <span className="text-gray-300">até</span>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none border border-gray-100" />
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-tea-900 text-white px-10 py-5 rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-xl">+ Lançar Movimentação</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 shadow-sm">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Entradas</p>
          <p className="text-3xl font-serif font-bold text-green-900">R$ {totals.revenue.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-green-600 mt-1">Recebidas no período</p>
        </div>
        <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">Saídas</p>
          <p className="text-3xl font-serif font-bold text-red-900">R$ {totals.expenses.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-red-600 mt-1">Pagas no período</p>
        </div>
        <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 shadow-sm">
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1">A receber</p>
          <p className="text-3xl font-serif font-bold text-orange-900">R$ {totals.pendingReceivable.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-orange-600 mt-1">Receitas pendentes</p>
        </div>
        <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-200 shadow-sm">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">A pagar</p>
          <p className="text-3xl font-serif font-bold text-amber-900">R$ {totals.pendingPayable.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-amber-700 mt-1">Despesas pendentes</p>
        </div>
        <div className="bg-tea-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">💰</div>
          <p className="text-[10px] font-bold text-tea-300 uppercase tracking-widest mb-1">Saldo Líquido</p>
          <p className="text-3xl font-serif font-bold">R$ {totals.balance.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-tea-200 mt-1">Entradas − Saídas pagas</p>
        </div>
      </div>

      {/* Profitability Analysis */}
      <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex items-center gap-4">
          <span className="text-3xl">📊</span>
          <div>
            <h3 className="text-xl font-serif font-bold text-tea-950 italic">Análise de Rentabilidade</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Custo Fixo vs. Preço dos Procedimentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-tea-800 uppercase tracking-widest border-b border-gray-50 pb-2">Custos Fixos (período)</h4>
            <p className="text-[9px] text-gray-400">Inclui lançamentos confirmados e pendentes no período selecionado.</p>
            <div className="space-y-2">
              {FIXED_CATEGORIES.map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-500">{FIXED_CATEGORY_LABELS[cat]}</span>
                  <span className="font-bold text-red-600">R$ {fixedCostsByCategory[cat].toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-50 font-bold">
                <span className="text-tea-950">Total Fixo (despesas)</span>
                <span className="text-red-600">R$ {totalFixedCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-tea-50/30 p-8 rounded-3xl border border-tea-100 space-y-6">
            <h4 className="text-xs font-bold text-tea-800 uppercase tracking-widest">Custo fixo × hora (referência)</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Custos fixos são despesas (sempre negativos no fluxo). Para cobri-los, cada hora de trabalho deve render no mínimo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Custo fixo/hora (est.)</p>
                <p className="text-xl font-serif font-bold text-tea-900">
                  R$ {(totalFixedCost / (22 * 8)).toFixed(2)}
                </p>
                <p className="text-[8px] text-gray-400 mt-1">* 22 dias/mês, 8h/dia</p>
              </div>
              <div className="bg-tea-900 p-5 rounded-2xl text-white shadow-lg">
                <p className="text-[9px] font-bold text-tea-300 uppercase mb-1">Meta faturamento/hora</p>
                <p className="text-xl font-serif font-bold">
                  R$ {(totalFixedCost * 2.5 / (22 * 8)).toFixed(2)}
                </p>
                <p className="text-[8px] text-tea-100 mt-1">* Margem ~60%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Precificação por procedimento */}
        <div className="mt-10 pt-10 border-t border-gray-100">
          <h4 className="text-xs font-bold text-tea-800 uppercase tracking-widest mb-2">Sugestão de precificação por procedimento</h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-6">
            Comparando procedimentos realizados no período, valor cobrado e custo dos produtos utilizados em cada um.
          </p>
          {procedureAnalysis.length === 0 ? (
            <p className="text-gray-400 italic text-sm">Nenhum procedimento concluído no período selecionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest">Procedimento</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Realizados</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Receita total</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Receita/proc.</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Custo produto/proc.</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Custo produto total</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Margem (aprox.)</th>
                    <th className="py-3 pr-4 font-bold text-tea-800 uppercase tracking-widest text-right">Preço mín. sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {procedureAnalysis.map(({ service, count, revenue, productCostPerProc, totalProductCost }) => {
                    const revenuePerProc = count > 0 ? revenue / count : 0;
                    const marginPct = revenue > 0 ? ((revenue - totalProductCost) / revenue) * 100 : 0;
                    const suggestedMin = productCostPerProc > 0 ? productCostPerProc / 0.4 : revenuePerProc;
                    return (
                      <tr key={service.id} className="border-b border-gray-50 hover:bg-tea-50/30">
                        <td className="py-4 pr-4 font-bold text-tea-950">{service.name}</td>
                        <td className="py-4 pr-4 text-right">{count}</td>
                        <td className="py-4 pr-4 text-right text-green-700 font-bold">R$ {revenue.toFixed(2)}</td>
                        <td className="py-4 pr-4 text-right">R$ {revenuePerProc.toFixed(2)}</td>
                        <td className="py-4 pr-4 text-right text-red-600">R$ {productCostPerProc.toFixed(2)}</td>
                        <td className="py-4 pr-4 text-right text-red-600">R$ {totalProductCost.toFixed(2)}</td>
                        <td className="py-4 pr-4 text-right">{marginPct.toFixed(0)}%</td>
                        <td className="py-4 pr-4 text-right font-bold text-tea-800">R$ {suggestedMin.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className="hover:bg-tea-50/10 transition-colors group">
                  <td className="px-10 py-8 text-xs font-bold text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-tea-950 text-sm">{t.description}</p>
                    <div className="flex gap-2 mt-1">
                      {t.customerName && <p className="text-[9px] text-tea-600 font-bold uppercase tracking-tighter">{t.customerName}</p>}
                      {t.status === 'pending' && <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold uppercase">Pendente</span>}
                    </div>
                  </td>
                  <td className={`px-10 py-8 text-right font-bold text-base ${t.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                    {t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(t)} 
                        className="p-2 bg-tea-50 text-tea-700 rounded-lg hover:bg-tea-100 transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)} 
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
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

      {showForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-3xl space-y-8 max-h-[90vh] overflow-y-auto custom-scroll">
            <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">
              {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            
            <div className="space-y-6">
               <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  <button onClick={() => setNewTrans({...newTrans, type: 'receivable'})} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${newTrans.type === 'receivable' ? 'bg-white text-tea-900 shadow-md' : 'text-gray-400'}`}>Receita</button>
                  <button onClick={() => setNewTrans({...newTrans, type: 'payable'})} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${newTrans.type === 'payable' ? 'bg-white text-red-600 shadow-md' : 'text-gray-400'}`}>Despesa</button>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Descrição</label>
                  <input type="text" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner border-2 border-transparent focus:border-tea-100 focus:bg-white" placeholder="Ex: Procedimento Estético ou Aluguel" />
               </div>

               <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Valor R$</label>
                    <input type="number" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value), realAmount: parseFloat(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-lg text-tea-900 shadow-inner" placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Data</label>
                    <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                  </div>
               </div>

               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    checked={newTrans.isRecurring} 
                    onChange={e => setNewTrans({...newTrans, isRecurring: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-tea-900 focus:ring-tea-500"
                  />
                  <label className="text-xs font-bold text-tea-900 uppercase tracking-widest">Lançamento Recorrente (Mensal)</label>
               </div>

               {newTrans.isRecurring && (
                 <div className="grid grid-cols-2 gap-5 p-6 bg-tea-50/30 rounded-2xl border border-tea-100">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-tea-700 uppercase ml-2 tracking-widest">Valor Estimado R$</label>
                      <input type="number" value={newTrans.estimatedAmount || ''} onChange={e => setNewTrans({...newTrans, estimatedAmount: parseFloat(e.target.value)})} className="w-full p-4 bg-white rounded-xl outline-none font-bold text-sm shadow-sm" placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-tea-700 uppercase ml-2 tracking-widest">Valor Real R$</label>
                      <input type="number" value={newTrans.realAmount || ''} onChange={e => setNewTrans({...newTrans, realAmount: parseFloat(e.target.value), amount: parseFloat(e.target.value)})} className="w-full p-4 bg-white rounded-xl outline-none font-bold text-sm shadow-sm" placeholder="0,00" />
                    </div>
                 </div>
               )}

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Forma de Pagamento</label>
                  <select 
                    value={newTrans.paymentMethod} 
                    onChange={e => {
                      const method = e.target.value as any;
                      setNewTrans({...newTrans, paymentMethod: method, installmentsCount: 1, installments: []});
                    }}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                  >
                    <option value="pix">PIX</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="store_installments">Parcelado pela Loja</option>
                  </select>
               </div>

               {['credit', 'store_installments'].includes(newTrans.paymentMethod) && (
                 <div className="space-y-4 p-6 bg-tea-50/30 rounded-2xl border border-tea-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-tea-700 uppercase ml-2 tracking-widest">Número de Parcelas</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="48"
                        value={newTrans.installmentsCount} 
                        onChange={e => {
                          const count = parseInt(e.target.value) || 1;
                          const insts = Array.from({length: count}, (_, i) => ({
                            amount: Number((newTrans.amount / count).toFixed(2)),
                            dueDate: new Date(new Date(newTrans.date).setMonth(new Date(newTrans.date).getMonth() + i)).toISOString().split('T')[0]
                          }));
                          setNewTrans({...newTrans, installmentsCount: count, installments: insts});
                        }} 
                        className="w-full p-4 bg-white rounded-xl outline-none font-bold text-sm shadow-sm" 
                      />
                    </div>

                    {newTrans.installmentsCount > 1 && (
                      <div className="space-y-3 mt-4">
                        <p className="text-[9px] font-bold text-tea-900 uppercase tracking-widest mb-2">Detalhamento das Parcelas</p>
                        {newTrans.installments.map((inst, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-3 items-center">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">{idx + 1}ª</span>
                              <input 
                                type="number" 
                                value={inst.amount} 
                                onChange={e => {
                                  const updated = [...newTrans.installments];
                                  updated[idx].amount = parseFloat(e.target.value);
                                  setNewTrans({...newTrans, installments: updated});
                                }}
                                className="w-full pl-8 pr-4 py-2 bg-white rounded-lg text-xs font-bold outline-none border border-tea-100"
                              />
                            </div>
                            <input 
                              type="date" 
                              value={inst.dueDate} 
                              onChange={e => {
                                const updated = [...newTrans.installments];
                                updated[idx].dueDate = e.target.value;
                                setNewTrans({...newTrans, installments: updated});
                              }}
                              className="w-full px-4 py-2 bg-white rounded-lg text-xs font-bold outline-none border border-tea-100"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               )}

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Categoria</label>
                  <select 
                    value={newTrans.category} 
                    onChange={e => setNewTrans({...newTrans, category: e.target.value as any})}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                  >
                    <option value="other">Outros</option>
                    <option value="water">Água</option>
                    <option value="electricity">Luz</option>
                    <option value="internet">Internet</option>
                    <option value="salary">Salário Proprietária</option>
                    <option value="tax">Imposto MEI</option>
                    <option value="rent">Aluguel</option>
                    <option value="supplies">Insumos/Produtos</option>
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Status do Pagamento</label>
                  <select 
                    value={newTrans.status} 
                    onChange={e => setNewTrans({...newTrans, status: e.target.value as 'paid' | 'pending'})}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                  >
                    <option value="paid">Confirmado (Já recebido/pago)</option>
                    <option value="pending">Pendente (A receber/pagar)</option>
                  </select>
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

                    {newTrans.customerId && !editingId && (
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
                 <button onClick={handleSave} className="w-full py-6 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95">
                    {editingId ? 'Confirmar Alterações' : 'Salvar e Registrar'}
                 </button>
                 <button onClick={() => { setShowForm(false); resetForm(); }} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinance;
