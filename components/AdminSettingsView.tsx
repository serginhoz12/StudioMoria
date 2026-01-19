
import React, { useState, useRef } from 'react';
import { SalonSettings, Service, TeamMember, Customer, Booking, Transaction } from '../types';

interface AdminSettingsViewProps {
  settings: SalonSettings;
  setSettings: (s: SalonSettings) => void;
  services: Service[];
  setServices: (s: Service[]) => void;
  customers: Customer[];
  bookings: Booking[];
  transactions: Transaction[];
  onImport: (data: any) => void;
}

const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ 
  settings, 
  setSettings, 
  services = [], 
  setServices,
  customers = [],
  bookings = [],
  transactions = [],
  onImport
}) => {
  const [newService, setNewService] = useState({ name: '', price: 0, duration: 30, description: '', isVisible: true });
  const [newMemberName, setNewMemberName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const teamMembers = settings?.teamMembers || [];

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      const dataToExport = { settings, services, customers, bookings, transactions, version: "5.2" };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moria_sync_${new Date().getTime()}.json`;
      link.click();
      
      alert("SITE PUBLICADO COM SUCESSO! 🚀\n\nAs alterações de profissionais, serviços e horários agora estão salvas. Sincronize com os outros aparelhos!");
    }, 1200);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Math.random().toString(36).substr(2, 9),
        name: newMemberName.trim(),
        assignedServiceIds: []
      };
      updateSetting('teamMembers', [...teamMembers, newMember]);
      setNewMemberName('');
    }
  };

  const removeTeamMember = (id: string) => {
    if (confirm(`Deseja remover ${teamMembers.find(m => m.id === id)?.name} da equipe?`)) {
      updateSetting('teamMembers', teamMembers.filter(m => m.id !== id));
    }
  };

  const toggleServiceToMember = (memberId: string, serviceId: string) => {
    const updatedMembers = teamMembers.map(m => {
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
    updateSetting('teamMembers', updatedMembers);
  };

  const toggleServiceVisibility = (id: string) => {
    setServices(services.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s));
  };

  const addService = () => {
    if (newService.name && newService.price > 0) {
      setServices([...services, { ...newService, id: Math.random().toString(36).substr(2, 9) }]);
      setNewService({ name: '', price: 0, duration: 30, description: '', isVisible: true });
    }
  };

  return (
    <div className="space-y-12 pb-32 animate-fade-in">
      <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-sm">
        <div className="text-3xl">🌿</div>
        <div className="text-sm text-orange-800">
          <p className="font-bold text-base mb-1">Dica de Sincronização:</p>
          <p className="font-light leading-relaxed">As alterações que você fizer em <b>Serviços</b>, <b>Equipe</b> ou <b>Horários</b> precisam ser "Publicadas" para refletir em outros dispositivos.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 gap-6">
        <div>
          <h2 className="text-3xl font-serif text-tea-950 font-bold">Gestão Studio Moriá</h2>
          <p className="text-gray-500 font-light">Controle total de profissionais e procedimentos.</p>
        </div>
        <button 
          onClick={handleDeploy}
          disabled={isDeploying}
          className={`group flex flex-col items-center gap-1 px-12 py-5 rounded-[2rem] font-bold transition-all active:scale-95 ${isDeploying ? 'bg-gray-100 text-gray-400' : 'bg-tea-800 text-white hover:bg-tea-900 shadow-2xl shadow-tea-100'}`}
        >
          <span className="text-xl">🚀 PUBLICAR SITE</span>
          <span className="text-[10px] opacity-70 uppercase tracking-tighter">Gerar Arquivo de Sincronização</span>
        </button>
      </div>

      {/* HORÁRIO DE FUNCIONAMENTO */}
      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 flex items-center gap-3">🕒 Horário de Funcionamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-2">Abertura do Estúdio</label>
            <input 
              type="time" 
              className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-tea-200 outline-none"
              value={settings.businessHours?.start || "08:00"}
              onChange={(e) => updateSetting('businessHours', { ...settings.businessHours, start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-2">Fechamento do Estúdio</label>
            <input 
              type="time" 
              className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-tea-200 outline-none"
              value={settings.businessHours?.end || "19:00"}
              onChange={(e) => updateSetting('businessHours', { ...settings.businessHours, end: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-400 italic font-light">Clientes não conseguirão agendar horários fora deste intervalo. Você também pode bloquear horários específicos manualmente na Agenda.</p>
      </section>

      {/* Sincronização/Backup */}
      <section className="bg-tea-50 p-8 rounded-[3rem] border border-tea-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">📂</div>
          <div>
            <p className="font-bold text-tea-900 text-lg">Central de Dados</p>
            <p className="text-xs text-tea-600 font-medium">Importe o arquivo gerado em outro aparelho aqui.</p>
          </div>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-white text-tea-800 border-2 border-tea-200 px-10 py-4 rounded-2xl font-bold hover:bg-tea-100 transition-all shadow-sm"
        >
          Restaurar de Arquivo
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
             const reader = new FileReader();
             reader.onload = (ev) => { try { onImport(JSON.parse(ev.target?.result as string)); } catch(e) { alert("Arquivo inválido"); } };
             reader.readAsText(file);
          }
        }} />
      </section>

      {/* GESTÃO DE EQUIPE */}
      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-2xl font-serif text-tea-900 flex items-center gap-3">👥 Profissionais & Atribuições</h3>
          <span className="text-[10px] bg-tea-50 text-tea-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Total: {teamMembers.length}</span>
        </div>

        <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 mb-10">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-4 ml-1 tracking-widest">Adicionar Nova Colaboradora:</p>
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              placeholder="Nome completo da profissional..." 
              className="flex-grow p-5 border-2 border-transparent bg-white rounded-2xl outline-none focus:border-tea-200 shadow-sm"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <button onClick={addTeamMember} className="bg-tea-600 text-white px-12 py-5 rounded-2xl font-bold hover:bg-tea-700 shadow-lg transition-all active:scale-95">ADICIONAR</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {teamMembers.map(member => (
            <div key={member.id} className="bg-white p-8 border-2 border-gray-50 rounded-[2.5rem] hover:border-tea-100 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-tea-800 rounded-3xl flex items-center justify-center text-white text-2xl font-bold shadow-tea-100">{member.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-bold text-tea-950 text-xl">{member.name}</h4>
                    <p className="text-[10px] text-tea-600 font-bold uppercase tracking-tighter">Colaboradora Ativa</p>
                  </div>
                </div>
                <button onClick={() => removeTeamMember(member.id)} className="text-red-300 hover:text-red-500 text-sm font-bold">🗑️ Remover</button>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Serviços que realiza:</p>
                <div className="flex flex-wrap gap-2">
                  {services.map(s => {
                    const isAssigned = member.assignedServiceIds?.includes(s.id);
                    return (
                      <button 
                        key={s.id}
                        onClick={() => toggleServiceToMember(member.id, s.id)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all flex items-center gap-2 ${isAssigned ? 'bg-tea-600 border-tea-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-tea-200'}`}
                      >
                        {isAssigned ? '✅' : '➕'} {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GESTÃO DE SERVIÇOS */}
      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 flex items-center gap-3">📋 Catálogo de Procedimentos</h3>
        
        <div className="bg-tea-50/50 p-8 rounded-[2.5rem] border border-tea-100 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-tea-700 uppercase ml-2">Nome do Procedimento</label>
              <input placeholder="Ex: Microblanding" className="w-full p-4 rounded-xl outline-none border-2 border-white bg-white focus:border-tea-200 shadow-sm" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-tea-700 uppercase ml-2">Preço Sugerido R$</label>
              <input type="number" placeholder="0.00" className="w-full p-4 rounded-xl outline-none border-2 border-white bg-white focus:border-tea-200 shadow-sm" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-tea-700 uppercase ml-2">Tempo (min)</label>
              <input type="number" placeholder="60" className="w-full p-4 rounded-xl outline-none border-2 border-white bg-white focus:border-tea-200 shadow-sm" value={newService.duration || ''} onChange={e => setNewService({...newService, duration: parseInt(e.target.value)})} />
            </div>
          </div>
          <button onClick={addService} className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold shadow-lg hover:bg-tea-900 transition-all uppercase tracking-widest">Salvar no Catálogo</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {services.map(s => (
            <div key={s.id} className={`p-6 border-2 rounded-3xl flex justify-between items-center transition-all ${s.isVisible ? 'border-gray-50 bg-white' : 'border-red-50 bg-red-50/10 opacity-70'}`}>
              <div>
                <div className="flex items-center gap-3">
                  <p className={`font-bold text-lg ${s.isVisible ? 'text-tea-950' : 'text-gray-400 line-through'}`}>{s.name}</p>
                  {!s.isVisible && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Oculto no Site</span>}
                </div>
                <p className="text-xs text-gray-400 font-medium">R$ {s.price.toFixed(2)} • {s.duration} min</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleServiceVisibility(s.id)} 
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition-all border-2 ${s.isVisible ? 'bg-white border-tea-100 text-tea-700 hover:bg-tea-50 shadow-sm' : 'bg-tea-700 border-tea-700 text-white shadow-tea-100'}`}
                >
                  {s.isVisible ? '🙈 OCULTAR NO SITE' : '👁️ EXIBIR NO SITE'}
                </button>
                <button onClick={() => setServices(services.filter(x => x.id !== s.id))} className="p-3 text-red-200 hover:text-red-500 transition-colors">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminSettingsView;
