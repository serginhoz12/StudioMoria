
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50/30">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] p-10 md:p-14 border border-gray-50 animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif text-tea-900 mb-2 font-bold italic tracking-tight">Bem-vinda de volta!</h2>
          <p className="text-gray-400 font-light text-sm italic">Acesse seu perfil e extrato do Studio Moriá.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-tea-800 uppercase tracking-widest ml-1">CPF OU CELULAR</label>
            <input 
              type="text" 
              placeholder="Digite seu CPF ou Celular"
              className={`w-full px-8 py-5 rounded-[2rem] bg-gray-50/80 border-2 outline-none transition-all text-gray-800 placeholder-gray-300 ${error ? 'border-red-100 bg-red-50' : 'border-transparent focus:border-tea-100 focus:bg-white focus:shadow-sm'}`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-tea-800 uppercase tracking-widest ml-1">SUA SENHA</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className={`w-full px-8 py-5 rounded-[2rem] bg-gray-50/80 border-2 outline-none transition-all text-gray-800 placeholder-gray-300 ${error ? 'border-red-100 bg-red-50' : 'border-transparent focus:border-tea-100 focus:bg-white focus:shadow-sm'}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[10px] text-red-600 font-bold text-center uppercase tracking-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-tea-900 text-white py-6 rounded-[2rem] font-bold text-lg hover:bg-tea-950 transition-all shadow-xl shadow-tea-900/10 mt-4 tracking-wide"
          >
            Entrar no Perfil
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
          <button 
            onClick={onRegisterClick}
            className="text-tea-700 font-bold hover:underline uppercase text-[10px] tracking-widest"
          >
            Ainda não tenho cadastro
          </button>
        </div>

        <button 
          onClick={onBack}
          className="mt-6 w-full text-[9px] text-gray-300 font-bold hover:text-gray-400 transition-colors uppercase tracking-widest"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default CustomerLoginView;
