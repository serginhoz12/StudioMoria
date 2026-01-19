
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Booking, Service } from '../types';
import { GoogleGenAI } from '@google/genai';

interface CustomerDashboardProps {
  customer: Customer;
  bookings: Booking[];
  services: Service[];
  onUpdateProfile: (updated: Partial<Customer>) => void;
  onLogout: () => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ customer, bookings, services, onUpdateProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'agenda' | 'cuidados' | 'perfil'>('home');
  const [careTips, setCareTips] = useState<string>('');
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  const myBookings = useMemo(() => 
    bookings.filter(b => b.customerId === customer.id)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    [bookings, customer.id]
  );

  const nextBooking = useMemo(() => 
    myBookings.find(b => b.status === 'scheduled' || b.status === 'pending'),
    [myBookings]
  );

  useEffect(() => {
    if (activeTab === 'cuidados' && !careTips) {
      generateCareTips();
    }
  }, [activeTab]);

  const generateCareTips = async () => {
    setIsLoadingTips(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const lastService = myBookings[0]?.serviceName || "Estética Geral";
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Como especialista em estética do Studio Moriá, forneça 4 dicas curtas e luxuosas de cuidados pós-procedimento para: ${lastService}. Use emojis e um tom de spa.`,
      });
      setCareTips(response.text || "Mantenha a hidratação e use filtro solar.");
    } catch (error) {
      setCareTips("Beba água e use protetor solar diariamente.");
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpdateProfile({ profilePhoto: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F8] animate-fade-in pb-32">
      {/* Header Estilizado - Otimizado para Mobile */}
      <div className="bg-tea-900 text-white pt-10 pb-24 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl border-2 border-white/20 overflow-hidden bg-tea-800 flex items-center justify-center shadow-lg">
                {customer.profilePhoto ? (
                  <img src={customer.profilePhoto} className="w-full h-full object-cover" alt="Perfil" />
                ) : (
                  <span className="text-3xl font-serif">{customer.name.charAt(0)}</span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-md cursor-pointer">
                <svg className="w-3 h-3 text-tea-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                <input type="file" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tea-300 mb-1">Área Exclusiva</p>
               <h1 className="text-xl font-serif font-bold italic leading-tight">Olá, {customer.name.split(' ')[0]}</h1>
            </div>
          </div>
          <button onClick={onLogout} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
             <span className="text-lg">🚪</span>
          </button>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-20 space-y-6">
         {/* Barra de Navegação Compacta Estilo App */}
         <div className="bg-white rounded-3xl shadow-xl p-2 flex justify-between border border-gray-50">
            {[
              { id: 'home', icon: '🏠', label: 'Início' },
              { id: 'agenda', icon: '🗓️', label: 'Agenda' },
              { id: 'cuidados', icon: '✨', label: 'Dicas' },
              { id: 'perfil', icon: '👤', label: 'Conta' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-tea-50 text-tea-800 scale-105' : 'text-gray-400'}`}
              >
                 <span className="text-xl">{tab.icon}</span>
                 <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
         </div>

         {/* Conteúdo Início - Cards organizados */}
         {activeTab === 'home' && (
           <div className="space-y-6 animate-slide-up">
              {nextBooking ? (
                <div className="bg-white rounded-[2.5rem] border border-tea-100 shadow-sm overflow-hidden">
                   <div className="bg-tea-50/50 px-6 py-3 flex justify-between items-center border-b border-tea-100/50">
                      <span className="text-tea-700 text-[9px] font-bold uppercase tracking-widest">Seu Próximo Atendimento</span>
                      <span className="text-[9px] font-bold text-tea-400 uppercase tracking-widest">#{nextBooking.id.slice(0,4)}</span>
                   </div>
                   <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <h3 className="text-2xl font-serif font-bold text-tea-900 leading-tight">{nextBooking.serviceName}</h3>
                            <p className="text-xs text-tea-600 font-bold uppercase tracking-tighter mt-1">Profissional: {nextBooking.teamMemberName || 'Moriá'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-2xl font-serif font-bold text-tea-900">{new Date(nextBooking.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(nextBooking.dateTime).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <button className="flex-1 py-4 bg-tea-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-tea-900 shadow-lg shadow-tea-100">Ver Localização</button>
                         <button className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-gray-100">Remarcar</button>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
                   <div className="text-4xl mb-4 grayscale opacity-30">💆‍♀️</div>
                   <p className="text-gray-400 italic text-sm mb-4">Que tal um momento para você hoje?</p>
                   <button onClick={() => setActiveTab('agenda')} className="bg-tea-800 text-white px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest">Ver Horários Disponíveis</button>
                </div>
              )}

              {/* Grid de Resumo Financeiro */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <div className="w-10 h-10 bg-tea-50 text-tea-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg">💰</div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Total Gasto</p>
                    <p className="text-xl font-bold text-tea-900 font-serif">R$ {myBookings.filter(b => b.status === 'completed').length * 80},00</p>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <div className="w-10 h-10 bg-tea-50 text-tea-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg">💅</div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Visitas</p>
                    <p className="text-xl font-bold text-tea-900 font-serif">{myBookings.filter(b => b.status === 'completed').length}</p>
                 </div>
              </div>
           </div>
         )}

         {/* Agenda - Visual de Timeline */}
         {activeTab === 'agenda' && (
           <div className="space-y-4 animate-slide-up">
              <h3 className="text-lg font-serif font-bold text-tea-950 px-2 flex items-center gap-2">
                 Seu Histórico <div className="h-px flex-1 bg-gray-100"></div>
              </h3>
              <div className="space-y-3">
                 {myBookings.length > 0 ? myBookings.map(b => (
                    <div key={b.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between hover:border-tea-200 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-tea-50 text-tea-600'}`}>
                            {b.status === 'completed' ? '✓' : '⌛'}
                          </div>
                          <div>
                            <p className="font-bold text-tea-900 text-sm leading-tight">{b.serviceName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(b.dateTime).toLocaleDateString()}</p>
                               <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                               <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(b.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                          </div>
                       </div>
                       <span className={`text-[8px] font-bold uppercase px-2.5 py-1 rounded-full border ${b.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                          {b.status === 'completed' ? 'Finalizado' : 'Pendente'}
                       </span>
                    </div>
                 )) : (
                    <div className="py-20 text-center">
                       <p className="text-gray-300 italic text-sm">Sua agenda está te esperando.</p>
                    </div>
                 )}
              </div>
           </div>
         )}

         {/* Conteúdo Cuidados (IA) - Visual Elegante */}
         {activeTab === 'cuidados' && (
           <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-tea-50 animate-slide-up relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-tea-50/50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex items-center gap-3 mb-8 relative z-10">
                 <div className="w-12 h-12 bg-tea-800 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">✨</div>
                 <div>
                    <h3 className="text-xl font-serif font-bold text-tea-950">Dicas Personalizadas</h3>
                    <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest">Protocolo Pós-Procedimento</p>
                 </div>
              </div>
              
              {isLoadingTips ? (
                <div className="py-12 text-center space-y-4">
                   <div className="w-8 h-8 border-3 border-tea-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                   <p className="text-[10px] text-tea-600 font-bold uppercase animate-pulse tracking-[0.2em]">Consultando especialista IA...</p>
                </div>
              ) : (
                <div className="relative z-10">
                   <div className="prose prose-sm text-gray-600 italic font-light whitespace-pre-line leading-relaxed text-sm bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                      {careTips}
                   </div>
                </div>
              )}
              
              <div className="mt-8 flex items-center gap-3 bg-tea-50/50 p-4 rounded-2xl border border-tea-100/50">
                 <span className="text-lg">💡</span>
                 <p className="text-[9px] text-tea-800 leading-tight font-medium uppercase tracking-tight">Estas dicas são geradas automaticamente para prolongar o efeito do seu último serviço no Studio.</p>
              </div>
           </div>
         )}

         {/* Perfil/Config - Organizado em Grupos */}
         {activeTab === 'perfil' && (
            <div className="space-y-4 animate-slide-up pb-10">
               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-5">
                  <div className="flex items-center gap-4 mb-2 pb-4 border-b border-gray-50">
                     <div className="w-12 h-12 bg-tea-950 text-white rounded-2xl flex items-center justify-center font-bold text-lg">{customer.name.charAt(0)}</div>
                     <div>
                        <p className="font-bold text-tea-900">{customer.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Cadastrada em {new Date().toLocaleDateString()}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                        <div className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 text-sm flex justify-between">
                           {customer.whatsapp}
                           <span className="text-[8px] bg-tea-100 text-tea-700 px-2 py-0.5 rounded-full">Verificado</span>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">CPF</label>
                        <div className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 text-sm">
                           {customer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4")}
                        </div>
                     </div>
                  </div>
                  
                  <div className="pt-4 flex flex-col gap-3">
                    <button className="w-full py-4 bg-tea-50 text-tea-800 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-tea-100 transition-all">Alterar Senha</button>
                    <button onClick={onLogout} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-red-100/50 transition-all">Encerrar Sessão</button>
                  </div>
               </div>
               
               <div className="flex flex-col items-center gap-2 opacity-30">
                  <img src="https://lh3.googleusercontent.com/d/15KFidcKVQniucz9tEtmgKWLLKttnrGgd" className="h-12 w-auto grayscale" alt="Logo" />
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.4em]">Desenvolvido com Amor © 2024</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
