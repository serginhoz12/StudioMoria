
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
    // Simulação de deploy com lembrete de sincronização
    setTimeout(() => {
      setIsDeploying(false);
      const dataToExport = { settings, services, customers, bookings, transactions, version: "5.0" };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sincronizar_moria_${new Date().getTime()}.json`;
      link.click();
      
      alert("CONFIGURAÇÕES SALVAS NESTE APARELHO! 🚀\n\nComo você está usando múltiplos dispositivos, baixamos um arquivo de 'Sincronização'.\n\nPara que as mudanças (serviços ocultos, etc) apareçam no outro celular, basta ir na aba Configuração do outro aparelho e clicar em 'Restaurar de Arquivo', selecionando este que acabou de baixar.");
    }, 1200);
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
    <div className="space-y-10 pb-32 animate-fade-in">
      {/* Aviso de Sincronização */}
      <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-[2rem] flex items-center gap-4 shadow-sm">
        <span className="text-3xl">⚠️</span>
        <div className="text-sm text-orange-800">
          <p className="font-bold mb-1">Aviso de Múltiplos Aparelhos:</p>
          <p className="font-light">As alterações feitas aqui ficam salvas apenas neste navegador. Para atualizar o site em outro celular, use o botão <strong>Publicar Site</strong> e restaure o arquivo gerado no outro aparelho.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 gap-6">
        <div>
          <h2 className="text-3xl font-serif text-tea-950 font-bold">Configurações Studio</h2>
          <p className="text-gray-500 font-light italic">Gerencie o que suas clientes veem no site.</p>
        </div>
        <button 
          onClick={handleDeploy}
          disabled={isDeploying}
          className={`group flex flex-col items-center gap-1 px-10 py-5 rounded-2xl font-bold transition-all active:scale-95 ${isDeploying ? 'bg-gray-100 text-gray-400' : 'bg-tea-800 text-white hover:bg-tea-900 shadow-xl shadow-tea-100'}`}
        >
          <span className="text-xl">🚀 PUBLICAR SITE</span>
          <span className="text-[10px] opacity-70 uppercase tracking-tighter">Salvar e Sincronizar</span>
        </button>
      </div>

      {/* Backup Section */}
      <section className="bg-tea-50 p-8 rounded-[2.5rem] border border-tea-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">📥</div>
          <div>
            <p className="font-bold text-tea-900">Importar de outro aparelho</p>
            <p className="text-xs text-tea-600">Restaurar configurações, clientes e serviços.</p>
          </div>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-white text-tea-800 border-2 border-tea-200 px-8 py-3 rounded-xl font-bold hover:bg-tea-100 transition-all"
        >
          Restaurar de Arquivo
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
             const reader = new FileReader();
             reader.onload = (ev) => { try { onImport(JSON.parse(ev.target?.result as string)); } catch(e) { alert("Erro no arquivo"); } };
             reader.readAsText(file);
          }
        }} />
      </section>

      {/* Catálogo com Visibilidade Aprimorada */}
      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 flex items-center gap-3">📋 Gerenciar Serviços no Site</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {services.map(s => (
            <div key={s.id} className={`p-6 border-2 rounded-3xl flex justify-between items-center transition-all ${s.isVisible ? 'border-gray-50 bg-white' : 'border-red-50 bg-red-50/20 opacity-70'}`}>
              <div>
                <div className="flex items-center gap-3">
                  <p className={`font-bold text-lg ${s.isVisible ? 'text-tea-950' : 'text-gray-400 line-through'}`}>{s.name}</p>
                  {!s.isVisible && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Oculto no Site</span>}
                </div>
                <p className="text-xs text-gray-400 font-medium">R$ {s.price.toFixed(2)} • {s.duration} min</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleServiceVisibility(s.id)} 
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition-all border-2 ${s.isVisible ? 'bg-white border-tea-100 text-tea-700 hover:bg-tea-50' : 'bg-tea-700 border-tea-700 text-white'}`}
                >
                  {s.isVisible ? '🙈 OCULTAR' : '👁️ EXIBIR NO SITE'}
                </button>
                <button onClick={() => setServices(services.filter(x => x.id !== s.id))} className="p-3 text-red-200 hover:text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar Novo */}
        <div className="mt-10 pt-10 border-t border-gray-100">
           <p className="text-xs font-bold text-gray-400 uppercase mb-6 tracking-widest">Adicionar Novo Procedimento:</p>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input placeholder="Nome" className="p-4 bg-gray-50 rounded-xl outline-none focus:bg-white border-2 border-transparent focus:border-tea-100" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
              <input type="number" placeholder="Preço" className="p-4 bg-gray-50 rounded-xl outline-none focus:bg-white border-2 border-transparent focus:border-tea-100" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
              <button onClick={addService} className="bg-tea-100 text-tea-700 py-4 rounded-xl font-bold hover:bg-tea-200 transition-all">SALVAR NO CATÁLOGO</button>
           </div>
        </div>
      </section>
    </div>
  );
};

export default AdminSettingsView;
