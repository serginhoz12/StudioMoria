
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface AdminLoginProps {
  onLogin: (password: string) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Senha atualizada conforme solicitação: 460206
    if (password === '460206') {
      onLogin(password);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user is the admin email
      if (user.email === 'Serginhoz12@gmail.com') {
        onLogin('google-auth');
      } else {
        alert("Este e-mail não tem permissão de administrador.");
        await auth.signOut();
      }
    } catch (err) {
      console.error("Erro no login Google:", err);
      alert("Erro ao realizar login com Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 border border-tea-50 text-center animate-slide-up">
        <div className="mb-8 inline-block p-4 rounded-3xl bg-tea-50">
          <svg className="w-10 h-10 text-tea-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        
        <h2 className="text-3xl font-serif text-tea-900 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 mb-10 font-light">Área exclusiva para funcionários do Studio Moriá.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          <div className="relative">
            <input 
              type="password" 
              placeholder="Digite sua senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 transition-all outline-none text-center text-lg tracking-widest ${error ? 'border-red-300 bg-red-50' : 'border-transparent focus:border-tea-200 focus:bg-white'}`}
            />
            {error && <p className="text-red-500 text-xs font-bold mt-2 animate-bounce">Senha incorreta</p>}
          </div>
          
          <button 
            type="submit"
            className="w-full bg-tea-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-tea-700 transition-all shadow-lg shadow-tea-100"
          >
            Entrar no Painel
          </button>
        </form>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-gray-200 w-full"></div>
          <span className="bg-white px-4 text-gray-400 text-sm">OU</span>
          <div className="border-t border-gray-200 w-full"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          {isLoggingIn ? "Entrando..." : "Entrar com Google"}
        </button>
        
        <button 
          onClick={onBack}
          className="mt-8 text-tea-500 font-bold text-sm hover:underline"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
