
import React, { useState } from 'react';
import { Customer, Booking, Transaction } from '../types';
import { db } from '../firebase.ts';
import { collection, setDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

interface AdminClientsProps {
  customers: Customer[];
  bookings: Booking[];
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Customer>) => void;
}

const AdminClients: React.FC<AdminClientsProps> = ({ customers, bookings, transactions, onDelete, onUpdate }) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Customer>>({});
  
  // Estado para novo cadastro manual
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    whatsapp: '',
    cpf: '',
    password: ''
  });

  const filtered = customers.filter(c => {
    const isTestUser = c.cpf.replace(/\D/g, '') === '33426618877';
    if (isTestUser) return false;
    
    return c.name.toLowerCase().includes(search.toLowerCase()) || 
           c.whatsapp.includes(search) ||
           c.cpf.includes(search);
  });

  const handleEditClick = () => {
    if (selectedCustomer) {
      setEditData({ 
        name: selectedCustomer.name, 
        whatsapp: selectedCustomer.whatsapp, 
        cpf: selectedCustomer.cpf,
        password: selectedCustomer.password
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedCustomer && editData.name && editData.whatsapp && editData.cpf) {
      onUpdate(selectedCustomer.id, editData);
      setSelectedCustomer({ ...selectedCustomer, ...editData });
      setIsEditing(false);
    }
  };

  const handleManualRegister = async () => {
    if (!newCustomer.name || !newCustomer.whatsapp) {
      return alert("Preencha ao menos Nome e WhatsApp.");
    }

    const id = Math.random().toString(36).substr(2, 9);
    const cleanCpf = newCustomer.cpf ? newCustomer.cpf.replace(/\D/g, '') : `TEMP_${id}`;
    
    if (newCustomer.cpf) {
      const exists = customers.some(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      if (exists) return alert("Este CPF já está cadastrado no sistema.");
    }

    const customerData: Customer = {
      id,
      name: newCustomer.name,
      whatsapp: newCustomer.whatsapp,
      cpf: newCustomer.cpf || `S/C-${id.toUpperCase()}`,
      password: newCustomer.password || (newCustomer.cpf ? cleanCpf.substring(0, 4) : '1234'), 
      receivesNotifications: true,
      agreedToTerms: true,
      history: []
    };

    try {
      if (!(db as any)._isMock) {
        await setDoc(doc(db, "customers", id), customerData);
      }
      setShowAddModal(false);
      setNewCustomer({ name: '', whatsapp: '', cpf: '', password: '' });
      alert("Cliente cadastrada com sucesso!");
    } catch (e) {
      alert("Erro ao salvar cadastro.");
    }
  };

  const handleDeleteClick = () => {
    if (selectedCustomer) {
      if (confirm(`Deseja realmente excluir a ficha de ${selectedCustomer.name}? Isso não apagará o histórico financeiro já registrado.`)) {
        onDelete(selectedCustomer.id);
        setSelectedCustomer(null);
      }
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!(db as any)._isMock) {
      if (!confirm("Deseja realmente excluir este registro de atendimento? Esta ação é irreversível e pode afetar as estatísticas financeiras se o atendimento já foi concluído.")) return;
      
      try {
        await deleteDoc(doc(db, "bookings", bookingId));
        alert("Registro excluído com sucesso.");
      } catch (e) {
        alert("Erro ao excluir registro.");
      }
    }
  };

  const getClientStats = (customerId: string) => {
    const myBookings = bookings.filter(b => b.customerId === customerId && b.status !== 'cancelled');
    const myTransactions = transactions.filter(t => t.customerId === customerId);

    const cancelledCount = myBookings.filter(b => b.status === 'cancelled').length;
    const reschedules = myBookings.reduce((sum, b) => sum + (b.rescheduledCount || 0), 0);
    
    const latePayments = myTransactions.filter(t => {
      if (t.status === 'paid' && t.dueDate && t.paidAt) {
        const dDate = new Date(t.dueDate);
        dDate.setHours(0,0,0,0);
        const pDate = new Date(t.paidAt);
        pDate.setHours(0,0,0,0);
        return pDate > dDate;
      }
      return false;
    }).length;

    const paid = myTransactions
      .filter(t => t.status === 'paid' && t.type === 'receivable')
      .reduce((sum, t) => sum + t.amount, 0);
    const pending = myTransactions
      .filter(t => t.status === 'pending' && t.type === 'receivable')
      .reduce((sum, t) => sum + t.amount, 0);

    return { paid, pending, cancelledCount, reschedules, latePayments };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-tea-950 italic">Gestão de Clientes</h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Dossiê de Comportamento e Histórico</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
          <div className="relative flex-grow sm:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              placeholder="Buscar cliente..." 
              className="w-full pl-12 pr-4 py-4 border border-gray-100 rounded-2xl outline-none focus:border-tea-200 transition-all bg-white shadow-sm font-bold text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg whitespace-nowrap"
          >
            + Novo Cadastro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Clientes */}
        <div className="lg:col-span-1 bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
          <div className="p-8 bg-tea-50/50 border-b border-gray-100">
            <h3 className="font-bold text-tea-900 uppercase text-[10px] tracking-widest">Base Ativa ({filtered.length})</h3>
          </div>
          <div className="overflow-y-auto flex-grow custom-scroll divide-y divide-gray-50">
            {filtered.map(customer => {
              const stats = getClientStats(customer.id);
              const hasAlert = stats.cancelledCount > 2 || stats.latePayments > 1;
              return (
                <div 
                  key={customer.id} 
                  onClick={() => { setSelectedCustomer(customer); setIsEditing(false); }}
                  className={`p-8 cursor-pointer hover:bg-tea-50/20 transition-all group ${selectedCustomer?.id === customer.id ? 'bg-tea-50 border-l-8 border-tea-800' : 'border-l-8 border-transparent'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-base">{customer.name}</p>
                        {hasAlert && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Índice de cancelamento alto"></span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">{customer.whatsapp}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">👤</div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="p-20 text-center text-gray-300 italic font-serif">Nenhuma cliente encontrada.</p>}
          </div>
        </div>

        {/* Detalhes da Cliente */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slide-up h-full flex flex-col">
              <div className="p-10 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 bg-tea-900 text-white rounded-[2rem] flex items-center justify-center text-3xl font-serif font-bold shadow-xl">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif text-tea-950 font-bold italic leading-tight">{selectedCustomer.name}</h3>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100">CPF: {selectedCustomer.cpf}</span>
                      <span className="text-[9px] font-bold text-tea-600 uppercase tracking-widest bg-tea-50 px-3 py-1 rounded-full border border-tea-100">WhatsApp: {selectedCustomer.whatsapp}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEditClick} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-tea-500 shadow-sm transition-all hover:scale-105" title="Editar Dados">✏️</button>
                  <button onClick={handleDeleteClick} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-red-500 shadow-sm transition-all text-red-400 hover:scale-105" title="Remover Cliente">🗑️</button>
                </div>
              </div>

              <div className="p-10 flex-grow overflow-y-auto custom-scroll space-y-12">
                <section>
                  <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Resumo de Pontualidade</h4>
                    <span className="text-[8px] bg-tea-950 text-white px-3 py-1 rounded-full font-bold uppercase tracking-widest">Dossiê Interno</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 text-center shadow-sm">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-4 tracking-widest">Cancelamentos</p>
                      <p className={`text-4xl font-serif font-bold ${getClientStats(selectedCustomer.id).cancelledCount > 2 ? 'text-red-500' : 'text-tea-950'}`}>{getClientStats(selectedCustomer.id).cancelledCount}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 text-center shadow-sm">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-4 tracking-widest">Remarcações</p>
                      <p className="text-4xl font-serif font-bold text-tea-950">{getClientStats(selectedCustomer.id).reschedules}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 text-center shadow-sm">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-4 tracking-widest">Pagto Atrasado</p>
                      <p className={`text-4xl font-serif font-bold ${getClientStats(selectedCustomer.id).latePayments > 0 ? 'text-orange-500' : 'text-tea-950'}`}>{getClientStats(selectedCustomer.id).latePayments}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Posição Financeira</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-tea-950 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">✓</div>
                      <p className="text-[10px] font-bold text-tea-300 uppercase mb-2 tracking-widest">Total Gasto</p>
                      <p className="text-3xl font-serif font-bold">R$ {getClientStats(selectedCustomer.id).paid.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-inner">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Dívida Atual</p>
                      <p className="text-3xl font-serif font-bold text-tea-900">R$ {getClientStats(selectedCustomer.id).pending.toFixed(2)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-4">Histórico Moriá</h4>
                  <div className="space-y-4">
                    {bookings.filter(b => b.customerId === selectedCustomer.id).sort((a,b) => new Date(b.dateTime.replace(' ', 'T')).getTime() - new Date(a.dateTime.replace(' ', 'T')).getTime()).map(booking => (
                      <div key={booking.id} className="flex justify-between p-8 bg-white border border-gray-50 rounded-[2.5rem] items-center hover:border-tea-100 transition-all shadow-sm group/item">
                        <div>
                          <p className="font-bold text-tea-950 text-lg leading-tight">{booking.serviceName}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">🗓️ {booking.dateTime}</p>
                            {booking.rescheduledCount ? <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded italic">Remarcado {booking.rescheduledCount}x</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm ${
                            booking.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : 
                            booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 
                            'bg-tea-900 text-white'
                          }`}>
                            {booking.status === 'completed' ? 'Finalizado' : booking.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteBooking(booking.id); }}
                            className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                            title="Excluir Registro"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                    {bookings.filter(b => b.customerId === selectedCustomer.id).length === 0 && (
                      <p className="text-center py-10 text-gray-300 italic">Sem agendamentos registrados.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-gray-50 rounded-[4rem] border-4 border-dashed border-gray-100 p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl mb-8 shadow-sm border border-gray-100">✨</div>
              <h3 className="text-2xl font-serif text-tea-900 mb-3 font-bold italic">Selecione uma Cliente</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">Clique em uma cliente na lista ao lado para acessar seu dossiê completo, histórico financeiro e pontualidade.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastro Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up overflow-y-auto max-h-[90vh] custom-scroll">
            <div className="text-center">
               <h3 className="text-3xl font-serif text-tea-950 font-bold italic">Cadastrar Cliente</h3>
               <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Inclusão Manual via Painel Moriá</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  value={newCustomer.name} 
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner border-2 border-transparent focus:border-tea-100 transition-all"
                  placeholder="Ex: Ana Clara Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">WhatsApp</label>
                  <input 
                    type="tel" 
                    value={newCustomer.whatsapp} 
                    onChange={e => setNewCustomer({...newCustomer, whatsapp: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                    placeholder="(13) 9..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">CPF</label>
                  <input 
                    type="text" 
                    value={newCustomer.cpf} 
                    onChange={e => setNewCustomer({...newCustomer, cpf: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                    placeholder="000.000..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Senha de Acesso</label>
                <input 
                  type="text" 
                  value={newCustomer.password} 
                  onChange={e => setNewCustomer({...newCustomer, password: e.target.value})}
                  className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner"
                  placeholder="Deixe vazio para usar os 4 dígitos do CPF"
                />
                <p className="text-[8px] text-gray-400 mt-2 px-2 uppercase font-bold tracking-tighter">Útil para clientes que precisam de ajuda no login posterior.</p>
              </div>

              <div className="pt-8 space-y-4">
                <button 
                  onClick={handleManualRegister}
                  className="w-full py-6 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95"
                >
                  Confirmar Cadastro
                </button>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {isEditing && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-3xl space-y-8 animate-slide-up">
            <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">Editar Ficha</h3>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Nome</label>
                <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">WhatsApp</label>
                <input type="text" value={editData.whatsapp} onChange={e => setEditData({...editData, whatsapp: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">CPF</label>
                <input type="text" value={editData.cpf} onChange={e => setEditData({...editData, cpf: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Senha de Acesso</label>
                <input type="text" value={editData.password} onChange={e => setEditData({...editData, password: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" placeholder="Alterar senha do cliente" />
              </div>
              <div className="pt-6 space-y-4">
                <button onClick={handleSaveEdit} className="w-full py-6 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-xl hover:bg-black transition-all">Salvar Alterações</button>
                <button onClick={() => setIsEditing(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClients;
