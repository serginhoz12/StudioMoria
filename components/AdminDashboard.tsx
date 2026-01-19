
import React from 'react';
import { Booking, Transaction, Customer } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AdminDashboardProps {
  bookings: Booking[];
  transactions: Transaction[];
  customers: Customer[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, transactions, customers }) => {
  const totalReceivable = transactions
    .filter(t => t.type === 'receivable')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalPayable = transactions
    .filter(t => t.type === 'payable')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  const stats = [
    { label: 'Confirmados', value: bookings.filter(b => b.status === 'scheduled').length, icon: '📅', color: 'bg-blue-50 text-blue-600' },
    { label: 'Novos Pedidos', value: pendingBookings.length, icon: '🔔', color: 'bg-orange-50 text-orange-600' },
    { label: 'A Receber', value: `R$ ${totalReceivable.toFixed(2)}`, icon: '💰', color: 'bg-green-50 text-green-600' },
    { label: 'A Pagar', value: `R$ ${totalPayable.toFixed(2)}`, icon: '💸', color: 'bg-red-50 text-red-600' },
  ];

  const chartData = [
    { name: 'Receitas', value: totalReceivable },
    { name: 'Despesas', value: totalPayable },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resumo Gerencial</h1>
          <p className="text-gray-500">Veja como está o Studio Moriá hoje.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm border ${stat.label === 'Novos Pedidos' && stat.value > 0 ? 'border-orange-200 shadow-orange-50 animate-pulse-slow' : 'border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center text-xl mb-4`}>
              {stat.icon}
            </div>
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6">Fluxo Financeiro</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6">Agenda de Hoje</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto custom-scroll">
            {bookings.filter(b => b.status === 'scheduled').length > 0 ? (
              bookings.filter(b => b.status === 'scheduled').slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800">{booking.customerName}</p>
                    <p className="text-xs text-gray-500">{booking.serviceName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-tea-700">
                      {new Date(booking.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <p className="text-[10px] text-gray-400">Confirmado</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-10 italic">Nenhum agendamento confirmado para hoje.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
