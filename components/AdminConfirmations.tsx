
import React, { useState } from 'react';
import { Booking, Customer, WaitlistEntry, Service } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

interface AdminConfirmationsProps {
  bookings: Booking[];
  customers: Customer[];
  waitlist: WaitlistEntry[];
  services: Service[];
  onUpdateStatus?: (id: string, status: any) => void;
  onUpdateDeposit?: (id: string, status: any) => void;
  onDeleteBooking?: (id: string) => void;
  onRemoveWaitlist?: (id: string) => void;
}

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ bookings, customers, waitlist, services, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'waitlist'>('pending');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [manualEntry, setManualEntry] = useState({ name: '', whatsapp: '', serviceId: '', date: '' });

  const handleAddManualWaitlist = async () => {
    if (!manualEntry.name || !manualEntry.whatsapp || !manualEntry.serviceId) return alert("Preencha todos os campos.");
    
    const service = services.find(s => s.id === manualEntry.serviceId);
    
    if (!(db as any)._isMock) {
      await addDoc(collection(db, "waitlist"), {
        customerName: manualEntry.name,
        customerWhatsapp: manualEntry.whatsapp,
        serviceId: manualEntry.serviceId,
        serviceName: service?.name || '',
        preferredDate: manualEntry.date,
        status: 'active',
        createdAt: new Date().toISOString(),
        customerId: 'manual'
      });
    }

    setShowWaitlistForm(false);
    setManualEntry({ name: '', whatsapp: '', serviceId: '', date: '' });
  };

  const handleUpdateWaitlist = async () => {
    if (!editingEntry) return;
    const service = services.find(s => s.id === editingEntry.serviceId);
    
    if (!(db as any)._isMock) {
      const waitlistRef = doc(db, "waitlist", editingEntry.id);
      await updateDoc(waitlistRef, {
        customerName: editingEntry.customerName,
        customerWhatsapp: editingEntry.customerWhatsapp,
        serviceId: editingEntry.serviceId,
        serviceName: service?.name || editingEntry.serviceName,
        preferredDate: editingEntry.preferredDate
      });
    }
    setEditingEntry(null);
  };

  const handleAction = async (id: string, status: 'scheduled' | 'cancelled') => {
    try {
      if (!(db as any)._isMock) {
        await updateDoc(doc(db, "bookings", id), { 
          status,
          updatedAt: new Date().toISOString()
        });
      }
      if (onUpdateStatus) {
        onUpdateStatus(id, status);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao processar pedido. Tente novamente.");
    }
  };

  // Ordenação por ordem de chegada (mais antigo primeiro)
  const sortedWaitlist = [...waitlist].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex gap-4 border-b border-gray-100 pb-4">
        <button 
          onClick={() => setActiveTab('pending')} 
          className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
        >
          Pedidos Site
        </button>
        <button 
          onClick={() => setActiveTab('waitlist')} 
          className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'waitlist' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
        >
          Lista de Espera
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-6">
          {bookings.filter(b => b.status === 'pending').map(b => (
            <div key={b.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 animate-slide-up">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner">{b.customerName.charAt(0)}</div>
                <div>
                   <h3 className="text-xl font-bold text-tea-950">{b.customerName}</h3>
                   <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">{b.serviceName}</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">🗓️ {b.dateTime}</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                 <button 
                  onClick={() => handleAction(b.id, 'scheduled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-tea-800 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-tea-950 transition-all shadow-md active:scale-95"
                 >
                  Aprovar ✓
                 </button>
                 <button 
                  onClick={() => handleAction(b.id, 'cancelled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-red-50 text-red-500 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all active:scale-95"
                 >
                  Recusar ✕
                 </button>
              </div>
            </div>
          ))}
          {bookings.filter(b => b.status === 'pending').length === 0 && (
            <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
               <p className="text-gray-300 font-serif italic text-xl">Nenhum pedido aguardando no momento.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 gap-4">
             <div>
                <h3 className="text-2xl font-serif font-bold text-tea-950 italic leading-tight">Fila Moriá</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Organizada por ordem de registro</p>
             </div>
             <button onClick={() => setShowWaitlistForm(true)} className="w-full sm:w-auto bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg">+ Adicionar à Espera</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedWaitlist.map((w, index) => {
              const regDate = w.createdAt ? new Date(w.createdAt) : new Date();
              return (
                <div key={w.id} className="bg-white p-8 rounded-[3rem] border border-tea-50 flex flex-col justify-between shadow-sm hover:border-tea-200 transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-10 font-serif text-7xl italic font-bold text-tea-900">{index + 1}º</div>
                   <div className="space-y-3 relative z-10">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-tea-950 text-lg leading-tight pr-12">{w.customerName}</h4>
                        <span className="text-[8px] bg-tea-800 text-white px-3 py-1 rounded-full font-bold uppercase shadow-sm">Posição {index + 1}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-tea-700 font-bold uppercase tracking-widest">{w.serviceName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Interesse: {w.preferredDate || 'Livre'}</p>
                        <div className="pt-2">
                           <p className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter">
                             Registrado: {regDate.toLocaleDateString()} às {regDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </div>
                   </div>
                   <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center relative z-10">
                      <div className="flex gap-4">
                        <a 
                          href={`https://wa.me/${w.customerWhatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[9px] font-bold text-tea-800 uppercase tracking-widest hover:underline"
                        >
                          📱 Whats
                        </a>
                        <button 
                          onClick={() => setEditingEntry(w)}
                          className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-tea-900"
                        >
                          Editar
                        </button>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm("Remover esta cliente da lista de espera?")) {
                            !(db as any)._isMock && await deleteDoc(doc(db, "waitlist", w.id));
                          }
                        }}
                        className="text-[9px] font-bold text-red-200 uppercase hover:text-red-500 transition-colors"
                      >
                        Excluir
                      </button>
                   </div>
                </div>
              );
            })}
            {waitlist.length === 0 && (
               <div className="col-span-full text-center py-20 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 italic font-serif text-lg">Ninguém aguardando no momento.</p>
               </div>
            )}
          </div>

          {/* Modal Adicionar Cliente Manualmente na Espera */}
          {showWaitlistForm && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up">
                 <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">Incluir na Espera</h3>
                 <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome da Cliente</label>
                      <input placeholder="Ex: Ana Maria" value={manualEntry.name} onChange={e => setManualEntry({...manualEntry, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">WhatsApp</label>
                      <input placeholder="(13) 99999-9999" value={manualEntry.whatsapp} onChange={e => setManualEntry({...manualEntry, whatsapp: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Procedimento Desejado</label>
                      <select value={manualEntry.serviceId} onChange={e => setManualEntry({...manualEntry, serviceId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner appearance-none">
                         <option value="">Selecione...</option>
                         {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data de Preferência</label>
                      <input type="date" value={manualEntry.date} onChange={e => setManualEntry({...manualEntry, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button onClick={handleAddManualWaitlist} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Salvar na Fila</button>
                      <button onClick={() => setShowWaitlistForm(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Modal de Edição da Espera */}
          {editingEntry && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up">
                 <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center leading-tight">Ajustar Registro</h3>
                 <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome</label>
                      <input value={editingEntry.customerName} onChange={e => setEditingEntry({...editingEntry, customerName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Whats</label>
                      <input value={editingEntry.customerWhatsapp} onChange={e => setEditingEntry({...editingEntry, customerWhatsapp: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Procedimento</label>
                      <select value={editingEntry.serviceId} onChange={e => setEditingEntry({...editingEntry, serviceId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner appearance-none">
                         {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data Preferencial</label>
                      <input type="date" value={editingEntry.preferredDate} onChange={e => setEditingEntry({...editingEntry, preferredDate: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button onClick={handleUpdateWaitlist} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Confirmar Alterações</button>
                      <button onClick={() => setEditingEntry(null)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminConfirmations;
