
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

  const handleAction = async (id: string, status: 'scheduled' | 'cancelled') => {
    if (onUpdateStatus) {
      onUpdateStatus(id, status);
    } else if (!(db as any)._isMock) {
      await updateDoc(doc(db, "bookings", id), { status });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex gap-4 border-b border-gray-100 pb-4">
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Pedidos Site</button>
        <button onClick={() => setActiveTab('waitlist')} className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'waitlist' ? 'bg-tea-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Lista de Espera</button>
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
                  className="flex-1 md:flex-none px-8 py-4 bg-tea-800 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-tea-950 transition-all shadow-md"
                 >
                  Aprovar ✓
                 </button>
                 <button 
                  onClick={() => handleAction(b.id, 'cancelled')}
                  className="flex-1 md:flex-none px-8 py-4 bg-red-50 text-red-500 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all"
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
          <div className="flex justify-between items-center px-4">
             <h3 className="text-2xl font-serif font-bold text-tea-950 italic">Interesses de Encaixe</h3>
             <button onClick={() => setShowWaitlistForm(true)} className="bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg">+ Adicionar à Lista</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {waitlist.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(w => (
              <div key={w.id} className="bg-white p-8 rounded-[3rem] border border-tea-50 flex flex-col justify-between shadow-sm hover:border-tea-200 transition-all group">
                 <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-tea-950 text-lg leading-tight">{w.customerName}</h4>
                      <span className="text-[8px] bg-tea-50 text-tea-700 px-2 py-1 rounded-full font-bold uppercase">Encaixe</span>
                    </div>
                    <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">{w.serviceName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Interesse: {w.preferredDate || 'Qualquer data'}</p>
                 </div>
                 <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                    <a 
                      href={`https://wa.me/${w.customerWhatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      className="text-[9px] font-bold text-tea-800 uppercase tracking-widest flex items-center gap-2 hover:underline"
                    >
                      📱 WhatsApp
                    </a>
                    <button 
                      onClick={async () => !(db as any)._isMock && await deleteDoc(doc(db, "waitlist", w.id))}
                      className="text-[9px] font-bold text-red-300 uppercase hover:text-red-500"
                    >
                      Remover
                    </button>
                 </div>
              </div>
            ))}
            {waitlist.length === 0 && <p className="col-span-full text-center py-20 text-gray-300 italic">A lista de espera está vazia.</p>}
          </div>

          {showWaitlistForm && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-3xl space-y-8 animate-slide-up">
                 <h3 className="text-3xl font-serif text-tea-950 font-bold italic text-center">Incluir na Espera</h3>
                 <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome da Cliente</label>
                      <input placeholder="Ex: Ana Silva" value={manualEntry.name} onChange={e => setManualEntry({...manualEntry, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
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
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Data Preferencial (Opcional)</label>
                      <input type="date" value={manualEntry.date} onChange={e => setManualEntry({...manualEntry, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button onClick={handleAddManualWaitlist} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Salvar na Lista</button>
                      <button onClick={() => setShowWaitlistForm(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-gray-500">Cancelar</button>
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
