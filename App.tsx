
import React, { useState, useEffect } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, WaitlistEntry, Promotion, TeamMember } from './types.ts';
import { INITIAL_SERVICES, DEFAULT_SETTINGS } from './constants.ts';
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
  const [currentView, setCurrentView] = useState<View>(View.CUSTOMER_HOME);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedAdminMember, setLoggedAdminMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  // Efeito para carregar dados e restaurar sessões
  useEffect(() => {
    // Timeout de segurança: Se o Firebase não responder em 10 segundos, libera o carregamento
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Firebase demorando para responder, liberando interface...");
        setIsLoading(false);
      }
    }, 10000);

    // Restaurar Sessão Admin
    const savedAdmin = localStorage.getItem('moria_admin_session');
    if (savedAdmin) {
      try {
        setLoggedAdminMember(JSON.parse(savedAdmin));
        setIsAdmin(true);
        setCurrentView(View.ADMIN_DASHBOARD);
      } catch(e) { console.error("Sessão admin corrompida."); }
    }

    // Restaurar Sessão Cliente
    const savedUser = localStorage.getItem('moria_user_session');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setCurrentView(View.CUSTOMER_DASHBOARD);
      } catch(e) { console.error("Sessão cliente corrompida."); }
    }

    // Ouvinte de Configurações - O mais crítico para o carregamento
    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        const remoteSettings = snap.data() as SalonSettings;
        let team = remoteSettings.teamMembers || [];
        const masterAdmin = team.find(m => m.id === 'tm1') || DEFAULT_SETTINGS.teamMembers[0];
        const otherMembers = team.filter(m => m.id !== 'tm1');
        
        const correctedTeam = [
          { 
            ...masterAdmin, 
            id: 'tm1', 
            username: 'admin', 
            password: '460206', 
            role: 'owner' as const,
            assignedServiceIds: masterAdmin.assignedServiceIds || [] 
          },
          ...otherMembers
        ];

        setSettings({ ...remoteSettings, teamMembers: correctedTeam });
      } else {
        // Inicializa com as configurações padrão se for a primeira execução
        setDoc(doc(db, "settings", "main"), JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      }
      setIsLoading(false); // Libera o spinner após receber o snapshot (existindo ou não)
    }, (error) => {
      console.error("Erro ao carregar configurações:", error);
      setIsLoading(false); // Libera mesmo com erro para não travar o site
    });

    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service));
      setServices(data);
    }, (e) => console.error("Erro serviços:", e));

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      setCustomers(data);
      
      const savedUser = localStorage.getItem('moria_user_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          const updated = data.find(c => c.id === parsed.id);
          if (updated) setCurrentUser(updated);
        } catch(e) {}
      }
    }, (e) => console.error("Erro clientes:", e));

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
    }, (e) => console.error("Erro agendamentos:", e));

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    }, (e) => console.error("Erro transações:", e));

    const unsubWaitlist = onSnapshot(collection(db, "waitlist"), (snapshot) => {
      setWaitlist(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as WaitlistEntry)));
    }, (e) => console.error("Erro lista espera:", e));

    const unsubPromotions = onSnapshot(collection(db, "promotions"), (snapshot) => {
      setPromotions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Promotion)));
    }, (e) => console.error("Erro promoções:", e));

    return () => {
      clearTimeout(loadingTimeout);
      unsubSettings(); unsubServices(); unsubCustomers();
      unsubBookings(); unsubTransactions(); unsubWaitlist(); unsubPromotions();
    };
  }, []);

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
      throw new Error("Credenciais incorretas. Verifique seu CPF/WhatsApp e senha.");
    }
  };

  const handleCustomerRegister = async (name: string, whatsapp: string, cpf: string, password: string, receivesNotifications: boolean) => {
    try {
      const newCustomer = {
        name,
        whatsapp,
        cpf: cpf || "",
        password,
        receivesNotifications,
        agreedToTerms: true,
        history: [],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "customers"), newCustomer);
      const created = { ...newCustomer, id: docRef.id } as Customer;
      
      setCurrentUser(created);
      localStorage.setItem('moria_user_session', JSON.stringify(created));
      setCurrentView(View.CUSTOMER_DASHBOARD);
      alert("Cadastro realizado com sucesso! Bem-vinda ao Studio Moriá.");
    } catch (e) {
      console.error("Erro ao registrar cliente:", e);
      alert("Ocorreu um erro ao realizar o cadastro. Tente novamente.");
    }
  };

  const renderView = () => {
    if (isAdmin) {
      if (!loggedAdminMember) return <AdminLogin teamMembers={settings.teamMembers} onLogin={handleAdminLogin} onBack={() => { setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); }} />;
      
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

    if (currentUser && (currentView === View.CUSTOMER_DASHBOARD || currentView === View.CUSTOMER_LOGIN || currentView === View.CUSTOMER_PROFILE)) {
       if (currentView === View.CUSTOMER_PROFILE) {
         return <CustomerProfile 
           customer={currentUser} 
           transactions={transactions} 
           bookings={bookings} 
           onUpdateNotification={(v) => updateDoc(doc(db, "customers", currentUser.id), { receivesNotifications: v })} 
           onBack={() => setCurrentView(View.CUSTOMER_DASHBOARD)} 
         />;
       }
       return (
         <CustomerDashboard 
            customer={currentUser} 
            bookings={bookings} 
            services={services}
            settings={settings}
            onBook={() => {}}
            onUpdateProfile={(upd) => updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); localStorage.removeItem('moria_user_session'); setCurrentView(View.CUSTOMER_HOME); }}
            onCancelBooking={(id) => updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            onAddToWaitlist={(srvId, date) => addDoc(collection(db, "waitlist"), { customerId: currentUser.id, customerName: currentUser.name, customerWhatsapp: currentUser.whatsapp, serviceId: srvId, serviceName: services.find(s=>s.id===srvId)?.name, preferredDate: date, status: 'active', createdAt: new Date().toISOString() })}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id)}
            onRemoveWaitlist={(id) => deleteDoc(doc(db, "waitlist", id))}
            promotions={promotions}
         />
       );
    }

    switch (currentView) {
      case View.CUSTOMER_REGISTER: return <CustomerRegister onRegister={handleCustomerRegister} customers={customers} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      case View.CUSTOMER_LOGIN: return <CustomerLoginView onLogin={handleCustomerLogin} onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      default: return (
        <CustomerHome 
          settings={settings} services={services} bookings={bookings} 
          onBook={() => {}} 
          onAuthClick={() => setCurrentView(View.CUSTOMER_LOGIN)} 
          onAddToWaitlist={() => {}} 
          currentUser={currentUser} 
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {currentView !== View.CUSTOMER_DASHBOARD && (
        <Navbar 
          view={currentView} 
          setView={setCurrentView} 
          isAdmin={isAdmin} 
          onToggleAdmin={() => { 
            if (isAdmin) handleAdminLogout();
            else { setCurrentView(View.ADMIN_LOGIN); setIsAdmin(true); }
          }} 
          salonName={settings.name} 
          logo={settings.logo} 
          currentUser={currentUser} 
          onLogout={() => { setCurrentUser(null); localStorage.removeItem('moria_user_session'); setCurrentView(View.CUSTOMER_HOME); }} 
          onAdminLogout={handleAdminLogout} 
          isAdminAuthenticated={!!loggedAdminMember} 
        />
      )}
      <main className={currentView === View.CUSTOMER_DASHBOARD ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tea-900"></div>
            <p className="text-tea-900 font-serif italic text-sm animate-pulse">Conectando ao Studio Moriá...</p>
          </div>
        ) : renderView()}
      </main>
    </div>
  );
};

export default App;
