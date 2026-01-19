
import React, { useState } from 'react';
import { SalonSettings, Service, TeamMember } from '../types.ts';
import { db } from '../firebase.ts';
import { doc, setDoc, deleteDoc } from "firebase/firestore";

interface AdminSettingsViewProps {
  settings: SalonSettings;
  setSettings: (s: SalonSettings) => void;
  services: Service[];
  setServices: (s: Service[]) => void;
  customers: any[];
  bookings: any[];
  transactions: any[];
  onImport: (data: any) => void;
}

const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ 
  settings, 
  setSettings, 
  services = [],
}) => {
  const [newService, setNewService] = useState({ name: '', price: 0, duration: 30, description: '', isVisible: true });
  const [newMemberName, setNewMemberName] = useState('');

  const updateGlobalSettings = async (newSet: SalonSettings) => {
    await setDoc(doc(db, "settings", "main"), newSet);
  };

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Math.random().toString(36).substr(2, 9),
        name: newMemberName.trim(),
        assignedServiceIds: []
      };
      const updated = { ...settings, teamMembers: [...settings.teamMembers, newMember] };
      updateGlobalSettings(updated);
      setNewMemberName('');
    }
  };

  const removeTeamMember = (id: string) => {
    if (confirm("Remover profissional?")) {
      const updated = { ...settings, teamMembers: settings.teamMembers.filter(m => m.id !== id) };
      updateGlobalSettings(updated);
    }
  };

  const toggleServiceToMember = (memberId: string, serviceId: string) => {
    const updatedMembers = settings.teamMembers.map(m => {
      if (m.id === memberId) {
        const hasService = m.assignedServiceIds.includes(serviceId);
        return {
          ...m,
          assignedServiceIds: hasService 
            ? m.assignedServiceIds.filter(id => id !== serviceId)
            : [...m.assignedServiceIds, serviceId]
        };
      }
      return m;
    });
    updateGlobalSettings({ ...settings, teamMembers: updatedMembers });
  };

  const addService = async () => {
    if (newService.name && newService.price > 0) {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "services", id), { ...newService, id });
      setNewService({ name: '', price: 0, duration: 30, description: '', isVisible: true });
    }
  };

  const toggleServiceVisibility = async (id: string, current: boolean) => {
    await setDoc(doc(db, "services", id), { isVisible: !current }, { merge: true });
  };

  return (
    <div className="space-y-12 pb-32 animate-fade-in">
      <div className="bg-tea-900 text-white p-10 rounded-[3rem] shadow-xl">
        <h2 className="text-3xl font-serif font-bold mb-2">Configurações em Tempo Real</h2>
        <p className="text-tea-100 font-light">Todas as alterações feitas aqui são aplicadas instantaneamente para todos os seus clientes via Firebase.</p>
      </div>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight">🕒 Horário de Atendimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Abertura</label>
             <input type="time" className="w-full p-5 bg-gray-50 rounded-2xl border-none font-bold" value={settings.businessHours.start} onChange={e => updateGlobalSettings({...settings, businessHours: {...settings.businessHours, start: e.target.value}})} />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Fechamento</label>
             <input type="time" className="w-full p-5 bg-gray-50 rounded-2xl border-none font-bold" value={settings.businessHours.end} onChange={e => updateGlobalSettings({...settings, businessHours: {...settings.businessHours, end: e.target.value}})} />
          </div>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight">👥 Equipe do Studio</h3>
        <div className="flex gap-4 mb-8">
          <input placeholder="Nome da profissional..." className="flex-grow p-5 bg-gray-50 rounded-2xl font-bold outline-none" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
          <button onClick={addTeamMember} className="bg-tea-600 text-white px-10 py-5 rounded-2xl font-bold">Adicionar</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.teamMembers.map(member => (
            <div key={member.id} className="p-8 border-2 border-gray-50 rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-xl text-tea-950">{member.name}</span>
                <button onClick={() => removeTeamMember(member.id)} className="text-red-300 text-xs font-bold uppercase tracking-widest">Remover</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button key={s.id} onClick={() => toggleServiceToMember(member.id, s.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${member.assignedServiceIds?.includes(s.id) ? 'bg-tea-600 border-tea-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight">📋 Catálogo de Serviços</h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl mb-10 border border-tea-100">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input placeholder="Nome do Serviço" className="p-4 rounded-xl bg-white outline-none font-bold" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
              <input type="number" placeholder="Preço R$" className="p-4 rounded-xl bg-white outline-none font-bold" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
              <input type="number" placeholder="Minutos" className="p-4 rounded-xl bg-white outline-none font-bold" value={newService.duration || ''} onChange={e => setNewService({...newService, duration: parseInt(e.target.value)})} />
           </div>
           <button onClick={addService} className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs">Salvar Novo Serviço no Firebase</button>
        </div>
        <div className="space-y-4">
          {services.map(s => (
            <div key={s.id} className={`p-6 border-2 rounded-3xl flex justify-between items-center ${s.isVisible ? 'border-gray-50' : 'bg-red-50/10 opacity-50'}`}>
              <div>
                <p className="font-bold text-lg text-tea-950">{s.name}</p>
                <p className="text-xs text-gray-400 font-bold uppercase">R$ {s.price.toFixed(2)} • {s.duration} min</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleServiceVisibility(s.id, s.isVisible)} className={`px-6 py-3 rounded-xl text-[10px] font-bold border-2 ${s.isVisible ? 'bg-white text-tea-700 border-tea-100' : 'bg-tea-800 text-white border-tea-800'}`}>
                  {s.isVisible ? 'OCULTAR' : 'EXIBIR'}
                </button>
                <button onClick={() => deleteDoc(doc(db, "services", s.id))} className="p-3 text-red-200 hover:text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminSettingsView;
