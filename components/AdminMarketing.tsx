
import React, { useState } from 'react';
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

  const eligibleCustomers = customers.filter(c => c.receivesNotifications);

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
      alert("Erro ao gerar conteúdo inteligente. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAndBroadcast = async () => {
    if (!title || !content) return alert("Preencha o título e o conteúdo antes de publicar.");
    
    setIsBroadcasting(true);
    try {
      await addDoc(collection(db, "promotions"), {
        title,
        content,
        type,
        createdAt: new Date().toISOString(),
        isActive: true,
        targetCount: eligibleCustomers.length
      });
      
      // Simulação de broadcast para feedback visual
      setTimeout(() => {
        alert(`Sucesso! A ${type === 'promotion' ? 'promoção' : 'dica'} foi publicada no painel de ${eligibleCustomers.length} clientes.`);
        setIsBroadcasting(false);
        setTitle('');
        setContent('');
        setTopic('');
      }, 1500);
    } catch (e) {
      console.error(e);
      setIsBroadcasting(false);
    }
  };

  const deletePromotion = async (id: string) => {
    if (confirm("Deseja remover este conteúdo? Ele deixará de aparecer para as clientes imediatamente.")) {
      await deleteDoc(doc(db, "promotions", id));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
           <div>
             <h2 className="text-3xl font-serif text-tea-950 font-bold italic">Marketing Studio Moriá</h2>
             <p className="text-gray-400 text-sm italic">Crie conexões reais com suas clientes através de conteúdo inteligente.</p>
           </div>
           <button 
             onClick={() => setShowHistory(!showHistory)}
             className="px-6 py-3 border-2 border-tea-100 text-tea-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-tea-50 transition-all"
           >
             {showHistory ? "← Criar Nova Campanha" : "Ver Histórico de Envios"}
           </button>
        </div>

        {!showHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="bg-tea-50/50 p-8 rounded-[2.5rem] border border-tea-100 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <h4 className="text-[10px] font-bold text-tea-700 uppercase tracking-widest">Assistente de Conteúdo IA</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-tea-50">
                    <button 
                      onClick={() => setType('promotion')}
                      className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${type === 'promotion' ? 'bg-tea-900 text-white shadow-md' : 'text-gray-400'}`}
                    >
                      Promoção
                    </button>
                    <button 
                      onClick={() => setType('tip')}
                      className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${type === 'tip' ? 'bg-tea-900 text-white shadow-md' : 'text-gray-400'}`}
                    >
                      Dica de Beleza
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Ex: Limpeza de pele para o verão..."
                    className="w-full p-5 rounded-2xl bg-white border border-tea-100 outline-none focus:ring-4 focus:ring-tea-50 transition-all text-sm"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <button 
                    onClick={generateSmartContent}
                    disabled={isGenerating}
                    className="w-full py-5 bg-tea-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all disabled:bg-gray-200"
                  >
                    {isGenerating ? "Consultando a IA..." : "Gerar Texto Profissional"}
                  </button>
                </div>
              </div>

              <div className="p-8 bg-tea-950 text-white rounded-[2.5rem] flex items-center gap-6 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📢</div>
                 <div className="relative z-10">
                    <p className="text-[10px] font-bold text-tea-300 uppercase tracking-widest mb-1">Público Engajado</p>
                    <p className="text-3xl font-serif font-bold">{eligibleCustomers.length} Clientes</p>
                    <p className="text-[10px] text-tea-200/60 italic mt-2">Prontas para receber sua próxima novidade no app.</p>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Conteúdo da Mensagem</h4>
                 <span className="text-[10px] bg-tea-50 text-tea-700 px-3 py-1 rounded-full font-bold">Preview</span>
               </div>
               <input 
                 type="text" 
                 placeholder="Título chamativo"
                 className="w-full p-6 rounded-2xl bg-gray-50 border-none font-bold text-tea-950 text-lg outline-none focus:ring-4 focus:ring-tea-50"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
               />
               <textarea 
                 rows={8}
                 placeholder="O que você deseja comunicar hoje?"
                 className="w-full p-6 rounded-3xl bg-gray-50 border-none text-gray-700 text-sm outline-none focus:ring-4 focus:ring-tea-50 resize-none leading-relaxed"
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
               />
               <button 
                 onClick={saveAndBroadcast}
                 disabled={isBroadcasting || !title}
                 className={`w-full py-6 rounded-3xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 ${isBroadcasting ? 'bg-gray-200 text-gray-400' : 'bg-tea-900 text-white hover:bg-black'}`}
               >
                 {isBroadcasting ? "Disparando..." : "Publicar para as Clientes 🚀"}
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {promotions.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(promo => (
              <div key={promo.id} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-white hover:shadow-md transition-all">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${promo.type === 'promotion' ? 'bg-orange-100 text-orange-700' : 'bg-tea-900 text-white'}`}>
                        {promo.type === 'promotion' ? 'Promoção' : 'Dica de Especialista'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-medium">Enviado em {new Date(promo.createdAt).toLocaleDateString()}</span>
                   </div>
                   <h4 className="font-bold text-tea-950 text-xl mb-1 italic font-serif">{promo.title}</h4>
                   <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{promo.content}</p>
                </div>
                <button 
                  onClick={() => deletePromotion(promo.id)}
                  className="p-4 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Remover Conteúdo"
                >
                  🗑️
                </button>
              </div>
            ))}
            {promotions.length === 0 && (
              <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-300 italic font-serif text-lg">Nenhuma campanha realizada ainda.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMarketing;
