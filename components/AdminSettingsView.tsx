
import React, { useState } from 'react';
import { SalonSettings, Service, TeamMember } from '../types.ts';
import { db } from '../firebase.ts';
import { doc, setDoc } from "firebase/firestore";

interface AdminSettingsViewProps {
  settings: SalonSettings;
  services: Service[];
  customers: any[];
  bookings: any[];
  transactions: any[];
  loggedMember: TeamMember;
}

const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ 
  settings, 
  services,
  loggedMember
}) => {
  const isOwner = loggedMember.role === 'owner';
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'operational' | 'team' | 'social'>('identity');
  
  // Estados Locais para Edição
  const [tempSettings, setTempSettings] = useState<SalonSettings>(settings);
  const [memberInEdit, setMemberInEdit] = useState<TeamMember | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveSettings = async (updated: SalonSettings) => {
    try {
      await setDoc(doc(db, "settings", "main"), { ...updated, lastUpdated: Date.now() });
      alert("Configurações atualizadas com sucesso!");
    } catch (e) {
      alert("Erro ao salvar no banco de dados.");
    }
  };

  const handleMemberSave = async () => {
    if (!memberInEdit) return;
    const updatedTeam = [...tempSettings.teamMembers];
    const idx = updatedTeam.findIndex(m => m.id === memberInEdit.id);
    
    if (idx >= 0) updatedTeam[idx] = memberInEdit;
    else updatedTeam.push(memberInEdit);

    const newSettings = { ...tempSettings, teamMembers: updatedTeam };
    setTempSettings(newSettings);
    await saveSettings(newSettings);
    setMemberInEdit(null);
  };

  const renderIdentity = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Nome do Studio</label>
          <input 
            type="text" 
            value={tempSettings.name} 
            onChange={e => setTempSettings({...tempSettings, name: e.target.value})}
            className="w-full p-5 bg-gray-50 rounded-3xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all"
          />
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">URL do Logotipo</label>
          <input 
            type="text" 
            value={tempSettings.logo} 
            onChange={e => setTempSettings({...tempSettings, logo: e.target.value})}
            className="w-full p-5 bg-gray-50 rounded-3xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all"
          />
        </div>
      </div>
      <div className="space-y-4">
        <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Endereço Completo</label>
        <textarea 
          value={tempSettings.address} 
          onChange={e => setTempSettings({...tempSettings, address: e.target.value})}
          className="w-full p-5 bg-gray-50 rounded-3xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all h-32"
        />
      </div>
      <button onClick={() => saveSettings(tempSettings)} className="bg-tea-900 text-white px-10 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar Identidade</button>
    </div>
  );

  const renderOperational = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-gray-50 rounded-[3rem] space-y-6">
             <h4 className="text-sm font-bold text-tea-950 uppercase tracking-widest border-b border-tea-100 pb-2">Horário do Salão</h4>
             <div className="flex gap-4">
                <div className="flex-1">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Abertura</label>
                   <input type="time" value={tempSettings.businessHours.start} onChange={e => setTempSettings({...tempSettings, businessHours: {...tempSettings.businessHours, start: e.target.value}})} className="w-full p-4 rounded-2xl border-none font-bold" />
                </div>
                <div className="flex-1">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Fechamento</label>
                   <input type="time" value={tempSettings.businessHours.end} onChange={e => setTempSettings({...tempSettings, businessHours: {...tempSettings.businessHours, end: e.target.value}})} className="w-full p-4 rounded-2xl border-none font-bold" />
                </div>
             </div>
          </div>
          <div className="p-8 bg-gray-50 rounded-[3rem] space-y-6">
             <h4 className="text-sm font-bold text-tea-950 uppercase tracking-widest border-b border-tea-100 pb-2">Gestão de Agenda</h4>
             <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Agenda Aberta Até</label>
                <input type="date" value={tempSettings.agendaOpenUntil} onChange={e => setTempSettings({...tempSettings, agendaOpenUntil: e.target.value})} className="w-full p-4 rounded-2xl border-none font-bold" />
             </div>
          </div>
       </div>
       <button onClick={() => saveSettings(tempSettings)} className="bg-tea-900 text-white px-10 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Atualizar Operação</button>
    </div>
  );

  const renderSocial = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['instagram', 'facebook', 'whatsapp'].map(platform => (
             <div key={platform} className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">{platform}</label>
                <input 
                  type="text" 
                  value={(tempSettings.socialLinks as any)[platform]} 
                  onChange={e => setTempSettings({...tempSettings, socialLinks: {...tempSettings.socialLinks, [platform]: e.target.value}})}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-tea-100 outline-none"
                />
             </div>
          ))}
       </div>
       <button onClick={() => saveSettings(tempSettings)} className="bg-tea-900 text-white px-10 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar Redes Sociais</button>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="flex justify-between items-center px-2">
          <p className="text-xs text-gray-400 italic font-light">Gerencie quem acessa o painel e quais serviços realizam.</p>
          <button 
            onClick={() => setMemberInEdit({ id: `tm-${Date.now()}`, name: '', username: '', password: '', role: 'staff', assignedServiceIds: [] })}
            className="text-[9px] font-bold text-tea-700 uppercase tracking-widest border-2 border-tea-100 px-4 py-2 rounded-xl hover:bg-tea-50"
          >
            + Adicionar Colaboradora
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tempSettings.teamMembers.map(member => (
            <div key={member.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <span className={`text-[7px] font-bold uppercase px-2 py-0.5 rounded-full ${member.role === 'owner' ? 'bg-tea-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {member.role === 'owner' ? 'Admin' : 'Staff'}
                  </span>
               </div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-tea-900 font-serif font-bold italic text-xl">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-tea-950 italic font-serif">{member.name}</h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">@{member.username}</p>
                  </div>
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] border-b border-gray-50 pb-2">
                     <span className="text-gray-400 font-bold uppercase">Senha</span>
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-tea-900">{showPassword[member.id] ? member.password : '••••••'}</span>
                        <button onClick={() => togglePassword(member.id)} className="text-gray-300 hover:text-tea-600">👁️</button>
                     </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-gray-400 font-bold uppercase">Serviços</span>
                     <span className="font-bold text-tea-900">{member.assignedServiceIds.length} Ativos</span>
                  </div>
               </div>
               <div className="mt-8 flex gap-2">
                  <button onClick={() => setMemberInEdit(member)} className="flex-1 py-3 bg-gray-50 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-tea-900 hover:text-white transition-all">Editar</button>
                  {member.role !== 'owner' && (
                    <button 
                      onClick={async () => {
                        if(confirm("Remover colaboradora?")) {
                          const updated = tempSettings.teamMembers.filter(m => m.id !== member.id);
                          const next = { ...tempSettings, teamMembers: updated };
                          setTempSettings(next);
                          await saveSettings(next);
                        }
                      }}
                      className="p-3 bg-red-50 text-red-300 rounded-xl hover:text-red-600"
                    >
                      🗑️
                    </button>
                  )}
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-12">
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-gray-50 text-center space-y-6">
           <div className="w-20 h-20 bg-tea-50 text-tea-900 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner">👤</div>
           <h2 className="text-3xl font-serif font-bold italic text-tea-950">Meu Perfil</h2>
           <div className="space-y-4 text-left max-w-xs mx-auto">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Seu Nome</label>
                 <input type="text" readOnly value={loggedMember.name} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-400 outline-none" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Usuário de Login</label>
                 <input type="text" readOnly value={loggedMember.username} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-400 outline-none" />
              </div>
           </div>
           <p className="text-xs text-gray-400 italic">Para alterar seus dados de acesso, solicite à Moriá (Proprietária).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 animate-fade-in">
      {/* Header Moriá */}
      <div className="bg-tea-900 p-10 md:p-14 rounded-[4rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mt-32 blur-3xl"></div>
         <div className="relative z-10 text-center md:text-left">
            <span className="bg-white/10 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border border-white/10">Gestão Master Moriá</span>
            <h2 className="text-4xl font-serif font-bold italic mt-4">Configurações Studio</h2>
         </div>
         <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/10 relative z-10">
            {[
              { id: 'identity', label: 'Identidade', icon: '🎨' },
              { id: 'operational', label: 'Operação', icon: '⚙️' },
              { id: 'team', label: 'Equipe', icon: '👥' },
              { id: 'social', label: 'Social', icon: '📱' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-white text-tea-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
              >
                <span className="hidden sm:inline">{tab.icon}</span> {tab.label}
              </button>
            ))}
         </div>
      </div>

      <div className="bg-white p-10 md:p-14 rounded-[4rem] shadow-sm border border-gray-100">
         {activeSubTab === 'identity' && renderIdentity()}
         {activeSubTab === 'operational' && renderOperational()}
         {activeSubTab === 'team' && renderTeam()}
         {activeSubTab === 'social' && renderSocial()}
      </div>

      {/* Modal Edição Equipe */}
      {memberInEdit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 md:p-14 shadow-3xl animate-slide-up space-y-8 border-4 border-tea-100">
             <div className="text-center">
                <h3 className="text-2xl font-serif font-bold italic text-tea-950">Dados da Colaboradora</h3>
                <p className="text-xs text-gray-400 mt-2">Defina os acessos e especialidades no Studio.</p>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Nome Completo</label>
                   <input 
                    type="text" 
                    value={memberInEdit.name} 
                    onChange={e => setMemberInEdit({...memberInEdit, name: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:bg-white border-2 border-transparent focus:border-tea-100" 
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Usuário Login</label>
                      <input 
                        type="text" 
                        value={memberInEdit.username} 
                        onChange={e => setMemberInEdit({...memberInEdit, username: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Senha</label>
                      <input 
                        type="text" 
                        value={memberInEdit.password} 
                        onChange={e => setMemberInEdit({...memberInEdit, password: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" 
                      />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Serviços que realiza</label>
                   <div className="p-6 bg-gray-50 rounded-3xl grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scroll">
                      {services.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded-xl">
                           <input 
                            type="checkbox" 
                            checked={memberInEdit.assignedServiceIds.includes(s.id)} 
                            onChange={() => {
                              const current = memberInEdit.assignedServiceIds;
                              const next = current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id];
                              setMemberInEdit({...memberInEdit, assignedServiceIds: next});
                            }}
                            className="w-4 h-4 rounded text-tea-900 focus:ring-tea-900 border-gray-300"
                           />
                           <span className="text-[10px] font-bold text-tea-950 uppercase">{s.name}</span>
                        </label>
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3">
                <button onClick={handleMemberSave} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar Colaboradora</button>
                <button onClick={() => setMemberInEdit(null)} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px]">Descartar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsView;
