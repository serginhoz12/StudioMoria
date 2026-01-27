
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
  
  const [memberInEdit, setMemberInEdit] = useState<TeamMember | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [myProfileData, setMyProfileData] = useState<TeamMember>(loggedMember);

  const saveToFirebase = async (updatedTeam: TeamMember[]) => {
    try {
      await setDoc(doc(db, "settings", "main"), { 
        ...settings, 
        teamMembers: updatedTeam, 
        lastUpdated: Date.now() 
      });
      alert("Alterações salvas com sucesso no banco de dados.");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao conectar com o banco de dados.");
    }
  };

  const updateMyProfile = async () => {
    if (!myProfileData.username || !myProfileData.password) {
      alert("Usuário e Senha não podem estar vazios.");
      return;
    }
    const updated = settings.teamMembers.map(m => m.id === myProfileData.id ? myProfileData : m);
    await saveToFirebase(updated);
  };

  const handleAddNewMember = () => {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: "",
      username: "",
      password: "",
      role: 'staff',
      assignedServiceIds: [],
      businessHours: settings.businessHours,
      offDays: [0]
    };
    setMemberInEdit(newMember);
    setIsAddingNew(true);
  };

  const saveMemberChange = async () => {
    if (!memberInEdit) return;
    if (!memberInEdit.name || !memberInEdit.username || !memberInEdit.password) {
      alert("Preencha Nome, Usuário e Senha para continuar.");
      return;
    }

    let updatedTeam: TeamMember[];
    if (isAddingNew) {
      updatedTeam = [...settings.teamMembers, memberInEdit];
    } else {
      updatedTeam = settings.teamMembers.map(m => m.id === memberInEdit.id ? memberInEdit : m);
    }

    await saveToFirebase(updatedTeam);
    setMemberInEdit(null);
    setIsAddingNew(false);
  };

  const deleteMember = async (id: string) => {
    if (confirm("Deseja realmente remover este colaborador da equipe?")) {
      const updated = settings.teamMembers.filter(m => m.id !== id);
      await saveToFirebase(updated);
    }
  };

  const weekDays = [
    { n: 0, label: 'Dom' }, { n: 1, label: 'Seg' }, { n: 2, label: 'Ter' },
    { n: 3, label: 'Qua' }, { n: 4, label: 'Qui' }, { n: 5, label: 'Sex' }, { n: 6, label: 'Sáb' },
  ];

  return (
    <div className="space-y-12 pb-32 animate-fade-in">
      {/* Header */}
      <div className="bg-tea-900 text-white p-10 rounded-[3rem] shadow-xl flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold mb-2 italic">Configurações</h2>
          <p className="text-tea-100 font-light text-sm italic">
            {isOwner ? 'Painel Administrativo Studio Moriá.' : 'Gerencie seu perfil e horários.'}
          </p>
        </div>
      </div>

      {/* Meus Dados (Todos os funcionários veem o seu) */}
      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-10">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-xl">👤</div>
           <h3 className="text-2xl font-serif text-tea-900 italic font-bold">Meu Acesso Pessoal</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest">Alterar Credenciais</h4>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase ml-2">Nome de Usuário (Login)</label>
                  <input 
                    type="text" 
                    value={myProfileData.username} 
                    onChange={e => setMyProfileData({...myProfileData, username: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all" 
                  />
               </div>
               <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase ml-2">Senha de Acesso</label>
                  <input 
                    type="text" 
                    value={myProfileData.password} 
                    onChange={e => setMyProfileData({...myProfileData, password: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all" 
                  />
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest">Minha Disponibilidade</h4>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => {
                const offDays = myProfileData.offDays || [];
                const isOff = offDays.includes(day.n);
                return (
                  <button 
                    key={day.n}
                    onClick={() => {
                      const next = isOff ? offDays.filter(d => d !== day.n) : [...offDays, day.n];
                      setMyProfileData({ ...myProfileData, offDays: next });
                    }}
                    className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${
                      isOff ? 'bg-tea-800 text-white border-tea-800' : 'bg-white text-gray-400 border-gray-100'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-gray-50 flex justify-end">
          <button 
            onClick={updateMyProfile}
            className="w-full md:w-auto px-12 py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
          >
            Salvar Meus Dados
          </button>
        </div>
      </section>

      {/* Gestão de Equipe (Apenas Dona) */}
      {isOwner && (
        <section className="space-y-8">
          <div className="flex justify-between items-end px-4">
             <div>
                <h3 className="text-2xl font-serif text-tea-950 italic font-bold">Gestão de Funcionários</h3>
                <p className="text-xs text-gray-500 italic">Administre a equipe e as permissões do Studio.</p>
             </div>
             <button 
              onClick={handleAddNewMember}
              className="bg-tea-900 text-white px-8 py-3 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-black transition-all shadow-lg"
             >
              + Cadastrar Funcionária
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settings.teamMembers.map(member => (
              <div key={member.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:border-tea-200 transition-all">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-xl text-tea-900 font-bold">
                      {member.name.charAt(0)}
                   </div>
                   <span className={`text-[8px] font-bold uppercase px-3 py-1 rounded-full ${member.role === 'owner' ? 'bg-tea-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {member.role === 'owner' ? 'Proprietária' : 'Colaboradora'}
                   </span>
                </div>
                <div>
                   <h4 className="font-serif italic font-bold text-lg text-tea-950">{member.name}</h4>
                   <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Usuário: <span className="text-tea-900">{member.username}</span></p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Senha: <span className="text-tea-900">{member.password}</span></p>
                   </div>
                </div>
                <div className="mt-8 flex gap-2">
                   <button 
                    onClick={() => { setMemberInEdit(member); setIsAddingNew(false); }}
                    className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-tea-50 hover:text-tea-900 transition-all"
                   >
                    Editar Cadastro
                   </button>
                   {member.id !== loggedMember.id && (
                     <button 
                      onClick={() => deleteMember(member.id)}
                      className="p-3 bg-red-50 text-red-300 rounded-xl hover:text-red-600 transition-colors"
                     >
                      🗑️
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal de Cadastro/Edição de Funcionário */}
      {memberInEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 md:p-14 shadow-3xl space-y-8 animate-slide-up border border-tea-50">
             <div className="text-center">
                <h3 className="text-3xl font-serif font-bold text-tea-900 italic">{isAddingNew ? 'Novo Cadastro' : 'Editar Funcionária'}</h3>
                <p className="text-xs text-gray-400 mt-2 italic">Defina as credenciais de acesso para a equipe.</p>
             </div>

             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Nome Completo</label>
                   <input 
                     type="text" 
                     value={memberInEdit.name} 
                     onChange={e => setMemberInEdit({...memberInEdit, name: e.target.value})}
                     placeholder="Ex: Ana Souza"
                     className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all" 
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Usuário Login</label>
                      <input 
                        type="text" 
                        value={memberInEdit.username} 
                        onChange={e => setMemberInEdit({...memberInEdit, username: e.target.value})}
                        placeholder="Ex: ana.souza"
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all" 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Senha de Acesso</label>
                      <input 
                        type="text" 
                        value={memberInEdit.password} 
                        onChange={e => setMemberInEdit({...memberInEdit, password: e.target.value})}
                        placeholder="Ex: 123456"
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-tea-100 outline-none transition-all" 
                      />
                   </div>
                </div>
                
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Serviços Habilitados</label>
                   <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scroll p-4 bg-gray-50 rounded-3xl">
                      {services.map(srv => (
                        <label key={srv.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white rounded-xl transition-colors">
                           <input 
                            type="checkbox" 
                            checked={memberInEdit.assignedServiceIds.includes(srv.id)}
                            onChange={() => {
                              const ids = memberInEdit.assignedServiceIds.includes(srv.id)
                                ? memberInEdit.assignedServiceIds.filter(i => i !== srv.id)
                                : [...memberInEdit.assignedServiceIds, srv.id];
                              setMemberInEdit({...memberInEdit, assignedServiceIds: ids});
                            }}
                            className="w-4 h-4 rounded text-tea-900 focus:ring-tea-900 border-gray-300"
                           />
                           <span className="text-[10px] font-bold text-tea-950 uppercase tracking-tight">{srv.name}</span>
                        </label>
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={saveMemberChange}
                  className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                >
                  Confirmar Alterações
                </button>
                <button 
                  onClick={() => { setMemberInEdit(null); setIsAddingNew(false); }}
                  className="w-full py-3 text-gray-400 font-bold uppercase text-[9px] hover:text-gray-600 transition-colors"
                >
                  Descartar
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsView;
