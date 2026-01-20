
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
  const adminTabs = [
    { id: View.ADMIN_DASHBOARD, label: 'Início', icon: '🏠' },
    { id: View.ADMIN_CONFIRMATIONS, label: 'Pedidos', icon: '🔔', badge: pendingBookingsCount },
    { id: View.ADMIN_CALENDAR, label: 'Agenda', icon: '📅' },
    { id: View.ADMIN_FINANCE, label: 'Caixa', icon: '💰' },
    { id: View.ADMIN_CLIENTS, label: 'Clientes', icon: '👤' },
    { id: View.ADMIN_SETTINGS, label: 'Config', icon: '⚙️' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center h-20 md:h-24">
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setView(isAdmin ? View.ADMIN_DASHBOARD : View.CUSTOMER_HOME)}
          >
            <div className="h-10 w-10 md:h-12 md:w-12 bg-tea-900 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
               <span className="text-white font-serif font-bold text-xl">M</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-serif font-bold text-tea-900 tracking-wide leading-tight">
                Studio Moriá
              </span>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                Estética Avançada
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            {/* Desktop Admin Tabs */}
            {isAdminAuthenticated && isAdmin && (
              <div className="hidden lg:flex gap-2 items-center mr-4">
                {adminTabs.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setView(tab.id)} 
                    className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all relative ${view === tab.id ? 'bg-tea-50 text-tea-800' : 'text-gray-400 hover:text-tea-500 hover:bg-gray-50'}`}
                  >
                    {tab.label}
                    {tab.badge ? (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            {/* User Session Info */}
            {!isAdmin && currentUser && (
               <div className="hidden sm:flex items-center gap-4 mr-2">
                  <button 
                    onClick={() => setView(View.CUSTOMER_PROFILE)}
                    className={`text-[9px] font-bold uppercase tracking-widest ${view === View.CUSTOMER_PROFILE ? 'text-tea-800' : 'text-gray-400 hover:text-tea-600'}`}
                  >
                    Meu Perfil
                  </button>
                  <button 
                    onClick={onLogout}
                    className="text-[9px] text-red-300 font-bold uppercase tracking-widest"
                  >
                    Sair
                  </button>
               </div>
            )}
            
            {/* Action Buttons: Cliente e Equipe sempre juntos */}
            <div className="flex gap-1.5 md:gap-2">
              {!isAdmin && (
                <button 
                  onClick={() => setView(currentUser ? View.CUSTOMER_DASHBOARD : View.CUSTOMER_LOGIN)}
                  className="px-3 md:px-5 py-2 md:py-3 rounded-full text-[8px] md:text-[9px] font-bold transition-all border-2 border-tea-100 text-tea-900 bg-white uppercase tracking-widest hover:bg-tea-50 shadow-sm"
                >
                  Cliente
                </button>
              )}
              
              <button 
                onClick={onToggleAdmin}
                className={`px-3 md:px-5 py-2 md:py-3 rounded-full text-[8px] md:text-[9px] font-bold transition-all border-2 uppercase tracking-widest ${isAdmin ? 'bg-tea-800 text-white border-tea-800 shadow-lg' : 'bg-tea-950 text-white border-tea-950 shadow-sm'}`}
              >
                {isAdmin ? 'Site' : 'Equipe'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Admin Navigation Bar - Visível quando na área da equipe e autenticado */}
      {isAdminAuthenticated && isAdmin && (
        <div className="lg:hidden bg-gray-50 border-t border-gray-100 overflow-x-auto custom-scroll flex items-center px-4 py-3 gap-2 no-scrollbar">
          {adminTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 flex-shrink-0 ${view === tab.id ? 'bg-tea-900 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge ? (
                <span className="bg-orange-500 text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default Navbar;
