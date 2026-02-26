
import React, { useState, useEffect } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, WaitlistEntry, Promotion } from './types.ts';
import { INITIAL_SERVICES, DEFAULT_SETTINGS } from './constants.ts';
import { db } from './firebase.ts';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  increment
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
  const [isMockMode, setIsMockMode] = useState((db as any)._isMock);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  useEffect(() => {
    // FIX: Using (db as any) to check _isMock property which is not part of standard Firestore type
    if (isMockMode) {
      console.log("Modo Visual: Firestore Mock Ativo.");
      setServices(INITIAL_SERVICES);
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SalonSettings);
        setIsLoading(false);
      } else {
        setDoc(doc(db, "settings", "main"), DEFAULT_SETTINGS).then(() => setIsLoading(false));
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        if (!isMockMode) {
          console.warn("Firebase permissions restricted. Entering Demo Mode.");
          setIsMockMode(true);
          (db as any)._isMock = true;
        }
      } else {
        console.error("Error fetching settings:", error);
      }
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
    });

    // Only set up other listeners if we aren't already in mock mode
    if (isMockMode) return () => unsubSettings();

    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching services:", error);
      if (!isMockMode) setServices(INITIAL_SERVICES);
    });

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching customers:", error);
    });

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching bookings:", error);
    });

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching transactions:", error);
    });

    const unsubWaitlist = onSnapshot(collection(db, "waitlist"), (snapshot) => {
      setWaitlist(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as WaitlistEntry)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching waitlist:", error);
    });

    const unsubPromotions = onSnapshot(collection(db, "promotions"), (snapshot) => {
      setPromotions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Promotion)));
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching promotions:", error);
    });

    return () => {
      unsubSettings(); unsubServices(); unsubCustomers();
      unsubBookings(); unsubTransactions(); unsubWaitlist(); unsubPromotions();
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: any) => {
    // FIX: Using isMockMode for check
    if (isMockMode) return;
    const updateData: any = { status };
    if (status === 'cancelled') updateData.cancelledAt = new Date().toISOString();
    await updateDoc(doc(db, "bookings", id), updateData);
  };

  const handleUpdateDeposit = async (id: string, depositStatus: 'paid' | 'pending') => {
    // FIX: Using isMockMode for check
    if (isMockMode) return;
    await updateDoc(doc(db, "bookings", id), { depositStatus });
  };

  const renderView = () => {
    if (isAdmin) {
      if (!isAdminAuthenticated) return <AdminLogin onLogin={() => { setIsAdminAuthenticated(true); setCurrentView(View.ADMIN_DASHBOARD); }} onBack={() => setIsAdmin(false)} />;
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} services={services} customers={customers} bookings={bookings} transactions={transactions} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar bookings={bookings} services={services} customers={customers} teamMembers={settings.teamMembers} settings={settings} onUpdateStatus={handleUpdateStatus} />;
        // FIX: Added missing 'services' prop to AdminConfirmations to resolve TS error
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations bookings={bookings} customers={customers} services={services} teamMembers={settings.teamMembers} onUpdateStatus={handleUpdateStatus} onUpdateDeposit={handleUpdateDeposit} onDeleteBooking={(id) => !isMockMode && updateDoc(doc(db, "bookings", id), {status: 'cancelled'})} waitlist={waitlist} onRemoveWaitlist={(id) => !isMockMode && deleteDoc(doc(db, "waitlist", id))} />;
        case View.ADMIN_CLIENTS: return <AdminClients customers={customers} bookings={bookings} transactions={transactions} onDelete={(id) => !isMockMode && deleteDoc(doc(db, "customers", id))} onUpdate={(id, data) => !isMockMode && updateDoc(doc(db, "customers", id), data)} />;
        case View.ADMIN_FINANCE: return <AdminFinance transactions={transactions} bookings={bookings} customers={customers} onAdd={async (d) => { if(!isMockMode) await addDoc(collection(db, "transactions"), d); }} onUpdate={(id, d) => !isMockMode && updateDoc(doc(db, "transactions", id), d)} onDelete={(id) => !isMockMode && deleteDoc(doc(db, "transactions", id))} />;
        case View.ADMIN_MARKETING: return <AdminMarketing customers={customers} promotions={promotions} services={services} bookings={bookings} />;
        default: return <AdminDashboard bookings={bookings} transactions={transactions} customers={customers} settings={settings} />;
      }
    }

    if (currentUser && currentView === View.CUSTOMER_DASHBOARD) {
       return (
         <CustomerDashboard 
            customer={currentUser} 
            bookings={bookings} 
            services={services}
            settings={settings}
            // FIX: Removed onBook and onAddToWaitlist as they were not defined in CustomerDashboardProps
            onUpdateProfile={(upd) => !isMockMode && updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); setCurrentView(View.CUSTOMER_HOME); }}
            onCancelBooking={(id) => !isMockMode && updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id && w.status !== 'cancelled')}
            onRemoveWaitlist={(id) => !isMockMode && deleteDoc(doc(db, "waitlist", id))}
            promotions={promotions}
         />
       );
    }

    switch (currentView) {
      case View.CUSTOMER_REGISTER: return (
        <CustomerRegister 
          onRegister={async (n, w, c, p, not) => {
            // FIX: Using isMockMode for checks
            if(isMockMode) return;
            const id = Math.random().toString(36).substr(2, 9);
            const user = { id, name: n, whatsapp: w, cpf: c, password: p, receivesNotifications: not, agreedToTerms: true, history: [] };
            await setDoc(doc(db, "customers", id), user);
            setCurrentUser(user);
            setCurrentView(View.CUSTOMER_DASHBOARD);
          }} 
          customers={customers} 
          onBack={() => setCurrentView(View.CUSTOMER_HOME)} 
        />
      );
      case View.CUSTOMER_LOGIN: return (
        <CustomerLoginView 
          onLogin={(cpf, pass) => {
            const user = customers.find(c => c.cpf === cpf && c.password === pass);
            if (user) { setCurrentUser(user); setCurrentView(View.CUSTOMER_DASHBOARD); }
            else alert("Acesso inválido.");
          }} 
          onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} 
          onBack={() => setCurrentView(View.CUSTOMER_HOME)} 
        />
      );
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
          view={currentView} setView={setCurrentView} isAdmin={isAdmin} 
          isMockMode={isMockMode}
          onToggleAdmin={() => { setIsAdmin(!isAdmin); if(!isAdminAuthenticated) setCurrentView(View.ADMIN_LOGIN); else setCurrentView(isAdmin ? View.CUSTOMER_HOME : View.ADMIN_DASHBOARD); }} 
          salonName={settings.name} logo={settings.logo} currentUser={currentUser} 
          onLogout={() => { setCurrentUser(null); setCurrentView(View.CUSTOMER_HOME); }} 
          onAdminLogout={() => { setIsAdminAuthenticated(false); setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); }} 
          isAdminAuthenticated={isAdminAuthenticated} pendingBookingsCount={bookings.filter(b => b.status === 'pending').length} 
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
