
import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import TermsModal from './TermsModal';

interface CustomerRegisterProps {
  onRegister: (name: string, whatsapp: string, cpf: string, password: string, receivesNotifications: boolean, instagramData?: any) => void;
  onBack: () => void;
  customers: Customer[];
}

const CustomerRegister: React.FC<CustomerRegisterProps> = ({ onRegister, onBack, customers = [] }) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [receivesNotifications, setReceivesNotifications] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [instagramData, setInstagramData] = useState<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInstagramLoading, setIsInstagramLoading] = useState(false);

  // Listen for Instagram Auth Success
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INSTAGRAM_AUTH_SUCCESS') {
        const data = event.data.data;
        setInstagramData(data);
        setName(data.username || '');
        alert(`Conectado com Instagram: @${data.username}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleInstagramLogin = async () => {
    setIsInstagramLoading(true);
    try {
      const response = await fetch('/api/auth/instagram/url');
      if (!response.ok) throw new Error('Falha ao obter URL de autenticação');
      const { url } = await response.json();
      
      window.open(url, 'instagram_auth', 'width=600,height=700');
    } catch (error) {
      console.error('Erro ao conectar com Instagram:', error);
      alert('Não foi possível conectar com o Instagram. Tente novamente mais tarde.');
    } finally {
      setIsInstagramLoading(false);
    }
  };
  
  const [modalConfig, setModalConfig] = useState<{ open: boolean; title: string; type: 'terms' | 'privacy' }>({
    open: false,
    title: '',
    type: 'terms'
  });

  // Verificação de CPF Duplicado em Tempo Real
  const isDuplicateCpf = useMemo(() => {
    const cleanCpf = cpf.trim().replace(/\D/g, '');
    if (!cleanCpf || cleanCpf.length < 11) return false;
    return customers.some(c => c.cpf.replace(/\D/g, '') === cleanCpf);
  }, [cpf, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateCpf) {
      alert("Este CPF já possui um cadastro no Studio Moriá.");
      return;
    }
    if (name && whatsapp && password && agreedToTerms) {
      setIsSubmitting(true);
      try {
        await onRegister(name, whatsapp, cpf, password, receivesNotifications, instagramData);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!agreedToTerms) {
        alert("Para sua segurança, é necessário aceitar os termos de uso.");
      } else {
        alert("Por favor, preencha todos os campos.");
      }
    }
  };

  const openModal = (type: 'terms' | 'privacy') => {
    setModalConfig({
      open: true,
      type,
      title: type === 'terms' ? 'Termos de Uso' : 'Privacidade (LGPD)'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#F9FBFA]">
      <div className="max-w-xl w-full bg-white rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.05)] overflow-hidden p-12 border border-white">
        <button onClick={onBack} className="text-tea-600 text-sm font-bold flex items-center gap-3 mb-12 hover:-translate-x-1 transition-transform group">
          <svg className="w-5 h-5 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Voltar
        </button>
        
        <div className="mb-12">
          <h2 className="text-4xl font-serif text-tea-900 mb-4 italic">Sua Conta Moriá</h2>
          <p className="text-gray-500 font-light text-lg italic leading-relaxed">Cadastre-se para agendar seus procedimentos e acessar seu histórico de beleza.</p>
        </div>

        <div className="mb-12">
          <button
            type="button"
            onClick={handleInstagramLogin}
            disabled={isInstagramLoading || !!instagramData}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all ${instagramData ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90 shadow-lg shadow-orange-100'}`}
          >
            {isInstagramLoading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : instagramData ? (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.058-1.69-.072-4.949-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Conectado como @{instagramData.username}
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.058-1.69-.072-4.949-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Conectar com Instagram
              </>
            )}
          </button>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 h-[1px] bg-gray-100"></div>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">ou preencha manualmente</span>
            <div className="flex-1 h-[1px] bg-gray-100"></div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="relative group">
              <label className="block text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] mb-2 ml-2">Nome Completo</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-tea-200 outline-none transition-all placeholder-gray-300 shadow-inner"
                placeholder="Ex: Maria Santos"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <label className="block text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] mb-2 ml-2">WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-tea-200 outline-none transition-all placeholder-gray-300 shadow-inner"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="relative group">
                <label className="block text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] mb-2 ml-2">Seu CPF (Opcional)</label>
                <input 
                  type="text" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className={`w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 outline-none transition-all placeholder-gray-300 shadow-inner ${isDuplicateCpf ? 'border-red-300 bg-red-50' : 'border-transparent focus:bg-white focus:border-tea-200'}`}
                  placeholder="000.000.000-00"
                />
                {isDuplicateCpf && <p className="text-[10px] text-red-600 font-bold mt-2 ml-2 uppercase animate-pulse">CPF já cadastrado! Tente fazer login.</p>}
              </div>
            </div>

            <div className="relative group">
              <label className="block text-[11px] font-bold text-tea-700 uppercase tracking-[0.2em] mb-2 ml-2">Crie uma Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-tea-200 outline-none transition-all placeholder-gray-300 shadow-inner"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="p-8 bg-tea-50/50 rounded-[2.5rem] border border-tea-100 space-y-6">
            <label className="flex items-start gap-5 cursor-pointer group">
              <div className="relative mt-1">
                <input 
                  type="checkbox"
                  checked={receivesNotifications}
                  onChange={(e) => setReceivesNotifications(e.target.checked)}
                  className="peer appearance-none w-6 h-6 rounded-lg border-2 border-tea-200 checked:bg-tea-500 checked:border-tea-500 transition-all cursor-pointer shadow-sm"
                />
                <svg className="absolute top-1 left-1 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-tea-900 block mb-1">Receber lembretes via WhatsApp</span>
                <span className="text-xs text-tea-700/70 font-medium italic">Avisos de horários e promoções.</span>
              </div>
            </label>

            <label className="flex items-start gap-5 cursor-pointer group">
              <div className="relative mt-1">
                <input 
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="peer appearance-none w-6 h-6 rounded-lg border-2 border-tea-200 checked:bg-tea-500 checked:border-tea-500 transition-all cursor-pointer shadow-sm"
                />
                <svg className="absolute top-1 left-1 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <div className="flex-1">
                <span className="text-sm text-gray-700 leading-relaxed font-medium">
                  Aceito os <button type="button" onClick={() => openModal('terms')} className="text-tea-600 font-bold hover:underline">Termos</button> e a <button type="button" onClick={() => openModal('privacy')} className="text-tea-600 font-bold hover:underline">Política de Privacidade</button>.
                </span>
              </div>
            </label>
          </div>
          
          <button 
            type="submit"
            disabled={isDuplicateCpf || !agreedToTerms || isSubmitting}
            className={`w-full py-6 rounded-[2rem] font-bold text-xl shadow-2xl transition-all duration-500 ${!isDuplicateCpf && agreedToTerms && !isSubmitting ? 'bg-tea-800 text-white hover:bg-tea-900 shadow-tea-200 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'}`}
          >
            {isSubmitting ? 'Processando...' : (isDuplicateCpf ? 'CPF já em uso' : 'Concluir Cadastro')}
          </button>
        </form>
      </div>

      <TermsModal 
        isOpen={modalConfig.open} 
        onClose={() => setModalConfig({ ...modalConfig, open: false })}
        title={modalConfig.title}
        type={modalConfig.type}
      />
    </div>
  );
};

export default CustomerRegister;
