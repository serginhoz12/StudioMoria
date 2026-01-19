
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
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center gap-4 cursor-pointer group" 
            onClick={() => setView(isAdmin ? View.ADMIN_DASHBOARD : View.CUSTOMER_HOME)}
          >
            <div className="bg-[#23492d] p-1.5 rounded-xl overflow-hidden flex items-center justify-center h-12 w-12 shadow-sm group-hover:scale-105 transition-transform">
               <span className="text-white font-serif font-bold text-2xl italic">M</span>
            </div>
            <span className="text-lg font-serif font-bold text-tea-900 hidden sm:block tracking-wide">
              {salonName}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isAdmin && currentUser && (
               <div className="flex items-center gap-4 mr-2">
                  <button 
                    onClick={() => setView(View.CUSTOMER_PROFILE)}
                    className={`text-sm font-bold ${view === View.CUSTOMER_PROFILE ? 'text-tea-600' : 'text-gray-500 hover:text-tea-400'}`}
                  >
                    Meu Perfil
                  </button>
                  <button 
                    onClick={onLogout}
                    className="text-xs text-red-400 hover:text-red-600 font-bold"
                  >
                    Sair
                  </button>
               </div>
            )}

            {isAdminAuthenticated && isAdmin && (
              <>
                {/* Desktop Tabs */}
                <div className="hidden lg:flex gap-2 mr-4 items-center">
                  {adminTabs.map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)} 
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${view === tab.id ? 'bg-tea-50 text-tea-700' : 'text-gray-400 hover:text-tea-500'}`}
                    >
                      {tab.label}
                      {tab.badge ? (
                        <span className="bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  <button 
                    onClick={onAdminLogout}
                    className="ml-2 text-xs text-red-400 hover:text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-full"
                  >
                    Sair
                  </button>
                </div>
                
                {/* Mobile Menu Toggle */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-tea-700 bg-tea-50 rounded-xl"
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
                  className={`px-4 py-2 rounded-full text-[10px] font-bold transition border-2 uppercase tracking-widest bg-white text-tea-700 border-tea-100 hover:bg-tea-50`}
                >
                  Área do Cliente
                </button>
              )}
              
              <button 
                onClick={onToggleAdmin}
                className={`px-4 py-2 rounded-full text-[10px] font-bold transition border-2 uppercase tracking-widest ${isAdmin ? 'bg-tea-800 text-white border-tea-800' : 'bg-tea-50 text-tea-700 border-tea-100 hover:bg-tea-100'}`}
              >
                {isAdmin ? 'Ver Site' : 'Área Equipe'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && isAdminAuthenticated && isAdmin && (
        <div className="lg:hidden bg-white border-t border-gray-100 animate-fade-in overflow-hidden">
          <div className="grid grid-cols-2 p-4 gap-2">
            {adminTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all ${view === tab.id ? 'bg-tea-50 text-tea-800 font-bold' : 'bg-gray-50 text-gray-500'}`}
              >
                <span className="text-xl">{tab.icon}</span>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider">{tab.label}</span>
                  {tab.badge ? <span className="text-[9px] text-red-500 font-bold">{tab.badge} pendentes</span> : null}
                </div>
              </button>
            ))}
            <button 
              onClick={onAdminLogout}
              className="flex items-center gap-3 p-4 rounded-2xl text-left bg-red-50 text-red-600 font-bold"
            >
              <span className="text-xl">🚪</span>
              <span className="text-xs uppercase tracking-wider">Sair</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
