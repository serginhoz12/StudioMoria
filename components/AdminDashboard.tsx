
import React, { useState, useMemo } from 'react';
import { Booking, Transaction, Customer, SalonSettings } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend 
} from 'recharts';

interface AdminDashboardProps {
  bookings: Booking[];
  transactions: Transaction[];
  customers: Customer[];
  settings: SalonSettings;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, transactions, customers, settings }) => {
  const [period, setPeriod] = useState<'current' | 'next' | 'custom'>('current');
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

    const fTransactions = transactions.filter(t => {
      const d = new Date(t.dueDate || t.date).getTime();
      return d >= start && d <= end;
    });

    const fBookings = bookings.filter(b => {
      const d = new Date(b.dateTime.replace(' ', 'T')).getTime();
      return d >= start && d <= end;
    });

    return { transactions: fTransactions, bookings: fBookings };
  }, [transactions, bookings, dateRange]);

  // Cálculos de KPIs Avançados
  const totalReceivable = filteredData.transactions
    .filter(t => t.type === 'receivable')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalPayable = filteredData.transactions
    .filter(t => t.type === 'payable')
    .reduce((acc, t) => acc + t.amount, 0);

  const completedBookings = filteredData.bookings.filter(b => b.status === 'completed');
  const cancelledBookings = filteredData.bookings.filter(b => b.status === 'cancelled');
  
  const ticketMedio = completedBookings.length > 0 ? totalReceivable / completedBookings.length : 0;
  
  const totalVisits = (settings as any).visitCount || 0;
  
  const cancellationRate = filteredData.bookings.length > 0 
    ? (cancelledBookings.length / filteredData.bookings.length) * 100 
    : 0;

  // Ranking: Clientes que mais gastaram (LTV no período)
  const topSpenders = useMemo(() => {
    const spenders: Record<string, { name: string, total: number }> = {};
    filteredData.transactions
      .filter(t => t.type === 'receivable' && t.status === 'paid' && t.customerId)
      .forEach(t => {
        if (!spenders[t.customerId!]) spenders[t.customerId!] = { name: t.customerName || 'Cliente', total: 0 };
        spenders[t.customerId!].total += t.amount;
      });
    return Object.values(spenders).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredData.transactions]);

  // Ranking: Clientes mais frequentes
  const topFrequent = useMemo(() => {
    const frequent: Record<string, { name: string, count: number }> = {};
    filteredData.bookings
      .filter(b => b.status === 'completed')
      .forEach(b => {
        if (!frequent[b.customerId]) frequent[b.customerId] = { name: b.customerName, count: 0 };
        frequent[b.customerId].count += 1;
      });
    return Object.values(frequent).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredData.bookings]);

  // Dados para Gráfico de Pizza: Distribuição de Serviços
  const serviceDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredData.bookings.forEach(b => {
      dist[b.serviceName] = (dist[b.serviceName] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredData.bookings]);

  const COLORS = ['#418d50', '#8ec99a', '#2a5b35', '#bbe1c2', '#1e3d28', '#5eaa6e'];

  const stats = [
    { label: 'Visitas ao Site', value: totalVisits.toLocaleString(), icon: '👁️', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Ticket Médio', value: `R$ ${ticketMedio.toFixed(2)}`, icon: '📈', color: 'bg-blue-50 text-blue-600' },
    { label: 'Taxa de Cancelamento', value: `${cancellationRate.toFixed(1)}%`, icon: '⚠️', color: cancellationRate > 15 ? 'bg-red-50 text-red-600' : 'bg-tea-50 text-tea-600' },
    { label: 'Receitas (Total)', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: '💰', color: 'bg-green-50 text-green-600' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header com Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-serif font-bold text-tea-950 italic">Inteligência Moriá</h1>
          <p className="text-gray-400 text-sm">Visão estratégica e comportamento das clientes.</p>
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
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50 hover:bg-white transition-all">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-tea-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">{i + 1}</div>
                      <span className="text-xs font-bold text-gray-800 line-clamp-1">{s.name}</span>
                   </div>
                   <span className="text-sm font-bold text-tea-800">R$ {s.total.toFixed(0)}</span>
                </div>
              ))}
              {topSpenders.length === 0 && <p className="text-center py-10 text-gray-300 italic">Sem dados financeiros.</p>}
           </div>
        </div>

        {/* Top Clientes - Frequência */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-tea-900 mb-6 font-serif italic">Clientes Mais Assíduas</h3>
           <div className="space-y-4">
              {topFrequent.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-tea-50/30 rounded-2xl border border-tea-50 hover:bg-white transition-all">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-tea-200 text-tea-900 rounded-lg flex items-center justify-center font-bold text-xs">{i + 1}</div>
                      <span className="text-xs font-bold text-gray-800 line-clamp-1">{s.name}</span>
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-tea-700">{s.count} visitas</span>
                </div>
              ))}
              {topFrequent.length === 0 && <p className="text-center py-10 text-gray-300 italic">Sem agendamentos concluídos.</p>}
           </div>
        </div>

      </div>

      {/* Gráfico de Barras Financeiro de Vencimentos */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-bold text-tea-900 font-serif italic">Tendência de Receita x Despesa</h3>
          <div className="text-right">
             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Saldo Previsto</p>
             <p className={`text-xl font-bold ${(totalReceivable - totalPayable) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(totalReceivable - totalPayable).toLocaleString('pt-BR')}
             </p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: 'Receitas', value: totalReceivable }, { name: 'Despesas', value: totalPayable }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
              <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '12px' }} />
              <Bar dataKey="value" radius={[15, 15, 15, 15]} barSize={60}>
                 <Cell fill="#418d50" />
                 <Cell fill="#ef4444" />
              </Bar>
            </BarChart>
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
    </div>
  );
};

export default AdminDashboard;
