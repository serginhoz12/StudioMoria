
import React, { useState, useMemo, useRef } from 'react';
import { Customer, Promotion, Service, Booking, SalonSettings, Transaction } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { toPng } from 'html-to-image';

import { GoogleGenAI } from "@google/genai";
import { 
  Download, 
  Share2, 
  Trash2, 
  Search, 
  Calendar, 
  MessageSquare, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft, 
  Image as ImageIcon, 
  Sparkles, 
  Type, 
  Palette, 
  RefreshCw, 
  Send, 
  Smartphone, 
  Instagram, 
  Layout, 
  Maximize2, 
  Minimize2, 
  Move, 
  Camera, 
  Zap, 
  Star, 
  Heart, 
  Smile, 
  Sparkle, 
  Loader2 
} from 'lucide-react';

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
  const [noticePlatform, setNoticePlatform] = useState<'whatsapp' | 'social'>('whatsapp');
  const [noticePrompt, setNoticePrompt] = useState('');
  const [noticeColor, setNoticeColor] = useState('#1e3d28'); // Cor padrão (Verde Chá Escuro)
  const [noticeFontFamily, setNoticeFontFamily] = useState('font-serif');
  const [noticeFontColor, setNoticeFontColor] = useState('#ffffff');
  const [noticeLogoSize, setNoticeLogoSize] = useState(420);
  const [noticeFontSize, setNoticeFontSize] = useState(36);
  const [noticeLogoPos, setNoticeLogoPos] = useState({ x: 0, y: 0 });
  const [noticeTextPos, setNoticeTextPos] = useState({ x: 0, y: 0 });
  const [noticeBgImage, setNoticeBgImage] = useState<string | null>(null);
  const [draggingElement, setDraggingElement] = useState<'logo' | 'text' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
        const remainingAmount = t.amount - (t.paidAmount || 0);
        return { ...t, diffDays, remainingAmount };
      })
      .filter(t => t.remainingAmount > 0)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 10);
  }, [transactions]);

  const globalRenewalCandidates = useMemo(() => {
    const allCandidates: any[] = [];
    const today = new Date();
    
    customers.forEach(customer => {
      const lastBookings: Record<string, Booking> = {};
      const futureBookings = bookings.filter(b => 
        b.customerId === customer.id && 
        (b.status === 'scheduled' || b.status === 'pending') &&
        b.dateTime && new Date(b.dateTime) >= today
      );

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
          const serviceNameLower = service.name.toLowerCase();

          // 1. Verificar se existe algum agendamento FUTURO que já cubra este serviço
          const hasFutureBooking = futureBookings.some(fb => {
            const fbService = services.find(s => s.id === fb.serviceId);
            const isSameCategoryPackage = fbService && service && 
                                         fbService.category === service.category && 
                                         (fbService.name.toLowerCase().includes('pacote') || 
                                          fbService.name.toLowerCase().includes('tratamento') ||
                                          fbService.name.toLowerCase().includes('combo') ||
                                          fbService.name.toLowerCase().includes('completo'));

            return (
              fb.serviceName?.toLowerCase().includes(serviceNameLower) ||
              fbService?.name.toLowerCase().includes(serviceNameLower) ||
              fbService?.description?.toLowerCase().includes(serviceNameLower) ||
              isSameCategoryPackage
            );
          });

          if (hasFutureBooking) return;

          // 2. Verificar se existe algum agendamento COMPLETADO mais recente que "cubra" este serviço
          const hasNewerCoveringBooking = bookings.some(newerB => {
            if (newerB.customerId !== customer.id || newerB.status !== 'completed' || !newerB.dateTime) return false;
            const newerDate = new Date(newerB.dateTime);
            const currentDate = new Date(b.dateTime);
            
            if (newerDate <= currentDate) return false;

            const newerService = services.find(s => s.id === newerB.serviceId);
            
            const isSameCategoryPackage = newerService && service && 
                                         newerService.category === service.category && 
                                         (newerService.name.toLowerCase().includes('pacote') || 
                                          newerService.name.toLowerCase().includes('tratamento') ||
                                          newerService.name.toLowerCase().includes('combo') ||
                                          newerService.name.toLowerCase().includes('completo'));

            return (
              newerB.serviceName?.toLowerCase().includes(serviceNameLower) ||
              newerService?.name.toLowerCase().includes(serviceNameLower) ||
              newerService?.description?.toLowerCase().includes(serviceNameLower) ||
              isSameCategoryPackage
            );
          });

          if (hasNewerCoveringBooking) return;

          const lastDate = new Date(b.dateTime);
          const nextDate = new Date(lastDate);
          nextDate.setDate(lastDate.getDate() + service.returnPeriodDays);
          
          if (isNaN(nextDate.getTime())) return;

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
        const remainingAmount = t.amount - (t.paidAmount || 0);
        return { ...t, diffDays, remainingAmount };
      })
      .filter(t => t.remainingAmount > 0)
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
    const today = new Date();

    const lastBookings: Record<string, Booking> = {};
    const futureBookings = bookings.filter(b => 
      b.customerId === selectedCustomerId && 
      (b.status === 'scheduled' || b.status === 'pending') &&
      b.dateTime && new Date(b.dateTime) >= today
    );

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

      const serviceNameLower = service.name.toLowerCase();

      // 1. Verificar se existe algum agendamento FUTURO que já cubra este serviço
      const hasFutureBooking = futureBookings.some(fb => {
        const fbService = services.find(s => s.id === fb.serviceId);
        const isSameCategoryPackage = fbService && service && 
                                     fbService.category === service.category && 
                                     (fbService.name.toLowerCase().includes('pacote') || 
                                      fbService.name.toLowerCase().includes('tratamento') ||
                                      fbService.name.toLowerCase().includes('combo') ||
                                      fbService.name.toLowerCase().includes('completo'));

        return (
          fb.serviceName?.toLowerCase().includes(serviceNameLower) ||
          fbService?.name.toLowerCase().includes(serviceNameLower) ||
          fbService?.description?.toLowerCase().includes(serviceNameLower) ||
          isSameCategoryPackage
        );
      });

      if (hasFutureBooking) return null;

      // 2. Verificar se existe algum agendamento COMPLETADO mais recente que "cubra" este serviço
      const hasNewerCoveringBooking = bookings.some(newerB => {
        if (newerB.customerId !== selectedCustomerId || newerB.status !== 'completed' || !newerB.dateTime) return false;
        const newerDate = new Date(newerB.dateTime);
        const currentDate = new Date(b.dateTime);
        
        if (newerDate <= currentDate) return false;

        const newerService = services.find(s => s.id === newerB.serviceId);
        
        const isSameCategoryPackage = newerService && service && 
                                     newerService.category === service.category && 
                                     (newerService.name.toLowerCase().includes('pacote') || 
                                      newerService.name.toLowerCase().includes('tratamento') ||
                                      newerService.name.toLowerCase().includes('combo') ||
                                      newerService.name.toLowerCase().includes('completo'));

        return (
          newerB.serviceName?.toLowerCase().includes(serviceNameLower) ||
          newerService?.name.toLowerCase().includes(serviceNameLower) ||
          newerService?.description?.toLowerCase().includes(serviceNameLower) ||
          isSameCategoryPackage
        );
      });

      if (hasNewerCoveringBooking) return null;

      const lastDate = new Date(b.dateTime);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + service.returnPeriodDays);
      
      if (isNaN(nextDate.getTime())) return null;

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
        : "Redes Sociais (visual, impactante, focado em engajamento)";

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

      const text = result.text?.trim();
      if (text) {
        setGeneratedMessage(text);
        // Aguarda a atualização do estado e gera a imagem
        await generateImage(text);
      } else {
        throw new Error("A IA não retornou nenhum texto.");
      }
    } catch (error) {
      console.error("Erro ao gerar aviso com IA:", error);
      alert("Erro ao gerar aviso. Verifique sua conexão ou tente novamente mais tarde.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAIBgImage = async () => {
    if (!noticePrompt && activeTab === 'notices') return alert("Descreva o assunto para gerar a imagem.");
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Crie uma imagem de fundo profissional, elegante e minimalista para um salão de estética. 
        O assunto é: ${noticePrompt || reminderType}. 
        Estilo: Luxuoso, tons de ${noticeColor}, sem rostos humanos, apenas elementos abstratos, flores, ou spa. 
        A imagem deve ser limpa para que o texto seja legível.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: [{ text: prompt }] },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setNoticeBgImage(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Erro ao gerar imagem com IA:", error);
      alert("Erro ao gerar imagem. Tente novamente.");
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
        context = `Lembrete de pagamento pendente para o procedimento "${description}" no valor de R$ ${data.remainingAmount.toFixed(2)}. O vencimento foi em ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'data não informada'}.`;
      } else if (type === 'promotion') {
        context = `Convite para aproveitar a promoção "${data.title}": ${data.content}.`;
      } else if (type === 'renewal') {
        context = `Lembrete de que está na hora de renovar o procedimento "${data.service.name}" para manter os resultados. A última sessão foi há algum tempo.`;
      }

      const prompt = `Crie uma mensagem curta e carinhosa para enviar via WhatsApp para a cliente ${selectedCustomer.name.split(' ')[0]}.
      O salão se chama "${settings.name}".
      
      CONTEXTO: ${context}
      
      REGRAS:
      1. Seja gentil e profissional.
      2. Use emojis delicados.
      3. O texto deve caber em uma imagem quadrada de 500x500px, então seja conciso (máximo 120 caracteres).
      4. Retorne APENAS o texto da mensagem.`;

      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = result.text;
      if (text) {
        await generateImage(text);
      }
    } catch (error) {
      console.error("Erro ao gerar lembrete com IA:", error);
      // Fallback para mensagem padrão se a IA falhar
      let fallbackMsg = "";
      if (type === 'billing') fallbackMsg = `Olá! ✨ Passando para lembrar sobre o acerto de ${data.serviceName || data.description} (R$ ${data.remainingAmount.toFixed(2)}).`;
      else if (type === 'promotion') fallbackMsg = `Promoção: ${data.title}! ✨`;
      else fallbackMsg = `Olá! ✨ Hora de renovar seu procedimento de ${data.service.name}. Vamos agendar? 🌸`;
      
      await generateImage(fallbackMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImage = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setIsGenerating(true);
      setGeneratedMessage(message);
      setGeneratedImageUrl(null);
      
      // Pequeno delay para garantir que o DOM atualizou com a nova mensagem
      setTimeout(async () => {
        if (cardRef.current) {
          try {
            let dataUrl;
            try {
              dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                width: 1080,
                height: 1920,
                filter: (node: any) => {
                  if (node.tagName === 'LINK' && node.rel === 'stylesheet' && !node.href.includes(window.location.origin)) {
                    return false;
                  }
                  return true;
                },
                style: {
                  transform: 'scale(2.7)',
                  transformOrigin: 'top left'
                }
              });
            } catch (firstErr) {
              console.warn('Tentativa inicial de gerar imagem falhou (provavelmente erro de CORS nas fontes). Tentando sem embutir fontes...', firstErr);
              // Segunda tentativa: desabilita o processamento de fontes externas que causa o erro de 'cssRules'
              dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                width: 1080,
                height: 1920,
                fontEmbedCSS: '', // Pula a busca por fontes em stylesheets externos
                style: {
                  transform: 'scale(2.7)',
                  transformOrigin: 'top left'
                }
              });
            }
            setGeneratedImageUrl(dataUrl);
          } catch (err) {
            console.error('Erro ao gerar imagem em todas as tentativas:', err);
            alert("Erro ao capturar imagem. Você ainda pode copiar o texto.");
          }
        }
        setIsGenerating(false);
        resolve();
      }, 500);
    });
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

  const handleMouseDown = (e: React.MouseEvent, element: 'logo' | 'text') => {
    setDraggingElement(element);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (draggingElement === 'logo') {
      setNoticeLogoPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      setNoticeTextPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
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
                      <option value="social">Redes Sociais</option>
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
                        max="900" 
                        step="10"
                        value={noticeLogoSize}
                        onChange={(e) => setNoticeLogoSize(Number(e.target.value))}
                        className="flex-1 accent-tea-900"
                      />
                      <span className="text-[10px] font-bold text-tea-900 w-8">{noticeLogoSize}px</span>
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

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Posição do Logo</label>
                    <button onClick={() => setNoticeLogoPos({ x: 0, y: 0 })} className="text-[8px] font-bold text-tea-600 uppercase tracking-widest hover:underline">Resetar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-gray-400">X</span>
                      <input type="range" min="-200" max="200" value={noticeLogoPos.x} onChange={e => setNoticeLogoPos(p => ({ ...p, x: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-gray-400">Y</span>
                      <input type="range" min="-300" max="300" value={noticeLogoPos.y} onChange={e => setNoticeLogoPos(p => ({ ...p, y: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Posição do Texto</label>
                    <button onClick={() => setNoticeTextPos({ x: 0, y: 0 })} className="text-[8px] font-bold text-tea-600 uppercase tracking-widest hover:underline">Resetar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-gray-400">X</span>
                      <input type="range" min="-200" max="200" value={noticeTextPos.x} onChange={e => setNoticeTextPos(p => ({ ...p, x: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-gray-400">Y</span>
                      <input type="range" min="-300" max="300" value={noticeTextPos.y} onChange={e => setNoticeTextPos(p => ({ ...p, y: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                    </div>
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
                    onClick={generateAIBgImage}
                    disabled={isGenerating}
                    className="py-4 bg-tea-100 text-tea-900 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-md hover:bg-tea-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {noticeBgImage ? 'Atualizar Fundo' : 'Gerar Fundo (IA)'}
                  </button>
                  <button 
                    onClick={() => generateImage(generatedMessage)}
                    disabled={isGenerating || !generatedMessage}
                    className="py-4 bg-tea-100 text-tea-900 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-md hover:bg-tea-200 disabled:opacity-50"
                  >
                    Capturar Imagem 📸
                  </button>
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
            
            <div className="flex justify-center select-none">
              <div 
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-[400px] h-[711px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center justify-between p-12 text-center relative border-[10px] cursor-default"
                style={{ 
                  backgroundColor: noticeColor, 
                  borderColor: 'rgba(0,0,0,0.1)',
                  backgroundImage: noticeBgImage ? `url(${noticeBgImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
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
                
                <div className="w-full flex flex-col items-center mt-16 space-y-12 z-10">
                  {settings.logo ? (
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, 'logo')}
                      className={`flex justify-center transition-transform duration-75 cursor-move ${draggingElement === 'logo' ? 'scale-105' : ''}`} 
                      style={{ transform: `translate(${noticeLogoPos.x}px, ${noticeLogoPos.y}px)` }}
                    >
                      <img 
                        src={settings.logo} 
                        alt="Logo" 
                        className="max-w-none object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.4)] pointer-events-none" 
                        style={{ width: `${noticeLogoSize}px` }}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  ) : (
                    <h1 
                      onMouseDown={(e) => handleMouseDown(e, 'logo')}
                      className={`font-serif italic font-bold text-white drop-shadow-md transition-transform duration-75 cursor-move ${draggingElement === 'logo' ? 'scale-105' : ''}`} 
                      style={{ color: noticeFontColor, fontSize: `${noticeFontSize * 1.5}px`, transform: `translate(${noticeLogoPos.x}px, ${noticeLogoPos.y}px)` }}
                    >
                      {settings.name}
                    </h1>
                  )}

                  <div className="w-32 h-1.5 bg-white/30 rounded-full pointer-events-none" />

                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'text')}
                    className={`space-y-8 max-w-[360px] transition-transform duration-75 cursor-move ${draggingElement === 'text' ? 'scale-105' : ''}`} 
                    style={{ transform: `translate(${noticeTextPos.x}px, ${noticeTextPos.y}px)` }}
                  >
                    <p className={`leading-tight drop-shadow-sm ${noticeFontFamily} pointer-events-none`} style={{ color: noticeFontColor, fontSize: `${noticeFontSize}px` }}>
                      {generatedMessage || "Sua mensagem gerada por IA aparecerá aqui..."}
                    </p>
                  </div>
                </div>

                <div className="w-full pb-16 z-10">
                  <div className="w-16 h-1 bg-white/20 mx-auto mb-6 rounded-full" />
                  <div className="flex flex-col items-center space-y-2">
                    {settings.socialLinks?.whatsapp && (
                      <div className="text-[11px] font-bold tracking-wider flex items-center gap-2" style={{ color: noticeFontColor + 'cc' }}>
                        <span>📱</span> {settings.socialLinks.whatsapp}
                      </div>
                    )}
                    {settings.usefulLinks?.[0]?.url && (
                      <div className="text-[10px] font-bold tracking-widest flex items-center gap-2" style={{ color: noticeFontColor + '99' }}>
                        <span>🌐</span> {settings.usefulLinks[0].url.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Brilhos extras */}
                <div className="absolute top-20 right-16 opacity-20 text-4xl animate-pulse">✨</div>
                <div className="absolute bottom-32 left-16 opacity-20 text-4xl animate-pulse" style={{ animationDelay: '1s' }}>✨</div>
              </div>
            </div>
            
            {isGenerating && (
              <div className="text-center py-4 text-xs text-tea-600 font-bold animate-pulse">
                A IA está criando algo especial para você...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA DE LEMBRETES (A NOVA SUBSEÇÃO) */}
      {activeTab === 'reminders' && (
        <div className="space-y-8">
          {!selectedCustomerId ? (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
                <h3 className="text-xl font-serif text-tea-950 font-bold italic mb-6 text-center">Selecione uma Cliente para Lembretes</h3>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou WhatsApp..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100 focus:bg-white transition-all"
                  />
                  {isSearchFocused && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      {filteredCustomers.map(c => (
                        <button 
                          key={c.id}
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="w-full p-4 text-left hover:bg-tea-50 flex items-center gap-4 transition-colors"
                        >
                          <div className="w-10 h-10 bg-tea-100 rounded-xl flex items-center justify-center font-bold text-tea-900">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-tea-950 text-sm">{c.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{c.whatsapp}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* TOP 10 COBRANÇAS GERAL */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <h4 className="font-serif italic font-bold text-tea-950 text-lg">Próximas 10 Cobranças (Geral)</h4>
                  <div className="space-y-3">
                    {globalPendingTransactions.length > 0 ? globalPendingTransactions.map(t => {
                      const customer = customers.find(c => c.id === t.customerId);
                      return (
                        <div 
                          key={t.id} 
                          onClick={() => {
                            setSelectedCustomerId(t.customerId!);
                            setReminderType('billing');
                            handleSelectBilling(t);
                          }}
                          className="p-4 rounded-2xl border-2 border-gray-50 hover:border-tea-100 transition-all cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <p className="text-xs font-bold text-tea-950">{customer?.name || 'Cliente'}</p>
                            <p className="text-[10px] text-gray-500">
                              {t.serviceName ? `${t.serviceName}${t.installmentNumber ? ` (${t.installmentNumber}/${t.installmentsCount})` : ''}` : t.description}
                            </p>
                            <p className="text-[8px] text-gray-400 uppercase tracking-widest">
                              Vencimento: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                            </p>
                            <p className={`text-[8px] font-bold uppercase tracking-widest ${t.diffDays < 0 ? 'text-red-500' : 'text-tea-600'}`}>
                              {t.diffDays < 0 ? `Vencido há ${Math.abs(t.diffDays)} dias` : t.diffDays === 0 ? 'Vence hoje' : `Vence em ${t.diffDays} dias`}
                            </p>
                          </div>
                          <span className="text-xs font-serif font-bold">R$ {t.remainingAmount.toFixed(2)}</span>
                        </div>
                      );
                    }) : <p className="text-center py-6 text-gray-400 italic text-xs">Nenhuma cobrança pendente encontrada.</p>}
                  </div>
                </div>

                {/* TOP 10 RENOVAÇÕES GERAL */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <h4 className="font-serif italic font-bold text-tea-950 text-lg">Próximas 10 Renovações (Geral)</h4>
                  <div className="space-y-3">
                    {globalRenewalCandidates.length > 0 ? globalRenewalCandidates.map((item: any) => (
                      <div 
                        key={item.booking.id} 
                        onClick={() => {
                          setSelectedCustomerId(item.customerId);
                          setReminderType('renewal');
                          handleSelectRenewal(item);
                        }}
                        className="p-4 rounded-2xl border-2 border-gray-50 hover:border-tea-100 transition-all cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="text-xs font-bold text-tea-950">{item.customerName}</p>
                          <p className="text-[10px] text-gray-500">{item.service.name}</p>
                          <p className="text-[8px] text-gray-400 uppercase tracking-widest">Retorno Ideal: {item.nextDate ? item.nextDate.toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-tea-600 uppercase tracking-widest">{item.diffDays <= 0 ? 'Vencido' : `Em ${item.diffDays} dias`}</span>
                      </div>
                    )) : <p className="text-center py-6 text-gray-400 italic text-xs">Nenhuma renovação pendente encontrada.</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 text-center relative overflow-hidden">
                  <div className="w-20 h-20 bg-tea-900 text-white rounded-[2rem] flex items-center justify-center text-3xl font-serif italic mx-auto mb-4 shadow-xl">
                    {selectedCustomer?.name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-serif text-tea-950 font-bold italic">{selectedCustomer?.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedCustomer?.whatsapp}</p>
                  <button onClick={resetSelection} className="mt-6 text-[10px] font-bold text-tea-600 uppercase tracking-widest hover:underline">Trocar Cliente</button>
                </div>

                {/* VISUALIZAÇÃO DO CARD (IMAGEM) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Prévia da Imagem</h4>
                  
                  {/* O CARD QUE SERÁ CONVERTIDO EM IMAGEM */}
                  <div className="flex justify-center select-none">
                    <div 
                      ref={cardRef}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className="w-[400px] h-[711px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center justify-between p-10 text-center relative border-[10px] cursor-default"
                      style={{ 
                        backgroundColor: noticeColor, 
                        borderColor: 'rgba(0,0,0,0.1)',
                        backgroundImage: noticeBgImage ? `url(${noticeBgImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {/* Decoração de Fundo */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] select-none">
                        <div className="absolute top-10 left-10 text-7xl rotate-12">✂️</div>
                        <div className="absolute top-40 right-[-10px] text-8xl -rotate-12">🧴</div>
                        <div className="absolute bottom-40 right-10 text-7xl -rotate-45">💅</div>
                        <div className="absolute bottom-10 left-10 text-8xl rotate-12">💄</div>
                      </div>

                      {/* Bordas */}
                      <div className="absolute top-0 left-0 w-full h-3 bg-black/10" />
                      <div className="absolute bottom-0 left-0 w-full h-3 bg-black/10" />
                      
                      {/* Conteúdo */}
                      <div className="w-full flex flex-col items-center mt-14 space-y-8 z-10">
                        {settings.logo ? (
                          <div 
                            onMouseDown={(e) => handleMouseDown(e, 'logo')}
                            className={`flex justify-center transition-transform duration-75 cursor-move ${draggingElement === 'logo' ? 'scale-105' : ''}`} 
                            style={{ transform: `translate(${noticeLogoPos.x}px, ${noticeLogoPos.y}px)` }}
                          >
                            <img 
                              src={settings.logo} 
                              alt="Logo" 
                              className="object-contain drop-shadow-2xl pointer-events-none" 
                              style={{ width: `${noticeLogoSize}px` }}
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        ) : (
                          <h1 
                            onMouseDown={(e) => handleMouseDown(e, 'logo')}
                            className={`text-5xl font-serif italic font-bold text-white transition-transform duration-75 cursor-move ${draggingElement === 'logo' ? 'scale-105' : ''}`} 
                            style={{ color: noticeFontColor, transform: `translate(${noticeLogoPos.x}px, ${noticeLogoPos.y}px)` }}
                          >
                            {settings.name}
                          </h1>
                        )}

                        <div className="w-24 h-1 bg-white/30 rounded-full pointer-events-none" />

                        <div 
                          onMouseDown={(e) => handleMouseDown(e, 'text')}
                          className={`space-y-6 max-w-[340px] transition-transform duration-75 cursor-move ${draggingElement === 'text' ? 'scale-105' : ''}`} 
                          style={{ transform: `translate(${noticeTextPos.x}px, ${noticeTextPos.y}px)` }}
                        >
                          <h2 className={`text-2xl font-bold ${noticeFontFamily} pointer-events-none`} style={{ color: noticeFontColor }}>Olá, {selectedCustomer?.name?.split(' ')[0] || 'Cliente'}!</h2>
                          <p className={`text-xl leading-snug ${noticeFontFamily} pointer-events-none`} style={{ color: noticeFontColor }}>
                            {generatedMessage || "Selecione uma ação para gerar seu lembrete personalizado."}
                          </p>
                        </div>
                      </div>

                      <div className="w-full pb-8 z-10">
                        <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: noticeFontColor + '80' }}>
                          {settings.name}
                        </div>
                      </div>

                      <div className="absolute top-10 right-10 opacity-10 text-3xl">✨</div>
                      <div className="absolute bottom-12 left-10 opacity-10 text-3xl">🌸</div>
                    </div>
                  </div>

                  {generatedImageUrl && (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={generateAIBgImage}
                        disabled={isGenerating}
                        className="py-4 bg-tea-100 text-tea-900 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-md hover:bg-tea-200 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {noticeBgImage ? 'Atualizar Fundo' : 'Gerar Fundo (IA)'}
                      </button>
                      <button 
                        onClick={() => generateImage(generatedMessage)}
                        disabled={isGenerating || !generatedMessage}
                        className="py-4 bg-tea-100 text-tea-900 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-md hover:bg-tea-200 disabled:opacity-50"
                      >
                        Capturar Imagem 📸
                      </button>
                      <button 
                        onClick={downloadImage}
                        className="py-4 bg-tea-950 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-lg"
                      >
                        Baixar Imagem 📥
                      </button>
                      <button 
                        onClick={sendWhatsApp}
                        className="py-4 bg-green-500 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all shadow-lg"
                      >
                        WhatsApp 📱
                      </button>
                    </div>
                  )}
                  {isGenerating && (
                    <div className="text-center py-4 text-xs text-tea-600 font-bold animate-pulse">Gerando imagem personalizada...</div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif italic font-bold text-tea-950">Personalização da Imagem</h4>
                    <button 
                      onClick={() => {
                        setNoticeLogoPos({ x: 0, y: 0 });
                        setNoticeTextPos({ x: 0, y: 0 });
                        setNoticeLogoSize(420);
                        setNoticeFontSize(36);
                        setNoticeColor('#1e3d28');
                        setNoticeFontColor('#ffffff');
                      }}
                      className="text-[8px] font-bold text-tea-600 uppercase tracking-widest hover:underline"
                    >
                      Resetar Tudo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Posição do Logo</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400">X</span>
                          <input type="range" min="-200" max="200" value={noticeLogoPos.x} onChange={e => setNoticeLogoPos(p => ({ ...p, x: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400">Y</span>
                          <input type="range" min="-300" max="300" value={noticeLogoPos.y} onChange={e => setNoticeLogoPos(p => ({ ...p, y: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Posição do Texto</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400">X</span>
                          <input type="range" min="-200" max="200" value={noticeTextPos.x} onChange={e => setNoticeTextPos(p => ({ ...p, x: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400">Y</span>
                          <input type="range" min="-300" max="300" value={noticeTextPos.y} onChange={e => setNoticeTextPos(p => ({ ...p, y: Number(e.target.value) }))} className="flex-1 accent-tea-900" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Logo</label>
                          <input type="range" min="100" max="900" step="10" value={noticeLogoSize} onChange={(e) => setNoticeLogoSize(Number(e.target.value))} className="w-full accent-tea-900" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Texto</label>
                          <input type="range" min="12" max="80" step="2" value={noticeFontSize} onChange={(e) => setNoticeFontSize(Number(e.target.value))} className="w-full accent-tea-900" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Fundo</label>
                          <input type="color" value={noticeColor} onChange={(e) => setNoticeColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Letra</label>
                          <input type="color" value={noticeFontColor} onChange={(e) => setNoticeFontColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                  <div className="flex gap-2 mb-8">
                    <button 
                      onClick={() => setReminderType('billing')}
                      className={`flex-1 py-3 rounded-2xl font-bold uppercase text-[9px] tracking-widest transition-all ${reminderType === 'billing' ? 'bg-tea-900 text-white' : 'bg-gray-50 text-gray-400'}`}
                    >
                      Cobrança 💰
                    </button>
                    <button 
                      onClick={() => setReminderType('promotion')}
                      className={`flex-1 py-3 rounded-2xl font-bold uppercase text-[9px] tracking-widest transition-all ${reminderType === 'promotion' ? 'bg-tea-900 text-white' : 'bg-gray-50 text-gray-400'}`}
                    >
                      Promoção 🏷️
                    </button>
                    <button 
                      onClick={() => setReminderType('renewal')}
                      className={`flex-1 py-3 rounded-2xl font-bold uppercase text-[9px] tracking-widest transition-all ${reminderType === 'renewal' ? 'bg-tea-900 text-white' : 'bg-gray-50 text-gray-400'}`}
                    >
                      Renovação 🔄
                    </button>
                  </div>

                  {reminderType === 'billing' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-serif italic font-bold text-tea-950">Próximas 10 Cobranças</h4>
                      </div>
                      <div className="space-y-3">
                        {pendingTransactions.length > 0 ? pendingTransactions.map(t => (
                          <div key={t.id} onClick={() => handleSelectBilling(t)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedTransactionId === t.id ? 'border-tea-900 bg-tea-50' : 'border-gray-50 hover:border-tea-100'}`}>
                            <div>
                              <p className="text-xs font-bold text-tea-950">
                                {t.serviceName ? `${t.serviceName}${t.installmentNumber ? ` (${t.installmentNumber}/${t.installmentsCount})` : ''}` : t.description}
                              </p>
                              <p className="text-[8px] text-gray-400 uppercase tracking-widest">Vencimento: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</p>
                              <p className={`text-[8px] font-bold uppercase tracking-widest ${t.diffDays < 0 ? 'text-red-500' : 'text-tea-600'}`}>
                                {t.diffDays < 0 ? `Vencido há ${Math.abs(t.diffDays)} dias` : t.diffDays === 0 ? 'Vence hoje' : `Vence em ${t.diffDays} dias`}
                              </p>
                            </div>
                            <span className="text-xs font-serif font-bold">R$ {t.remainingAmount.toFixed(2)}</span>
                          </div>
                        )) : <p className="text-center py-6 text-gray-400 italic text-xs">Nenhuma cobrança pendente encontrada.</p>}
                      </div>
                    </div>
                  )}

                  {reminderType === 'promotion' && (
                    <div className="space-y-6">
                      <h4 className="font-serif italic font-bold text-tea-950">Promoções Ativas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activePromotions.map(p => (
                          <div key={p.id} onClick={() => handleSelectPromotion(p)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedPromotionId === p.id ? 'border-tea-900 bg-tea-50' : 'border-gray-50 hover:border-tea-100'}`}>
                            <h5 className="text-xs font-bold text-tea-950">{p.title}</h5>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{p.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reminderType === 'renewal' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-serif italic font-bold text-tea-950">Próximas 10 Renovações</h4>
                      </div>
                      <div className="space-y-3">
                        {renewalCandidates.length > 0 ? renewalCandidates.map((item: any) => (
                          <div key={item.booking.id} onClick={() => handleSelectRenewal(item)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedBookingId === item.booking.id ? 'border-tea-900 bg-tea-50' : 'border-gray-50 hover:border-tea-100'}`}>
                            <div>
                              <p className="text-xs font-bold text-tea-950">{item.service.name}</p>
                              <p className="text-[8px] text-gray-400 uppercase tracking-widest">Retorno Ideal: {item.nextDate ? item.nextDate.toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <span className="text-[10px] font-bold text-tea-600 uppercase tracking-widest">{item.diffDays <= 0 ? 'Vencido' : `Em ${item.diffDays} dias`}</span>
                          </div>
                        )) : <p className="text-center py-6 text-gray-400 italic text-xs">Nenhuma renovação pendente encontrada.</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
