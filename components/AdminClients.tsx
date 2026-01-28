
import React, { useState } from 'react';
import { Customer, Booking, Transaction } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

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
  
  // Estados para Edição/Cadastro
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    cpf: '',
    password: ''
  });

  const filtered = (customers || []).filter(c => {
    if (!c) return false;
    const s = (search || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    const whatsapp = (c.whatsapp || '');
    const cpf = (c.cpf || '');
    return name.includes(s) || whatsapp.includes(s) || cpf.includes(s);
  });

  const handleAddNew = async () => {
    if (!formData.name || !formData.whatsapp || !formData.cpf || !formData.password) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const exists = customers.find(c => c.cpf.replace(/\D/g, '') === formData.cpf.replace(/\D/g, ''));
    if (exists) {
      alert("Este CPF já está cadastrado no sistema.");
      return;
    }

    try {
      await addDoc(collection(db, "customers"), {
        ...formData,
        receivesNotifications: true,
        agreedToTerms: true,
        history: [],
        createdAt: new Date().toISOString()
      });
      alert("Cliente cadastrada com sucesso! Ela já pode acessar o portal com o CPF e a senha definida.");
      setShowAddModal(false);
      setFormData({ name: '', whatsapp: '', cpf: '', password: '' });
    } catch (e) {
      alert("Erro ao salvar cliente.");
    }
  };

  const handleEditClick = () => {
    if (selectedCustomer) {
      setFormData({ 
        name: selectedCustomer.name || '', 
        whatsapp: selectedCustomer.whatsapp || '', 
        cpf: selectedCustomer.cpf || '',
        password: selectedCustomer.password || ''
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (selectedCustomer) {
      await onUpdate(selectedCustomer.id, formData);
      setSelectedCustomer({ ...selectedCustomer, ...formData });
      setIsEditing(false);
      alert("Dados atualizados!");
    }
  };

  const getClientStats = (customerId: string) => {
    const myBookings = (bookings || []).filter(b => b.customerId === customerId);
    const myTransactions = (transactions || []).filter(t => t.customerId === customerId);
    const cancelledCount = myBookings.filter(b => b.status === 'cancelled').length;
    const paid = myTransactions.filter(t => t.status === 'paid' && t.type === 'receivable').reduce((sum, t) => sum + t.amount, 0);
    const pending = myTransactions.filter(t => t.status === 'pending' && t.type === 'receivable').reduce((sum, t) => sum + t.amount, 0);
    return { paid, pending, cancelledCount };
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header com Busca e Ação */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-3xl font-serif font-bold text-tea-950 italic">Gestão de Clientes</h2>
          <p className="text-gray-400 text-sm">Administre cadastros e credenciais de acesso.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              placeholder="Buscar por nome ou CPF..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-tea-100 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setFormData({ name: '', whatsapp: '', cpf: '', password: '' }); setShowAddModal(true); }}
            className="px-8 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
          >
            ✨ Cadastrar Nova Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lista Lateral */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 bg-tea-50/50 border-b border-tea-100 flex justify-between items-center">
            <h3 className="font-bold text-tea-900 uppercase text-[9px] tracking-widest">Base Studio Moriá</h3>
            <span className="text-[9px] font-bold text-tea-600">{filtered.length} Registros</span>
          </div>
          <div className="overflow-y-auto flex-grow custom-scroll divide-y divide-gray-50">
            {filtered.map(customer => (
              <div 
                key={customer.id} 
                onClick={() => { setSelectedCustomer(customer); setIsEditing(false); }}
                className={`p-6 cursor-pointer transition-all hover:bg-tea-50/30 ${selectedCustomer?.id === customer.id ? 'bg-tea-50 border-l-4 border-tea-600' : ''}`}
              >
                <p className="font-bold text-tea-950 text-sm">{customer.name}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">{customer.whatsapp}</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-20 text-center opacity-20 italic text-sm">Nenhuma cliente encontrada.</div>
            )}
          </div>
        </div>

        {/* Perfil Detalhado */}
        <div className="lg:col-span-8">
          {selectedCustomer ? (
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slide-up h-full flex flex-col">
              <div className="p-10 bg-gray-50/30 border-b border-gray-100 flex justify-between items-center">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 bg-tea-900 rounded-[2.2rem] flex items-center justify-center text-white text-3xl font-serif font-bold shadow-xl">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif text-tea-950 font-bold italic">{selectedCustomer.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">CPF: {selectedCustomer.cpf} • WhatsApp: {selectedCustomer.whatsapp}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEditClick} className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-tea-500 shadow-sm transition-all">✏️</button>
                  <button onClick={() => { if(confirm("Excluir cliente?")) onDelete(selectedCustomer.id); setSelectedCustomer(null); }} className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-red-500 shadow-sm transition-all text-red-400">🗑️</button>
                </div>
              </div>

              <div className="p-10 flex-grow space-y-10 overflow-y-auto custom-scroll">
                {isEditing ? (
                  <div className="space-y-6 animate-fade-in bg-tea-50/30 p-8 rounded-[2.5rem] border border-tea-100">
                    <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest mb-4">Editar Dados Cadastrais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome Completo" className="p-4 bg-white rounded-2xl border-none outline-none font-bold text-sm" />
                       <input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="WhatsApp" className="p-4 bg-white rounded-2xl border-none outline-none font-bold text-sm" />
                       <input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="CPF" className="p-4 bg-white rounded-2xl border-none outline-none font-bold text-sm" />
                       <input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Senha de Acesso" className="p-4 bg-white rounded-2xl border-none outline-none font-bold text-sm" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={handleSaveEdit} className="flex-1 py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest">Salvar Alterações</button>
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-tea-50 p-6 rounded-[2rem] border border-tea-100 text-center">
                        <p className="text-[9px] font-bold text-tea-700 uppercase mb-2">Total Pago</p>
                        <p className="text-2xl font-serif font-bold text-tea-900 italic">R$ {getClientStats(selectedCustomer.id).paid.toFixed(2)}</p>
                      </div>
                      <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 text-center">
                        <p className="text-[9px] font-bold text-orange-700 uppercase mb-2">Pendente</p>
                        <p className="text-2xl font-serif font-bold text-orange-900 italic">R$ {getClientStats(selectedCustomer.id).pending.toFixed(2)}</p>
                      </div>
                      <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 text-center">
                        <p className="text-[9px] font-bold text-red-700 uppercase mb-2">Faltas/Cancel.</p>
                        <p className="text-2xl font-serif font-bold text-red-900 italic">{getClientStats(selectedCustomer.id).cancelledCount}</p>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 ml-2">Histórico Recente</h4>
                      <div className="space-y-3">
                        {bookings.filter(b => b.customerId === selectedCustomer.id).slice(0, 5).map(b => (
                          <div key={b.id} className="p-5 bg-white border border-gray-100 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="font-bold text-tea-950 text-sm">{b.serviceName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">{b.dateTime}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-tea-50 text-tea-700'}`}>
                              {b.status === 'completed' ? 'Concluído' : 'Agendado'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-[4rem] border-4 border-dashed border-gray-100 p-20 text-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-gray-200">👥</div>
              <h3 className="text-2xl font-serif text-tea-900 mb-2 font-bold italic">Selecione uma Cliente</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm italic font-light leading-relaxed">Clique em uma cliente na lista ao lado para ver o histórico financeiro e dados de acesso.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 md:p-14 shadow-3xl animate-slide-up border-4 border-tea-100 space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-serif font-bold italic text-tea-950">Novo Cadastro</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Defina as credenciais para a cliente.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-tea-100" 
                  placeholder="Ex: Maria Santos"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">WhatsApp</label>
                  <input 
                    type="tel" 
                    value={formData.whatsapp} 
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" 
                    placeholder="(13) 99999-0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">CPF (Apenas Números)</label>
                  <input 
                    type="text" 
                    value={formData.cpf} 
                    onChange={e => setFormData({...formData, cpf: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" 
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Senha de Acesso para Cliente</label>
                <input 
                  type="text" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-tea-200" 
                  placeholder="Crie uma senha inicial"
                />
                <p className="text-[8px] text-gray-400 italic ml-2 mt-1">* Informe esta senha à cliente para ela acessar o site.</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button onClick={handleAddNew} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Salvar Cadastro</button>
              <button onClick={() => setShowAddModal(false)} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClients;
