
import React, { useState, useMemo } from 'react';
import { Customer, Transaction, Booking } from '../types';
import TermsModal from './TermsModal';

interface CustomerProfileProps {
  customer: Customer;
  transactions: Transaction[];
  bookings: Booking[];
  onUpdateNotification: (val: boolean) => void;
  onBack: () => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer, transactions, bookings, onBack }) => {
  const [modalConfig, setModalConfig] = useState<{ open: boolean; title: string; type: 'terms' | 'privacy' }>({
    open: false,
    title: '',
    type: 'terms'
  });

  const myTransactions = useMemo(() => 
    transactions.filter(t => t.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [transactions, customer.id]);

  const myBookings = useMemo(() => 
    bookings.filter(b => b.customerId === customer.id),
  [bookings, customer.id]);
  
  // Cálculo Rigoroso Moriá
  const totalPaid = useMemo(() => 
    myTransactions
      .filter(t => t.status === 'paid' && t.type === 'receivable')
      .reduce((sum, t) => sum + t.amount, 0),
  [myTransactions]);

  // A Pagar: Soma de agendamentos agendados ou concluídos que não possuem pagamento vinculado ou valor insuficiente
  const totalPending = useMemo(() => {
    // Pegamos todos os agendamentos da cliente que foram confirmados ou finalizados
    const relevantBookings = myBookings.filter(b => b.status === 'scheduled' || b.status === 'completed');
    
    // Para cada agendamento, verificamos se ele já foi pago via transação
    let pendingSum = 0;
    relevantBookings.forEach(booking => {
      // Valor recebido pelo agendamento (podemos usar o campo paymentReceived que o financeiro atualiza)
      const received = booking.paymentReceived || 0;
      
      // Se não temos um preço final salvo no agendamento, tentamos estimar ou deixar zero se não houver dados
      // Idealmente o Booking sempre terá finalPrice ou servicePrice
      const price = booking.finalPrice || booking.originalPrice || 0;
      
      if (price > received) {
        pendingSum += (price - received);
      }
    });

    // Também incluímos transações do tipo "receivable" com status "pending" lançadas manualmente pelo admin
    const pendingTransactions = myTransactions
      .filter(t => t.status === 'pending' && t.type === 'receivable')
      .reduce((sum, t) => sum + t.amount, 0);

    return pendingSum + pendingTransactions;
  }, [myBookings, myTransactions]);

  const openModal = (type: 'terms' | 'privacy') => {
    setModalConfig({
      open: true,
      type,
      title: type === 'terms' ? 'Termos de Uso' : 'Política de Privacidade (LGPD)'
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 animate-fade-in font-sans">
      <button onClick={onBack} className="flex items-center gap-2 text-tea-600 font-bold mb-10 group">
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Voltar para a Home
      </button>

      <div className="bg-white rounded-[3.5rem] shadow-xl border border-tea-50 overflow-hidden relative border-t-8 border-t-tea-900">
        <div className="bg-white p-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-tea-600 uppercase tracking-[0.3em]">Minha Conta Moriá</span>
            <h2 className="text-4xl font-serif font-bold text-tea-950 italic leading-tight">{customer.name}</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Documento: {customer.cpf}</p>
          </div>
          <div className="bg-tea-50 px-6 py-3 rounded-2xl border border-tea-100 flex items-center gap-3">
             <div className="w-3 h-3 bg-tea-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-bold text-tea-800 uppercase tracking-widest">Procedimentos Autorizados</span>
          </div>
        </div>

        <div className="p-12 space-y-16">
          <section className="space-y-8">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic border-b border-gray-100 pb-4">Extrato de Serviços</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="bg-tea-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-7xl group-hover:scale-110 transition-transform">✓</div>
                <p className="text-[10px] font-bold text-tea-400 uppercase tracking-[0.2em] mb-4">Total Já Pago</p>
                <p className="text-5xl font-serif font-bold italic">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <div className="mt-6 flex items-center gap-2 text-tea-300 text-[9px] font-bold uppercase tracking-widest">
                   <span>Sua fidelidade vale benefícios ✨</span>
                </div>
              </div>
              <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 shadow-inner group">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">A Pagar (Saldo)</p>
                <p className={`text-5xl font-serif font-bold italic ${totalPending > 0 ? 'text-red-600' : 'text-tea-900'}`}>R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <div className="mt-6 flex items-center gap-2 text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                   <span>{totalPending > 0 ? 'Pague na recepção ou via PIX' : 'Tudo em dia! Parabéns 🌸'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-10 py-6">Data</th>
                      <th className="px-10 py-6">Descrição do Lançamento</th>
                      <th className="px-10 py-6 text-right">Valor</th>
                      <th className="px-10 py-6 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {myTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-tea-50/10 transition-colors">
                        <td className="px-10 py-8 text-xs font-bold text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-10 py-8">
                          <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                          {t.serviceName && (
                            <p className="text-[9px] text-tea-600 font-bold uppercase tracking-widest mt-1 italic">
                              Referente à sessão de {t.serviceName}
                            </p>
                          )}
                        </td>
                        <td className="px-10 py-8 text-right font-bold text-tea-900">R$ {t.amount.toFixed(2)}</td>
                        <td className="px-10 py-8 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {t.status === 'paid' ? 'Liquidado' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myTransactions.length === 0 && (
                      <tr><td colSpan={4} className="px-10 py-20 text-center text-gray-300 italic font-serif text-lg">Histórico financeiro limpo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic border-b border-gray-100 pb-4">Histórico de Visitas</h3>
            <div className="grid grid-cols-1 gap-4">
              {myBookings.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map(b => (
                 <div key={b.id} className="p-10 border border-gray-100 rounded-[3rem] flex flex-col md:flex-row justify-between items-center bg-white shadow-sm hover:border-tea-200 transition-all gap-6">
                    <div className="text-center md:text-left">
                      <p className="text-2xl font-serif font-bold text-tea-900 italic mb-2">{b.serviceName}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">🗓️ {new Date(b.dateTime.replace(' ', 'T')).toLocaleDateString()}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">⏰ {b.dateTime.split(' ')[1]}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-2">
                      <span className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        b.status === 'completed' ? 'bg-green-100 text-green-600' : 
                        b.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                        b.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                        'bg-tea-900 text-white shadow-md'
                      }`}>
                        {b.status === 'completed' ? 'Sessão Finalizada' : 
                         b.status === 'pending' ? 'Aguardando Aprovação' :
                         b.status === 'cancelled' ? 'Cancelado' :
                         'Horário Confirmado'}
                      </span>
                      {b.paymentReceived && b.paymentReceived >= (b.finalPrice || 0) && (
                         <span className="text-[8px] font-bold text-tea-500 uppercase tracking-widest flex items-center gap-1">Pagamento Confirmado ✓</span>
                      )}
                    </div>
                 </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-12 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="flex gap-4">
              <button onClick={() => openModal('terms')} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-tea-800 transition-colors">Termos de Uso</button>
              <button onClick={() => openModal('privacy')} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-tea-800 transition-colors">LGPD</button>
           </div>
           <p className="text-[10px] font-bold text-tea-900 uppercase tracking-[0.2em] italic">© Studio Moriá Estética Avançada</p>
        </div>
      </div>
      <TermsModal isOpen={modalConfig.open} onClose={() => setModalConfig({ ...modalConfig, open: false })} title={modalConfig.title} type={modalConfig.type} />
    </div>
  );
};

export default CustomerProfile;
