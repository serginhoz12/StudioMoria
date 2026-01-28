
import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import TermsModal from './TermsModal';

interface CustomerRegisterProps {
  onRegister: (name: string, whatsapp: string, cpf: string, password: string, receivesNotifications: boolean) => void;
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
  
  const [modalConfig, setModalConfig] = useState<{ open: boolean; title: string; type: 'terms' | 'privacy' }>({
    open: false,
    title: '',
    type: 'terms'
  });

  // Verificação de CPF Duplicado (Apenas se o CPF for preenchido)
  const isDuplicateCpf = useMemo(() => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length < 1) return false;
    return customers.some(c => c.cpf && c.cpf.replace(/\D/g, '') === cleanCpf);
  }, [cpf, customers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateCpf) {
      alert("Este CPF já possui um cadastro no Studio Moriá.");
      return;
    }
    // CPF agora é opcional, mas nome, whatsapp, senha e termos são obrigatórios
    if (name && whatsapp && password && agreedToTerms) {
      onRegister(name, whatsapp, cpf, password, receivesNotifications);
    } else {
      if (!agreedToTerms) {
        alert("Para sua segurança, é necessário aceitar os termos de uso.");
      } else {
        alert("Por favor, preencha todos os campos obrigatórios (Nome, WhatsApp e Senha).");
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
            disabled={isDuplicateCpf || !agreedToTerms}
            className={`w-full py-6 rounded-[2rem] font-bold text-xl shadow-2xl transition-all duration-500 ${!isDuplicateCpf && agreedToTerms ? 'bg-tea-800 text-white hover:bg-tea-900 shadow-tea-200 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'}`}
          >
            {isDuplicateCpf ? 'CPF já em uso' : 'Concluir Cadastro'}
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
