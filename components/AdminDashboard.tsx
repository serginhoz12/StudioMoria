
import React, { useState, useMemo } from 'react';
import { Booking, Transaction, Customer, SalonSettings, Service, WaitlistEntry } from '../types';
import { FIXED_COST_KEYWORDS } from '../constants';
import { db } from '../firebase.ts';
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import CustomerHistoryModal from './CustomerHistoryModal';
import BusinessInsights from './BusinessInsights';

interface AdminDashboardProps {
  bookings: Booking[];
  transactions: Transaction[];
  customers: Customer[];
  services: Service[];
  settings: SalonSettings;
  waitlist: WaitlistEntry[];
  inventory: any[];
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, transactions, customers, services, settings, waitlist, inventory, onLogout }) => {
  const [period, setPeriod] = useState<'current' | 'next' | 'custom'>('current');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
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

  const filteredData = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();
    
    // Identificar ID do cliente de teste
    const testCustomerId = customers.find(c => c.cpf === '33426618877')?.id;

    const fTransactions = transactions.filter(t => {
      const dateStr = t.dueDate || t.date;
      const d = new Date(dateStr + 'T00:00:00').getTime();
      const isTestUser = testCustomerId && t.customerId === testCustomerId;
      
      // Filter out transactions linked to cancelled bookings
      const linkedBooking = t.bookingId ? bookings.find(b => b.id === t.bookingId) : null;
      const isCancelledBooking = linkedBooking?.status === 'cancelled';
      
      return d >= start && d <= end && !isTestUser && !isCancelledBooking;
    });

    const fBookings = bookings.filter(b => {
      const d = new Date(b.dateTime.replace(' ', 'T')).getTime();
      const isTestUser = testCustomerId && b.customerId === testCustomerId;
      const isCancelled = b.status === 'cancelled';
      return d >= start && d <= end && !isTestUser && !isCancelled;
    });

    return { transactions: fTransactions, bookings: fBookings };
  }, [transactions, bookings, dateRange, customers]);

  // Cálculos de KPIs Avançados
  const totalReceivable = filteredData.transactions
    .filter(t => t.type === 'receivable' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalPayable = filteredData.transactions
    .filter(t => t.type === 'payable' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);

  const fixedCosts = filteredData.transactions
    .filter(t => t.type === 'payable' && FIXED_COST_KEYWORDS.some(kw => 
      (t.category || '').toLowerCase().includes(kw) || 
      (t.description || '').toLowerCase().includes(kw)
    ))
    .reduce((acc, t) => acc + t.amount, 0);

  // 11. Tendência de Receita x Despesa (Diário)
  const dailyTrendData = useMemo(() => {
    const data: Record<string, { date: string, displayDate: string, revenue: number, expenses: number }> = {};
    
    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    const current = new Date(start);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      data[dateStr] = {
        date: dateStr,
        displayDate: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        revenue: 0,
        expenses: 0
      };
      current.setDate(current.getDate() + 1);
    }

    filteredData.transactions.forEach(t => {
      const dateStr = t.dueDate || t.date;
      if (data[dateStr]) {
        if (t.type === 'receivable' && t.status === 'paid') {
          data[dateStr].revenue += t.amount;
        } else if (t.type === 'payable' && t.status === 'paid') {
          data[dateStr].expenses += t.amount;
        }
      }
    });

    return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData.transactions, dateRange]);

  const completedBookings = filteredData.bookings.filter(b => b.status === 'completed');
  
  // Estimated product cost for completed bookings
  const estimatedProductCost = useMemo(() => {
    return completedBookings.reduce((acc, b) => {
      const service = services.find(s => s.id === b.serviceId);
      if (!service || !service.usedProducts) return acc;
      
      const serviceCost = service.usedProducts.reduce((sAcc, up) => {
        const product = inventory.find(p => p.id === up.productId);
        if (!product || !product.purchasePrice || !product.netWeight) return sAcc;
        return sAcc + (product.purchasePrice / product.netWeight * up.consumption);
      }, 0);
      
      return acc + serviceCost;
    }, 0);
  }, [completedBookings, services, inventory]);

  const cancelledBookings = filteredData.bookings.filter(b => b.status === 'cancelled');
  
  const ticketMedio = completedBookings.length > 0 ? totalReceivable / completedBookings.length : 0;
  
  const totalVisits = (settings as any).visitCount || 0;
  
  const cancellationRate = filteredData.bookings.length > 0 
    ? (cancelledBookings.length / filteredData.bookings.length) * 100 
    : 0;

  const netProfit = totalReceivable - totalPayable - estimatedProductCost;

  // Ranking: Clientes que mais gastaram (LTV no período)
  const topSpenders = useMemo(() => {
    const spenders: Record<string, { id: string, name: string, total: number }> = {};
    filteredData.transactions
      .filter(t => t.type === 'receivable' && t.status === 'paid' && t.customerId)
      .forEach(t => {
        if (!spenders[t.customerId!]) spenders[t.customerId!] = { id: t.customerId!, name: t.customerName || 'Cliente', total: 0 };
        spenders[t.customerId!].total += t.amount;
      });
    return Object.values(spenders).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredData.transactions]);

  // Ranking: Clientes mais frequentes
  const topFrequent = useMemo(() => {
    const frequent: Record<string, { 
      id: string, 
      name: string, 
      count: number, 
      days: Set<string>,
      totalSpent: number 
    }> = {};

    filteredData.bookings
      .filter(b => b.status === 'completed')
      .forEach(b => {
        if (!frequent[b.customerId]) {
          frequent[b.customerId] = { 
            id: b.customerId, 
            name: b.customerName, 
            count: 0, 
            days: new Set<string>(),
            totalSpent: 0
          };
        }
        frequent[b.customerId].count += 1;
        const datePart = b.dateTime.split(' ')[0];
        frequent[b.customerId].days.add(datePart);
      });

    // Somar gastos das transações para calcular ticket médio
    filteredData.transactions
      .filter(t => t.type === 'receivable' && t.status === 'paid' && t.customerId)
      .forEach(t => {
        if (frequent[t.customerId!]) {
          frequent[t.customerId!].totalSpent += t.amount;
        }
      });

    return Object.values(frequent)
      .map(f => ({
        id: f.id,
        name: f.name,
        count: f.count,
        dayCount: f.days.size,
        avgTicket: f.days.size > 0 ? f.totalSpent / f.days.size : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData.bookings, filteredData.transactions]);

  // Dados para Gráfico de Pizza: Distribuição de Serviços
  const serviceDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredData.bookings.forEach(b => {
      dist[b.serviceName] = (dist[b.serviceName] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredData.bookings]);

  const COLORS = ['#418d50', '#8ec99a', '#2a5b35', '#bbe1c2', '#1e3d28', '#5eaa6e'];

  const handleCompleteBooking = async (booking: Booking) => {
    if (!(db as any)._isMock) {
      try {
        const service = services.find(s => s.id === booking.serviceId);
        const price = booking.originalPrice || service?.price || 0;

        // 1. Update booking status
        await updateDoc(doc(db, "bookings", booking.id), {
          status: 'completed',
          paymentReceived: price,
          paymentDate: new Date().toISOString(),
          depositStatus: 'paid'
        });

        // 2. Create transaction (only if not already paid)
        if (booking.depositStatus !== 'paid') {
          await addDoc(collection(db, "transactions"), {
            type: 'receivable',
            description: `Atendimento: ${booking.serviceName} - ${booking.customerName}`,
            amount: price,
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
            customerId: booking.customerId,
            customerName: booking.customerName,
            bookingId: booking.id,
            serviceName: booking.serviceName,
            procedureDate: booking.dateTime,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }

        alert("Atendimento concluído e lançado no caixa!");
      } catch (e) {
        console.error(e);
        alert("Erro ao concluir atendimento.");
      }
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = useMemo(() => {
    return bookings
      .filter(b => b.dateTime.startsWith(todayStr) && b.status === 'scheduled')
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [bookings, todayStr]);

  const currentMonth = new Date().getMonth() + 1;
  const birthdaysThisMonth = useMemo(() => {
    return customers.filter(c => {
      if (!c.birthday) return false;
      const month = parseInt(c.birthday.split('-')[1]);
      return month === currentMonth;
    });
  }, [customers, currentMonth]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.quantity <= item.minQuantity);
  }, [inventory]);

  const expiringItems = useMemo(() => {
    const thirtyDaysFromNow = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
    return inventory.filter(item => item.expiryDate && new Date(item.expiryDate).getTime() <= thirtyDaysFromNow);
  }, [inventory]);

  const stats = [
    { label: 'Visitas ao Site', value: totalVisits.toLocaleString(), icon: '👁️', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Custos Fixos', value: `R$ ${fixedCosts.toLocaleString('pt-BR')}`, icon: '🏠', color: 'bg-orange-50 text-orange-600' },
    { label: 'Lucro Líquido Est.', value: `R$ ${netProfit.toLocaleString('pt-BR')}`, icon: '💎', color: netProfit > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600' },
    { label: 'Receitas (Total)', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: '💰', color: 'bg-green-50 text-green-600' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header com Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-serif font-bold text-tea-950 italic">Inteligência Moriá</h1>
          <p className="text-gray-400 text-sm">Visão estratégica e comportamento das clientes.</p>
          <button 
            onClick={onLogout}
            className="mt-4 lg:hidden bg-red-50 text-red-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-100"
          >
            Encerrar Sessão
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
            {['current', 'next', 'custom'].map((p) => (
              <button 
                key={p}
                onClick={() => handlePeriodChange(p as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === p ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {p === 'current' ? 'Mês Atual' : p === 'next' ? 'Próximo Mês' : 'Período'}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none" />
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none" />
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Section */}
      <BusinessInsights 
        bookings={bookings}
        transactions={transactions}
        customers={customers}
        inventory={inventory}
      />

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-tea-100 transition-all`}>
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-2xl mb-4 shadow-sm`}>
              {stat.icon}
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-serif font-bold text-gray-900 italic">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Alertas e Aniversários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Aniversariantes do Mês */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-tea-900 font-serif italic">Aniversariantes do Mês</h3>
            <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {birthdaysThisMonth.length} Clientes
            </span>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
            {birthdaysThisMonth.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs">🎂</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{c.name}</p>
                    <p className="text-[8px] text-gray-400 uppercase font-bold tracking-widest">
                      {c.birthday?.split('-')[2]}/{c.birthday?.split('-')[1]}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => window.open(`https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=Parabéns ${c.name}! O Studio Moriá deseja um dia maravilhoso!`, '_blank')}
                  className="text-[8px] font-bold text-tea-700 uppercase tracking-widest hover:underline"
                >
                  Enviar Parabéns
                </button>
              </div>
            ))}
            {birthdaysThisMonth.length === 0 && (
              <p className="text-center py-10 text-gray-300 italic text-sm">Nenhum aniversário este mês.</p>
            )}
          </div>
        </div>

        {/* Alerta de Estoque Baixo */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-tea-900 font-serif italic">Alerta de Estoque</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${lowStockItems.length > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
              {lowStockItems.length} Itens Críticos
            </span>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50/30 rounded-2xl border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs">📦</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{item.name}</p>
                    <p className="text-[8px] text-orange-600 uppercase font-bold tracking-widest">
                      Restam apenas {item.quantity} {item.unit}
                    </p>
                  </div>
                </div>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: `${(item.quantity / item.minQuantity) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <p className="text-center py-10 text-gray-300 italic text-sm">Estoque em dia.</p>
            )}
          </div>
        </div>

        {/* Alerta de Vencimento de Produtos */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-tea-900 font-serif italic">Produtos a Vencer</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${expiringItems.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {expiringItems.length} Alertas
            </span>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
            {expiringItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/30 rounded-2xl border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">📅</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{item.name}</p>
                    <p className={`text-[8px] font-bold uppercase tracking-widest ${new Date(item.expiryDate!).getTime() < new Date().getTime() ? 'text-red-700' : 'text-red-500'}`}>
                      {new Date(item.expiryDate!).getTime() < new Date().getTime() ? 'VENCIDO EM: ' : 'VENCE EM: '} 
                      {new Date(item.expiryDate! + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {expiringItems.length === 0 && (
              <p className="text-center py-10 text-gray-300 italic text-sm">Nenhum produto próximo ao vencimento.</p>
            )}
          </div>
        </div>
      </div>

      {/* Agenda do Dia */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-tea-900 font-serif italic">Agenda do Dia</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Atendimentos agendados para hoje</p>
          </div>
          <span className="bg-tea-50 text-tea-700 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {todayBookings.length} agendados
          </span>
        </div>

        <div className="space-y-4">
          {todayBookings.map(booking => (
            <div key={booking.id} className="flex flex-col sm:flex-row justify-between items-center p-6 bg-gray-50/50 rounded-3xl border border-gray-50 hover:bg-white hover:border-tea-100 transition-all gap-4">
              <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-gray-100">
                  <span className="text-lg font-serif font-bold text-tea-900 italic">{booking.dateTime.split(' ')[1]}</span>
                  <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Horário</span>
                </div>
                <div>
                  <p className="font-bold text-tea-950 text-lg leading-tight">{booking.customerName}</p>
                  <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest mt-1">{booking.serviceName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                <div className="text-right hidden md:block">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Profissional</p>
                  <p className="text-[10px] font-bold text-tea-800">{booking.teamMemberName}</p>
                </div>
                <button 
                  onClick={() => handleCompleteBooking(booking)}
                  className="px-6 py-3 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-lg hover:bg-black transition-all whitespace-nowrap"
                >
                  Concluir Atendimento
                </button>
              </div>
            </div>
          ))}
          {todayBookings.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 opacity-50">📅</div>
              <p className="text-gray-300 italic font-serif">Nenhum agendamento para hoje.</p>
            </div>
          )}
        </div>
      </div>

      {/* Seção Central: Gráficos e Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Distribuição de Serviços (Pizza) */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-tea-900 mb-6 font-serif italic">Serviços Favoritos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {serviceDistribution.slice(0, 3).map((s, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                   {s.name}
                </span>
                <span className="text-gray-400">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clientes - Faturamento */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-tea-900 mb-6 font-serif italic">Maiores Faturamentos</h3>
           <div className="space-y-4">
              {topSpenders.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedCustomerId(s.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50 hover:bg-white transition-all group"
                >
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-tea-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">{i + 1}</div>
                      <span className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-tea-800 transition-colors">{s.name}</span>
                   </div>
                   <span className="text-sm font-bold text-tea-800">R$ {s.total.toFixed(0)}</span>
                </button>
              ))}
              {topSpenders.length === 0 && <p className="text-center py-10 text-gray-300 italic">Sem dados financeiros.</p>}
           </div>
        </div>

        {/* Top Clientes - Frequência */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-tea-900 mb-6 font-serif italic">Clientes Mais Assíduas</h3>
           <div className="space-y-4">
              {topFrequent.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedCustomerId(s.id)}
                  className="w-full flex items-center justify-between p-4 bg-tea-50/30 rounded-2xl border border-tea-50 hover:bg-white transition-all group"
                >
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-tea-200 text-tea-900 rounded-lg flex items-center justify-center font-bold text-xs">{i + 1}</div>
                      <span className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-tea-800 transition-colors">{s.name}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-tea-700">{s.count} agend. | {s.dayCount} {s.dayCount === 1 ? 'dia' : 'dias'}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ticket: R$ {s.avgTicket.toFixed(0)}</p>
                   </div>
                </button>
              ))}
              {topFrequent.length === 0 && <p className="text-center py-10 text-gray-300 italic">Sem agendamentos concluídos.</p>}
           </div>
        </div>

      </div>

      {/* Gráfico de Tendência Financeira */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-bold text-tea-900 font-serif italic">Tendência de Receita x Despesa</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Acompanhamento diário do fluxo de caixa</p>
          </div>
          <div className="text-right">
             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Saldo do Período</p>
             <p className={`text-xl font-bold ${(totalReceivable - totalPayable) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(totalReceivable - totalPayable).toLocaleString('pt-BR')}
             </p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#418d50" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#418d50" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '12px' }}
                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`]}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Area name="Receitas" type="monotone" dataKey="revenue" stroke="#418d50" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              <Area name="Despesas" type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rodapé do Dashboard com Insights IA (Simulados) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-tea-950 p-10 rounded-[3rem] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💡</div>
            <h4 className="text-tea-400 font-bold uppercase text-[10px] tracking-widest mb-4">Moriá Business Insight</h4>
            <p className="font-serif italic text-lg leading-relaxed">
               {totalVisits > 1000 ? "Seu tráfego está excelente! Considere uma campanha de 'Primeira Visita' para converter esses acessos em agendamentos." : "Tráfego moderado. Que tal publicar uma Dica de Especialista para atrair novos olhares no app?"}
            </p>
         </div>
         <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm">🌿</div>
            <div>
               <h4 className="font-bold text-tea-950 text-sm tracking-widest uppercase">Saúde do Salão</h4>
               <p className="text-xs text-gray-500 italic mt-1">
                  {cancellationRate < 10 ? "Sua taxa de cancelamento está abaixo da média do mercado (Excelente!)." : "Atenção à taxa de cancelamento. Verifique se o processo de cobrança de sinal está claro para as clientes."}
               </p>
            </div>
         </div>
      </div>
      {/* Modal de Histórico da Cliente */}
      {selectedCustomerId && (
        <CustomerHistoryModal 
          customer={customers.find(c => c.id === selectedCustomerId)!}
          bookings={bookings}
          transactions={transactions}
          waitlist={waitlist}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
