
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Booking, Service, SalonSettings, InventoryItem } from '../types';
import { FIXED_COST_KEYWORDS, SUPPLY_KEYWORDS } from '../constants';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

interface AdminFinanceProps {
  transactions: Transaction[];
  bookings: Booking[];
  customers: Customer[];
  services: Service[];
  settings: SalonSettings;
  inventory: InventoryItem[];
  onAdd?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => void;
  onDelete?: (id: string) => void;
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ 
  transactions: allTransactions, 
  bookings, 
  customers, 
  services,
  settings,
  inventory,
  onUpdate, 
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [showForm, setShowForm] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    groupedTransactions.forEach(([name]) => {
      all[name] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };
  
  // Filtro de Período (Início e Fim)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  
  // Identificar ID do cliente de teste
  const testCustomerId = useMemo(() => customers.find(c => c.cpf === '33426618877')?.id, [customers]);

  // Filtrar transações de teste e de agendamentos cancelados
  const transactions = useMemo(() => {
    return allTransactions.filter(t => {
      const isTestUser = testCustomerId && t.customerId === testCustomerId;
      
      // Filter out transactions linked to cancelled bookings
      const linkedBooking = t.bookingId ? bookings.find(b => b.id === t.bookingId) : null;
      const isCancelledBooking = linkedBooking?.status === 'cancelled';
      
      return !isTestUser && !isCancelledBooking;
    });
  }, [allTransactions, testCustomerId, bookings]);

  // --- BUSINESS INTELLIGENCE CALCULATIONS ---
  const filteredTransactions = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();
    return transactions.filter(t => {
      const dateStr = t.dueDate || t.date;
      const d = new Date(dateStr + 'T00:00:00').getTime();
      return d >= start && d <= end;
    });
  }, [transactions, dateRange]);

  const filteredBookings = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();
    return bookings.filter(b => {
      const d = new Date(b.dateTime.replace(' ', 'T')).getTime();
      return d >= start && d <= end && b.status !== 'cancelled';
    });
  }, [bookings, dateRange]);

  // 1. Custos Fixos Reais (Pagos + Pendentes)
  const realFixedCosts = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'payable' && FIXED_COST_KEYWORDS.some(kw => 
        (t.category || '').toLowerCase().includes(kw) || 
        (t.description || '').toLowerCase().includes(kw)
      ))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  // 2. Receita do Período (Faturado)
  const periodRevenue = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'receivable' && t.status === 'paid')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  // 3. Custos Variáveis (Insumos/Produtos)
  const variableCosts = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'payable' && SUPPLY_KEYWORDS.some(kw => 
        (t.category || '').toLowerCase().includes(kw) || 
        (t.description || '').toLowerCase().includes(kw)
      ))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  // 4. Lucro ou Prejuízo Real
  const realProfit = periodRevenue - realFixedCosts - variableCosts;

  // 5. Ticket Médio
  const completedBookings = filteredBookings.filter(b => b.status === 'completed');
  const ticketMedio = completedBookings.length > 0 
    ? periodRevenue / completedBookings.length 
    : 0;

  // 6. Ponto de Equilíbrio
  const breakEvenPoint = ticketMedio > 0 ? realFixedCosts / ticketMedio : 0;

  // 7. Meta de Faturamento
  const revenueGoal = settings.monthlyGoal || 5000;
  const goalProgress = (periodRevenue / revenueGoal) * 100;

  // 8. Procedimentos mais lucrativos (Baseado em transações faturadas)
  const profitableProcedures = useMemo(() => {
    const stats: Record<string, { count: number, revenue: number, basePrice: number }> = {};
    filteredTransactions
      .filter(t => t.type === 'receivable' && t.status === 'paid' && t.serviceName)
      .forEach(t => {
        const name = t.serviceName!;
        if (!stats[name]) {
          const service = services.find(s => s.name === name);
          stats[name] = { count: 0, revenue: 0, basePrice: service?.price || 0 };
        }
        stats[name].count += 1;
        stats[name].revenue += t.amount;
      });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        avg: data.revenue / data.count,
        basePrice: data.basePrice
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTransactions, services]);

  // 9. Ranking de Clientes
  const topCustomers = useMemo(() => {
    const spenders: Record<string, { name: string, total: number }> = {};
    filteredTransactions
      .filter(t => t.type === 'receivable' && t.status === 'paid' && t.customerId)
      .forEach(t => {
        if (!spenders[t.customerId!]) spenders[t.customerId!] = { name: t.customerName || 'Cliente', total: 0 };
        spenders[t.customerId!].total += t.amount;
      });
    return Object.entries(spenders)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredTransactions]);

  // 10. Faturamento por Dia
  const dailyRevenueData = useMemo(() => {
    const data: Record<string, number> = {};
    
    // Pre-fill all dates in range to ensure continuity in chart
    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    const current = new Date(start);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      data[dateStr] = 0;
      current.setDate(current.getDate() + 1);
    }

    filteredTransactions
      .filter(t => t.type === 'receivable' && t.status === 'paid')
      .forEach(t => {
        const dateStr = t.date;
        if (data[dateStr] !== undefined) {
          data[dateStr] += t.amount;
        }
      });

    return Object.entries(data)
      .map(([date, revenue]) => ({
        date,
        displayDate: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        revenue
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions, dateRange]);

  // 11. Valor médio por hora trabalhada
  const totalHours = completedBookings.reduce((acc, b) => acc + (b.duration / 60), 0);
  const revenuePerHour = totalHours > 0 ? periodRevenue / totalHours : 0;

  // 12. Previsão de faturamento do período
  const futureBookings = filteredBookings.filter(b => b.status === 'scheduled');
  const forecastedFutureRevenue = futureBookings.reduce((acc, b) => {
    const service = services.find(s => s.id === b.serviceId);
    return acc + (service?.price || 0);
  }, 0);
  const forecastTotal = periodRevenue + forecastedFutureRevenue;

  // 13. Validação: Agendamentos concluídos sem lançamento no caixa
  const missingTransactions = useMemo(() => {
    return filteredBookings.filter(b => {
      if (b.status !== 'completed') return false;
      // Verifica se existe alguma transação vinculada a este agendamento
      return !allTransactions.some(t => t.bookingId === b.id);
    });
  }, [filteredBookings, allTransactions]);

  // 14. Alertas Financeiros
  const alerts = [];
  if (periodRevenue < revenueGoal * 0.5 && new Date().getDate() > 15) {
    alerts.push({ type: 'warning', text: 'Faturamento abaixo da meta esperada.' });
  }
  if (completedBookings.length < 10 && new Date().getDate() > 10) {
    alerts.push({ type: 'info', text: 'Baixo volume de atendimentos no período.' });
  }
  if (realProfit < 0) {
    alerts.push({ type: 'danger', text: 'Lucro negativo! Suas despesas estão superando as receitas.' });
  }
  if (missingTransactions.length > 0) {
    alerts.push({ type: 'warning', text: `${missingTransactions.length} atendimentos concluídos ainda não foram lançados no caixa.` });
  }

  const COLORS = ['#418d50', '#8ec99a', '#2a5b35', '#bbe1c2', '#1e3d28', '#5eaa6e'];

  const defaultTransactionCategories = ['Água', 'Luz', 'Internet', 'Salário', 'Imposto', 'Aluguel', 'Suprimentos', 'Outros'];
  const transactionCategories = settings.transactionCategories || defaultTransactionCategories;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAbateModal, setShowAbateModal] = useState(false);
  const [selectedTransForAbate, setSelectedTransForAbate] = useState<Transaction | null>(null);
  const [abateAmount, setAbateAmount] = useState(0);
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
    category: transactionCategories[0] || 'Outros',
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

  const handleAbate = async () => {
    if (!selectedTransForAbate || abateAmount <= 0) return;
    if (abateAmount > (selectedTransForAbate.amount - (selectedTransForAbate.paidAmount || 0))) {
      return alert("O valor do abatimento não pode ser maior que o saldo devedor.");
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const newPaidAmount = (selectedTransForAbate.paidAmount || 0) + abateAmount;
      const isFullyPaid = newPaidAmount >= selectedTransForAbate.amount;

      if (!(db as any)._isMock) {
        // 1. Create a new transaction for the cash flow
        const cashFlowTrans = {
          type: 'receivable' as const,
          description: `Abatimento: ${selectedTransForAbate.description}`,
          amount: abateAmount,
          date: today,
          customerId: selectedTransForAbate.customerId,
          customerName: selectedTransForAbate.customerName,
          status: 'paid' as const,
          category: 'Abatimento',
          paymentMethod: 'cash', // Default to cash, can be changed
          parentTransactionId: selectedTransForAbate.id,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "transactions"), cashFlowTrans);

        // 2. Update the original transaction
        await updateDoc(doc(db, "transactions", selectedTransForAbate.id), {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? 'paid' : 'pending',
          paidAt: isFullyPaid ? new Date().toISOString() : selectedTransForAbate.paidAt || null,
          updatedAt: new Date().toISOString()
        });
      }

      setShowAbateModal(false);
      setSelectedTransForAbate(null);
      setAbateAmount(0);
      alert("Abatimento registrado com sucesso!");
    } catch (error) {
      console.error("Erro ao registrar abatimento:", error);
      alert("Erro ao registrar abatimento.");
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
      category: transactionCategories[0] || 'Outros',
      paymentMethod: 'pix',
      installmentsCount: 1,
      installments: []
    });
    setCustomerSearch('');
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      {/* Alertas Financeiros */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border flex items-center gap-3 ${
              alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-700' :
              alert.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-700' :
              'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <span className="text-xl">{alert.type === 'danger' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
              <p className="text-xs font-bold uppercase tracking-widest">{alert.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Painel de Performance Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Faturamento (Período)</p>
          <p className="text-3xl font-serif font-bold text-tea-900">R$ {periodRevenue.toLocaleString('pt-BR')}</p>
          <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-tea-600" style={{ width: `${Math.min(goalProgress, 100)}%` }}></div>
          </div>
          <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">{goalProgress.toFixed(1)}% da meta (R$ {revenueGoal})</p>
        </div>

        <div className={`${realProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} p-8 rounded-[2.5rem] border shadow-sm`}>
          <p className={`text-[10px] font-bold ${realProfit >= 0 ? 'text-green-700' : 'text-red-700'} uppercase tracking-widest mb-1`}>Lucro Real Estimado</p>
          <p className={`text-3xl font-serif font-bold ${realProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>R$ {realProfit.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Receita - Custos Fixos - Insumos</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket Médio</p>
          <p className="text-3xl font-serif font-bold text-tea-900">R$ {ticketMedio.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Média por atendimento concluído</p>
        </div>

        <div className="bg-tea-950 p-8 rounded-[2.5rem] text-white shadow-xl">
          <p className="text-[10px] font-bold text-tea-300 uppercase tracking-widest mb-1">Ponto de Equilíbrio</p>
          <p className="text-3xl font-serif font-bold">{Math.ceil(breakEvenPoint)} Atend.</p>
          <p className="text-[8px] text-tea-100 mt-2 font-bold uppercase tracking-widest">Para pagar R$ {realFixedCosts.toFixed(0)} de custos fixos</p>
        </div>
      </div>

      {/* Indicadores Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">⏱️</div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Valor / Hora</p>
            <p className="text-xl font-serif font-bold text-tea-900">R$ {revenuePerHour.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🔮</div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Previsão Total</p>
            <p className="text-xl font-serif font-bold text-tea-900">R$ {forecastTotal.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">📅</div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Atendimentos</p>
            <p className="text-xl font-serif font-bold text-tea-900">{completedBookings.length} Realizados</p>
          </div>
        </div>
      </div>

      {/* Gráficos Visuais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Faturamento Diário */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-serif font-bold text-tea-950 italic mb-8">Faturamento por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#418d50" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#418d50" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#418d50" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Procedimentos Lucrativos */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-serif font-bold text-tea-950 italic mb-8">Procedimentos Lucrativos</h3>
          <div className="space-y-4">
            {profitableProcedures.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-tea-900 text-white rounded-xl flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                  <div>
                    <p className="text-xs font-bold text-tea-950">{p.name}</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{p.count} atendimentos • A partir de R$ {p.basePrice.toFixed(0)} • R$ {p.avg.toFixed(0)} avg</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-tea-800">R$ {p.revenue.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking de Clientes */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-serif font-bold text-tea-950 italic mb-8">Top Clientes (Mês)</h3>
          <div className="space-y-4">
            {topCustomers.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-tea-50/30 rounded-2xl border border-tea-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-tea-200 text-tea-900 rounded-xl flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                  <p className="text-xs font-bold text-tea-950">{c.name}</p>
                </div>
                <p className="text-sm font-bold text-tea-800">R$ {c.total.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhamento de Custos Fixos */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-serif font-bold text-tea-950 italic mb-8">Custos Fixos Reais</h3>
          <div className="space-y-3">
            {transactionCategories.filter(cat => FIXED_COST_KEYWORDS.some(kw => cat.toLowerCase().includes(kw))).map(cat => {
              const amount = filteredTransactions
                .filter(t => t.type === 'payable' && (
                  t.category === cat || 
                  (t.category === 'Outros' && (t.description || '').toLowerCase().includes(cat.toLowerCase()))
                ))
                .reduce((acc, t) => acc + t.amount, 0);
              return (
                <div key={cat} className="flex justify-between items-center p-3 bg-gray-50/30 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cat}</span>
                  <span className="text-sm font-bold text-tea-900">R$ {amount.toFixed(2)}</span>
                </div>
              );
            })}
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm font-bold text-tea-950 uppercase tracking-widest">Total Custos Fixos</span>
              <span className="text-lg font-bold text-red-600">R$ {realFixedCosts.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-8 animate-fade-in">
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

      {/* Validação de Lançamentos */}
      {missingTransactions.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-8 rounded-[3rem] shadow-sm animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">⚠️</div>
            <div>
              <h4 className="text-lg font-bold text-orange-900 font-serif italic">Pendências de Lançamento</h4>
              <p className="text-[10px] text-orange-700 font-bold uppercase tracking-widest">Procedimentos realizados que ainda não constam no caixa</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missingTransactions.map(b => (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between group hover:border-orange-300 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-gray-800">{b.customerName}</p>
                    <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-bold uppercase tracking-widest">Pendente</span>
                  </div>
                  <p className="text-[10px] text-tea-700 font-bold uppercase tracking-widest mb-1">{b.serviceName}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(b.dateTime.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button 
                  onClick={() => {
                    resetForm();
                    setNewTrans({
                      ...newTrans,
                      type: 'receivable',
                      description: `Pagamento: ${b.serviceName}`,
                      amount: services.find(s => s.id === b.serviceId)?.price || 0,
                      date: b.dateTime.split(' ')[0],
                      customerId: b.customerId,
                      bookingId: b.id,
                      status: 'paid'
                    });
                    setCustomerSearch(b.customerName);
                    setShowForm(true);
                  }}
                  className="mt-4 w-full bg-orange-600 text-white py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md"
                >
                  Lançar no Caixa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setTransactionFilter('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${transactionFilter === 'all' ? 'bg-tea-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setTransactionFilter('pending')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${transactionFilter === 'pending' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              Pendentes
            </button>
            <button 
              onClick={() => setTransactionFilter('paid')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${transactionFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              Pagos
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={expandAll}
              className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Expandir Tudo
            </button>
            <button 
              onClick={collapseAll}
              className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Recolher Tudo
            </button>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {displayTransactions.length} {displayTransactions.length === 1 ? 'Lançamento' : 'Lançamentos'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data / Proc.</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupedTransactions.map(([customerName, customerTrans]) => {
                const isExpanded = expandedGroups[customerName];
                const groupTotal = customerTrans.reduce((sum, t) => sum + (t.type === 'receivable' ? t.amount : -t.amount), 0);
                
                return (
                  <React.Fragment key={customerName}>
                    <tr 
                      className="bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleGroup(customerName)}
                    >
                      <td colSpan={3} className="px-10 py-4 text-[10px] font-black text-tea-900 uppercase tracking-[0.2em] border-y border-gray-100">
                        <span className="inline-block w-4 mr-2 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        👤 {customerName} <span className="ml-2 opacity-40 font-normal italic">({customerTrans.length} {customerTrans.length === 1 ? 'lançamento' : 'lançamentos'})</span>
                      </td>
                      <td className="px-10 py-4 text-right border-y border-gray-100">
                        <span className={`text-[10px] font-bold ${groupTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Saldo: R$ {groupTotal.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && customerTrans.map(t => (
                      <tr key={t.id} className="hover:bg-tea-50/10 transition-colors group animate-fade-in">
                        <td className="px-10 py-8">
                          <p className="text-xs font-bold text-gray-500">{new Date((t.procedureDate || t.date).replace(' ', 'T')).toLocaleDateString()}</p>
                          {t.procedureDate && <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Lanç: {new Date(t.date.replace(' ', 'T')).toLocaleDateString()}</p>}
                        </td>
                        <td className="px-10 py-8">
                          <p className="font-bold text-tea-950 text-sm">{t.description}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {t.serviceName && (
                              <p className="text-[9px] text-tea-600 font-bold uppercase tracking-tighter">
                                {t.serviceName} {services.find(s => s.name === t.serviceName) && `(A partir de R$ ${services.find(s => s.name === t.serviceName)?.price.toFixed(0)})`}
                              </p>
                            )}
                            {t.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold uppercase">Pendente</span>
                                {t.paidAmount && t.paidAmount > 0 && (
                                  <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">
                                    Pago: R$ {t.paidAmount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-10 py-8 text-right font-bold text-base ${t.type === 'receivable' ? 'text-tea-800' : 'text-red-500'}`}>
                          {t.type === 'receivable' && t.status === 'pending' && t.paidAmount && t.paidAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-gray-400 text-[10px] line-through">R$ {t.amount.toFixed(2)}</span>
                              <span>R$ {(t.amount - t.paidAmount).toFixed(2)}</span>
                            </div>
                          ) : (
                            <>{t.type === 'receivable' ? '+' : '-'} R$ {t.amount.toFixed(2)}</>
                          )}
                        </td>
                        <td className="px-10 py-8 text-center">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.status === 'pending' && t.type === 'receivable' && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedTransForAbate(t); 
                                  setAbateAmount(t.amount - (t.paidAmount || 0));
                                  setShowAbateModal(true); 
                                }} 
                                className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Abater Valor"
                              >
                                💰
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(t); }} 
                              className="p-2 bg-tea-50 text-tea-700 rounded-lg hover:bg-tea-100 transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} 
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {displayTransactions.length === 0 && (
                <tr><td colSpan={4} className="py-24 text-center text-gray-300 italic font-serif text-lg">Nenhum registro financeiro neste período com este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const totals = useMemo(() => {
    // Revenue: Sum of paid receivables, excluding "parent" transactions that were paid via abatimentos
    // to avoid double counting with the individual abatimento records.
    const revenue = filteredTransactions
      .filter(t => t.type === 'receivable' && t.status === 'paid' && !(t.paidAmount && t.paidAmount > 0))
      .reduce((a, b) => a + b.amount, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'payable' && t.status === 'paid')
      .reduce((a, b) => a + b.amount, 0);
    
    // Pending: The remaining amount of pending receivables
    const pending = filteredTransactions
      .filter(t => t.type === 'receivable' && t.status === 'pending')
      .reduce((a, b) => a + (b.amount - (b.paidAmount || 0)), 0);
      
    return { revenue, expenses, pending, balance: revenue - expenses };
  }, [filteredTransactions]);

  const displayTransactions = useMemo(() => {
    return filteredTransactions.filter(t => {
      // Avoid showing the "parent" transaction in the list if it's already fully paid
      // because the individual abatimento records already represent the cash flow.
      if (t.status === 'paid' && t.paidAmount && t.paidAmount > 0) return false;

      if (transactionFilter === 'all') return true;
      return t.status === transactionFilter;
    });
  }, [filteredTransactions, transactionFilter]);

  // Agrupamento de transações por cliente para a visão de lançamentos
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    displayTransactions.forEach(t => {
      const groupKey = t.customerName || 'Geral / Despesas';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(t);
    });

    // Ordenar transações dentro de cada grupo pela data do procedimento (ou data do lançamento)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = new Date((a.procedureDate || a.date).replace(' ', 'T')).getTime();
        const dateB = new Date((b.procedureDate || b.date).replace(' ', 'T')).getTime();
        return dateB - dateA; // Mais recentes primeiro
      });
    });

    // Ordenar grupos por nome do cliente
    return Object.entries(groups).sort(([nameA], [nameB]) => {
      if (nameA === 'Geral / Despesas') return 1;
      if (nameB === 'Geral / Despesas') return -1;
      return nameA.localeCompare(nameB);
    });
  }, [filteredTransactions]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 rounded-[3.5rem] border border-gray-100 shadow-sm gap-6">
        <div>
          <h2 className="text-3xl font-bold text-tea-950 font-serif italic">Caixa Moriá</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Ganhos e Despesas</p>
        </div>

        {/* Filtro de Período */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <div className="flex flex-col">
            <label className="text-[7px] font-bold text-gray-400 uppercase ml-1">Início</label>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer px-1 text-tea-900"
            />
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <div className="flex flex-col">
            <label className="text-[7px] font-bold text-gray-400 uppercase ml-1">Fim</label>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer px-1 text-tea-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Inteligência
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'transactions' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Lançamentos
            </button>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl">+ Novo</button>
        </div>
      </div>

      {activeTab === 'dashboard' ? renderDashboard() : renderTransactions()}

      {showAbateModal && selectedTransForAbate && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic">Abater Valor</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Registrar pagamento parcial</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</p>
              <p className="text-sm font-bold text-tea-900">{selectedTransForAbate.description}</p>
              <div className="flex justify-between pt-2">
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-xs font-bold text-gray-600">R$ {selectedTransForAbate.amount.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Saldo Devedor</p>
                  <p className="text-xs font-bold text-orange-600">R$ {(selectedTransForAbate.amount - (selectedTransForAbate.paidAmount || 0)).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Valor do Pagamento R$</label>
              <input 
                type="number" 
                value={abateAmount || ''} 
                onChange={e => setAbateAmount(parseFloat(e.target.value))} 
                className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-2xl text-emerald-600 shadow-inner" 
                placeholder="0,00" 
              />
            </div>

            <div className="pt-4 space-y-3">
              <button 
                onClick={handleAbate}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
              >
                Confirmar Abatimento
              </button>
              <button 
                onClick={() => { setShowAbateModal(false); setSelectedTransForAbate(null); }}
                className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                    onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                  >
                    {transactionCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
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
