
import React, { useState } from 'react';
import { SalonSettings, Service, TeamMember } from '../types.ts';
import { db } from '../firebase.ts';
import { doc, setDoc, deleteDoc, updateDoc, getDoc, getDocFromServer } from "firebase/firestore";
import { auth, db as firebaseDb } from '../firebase.ts';
import { signInAnonymously } from "firebase/auth";
import firebaseConfig from '../firebase-applet-config.json';

interface AdminSettingsViewProps {
  settings: SalonSettings;
  services: Service[];
  customers: any[];
  bookings: any[];
  transactions: any[];
  inventory: any[];
  isMockMode: boolean;
}

const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ 
  settings, 
  services = [],
  customers = [],
  bookings = [],
  transactions = [],
  inventory = [],
  isMockMode
}) => {
  const categories = ['Olhar', 'Rosto', 'Mãos', 'Unhas', 'Corpo', 'Outros'];
  const [newService, setNewService] = useState<Partial<Service>>({ name: '', price: 0, duration: 30, description: '', category: 'Olhar', isVisible: true, isHighlighted: false, returnPeriodDays: 0, usedProducts: [] });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newTransactionCategory, setNewTransactionCategory] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const defaultTransactionCategories = ['Água', 'Luz', 'Internet', 'Salário', 'Imposto', 'Aluguel', 'Suprimentos', 'Outros'];
  const currentTransactionCategories = settings.transactionCategories || defaultTransactionCategories;

  const calculateServiceCost = (service: Partial<Service>) => {
    if (!service.usedProducts) return 0;
    return service.usedProducts.reduce((acc, up) => {
      const product = inventory.find(p => p.id === up.productId);
      if (!product || !product.purchasePrice || !product.netWeight) return acc;
      const costPerUnit = product.purchasePrice / product.netWeight;
      return acc + (costPerUnit * up.consumption);
    }, 0);
  };

  const updateGlobalSettings = async (newSet: SalonSettings) => {
    if (isMockMode) {
      console.log("Modo de Demonstração: Configurações globais não alteradas.");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "main"), { ...newSet, lastUpdated: Date.now() });
    } catch (error: any) {
      console.error("Erro ao atualizar configurações globais:", error);
      if (error.code === 'permission-denied') {
        window.dispatchEvent(new Event('moria_permission_denied'));
        alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
      } else {
        alert("Erro ao salvar configurações.");
      }
    }
  };

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Math.random().toString(36).substr(2, 9),
        name: newMemberName.trim(),
        assignedServiceIds: [],
        businessHours: { start: settings.businessHours.start, end: settings.businessHours.end },
        offDays: [0] 
      };
      const updated = { ...settings, teamMembers: [...settings.teamMembers, newMember] };
      updateGlobalSettings(updated);
      setNewMemberName('');
    }
  };

  const removeTeamMember = (id: string) => {
    if (confirm("Remover profissional permanentemente?")) {
      const updated = { ...settings, teamMembers: settings.teamMembers.filter(m => m.id !== id) };
      updateGlobalSettings(updated);
    }
  };

  const addTransactionCategory = () => {
    if (newTransactionCategory.trim()) {
      const updated = { 
        ...settings, 
        transactionCategories: [...currentTransactionCategories, newTransactionCategory.trim()] 
      };
      updateGlobalSettings(updated);
      setNewTransactionCategory('');
    }
  };

  const removeTransactionCategory = (category: string) => {
    if (confirm(`Remover categoria "${category}"?`)) {
      const updated = { 
        ...settings, 
        transactionCategories: currentTransactionCategories.filter(c => c !== category) 
      };
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
    const currentIds = member.assignedServiceIds || [];
    const hasService = currentIds.includes(serviceId);
    const newServices = hasService 
      ? currentIds.filter(id => id !== serviceId)
      : [...currentIds, serviceId];
    updateMemberField(memberId, 'assignedServiceIds', newServices);
  };

  const addService = async () => {
    if (newService.name && newService.price > 0) {
      if (isMockMode) {
        alert("Modo de Demonstração: Novos procedimentos não serão salvos no banco de dados real.");
        setNewService({ name: '', price: 0, duration: 30, description: '', category: 'Olhar', isVisible: true, isHighlighted: false, returnPeriodDays: 0 });
        return;
      }
      try {
        const id = Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, "services", id), { ...newService, id });
        setNewService({ name: '', price: 0, duration: 30, description: '', category: 'Olhar', isVisible: true, isHighlighted: false, returnPeriodDays: 0 });
        alert("Procedimento adicionado com sucesso!");
      } catch (error: any) {
        console.error("Erro ao adicionar serviço:", error);
        if (error.code === 'permission-denied') {
          window.dispatchEvent(new Event('moria_permission_denied'));
          alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
        } else {
          alert("Erro ao adicionar procedimento.");
        }
      }
    }
  };

  const saveEditedService = async () => {
    if (editingService && editingService.name && editingService.price > 0) {
      if (isMockMode) {
        alert("Modo de Demonstração: Alterações não serão salvas no banco de dados real.");
        setEditingService(null);
        return;
      }
      
      try {
        // Garantir que estamos autenticados antes de salvar
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const serviceRef = doc(db, "services", editingService.id);
        
        // Saneamento de dados para evitar 'invalid-argument' (campos undefined)
        const sanitizedData = {
          name: editingService.name || "Procedimento sem nome",
          price: Number(editingService.price) || 0,
          duration: Number(editingService.duration) || 0,
          description: editingService.description || "",
          category: editingService.category || "Outros",
          returnPeriodDays: Number(editingService.returnPeriodDays) || 0,
          isVisible: editingService.isVisible !== false, // Garante booleano
          isHighlighted: !!editingService.isHighlighted,
          usedProducts: editingService.usedProducts || [],
          id: editingService.id
        };

        console.log("Tentando salvar dados saneados:", sanitizedData);

        // Usar setDoc com merge: true é mais robusto
        await setDoc(serviceRef, sanitizedData, { merge: true });

        setEditingService(null);
        alert("Procedimento atualizado com sucesso!");
      } catch (error: any) {
        console.error("Erro detalhado ao salvar serviço:", error);
        
        if (error.code === 'permission-denied') {
          window.dispatchEvent(new Event('moria_permission_denied'));
          alert("Erro de permissão no Firebase. Verifique se as regras do banco de dados foram publicadas corretamente.");
        } else {
          alert(`Erro ao salvar: ${error.code || 'Erro desconhecido'}. Verifique sua conexão ou as regras do Firebase.`);
        }
      }
    }
  };

  const toggleServiceVisibility = async (id: string, current: boolean) => {
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      await setDoc(doc(db, "services", id), { isVisible: !current }, { merge: true });
    } catch (error: any) {
      console.error("Erro ao alternar visibilidade:", error);
      if (error.code === 'permission-denied') {
        window.dispatchEvent(new Event('moria_permission_denied'));
        alert("Erro de permissão no Firebase.");
      }
    }
  };

  const toggleServiceHighlight = async (id: string, current: boolean) => {
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      await setDoc(doc(db, "services", id), { isHighlighted: !current }, { merge: true });
    } catch (error: any) {
      console.error("Erro ao alternar destaque:", error);
      if (error.code === 'permission-denied') {
        window.dispatchEvent(new Event('moria_permission_denied'));
        alert("Erro de permissão no Firebase.");
      }
    }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente este serviço?")) {
      try {
        await deleteDoc(doc(db, "services", id));
      } catch (error: any) {
        console.error("Erro ao excluir serviço:", error);
        if (error.code === 'permission-denied') {
          window.dispatchEvent(new Event('moria_permission_denied'));
          alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
        }
      }
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

  const [testResult, setTestResult] = useState<string | null>(null);

  const testFirebaseConnection = async () => {
    setTestResult("Testando...");
    try {
      const snap = await getDocFromServer(doc(db, "settings", "main"));
      if (snap.exists()) {
        setTestResult(`Sucesso! Documento existe. Última atualização: ${new Date(snap.data().lastUpdated).toLocaleString()}`);
      } else {
        setTestResult("Sucesso! Mas o documento 'settings/main' não existe no servidor.");
      }
    } catch (err: any) {
      console.error("Erro no teste manual:", err);
      setTestResult(`Falha: ${err.message || err.code}`);
    }
  };

  const forceSyncSettings = async () => {
    setTestResult("Sincronizando...");
    try {
      const snap = await getDocFromServer(doc(db, "settings", "main"));
      if (snap.exists()) {
        const remoteData = snap.data() as SalonSettings;
        // This will trigger the state update in App.tsx if we had a callback, 
        // but for now we'll just alert and the user can refresh or we can try to update local state if passed as prop
        setTestResult("Sincronizado! Recarregue a página para ver as mudanças.");
        alert("Dados carregados do servidor. Por favor, recarregue a página.");
        window.location.reload();
      } else {
        setTestResult("Documento não encontrado no servidor.");
      }
    } catch (err: any) {
      setTestResult(`Erro: ${err.message}`);
    }
  };

  const forceSyncTransactions = async () => {
    setTestResult("Sincronizando transações...");
    try {
      const { collection, getDocsFromServer } = await import("firebase/firestore");
      const snap = await getDocsFromServer(collection(db, "transactions"));
      setTestResult(`Sincronizado! ${snap.docs.length} transações encontradas no servidor.`);
      alert(`${snap.docs.length} transações carregadas do servidor. Por favor, recarregue a página.`);
      window.location.reload();
    } catch (err: any) {
      setTestResult(`Erro: ${err.message}`);
    }
  };

  const forceSyncAll = async () => {
    setTestResult("Sincronizando tudo...");
    try {
      const { collection, getDocsFromServer } = await import("firebase/firestore");
      const collections = ["settings", "services", "customers", "bookings", "transactions", "inventory", "waitlist", "promotions", "productInterests", "productOrders"];
      let total = 0;
      for (const col of collections) {
        const snap = await getDocsFromServer(collection(db, col));
        total += snap.docs.length;
      }
      setTestResult(`Sincronizado! ${total} documentos encontrados no total.`);
      alert(`Sincronização completa. ${total} documentos carregados. Por favor, recarregue a página.`);
      window.location.reload();
    } catch (err: any) {
      setTestResult(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-12 pb-32 animate-fade-in">
      <div className="bg-tea-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
        {isMockMode && (
          <div className="absolute top-0 right-0 bg-orange-500 text-white px-6 py-2 rounded-bl-2xl font-bold text-[10px] uppercase tracking-widest animate-pulse z-20">
            Modo de Demonstração Ativo
          </div>
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[8px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
          >
            {showDebug ? 'Ocultar Debug' : 'Debug'}
          </button>
        </div>
        <h2 className="text-3xl font-serif font-bold mb-2 italic">Configurações Studio Moriá</h2>
        <p className="text-tea-100 font-light text-sm italic">Gestão de profissionais, catálogo e controle de agenda.</p>
      </div>

      {showDebug && (
        <div className="bg-gray-900 text-green-400 p-8 rounded-[2rem] font-mono text-[10px] space-y-2 animate-fade-in">
          <p className="font-bold text-white mb-2 uppercase tracking-widest">Diagnóstico de Conexão Firebase</p>
          <p>Project ID: {firebaseConfig.projectId}</p>
          <p>Auth Domain: {firebaseConfig.authDomain}</p>
          <p>Database ID: {(firebaseDb as any)._databaseId || '(default)'}</p>
          <p>User UID: {auth.currentUser?.uid || 'Não autenticado'}</p>
          <p>User Email: {auth.currentUser?.email || 'N/A'}</p>
          <p>Settings Doc Path: settings/main</p>
          <p>Last Settings Sync: {new Date(settings.lastUpdated || 0).toLocaleString()}</p>
          <p>Visit Count: {settings.visitCount}</p>
          <p>Transactions in State: {transactions.length}</p>
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <button 
              onClick={testFirebaseConnection}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors"
            >
              Testar Conexão
            </button>
            <button 
              onClick={forceSyncSettings}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Sincronizar Configs
            </button>
            <button 
              onClick={forceSyncTransactions}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors"
            >
              Sincronizar Caixa
            </button>
            <button 
              onClick={forceSyncAll}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors"
            >
              Sincronizar Tudo
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors"
            >
              Recarregar App
            </button>
            {testResult && <span className="text-white block w-full mt-2">{testResult}</span>}
          </div>
        </div>
      )}

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
          <span className="text-3xl">📅</span> Disponibilidade da Agenda
        </h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl border border-tea-100 space-y-6">
           <div className="max-w-md">
             <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1 mb-2 block">Liberar Agenda para Clientes até:</label>
             <input 
              type="date" 
              className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold text-tea-900 outline-none focus:border-tea-400"
              value={settings.agendaOpenUntil || ''}
              onChange={e => updateGlobalSettings({...settings, agendaOpenUntil: e.target.value})}
             />
             <p className="text-[9px] text-gray-400 mt-2 ml-1 italic">* Após esta data, nenhum horário estará visível para as clientes no app.</p>
           </div>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">🎯</span> Metas Financeiras
        </h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl border border-tea-100 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Meta de Faturamento Mensal (R$)</label>
              <input 
                type="number"
                className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold text-tea-900 outline-none focus:border-tea-400"
                value={settings.monthlyGoal || 0}
                onChange={(e) => updateGlobalSettings({ ...settings, monthlyGoal: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Lucro Desejado (R$)</label>
              <input 
                type="number"
                className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold text-tea-900 outline-none focus:border-tea-400"
                value={settings.desiredProfit || 0}
                onChange={(e) => updateGlobalSettings({ ...settings, desiredProfit: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <p className="text-[9px] text-gray-400 ml-1 italic">* Esses valores são usados para calcular o ponto de equilíbrio e alertas no painel de inteligência financeira.</p>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">📂</span> Categorias Financeiras
        </h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl border border-tea-100 space-y-8">
          <div className="flex gap-4">
            <input 
              placeholder="Nova categoria (ex: Marketing, Limpeza)..." 
              className="flex-grow p-5 bg-white rounded-2xl font-bold outline-none shadow-inner border border-tea-100" 
              value={newTransactionCategory} 
              onChange={e => setNewTransactionCategory(e.target.value)} 
            />
            <button 
              onClick={addTransactionCategory} 
              className="bg-tea-800 text-white px-10 py-5 rounded-2xl font-bold hover:bg-tea-950 transition-colors shadow-lg uppercase text-[10px] tracking-widest"
            >
              Adicionar
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {currentTransactionCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-tea-100 shadow-sm group">
                <span className="text-xs font-bold text-tea-900">{cat}</span>
                <button 
                  onClick={() => removeTransactionCategory(cat)}
                  className="text-red-300 hover:text-red-500 transition-colors ml-2 opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 ml-1 italic">* Essas categorias estarão disponíveis ao lançar novas despesas ou receitas no módulo financeiro.</p>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">📢</span> Banner de Destaque (Topo do Site)
        </h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl border border-tea-100 space-y-6">
           <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-tea-100">
              <div>
                <p className="text-xs font-bold text-tea-900">Exibir Banner de Aviso</p>
                <p className="text-[10px] text-gray-400">Ativa ou desativa a visibilidade do banner no topo do site para clientes.</p>
              </div>
              <button 
                onClick={() => updateGlobalSettings({...settings, announcementBanner: { ... (settings.announcementBanner || { enabled: false, text: '' }), enabled: !settings.announcementBanner?.enabled }})}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.announcementBanner?.enabled ? 'bg-tea-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.announcementBanner?.enabled ? 'right-1' : 'left-1 shadow-sm'}`}></div>
              </button>
           </div>
           
           {settings.announcementBanner?.enabled && (
             <div className="space-y-2 animate-fade-in">
                <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Frase de Destaque</label>
                <textarea 
                  className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold text-tea-900 outline-none focus:border-tea-400 h-24 resize-none" 
                  value={settings.announcementBanner?.text || ''} 
                  onChange={e => updateGlobalSettings({...settings, announcementBanner: { ... (settings.announcementBanner || { enabled: true, text: '' }), text: e.target.value }})} 
                  placeholder="Ex: AGENDA DE MARÇO ABERTA! RESERVE SEU HORÁRIO."
                />
                <p className="text-[9px] text-gray-400 ml-1 italic">* Use frases curtas e em letras maiúsculas para melhor impacto visual.</p>
             </div>
           )}
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">🛍️</span> Configurações da Loja Online
        </h3>
        <div className="bg-tea-50/50 p-8 rounded-3xl border border-tea-100 space-y-8">
          <div className="max-w-md space-y-2">
            <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Acréscimo para Visitantes (%)</label>
            <div className="flex items-center gap-4">
              <input 
                type="number"
                className="w-full p-4 bg-white border-2 border-tea-100 rounded-2xl font-bold text-tea-900 outline-none focus:border-tea-400"
                value={settings.visitorMarkupPercent || 0}
                onChange={(e) => updateGlobalSettings({ ...settings, visitorMarkupPercent: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-tea-900 font-bold">%</span>
            </div>
            <p className="text-[9px] text-gray-400 ml-1 italic">* Este percentual será aplicado automaticamente ao preço de custo para calcular o preço de venda para visitantes, caso o preço de visitante não seja definido manualmente no produto.</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-tea-100">
            <div>
              <p className="text-xs font-bold text-tea-900">Habilitar Loja para Visitantes</p>
              <p className="text-[10px] text-gray-400">Se desativado, a loja só será visível para clientes logados.</p>
            </div>
            <button 
              onClick={() => updateGlobalSettings({...settings, isStorePublic: !settings.isStorePublic})}
              className={`w-14 h-8 rounded-full transition-all relative ${settings.isStorePublic !== false ? 'bg-tea-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.isStorePublic !== false ? 'right-1' : 'left-1 shadow-sm'}`}></div>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">🔗</span> Redes Sociais & Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp (Apenas números com DDD)</label>
              <input 
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none shadow-inner" 
                value={settings.socialLinks.whatsapp} 
                onChange={e => updateGlobalSettings({...settings, socialLinks: {...settings.socialLinks, whatsapp: e.target.value}})} 
              />
           </div>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-serif text-tea-900 mb-8 italic tracking-tight flex items-center gap-3">
           <span className="text-3xl">👥</span> Gestão da Equipe & Folgas
        </h3>
        <div className="flex gap-4 mb-10">
          <input placeholder="Nome da nova colaboradora..." className="flex-grow p-5 bg-gray-50 rounded-2xl font-bold outline-none shadow-inner" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
          <button onClick={addTeamMember} className="bg-tea-800 text-white px-10 py-5 rounded-2xl font-bold hover:bg-tea-950 transition-colors shadow-lg uppercase text-[10px] tracking-widest">Adicionar Equipe</button>
        </div>
        
        <div className="space-y-12">
          {settings.teamMembers.map(member => (
            <div key={member.id} className="p-8 border-2 border-gray-50 rounded-[2.5rem] bg-white shadow-sm hover:border-tea-100 transition-all space-y-10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-tea-900 text-white rounded-2xl flex items-center justify-center font-serif text-xl font-bold">{member.name.charAt(0)}</div>
                  <span className="font-serif font-bold text-2xl text-tea-950 italic">{member.name}</span>
                </div>
                <button onClick={() => removeTeamMember(member.id)} className="text-red-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 p-3 bg-red-50 rounded-xl transition-colors">Remover da Unidade</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[11px] font-bold text-tea-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <span className="text-lg">⏰</span> Turno de Atendimento
                    </h4>
                    <div className="flex items-center gap-4">
                      <input type="time" className="flex-1 p-4 bg-gray-50 rounded-xl border-none font-bold text-sm shadow-inner" value={member.businessHours?.start || settings.businessHours.start} onChange={e => updateMemberField(member.id, 'businessHours', { ... (member.businessHours || settings.businessHours), start: e.target.value })} />
                      <span className="text-gray-300 font-bold">às</span>
                      <input type="time" className="flex-1 p-4 bg-gray-50 rounded-xl border-none font-bold text-sm shadow-inner" value={member.businessHours?.end || settings.businessHours.end} onChange={e => updateMemberField(member.id, 'businessHours', { ... (member.businessHours || settings.businessHours), end: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-tea-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <span className="text-lg">🚫</span> Dias de Folga (Agenda Fechada)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map(day => (
                        <button 
                          key={day.n} 
                          onClick={() => toggleOffDay(member.id, day.n)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${member.offDays?.includes(day.n) ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[8px] text-gray-400 mt-3 font-bold uppercase tracking-widest">* Selecione os dias em que a profissional NÃO atende.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-tea-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <span className="text-lg">✨</span> Procedimentos Habilitados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {services.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => toggleServiceToMember(member.id, s.id)} 
                        className={`px-5 py-3 rounded-2xl text-[10px] font-bold border-2 transition-all ${member.assignedServiceIds?.includes(s.id) ? 'bg-tea-800 border-tea-800 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-tea-200'}`}
                      >
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
           <span className="text-3xl">📋</span> Catálogo de Cuidados
        </h3>
        
        <div className="bg-tea-50/50 p-8 rounded-3xl mb-10 border border-tea-100">
           <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest mb-6 ml-1">Adicionar Novo Procedimento</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <input placeholder="Nome do Procedimento" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
              <select className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})}>
                 {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input type="number" placeholder="Preço Inicial R$" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
              <input type="number" placeholder="Duração (minutos)" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.duration || ''} onChange={e => setNewService({...newService, duration: parseInt(e.target.value)})} />
              <input type="number" placeholder="Retorno (dias)" className="p-4 rounded-xl bg-white outline-none font-bold shadow-inner" value={newService.returnPeriodDays === 0 ? '' : newService.returnPeriodDays} onChange={e => setNewService({...newService, returnPeriodDays: parseInt(e.target.value) || 0})} />
           </div>
           <button onClick={addService} className="w-full bg-tea-800 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-tea-950 transition-all shadow-lg">Salvar no Catálogo</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {services.map(s => (
            <div key={s.id} className={`p-6 border-2 rounded-3xl flex justify-between items-center transition-all ${s.isVisible ? 'border-gray-50 hover:bg-gray-50/30' : 'bg-red-50/10 opacity-60 border-transparent'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleServiceHighlight(s.id, !!s.isHighlighted)}
                  className={`p-3 rounded-2xl transition-all ${s.isHighlighted ? 'bg-orange-100 text-orange-600 scale-110 shadow-sm' : 'bg-gray-50 text-gray-300'}`}
                  title={s.isHighlighted ? 'Remover Destaque' : 'Destacar no Site'}
                >
                  ⭐
                </button>
                <div>
                  <div className="space-y-1">
                    <p className="font-bold text-lg text-tea-950">{s.name}</p>
                    <span className="text-[8px] bg-tea-100 text-tea-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{s.category}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    {s.duration} min 
                    {s.returnPeriodDays ? ` • Retorno: ${s.returnPeriodDays} dias` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setEditingService(s)} className="p-3 bg-white text-tea-600 rounded-xl border border-tea-50 shadow-sm">✏️</button>
                <button onClick={() => toggleServiceVisibility(s.id, s.isVisible)} className={`px-6 py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${s.isVisible ? 'bg-white text-tea-700 border-tea-100' : 'bg-tea-800 text-white border-tea-800'}`}>
                  {s.isVisible ? 'VISÍVEL' : 'OCULTO'}
                </button>
                <button onClick={() => handleDeleteService(s.id)} className="p-3 text-red-200 hover:text-red-500 transition-colors">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editingService && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-slide-up">
            <h3 className="text-2xl font-serif text-tea-900 mb-8 italic font-bold">Ajustar Procedimento</h3>
            <div className="space-y-6">
              <input className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold shadow-inner" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Categoria</label>
                    <select className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold shadow-inner" value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value})}>
                       {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Preço Inicial R$</label>
                    <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner" value={editingService.price} onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Duração (min)</label>
                  <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner" value={editingService.duration} onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Retorno (dias)</label>
                  <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner" value={editingService.returnPeriodDays ?? 0} onChange={e => setEditingService({...editingService, returnPeriodDays: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Descrição</label>
                <textarea className="w-full p-4 rounded-2xl bg-gray-50 outline-none h-24 shadow-inner" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} />
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-bold text-tea-900 uppercase tracking-widest">Produtos Utilizados</h4>
                  <div className="text-[10px] font-bold text-tea-600">Custo Est.: R$ {calculateServiceCost(editingService).toFixed(2)}</div>
                </div>
                
                <div className="space-y-3">
                  {(editingService.usedProducts || []).map((up, idx) => {
                    const product = inventory.find(p => p.id === up.productId);
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                        <span className="flex-1 text-xs font-medium text-gray-700">{product?.name || 'Produto não encontrado'}</span>
                        <input 
                          type="number" 
                          className="w-20 p-2 bg-white rounded-lg text-xs font-bold outline-none"
                          value={up.consumption}
                          onChange={e => {
                            const newProds = [...(editingService.usedProducts || [])];
                            newProds[idx].consumption = Number(e.target.value);
                            setEditingService({...editingService, usedProducts: newProds});
                          }}
                        />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{product?.unit || 'g'}</span>
                        <button 
                          onClick={() => {
                            const newProds = (editingService.usedProducts || []).filter((_, i) => i !== idx);
                            setEditingService({...editingService, usedProducts: newProds});
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 p-3 bg-gray-50 rounded-xl text-xs outline-none"
                      onChange={e => {
                        const pid = e.target.value;
                        if (!pid) return;
                        const alreadyHas = (editingService.usedProducts || []).some(up => up.productId === pid);
                        if (alreadyHas) return;
                        setEditingService({
                          ...editingService, 
                          usedProducts: [...(editingService.usedProducts || []), { productId: pid, consumption: 0 }]
                        });
                        e.target.value = '';
                      }}
                    >
                      <option value="">+ Adicionar Produto</option>
                      {inventory.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingService(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={saveEditedService} className="flex-[2] bg-tea-800 text-white py-4 rounded-2xl font-bold shadow-xl uppercase text-[10px] tracking-widest">Confirmar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsView;
