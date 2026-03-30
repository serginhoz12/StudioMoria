
import React, { useState, useMemo } from 'react';
import { SalonSettings, Service, Customer, Booking, Promotion, InventoryItem, ProductInterest, ProductOrder } from '../types.ts';

interface CustomerHomeProps {
  settings: SalonSettings;
  services: Service[];
  bookings: Booking[];
  promotions: Promotion[];
  inventory: InventoryItem[];
  onBook: (serviceId: string, dateTime: string, teamMemberId?: string) => void;
  onAuthClick: () => void;
  onLoginSuccess: () => void;
  onQuickRegister: (name: string, whatsapp: string, bookingId?: string, serviceId?: string, isWaitlist?: boolean) => Promise<{ password: string | null; isNew: boolean }>;
  onAddToWaitlist: (serviceId: string) => void;
  onPlaceOrder: (order: Omit<ProductOrder, 'id'>) => Promise<void>;
  onAddInterest: (interest: Omit<ProductInterest, 'id'>) => Promise<void>;
  currentUser: Customer | null;
}

const CustomerHome: React.FC<CustomerHomeProps> = ({ 
  settings, 
  services, 
  bookings, 
  promotions, 
  inventory,
  onAuthClick, 
  onLoginSuccess, 
  onQuickRegister, 
  onAddToWaitlist, 
  onPlaceOrder,
  onAddInterest,
  currentUser 
}) => {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', message: '' });
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<Service | null>(null);
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [isWaitlistMode, setIsWaitlistMode] = useState(false);
  const [quickData, setQuickData] = useState({ name: '', whatsapp: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Booking | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'store'>('services');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [interestData, setInterestData] = useState({ name: '', whatsapp: '' });
  const [isPackageSession, setIsPackageSession] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ 
    paymentMethod: 'pix' as any, 
    deliveryOption: 'pickup' as any,
    address: ''
  });

  const availableSlots = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Get all active bookings (pending, scheduled, completed)
    const activeBookings = bookings.filter(b => 
      ['pending', 'scheduled', 'completed'].includes(b.status) && 
      b.dateTime >= today
    );

    // 2. Identify slots that are open AND not occupied by another booking
    const openSlots = bookings.filter(slot => {
      if (slot.status !== 'open' || slot.dateTime < today) return false;
      
      const slotStart = new Date(slot.dateTime.replace(' ', 'T')).getTime();
      const slotEnd = slotStart + 30 * 60 * 1000; // Assume open slots are 30 min intervals

      // Check if any active booking overlaps with this slot (GLOBALLY for customers)
      const isOccupied = activeBookings.some(b => {
        const bStart = new Date(b.dateTime.replace(' ', 'T')).getTime();
        const bEnd = bStart + (b.duration || 30) * 60 * 1000;
        return slotStart < bEnd && slotEnd > bStart;
      });

      return !isOccupied;
    });

    // 3. Filter to unique times (if multiple pros are free, show only one slot)
    const uniqueTimeSlots: Booking[] = [];
    const seenTimes = new Set<string>();
    
    const sortedOpenSlots = [...openSlots].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    
    for (const slot of sortedOpenSlots) {
      if (!seenTimes.has(slot.dateTime)) {
        uniqueTimeSlots.push(slot);
        seenTimes.add(slot.dateTime);
      }
    }

    // 4. If a service is selected, ensure the entire duration fits without hitting closing time or overlapping other bookings
    if (selectedServiceDetail) {
      const serviceDurationMs = selectedServiceDetail.duration * 60 * 1000;
      
      return uniqueTimeSlots.filter(slot => {
        const slotStart = new Date(slot.dateTime.replace(' ', 'T')).getTime();
        const slotEnd = slotStart + serviceDurationMs;

        // Check for overlaps with other bookings (GLOBALLY)
        const hasOverlap = activeBookings.some(b => {
          const bStart = new Date(b.dateTime.replace(' ', 'T')).getTime();
          const bEnd = bStart + (b.duration || 30) * 60 * 1000;
          return slotStart < bEnd && slotEnd > bStart;
        });
        if (hasOverlap) return false;

        // Check if the service exceeds business hours
        const [date] = slot.dateTime.split(' ');
        const pro = settings.teamMembers.find(m => m.id === slot.teamMemberId);
        const closingTimeStr = pro?.businessHours?.end || settings.businessHours.end;
        const closingTime = new Date(`${date}T${closingTimeStr}`).getTime();
        const maxEndTime = closingTime + (120 * 60 * 1000); // + 2 hours
        if (slotEnd > maxEndTime) return false;

        return true;
      }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    }

    return uniqueTimeSlots.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [bookings, selectedServiceDetail, settings.businessHours.end]);

  const availableDays = useMemo(() => {
    const days = new Set<string>();
    availableSlots.forEach(slot => {
      const day = slot.dateTime.split(' ')[0];
      days.add(day);
    });
    return Array.from(days).sort();
  }, [availableSlots]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return availableSlots.filter(slot => slot.dateTime.startsWith(selectedDay));
  }, [availableSlots, selectedDay]);
  
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const regularServices = useMemo(() => services.filter(s => s.isVisible), [services]);

  const isEligibleForCustomerPrice = useMemo(() => {
    if (!currentUser) return false;
    return bookings.some(b => 
      b.customerId === currentUser.id && 
      b.status === 'completed' && 
      (b.paymentReceived || b.originalPrice || 0) > 50
    );
  }, [currentUser, bookings]);

  const storeProducts = useMemo(() => {
    return inventory.filter(item => {
      // Don't show if it's for salon use only
      if (item.isSalonUseOnly) return false;
      // Don't show if it's not marked to show on site
      if (!item.showOnSite) return false;
      return true;
    });
  }, [inventory]);

  const getProductPrice = (item: InventoryItem) => {
    // Customer price only if logged in AND eligible (spent > 50 in a single procedure)
    if (isEligibleForCustomerPrice && item.customerPrice) return item.customerPrice;
    
    // Otherwise use visitor price
    if (item.visitorPrice) return item.visitorPrice;
    
    // Fallback to markup calculation
    if (item.purchasePrice && settings.visitorMarkupPercent) {
      return item.purchasePrice * (1 + settings.visitorMarkupPercent / 100);
    }
    return item.purchasePrice || 0;
  };

  const handleContactSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const message = `Olá Moriá! Me chamo ${formData.name || 'uma cliente'} e gostaria de saber mais sobre o Studio.`;
    window.open(`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const closeServiceModal = () => {
    setSelectedServiceDetail(null);
    setSelectedSlot(null);
    setSelectedDay(null);
  };

  return (
    <div className="animate-fade-in bg-white text-gray-900">
      {/* Botão Flutuante WhatsApp */}
      <button 
        onClick={() => handleContactSubmit()}
        className="fixed bottom-8 right-8 z-[100] bg-tea-600 text-white p-4 rounded-full shadow-2xl hover:bg-tea-700 hover:scale-110 transition-all group"
      >
        <span className="text-2xl">📱</span>
        <span className="absolute right-full mr-4 bg-tea-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Fale com a Moriá</span>
      </button>

      {/* Banner de Inauguração */}
      {settings.announcementBanner?.enabled && (
        <div className="bg-orange-500 text-white py-3 px-4 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] animate-pulse flex items-center justify-center gap-3">
            <span>✨</span>
            {settings.announcementBanner.text}
            <span>✨</span>
          </p>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-start bg-tea-900 overflow-hidden px-4 rounded-b-[4rem] md:rounded-b-[10rem]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-tea-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center pt-10 md:pt-16 text-center">
          <div className="mb-8 md:mb-14 flex justify-center w-full">
            <img 
              src={settings.logo} 
              className="w-full max-w-[320px] sm:max-w-[500px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1100px] h-auto drop-shadow-2xl object-contain" 
              alt="Logo Studio Moriá" 
            />
          </div>
          
          <div className="w-full max-w-md mx-auto space-y-6 px-6">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all ${activeTab === 'services' ? 'bg-white text-tea-900 shadow-xl' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                >
                  Procedimentos
                </button>
                {(settings.isStorePublic !== false || currentUser) && (
                  <button 
                    onClick={() => setActiveTab('store')}
                    className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all ${activeTab === 'store' ? 'bg-white text-tea-900 shadow-xl' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                  >
                    Loja Moriá
                  </button>
                )}
              </div>
              
              {activeTab === 'services' ? (
                <>
                  <button onClick={() => scrollToId('procedimentos')} className="w-full bg-white text-tea-900 py-5 rounded-3xl font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-tea-50 transition-all transform active:scale-95">Ver Nossos Serviços</button>
                  <button onClick={() => scrollToId('contato')} className="w-full bg-tea-800 text-white border border-white/10 py-5 rounded-3xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-tea-950 transition-all shadow-xl">Fale com a Moriá</button>
                </>
              ) : (
                <>
                  <button onClick={() => scrollToId('loja')} className="w-full bg-white text-tea-900 py-5 rounded-3xl font-bold shadow-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-tea-50 transition-all transform active:scale-95">Ver Produtos</button>
                  <button onClick={() => scrollToId('contato')} className="w-full bg-tea-800 text-white border border-white/10 py-5 rounded-3xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-tea-950 transition-all shadow-xl">Dúvidas sobre Produtos</button>
                </>
              )}
              <button onClick={onAuthClick} className="w-full bg-transparent text-white/40 py-2 font-bold uppercase tracking-[0.2em] text-[9px] hover:text-white transition-all">Acessar Minha Conta</button>
            </div>
            
            <div className="pt-6 animate-slide-up">
              <div className="inline-flex items-center gap-3 text-white/90 font-medium px-8 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                <span className="text-xl">📍</span>
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] leading-relaxed max-w-md">
                  {settings.address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo Geral ou Loja */}
      {activeTab === 'services' ? (
        <section id="procedimentos" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center mb-16">
            <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em] mb-3">Estética Studio Moriá</p>
            <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">{settings.servicesSectionTitle}</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {regularServices.map(service => (
              <div 
                key={service.id} 
                onClick={() => setSelectedServiceDetail(service)}
                className="group bg-white p-10 rounded-[4rem] border border-gray-100 hover:border-tea-100 transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)] flex flex-col h-full relative cursor-pointer"
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-serif font-bold text-tea-950 mb-3 group-hover:text-tea-800 transition-colors">{service.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 italic">
                    {service.description}
                  </p>
                  <span className="text-[9px] text-tea-600 font-bold uppercase tracking-widest mt-4 block">Toque para ver detalhes</span>
                </div>
                <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                  <div className="text-left">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor do Cuidado</p>
                    <p className="text-lg font-serif font-bold text-tea-900 italic">A partir de R$ {service.price.toFixed(0)}</p>
                  </div>
                  <div className="w-12 h-12 bg-tea-50 text-tea-900 rounded-2xl flex items-center justify-center text-xl group-hover:bg-tea-900 group-hover:text-white transition-all shadow-sm">✨</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (settings.isStorePublic !== false || currentUser) ? (
        <section id="loja" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center mb-16">
            <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em] mb-3">Mini Loja Studio Moriá</p>
            <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Nossos Produtos</h2>
            <p className="text-gray-400 mt-4 italic text-sm">Cuidados profissionais para você levar para casa.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {storeProducts.map(product => {
              const price = getProductPrice(product);
              const canBuy = product.quantity >= 2;
              
              return (
                <div 
                  key={product.id} 
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowProductDetailModal(true);
                  }}
                  className="group bg-white rounded-[4rem] border border-gray-100 hover:border-tea-100 transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)] flex flex-col h-full relative overflow-hidden cursor-pointer"
                >
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-tea-200 text-6xl">🛍️</div>
                    )}
                    {product.exclusiveForCustomers && (
                      <div className="absolute top-6 left-6 bg-tea-900 text-white px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-lg">Exclusivo Cliente</div>
                    )}
                    {!canBuy && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                        <p className="text-tea-900 font-bold text-xs uppercase tracking-widest">Estoque Limitado</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-10 flex flex-col flex-grow">
                    <div className="mb-6">
                      <h3 className="text-2xl font-serif font-bold text-tea-950 mb-2">{product.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 italic mb-2">
                        {product.description || 'Sem descrição disponível.'}
                      </p>
                      <span className="text-[9px] text-tea-600 font-bold uppercase tracking-widest mb-4 block">Toque para ver detalhes</span>
                      <div className="text-2xl font-serif font-bold text-tea-800 italic">
                        R$ {price.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-gray-50">
                      {canBuy ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setShowCheckoutModal(true);
                          }}
                          className="w-full bg-tea-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg"
                        >
                          Comprar Agora
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setShowInterestModal(true);
                          }}
                          className="w-full bg-white text-tea-900 border-2 border-tea-900 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-tea-50 transition-all"
                        >
                          Tenho Interesse
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Dicas e Avisos */}
      {promotions.filter(p => p.type === 'tip' && p.isActive).length > 0 && (
        <section id="dicas" className="bg-tea-50/50 py-24 md:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em] mb-3">Cuidados & Bem-estar</p>
              <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Dicas da Moriá</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {promotions.filter(p => p.type === 'tip' && p.isActive).map(tip => (
                <div key={tip.id} className="bg-white p-8 md:p-12 rounded-[3rem] border border-tea-100 shadow-sm hover:shadow-xl transition-all flex flex-col gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-tea-900 text-white rounded-xl flex items-center justify-center text-xl">✨</span>
                      <h3 className="text-2xl font-serif font-bold text-tea-950 italic">{tip.title}</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                      {tip.content}
                    </p>
                  </div>

                  {tip.videoUrl && (
                    <div className="aspect-video w-full rounded-3xl overflow-hidden bg-gray-100 shadow-inner">
                      {tip.videoUrl.includes('youtube.com') || tip.videoUrl.includes('youtu.be') ? (
                        <iframe 
                          src={tip.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                          width="100%" 
                          height="100%" 
                          style={{ border: 0 }} 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen 
                          title={tip.title}
                        ></iframe>
                      ) : (
                        <video src={tip.videoUrl} controls className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  {tip.linkedServiceId && (
                    <div className="mt-auto pt-6 border-t border-gray-50">
                      <button 
                        onClick={() => {
                          const service = services.find(s => s.id === tip.linkedServiceId);
                          if (service) setSelectedServiceDetail(service);
                        }}
                        className="text-tea-700 font-bold text-[10px] uppercase tracking-widest hover:underline flex items-center gap-2"
                      >
                        Ver Procedimento Relacionado →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Localização */}
      <section id="localizacao" className="bg-gray-50 py-24 md:py-32 px-6 rounded-[5rem] md:rounded-[10rem] mx-4 md:mx-12 my-12 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 md:gap-24 items-center">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <p className="text-tea-600 font-bold text-[10px] uppercase tracking-[0.5em]">Onde Nos Encontrar</p>
              <h2 className="text-4xl md:text-5xl font-serif text-tea-950 italic">Localização</h2>
              <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                {settings.address}
              </p>
            </div>
            <a 
              href={settings.googleMapsLink} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-6 bg-tea-900 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-2xl"
            >
              <span>Abrir Mapa</span>
              <span className="text-2xl">🌍</span>
            </a>
          </div>
          <div className="flex-1 w-full bg-white p-5 rounded-[4rem] md:rounded-[6rem] shadow-3xl border border-gray-100 h-[350px] md:h-[500px]">
            <iframe 
              src="https://maps.google.com/maps?q=-23.9004600,-46.4425140&hl=pt&z=15&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '3rem' }} 
              allowFullScreen={true} 
              loading="lazy"
              title="Localização Studio Moriá"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-24 md:py-40 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-serif text-tea-950 italic">Fale com a Moriá</h2>
            <p className="text-gray-500 font-light text-lg md:text-xl">Estamos prontas para cuidar da sua melhor versão.</p>
          </div>
          
          <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto bg-white p-12 md:p-20 rounded-[4rem] md:rounded-[6rem] shadow-[0_50px_100px_rgba(0,0,0,0.06)] border border-tea-50 space-y-8 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-tea-900 rounded-3xl flex items-center justify-center text-3xl shadow-2xl">🌿</div>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Seu Nome" 
                required 
                className="w-full p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-tea-100 outline-none font-medium shadow-inner"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <textarea 
                placeholder="Como podemos te ajudar?" 
                required 
                className="w-full p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-tea-100 outline-none h-40 font-medium shadow-inner resize-none"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-tea-900 text-white py-6 rounded-3xl font-bold uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:bg-black transition-all"
            >
              Enviar via WhatsApp
            </button>
          </form>
        </div>
      </section>

      {/* Modal de Detalhes do Serviço (Descrição Completa) */}
      {selectedServiceDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-tea-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-3xl animate-slide-up flex flex-col border border-tea-50 max-h-[90vh]">
            <div className="p-10 md:p-14 overflow-y-auto custom-scroll space-y-8">
              <div className="flex justify-between items-start">
                 <div className="space-y-2">
                    <span className="bg-tea-50 text-tea-700 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block border border-tea-100">Procedimento Studio Moriá</span>
                    <h3 className="text-3xl md:text-4xl font-serif text-tea-950 font-bold italic leading-tight">{selectedServiceDetail.name}</h3>
                 </div>
                 <button onClick={closeServiceModal} className="p-4 hover:bg-tea-50 rounded-2xl transition-all text-gray-300 hover:text-tea-900">✕</button>
              </div>
              
              <div className="space-y-4">
                 <h4 className="text-[11px] font-bold text-tea-900 uppercase tracking-widest border-b border-gray-100 pb-2">Sobre este cuidado</h4>
                 <p className="text-gray-600 text-lg font-light leading-relaxed whitespace-pre-line">
                   {selectedServiceDetail.description}
                 </p>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <h4 className="text-[11px] font-bold text-tea-900 uppercase tracking-widest">
                    {selectedDay ? 'Selecione o Horário' : 'Selecione o Dia'}
                  </h4>
                  {selectedDay && (
                    <button 
                      onClick={() => setSelectedDay(null)}
                      className="text-[9px] font-bold text-tea-600 uppercase tracking-widest hover:underline"
                    >
                      ← Voltar aos Dias
                    </button>
                  )}
                </div>

                {availableDays.length > 0 ? (
                  <>
                    {!selectedDay ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {availableDays.map(day => (
                          <button 
                            key={day} 
                            onClick={() => setSelectedDay(day)}
                            className="p-4 bg-white border border-tea-100 text-tea-900 rounded-2xl font-bold text-[10px] shadow-sm hover:bg-tea-50 transition-all active:scale-95 flex flex-col items-center"
                          >
                            <span className="opacity-60 text-[8px] uppercase">
                              {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                            <span>{new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 animate-fade-in">
                        {slotsForSelectedDay.map(slot => (
                          <button 
                            key={slot.id} 
                            onClick={() => {
                              setSelectedSlot(slot);
                              setIsWaitlistMode(false);
                              setIsPackageSession(false);
                              setShowQuickAuth(true);
                            }}
                            className="p-4 bg-tea-900 text-white rounded-2xl font-bold text-[10px] shadow-lg hover:bg-black transition-all active:scale-95 flex flex-col items-center"
                          >
                            <span>{slot.dateTime.split(' ')[1]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 bg-tea-50 rounded-3xl text-center space-y-4">
                    <p className="text-xs text-tea-700 font-medium italic">Nenhum horário disponível no momento.</p>
                    <button 
                      onClick={() => {
                        setIsWaitlistMode(true);
                        if (currentUser) {
                          onAddToWaitlist(selectedServiceDetail.id);
                          closeServiceModal();
                        } else {
                          setShowQuickAuth(true);
                        }
                      }}
                      className="w-full py-4 bg-tea-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                    >
                      Entrar na Lista de Espera
                    </button>
                  </div>
                )}
                
                {availableDays.length > 0 && (
                   <div className="pt-4">
                      <p className="text-[9px] text-gray-400 text-center uppercase tracking-widest mb-4">Ou se preferir ser avisada de novos horários:</p>
                      <button 
                        onClick={() => {
                          setIsWaitlistMode(true);
                          if (currentUser) {
                            onAddToWaitlist(selectedServiceDetail.id);
                            closeServiceModal();
                          } else {
                            setShowQuickAuth(true);
                          }
                        }}
                        className="w-full py-4 bg-white text-tea-900 border border-tea-100 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-tea-50 transition-all"
                      >
                        Entrar na Lista de Espera
                      </button>
                   </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duração Média</p>
                    <p className="text-xl font-serif text-tea-900 font-bold italic">{selectedServiceDetail.duration} min</p>
                 </div>
                 <div className="p-6 bg-tea-50 rounded-3xl border border-tea-100">
                    <p className="text-[9px] font-bold text-tea-700 uppercase tracking-widest mb-1">Investimento</p>
                    <p className="text-xl font-serif text-tea-900 font-bold italic">A partir de R$ {selectedServiceDetail.price.toFixed(0)}</p>
                 </div>
                 <div className="p-6 bg-tea-900 rounded-3xl text-white flex items-center justify-center">
                    <p className="text-sm font-bold uppercase tracking-widest">Studio Moriá</p>
                 </div>
              </div>
            </div>
            
            <div className="p-10 bg-gray-50 border-t border-gray-100">
               <button 
                 onClick={closeServiceModal} 
                 className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest"
               >
                 Voltar para o Menu
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Rápido */}
      {showQuickAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-10 md:p-14 shadow-3xl animate-slide-up space-y-8 relative">
            <button onClick={() => setShowQuickAuth(false)} className="absolute top-8 right-8 text-gray-300 hover:text-tea-900 transition-colors">✕</button>
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-tea-50 text-tea-900 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                {isWaitlistMode ? '📝' : '💆‍♀️'}
              </div>
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic">
                {isWaitlistMode ? 'Lista de Espera' : 'Quase lá!'}
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                {isWaitlistMode 
                  ? 'Informe seus dados para ser avisada assim que surgir uma vaga.' 
                  : 'Informe seu nome e WhatsApp para confirmar seu agendamento.'}
              </p>
            </div>

            <div className="space-y-4">
              {!currentUser && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-4">Seu Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Maria Silva"
                      className="w-full p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-tea-100 outline-none font-bold shadow-inner"
                      value={quickData.name}
                      onChange={e => setQuickData({...quickData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-4">WhatsApp (com DDD)</label>
                    <input 
                      type="tel" 
                      placeholder="Ex: 13997724238"
                      className="w-full p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-tea-100 outline-none font-bold shadow-inner"
                      value={quickData.whatsapp}
                      onChange={e => setQuickData({...quickData, whatsapp: e.target.value})}
                    />
                  </div>
                </>
              )}

              {!isWaitlistMode && (
                <div 
                  className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-3 ${isPackageSession ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent'}`}
                  onClick={() => setIsPackageSession(!isPackageSession)}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isPackageSession ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200'}`}>
                    {isPackageSession && <span className="text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isPackageSession ? 'text-blue-700' : 'text-gray-500'}`}>
                      Sessão de Pacote
                    </p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">
                      Etapa de tratamento já contratado
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button 
              disabled={isProcessing || (!currentUser && (!quickData.name || !quickData.whatsapp))}
              onClick={async () => {
                setIsProcessing(true);
                try {
                  const result = await onQuickRegister(
                    currentUser?.name || quickData.name, 
                    currentUser?.whatsapp || quickData.whatsapp, 
                    selectedSlot?.id, 
                    selectedServiceDetail?.id,
                    isWaitlistMode,
                    isPackageSession
                  );
                  if (result.isNew && result.password) {
                    setGeneratedPassword(result.password);
                  } else {
                    if (isWaitlistMode) {
                      alert("Você foi adicionada à lista de espera com sucesso!");
                    } else {
                      alert("Bem-vinda de volta! Seu agendamento foi registrado.");
                    }
                    setShowQuickAuth(false);
                    closeServiceModal();
                    onLoginSuccess();
                  }
                } catch (e) {
                  alert("Erro ao processar seu acesso. Tente novamente.");
                } finally {
                  setIsProcessing(false);
                }
              }}
              className="w-full py-6 bg-tea-900 text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processando...' : (isWaitlistMode ? 'Entrar na Lista' : 'Confirmar Agendamento')}
            </button>
            
            <p className="text-[8px] text-gray-400 text-center uppercase tracking-widest font-bold">
              Ao continuar, você concorda com nossos termos de cuidado.
            </p>
          </div>
        </div>
      )}
      {/* Modal de Senha Gerada */}
      {generatedPassword && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-tea-950/95 backdrop-blur-2xl animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-10 md:p-14 shadow-3xl animate-slide-up space-y-8 text-center">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">🔐</div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic">Sua Senha de Acesso</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Guarde esta senha para acessar sua área exclusiva futuramente.</p>
            </div>

            <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-tea-200">
              <span className="text-4xl font-mono font-bold tracking-[0.5em] text-tea-900">{generatedPassword}</span>
            </div>

            <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
              <p className="text-[10px] text-orange-800 font-bold uppercase tracking-widest leading-relaxed">
                ⚠️ IMPORTANTE: Esta é uma senha temporária. Por segurança, recomendamos trocá-la no seu perfil assim que acessar a área do cliente.
              </p>
            </div>

            <button 
              onClick={() => {
                setGeneratedPassword(null);
                setShowQuickAuth(false);
                closeServiceModal();
                onLoginSuccess();
              }}
              className="w-full py-6 bg-tea-900 text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all"
            >
              Entendi, Acessar Minha Área
            </button>
          </div>
        </div>
      )}

      {/* Modal Tenho Interesse */}
      {showInterestModal && selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-10 md:p-14 shadow-3xl animate-slide-up space-y-8 relative">
            <button onClick={() => setShowInterestModal(false)} className="absolute top-8 right-8 text-gray-300 hover:text-tea-900 transition-colors">✕</button>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-tea-50 text-tea-900 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">🔔</div>
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic">Tenho Interesse</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Avise-me quando o produto "{selectedProduct.name}" estiver disponível!</p>
            </div>
            <div className="space-y-4">
              <input 
                placeholder="Seu Nome" 
                className="w-full p-6 bg-gray-50 rounded-3xl border-none outline-none font-bold shadow-inner"
                value={interestData.name}
                onChange={e => setInterestData({...interestData, name: e.target.value})}
              />
              <input 
                placeholder="Seu WhatsApp" 
                className="w-full p-6 bg-gray-50 rounded-3xl border-none outline-none font-bold shadow-inner"
                value={interestData.whatsapp}
                onChange={e => setInterestData({...interestData, whatsapp: e.target.value})}
              />
            </div>
            <button 
              onClick={async () => {
                if (!interestData.name || !interestData.whatsapp) return;
                setIsProcessing(true);
                await onAddInterest({
                  productId: selectedProduct.id,
                  productName: selectedProduct.name,
                  customerName: interestData.name,
                  customerWhatsapp: interestData.whatsapp,
                  createdAt: new Date().toISOString(),
                  status: 'pending'
                });
                setIsProcessing(false);
                setShowInterestModal(false);
                alert("Registramos seu interesse! Avisaremos você em breve.");
              }}
              className="w-full py-6 bg-tea-900 text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all"
            >
              {isProcessing ? 'Enviando...' : 'Me Avisar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Checkout */}
      {showCheckoutModal && selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-10 md:p-14 shadow-3xl animate-slide-up space-y-8 relative max-h-[90vh] overflow-y-auto custom-scroll">
            <button onClick={() => setShowCheckoutModal(false)} className="absolute top-8 right-8 text-gray-300 hover:text-tea-900 transition-colors">✕</button>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif text-tea-950 font-bold italic">Finalizar Compra</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedProduct.name}</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pix', label: 'Pix' },
                    { id: 'cash', label: 'Dinheiro' },
                    { id: 'debit', label: 'Débito' },
                    { id: 'credit', label: 'Crédito' }
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setCheckoutData({...checkoutData, paymentMethod: method.id as any})}
                      className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all ${checkoutData.paymentMethod === method.id ? 'bg-tea-900 border-tea-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-tea-100'}`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Opção de Entrega</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setCheckoutData({...checkoutData, deliveryOption: 'pickup'})}
                    className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all ${checkoutData.deliveryOption === 'pickup' ? 'bg-tea-900 border-tea-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-tea-100'}`}
                  >
                    Retirada no Local
                  </button>
                  <button 
                    onClick={() => setCheckoutData({...checkoutData, deliveryOption: 'delivery'})}
                    className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all ${checkoutData.deliveryOption === 'delivery' ? 'bg-tea-900 border-tea-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-tea-100'}`}
                  >
                    Entrega na Região
                  </button>
                </div>
              </div>

              {checkoutData.deliveryOption === 'delivery' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-[10px] font-bold text-tea-900 uppercase tracking-widest ml-2">Endereço de Entrega</label>
                  <textarea 
                    placeholder="Rua, número, bairro..."
                    className="w-full p-6 bg-gray-50 rounded-3xl border-none outline-none font-bold shadow-inner h-24 resize-none"
                    value={checkoutData.address}
                    onChange={e => setCheckoutData({...checkoutData, address: e.target.value})}
                  />
                  <p className="text-[9px] text-gray-400 italic">Combinaremos a taxa de entrega via WhatsApp.</p>
                </div>
              )}

              <div className="bg-tea-50 p-6 rounded-3xl border border-tea-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-tea-900 uppercase tracking-widest">Total</span>
                  <span className="text-xl font-serif font-bold text-tea-900 italic">R$ {getProductPrice(selectedProduct).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button 
              disabled={isProcessing || (checkoutData.deliveryOption === 'delivery' && !checkoutData.address)}
              onClick={async () => {
                if (!currentUser) {
                  setShowCheckoutModal(false);
                  onAuthClick();
                  return;
                }
                setIsProcessing(true);
                await onPlaceOrder({
                  customerId: currentUser.id,
                  customerName: currentUser.name,
                  customerWhatsapp: currentUser.whatsapp,
                  productId: selectedProduct.id,
                  productName: selectedProduct.name,
                  quantity: 1,
                  totalPrice: getProductPrice(selectedProduct),
                  paymentMethod: checkoutData.paymentMethod,
                  deliveryOption: checkoutData.deliveryOption,
                  deliveryAddress: checkoutData.address,
                  status: 'pending',
                  createdAt: new Date().toISOString()
                });
                setIsProcessing(false);
                setShowCheckoutModal(false);
                alert("Pedido realizado com sucesso! Entraremos em contato via WhatsApp.");
              }}
              className="w-full py-6 bg-tea-900 text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      )}
      {/* Modal de Detalhes do Produto */}
      {showProductDetailModal && selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-tea-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-3xl animate-slide-up flex flex-col border border-tea-50 max-h-[90vh]">
            <div className="relative aspect-square bg-gray-50">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-tea-200 text-8xl">🛍️</div>
              )}
              <button 
                onClick={() => setShowProductDetailModal(false)} 
                className="absolute top-6 right-6 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-tea-950 shadow-lg hover:bg-white transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="p-10 md:p-14 overflow-y-auto custom-scroll space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-3xl font-serif text-tea-950 font-bold italic leading-tight">{selectedProduct.name}</h3>
                  <div className="text-2xl font-serif font-bold text-tea-900 italic whitespace-nowrap">
                    R$ {getProductPrice(selectedProduct).toFixed(2)}
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h4 className="text-[10px] font-bold text-tea-900 uppercase tracking-widest">Descrição do Produto</h4>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {selectedProduct.description || 'Sem descrição disponível.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowProductDetailModal(false);
                  if (selectedProduct.quantity >= 2) setShowCheckoutModal(true);
                  else setShowInterestModal(true);
                }}
                className="w-full py-6 bg-tea-900 text-white rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl"
              >
                {selectedProduct.quantity >= 2 ? 'Comprar Agora' : 'Tenho Interesse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerHome;
