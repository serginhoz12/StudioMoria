
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
  // OBRIGATÓRIO: Sempre iniciar na Home do Cliente
  const [currentView, setCurrentView] = useState<View>(View.CUSTOMER_HOME);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedAdminMember, setLoggedAdminMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Public Data
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  
  // Private Data (Loaded on demand)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  const cleanData = (data: any) => JSON.parse(JSON.stringify(data));

  // 1. PUBLIC DATA LOADING & SESSION CLEANUP
  useEffect(() => {
    // REMOVIDO: Bypasses automáticos para Dashboards. 
    // O sistema agora apenas restaura os dados do usuário, mas mantém na Home.
    const savedAdmin = localStorage.getItem('moria_admin_session');
    if (savedAdmin) {
      try {
        setLoggedAdminMember(JSON.parse(savedAdmin));
        // Não chamamos setCurrentView aqui para forçar início na Home
      } catch(e) {}
    }

    const savedUser = localStorage.getItem('moria_user_session');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        // Não chamamos setCurrentView aqui para forçar início na Home
      } catch(e) {}
    }

    // Load Critical Settings
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

    // Load Public Services
    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service)));
    }, (error) => console.error("Firestore Services Error:", error));

    return () => { unsubSettings(); unsubServices(); };
  }, []);

  // 2. PRIVATE DATA LOADING (Apenas quando autenticado no estado atual)
  useEffect(() => {
    // O carregamento de dados sensíveis só ocorre se o admin ou usuário estiverem ativos no estado
    if (!isAdmin && !currentUser) return;

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      setCustomers(data);
      if (currentUser) {
        const updated = data.find(c => c.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }
    });

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
  }, [isAdmin, currentUser?.id]);

  const handleAdminLogin = (member: TeamMember) => {
    setLoggedAdminMember(member);
    setIsAdmin(true);
    localStorage.setItem('moria_admin_session', JSON.stringify(member));
    setCurrentView(View.ADMIN_DASHBOARD);
  };

  const handleAdminLogout = () => {
    setLoggedAdminMember(null);
    setIsAdmin(false);
    localStorage.removeItem('moria_admin_session');
    setCurrentView(View.CUSTOMER_HOME);
  };

  const handleCustomerLogin = (cpfOrWhatsapp: string, pass: string) => {
    // Busca na base carregada sob demanda ou local
    const cleanInput = cpfOrWhatsapp.replace(/\D/g, '');
    const user = customers.find(c => {
      const cleanCpf = (c.cpf || "").replace(/\D/g, '');
      const cleanWa = (c.whatsapp || "").replace(/\D/g, '');
      return (cleanCpf === cleanInput || cleanWa === cleanInput) && c.password === pass;
    });

    if (user) {
      setCurrentUser(user);
      localStorage.setItem('moria_user_session', JSON.stringify(user));
      setCurrentView(View.CUSTOMER_DASHBOARD);
    } else {
      throw new Error("Credenciais não encontradas. Verifique se seu cadastro está correto.");
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
      localStorage.setItem('moria_user_session', JSON.stringify(created));
      setCurrentView(View.CUSTOMER_DASHBOARD);
    } catch (e) {
      console.error("Register Error:", e);
      alert("Não foi possível realizar o cadastro no momento.");
    }
  };

  const renderView = () => {
    // PRIORIDADE: Login da Equipe
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

    // Áreas do Cliente Autenticado
    if (currentUser && (currentView === View.CUSTOMER_DASHBOARD || currentView === View.CUSTOMER_PROFILE)) {
       if (currentView === View.CUSTOMER_PROFILE) {
         return <CustomerProfile customer={currentUser} transactions={transactions} bookings={bookings} onUpdateNotification={(v) => updateDoc(doc(db, "customers", currentUser.id), { receivesNotifications: v })} onBack={() => setCurrentView(View.CUSTOMER_DASHBOARD)} />;
       }
       return (
         <CustomerDashboard 
            customer={currentUser} bookings={bookings} services={services} settings={settings}
            onBook={() => {}} onUpdateProfile={(upd) => updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); localStorage.removeItem('moria_user_session'); setCurrentView(View.CUSTOMER_HOME); }}
            onCancelBooking={(id) => updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            onAddToWaitlist={(srvId, date) => addDoc(collection(db, "waitlist"), { customerId: currentUser.id, customerName: currentUser.name, customerWhatsapp: currentUser.whatsapp, serviceId: srvId, serviceName: services.find(s=>s.id===srvId)?.name, preferredDate: date, status: 'active', createdAt: new Date().toISOString() })}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id)} onRemoveWaitlist={(id) => deleteDoc(doc(db, "waitlist", id))} promotions={promotions}
         />
       );
    }

    // Fluxos Públicos e Login/Cadastro
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
            if (isAdmin) handleAdminLogout();
            else { 
              setIsAdmin(true);
              setCurrentView(View.ADMIN_LOGIN); 
            }
          }} 
          salonName={settings.name} logo={settings.logo} currentUser={currentUser} 
          onLogout={() => { 
            setCurrentUser(null); 
            localStorage.removeItem('moria_user_session'); 
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
