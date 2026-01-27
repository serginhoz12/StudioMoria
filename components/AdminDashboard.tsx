
import React, { useState, useMemo } from 'react';
import { Booking, Transaction, Customer, SalonSettings, TeamMember } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie 
} from 'recharts';

interface AdminDashboardProps {
  bookings: Booking[];
  transactions: Transaction[];
  customers: Customer[];
  settings: SalonSettings;
  loggedMember: TeamMember;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, transactions, customers, settings, loggedMember }) => {
  const [period, setPeriod] = useState<'current' | 'next' | 'custom'>('current');
  const isOwner = loggedMember.role === 'owner';

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === 'current') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      };
    }
    return {
       start: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0],
       end: new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0]
    };
  }, [period]);

  const filteredData = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();

    // Filtra transações pelo profissional se não for dono
    const fTransactions = (transactions || []).filter(t => {
      const d = new Date(t.dueDate || t.date).getTime();
      const inDate = d >= start && d <= end;
      const isMine = isOwner || t.teamMemberId === loggedMember.id;
      return inDate && isMine;
    });

    const fBookings = (bookings || []).filter(b => {
      const d = new Date(b.dateTime.replace(' ', 'T')).getTime();
      const inDate = d >= start && d <= end;
      const isMine = isOwner || b.teamMemberId === loggedMember.id;
      return inDate && isMine;
    });

    return { transactions: fTransactions, bookings: fBookings };
  }, [transactions, bookings, dateRange, loggedMember, isOwner]);

  const totalReceivable = filteredData.transactions
    .filter(t => t.type === 'receivable')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const completedCount = filteredData.bookings.filter(b => b.status === 'completed').length;
  const ticketMedio = completedCount > 0 ? totalReceivable / completedCount : 0;

  const stats = [
    { label: isOwner ? 'Faturamento Total' : 'Meus Dividendos', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: '💰', color: 'bg-green-50 text-green-600' },
    { label: 'Atendimentos Realizados', value: completedCount, icon: '🌿', color: 'bg-tea-50 text-tea-600' },
    { label: 'Ticket Médio', value: `R$ ${ticketMedio.toFixed(2)}`, icon: '📈', color: 'bg-blue-50 text-blue-600' },
    { label: 'Minha Performance', value: `${((completedCount / 30) * 100).toFixed(1)}%`, icon: '⚡', color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-serif font-bold text-tea-950 italic">Olá, {(loggedMember.name || '').split(' ')[0]}</h1>
          <p className="text-gray-400 text-sm">Acompanhe sua performance e dividendos no Studio Moriá.</p>
        </div>
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
          {['current', 'next'].map((p) => (
            <button 
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${period === p ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {p === 'current' ? 'Mês Atual' : 'Próximo Mês'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center text-xl mb-4`}>{stat.icon}</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-serif font-bold text-gray-900 italic">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100">
           <h3 className="text-xl font-bold text-tea-900 font-serif italic mb-10">Histórico de Produção</h3>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.bookings.slice(-10).map(b => ({ name: (b.customerName || 'Cliente').split(' ')[0], valor: b.finalPrice || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}} />
                  <Bar dataKey="valor" fill="#418d50" radius={[10, 10, 10, 10]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
