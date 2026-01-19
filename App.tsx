
import React, { useState, useEffect } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, TeamMember, WaitlistEntry } from './types';
import { INITIAL_SERVICES, DEFAULT_SETTINGS } from './constants';
import Navbar from './components/Navbar';
import CustomerHome from './components/CustomerHome';
import CustomerRegister from './components/CustomerRegister';
import CustomerLoginView from './components/CustomerLoginView';
import CustomerProfile from './components/CustomerProfile';
import AdminDashboard from './components/AdminDashboard';
import AdminCalendar from './components/AdminCalendar';
import AdminFinance from './components/AdminFinance';
import AdminClients from './components/AdminClients';
import AdminConfirmations from './components/AdminConfirmations';
import AdminSettingsView from './components/AdminSettingsView';
import AdminVeo from './components/AdminVeo';
import AdminLogin from './components/AdminLogin';

const STORAGE_KEY = 'moria_db_v6';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.CUSTOMER_HOME);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.services) setServices(parsed.services);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.bookings) setBookings(parsed.bookings);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.waitlist) setWaitlist(parsed.waitlist);
      } catch (e) {
        console.error("Erro ao carregar dados locais", e);
      }
    }
    const savedUser = localStorage.getItem('moria_user_session');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (localStorage.getItem('moria_admin_session') === 'true') setIsAdminAuthenticated(true);
  }, []);

  useEffect(() => {
    const data = { settings, services, customers, bookings, transactions, waitlist };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (currentUser) localStorage.setItem('moria_user_session', JSON.stringify(currentUser));
    else localStorage.removeItem('moria_user_session');
    localStorage.setItem('moria_admin_session', isAdminAuthenticated.toString());
  }, [settings, services, customers, bookings, transactions, waitlist, currentUser, isAdminAuthenticated]);

  const handleBulkImport = (data: any) => {
    if (data.settings) setSettings(data.settings);
    if (data.services) setServices(data.services);
    if (data.customers) setCustomers(data.customers);
    if (data.bookings) setBookings(data.bookings);
    if (data.transactions) setTransactions(data.transactions);
    if (data.waitlist) setWaitlist(data.waitlist);
    alert("Sincronização realizada!");
  };

  const handleRegister = (name: string, whatsapp: string, cpf: string, password: string, receivesNotifications: boolean) => {
    const newCustomer: Customer = { id: Math.random().toString(36).substr(2, 9), name, whatsapp, cpf, password, receivesNotifications, agreedToTerms: true, history: [] };
    setCustomers(prev => [...prev, newCustomer]);
    setCurrentUser(newCustomer);
    setCurrentView(View.CUSTOMER_HOME);
  };

  const handleLogin = (cpf: string, pass: string) => {
    const user = customers.find(c => c.cpf === cpf && c.password === pass);
    if (user) { setCurrentUser(user); setCurrentView(View.CUSTOMER_HOME); }
    else alert("Dados incorretos.");
  };

  const handleAddToWaitlist = (serviceId: string, date: string) => {
    if (!currentUser) return;
    const service = services.find(s => s.id === serviceId);
    const entry: WaitlistEntry = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerWhatsapp: currentUser.whatsapp,
      serviceId,
      serviceName: service?.name || '',
      preferredDate: date,
      createdAt: new Date().toISOString()
    };
    setWaitlist(prev => [...prev, entry]);
    alert("Você foi adicionada à lista de espera! Avisaremos pelo WhatsApp se houver uma desistência.");
  };

  const renderView = () => {
    if (isAdmin) {
      if (!isAdminAuthenticated) return <AdminLogin onLogin={() => { setIsAdminAuthenticated(true); setCurrentView(View.ADMIN_DASHBOARD); }} onBack={() => setIsAdmin(false)} />;
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} setSettings={setSettings} services={services} setServices={setServices} customers={customers} bookings={bookings} transactions={transactions} onImport={handleBulkImport} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar bookings={bookings} setBookings={setBookings} services={services} teamMembers={settings.teamMembers} settings={settings} />;
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations bookings={bookings} customers={customers} onUpdateStatus={(id, status) => setBookings(prev => prev.map(b => b.id === id ? {...b, status} : b))} waitlist={waitlist} onRemoveWaitlist={(id) => setWaitlist(prev => prev.filter(w => w.id !== id))} />;
        case View.ADMIN_CLIENTS: return <AdminClients customers={customers} bookings={bookings} transactions={transactions} onDelete={(id) => setCustomers(prev => prev.filter(c => c.id !== id))} onUpdate={(id, data) => setCustomers(prev => prev.map(c => c.id === id ? {...c, ...data} : c))} />;
        case View.ADMIN_FINANCE: return <AdminFinance transactions={transactions} setTransactions={setTransactions} customers={customers} services={services} />;
        case View.ADMIN_VEO: return <AdminVeo />;
        default: return <AdminDashboard bookings={bookings} transactions={transactions} customers={customers} />;
      }
    }

    switch (currentView) {
      case View.CUSTOMER_REGISTER: return <CustomerRegister onRegister={handleRegister} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      case View.CUSTOMER_LOGIN: return <CustomerLoginView onLogin={handleLogin} onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      case View.CUSTOMER_PROFILE: return currentUser ? <CustomerProfile customer={currentUser} transactions={transactions} bookings={bookings} onUpdateNotification={(val) => setCustomers(prev => prev.map(c => c.id === currentUser.id ? {...c, receivesNotifications: val} : c))} onBack={() => setCurrentView(View.CUSTOMER_HOME)} /> : <CustomerLoginView onLogin={handleLogin} onRegisterClick={() => setCurrentView(View.CUSTOMER_REGISTER)} onBack={() => setCurrentView(View.CUSTOMER_HOME)} />;
      default: return (
        <CustomerHome 
          settings={settings} 
          services={services} 
          bookings={bookings} 
          onBook={(sid, dt, mid) => {
            if (!currentUser) { setCurrentView(View.CUSTOMER_LOGIN); return; }
            const srv = services.find(s => s.id === sid);
            setBookings(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), customerId: currentUser.id, customerName: currentUser.name, serviceId: sid, serviceName: srv?.name || '', dateTime: dt, status: 'pending', teamMemberId: mid, teamMemberName: settings.teamMembers.find(m => m.id === mid)?.name }]);
            alert("Solicitação enviada!");
          }} 
          onAuthClick={() => setCurrentView(View.CUSTOMER_LOGIN)} 
          onAddToWaitlist={handleAddToWaitlist} 
          currentUser={currentUser} 
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar view={currentView} setView={setCurrentView} isAdmin={isAdmin} onToggleAdmin={() => { setIsAdmin(!isAdmin); if(!isAdminAuthenticated) setCurrentView(View.ADMIN_LOGIN); }} salonName={settings.name} logo={settings.logo} currentUser={currentUser} onLogout={() => setCurrentUser(null)} onAdminLogout={() => { setIsAdminAuthenticated(false); setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); }} isAdminAuthenticated={isAdminAuthenticated} pendingBookingsCount={bookings.filter(b => b.status === 'pending').length} />
      <main className="max-w-7xl mx-auto px-4 py-8">{renderView()}</main>
    </div>
  );
};

export default App;
