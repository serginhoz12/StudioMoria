
import React, { useState } from 'react';

interface CustomerLoginViewProps {
  onLogin: (id: string, pass: string) => void;
  onRegisterClick: () => void;
  onBack: () => void;
}

const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({ onLogin, onRegisterClick, onBack }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (loginId && password) {
      onLogin(loginId, password);
    } else {
      setError("Por favor, preencha seus dados de acesso.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-tea-50 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-tea-50 text-tea-900 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🌿</div>
          <h2 className="text-3xl font-serif text-tea-900 mb-2 italic">Bem-vinda de volta!</h2>
          <p className="text-gray-500 font-light text-sm italic">Acesse seu perfil do Studio Moriá usando seu CPF ou WhatsApp.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">CPF ou WhatsApp</label>
            <input 
              type="text" 
              placeholder="Digite seu CPF ou Celular"
              className={`w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 outline-none transition-all text-gray-800 ${error ? 'border-red-200 bg-red-50' : 'border-transparent focus:border-tea-200 focus:bg-white'}`}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
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
              <p className="text-xs text-red-600 font-bold text-center uppercase tracking-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-tea-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-tea-950 transition-all shadow-xl shadow-tea-100 mt-4 uppercase tracking-widest text-sm"
          >
            Entrar no Perfil
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-4">Ainda não é cadastrada?</p>
          <button 
            onClick={onRegisterClick}
            className="text-tea-600 font-bold hover:underline uppercase text-[10px] tracking-widest"
          >
            Criar minha conta agora
          </button>
        </div>

        <button 
          onClick={onBack}
          className="mt-6 w-full text-[10px] text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase tracking-widest"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default CustomerLoginView;
