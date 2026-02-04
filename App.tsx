
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
import AdminVeo from './components/AdminVeo.tsx';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.CUSTOMER_HOME);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedAdminMember, setLoggedAdminMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  useEffect(() => {
    // SE ESTIVERMOS NO EDITOR (MOCK), PULAMOS O FIREBASE E CARREGAMOS O VISUAL
    if (db._isMock) {
      console.log("Modo Visual Ativado: Dados locais carregados.");
      setIsLoading(false);
      return;
    }

    const savedUser = localStorage.getItem('moria_user_session');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const savedAdmin = localStorage.getItem('moria_admin_session');
    if (savedAdmin) {
      setLoggedAdminMember(JSON.parse(savedAdmin));
      setIsAdmin(true);
    }

    // Monitoramento Firestore Real (apenas se disponível)
    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        const remoteSettings = snap.data() as SalonSettings;
        setSettings(prev => ({ ...prev, ...remoteSettings }));
        setIsLoading(false);
      } else {
        setDoc(doc(db, "settings", "main"), DEFAULT_SETTINGS).then(() => setIsLoading(false));
      }
    }, () => setIsLoading(false));

    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      if (!snapshot.empty) {
        setServices(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service)));
      }
    });

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const allCustomers = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      setCustomers(allCustomers);
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
      unsubSettings(); unsubServices(); unsubCustomers();
      unsubBookings(); unsubTransactions(); unsubWaitlist(); unsubPromotions();
    };
  }, []);

  // Lógica de Renderização e Eventos...
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

  const handleCustomerLogin = (id: string, pass: string) => {
    const cleanId = id.replace(/\D/g, ''); 
    const user = customers.find(c => {
      const uCpf = (c.cpf || '').replace(/\D/g, '');
      const uWa = (c.whatsapp || '').replace(/\D/g, '');
      return (uCpf === cleanId || uWa === cleanId) && c.password === pass;
    });

    if (user) {
      setCurrentUser(user);
      localStorage.setItem('moria_user_session', JSON.stringify(user));
      setCurrentView(View.CUSTOMER_DASHBOARD);
    } else {
      alert("Acesso não encontrado. Verifique seu CPF/WhatsApp ou sua senha.");
    }
  };

  const renderView = () => {
    if (isAdmin) {
      if (!loggedAdminMember) return <AdminLogin teamMembers={settings.teamMembers} onLogin={handleAdminLogin} onBack={() => { setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); }} />;
      
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} services={services} customers={customers} bookings={bookings} transactions={transactions} loggedMember={loggedAdminMember} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar bookings={bookings} services={services} customers={customers} teamMembers={settings.teamMembers} settings={settings} loggedMember={loggedAdminMember} />;
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations bookings={bookings} customers={customers} waitlist={waitlist} onUpdateStatus={(id, s) => !db._isMock && updateDoc(doc(db, "bookings", id), {status: s})} onUpdateDeposit={(id, d) => !db._isMock && updateDoc(doc(db, "bookings", id), {depositStatus: d})} onDeleteBooking={(id) => !db._isMock && deleteDoc(doc(db, "bookings", id))} onRemoveWaitlist={(id) => !db._isMock && deleteDoc(doc(db, "waitlist", id))} />;
        case View.ADMIN_CLIENTS: return <AdminClients customers={customers} bookings={bookings} transactions={transactions} onDelete={(id) => !db._isMock && deleteDoc(doc(db, "customers", id))} onUpdate={(id, d) => !db._isMock && updateDoc(doc(db, "customers", id), d)} />;
        case View.ADMIN_FINANCE: return <AdminFinance transactions={transactions} onAdd={async (d) => { if(!db._isMock) await addDoc(collection(db, "transactions"), d); }} onUpdate={(id, d) => !db._isMock && updateDoc(doc(db, "transactions", id), d)} onDelete={(id) => !db._isMock && deleteDoc(doc(db, "transactions", id))} customers={customers} services={services} />;
        case View.ADMIN_MARKETING: return <AdminMarketing customers={customers} promotions={promotions} services={services} bookings={bookings} />;
        case View.ADMIN_VEO: return <AdminVeo />;
        default: return <AdminDashboard bookings={bookings} transactions={transactions} customers={customers} settings={settings} loggedMember={loggedAdminMember} />;
      }
    }

    if (currentUser && (currentView === View.CUSTOMER_DASHBOARD || currentView === View.CUSTOMER_LOGIN || currentView === View.CUSTOMER_PROFILE)) {
       if (currentView === View.CUSTOMER_PROFILE) return <CustomerProfile customer={currentUser} transactions={transactions} bookings={bookings} onUpdateNotification={(v) => !db._isMock && updateDoc(doc(db, "customers", currentUser.id), { receivesNotifications: v })} onBack={() => setCurrentView(View.CUSTOMER_DASHBOARD)} />;
       return (
         <CustomerDashboard 
            customer={currentUser} 
            bookings={bookings} 
            services={services}
            settings={settings}
            onBook={() => {}}
            onUpdateProfile={(upd) => !db._isMock && updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); localStorage.removeItem('moria_user_session'); setCurrentView(View.CUSTOMER_HOME); }}
            onCancelBooking={(id) => !db._isMock && updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            onAddToWaitlist={(srvId, date) => !db._isMock && addDoc(collection(db, "waitlist"), { customerId: currentUser.id, customerName: currentUser.name, customerWhatsapp: currentUser.whatsapp, serviceId: srvId, serviceName: services.find(s=>s.id===srvId)?.name, preferredDate: date, status: 'active', createdAt: new Date().toISOString() })}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id)}
            onRemoveWaitlist={(id) => !db._isMock && deleteDoc(doc(db, "waitlist", id))}
            promotions={promotions}
         />
       );
    }

    switch (currentView) {
      case View.CUSTOMER_REGISTER: return (
        <CustomerRegister 
          onRegister={async (n, w, c, p, not) => {
            if (db._isMock) return alert("Modo visual: Cadastro simulado.");
            try {
              const newCustomer = {
                name: n, whatsapp: w, cpf: c, password: p, receivesNotifications: not,
                agreedToTerms: true, history: [], createdAt: new Date().toISOString()
              };
              const docRef = await addDoc(collection(db, "customers"), newCustomer);
              const userWithId = { ...newCustomer, id: docRef.id } as Customer;
              setCurrentUser(userWithId);
              localStorage.setItem('moria_user_session', JSON.stringify(userWithId));
              setCurrentView(View.CUSTOMER_DASHBOARD);
            } catch (err) {
              alert("Erro ao realizar cadastro.");
            }
          }} 
          customers={customers} 
          onBack={() => setCurrentView(View.CUSTOMER_HOME)} 
        />
      );
      case View.CUSTOMER_LOGIN: return (
        <CustomerLoginView 
          onLogin={handleCustomerLogin} 
          onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} 
          onBack={() => setCurrentView(View.CUSTOMER_HOME)} 
        />
      );
      default: return (
        <CustomerHome 
          settings={settings} 
          services={services} 
          bookings={bookings} 
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
          pendingBookingsCount={bookings.filter(b => b.status === 'pending').length}
        />
      )}
      <main className={currentView === View.CUSTOMER_DASHBOARD ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tea-600"></div>
            <p className="text-tea-800 font-serif italic">Studio Moriá Estética...</p>
          </div>
        ) : renderView()}
      </main>
    </div>
  );
};

export default App;
