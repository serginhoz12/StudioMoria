
import React, { useState } from 'react';
import { SalonSettings, Service, TeamMember, BusinessHours } from '../types.ts';
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
  const [newService, setNewService] = useState({ name: '', price: 0, duration: 30, description: '', isVisible: true, isHighlighted: false });
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
        assignedServiceIds: [],
        businessHours: { start: settings.businessHours.start, end: settings.businessHours.end },
        offDays: [0] // Domingo como folga padrão
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

  const updateMemberField = (memberId: string, field: keyof TeamMember, value: any) => {
    const updatedMembers = settings.teamMembers.map(m => {
      if (m.id === memberId) {
        return { ...m, [field]: value };
      }
      return m;
    });
    updateGlobalSettings({ ...settings, teamMembers: updatedMembers });
  };

  const toggleOffDay = (memberId: string, day: number) => {
    const targetMember = settings.teamMembers.find(m => m.id === memberId);
    if (!targetMember) return;
    const currentOffDays = targetMember.offDays || [];
    const newOffDays = currentOffDays.includes(day)
      ? currentOffDays.filter(d => d !== day)
      : [...currentOffDays, day];
    updateMemberField(memberId, 'offDays', newOffDays);
  };

  const toggleServiceToMember = (memberId: string, serviceId: string) => {
    const member = settings.teamMembers.find(m => m.id === memberId);
    if (!member) return;
    const hasService = member.assignedServiceIds.includes(serviceId);
    const newServices = hasService 
      ? member.assignedServiceIds.filter(id => id !== serviceId)
      : [...member.assignedServiceIds, serviceId];
    updateMemberField(memberId, 'assignedServiceIds', newServices);
  };

  const addService = async () => {
    if (newService.name && newService.price > 0) {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "services", id), { ...newService, id });
      setNewService({ name: '', price: 0, duration: 30, description: '', isVisible: true, isHighlighted: false });
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
    await updateDoc(doc(db, "services", id), { isVisible: !current });
  };

  const toggleServiceHighlight = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "services", id), { isHighlighted: !current });
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente este serviço?")) {
      await deleteDoc(doc(db, "services", id));
    }
  };

  const weekDays = [
    { n: 0, label: 'Dom' },
    { n: 1, label: 'Seg' },
    { n: 2, label: 'Ter' },
    { n: 3, label: 'Qua' },
    { n: 4, label: 'Qui' },
    { n: 5, label: 'Sex' },
    { n: 6, label: 'Sáb' },
  ];

  return (
    <div className="space-y-12 pb-32 animate-fade-in">
      <div className="bg-tea-900 text-white p-10 rounded-[3rem] shadow-xl">
        <h2 className="text-3xl font-serif font-bold mb-2">Configurações Gerais</h2>
        <p className="text-tea-100 font-light text-sm italic">Defina as bases do seu salão e controle o catálogo de destaques.</p>
      </div>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
          <span className="text-3xl">📅</span> Janela de Agendamento
        </h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl border border-tea-100 space-y-6">
           <div className="max-w-md">
             <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1 mb-2 block">Agenda Aberta para Clientes Até:</label>
             <input 
              type="date" 
              className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold text-tea-900 outline-none focus:border-tea-400"
              value={settings.agendaOpenUntil || ''}
              onChange={e => updateGlobalSettings({...settings, agendaOpenUntil: e.target.value})}
             />
           </div>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">👥</span> Profissionais & Disponibilidade
        </h3>
        <div className="flex gap-4 mb-10">
          <input placeholder="Nome da nova profissional..." className="flex-grow p-5 bg-gray-50 rounded-2xl font-bold outline-none shadow-inner" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
          <button onClick={addTeamMember} className="bg-tea-800 text-white px-10 py-5 rounded-2xl font-bold hover:bg-tea-950 transition-colors shadow-lg">Adicionar</button>
        </div>
        
        <div className="space-y-8">
          {settings.teamMembers.map(member => (
            <div key={member.id} className="p-8 border-2 border-gray-50 rounded-[2.5rem] bg-white shadow-sm hover:border-tea-100 transition-all space-y-8">
              <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                <div>
                  <span className="font-serif font-bold text-2xl text-tea-950">{member.name}</span>
                </div>
                <button onClick={() => removeTeamMember(member.id)} className="text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-600 p-3 bg-red-50 rounded-xl">Remover</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">⏰ Turno de Trabalho</h4>
                  <div className="flex items-center gap-4">
                    <input type="time" className="flex-1 p-4 bg-gray-50 rounded-xl border-none font-bold text-sm" value={member.businessHours?.start || settings.businessHours.start} onChange={e => updateMemberField(member.id, 'businessHours', { ... (member.businessHours || settings.businessHours), start: e.target.value })} />
                    <span className="text-gray-300">até</span>
                    <input type="time" className="flex-1 p-4 bg-gray-50 rounded-xl border-none font-bold text-sm" value={member.businessHours?.end || settings.businessHours.end} onChange={e => updateMemberField(member.id, 'businessHours', { ... (member.businessHours || settings.businessHours), end: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">💅 Serviços Autorizados</h4>
                  <div className="flex flex-wrap gap-2">
                    {services.map(s => (
                      <button key={s.id} onClick={() => toggleServiceToMember(member.id, s.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${member.assignedServiceIds?.includes(s.id) ? 'bg-tea-800 border-tea-800 text-white' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">📋</span> Catálogo de Serviços
        </h3>
        
        <div className="bg-tea-50/50 p-8 rounded-3xl mb-10 border border-tea-100">
           <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest mb-6 ml-1">Criar Novo Procedimento</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input placeholder="Ex: Micropigmentação" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
              <input type="number" placeholder="Preço Base R$" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
              <input type="number" placeholder="Minutos" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.duration || ''} onChange={e => setNewService({...newService, duration: parseInt(e.target.value)})} />
           </div>
           <button onClick={addService} className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-tea-950 transition-all shadow-lg">Salvar Procedimento</button>
        </div>

        <div className="space-y-4">
          {services.map(s => (
            <div key={s.id} className={`p-6 border-2 rounded-3xl flex justify-between items-center transition-all ${s.isVisible ? 'border-gray-50 hover:bg-gray-50/30' : 'bg-red-50/10 opacity-60 border-transparent'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleServiceHighlight(s.id, !!s.isHighlighted)}
                  className={`p-3 rounded-2xl transition-all ${s.isHighlighted ? 'bg-orange-100 text-orange-600 scale-110 shadow-sm' : 'bg-gray-50 text-gray-300'}`}
                  title={s.isHighlighted ? 'Remover Destaque' : 'Marcar como Destaque'}
                >
                  ⭐
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg text-tea-950">{s.name}</p>
                    {s.isHighlighted && <span className="text-[7px] bg-orange-400 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.2em]">Destaque</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">R$ {s.price.toFixed(2)} • {s.duration} min</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setEditingService(s)} className="p-3 bg-white text-tea-600 rounded-xl border border-tea-50 shadow-sm">✏️</button>
                <button onClick={() => toggleServiceVisibility(s.id, s.isVisible)} className={`px-6 py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${s.isVisible ? 'bg-white text-tea-700 border-tea-100' : 'bg-tea-800 text-white border-tea-800'}`}>
                  {s.isVisible ? 'OCULTAR' : 'EXIBIR'}
                </button>
                <button onClick={() => handleDeleteService(s.id)} className="p-3 text-red-200 hover:text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editingService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-900 mb-8 italic">Editar Procedimento</h3>
            <div className="space-y-6">
              <input className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent outline-none font-bold" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" value={editingService.price} onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})} />
                <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" value={editingService.duration} onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value)})} />
              </div>
              <textarea className="w-full p-4 rounded-2xl bg-gray-50 outline-none h-24" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} />
              <div className="flex gap-4">
                <button onClick={() => setEditingService(null)} className="flex-1 py-4 text-gray-400 font-bold">Cancelar</button>
                <button onClick={saveEditedService} className="flex-[2] bg-tea-800 text-white py-4 rounded-2xl font-bold shadow-xl">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsView;
