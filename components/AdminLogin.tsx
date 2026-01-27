
import React, { useState } from 'react';
import { TeamMember } from '../types';

interface AdminLoginProps {
  teamMembers: TeamMember[];
  onLogin: (member: TeamMember) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ teamMembers, onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Debug: console.log("Tentando login com:", cleanUsername, cleanPassword);
    // Debug: console.log("Membros disponíveis:", teamMembers.map(m => m.username));

    const member = (teamMembers || []).find(m => 
      m && m.username && m.username.toLowerCase() === cleanUsername
    );
    
    if (member && member.password === cleanPassword) {
      onLogin(member);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl p-10 md:p-14 border border-tea-50 text-center animate-slide-up relative overflow-hidden">
        
        <div className="mb-10 inline-block p-5 rounded-[2rem] bg-tea-50 shadow-inner">
          <svg className="w-12 h-12 text-tea-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        
        <div className="mb-10">
          <h2 className="text-3xl font-serif text-tea-950 mb-2 font-bold italic tracking-tight">Painel Studio Moriá</h2>
          <p className="text-gray-400 font-light italic text-sm">Acesso restrito para Moriá e colaboradoras.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-tea-900 uppercase tracking-[0.2em] ml-2">Usuário</label>
            <input 
              type="text"
              placeholder="Ex: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent outline-none focus:border-tea-200 focus:bg-white transition-all font-bold text-tea-900 shadow-inner"
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-2 text-left relative">
            <label className="text-[10px] font-bold text-tea-900 uppercase tracking-[0.2em] ml-2">Senha de Acesso</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 transition-all outline-none font-bold text-lg tracking-widest ${error ? 'border-red-300 bg-red-50 text-red-900' : 'border-transparent focus:border-tea-200 focus:bg-white text-tea-950 shadow-inner'}`}
                required
                autoComplete="current-password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-tea-600 transition-colors p-2"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <div className="mt-3 bg-red-50 p-3 rounded-xl border border-red-100 animate-shake">
                <p className="text-red-600 text-[10px] font-bold uppercase tracking-wider text-center">Usuário ou senha incorretos. Tente novamente.</p>
              </div>
            )}
          </div>
          
          <button 
            type="submit"
            className="w-full bg-tea-900 text-white py-6 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-tea-900/10 active:scale-95 mt-4 uppercase tracking-[0.2em] text-[11px]"
          >
            Entrar no Painel
          </button>
        </form>
        
        <button 
          onClick={onBack}
          className="mt-10 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-tea-600 transition-colors"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
