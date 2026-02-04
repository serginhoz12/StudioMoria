
import React, { useState } from 'react';
import { Booking, Customer, WaitlistEntry, Service } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

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

const AdminConfirmations: React.FC<AdminConfirmationsProps> = ({ bookings, customers, waitlist, services }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'waitlist'>('pending');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [manualEntry, setManualEntry] = useState({ name: '', whatsapp: '', serviceId: '', date: '' });

  const handleAddManualWaitlist = async () => {
    if (!manualEntry.name || !manualEntry.whatsapp || !manualEntry.serviceId) return alert("Preencha todos os campos.");
    
    const service = services.find(s => s.id === manualEntry.serviceId);
    
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

    setShowWaitlistForm(false);
    setManualEntry({ name: '', whatsapp: '', serviceId: '', date: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex gap-4 border-b border-gray-100 pb-4">
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-tea-900 text-white' : 'bg-gray-100 text-gray-400'}`}>Pedidos Site</button>
        <button onClick={() => setActiveTab('waitlist')} className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'waitlist' ? 'bg-tea-900 text-white' : 'bg-gray-100 text-gray-400'}`}>Lista de Espera</button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-6">
          {bookings.filter(b => b.status === 'pending').map(b => (
            <div key={b.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center font-bold text-2xl">{b.customerName.charAt(0)}</div>
                <div>
                   <h3 className="text-xl font-bold text-tea-950">{b.customerName}</h3>
                   <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">{b.serviceName} • {b.dateTime}</p>
                </div>
              </div>
              <div className="flex gap-4">
                 <button className="px-6 py-3 bg-tea-800 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest">Aprovar</button>
                 <button className="px-6 py-3 bg-red-50 text-red-500 rounded-xl font-bold uppercase text-[9px] tracking-widest">Recusar</button>
              </div>
            </div>
          ))}
          {bookings.filter(b => b.status === 'pending').length === 0 && <p className="text-center py-20 opacity-30 italic">Nenhum pedido pendente.</p>}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
             <h3 className="text-xl font-serif font-bold text-tea-950 italic">Interesses de Encaixe</h3>
             <button onClick={() => setShowWaitlistForm(true)} className="bg-tea-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-[9px] tracking-widest">+ Adicionar Nome</button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {waitlist.map(w => (
              <div key={w.id} className="bg-white p-8 rounded-[3rem] border border-orange-50 flex justify-between items-center shadow-sm">
                 <div>
                    <h4 className="font-bold text-tea-950">{w.customerName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{w.serviceName} • Deseja em: {w.preferredDate}</p>
                 </div>
                 <button className="text-[9px] font-bold text-tea-700 uppercase hover:underline">📱 Chamar WhatsApp</button>
              </div>
            ))}
          </div>

          {showWaitlistForm && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl space-y-6">
                 <h3 className="text-2xl font-serif text-tea-950 font-bold italic text-center">Inclusão Manual na Espera</h3>
                 <div className="space-y-4">
                    <input placeholder="Nome da Cliente" value={manualEntry.name} onChange={e => setManualEntry({...manualEntry, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                    <input placeholder="WhatsApp" value={manualEntry.whatsapp} onChange={e => setManualEntry({...manualEntry, whatsapp: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                    <select value={manualEntry.serviceId} onChange={e => setManualEntry({...manualEntry, serviceId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold">
                       <option value="">Qual o procedimento?</option>
                       {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="date" value={manualEntry.date} onChange={e => setManualEntry({...manualEntry, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                    <button onClick={handleAddManualWaitlist} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar na Lista</button>
                    <button onClick={() => setShowWaitlistForm(false)} className="w-full py-2 text-gray-300 font-bold uppercase text-[9px]">Cancelar</button>
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
