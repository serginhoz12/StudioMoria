
import React, { useState, useEffect } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, WaitlistEntry } from './types.ts';
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
import AdminDashboard from './components/AdminDashboard.tsx';
import AdminCalendar from './components/AdminCalendar.tsx';
import AdminFinance from './components/AdminFinance.tsx';
import AdminClients from './components/AdminClients.tsx';
import AdminConfirmations from './components/AdminConfirmations.tsx';
import AdminSettingsView from './components/AdminSettingsView.tsx';
import AdminVeo from './components/AdminVeo.tsx';
import AdminLogin from './components/AdminLogin.tsx';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.CUSTOMER_HOME);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (doc) => {
      if (doc.exists()) setSettings(doc.data() as SalonSettings);
      else setDoc(doc.ref, DEFAULT_SETTINGS);
    });

    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service));
      if (data.length === 0) INITIAL_SERVICES.forEach(s => setDoc(doc(db, "services", s.id), s));
      setServices(data);
    });

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
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

    return () => {
      unsubSettings(); unsubServices(); unsubCustomers();
      unsubBookings(); unsubTransactions(); unsubWaitlist();
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('moria_user_session');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (localStorage.getItem('moria_admin_session') === 'true') setIsAdminAuthenticated(true);
  }, []);

  useEffect(() => {
    if (currentUser) localStorage.setItem('moria_user_session', JSON.stringify(currentUser));
    else localStorage.removeItem('moria_user_session');
    localStorage.setItem('moria_admin_session', isAdminAuthenticated.toString());
  }, [currentUser, isAdminAuthenticated]);

  const handleRegister = async (name: string, whatsapp: string, cpf: string, password: string, receivesNotifications: boolean) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newCustomer: Customer = { id, name, whatsapp, cpf, password, receivesNotifications, agreedToTerms: true, history: [] };
    await setDoc(doc(db, "customers", id), newCustomer);
    setCurrentUser(newCustomer);
    setCurrentView(View.CUSTOMER_HOME);
  };

  const handleLogin = (cpf: string, pass: string) => {
    const user = customers.find(c => c.cpf === cpf && c.password === pass);
    if (user) { setCurrentUser(user); setCurrentView(View.CUSTOMER_HOME); }
    else alert("Dados incorretos.");
  };

  const handleBook = async (sid: string, dt: string, mid: string) => {
    if (!currentUser) { setCurrentView(View.CUSTOMER_LOGIN); return; }
    const srv = services.find(s => s.id === sid);
    const booking = {
      customerId: currentUser.id,
      customerName: currentUser.name,
      serviceId: sid,
      serviceName: srv?.name || '',
      dateTime: dt,
      duration: srv?.duration || 30, // Salva a duração atual para cálculo de ocupação
      status: 'pending',
      depositStatus: 'pending',
      teamMemberId: mid,
      teamMemberName: settings.teamMembers.find(m => m.id === mid)?.name
    };
    await addDoc(collection(db, "bookings"), booking);
  };

  const handleUpdateStatus = async (id: string, status: any) => {
    await updateDoc(doc(db, "bookings", id), { status });
  };

  const handleUpdateDeposit = async (id: string, depositStatus: 'paid' | 'pending') => {
    await updateDoc(doc(db, "bookings", id), { depositStatus });
  };

  const renderView = () => {
    if (isAdmin) {
      if (!isAdminAuthenticated) return <AdminLogin onLogin={() => { setIsAdminAuthenticated(true); setCurrentView(View.ADMIN_DASHBOARD); }} onBack={() => setIsAdmin(false)} />;
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} setSettings={(s) => setDoc(doc(db, "settings", "main"), s)} services={services} setServices={() => {}} customers={customers} bookings={bookings} transactions={transactions} onImport={() => {}} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar bookings={bookings} services={services} teamMembers={settings.teamMembers} settings={settings} />;
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations bookings={bookings} customers={customers} onUpdateStatus={handleUpdateStatus} onUpdateDeposit={handleUpdateDeposit} waitlist={waitlist} onRemoveWaitlist={(id) => deleteDoc(doc(db, "waitlist", id))} />;
        case View.ADMIN_CLIENTS: return <AdminClients customers={customers} bookings={bookings} transactions={transactions} onDelete={(id) => deleteDoc(doc(db, "customers", id))} onUpdate={(id, data) => updateDoc(doc(db, "customers", id), data)} />;
        case View.ADMIN_FINANCE: return <AdminFinance transactions={transactions} setTransactions={() => {}} customers={customers} services={services} />;
        case View.ADMIN_VEO: return <AdminVeo />;
        default: return <AdminDashboard bookings={bookings} transactions={transactions} customers={customers} />;
      }
    }

    switch (currentView) {
      case View.CUSTOMER_REGISTER: return <CustomerRegister onRegister={handleRegister} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      case View.CUSTOMER_LOGIN: return <CustomerLoginView onLogin={handleLogin} onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      case View.CUSTOMER_PROFILE: return currentUser ? <CustomerProfile customer={currentUser} transactions={transactions} bookings={bookings} onUpdateNotification={(val) => updateDoc(doc(db, "customers", currentUser.id), { receivesNotifications: val })} onBack={() => setCurrentView(View.CUSTOMER_HOME)} /> : <CustomerLoginView onLogin={handleLogin} onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      default: return (
        <CustomerHome 
          settings={settings} services={services} bookings={bookings} 
          onBook={handleBook} 
          onAuthClick={() => setCurrentView(View.CUSTOMER_LOGIN)} 
          onAddToWaitlist={async (sid, dt) => {
            if(!currentUser) return;
            const srv = services.find(s => s.id === sid);
            await addDoc(collection(db, "waitlist"), {
              customerId: currentUser.id, customerName: currentUser.name, customerWhatsapp: currentUser.whatsapp,
              serviceId: sid, serviceName: srv?.name || '', preferredDate: dt, createdAt: new Date().toISOString()
            });
            alert("Você está na lista de espera!");
          }} 
          currentUser={currentUser} 
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar view={currentView} setView={setCurrentView} isAdmin={isAdmin} onToggleAdmin={() => { setIsAdmin(!isAdmin); if(!isAdminAuthenticated) setCurrentView(View.ADMIN_LOGIN); else setCurrentView(isAdmin ? View.CUSTOMER_HOME : View.ADMIN_DASHBOARD); }} salonName={settings.name} logo={settings.logo} currentUser={currentUser} onLogout={() => setCurrentUser(null)} onAdminLogout={() => { setIsAdminAuthenticated(false); setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); }} isAdminAuthenticated={isAdminAuthenticated} pendingBookingsCount={bookings.filter(b => b.status === 'pending').length} />
      <main className="max-w-7xl mx-auto px-4 py-8">{renderView()}</main>
    </div>
  );
};

export default App;
