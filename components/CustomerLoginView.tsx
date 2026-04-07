
import React, { useState } from 'react';
import { Customer } from '../types';

interface CustomerLoginViewProps {
  onLogin: (identifier: string, pass: string) => void;
  onRegisterClick: () => void;
  onBack: () => void;
  pendingUser?: Customer | null;
  onPasswordChange?: (newPass: string) => void;
}

const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({ onLogin, onRegisterClick, onBack, pendingUser, onPasswordChange }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier && password) {
      onLogin(identifier, password);
    } else {
      alert("Por favor, preencha CPF/WhatsApp e Senha.");
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
    if (newPassword !== confirmPassword) return alert("As senhas não coincidem.");
    if (onPasswordChange) onPasswordChange(newPassword);
  };

  if (pendingUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-tea-50 animate-slide-up">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif text-tea-900 mb-2">Alterar Senha</h2>
            <p className="text-gray-500 font-light text-sm italic">Olá {pendingUser.name}, por segurança, você precisa definir uma nova senha no seu primeiro acesso.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Nova Senha</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-tea-700 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-tea-200 focus:bg-white outline-none transition-all text-gray-800"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-[#23492d] text-white py-5 rounded-2xl font-bold text-lg hover:bg-tea-900 transition-all shadow-xl shadow-tea-100 mt-4"
            >
              Salvar e Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-tea-50 animate-slide-up">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif text-tea-900 mb-2">Bem-vinda de volta!</h2>
          <p className="text-gray-500 font-light text-sm italic">Acesse seu perfil e extrato do Studio Moriá.</p>
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
