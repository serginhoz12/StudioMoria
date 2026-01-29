
import React, { useState, useEffect, useMemo } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, WaitlistEntry, Promotion, TeamMember } from './types.ts';
import { DEFAULT_SETTINGS } from './constants.ts';
import { db } from './firebase.ts';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc
} from "firebase/firestore";

import Navbar from './components/Navbar.tsx';
import CustomerHome from './components/CustomerHome.tsx';
import CustomerRegister from './components/CustomerRegister.tsx';
import CustomerLoginView from './components/CustomerLoginView.tsx';
import CustomerProfile from './components/CustomerProfile.tsx';
import CustomerDashboard from './components/CustomerDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import AdminCalendar from './components/AdminCalendar.tsx';
import AdminFinance from './components/AdminFinance.tsx';
import AdminClients from './components/AdminClients.tsx';
import AdminConfirmations from './components/AdminConfirmations.tsx';
import AdminSettingsView from './components/AdminSettingsView.tsx';
import AdminLogin from './components/AdminLogin.tsx';
import AdminMarketing from './components/AdminMarketing.tsx';

const App: React.FC = () => {
  // SEGURANÇA MÁXIMA: Estados iniciam rigorosamente vazios.
  const [currentView, setCurrentView] = useState<View>(View.CUSTOMER_HOME);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedAdminMember, setLoggedAdminMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Public Data
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  
  // Private Data (Loaded on demand after explicit login or for verification)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  const cleanData = (data: any) => JSON.parse(JSON.stringify(data));

  // 1. INITIALIZATION: Sincroniza com o banco e garante limpeza
  useEffect(() => {
    // Dupla camada de limpeza por precaução (Microsoft Edge Fix)
    sessionStorage.clear();
    localStorage.clear();

    // Carrega Configurações Públicas
    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({...prev, ...snap.data() as SalonSettings}));
      } else {
        setDoc(doc(db, "settings", "main"), cleanData(DEFAULT_SETTINGS));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Settings Error:", error);
      setIsLoading(false);
    });

    // Carrega Serviços Públicos
    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service)));
    }, (error) => console.error("Firestore Services Error:", error));

    return () => { unsubSettings(); unsubServices(); };
  }, []);

  // 2. PRIVATE DATA LOADING: Habilitado para Login ou se autenticado
  useEffect(() => {
    // Carregamos clientes se estiver na tela de login/registro para validação rápida
    const isLoginOrRegister = currentView === View.CUSTOMER_LOGIN || currentView === View.CUSTOMER_REGISTER;
    if (!isAdmin && !currentUser && !isLoginOrRegister) return;

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      setCustomers(data);
      if (currentUser) {
        const updated = data.find(c => c.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }
    });

    // Outros dados privados apenas após login
    if (!isAdmin && !currentUser) return;

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
    });

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    });

    const unsubWaitlist = onSnapshot(collection(db, "waitlist"), (snapshot) => {
      setWaitlist(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as WaitlistEntry)));
    });

    const unsubPromotions = onSnapshot(collection(db, "promotions"), (snapshot) => {
      setPromotions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Promotion)));
    });

    return () => {
      unsubCustomers(); unsubBookings(); unsubTransactions();
      unsubWaitlist(); unsubPromotions();
    };
  }, [isAdmin, currentUser?.id, currentView]);

  const handleAdminLogin = (member: TeamMember) => {
    setLoggedAdminMember(member);
    setIsAdmin(true);
    sessionStorage.setItem('moria_admin_session', JSON.stringify(member));
    setCurrentView(View.ADMIN_DASHBOARD);
  };

  const handleAdminLogout = () => {
    setLoggedAdminMember(null);
    setIsAdmin(false);
    sessionStorage.clear();
    localStorage.clear();
    setCurrentView(View.CUSTOMER_HOME);
  };

  const handleCustomerLogin = (identifier: string, pass: string) => {
    const cleanInput = identifier.replace(/\D/g, '');
    const lowerInput = identifier.toLowerCase().trim();

    const user = customers.find(c => {
      const cleanCpf = (c.cpf || "").replace(/\D/g, '');
      const cleanWa = (c.whatsapp || "").replace(/\D/g, '');
      const lowerName = (c.name || "").toLowerCase().trim();
      
      // Validação por CPF/WhatsApp (se numérico) OU Nome (texto exato)
      const matchesIdentifier = (cleanInput !== '' && (cleanCpf === cleanInput || cleanWa === cleanInput)) || 
                                (lowerName === lowerInput);
                                
      return matchesIdentifier && c.password === pass;
    });

    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('moria_user_session', JSON.stringify(user));
      setCurrentView(View.CUSTOMER_DASHBOARD);
    } else {
      throw new Error("Dados de acesso incorretos. Verifique o identificador e a senha.");
    }
  };

  const handleCustomerRegister = async (name: string, whatsapp: string, cpf: string, password: string, receivesNotifications: boolean) => {
    try {
      const newCustomer = cleanData({
        name, whatsapp, cpf: cpf || "", password,
        receivesNotifications, agreedToTerms: true,
        history: [], createdAt: new Date().toISOString()
      });
      const docRef = await addDoc(collection(db, "customers"), newCustomer);
      const created = { ...newCustomer, id: docRef.id } as Customer;
      setCurrentUser(created);
      sessionStorage.setItem('moria_user_session', JSON.stringify(created));
      setCurrentView(View.CUSTOMER_DASHBOARD);
    } catch (e) {
      alert("Erro ao criar cadastro.");
    }
  };

  const renderView = () => {
    // Fluxo Administrativo
    if (isAdmin) {
      if (!loggedAdminMember) {
        return <AdminLogin 
          teamMembers={settings.teamMembers} 
          onLogin={handleAdminLogin} 
          onBack={() => { setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); }} 
        />;
      }
      
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} services={services} customers={customers} bookings={bookings} transactions={transactions} loggedMember={loggedAdminMember} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar bookings={bookings} services={services} customers={customers} teamMembers={settings.teamMembers} settings={settings} loggedMember={loggedAdminMember} />;
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations bookings={bookings} customers={customers} waitlist={waitlist} onUpdateStatus={(id, s) => updateDoc(doc(db, "bookings", id), {status: s})} onUpdateDeposit={(id, d) => updateDoc(doc(db, "bookings", id), {depositStatus: d})} onDeleteBooking={(id) => deleteDoc(doc(db, "bookings", id))} onRemoveWaitlist={(id) => deleteDoc(doc(db, "waitlist", id))} />;
        case View.ADMIN_CLIENTS: return <AdminClients customers={customers} bookings={bookings} transactions={transactions} onDelete={(id) => deleteDoc(doc(db, "customers", id))} onUpdate={(id, d) => updateDoc(doc(db, "customers", id), d)} />;
        case View.ADMIN_FINANCE: return <AdminFinance transactions={transactions} onAdd={(d) => addDoc(collection(db, "transactions"), d)} onUpdate={(id, d) => updateDoc(doc(db, "transactions", id), d)} onDelete={(id) => deleteDoc(doc(db, "transactions", id))} customers={customers} services={services} />;
        case View.ADMIN_MARKETING: return <AdminMarketing customers={customers} promotions={promotions} services={services} bookings={bookings} />;
        default: return <AdminDashboard bookings={bookings} transactions={transactions} customers={customers} settings={settings} loggedMember={loggedAdminMember} />;
      }
    }

    // Fluxo do Cliente Autenticado
    if (currentUser && (currentView === View.CUSTOMER_DASHBOARD || currentView === View.CUSTOMER_PROFILE)) {
       if (currentView === View.CUSTOMER_PROFILE) {
         return <CustomerProfile customer={currentUser} transactions={transactions} bookings={bookings} onUpdateNotification={(v) => updateDoc(doc(db, "customers", currentUser.id), { receivesNotifications: v })} onBack={() => setCurrentView(View.CUSTOMER_DASHBOARD)} />;
       }
       return (
         <CustomerDashboard 
            customer={currentUser} bookings={bookings} services={services} settings={settings}
            onBook={() => {}} onUpdateProfile={(upd) => updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); sessionStorage.clear(); setCurrentView(View.CUSTOMER_HOME); }}
            onCancelBooking={(id) => updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            onAddToWaitlist={(srvId, date) => addDoc(collection(db, "waitlist"), { customerId: currentUser.id, customerName: currentUser.name, customerWhatsapp: currentUser.whatsapp, serviceId: srvId, serviceName: services.find(s=>s.id===srvId)?.name, preferredDate: date, status: 'active', createdAt: new Date().toISOString() })}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id)} onRemoveWaitlist={(id) => deleteDoc(doc(db, "waitlist", id))} promotions={promotions}
         />
       );
    }

    // Fluxo Público
    switch (currentView) {
      case View.CUSTOMER_REGISTER: return <CustomerRegister onRegister={handleCustomerRegister} customers={customers} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      case View.CUSTOMER_LOGIN: return <CustomerLoginView onLogin={handleCustomerLogin} onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      default: return (
        <CustomerHome 
          settings={settings} services={services} bookings={bookings} onBook={() => {}} onAuthClick={() => setCurrentView(View.CUSTOMER_LOGIN)} onAddToWaitlist={() => {}} currentUser={currentUser} 
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {currentView !== View.CUSTOMER_DASHBOARD && (
        <Navbar 
          view={currentView} setView={setCurrentView} isAdmin={isAdmin} 
          onToggleAdmin={() => { 
            if (isAdmin && loggedAdminMember) handleAdminLogout();
            else { 
              setIsAdmin(true);
              setCurrentView(View.ADMIN_LOGIN); 
            }
          }} 
          salonName={settings.name} logo={settings.logo} currentUser={currentUser} 
          onLogout={() => { 
            setCurrentUser(null); 
            sessionStorage.clear(); 
            setCurrentView(View.CUSTOMER_HOME); 
          }} 
          onAdminLogout={handleAdminLogout} 
          isAdminAuthenticated={!!loggedAdminMember} 
        />
      )}
      <main className={currentView === View.CUSTOMER_DASHBOARD ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-8 animate-fade-in">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-tea-900"></div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-serif font-bold italic text-tea-950">M</div>
            </div>
            <p className="text-tea-950 font-serif italic text-sm animate-pulse tracking-widest uppercase">Studio Moriá Estética...</p>
          </div>
        ) : renderView()}
      </main>
    </div>
  );
};

export default App;
