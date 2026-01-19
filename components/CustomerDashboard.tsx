
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
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
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
      {/* Header Estilizado */}
      <div className="bg-tea-900 text-white pt-10 pb-20 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        <div className="max-w-4xl mx-auto flex items-center gap-5 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl border-2 border-white/20 overflow-hidden bg-tea-800 flex items-center justify-center shadow-lg">
              {customer.profilePhoto ? (
                <img src={customer.profilePhoto} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                <span className="text-3xl font-serif">{customer.name.charAt(0)}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-lg shadow-md cursor-pointer">
              <svg className="w-3 h-3 text-tea-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
              <input type="file" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tea-300 mb-1">Área Exclusiva</p>
             <h1 className="text-2xl md:text-3xl font-serif font-bold italic leading-tight">Olá, {customer.name.split(' ')[0]}</h1>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 space-y-6">
         {/* Navegação Estilo Mobile App */}
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
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-tea-50 text-tea-800' : 'text-gray-400'}`}
              >
                 <span className="text-xl">{tab.icon}</span>
                 <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
         </div>

         {/* Conteúdo Início */}
         {activeTab === 'home' && (
           <div className="space-y-6 animate-slide-up">
              {nextBooking ? (
                <div className="bg-white p-6 rounded-[2.5rem] border border-tea-100 shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                      <span className="bg-tea-50 text-tea-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Próximo Agendamento</span>
                      <span className="text-xs text-gray-400">#{nextBooking.id.slice(0,4)}</span>
                   </div>
                   <h3 className="text-2xl font-serif font-bold text-tea-900 mb-2">{nextBooking.serviceName}</h3>
                   <div className="flex items-center gap-4 text-gray-500 text-sm mb-6">
                      <div className="flex items-center gap-1.5"><span>📅</span> {new Date(nextBooking.dateTime).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1.5"><span>⏰</span> {new Date(nextBooking.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <button className="py-3 bg-tea-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Ver Localização</button>
                      <button className="py-3 bg-gray-50 text-gray-400 rounded-xl text-xs font-bold uppercase tracking-widest">Remarcar</button>
                   </div>
                </div>
              ) : (
                <div className="bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
                   <p className="text-gray-400 italic mb-4">Você não tem agendamentos ativos.</p>
                   <button onClick={() => setActiveTab('agenda')} className="text-tea-700 font-bold text-sm underline">Agendar um procedimento</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Total Gasto</p>
                    <p className="text-xl font-bold text-tea-900 font-serif">R$ {myBookings.filter(b => b.status === 'completed').length * 80},00</p>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Visitas</p>
                    <p className="text-xl font-bold text-tea-900 font-serif">{myBookings.filter(b => b.status === 'completed').length}</p>
                 </div>
              </div>
           </div>
         )}

         {/* Conteúdo Agenda */}
         {activeTab === 'agenda' && (
           <div className="space-y-4 animate-slide-up">
              <h3 className="text-lg font-serif font-bold text-tea-950 px-2">Seu Histórico</h3>
              {myBookings.length > 0 ? myBookings.map(b => (
                <div key={b.id} className="bg-white p-5 rounded-3xl border border-gray-100 flex justify-between items-center hover:border-tea-200 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-tea-50 text-tea-600'}`}>
                        {b.status === 'completed' ? '✓' : '⌛'}
                      </div>
                      <div>
                        <p className="font-bold text-tea-900">{b.serviceName}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{new Date(b.dateTime).toLocaleDateString()} às {new Date(b.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                   </div>
                   <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded-full ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {b.status === 'completed' ? 'Concluído' : 'Pendente'}
                   </span>
                </div>
              )) : (
                <p className="text-center py-20 text-gray-300 italic">Sem histórico para exibir.</p>
              )}
           </div>
         )}

         {/* Conteúdo Cuidados (IA) */}
         {activeTab === 'cuidados' && (
           <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-tea-50 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-tea-800 text-white rounded-full flex items-center justify-center text-xl">✨</div>
                 <h3 className="text-xl font-serif font-bold text-tea-950">Dicas da Especialista</h3>
              </div>
              {isLoadingTips ? (
                <div className="py-10 text-center space-y-4">
                   <div className="w-6 h-6 border-2 border-tea-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                   <p className="text-xs text-tea-600 font-bold animate-pulse">Personalizando cuidados para você...</p>
                </div>
              ) : (
                <div className="prose prose-sm text-gray-600 italic font-light whitespace-pre-line leading-relaxed">
                   {careTips}
                </div>
              )}
              <div className="mt-8 p-4 bg-tea-50 rounded-2xl text-[10px] text-tea-700 font-medium text-center">
                Dicas geradas via Inteligência Artificial com base no seu último atendimento.
              </div>
           </div>
         )}

         {/* Conteúdo Perfil/Config */}
         {activeTab === 'perfil' && (
            <div className="space-y-4 animate-slide-up">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Nome Completo</label>
                    <p className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-800">{customer.name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">WhatsApp de Contato</label>
                    <p className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-800">{customer.whatsapp}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Documento (CPF)</label>
                    <p className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-800">{customer.cpf}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <button onClick={onLogout} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all">Sair da Conta</button>
                  </div>
               </div>
               
               <p className="text-center text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em]">Studio Moriá Estética © 2024</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
