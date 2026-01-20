
import React, { useState, useMemo } from 'react';
import { Customer, Promotion, Service } from '../types';
import { GoogleGenAI } from '@google/genai';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

interface AdminMarketingProps {
  customers: Customer[];
  promotions: Promotion[];
  services: Service[];
}

const AdminMarketing: React.FC<AdminMarketingProps> = ({ 
  customers = [], 
  promotions = [], 
  services = [] 
}) => {
  const [activeTab, setActiveTab] = useState<'promotions' | 'tips'>('promotions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Estado do Formulário
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [discount, setDiscount] = useState(0);
  const [linkedServiceId, setLinkedServiceId] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro de clientes com proteção contra campos nulos
  const eligibleCustomers = useMemo(() => {
    return (customers || []).filter(c => {
      if (!c) return false;
      const name = (c.name || '').toLowerCase();
      const whatsapp = (c.whatsapp || '');
      const search = (searchTerm || '').toLowerCase();
      return c.receivesNotifications && (name.includes(search) || whatsapp.includes(search));
    });
  }, [customers, searchTerm]);

  // Filtro e Ordenação por Tipo
  const displayItems = useMemo(() => {
    return [...(promotions || [])]
      .filter(p => activeTab === 'promotions' ? p.type === 'promotion' : p.type === 'tip')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [promotions, activeTab]);

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedCustomerIds.size === eligibleCustomers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(eligibleCustomers.map(c => c.id)));
    }
  };

  const generateAIContent = async () => {
    if (!title) return alert("Defina um título para a IA entender o tema.");
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const linkedService = services.find(s => s.id === linkedServiceId);
      let prompt = "";
      
      if (activeTab === 'promotions') {
        prompt = `Crie uma mensagem persuasiva de WhatsApp para Studio Moriá. Título: ${title}. ${linkedService ? `Procedimento Vinculado: ${linkedService.name}.` : ''} Desconto: ${discount}%. Validade: até ${new Date(endDate).toLocaleDateString()}. Foco: Vendas e Agendamento. Seja elegante e use emojis. Retorne apenas o texto da mensagem.`;
      } else {
        prompt = `Crie uma dica de cuidados estéticos profissional para as clientes do Studio Moriá. Tema: ${title}. ${linkedService ? `Relacionado ao serviço: ${linkedService.name}.` : ''} Seja educativa, carinhosa e elegante. Use emojis. Retorne apenas o texto da mensagem de WhatsApp.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setContent(response.text || '');
    } catch (e) { 
      alert("Erro na IA."); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const saveCampaign = async () => {
    if (!title.trim() || !content.trim()) return alert("Título e conteúdo são obrigatórios.");
    if (selectedCustomerIds.size === 0) return alert("Selecione pelo menos uma cliente.");

    try {
      const promoData: Omit<Promotion, 'id'> = {
        title,
        content,
        type: activeTab === 'promotions' ? 'promotion' : 'tip',
        discountPercentage: activeTab === 'promotions' ? discount : 0,
        linkedServiceId: linkedServiceId || undefined,
        applicableServiceIds: selectedServices,
        targetCustomerIds: Array.from(selectedCustomerIds),
        startDate,
        endDate,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await addDoc(collection(db, "promotions"), promoData);

      const header = activeTab === 'promotions' ? '🌟 *PROMOÇÃO STUDIO MORIÁ* 🌟' : '🌿 *DICA DA MORIÁ* 🌿';
      const message = `${header}\n\n${content}`;
      const targetCustomers = customers.filter(c => selectedCustomerIds.has(c.id));
      
      if (confirm(`Registro salvo! Deseja abrir os links de WhatsApp para as ${targetCustomers.length} clientes agora?`)) {
        targetCustomers.forEach((c, i) => {
          const cleanPhone = (c.whatsapp || '').replace(/\D/g, '');
          if (cleanPhone) {
            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            setTimeout(() => window.open(url, '_blank'), i * 1500);
          }
        });
      }

      setShowForm(false);
      resetForm();
    } catch (e) { alert("Erro ao salvar."); }
  };

  const resetForm = () => {
    setTitle(''); setContent(''); setDiscount(0); setLinkedServiceId('');
    setSelectedServices([]); setSelectedCustomerIds(new Set());
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-serif text-tea-950 font-bold italic">Marketing Moriá</h2>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => { setActiveTab('promotions'); setShowForm(false); }}
              className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${activeTab === 'promotions' ? 'border-tea-900 text-tea-950' : 'border-transparent text-gray-400'}`}
            >
              Promoções 🏷️
            </button>
            <button 
              onClick={() => { setActiveTab('tips'); setShowForm(false); }}
              className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${activeTab === 'tips' ? 'border-tea-900 text-tea-950' : 'border-transparent text-gray-400'}`}
            >
              Dicas de Estética ✨
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="w-full sm:w-auto bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all"
        >
          {showForm ? '← Voltar' : activeTab === 'promotions' ? '+ Nova Promoção' : '+ Nova Dica'}
        </button>
      </div>

      {showForm ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
          <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">{activeTab === 'promotions' ? 'Título da Promoção' : 'Título da Dica'}</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={activeTab === 'promotions' ? "Ex: Mês das Noivas" : "Ex: Cuidados Pós-Micro"} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100 focus:bg-white transition-all" />
              </div>
              {activeTab === 'promotions' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Desconto (%)</label>
                  <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min="0" max="100" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Vincular Procedimento (Opcional)</label>
                <select 
                  value={linkedServiceId} 
                  onChange={e => setLinkedServiceId(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100 transition-all appearance-none"
                >
                  <option value="">Nenhum procedimento específico</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Término</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
               <div className="flex justify-between items-center">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Conteúdo para WhatsApp</label>
                 <button onClick={generateAIContent} disabled={isGenerating} className="text-[9px] font-bold text-tea-600 uppercase hover:underline">
                    {isGenerating ? 'A IA está escrevendo...' : 'Gerar com IA ✨'}
                 </button>
               </div>
               <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder="O que a cliente receberá..." className="w-full p-6 bg-gray-50 rounded-3xl outline-none focus:ring-2 focus:ring-tea-100 transition-all text-sm leading-relaxed" />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-gray-100 flex-grow flex flex-col min-h-[400px]">
                <h3 className="text-xs font-bold text-tea-950 uppercase tracking-widest mb-6">Público Alvo</h3>
                <input type="text" placeholder="Filtrar clientes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-xs mb-4 outline-none" />
                <div className="flex-grow overflow-y-auto max-h-[300px] space-y-2 custom-scroll pr-2">
                   {eligibleCustomers.map(c => (
                     <label key={c.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedCustomerIds.has(c.id) ? 'bg-tea-50 border-tea-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={selectedCustomerIds.has(c.id)} onChange={() => {
                          const next = new Set(selectedCustomerIds);
                          next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                          setSelectedCustomerIds(next);
                        }} className="w-4 h-4 rounded text-tea-900 focus:ring-tea-900 border-gray-300" />
                        <div className="text-[11px]">
                          <p className="font-bold text-tea-950">{c.name}</p>
                          <p className="text-gray-400">{c.whatsapp}</p>
                        </div>
                     </label>
                   ))}
                </div>
                <div className="pt-6 mt-4 border-t border-gray-50">
                   <button onClick={saveCampaign} disabled={selectedCustomerIds.size === 0} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all hover:bg-black">
                    Finalizar & Enviar ({selectedCustomerIds.size})
                   </button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map(promo => {
            const today = new Date().toISOString().split('T')[0];
            const isPast = (promo.endDate || '') < today;
            const linkedService = services.find(s => s.id === promo.linkedServiceId);

            return (
              <div key={promo.id} className={`bg-white p-6 md:p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isPast ? 'opacity-50' : 'border-tea-50 hover:border-tea-100'}`}>
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-bold ${activeTab === 'promotions' ? 'bg-tea-900 text-white shadow-lg' : 'bg-tea-100 text-tea-900 border border-tea-200'}`}>
                    {activeTab === 'promotions' ? (promo.discountPercentage === 100 ? 'FREE' : `${promo.discountPercentage}%`) : '✨'}
                  </div>
                  <div>
                    <h3 className="font-bold text-tea-950 text-lg md:text-xl font-serif">{promo.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {activeTab === 'tips' ? 'Publicada em:' : 'Expira em:'} {new Date(promo.endDate).toLocaleDateString()}
                      </p>
                      {linkedService && (
                        <span className="text-[9px] bg-tea-50 text-tea-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-tea-100">
                           Link: {linkedService.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={async () => { if(confirm("Remover permanentemente?")) await deleteDoc(doc(db, "promotions", promo.id)); }} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-red-500 transition-colors">🗑️</button>
                </div>
              </div>
            );
          })}
          
          {displayItems.length === 0 && (
            <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-200">
               <p className="text-gray-400 font-serif italic text-xl">Nenhum registro encontrado.</p>
               <button onClick={() => setShowForm(true)} className="text-tea-600 font-bold text-xs uppercase tracking-widest mt-4 hover:underline">
                  Começar agora
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMarketing;
