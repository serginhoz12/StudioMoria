
import React, { useState, useEffect } from 'react';
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

  const myBookings = bookings.filter(b => b.customerId === customer.id);

  useEffect(() => {
    if (activeTab === 'cuidados' && !careTips) {
      generateCareTips();
    }
  }, [activeTab]);

  const generateCareTips = async () => {
    setIsLoadingTips(true);
    try {
      // Use the GoogleGenAI instance for content generation
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const lastService = myBookings[0]?.serviceName || "Estética Geral";
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Como especialista em estética do Studio Moriá, forneça 4 dicas curtas e luxuosas de cuidados para uma cliente que realizou ou deseja realizar: ${lastService}. Use um tom acolhedor e profissional. Retorne em formato de lista Markdown.`,
      });
      // Extracting text correctly using .text property (not a method)
      setCareTips(response.text || "Beba bastante água e use protetor solar diariamente para manter os resultados.");
    } catch (error) {
      console.error("AI Tips generation failed:", error);
      setCareTips("Mantenha sua pele hidratada e use sempre protetor solar. Consulte nossas profissionais para um cronograma personalizado.");
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProfile({ profilePhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] animate-fade-in pb-24">
      {/* Header Profile Summary */}
      <div className="bg-tea-900 text-white pt-12 pb-24 px-6 rounded-b-[4rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tea-800 rounded-full -mr-20 -mt-20 opacity-50"></div>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white/30 overflow-hidden bg-tea-800 flex items-center justify-center shadow-2xl">
              {customer.profilePhoto ? (
                <img src={customer.profilePhoto} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                <span className="text-5xl font-serif">{customer.name.charAt(0)}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-white p-2 rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-tea-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div className="text-center md:text-left">
             <h1 className="text-4xl font-serif font-bold mb-2">Olá, {customer.name.split(' ')[0]}!</h1>
             <p className="opacity-70 font-light tracking-wide">Seu Espaço VIP no Studio Moriá Estética</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20 space-y-8">
         <div className="bg-white rounded-[2rem] shadow-xl p-4 flex justify-around">
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-tea-50 text-tea-700' : 'text-gray-400'}`}>
               <span className="text-xl">🏠</span>
               <span className="text-[10px] font-bold uppercase tracking-widest">Início</span>
            </button>
            <button onClick={() => setActiveTab('agenda')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${activeTab === 'agenda' ? 'bg-tea-50 text-tea-700' : 'text-gray-400'}`}>
               <span className="text-xl">🗓️</span>
               <span className="text-[10px] font-bold uppercase tracking-widest">Agenda</span>
            </button>
            <button onClick={() => setActiveTab('cuidados')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${activeTab === 'cuidados' ? 'bg-tea-50 text-tea-700' : 'text-gray-400'}`}>
               <span className="text-xl">✨</span>
               <span className="text-[10px] font-bold uppercase tracking-widest">Dicas</span>
            </button>
            <button onClick={() => setActiveTab('perfil')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${activeTab === 'perfil' ? 'bg-tea-50 text-tea-700' : 'text-gray-400'}`}>
               <span className="text-xl">👤</span>
               <span className="text-[10px] font-bold uppercase tracking-widest">Perfil</span>
            </button>
         </div>

         {activeTab === 'cuidados' && (
           <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-tea-50 animate-slide-up">
              <h3 className="text-2xl font-serif text-tea-900 mb-6 flex items-center gap-3">
                 <span className="text-3xl">✨</span> Consultoria Digital Moriá
              </h3>
              {isLoadingTips ? (
                <div className="py-12 flex flex-col items-center gap-4">
                   <div className="w-8 h-8 border-4 border-tea-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-tea-600 font-bold animate-pulse italic">Gerando dicas personalizadas para você...</p>
                </div>
              ) : (
                <div className="prose prose-tea max-w-none text-gray-600 leading-relaxed font-light whitespace-pre-line">
                   {careTips}
                </div>
              )}
           </div>
         )}
         
         <div className="text-center pt-8">
            <button onClick={onLogout} className="text-xs font-bold text-red-300 hover:text-red-500 uppercase tracking-widest">Sair da minha conta</button>
         </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
