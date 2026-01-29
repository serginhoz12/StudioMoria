
import React, { useState } from 'react';

interface CustomerLoginViewProps {
  onLogin: (identifier: string, pass: string) => void;
  onRegisterClick: () => void;
  onBack: () => void;
}

const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({ onLogin, onRegisterClick, onBack }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (identifier && password) {
      try {
        onLogin(identifier, password);
      } catch (err: any) {
        setError(err.message || "Dados de acesso incorretos.");
      }
    } else {
      setError("Por favor, preencha seus dados e a senha.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-tea-50 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-tea-50 text-tea-900 rounded-3xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner">👤</div>
          <h2 className="text-3xl font-serif text-tea-900 mb-2 font-bold italic">Acesse seu Perfil</h2>
          <p className="text-gray-500 font-light text-sm italic">Consulte seus horários e extrato Moriá.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Nome, WhatsApp ou CPF</label>
            <input 
              type="text" 
              placeholder="Ex: Maria Santos ou (13) 99999-0000"
              className={`w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 outline-none transition-all text-gray-800 ${error ? 'border-red-200 bg-red-50' : 'border-transparent focus:border-tea-200 focus:bg-white'}`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Sua Senha</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className={`w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 outline-none transition-all text-gray-800 ${error ? 'border-red-200 bg-red-50' : 'border-transparent focus:border-tea-200 focus:bg-white'}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-shake">
              <p className="text-xs text-red-600 font-bold text-center uppercase tracking-tight leading-relaxed">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-tea-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-tea-100 mt-4 uppercase tracking-widest text-[11px]"
          >
            Entrar no Perfil
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400 mb-4">Ainda não possui acesso?</p>
          <button 
            onClick={onRegisterClick}
            className="text-tea-700 font-bold hover:underline uppercase text-[10px] tracking-widest"
          >
            Criar minha conta agora
          </button>
        </div>

        <button 
          onClick={onBack}
          className="mt-6 w-full text-[9px] text-gray-300 font-bold hover:text-gray-500 transition-colors uppercase tracking-widest"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default CustomerLoginView;
