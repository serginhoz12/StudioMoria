
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
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center h-20 md:h-24">
          <div 
            className="flex items-center gap-3 md:gap-4 cursor-pointer group" 
            onClick={() => setView(isAdmin ? View.ADMIN_DASHBOARD : View.CUSTOMER_HOME)}
          >
            {/* Ícone Minimalista M */}
            <div className="h-10 w-10 md:h-12 md:w-12 bg-tea-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
               <span className="text-white font-serif font-bold text-xl md:text-2xl">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-serif font-bold text-tea-900 hidden sm:block tracking-wide leading-tight">
                Studio Moriá
              </span>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em] hidden sm:block">
                Estética Avançada
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {!isAdmin && currentUser && (
               <div className="flex items-center gap-4 md:gap-6 mr-2">
                  <button 
                    onClick={() => setView(View.CUSTOMER_PROFILE)}
                    className={`text-[9px] font-bold uppercase tracking-widest ${view === View.CUSTOMER_PROFILE ? 'text-tea-800' : 'text-gray-400 hover:text-tea-600'}`}
                  >
                    Perfil
                  </button>
                  <button 
                    onClick={onLogout}
                    className="text-[9px] text-red-300 font-bold uppercase tracking-widest"
                  >
                    Sair
                  </button>
               </div>
            )}

            {isAdminAuthenticated && isAdmin && (
              <div className="hidden lg:flex gap-3 mr-6 items-center">
                {adminTabs.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)} 
                    className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${view === tab.id ? 'bg-tea-50 text-tea-800' : 'text-gray-400 hover:text-tea-500 hover:bg-gray-50'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={onToggleAdmin}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-full text-[8px] md:text-[9px] font-bold transition-all border-2 uppercase tracking-widest ${isAdmin ? 'bg-tea-800 text-white border-tea-800' : 'bg-tea-950 text-white border-tea-950'}`}
              >
                {isAdmin ? 'Site' : 'Equipe'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
