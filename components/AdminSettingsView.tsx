
import React, { useState } from 'react';
import { SalonSettings, Service, TeamMember } from '../types.ts';
import { db } from '../firebase.ts';
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

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
  services = [],
}) => {
  const [newService, setNewService] = useState({ name: '', price: 0, duration: 30, description: '', isVisible: true });
  const [editingService, setEditingService] = useState<Service | null>(null);
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

  const saveEditedService = async () => {
    if (editingService && editingService.name && editingService.price > 0) {
      const serviceRef = doc(db, "services", editingService.id);
      await updateDoc(serviceRef, {
        name: editingService.name,
        price: editingService.price,
        duration: editingService.duration,
        description: editingService.description
      });
      setEditingService(null);
    }
  };

  const toggleServiceVisibility = async (id: string, current: boolean) => {
    await setDoc(doc(db, "services", id), { isVisible: !current }, { merge: true });
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente este serviço?")) {
      await deleteDoc(doc(db, "services", id));
    }
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
          <button onClick={addTeamMember} className="bg-tea-600 text-white px-10 py-5 rounded-2xl font-bold hover:bg-tea-700 transition-colors">Adicionar</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.teamMembers.map(member => (
            <div key={member.id} className="p-8 border-2 border-gray-50 rounded-3xl bg-white shadow-sm hover:border-tea-100 transition-all">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-xl text-tea-950">{member.name}</span>
                <button onClick={() => removeTeamMember(member.id)} className="text-red-300 text-xs font-bold uppercase tracking-widest hover:text-red-500">Remover</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button key={s.id} onClick={() => toggleServiceToMember(member.id, s.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${member.assignedServiceIds?.includes(s.id) ? 'bg-tea-600 border-tea-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}>
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
        
        {/* Formulário de Novo Serviço */}
        <div className="bg-tea-50/50 p-8 rounded-3xl mb-10 border border-tea-100">
           <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest mb-6 ml-1">Criar Novo Serviço</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input placeholder="Nome do Serviço" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
              <input type="number" placeholder="Preço R$" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
              <input type="number" placeholder="Minutos" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.duration || ''} onChange={e => setNewService({...newService, duration: parseInt(e.target.value)})} />
           </div>
           <button onClick={addService} className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-tea-900 transition-all shadow-lg shadow-tea-100">Salvar Novo Serviço no Firebase</button>
        </div>

        {/* Listagem de Serviços */}
        <div className="space-y-4">
          {services.map(s => (
            <div key={s.id} className={`p-6 border-2 rounded-3xl flex justify-between items-center transition-all ${s.isVisible ? 'border-gray-50 hover:bg-gray-50/30' : 'bg-red-50/10 opacity-60 border-transparent'}`}>
              <div>
                <p className="font-bold text-lg text-tea-950">{s.name}</p>
                <p className="text-xs text-gray-400 font-bold uppercase">R$ {s.price.toFixed(2)} • {s.duration} min</p>
              </div>
              <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setEditingService(s)} 
                  className="p-3 bg-white text-tea-600 rounded-xl border border-tea-50 hover:border-tea-200 transition-all shadow-sm"
                  title="Editar Serviço"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => toggleServiceVisibility(s.id, s.isVisible)} 
                  className={`px-6 py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${s.isVisible ? 'bg-white text-tea-700 border-tea-100 hover:bg-tea-50' : 'bg-tea-800 text-white border-tea-800 hover:bg-tea-900'}`}
                >
                  {s.isVisible ? 'OCULTAR' : 'EXIBIR'}
                </button>
                <button onClick={() => handleDeleteService(s.id)} className="p-3 text-red-200 hover:text-red-500 transition-colors">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal de Edição de Serviço */}
      {editingService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-900 mb-8 italic">Editar Serviço</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome do Procedimento</label>
                <input 
                  className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none font-bold transition-all"
                  value={editingService.name}
                  onChange={e => setEditingService({...editingService, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Preço R$</label>
                  <input 
                    type="number"
                    className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none font-bold transition-all"
                    value={editingService.price}
                    onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Duração (Min)</label>
                  <input 
                    type="number"
                    className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none font-bold transition-all"
                    value={editingService.duration}
                    onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Descrição curta</label>
                <textarea 
                  className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all resize-none h-24"
                  value={editingService.description}
                  onChange={e => setEditingService({...editingService, description: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingService(null)} 
                  className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveEditedService}
                  className="flex-[2] bg-tea-800 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-tea-950 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsView;
