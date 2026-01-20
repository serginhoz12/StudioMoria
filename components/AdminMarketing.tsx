
import React, { useState, useMemo } from 'react';
import { Customer, Promotion } from '../types';
import { GoogleGenAI } from '@google/genai';
import { db } from '../firebase.ts';
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

interface AdminMarketingProps {
  customers: Customer[];
  promotions: Promotion[];
}

const AdminMarketing: React.FC<AdminMarketingProps> = ({ customers, promotions }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<'promotion' | 'tip'>('promotion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Seleção de Clientes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Clientes que aceitam notificações
  const eligibleCustomers = useMemo(() => 
    customers.filter(c => c.receivesNotifications && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.whatsapp.includes(searchTerm))
    ), [customers, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === eligibleCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleCustomers.map(c => c.id)));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const generateSmartContent = async () => {
    if (!topic) return alert("Por favor, digite um tema para a IA trabalhar.");
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Crie uma ${type === 'promotion' ? 'promoção irresistível' : 'dica de beleza elegante'} para um salão de estética de luxo chamado Studio Moriá. 
      Tema: ${topic}. 
      Público: Mulheres que buscam autocuidado e sofisticação.
      Retorne estritamente em formato JSON: { "title": "Título curto e impactante", "content": "Texto envolvente com emojis apropriados" }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text);
      setTitle(data.title);
      setContent(data.content);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar conteúdo inteligente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const publishAndSendBatch = async () => {
    if (!title || !content) return alert("Preencha o título e o conteúdo.");
    if (selectedIds.size === 0) return alert("Selecione pelo menos uma cliente para o envio.");

    setIsBroadcasting(true);
    try {
      // 1. Salvar no App (Dashboard do Cliente)
      await addDoc(collection(db, "promotions"), {
        title,
        content,
        type,
        createdAt: new Date().toISOString(),
        isActive: true,
        targetCount: selectedIds.size
      });

      // 2. Disparo Automático WhatsApp
      // Nota: Navegadores bloqueiam múltiplos popups automáticos. 
      // Abriremos a primeira e informaremos que as demais estão prontas para processamento.
      const selectedCustomers = customers.filter(c => selectedIds.has(c.id));
      const message = `🌟 *STUDIO MORIÁ ESTÉTICA* 🌟\n\n*${title}*\n\n${content}\n\nAcesse nosso app para agendar seu horário!`;

      // Loop de disparos (O navegador pode bloquear se forem muitos, o usuário precisará permitir popups)
      selectedCustomers.forEach((c, index) => {
        const url = `https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        // Pequeno delay para tentar burlar o bloqueio de popups sucessivos
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 800);
      });

      alert(`Campanha publicada! Iniciando disparos automáticos para ${selectedIds.size} clientes. Certifique-se de permitir pop-ups neste site.`);
      
      setTitle('');
      setContent('');
      setTopic('');
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert("Erro ao processar campanha.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const deletePromotion = async (id: string) => {
    if (confirm("Deseja remover este conteúdo?")) {
      await deleteDoc(doc(db, "promotions", id));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
           <div>
             <h2 className="text-3xl font-serif text-tea-950 font-bold italic">Marketing Moriá</h2>
             <p className="text-gray-400 text-sm italic">Gestão de Campanhas e Disparos WhatsApp</p>
           </div>
           <button 
             onClick={() => setShowHistory(!showHistory)}
             className="px-6 py-3 border-2 border-tea-100 text-tea-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-tea-50 transition-all"
           >
             {showHistory ? "← Criar Nova Campanha" : "Ver Histórico de Envios"}
           </button>
        </div>

        {!showHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Coluna 1: Conteúdo */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-tea-50/50 p-8 rounded-[2.5rem] border border-tea-100 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest">IA Especialista</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2 p-1 bg-white rounded-xl border border-tea-50">
                    <button onClick={() => setType('promotion')} className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${type === 'promotion' ? 'bg-tea-900 text-white shadow-md' : 'text-gray-400'}`}>Promoção</button>
                    <button onClick={() => setType('tip')} className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${type === 'tip' ? 'bg-tea-900 text-white shadow-md' : 'text-gray-400'}`}>Dica</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Tema da campanha..."
                    className="w-full p-5 rounded-2xl bg-white border border-tea-100 outline-none text-sm"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <button 
                    onClick={generateSmartContent}
                    disabled={isGenerating}
                    className="w-full py-4 bg-tea-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg disabled:bg-gray-200"
                  >
                    {isGenerating ? "Gerando..." : "Gerar com IA"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                 <input 
                   type="text" 
                   placeholder="Título chamativo"
                   className="w-full p-6 rounded-2xl bg-gray-50 border-none font-bold text-tea-950 text-lg outline-none"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                 />
                 <textarea 
                   rows={6}
                   placeholder="Conteúdo da mensagem..."
                   className="w-full p-6 rounded-3xl bg-gray-50 border-none text-gray-700 text-sm outline-none resize-none"
                   value={content}
                   onChange={(e) => setContent(e.target.value)}
                 />
              </div>
            </div>

            {/* Coluna 2: Seleção de Clientes */}
            <div className="lg:col-span-5 flex flex-col h-full bg-gray-50/50 rounded-[3rem] border border-gray-100 overflow-hidden">
               <div className="p-6 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest">Selecionar Público ({selectedIds.size})</h4>
                    <button onClick={toggleSelectAll} className="text-[9px] font-bold text-tea-600 uppercase hover:underline">
                      {selectedIds.size === eligibleCustomers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 text-xs outline-none border border-transparent focus:border-tea-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                  </div>
               </div>

               <div className="flex-grow overflow-y-auto custom-scroll p-4 space-y-2 max-h-[400px]">
                 {eligibleCustomers.map(customer => (
                   <label key={customer.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedIds.has(customer.id) ? 'bg-tea-50 border-tea-200' : 'bg-white border-transparent hover:border-gray-100'}`}>
                      <input 
                        type="checkbox" 
                        className="peer appearance-none w-5 h-5 rounded border-2 border-tea-100 checked:bg-tea-900 checked:border-tea-900 transition-all"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelectCustomer(customer.id)}
                      />
                      <div className="flex-1">
                         <p className="text-xs font-bold text-tea-950">{customer.name}</p>
                         <p className="text-[10px] text-gray-400 font-medium">{customer.whatsapp}</p>
                      </div>
                   </label>
                 ))}
                 {eligibleCustomers.length === 0 && <p className="text-center py-10 text-[10px] text-gray-300 italic">Nenhuma cliente encontrada.</p>}
               </div>

               <div className="p-6 bg-white border-t border-gray-100">
                  <button 
                    onClick={publishAndSendBatch}
                    disabled={isBroadcasting || selectedIds.size === 0 || !title}
                    className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl disabled:bg-gray-200 transition-all active:scale-95"
                  >
                    {isBroadcasting ? "Enviando..." : "🚀 Publicar e Disparar WhatsApp"}
                  </button>
                  <p className="text-[8px] text-gray-400 text-center mt-3 uppercase tracking-widest font-bold">
                    O disparo em lote abrirá novas abas do WhatsApp Web automaticamente.
                  </p>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {promotions.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(promo => (
              <div key={promo.id} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${promo.type === 'promotion' ? 'bg-orange-100 text-orange-700' : 'bg-tea-900 text-white'}`}>
                        {promo.type === 'promotion' ? 'Promoção' : 'Dica'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-medium italic">Enviado em {new Date(promo.createdAt).toLocaleDateString()}</span>
                   </div>
                   <h4 className="font-bold text-tea-950 text-xl mb-1 italic font-serif">{promo.title}</h4>
                   <p className="text-gray-500 text-xs line-clamp-2">{promo.content}</p>
                </div>
                <button onClick={() => deletePromotion(promo.id)} className="p-4 text-red-200 hover:text-red-500 rounded-2xl transition-all">🗑️</button>
              </div>
            ))}
            {promotions.length === 0 && <p className="text-center py-20 text-gray-300 italic">Nenhum histórico disponível.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMarketing;
