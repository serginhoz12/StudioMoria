
import React, { useState } from 'react';
import { Customer, Transaction, Booking } from '../types';
import TermsModal from './TermsModal';

interface CustomerProfileProps {
  customer: Customer;
  transactions: Transaction[];
  bookings: Booking[];
  onUpdateNotification: (val: boolean) => void;
  onBack: () => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer, transactions, bookings, onUpdateNotification, onBack }) => {
  const [modalConfig, setModalConfig] = useState<{ open: boolean; title: string; type: 'terms' | 'privacy' }>({
    open: false,
    title: '',
    type: 'terms'
  });

  const openModal = (type: 'terms' | 'privacy') => {
    setModalConfig({
      open: true,
      type,
      title: type === 'terms' ? 'Termos de Uso' : 'Política de Privacidade (LGPD)'
    });
  };

  const myTransactions = transactions.filter(t => t.customerId === customer.id);
  const myBookings = bookings.filter(b => b.customerId === customer.id);
  
  const totalPaid = myTransactions
    .filter(t => t.status === 'paid' && t.type === 'receivable')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPending = myTransactions
    .filter(t => t.status === 'pending' && t.type === 'receivable')
    .reduce((sum, t) => sum + t.amount, 0);

  const nextDueDate = myTransactions
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const isDueToday = nextDueDate && nextDueDate.dueDate === todayStr;

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-tea-600 font-bold mb-10 group">
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Voltar para a Home
      </button>

      {isDueToday && (
        <div className="mb-8 bg-orange-50 border-l-4 border-orange-400 p-6 rounded-2xl flex items-center justify-between shadow-sm animate-bounce-subtle">
          <div className="flex items-center gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-900">Vencimento Hoje!</p>
              <p className="text-sm text-orange-700">Olá {customer.name.split(' ')[0]}, seu pagamento de R$ {nextDueDate.amount.toFixed(2)} vence hoje.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-tea-50 overflow-hidden">
        <div className="bg-tea-800 p-10 text-white flex justify-between items-end relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-tea-700 rounded-full -mr-16 -mt-16 opacity-30"></div>
          <div>
            <h2 className="text-3xl font-serif font-bold mb-2">{customer.name}</h2>
            <p className="opacity-80 text-sm">CPF: {customer.cpf}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest relative z-10 border border-white/20">Perfil Verificado</div>
        </div>

        <div className="p-10 space-y-12">
          {/* Dashboard Financeiro */}
          <section>
            <h3 className="text-xl font-bold text-tea-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-tea-50 flex items-center justify-center text-sm">💰</span>
              Meu Extrato Financeiro
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="bg-tea-50 p-8 rounded-3xl border border-tea-100">
                <p className="text-xs font-bold text-tea-700 uppercase tracking-widest mb-4">Total Investido (Pago)</p>
                <p className="text-4xl font-serif font-bold text-tea-900">R$ {totalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-4">Total Pendente (A Pagar)</p>
                <p className="text-4xl font-serif font-bold text-orange-900">R$ {totalPending.toFixed(2)}</p>
              </div>
            </div>

            <div className="overflow-hidden border border-gray-100 rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Data/Venc.</th>
                    <th className="px-6 py-4">Procedimento</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500">{new Date(t.dueDate || t.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{t.description}</td>
                      <td className="px-6 py-4 text-right font-bold text-tea-900">R$ {t.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {t.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myTransactions.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">Nenhum lançamento financeiro registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-tea-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-tea-50 flex items-center justify-center text-sm">📅</span>
              Meus Agendamentos
            </h3>
            <div className="space-y-4">
              {myBookings.map(b => (
                 <div key={b.id} className="p-6 border border-gray-100 rounded-[1.5rem] flex justify-between items-center bg-white shadow-sm">
                    <div>
                      <p className="font-bold text-tea-900 text-lg">{b.serviceName}</p>
                      <p className="text-xs text-gray-400">Data: {new Date(b.dateTime).toLocaleDateString()} às {new Date(b.dateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.status === 'completed' ? 'bg-green-50 text-green-600' : 
                      b.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                      b.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {b.status === 'completed' ? 'Finalizado' : 
                       b.status === 'pending' ? 'Pendente' :
                       b.status === 'cancelled' ? 'Cancelado' :
                       'Confirmado'}
                    </span>
                 </div>
              ))}
              {myBookings.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 text-sm italic">Você ainda não realizou agendamentos.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <TermsModal isOpen={modalConfig.open} onClose={() => setModalConfig({ ...modalConfig, open: false })} title={modalConfig.title} type={modalConfig.type} />
    </div>
  );
};

export default CustomerProfile;
