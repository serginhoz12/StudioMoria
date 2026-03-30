
import React, { useState } from 'react';

interface CustomerLoginViewProps {
  onLogin: (identifier: string, pass: string) => void;
  onRegisterClick: () => void;
  onBack: () => void;
}

const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({ onLogin, onRegisterClick, onBack }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [isInstagramLoading, setIsInstagramLoading] = useState(false);

  // Listen for Instagram Auth Success
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INSTAGRAM_AUTH_SUCCESS') {
        const data = event.data.data;
        // Search for customer with this instagramId
        onLogin(`INSTAGRAM:${data.id}`, 'instagram_auth');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier && password) {
      onLogin(identifier, password);
    } else {
      alert("Por favor, preencha CPF/WhatsApp e Senha.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-tea-50 animate-slide-up">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif text-tea-900 mb-2">Bem-vinda de volta!</h2>
          <p className="text-gray-500 font-light text-sm italic">Acesse seu perfil e extrato do Studio Moriá.</p>
        </div>

        <div className="mb-8">
          <button
            type="button"
            onClick={handleInstagramLogin}
            disabled={isInstagramLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90 shadow-lg shadow-orange-100 transition-all"
          >
            {isInstagramLoading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.058-1.69-.072-4.949-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Entrar com Instagram
              </>
            )}
          </button>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 h-[1px] bg-gray-100"></div>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">ou use sua senha</span>
            <div className="flex-1 h-[1px] bg-gray-100"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">WhatsApp / Celular</label>
            <input 
              type="text" 
              placeholder="(00) 00000-0000"
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800"
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
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[#23492d] text-white py-5 rounded-2xl font-bold text-lg hover:bg-tea-900 transition-all shadow-xl shadow-tea-100 mt-4"
          >
            Entrar no Perfil
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-4">Ainda não é cadastrada?</p>
          <button 
            onClick={onRegisterClick}
            className="text-tea-600 font-bold hover:underline"
          >
            Criar minha conta agora
          </button>
        </div>

        <button 
          onClick={onBack}
          className="mt-6 w-full text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default CustomerLoginView;
