
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

const AdminMarketing: React.FC<AdminMarketingProps> = ({ customers, promotions, services }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Estado do Formulário de Campanha
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [discount, setDiscount] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const eligibleCustomers = useMemo(() => 
    customers.filter(c => c.receivesNotifications && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.whatsapp.includes(searchTerm))
    ), [customers, searchTerm]);

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

  const generateSmartContent = async () => {
    if (!title && !discount) return alert("Defina um título ou desconto para a IA ter contexto.");
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Crie uma mensagem persuasiva de WhatsApp para Studio Moriá. Promoção: ${title}. Desconto: ${discount}%. Validade: até ${new Date(endDate).toLocaleDateString()}. Seja elegante e use emojis. Retorne apenas o texto da mensagem.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setContent(response.text || '');
    } catch (e) { alert("Erro na IA."); } finally { setIsGenerating(false); }
  };

  const saveCampaign = async () => {
    if (!title || !content) return alert("Título e conteúdo são obrigatórios.");
    if (selectedCustomerIds.size === 0) return alert("Selecione pelo menos uma cliente.");

    try {
      const promoData: Omit<Promotion, 'id'> = {
        title,
        content,
        type: 'promotion',
        discountPercentage: discount,
        applicableServiceIds: selectedServices,
        targetCustomerIds: Array.from(selectedCustomerIds),
        startDate,
        endDate,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await addDoc(collection(db, "promotions"), promoData);

      // Disparo WhatsApp Simulado (Abre o link para o usuário disparar)
      const message = `🌟 *STUDIO MORIÁ* 🌟\n\n${content}`;
      const targetCustomers = customers.filter(c => selectedCustomerIds.has(c.id));
      
      if (confirm(`Campanha salva! Deseja abrir os links de WhatsApp para as ${targetCustomers.length} clientes agora?`)) {
        targetCustomers.forEach((c, i) => {
          const url = `https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
          setTimeout(() => window.open(url, '_blank'), i * 1500);
        });
      }

      setShowForm(false);
      resetForm();
    } catch (e) { alert("Erro ao salvar campanha."); }
  };

  const resetForm = () => {
    setTitle(''); setContent(''); setDiscount(0); 
    setSelectedServices([]); setSelectedCustomerIds(new Set());
  };

  const sortedPromotions = [...promotions].sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif text-tea-950 font-bold italic">Campanhas & Promoções</h2>
          <p className="text-gray-400 text-sm">Gerencie seus descontos e envie para as clientes.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-tea-900 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all"
        >
          {showForm ? '← Voltar à Lista' : '+ Nova Campanha'}
        </button>
      </div>

      {showForm ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
          <div className="lg:col-span-8 bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Título da Campanha</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Especial Mês das Noivas" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Desconto (%)</label>
                <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min="0" max="100" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Início da Validade</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Fim da Validade</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Serviços Inclusos (Se vazio, aplica a todos)</label>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => toggleService(s.id)} 
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${selectedServices.includes(s.id) ? 'bg-tea-800 border-tea-800 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
               <div className="flex justify-between items-center">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Texto para WhatsApp</label>
                 <button onClick={generateSmartContent} disabled={isGenerating} className="text-[9px] font-bold text-tea-600 uppercase hover:underline">{isGenerating ? 'IA está escrevendo...' : 'Gerar com IA ✨'}</button>
               </div>
               <textarea rows={6} value={content} onChange={e => setContent(e.target.value)} placeholder="O que a cliente vai receber no WhatsApp..." className="w-full p-6 bg-gray-50 rounded-3xl outline-none focus:ring-2 focus:ring-tea-100 transition-all resize-none text-sm leading-relaxed" />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xs font-bold text-tea-950 uppercase tracking-widest">Selecionar Clientes</h3>
                   <button onClick={toggleSelectAll} className="text-[9px] font-bold text-tea-600 uppercase">{selectedCustomerIds.size === eligibleCustomers.length ? 'Ninguém' : 'Todos'}</button>
                </div>
                <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-xs mb-4 outline-none" />
                <div className="flex-grow overflow-y-auto max-h-[400px] space-y-2 custom-scroll pr-2">
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
                   <button onClick={saveCampaign} disabled={selectedCustomerIds.size === 0} className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl disabled:bg-gray-100">Criar Campanha e Disparar</button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPromotions.map(promo => {
            const today = new Date().toISOString().split('T')[0];
            const isPast = promo.endDate < today;
            const isFuture = promo.startDate > today;
            const isOngoing = !isPast && !isFuture;

            return (
              <div key={promo.id} className={`bg-white p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isPast ? 'opacity-50 border-gray-100' : 'border-tea-50 hover:border-tea-100'}`}>
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${isPast ? 'bg-gray-100' : 'bg-tea-900 text-white'}`}>
                    {promo.discountPercentage}%
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-tea-950 text-xl font-serif">{promo.title}</h3>
                      {isOngoing && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase">Ativa</span>}
                      {isPast && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase">Encerrada</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Validade: {new Date(promo.startDate).toLocaleDateString()} até {new Date(promo.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-tea-600 font-medium mt-1">
                      {promo.applicableServiceIds.length === 0 ? 'Válido para todos os serviços' : `${promo.applicableServiceIds.length} serviços selecionados`}
                      {' • '} {promo.targetCustomerIds.length} clientes participando
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={async () => { if(confirm("Deseja encerrar esta campanha?")) await updateDoc(doc(db, "promotions", promo.id), { isActive: false, endDate: today }); }} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-red-500 transition-colors">⏹️</button>
                   <button onClick={async () => { if(confirm("Excluir histórico da campanha?")) await deleteDoc(doc(db, "promotions", promo.id)); }} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-red-500 transition-colors">🗑️</button>
                </div>
              </div>
            );
          })}
          {sortedPromotions.length === 0 && (
            <div className="text-center py-32 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-200">
               <p className="text-gray-300 font-serif italic text-xl">Nenhuma campanha criada ainda.</p>
               <button onClick={() => setShowForm(true)} className="text-tea-600 font-bold text-xs uppercase tracking-widest mt-4 hover:underline">Criar minha primeira campanha</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMarketing;
