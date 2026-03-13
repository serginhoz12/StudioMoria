
import React, { useState, useMemo, useRef } from 'react';
import { Customer, Promotion, Service, Booking, SalonSettings, Transaction } from '../types';
import { db } from '../firebase.ts';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { toPng } from 'html-to-image';

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
  const [activeTab, setActiveTab] = useState<'promotions' | 'tips' | 'loyalty' | 'reminders'>('promotions');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estados específicos para Lembretes
  const [reminderType, setReminderType] = useState<'billing' | 'promotion' | 'renewal' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showPromotionManager, setShowPromotionManager] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Filtro de clientes para seleção
  const filteredCustomers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return customers.filter(c => 
      !searchTerm || 
      c.name.toLowerCase().includes(search) || 
      c.whatsapp.includes(searchTerm)
    ).slice(0, 5);
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  // Estados de Filtro de Data para Lembretes
  const [startDateFilter, setStartDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [endDateFilter, setEndDateFilter] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // --- LÓGICA DE COBRANÇA ---
  const pendingTransactions = useMemo(() => {
    if (!selectedCustomerId) return [];
    const start = new Date(startDateFilter);
    const end = new Date(endDateFilter);
    end.setHours(23, 59, 59, 999);

    return transactions.filter(t => 
      t.customerId === selectedCustomerId && 
      t.type === 'receivable' && 
      t.status === 'pending' &&
      new Date(t.dueDate) >= start &&
      new Date(t.dueDate) <= end
    );
  }, [transactions, selectedCustomerId, startDateFilter, endDateFilter]);

  // --- LÓGICA DE PROMOÇÕES (PARA LEMBRETES) ---
  const activePromotions = useMemo(() => 
    promotions.filter(p => p.isActive && p.type === 'promotion'), 
    [promotions]
  );

  // --- LÓGICA DE RENOVAÇÃO ---
  const renewalCandidates = useMemo(() => {
    if (!selectedCustomerId) return [];
    const start = new Date(startDateFilter);
    const end = new Date(endDateFilter);
    end.setHours(23, 59, 59, 999);

    const lastBookings: Record<string, Booking> = {};
    bookings
      .filter(b => b.customerId === selectedCustomerId && b.status === 'completed')
      .forEach(b => {
        if (!lastBookings[b.serviceId] || new Date(b.dateTime) > new Date(lastBookings[b.serviceId].dateTime)) {
          lastBookings[b.serviceId] = b;
        }
      });

    return Object.values(lastBookings).map(b => {
      const service = services.find(s => s.id === b.serviceId);
      if (!service || !service.returnPeriodDays) return null;
      const lastDate = new Date(b.dateTime);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + service.returnPeriodDays);
      
      const today = new Date();
      const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return { booking: b, service, nextDate, diffDays };
    }).filter(item => {
      if (!item) return false;
      return item.nextDate >= start && item.nextDate <= end;
    });
  }, [bookings, selectedCustomerId, services, startDateFilter, endDateFilter]);

  const generateImage = async (message: string) => {
    setIsGenerating(true);
    setGeneratedMessage(message);
    setGeneratedImageUrl(null);
    
    // Pequeno delay para garantir que o DOM atualizou com a nova mensagem
    setTimeout(async () => {
      if (cardRef.current) {
        try {
          const dataUrl = await toPng(cardRef.current, {
            cacheBust: true,
            width: 500,
            height: 500,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left'
            }
          });
          setGeneratedImageUrl(dataUrl);
        } catch (err) {
          console.error('Erro ao gerar imagem:', err);
        }
      }
      setIsGenerating(false);
    }, 100);
  };

  const handleSelectBilling = (transaction: Transaction) => {
    const msg = `Lembrete de acerto: ${transaction.description}. Valor: R$ ${transaction.amount.toFixed(2)}.`;
    setSelectedTransactionId(transaction.id);
    generateImage(msg);
  };

  const handleSelectPromotion = (promotion: Promotion) => {
    const msg = `Promoção Especial: ${promotion.title}! ${promotion.content}`;
    setSelectedPromotionId(promotion.id);
    generateImage(msg);
  };

  const handleSelectRenewal = (item: any) => {
    const msg = `Hora de renovar seu procedimento de ${item.service.name}! Vamos agendar sua próxima sessão?`;
    setSelectedBookingId(item.booking.id);
    generateImage(msg);
  };

  const downloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `lembrete-${selectedCustomer?.name}.png`;
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

      {/* ABA DE LEMBRETES (A NOVA SUBSEÇÃO) */}
      {activeTab === 'reminders' && (
        <div className="space-y-8">
          {!selectedCustomerId ? (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
              <h3 className="text-xl font-serif text-tea-950 font-bold italic mb-6 text-center">Selecione uma Cliente para Lembretes</h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou WhatsApp..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-tea-100 focus:bg-white transition-all"
                />
                {filteredCustomers.length > 0 && (
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
                  <div className="flex justify-center">
                    <div 
                      ref={cardRef}
                      className="w-[300px] h-[300px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center justify-center p-8 text-center relative border-8 border-tea-50"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      {/* Decoração Simples */}
                      <div className="absolute top-0 left-0 w-full h-2 bg-tea-900" />
                      <div className="absolute bottom-0 left-0 w-full h-2 bg-tea-900" />
                      <div className="absolute top-4 right-4 opacity-10 text-4xl">✨</div>
                      <div className="absolute bottom-4 left-4 opacity-10 text-4xl">🌸</div>

                      {/* Logotipo */}
                      {settings.logo ? (
                        <img src={settings.logo} alt="Logo" className="h-12 object-contain mb-4" referrerPolicy="no-referrer" />
                      ) : (
                        <h1 className="text-2xl font-serif italic font-bold text-tea-950 mb-4">{settings.name}</h1>
                      )}

                      <div className="w-12 h-0.5 bg-tea-100 mb-6" />

                      <h2 className="text-lg font-serif italic text-tea-950 font-bold mb-2">Olá, {selectedCustomer?.name}!</h2>
                      <p className="text-sm text-gray-600 leading-relaxed italic">
                        {generatedMessage || "Selecione uma ação para gerar seu lembrete personalizado."}
                      </p>

                      <div className="mt-6 text-[8px] text-gray-300 uppercase tracking-[0.2em] font-bold">
                        {settings.name} • Estética & Bem-estar
                      </div>
                    </div>
                  </div>

                  {generatedImageUrl && (
                    <div className="grid grid-cols-2 gap-3">
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
                        <h4 className="font-serif italic font-bold text-tea-950">Débitos Pendentes</h4>
                        <div className="flex gap-2 items-center">
                          <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Início</label>
                            <input 
                              type="date" 
                              value={startDateFilter} 
                              onChange={(e) => setStartDateFilter(e.target.value)} 
                              className="p-2 bg-gray-50 rounded-xl text-[10px] font-bold outline-none"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                            <input 
                              type="date" 
                              value={endDateFilter} 
                              onChange={(e) => setEndDateFilter(e.target.value)} 
                              className="p-2 bg-gray-50 rounded-xl text-[10px] font-bold outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {pendingTransactions.length > 0 ? pendingTransactions.map(t => (
                          <div key={t.id} onClick={() => handleSelectBilling(t)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedTransactionId === t.id ? 'border-tea-900 bg-tea-50' : 'border-gray-50 hover:border-tea-100'}`}>
                            <div>
                              <p className="text-xs font-bold text-tea-950">{t.description}</p>
                              <p className="text-[8px] text-gray-400 uppercase tracking-widest">Vencimento: {new Date(t.dueDate).toLocaleDateString()}</p>
                            </div>
                            <span className="text-xs font-serif font-bold">R$ {t.amount.toFixed(2)}</span>
                          </div>
                        )) : <p className="text-center py-6 text-gray-400 italic text-xs">Nenhum débito pendente neste período.</p>}
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
                        <h4 className="font-serif italic font-bold text-tea-950">Procedimentos para Renovar</h4>
                        <div className="flex gap-2 items-center">
                          <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Início</label>
                            <input 
                              type="date" 
                              value={startDateFilter} 
                              onChange={(e) => setStartDateFilter(e.target.value)} 
                              className="p-2 bg-gray-50 rounded-xl text-[10px] font-bold outline-none"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                            <input 
                              type="date" 
                              value={endDateFilter} 
                              onChange={(e) => setEndDateFilter(e.target.value)} 
                              className="p-2 bg-gray-50 rounded-xl text-[10px] font-bold outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {renewalCandidates.length > 0 ? renewalCandidates.map((item: any) => (
                          <div key={item.booking.id} onClick={() => handleSelectRenewal(item)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedBookingId === item.booking.id ? 'border-tea-900 bg-tea-50' : 'border-gray-50 hover:border-tea-100'}`}>
                            <div>
                              <p className="text-xs font-bold text-tea-950">{item.service.name}</p>
                              <p className="text-[8px] text-gray-400 uppercase tracking-widest">Ideal: {item.nextDate.toLocaleDateString()}</p>
                            </div>
                            <span className="text-[10px] font-bold text-tea-600 uppercase tracking-widest">{item.diffDays <= 0 ? 'Vencido' : `Em ${item.diffDays} dias`}</span>
                          </div>
                        )) : <p className="text-center py-6 text-gray-400 italic text-xs">Nenhuma renovação pendente neste período.</p>}
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
