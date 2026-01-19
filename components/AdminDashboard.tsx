
import React, { useState, useMemo } from 'react';
import { Booking, Transaction, Customer } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AdminDashboardProps {
  bookings: Booking[];
  transactions: Transaction[];
  customers: Customer[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, transactions, customers }) => {
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
      // Filtrando transações pelo VENCIMENTO para que as projeções do próximo mês funcionem
      const d = new Date(t.dueDate || t.date).getTime();
      return d >= start && d <= end;
    });

    const fBookings = bookings.filter(b => {
      const d = new Date(b.dateTime.replace(' ', 'T')).getTime();
      return d >= start && d <= end;
    });

    return { transactions: fTransactions, bookings: fBookings };
  }, [transactions, bookings, dateRange]);

  const totalReceivable = filteredData.transactions
    .filter(t => t.type === 'receivable')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalPayable = filteredData.transactions
    .filter(t => t.type === 'payable')
    .reduce((acc, t) => acc + t.amount, 0);

  const stats = [
    { label: 'Confirmados', value: filteredData.bookings.filter(b => b.status === 'scheduled').length, icon: '📅', color: 'bg-blue-50 text-blue-600' },
    { label: 'Novos Pedidos', value: filteredData.bookings.filter(b => b.status === 'pending').length, icon: '🔔', color: 'bg-orange-50 text-orange-600' },
    { label: 'Receitas Previstas', value: `R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: '💰', color: 'bg-green-50 text-green-600' },
    { label: 'Despesas Previstas', value: `R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: '💸', color: 'bg-red-50 text-red-600' },
  ];

  const chartData = [
    { name: 'Receitas', value: totalReceivable },
    { name: 'Despesas', value: totalPayable },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resumo Gerencial</h1>
          <p className="text-gray-500 text-sm">Acompanhe as metas e o fluxo financeiro do Studio Moriá.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
            <button 
              onClick={() => handlePeriodChange('current')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === 'current' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Mês Atual
            </button>
            <button 
              onClick={() => handlePeriodChange('next')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === 'next' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Próximo Mês
            </button>
            <button 
              onClick={() => setPeriod('custom')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === 'custom' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Personalizado
            </button>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none focus:border-tea-200"
              />
              <span className="text-gray-300">até</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none focus:border-tea-200"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-tea-100 transition-all ${stat.label === 'Novos Pedidos' && (stat.value as number) > 0 ? 'border-orange-200 shadow-orange-50' : ''}`}>
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center text-xl mb-4 shadow-sm`}>
              {stat.icon}
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-tea-900">Previsão Financeira (Vencimentos)</h3>
            <div className="text-right">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Saldo do Período</p>
              <p className={`text-sm font-bold ${(totalReceivable - totalPayable) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(totalReceivable - totalPayable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}} 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#418d50' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-tea-900 mb-8">Agenda do Período</h3>
          <div className="space-y-4 flex-grow overflow-y-auto custom-scroll pr-2 max-h-[320px]">
            {filteredData.bookings.filter(b => b.status === 'scheduled' || b.status === 'pending').length > 0 ? (
              filteredData.bookings
                .filter(b => b.status === 'scheduled' || b.status === 'pending')
                .sort((a,b) => new Date(a.dateTime.replace(' ', 'T')).getTime() - new Date(b.dateTime.replace(' ', 'T')).getTime())
                .map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-50 hover:bg-white hover:border-tea-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-tea-700 text-sm">
                      {booking.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{booking.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{booking.serviceName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-tea-700">
                      {new Date(booking.dateTime.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      {new Date(booking.dateTime.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 opacity-30 italic">
                <span className="text-4xl mb-2">📅</span>
                <p className="text-xs">Nenhum compromisso para este período.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
