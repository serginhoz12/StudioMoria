
import React, { useState, useMemo, useRef } from 'react';
import { Customer, Promotion, Service, Booking, SalonSettings, Transaction } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { toPng } from 'html-to-image';

import { GoogleGenAI } from "@google/genai";

interface AdminMarketingProps {
  customers: Customer[];
  promotions: Promotion[];
  services: Service[];
  bookings: Booking[];
  transactions: Transaction[];
  settings: SalonSettings;
  onUpdateSettings: (data: Partial<SalonSettings>) => void;
  onUpdateCustomer: (id: string, data: Partial<Customer>) => void;
}

const AdminMarketing: React.FC<AdminMarketingProps> = ({ 
  customers = [], 
  promotions = [], 
  services = [],
  bookings = [],
  transactions = [],
  settings,
  onUpdateSettings,
  onUpdateCustomer
}) => {
  const [activeTab, setActiveTab] = useState<'promotions' | 'tips' | 'loyalty' | 'reminders' | 'notices'>('promotions');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estados específicos para Avisos IA
  const [noticeTone, setNoticeTone] = useState<'professional' | 'friendly' | 'urgent' | 'creative'>('professional');
  const [noticePlatform, setNoticePlatform] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [noticePrompt, setNoticePrompt] = useState('');
  const [noticeColor, setNoticeColor] = useState('#1e3d28'); // Cor padrão (Verde Chá Escuro)
  const [noticeFontFamily, setNoticeFontFamily] = useState('font-serif');
  const [noticeFontColor, setNoticeFontColor] = useState('#ffffff');
  const [noticeLogoSize, setNoticeLogoSize] = useState(420);
  const [noticeFontSize, setNoticeFontSize] = useState(36);

  // Estados específicos para Lembretes
  const [reminderType, setReminderType] = useState<'billing' | 'promotion' | 'renewal' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showPromotionManager, setShowPromotionManager] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filtro de clientes para seleção
  const filteredCustomers = useMemo(() => {
    if (!searchTerm && !isSearchFocused) return [];
    const search = searchTerm.toLowerCase();
    return customers.filter(c => 
      !searchTerm || 
      c.name.toLowerCase().includes(search) || 
      c.whatsapp.includes(searchTerm)
    ).slice(0, 5);
  }, [customers, searchTerm, isSearchFocused]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  // Estados de Filtro de Data para Lembretes
  const [startDateFilter, setStartDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [endDateFilter, setEndDateFilter] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // --- LÓGICA GLOBAL (TOP 10 GERAL) ---
  const globalPendingTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return transactions
      .filter(t => t.type === 'receivable' && t.status === 'pending' && t.dueDate)
      .map(t => {
        const dueDate = new Date(t.dueDate!);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 10);
  }, [transactions]);

  const globalRenewalCandidates = useMemo(() => {
    const allCandidates: any[] = [];
    
    customers.forEach(customer => {
      const lastBookings: Record<string, Booking> = {};
      bookings
        .filter(b => b.customerId === customer.id && b.status === 'completed' && b.dateTime)
        .forEach(b => {
          const bDate = new Date(b.dateTime);
          if (isNaN(bDate.getTime())) return;

          if (!lastBookings[b.serviceId] || bDate > new Date(lastBookings[b.serviceId].dateTime)) {
            lastBookings[b.serviceId] = b;
          }
        });

      Object.values(lastBookings).forEach(b => {
        const service = services.find(s => s.id === b.serviceId);
        if (service && service.returnPeriodDays) {
          const lastDate = new Date(b.dateTime);
          const nextDate = new Date(lastDate);
          nextDate.setDate(lastDate.getDate() + service.returnPeriodDays);
          
          if (isNaN(nextDate.getTime())) return;

          const today = new Date();
          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          allCandidates.push({ booking: b, service, nextDate, diffDays, customerName: customer.name, customerId: customer.id });
        }
      });
    });

    return allCandidates
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
      .slice(0, 10);
  }, [bookings, customers, services]);

  // --- LÓGICA POR CLIENTE SELECIONADO ---
  const pendingTransactions = useMemo(() => {
    if (!selectedCustomerId) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return transactions
      .filter(t => 
        t.customerId === selectedCustomerId && 
        t.type === 'receivable' && 
        t.status === 'pending' &&
        t.dueDate
      )
      .map(t => {
        const dueDate = new Date(t.dueDate!);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 10);
  }, [transactions, selectedCustomerId]);

  // --- LÓGICA DE PROMOÇÕES (PARA LEMBRETES) ---
  const activePromotions = useMemo(() => 
    promotions.filter(p => p.isActive && p.type === 'promotion'), 
    [promotions]
  );

  // --- LÓGICA DE RENOVAÇÃO ---
  const renewalCandidates = useMemo(() => {
    if (!selectedCustomerId) return [];

    const lastBookings: Record<string, Booking> = {};
    bookings
      .filter(b => b.customerId === selectedCustomerId && b.status === 'completed' && b.dateTime)
      .forEach(b => {
        const bDate = new Date(b.dateTime);
        if (isNaN(bDate.getTime())) return;

        if (!lastBookings[b.serviceId] || bDate > new Date(lastBookings[b.serviceId].dateTime)) {
          lastBookings[b.serviceId] = b;
        }
      });

    return Object.values(lastBookings).map(b => {
      const service = services.find(s => s.id === b.serviceId);
      if (!service || !service.returnPeriodDays) return null;
      const lastDate = new Date(b.dateTime);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + service.returnPeriodDays);
      
      if (isNaN(nextDate.getTime())) return null;

      const today = new Date();
      const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return { booking: b, service, nextDate, diffDays };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
    .slice(0, 10);
  }, [bookings, selectedCustomerId, services]);
  const generateAINotice = async () => {
    if (!noticePrompt) return alert("Descreva o que você deseja anunciar.");
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const platformContext = noticePlatform === 'whatsapp' 
        ? "status do WhatsApp (curto, direto, com emojis)" 
        : "Stories do Instagram (visual, impactante, focado em engajamento)";

      const prompt = `Você é um especialista em marketing para salões de beleza e estética. 
      Crie um aviso para o ${platformContext} do salão "${settings.name}".
      
      TOM DE VOZ: ${noticeTone}
      ASSUNTO: ${noticePrompt}
      
      REGRAS:
      1. O texto deve ser curto (máximo 150 caracteres).
      2. Use emojis que combinem com o tom de voz.
      3. Se for uma promoção, destaque o benefício.
      4. Se for um aviso de horário vago, crie senso de oportunidade.
      5. Retorne APENAS o texto final do aviso, sem aspas ou introduções.`;

      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = result.text;
      if (text) {
        setGeneratedMessage(text);
        await generateImage(text);
      }
    } catch (error) {
      console.error("Erro ao gerar aviso com IA:", error);
      alert("Erro ao gerar aviso. Verifique sua conexão ou tente novamente mais tarde.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAIReminder = async (type: 'billing' | 'promotion' | 'renewal', data: any) => {
    if (!selectedCustomer) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      let context = "";
      if (type === 'billing') {
        const description = data.serviceName || data.description;
        context = `Lembrete de pagamento pendente para o procedimento "${description}" no valor de R$ ${data.amount.toFixed(2)}. O vencimento foi em ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'data não informada'}.`;
      } else if (type === 'promotion') {
        context = `Convite para aproveitar a promoção "${data.title}": ${data.content}.`;
      } else if (type === 'renewal') {
        context = `Lembrete de que está na hora de renovar o procedimento "${data.service.name}" para manter os resultados. A última sessão foi há algum tempo.`;
      }

      const prompt = `Crie uma mensagem curta para enviar via WhatsApp para a cliente ${selectedCustomer.name.split(' ')[0]}.
      O salão se chama "${settings.name}".
      
      TOM DE VOZ: ${noticeTone}
      CONTEXTO: ${context}
      
      REGRAS:
      1. Siga o tom de voz solicitado.
      2. Use emojis delicados.
      3. O texto deve ser conciso (máximo 120 caracteres).
      4. Retorne APENAS o texto da mensagem.`;

      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = result.text;
      if (text) {
        setGeneratedMessage(text);
        await generateImage(text);
      }
    } catch (error) {
      console.error("Erro ao gerar lembrete com IA:", error);
      // Fallback para mensagem padrão se a IA falhar
      let fallbackMsg = "";
      if (type === 'billing') fallbackMsg = `Olá! ✨ Passando para lembrar sobre o acerto de ${data.serviceName || data.description} (R$ ${data.amount.toFixed(2)}).`;
      else if (type === 'promotion') fallbackMsg = `Promoção: ${data.title}! ✨`;
      else fallbackMsg = `Olá! ✨ Hora de renovar seu procedimento de ${data.service.name}. Vamos agendar? 🌸`;
      
      setGeneratedMessage(fallbackMsg);
      await generateImage(fallbackMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImage = async (message: string) => {
    setIsGenerating(true);
    setGeneratedMessage(message);
    setGeneratedImageUrl(null);
    
    // Pequeno delay para garantir que o DOM atualizou com a nova mensagem
    setTimeout(async () => {
      if (cardRef.current) {
        try {
          const isNotice = activeTab === 'notices';
          const width = 1080;
          const height = isNotice ? 1920 : 1080;
          const scale = 2.7; // 400px * 2.7 = 1080px

          let dataUrl;
          try {
            dataUrl = await toPng(cardRef.current, {
              cacheBust: true,
              width,
              height,
              filter: (node: any) => {
                if (node.tagName === 'LINK' && node.rel === 'stylesheet' && !node.href.includes(window.location.origin)) {
                  return false;
                }
                return true;
              },
              style: {
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }
            });
          } catch (firstErr) {
            console.warn('Tentativa inicial de gerar imagem falhou (provavelmente erro de CORS nas fontes). Tentando sem embutir fontes...', firstErr);
            // Segunda tentativa: desabilita o processamento de fontes externas que causa o erro de 'cssRules'
            dataUrl = await toPng(cardRef.current, {
              cacheBust: true,
              width,
              height,
              fontEmbedCSS: '', // Pula a busca por fontes em stylesheets externos
              style: {
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }
            });
          }
          setGeneratedImageUrl(dataUrl);
        } catch (err) {
          console.error('Erro ao gerar imagem em todas as tentativas:', err);
        }
      }
      setIsGenerating(false);
    }, 100);
  };

  const handleSelectBilling = (transaction: any) => {
    setSelectedTransactionId(transaction.id);
    generateAIReminder('billing', transaction);
  };

  const handleSelectPromotion = (promotion: Promotion) => {
    setSelectedPromotionId(promotion.id);
    generateAIReminder('promotion', promotion);
  };

  const handleSelectRenewal = (item: any) => {
    setSelectedBookingId(item.booking.id);
    generateAIReminder('renewal', item);
  };

  const downloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    const name = selectedCustomer ? `lembrete-${selectedCustomer.name}` : `aviso-ia-${new Date().getTime()}`;
    link.download = `${name}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const sendWhatsApp = () => {
    if (!selectedCustomer) return;
    const phone = selectedCustomer.whatsapp.replace(/\D/g, '');
    const text = encodeURIComponent(`Olá, ${selectedCustomer.name}! Acabei de gerar um lembrete especial para você. Vou te enviar a imagem abaixo:`);
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  };

  const resetSelection = () => {
    setSelectedCustomerId(null);
    setSearchTerm('');
    setGeneratedMessage('');
    setGeneratedImageUrl(null);
    setReminderType(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-serif text-tea-950 font-bold italic">Marketing</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('promotions')}
            className={`px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeTab === 'promotions' ? 'bg-tea-900 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Promoções 🏷️
          </button>
          <button 
            onClick={() => setActiveTab('tips')}
            className={`px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeTab === 'tips' ? 'bg-tea-900 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Dicas ✨
          </button>
          <button 
            onClick={() => setActiveTab('loyalty')}
            className={`px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeTab === 'loyalty' ? 'bg-tea-900 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Fidelidade 💎
          </button>
          <button 
            onClick={() => setActiveTab('reminders')}
            className={`px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeTab === 'reminders' ? 'bg-tea-900 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Lembretes 📱
          </button>
          <button 
            onClick={() => setActiveTab('notices')}
            className={`px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeTab === 'notices' ? 'bg-tea-900 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Avisos IA 🤖
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO DAS ABAS ORIGINAIS */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif text-tea-950 font-bold italic">Gerenciar Promoções</h3>
            <button 
              onClick={() => setShowPromotionManager(!showPromotionManager)}
              className="text-[10px] font-bold text-tea-600 uppercase tracking-widest hover:underline"
            >
              {showPromotionManager ? 'Ver Lista' : 'Nova Promoção'}
            </button>
          </div>
          {showPromotionManager ? (
            <PromotionManager promotions={promotions} services={services} customers={customers} type="promotion" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.filter(p => p.type === 'promotion').map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-tea-950 font-serif italic">{p.title}</h4>
                    <span className="text-[10px] bg-tea-900 text-white px-2 py-0.5 rounded-lg font-bold">-{p.discountPercentage}%</span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-3">{p.content}</p>
                  <div className="pt-2 flex justify-between items-center border-t border-gray-50">
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${p.isActive ? 'text-green-500' : 'text-red-500'}`}>
                      {p.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                    <button 
                      onClick={async () => await updateDoc(doc(db, "promotions", p.id), { isActive: !p.isActive })}
                      className="text-[8px] font-bold text-tea-600 uppercase tracking-widest"
                    >
                      Alternar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif text-tea-950 font-bold italic">Dicas de Beleza</h3>
            <button 
              onClick={() => setShowPromotionManager(!showPromotionManager)}
              className="text-[10px] font-bold text-tea-600 uppercase tracking-widest hover:underline"
            >
              {showPromotionManager ? 'Ver Lista' : 'Nova Dica'}
            </button>
          </div>
          {showPromotionManager ? (
            <PromotionManager promotions={promotions} services={services} customers={customers} type="tip" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.filter(p => p.type === 'tip').map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-3">
                  <h4 className="font-bold text-tea-950 font-serif italic">{p.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-3">{p.content}</p>
                  <div className="pt-2 flex justify-between items-center border-t border-gray-50">
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${p.isActive ? 'text-green-500' : 'text-red-500'}`}>
                      {p.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                    <button 
                      onClick={async () => await updateDoc(doc(db, "promotions", p.id), { isActive: !p.isActive })}
                      className="text-[8px] font-bold text-tea-600 uppercase tracking-widest"
                    >
                      Alternar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-serif text-tea-950 font-bold italic">Programa de Fidelidade</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Configure como suas clientes ganham pontos</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-tea-950 text-sm">Ativar Programa</span>
              <button 
                onClick={() => onUpdateSettings({ loyaltyConfig: { ...settings.loyaltyConfig!, enabled: !settings.loyaltyConfig?.enabled } })}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.loyaltyConfig?.enabled ? 'bg-tea-900' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.loyaltyConfig?.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Pontos por R$ 1,00</label>
                <input 
                  type="number" 
                  value={settings.loyaltyConfig?.pointsPerReal || 0}
                  onChange={(e) => onUpdateSettings({ loyaltyConfig: { ...settings.loyaltyConfig!, pointsPerReal: Number(e.target.value) } })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Mínimo para Resgate</label>
                <input 
                  type="number" 
                  value={settings.loyaltyConfig?.minPointsToRedeem || 0}
                  onChange={(e) => onUpdateSettings({ loyaltyConfig: { ...settings.loyaltyConfig!, minPointsToRedeem: Number(e.target.value) } })}
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Descrição do Prêmio</label>
              <textarea 
                value={settings.loyaltyConfig?.rewardDescription || ''}
                onChange={(e) => onUpdateSettings({ loyaltyConfig: { ...settings.loyaltyConfig!, rewardDescription: e.target.value } })}
                placeholder="Ex: Ganhe uma limpeza de pele ao atingir 500 pontos"
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none h-24"
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA DE LEMBRETES */}
      {activeTab === 'reminders' && (
        <div className="space-y-8 animate-slide-up">
          {/* Busca de Cliente */}
          <div className="max-w-xl mx-auto relative">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input 
                type="text" 
                placeholder="Buscar cliente para lembrete personalizado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-tea-100 transition-all"
              />
              {selectedCustomer && (
                <button 
                  onClick={resetSelection}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Resultados da Busca */}
            {isSearchFocused && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                {filteredCustomers.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setIsSearchFocused(false);
                      setSearchTerm(c.name);
                    }}
                    className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-tea-950 text-sm">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.whatsapp}</p>
                    </div>
                    <span className="text-xs">👤</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Lado Esquerdo: Listas de Lembretes */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-tea-50 rounded-2xl flex items-center justify-center text-xl">👤</div>
                    <div>
                      <h3 className="text-lg font-serif text-tea-950 font-bold italic">{selectedCustomer.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cliente Selecionada</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Cobranças */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Cobranças Pendentes</h4>
                      {pendingTransactions.length > 0 ? (
                        <div className="space-y-2">
                          {pendingTransactions.map(t => (
                            <button 
                              key={t.id}
                              onClick={() => handleSelectBilling(t)}
                              className={`w-full p-4 rounded-2xl text-left transition-all border ${selectedTransactionId === t.id ? 'bg-tea-50 border-tea-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-tea-950">{t.serviceName || t.description}</span>
                                <span className="text-xs font-bold text-red-500">R$ {t.amount.toFixed(2)}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">Vencimento: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic ml-2">Nenhuma cobrança pendente.</p>
                      )}
                    </div>

                    {/* Renovação */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Sugestão de Renovação</h4>
                      {renewalCandidates.length > 0 ? (
                        <div className="space-y-2">
                          {renewalCandidates.map(item => (
                            <button 
                              key={item.booking.id}
                              onClick={() => handleSelectRenewal(item)}
                              className={`w-full p-4 rounded-2xl text-left transition-all border ${selectedBookingId === item.booking.id ? 'bg-tea-50 border-tea-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-tea-950">{item.service.name}</span>
                                <span className="text-[10px] font-bold text-tea-600">{item.diffDays} dias</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">Próxima data ideal: {item.nextDate.toLocaleDateString()}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic ml-2">Nenhuma renovação pendente.</p>
                      )}
                    </div>

                    {/* Promoções */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Enviar Promoção</h4>
                      <div className="space-y-2">
                        {activePromotions.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => handleSelectPromotion(p)}
                            className={`w-full p-4 rounded-2xl text-left transition-all border ${selectedPromotionId === p.id ? 'bg-tea-50 border-tea-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-tea-950">{p.title}</span>
                              <span className="text-[10px] bg-tea-900 text-white px-2 py-0.5 rounded-lg">-{p.discountPercentage}%</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Prévia e Ações */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estilo e Prévia</h4>
                    <button 
                      onClick={() => {
                        setNoticeColor('#1e3d28');
                        setNoticeFontColor('#ffffff');
                        setNoticeFontFamily('font-serif');
                        setNoticeFontSize(36);
                      }}
                      className="text-[9px] font-bold text-tea-900 uppercase tracking-widest hover:underline"
                    >
                      Resetar Estilo 🔄
                    </button>
                  </div>
                  
                  {/* Controles de Estilo Compactos */}
                  <div className="w-full grid grid-cols-4 gap-3 mb-8">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fundo</label>
                      <input 
                        type="color" 
                        value={noticeColor}
                        onChange={(e) => setNoticeColor(e.target.value)}
                        className="w-full h-10 rounded-xl border-none p-0 cursor-pointer overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Texto</label>
                      <input 
                        type="color" 
                        value={noticeFontColor}
                        onChange={(e) => setNoticeFontColor(e.target.value)}
                        className="w-full h-10 rounded-xl border-none p-0 cursor-pointer overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fonte</label>
                      <select 
                        value={noticeFontFamily}
                        onChange={(e) => setNoticeFontFamily(e.target.value)}
                        className="w-full h-10 bg-gray-50 rounded-xl text-[10px] font-bold outline-none px-2"
                      >
                        <option value="font-serif">Serif</option>
                        <option value="font-sans">Sans</option>
                        <option value="font-mono">Mono</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tam.</label>
                      <input 
                        type="number" 
                        value={noticeFontSize}
                        onChange={(e) => setNoticeFontSize(Number(e.target.value))}
                        className="w-full h-10 bg-gray-50 rounded-xl text-[10px] font-bold outline-none px-2"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <div 
                      ref={cardRef}
                      className="w-[400px] h-[400px] rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl"
                      style={{ backgroundColor: noticeColor }}
                    >
                      {/* Decoração sutil */}
                      <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none">
                        <div className="absolute top-6 left-6 text-5xl rotate-12">✨</div>
                        <div className="absolute bottom-6 right-6 text-5xl -rotate-12">🌸</div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] opacity-[0.03]">✨</div>
                      </div>

                      {settings.logo && (
                        <img 
                          src={settings.logo} 
                          alt="Logo" 
                          className="object-contain opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
                          style={{ width: `${noticeLogoSize / 2}px` }}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      <p className={`leading-tight drop-shadow-md z-10 ${noticeFontFamily}`} style={{ fontSize: `${noticeFontSize}px`, color: noticeFontColor }}>
                        {generatedMessage || "Selecione um lembrete para gerar a mensagem..."}
                      </p>

                      <div className="absolute bottom-8 w-16 h-1 bg-white/20 rounded-full" />
                    </div>

                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center z-20">
                        <div className="w-12 h-12 border-4 border-tea-900 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-bold text-tea-900 uppercase tracking-widest">Gerando com IA...</p>
                      </div>
                    )}
                  </div>

                  {generatedImageUrl && (
                    <div className="w-full mt-8 grid grid-cols-2 gap-4">
                      <button 
                        onClick={downloadImage}
                        className="py-4 bg-tea-950 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] transition-all"
                      >
                        Baixar Imagem 📥
                      </button>
                      <button 
                        onClick={sendWhatsApp}
                        className="py-4 bg-green-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] transition-all"
                      >
                        Enviar WhatsApp 📱
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Top 10 Cobranças Geral */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-serif text-tea-950 font-bold italic">Cobranças Pendentes</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Próximos vencimentos (Geral)</p>
                </div>
                <div className="space-y-3">
                  {globalPendingTransactions.map(t => {
                    const customer = customers.find(c => c.id === t.customerId);
                    return (
                      <button 
                        key={t.id}
                        onClick={() => {
                          setSelectedCustomerId(t.customerId);
                          handleSelectBilling(t);
                        }}
                        className="w-full p-4 bg-gray-50 rounded-2xl text-left hover:bg-tea-50 transition-all group border border-transparent hover:border-tea-100"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-tea-950">{customer?.name || 'Cliente'}</span>
                          <span className="text-xs font-bold text-red-500">R$ {t.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-gray-400">{t.serviceName || t.description}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${t.diffDays < 0 ? 'text-red-600' : 'text-orange-500'}`}>
                            {t.diffDays < 0 ? `Atrasado ${Math.abs(t.diffDays)}d` : `Vence em ${t.diffDays}d`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {globalPendingTransactions.length === 0 && (
                    <div className="text-center py-12 opacity-50">
                      <span className="text-4xl mb-2 block">✅</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Nenhuma cobrança pendente</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top 10 Renovação Geral */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-serif text-tea-950 font-bold italic">Renovação de Serviços</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Clientes que precisam voltar</p>
                </div>
                <div className="space-y-3">
                  {globalRenewalCandidates.map((item, idx) => (
                    <button 
                      key={`${item.customerId}-${idx}`}
                      onClick={() => {
                        setSelectedCustomerId(item.customerId);
                        handleSelectRenewal(item);
                      }}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-left hover:bg-tea-50 transition-all group border border-transparent hover:border-tea-100"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-tea-950">{item.customerName}</span>
                        <span className={`text-[10px] font-bold ${item.diffDays < 0 ? 'text-red-500' : 'text-tea-600'}`}>
                          {item.diffDays < 0 ? `Atrasado ${Math.abs(item.diffDays)}d` : `Em ${item.diffDays}d`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-400">{item.service.name}</span>
                        <span className="text-[9px] font-bold text-tea-600 uppercase tracking-widest group-hover:underline">Convidar →</span>
                      </div>
                    </button>
                  ))}
                  {globalRenewalCandidates.length === 0 && (
                    <div className="text-center py-12 opacity-50">
                      <span className="text-4xl mb-2 block">📅</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Nenhuma renovação sugerida</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA DE AVISOS IA */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-serif text-tea-950 font-bold italic">Gerador de Avisos IA</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Crie conteúdos para WhatsApp e Instagram</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">O que você quer anunciar?</label>
                  <textarea 
                    value={noticePrompt}
                    onChange={(e) => setNoticePrompt(e.target.value)}
                    placeholder="Ex: Promoção de limpeza de pele para amanhã, horário vago às 14h, novo serviço de massagem..."
                    className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none h-32 focus:bg-white focus:border-tea-100 border-2 border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Plataforma</label>
                    <select 
                      value={noticePlatform}
                      onChange={(e) => setNoticePlatform(e.target.value as any)}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="whatsapp">WhatsApp Status</option>
                      <option value="instagram">Instagram Stories</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Tom de Voz</label>
                    <select 
                      value={noticeTone}
                      onChange={(e) => setNoticeTone(e.target.value as any)}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="professional">Profissional</option>
                      <option value="friendly">Amigável</option>
                      <option value="urgent">Urgente</option>
                      <option value="creative">Criativo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Tamanho do Logo</label>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                      <input 
                        type="range" 
                        min="100" 
                        max="1200" 
                        step="10"
                        value={noticeLogoSize}
                        onChange={(e) => setNoticeLogoSize(Number(e.target.value))}
                        className="flex-1 accent-tea-900"
                      />
                      <span className="text-[10px] font-bold text-tea-900 w-10">{noticeLogoSize}px</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Tamanho da Letra</label>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                      <input 
                        type="range" 
                        min="12" 
                        max="80" 
                        step="2"
                        value={noticeFontSize}
                        onChange={(e) => setNoticeFontSize(Number(e.target.value))}
                        className="flex-1 accent-tea-900"
                      />
                      <span className="text-[10px] font-bold text-tea-900 w-8">{noticeFontSize}px</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Fonte</label>
                    <select 
                      value={noticeFontFamily}
                      onChange={(e) => setNoticeFontFamily(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="font-serif italic">Serifada Itálica (Elegante)</option>
                      <option value="font-serif">Serifada (Clássica)</option>
                      <option value="font-sans">Sans (Moderna)</option>
                      <option value="font-mono">Mono (Técnica)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Cor da Letra</label>
                    <div className="flex gap-2 items-center h-[52px] bg-gray-50 rounded-2xl px-4">
                      {['#ffffff', '#f3f4f6', '#d1d5db', '#000000', '#1e3d28'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setNoticeFontColor(color)}
                          className={`w-6 h-6 rounded-full border transition-all ${noticeFontColor === color ? 'ring-2 ring-tea-900 scale-110' : 'border-gray-200'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input 
                        type="color" 
                        value={noticeFontColor}
                        onChange={(e) => setNoticeFontColor(e.target.value)}
                        className="w-6 h-6 rounded-full border-none p-0 cursor-pointer overflow-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Cor do Fundo</label>
                  <div className="flex gap-2">
                    {['#1e3d28', '#3d1e1e', '#1e2a3d', '#3d3d1e', '#2d1e3d', '#1e3d3d'].map(color => (
                      <button 
                        key={color}
                        onClick={() => setNoticeColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${noticeColor === color ? 'border-tea-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={noticeColor}
                      onChange={(e) => setNoticeColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-none p-0 cursor-pointer overflow-hidden"
                    />
                  </div>
                </div>

                <button 
                  onClick={generateAINotice}
                  disabled={isGenerating}
                  className={`w-full py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar com IA 🤖'}
                </button>
              </div>
            </div>

            {generatedImageUrl && (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={downloadImage}
                    className="py-4 bg-tea-950 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-lg"
                  >
                    Baixar Imagem 📥
                  </button>
                  <button 
                    onClick={() => {
                      const text = encodeURIComponent(generatedMessage);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                    className="py-4 bg-green-500 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-lg"
                  >
                    WhatsApp 📱
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Prévia do Aviso (9:16)</h4>
            
            <div className="flex justify-center">
              <div 
                ref={cardRef}
                className="w-[400px] h-[711px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center justify-between p-12 text-center relative border-[10px]"
                style={{ backgroundColor: noticeColor, borderColor: 'rgba(0,0,0,0.1)' }}
              >
                {/* Decoração de Fundo - Itens de Salão */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] select-none">
                  <div className="absolute top-10 left-10 text-8xl rotate-12">✂️</div>
                  <div className="absolute top-40 right-[-20px] text-9xl -rotate-12">🧴</div>
                  <div className="absolute middle-0 left-[-30px] text-8xl rotate-45">🪮</div>
                  <div className="absolute bottom-40 right-10 text-8xl -rotate-45">💅</div>
                  <div className="absolute bottom-10 left-20 text-9xl rotate-12">💄</div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] opacity-[0.02]">✨</div>
                </div>

                {/* Bordas Decorativas */}
                <div className="absolute top-0 left-0 w-full h-4 bg-black/10" />
                <div className="absolute bottom-0 left-0 w-full h-4 bg-black/10" />
                
                {/* Logotipo como Fundo (Atrás das Letras) */}
                {settings.logo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img 
                      src={settings.logo} 
                      alt="Logo Background" 
                      className="object-contain opacity-60 drop-shadow-[0_20px_20px_rgba(0,0,0,0.3)]" 
                      style={{ width: `${noticeLogoSize}px`, maxWidth: 'none' }}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}

                {/* Brilhos extras */}
                <div className="absolute top-20 right-16 opacity-20 text-4xl animate-pulse">✨</div>
                <div className="absolute bottom-32 left-16 opacity-20 text-4xl animate-pulse" style={{ animationDelay: '1s' }}>✨</div>

                {/* Conteúdo Principal */}
                <div className="w-full flex flex-col items-center mt-24 space-y-12 z-10">
                  {!settings.logo && (
                    <h1 className="font-serif italic font-bold text-white drop-shadow-md" style={{ color: noticeFontColor, fontSize: `${noticeFontSize * 1.5}px` }}>{settings.name}</h1>
                  )}

                  <div className="w-32 h-1.5 bg-white/30 rounded-full" />

                  <div className="space-y-8 max-w-[360px]">
                    <p className={`leading-tight drop-shadow-lg ${noticeFontFamily}`} style={{ color: noticeFontColor, fontSize: `${noticeFontSize}px` }}>
                      {generatedMessage || "Sua mensagem gerada por IA aparecerá aqui..."}
                    </p>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="w-full pb-10 z-10">
                  <div className="w-16 h-1 bg-white/20 mx-auto mb-6 rounded-full" />
                  <div className="flex flex-col items-center space-y-2">
                    {settings.socialLinks?.whatsapp && (
                      <div className="text-[11px] font-bold tracking-wider flex items-center gap-2" style={{ color: noticeFontColor + 'cc' }}>
                        <span>📱</span> {settings.socialLinks.whatsapp}
                      </div>
                    )}
                    {settings.socialLinks?.instagram && (
                      <div className="text-[11px] font-bold tracking-wider flex items-center gap-2" style={{ color: noticeFontColor + 'cc' }}>
                        <span>📸</span> @{settings.socialLinks.instagram.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}
                      </div>
                    )}
                    <div className="text-[10px] font-bold tracking-widest flex items-center gap-2" style={{ color: noticeFontColor + '99' }}>
                      <span>🌐</span> studiomoriaestetica.com.br
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PromotionManager: React.FC<{ promotions: Promotion[], services: Service[], customers: Customer[], type: 'promotion' | 'tip' }> = ({ promotions, services, customers, type }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [discount, setDiscount] = useState(0);
  const [endDate, setEndDate] = useState('');

  const handleSave = async () => {
    if (!title || !content || (type === 'promotion' && !endDate)) return alert("Preencha todos os campos");
    try {
      await addDoc(collection(db, "promotions"), {
        title,
        content,
        discountPercentage: discount,
        endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        type,
        isActive: true,
        createdAt: new Date().toISOString(),
        targetCustomerIds: []
      });
      alert(`${type === 'promotion' ? 'Promoção' : 'Dica'} criada com sucesso!`);
      setTitle(''); setContent(''); setDiscount(0); setEndDate('');
    } catch (e) {
      alert("Erro ao salvar");
    }
  };

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" />
        {type === 'promotion' && (
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Desc. %" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" />
          </div>
        )}
      </div>
      <textarea placeholder="Conteúdo..." value={content} onChange={e => setContent(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none h-32" />
      <button onClick={handleSave} className="w-full py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar</button>
    </div>
  );
};

export default AdminMarketing;
