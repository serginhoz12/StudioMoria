
import React, { useState } from 'react';
import { View, Customer } from '../types';

interface NavbarProps {
  view: View;
  setView: (v: View) => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  salonName: string;
  logo: string;
  currentUser: Customer | null;
  onLogout: () => void;
  onAdminLogout: () => void;
  isAdminAuthenticated: boolean;
  pendingBookingsCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ 
  view, 
  setView, 
  isAdmin, 
  onToggleAdmin, 
  salonName, 
  logo, 
  currentUser, 
  onLogout, 
  onAdminLogout,
  isAdminAuthenticated,
  pendingBookingsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminTabs = [
    { id: View.ADMIN_DASHBOARD, label: 'Início', icon: '🏠' },
    { id: View.ADMIN_CONFIRMATIONS, label: 'Confirmações', icon: '🔔', badge: pendingBookingsCount },
    { id: View.ADMIN_CALENDAR, label: 'Agenda', icon: '📅' },
    { id: View.ADMIN_FINANCE, label: 'Finanças', icon: '💰' },
    { id: View.ADMIN_CLIENTS, label: 'Clientes', icon: '👤' },
    { id: View.ADMIN_VEO, label: 'IA Vídeos', icon: '🎬' },
    { id: View.ADMIN_SETTINGS, label: 'Config', icon: '⚙️' },
  ];

  const handleTabClick = (v: View) => {
    setView(v);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-50 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-24">
          <div 
            className="flex items-center gap-4 cursor-pointer group" 
            onClick={() => setView(isAdmin ? View.ADMIN_DASHBOARD : View.CUSTOMER_HOME)}
          >
            {/* Volta da Letra M no Topo conforme solicitado */}
            <div className="h-14 w-14 bg-tea-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
               <span className="text-white font-serif font-bold text-3xl">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-serif font-bold text-tea-900 hidden sm:block tracking-wide leading-tight">
                Studio Moriá
              </span>
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] hidden sm:block">
                Estética Avançada
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isAdmin && currentUser && (
               <div className="flex items-center gap-6 mr-4">
                  <button 
                    onClick={() => setView(View.CUSTOMER_PROFILE)}
                    className={`text-[10px] font-bold uppercase tracking-widest ${view === View.CUSTOMER_PROFILE ? 'text-tea-800' : 'text-gray-400 hover:text-tea-600'}`}
                  >
                    Meu Perfil
                  </button>
                  <button 
                    onClick={onLogout}
                    className="text-[10px] text-red-300 hover:text-red-500 font-bold uppercase tracking-widest"
                  >
                    Sair
                  </button>
               </div>
            )}

            {isAdminAuthenticated && isAdmin && (
              <>
                <div className="hidden lg:flex gap-3 mr-6 items-center">
                  {adminTabs.map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)} 
                      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${view === tab.id ? 'bg-tea-50 text-tea-800' : 'text-gray-400 hover:text-tea-500 hover:bg-gray-50'}`}
                    >
                      {tab.label}
                      {tab.badge ? (
                        <span className="bg-orange-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  <button 
                    onClick={onAdminLogout}
                    className="ml-2 text-[10px] text-red-400 hover:text-red-600 font-bold bg-red-50 px-4 py-2 rounded-xl uppercase tracking-widest"
                  >
                    Sair
                  </button>
                </div>
                
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-3 text-tea-700 bg-tea-50 rounded-2xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
                  </svg>
                </button>
              </>
            )}
            
            <div className="flex gap-2">
              {!currentUser && !isAdmin && (
                <button 
                  onClick={() => setView(View.CUSTOMER_LOGIN)}
                  className="px-6 py-3 rounded-full text-[9px] font-bold transition-all border-2 uppercase tracking-widest bg-white text-tea-700 border-tea-100 hover:bg-tea-50 shadow-sm"
                >
                  Entrar
                </button>
              )}
              
              <button 
                onClick={onToggleAdmin}
                className={`px-6 py-3 rounded-full text-[9px] font-bold transition-all border-2 uppercase tracking-widest ${isAdmin ? 'bg-tea-800 text-white border-tea-800 shadow-lg' : 'bg-tea-950 text-white border-tea-950 hover:bg-black'}`}
              >
                {isAdmin ? 'Ver Site' : 'Equipe'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen && isAdminAuthenticated && isAdmin && (
        <div className="lg:hidden bg-white border-t border-gray-100 animate-fade-in shadow-2xl overflow-hidden rounded-b-3xl">
          <div className="grid grid-cols-2 p-6 gap-3">
            {adminTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all ${view === tab.id ? 'bg-tea-50 text-tea-800 font-bold' : 'bg-gray-50 text-gray-500'}`}
              >
                <span className="text-2xl">{tab.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-widest">{tab.label}</span>
                  {tab.badge ? <span className="text-[8px] text-orange-600 font-bold mt-1">{tab.badge} notificações</span> : null}
                </div>
              </button>
            ))}
            <button 
              onClick={onAdminLogout}
              className="flex items-center gap-4 p-5 rounded-2xl text-left bg-red-50 text-red-600 font-bold"
            >
              <span className="text-2xl">🚪</span>
              <span className="text-[10px] uppercase font-bold tracking-widest">Sair</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
