
import React, { useState, useEffect } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, WaitlistEntry, Promotion, InventoryItem } from './types.ts';
import { INITIAL_SERVICES, DEFAULT_SETTINGS, INITIAL_INVENTORY } from './constants.ts';
import { db, auth } from './firebase.ts';
import { signInAnonymously } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  increment,
  getDocs,
  query,
  where,
  getDoc
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
import AdminInventory from './components/AdminInventory.tsx';

const App: React.FC = () => {
  // Load initial state from localStorage if available
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('moria_view');
    return saved ? (saved as View) : View.CUSTOMER_HOME;
  });
  const [isMockMode, setIsMockMode] = useState((db as any)._isMock);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('moria_isAdmin') === 'true';
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('moria_isAdminAuth') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customerInitialTab, setCustomerInitialTab] = useState<'home' | 'agendar' | 'agenda'>('home');

  const setView = (v: View) => {
    if (v !== View.CUSTOMER_DASHBOARD) {
      setCustomerInitialTab('home');
    }
    setCurrentView(v);
  };

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('moria_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Firebase Auth Initialization
  useEffect(() => {
    if (!isMockMode) {
      signInAnonymously(auth).catch(err => console.error("Erro no Auth Anônimo:", err));
    }
  }, [isMockMode]);

  // Persist session state
  useEffect(() => {
    localStorage.setItem('moria_view', currentView);
    localStorage.setItem('moria_isAdmin', String(isAdmin));
    localStorage.setItem('moria_isAdminAuth', String(isAdminAuthenticated));
    if (currentUser) {
      localStorage.setItem('moria_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('moria_user');
    }
  }, [currentView, isAdmin, isAdminAuthenticated, currentUser]);

  // Inactivity Logout (5 minutes)
  useEffect(() => {
    if (!isAdminAuthenticated && !currentUser) return;

    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log("Inatividade detectada. Deslogando...");
        handleLogout();
      }, 5 * 60 * 1000); // 5 minutes
    };

    const handleLogout = () => {
      setIsAdminAuthenticated(false);
      setIsAdmin(false);
      setCurrentUser(null);
      setCurrentView(View.CUSTOMER_HOME);
      localStorage.clear();
      alert("Sessão expirada por inatividade. Por favor, faça login novamente.");
    };

    // Events to track interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAdminAuthenticated, currentUser]);

  useEffect(() => {
    const handleGlobalPermissionError = () => {
      if (!isMockMode) {
        console.warn("Global permission error detected. Entering Demo Mode.");
        setIsMockMode(true);
        (db as any)._isMock = true;
      }
    };
    window.addEventListener('moria_permission_denied', handleGlobalPermissionError);
    return () => window.removeEventListener('moria_permission_denied', handleGlobalPermissionError);
  }, [isMockMode]);

  useEffect(() => {
    // FIX: Using (db as any) to check _isMock property which is not part of standard Firestore type
    if (isMockMode) {
      console.log("Modo Visual: Firestore Mock Ativo.");
      setServices(INITIAL_SERVICES);
      setSettings(DEFAULT_SETTINGS);
      setInventory(INITIAL_INVENTORY);
      setIsLoading(false);
      return;
    }

    const handlePermissionError = (error: any, collectionName: string) => {
      if (error.code === 'permission-denied') {
        if (!isMockMode) {
          console.warn(`Firebase permissions restricted on ${collectionName}. Entering Demo Mode.`);
          setIsMockMode(true);
          (db as any)._isMock = true;
        }
      } else {
        console.error(`Error fetching ${collectionName}:`, error);
      }
    };

    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        const remoteData = snap.data() as SalonSettings;
        // Merge DEFAULT_SETTINGS with remote data to ensure all fields exist
        // but remote data takes precedence for existing values like visitCount
        setSettings({ ...DEFAULT_SETTINGS, ...remoteData });
        setIsLoading(false);
      } else {
        setDoc(doc(db, "settings", "main"), DEFAULT_SETTINGS).then(() => setIsLoading(false));
      }
    }, (error) => {
      handlePermissionError(error, "settings");
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
    });

    // Only set up other listeners if we aren't already in mock mode
    if (isMockMode) return () => unsubSettings();

    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Service)));
    }, (error) => {
      handlePermissionError(error, "services");
      if (!isMockMode) setServices(INITIAL_SERVICES);
    });

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
    }, (error) => {
      handlePermissionError(error, "customers");
    });

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
    }, (error) => {
      handlePermissionError(error, "bookings");
    });

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    }, (error) => {
      handlePermissionError(error, "transactions");
    });

    const unsubWaitlist = onSnapshot(collection(db, "waitlist"), (snapshot) => {
      setWaitlist(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as WaitlistEntry)));
    }, (error) => {
      handlePermissionError(error, "waitlist");
    });

    const unsubPromotions = onSnapshot(collection(db, "promotions"), (snapshot) => {
      setPromotions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Promotion)));
    }, (error) => {
      handlePermissionError(error, "promotions");
    });

    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem));
      console.log(`Inventory listener fired. Items found: ${items.length}`);
      setInventory(items);
    }, (error) => {
      handlePermissionError(error, "inventory");
    });

    return () => {
      unsubSettings(); unsubServices(); unsubCustomers();
      unsubBookings(); unsubTransactions(); unsubWaitlist(); unsubPromotions();
      unsubInventory();
    };
  }, [isMockMode]);

  // Increment visit count when on Customer Home
  useEffect(() => {
    if (!isLoading && !isMockMode && currentView === View.CUSTOMER_HOME) {
      const incrementVisit = async () => {
        try {
          await updateDoc(doc(db, "settings", "main"), {
            visitCount: increment(1),
            lastUpdated: Date.now()
          });
        } catch (err) {
          console.error("Error incrementing visit count:", err);
        }
      };
      incrementVisit();
    }
  }, [isLoading, isMockMode, currentView]);

  // Cleanup address if it contains the unwanted phrase
  useEffect(() => {
    const unwanted = "PRÓXIMO AO MATERIAL DE CONSTRUÇÃO DO FABIO";
    if (!isLoading && !isMockMode && settings.address.toUpperCase().includes(unwanted)) {
      const cleanAddress = settings.address.replace(/,?\s*PRÓXIMO AO MATERIAL DE CONSTRUÇÃO DO FABIO/gi, "");
      updateDoc(doc(db, "settings", "main"), { address: cleanAddress });
    }
  }, [isLoading, isMockMode, settings.address]);

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

  const handleBook = async (sid: string, dt: string, mid?: string) => {
    if (!currentUser) { setView(View.CUSTOMER_LOGIN); return; }
    if (isMockMode) return;
    const srv = services.find(s => s.id === sid);
    const booking = {
      customerId: currentUser.id,
      customerName: currentUser.name,
      serviceId: sid,
      serviceName: srv?.name || '',
      dateTime: dt,
      duration: srv?.duration || 30,
      status: 'pending',
      depositStatus: 'pending',
      teamMemberId: mid || '',
      teamMemberName: mid ? settings.teamMembers.find(m => m.id === mid)?.name : '',
      agreedToCancellationPolicy: true,
      policyAgreedAt: new Date().toISOString()
    };
    await addDoc(collection(db, "bookings"), booking);

    // Remove from waitlist if exists for this service
    try {
      const q = query(
        collection(db, "waitlist"), 
        where("customerId", "==", currentUser.id), 
        where("serviceId", "==", sid),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "waitlist", d.id));
      }
    } catch (err) {
      console.error("Erro ao remover da lista de espera:", err);
    }

    alert("Solicitação de agendamento enviada com sucesso!");
  };

  const handleAddToWaitlist = async (sid: string, dt?: string) => {
    if (!currentUser) { setView(View.CUSTOMER_LOGIN); return; }
    if (isMockMode) return;
    const srv = services.find(s => s.id === sid);
    await addDoc(collection(db, "waitlist"), {
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerWhatsapp: currentUser.whatsapp,
      serviceId: sid,
      serviceName: srv?.name || '',
      preferredDate: dt || new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString()
    });
    alert("Você foi adicionada à lista de espera!");
  };

  const renderView = () => {
    if (isAdmin) {
      if (!isAdminAuthenticated) return <AdminLogin onLogin={() => { setIsAdminAuthenticated(true); setView(View.ADMIN_DASHBOARD); }} onBack={() => setIsAdmin(false)} />;
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} services={services} customers={customers} bookings={bookings} transactions={transactions} inventory={inventory} isMockMode={isMockMode} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar bookings={bookings} services={services} customers={customers} transactions={transactions} waitlist={waitlist} teamMembers={settings.teamMembers} inventory={inventory} settings={settings} onUpdateStatus={handleUpdateStatus} onUpdateInventory={(id, data) => !isMockMode && updateDoc(doc(db, "inventory", id), data)} />;
        // FIX: Added missing 'services' prop to AdminConfirmations to resolve TS error
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations bookings={bookings} customers={customers} services={services} transactions={transactions} teamMembers={settings.teamMembers} inventory={inventory} onUpdateStatus={handleUpdateStatus} onUpdateDeposit={handleUpdateDeposit} onDeleteBooking={(id) => !isMockMode && deleteDoc(doc(db, "bookings", id))} waitlist={waitlist} onRemoveWaitlist={(id) => !isMockMode && deleteDoc(doc(db, "waitlist", id))} onUpdateInventory={(id, data) => !isMockMode && updateDoc(doc(db, "inventory", id), data)} />;
        case View.ADMIN_CLIENTS: return <AdminClients customers={customers} bookings={bookings} transactions={transactions} waitlist={waitlist} onDelete={(id) => !isMockMode && deleteDoc(doc(db, "customers", id))} onUpdate={(id, data) => !isMockMode && updateDoc(doc(db, "customers", id), data)} />;
        case View.ADMIN_FINANCE: return <AdminFinance transactions={transactions} bookings={bookings} customers={customers} services={services} settings={settings} inventory={inventory} onAdd={async (d) => { if(!isMockMode) await addDoc(collection(db, "transactions"), d); }} onUpdate={(id, d) => !isMockMode && updateDoc(doc(db, "transactions", id), d)} onDelete={(id) => !isMockMode && deleteDoc(doc(db, "transactions", id))} />;
        case View.ADMIN_MARKETING: return <AdminMarketing customers={customers} promotions={promotions} services={services} bookings={bookings} />;
        case View.ADMIN_INVENTORY: return <AdminInventory 
          inventory={inventory} 
          onUpdate={(id, data) => !isMockMode && updateDoc(doc(db, "inventory", id), data)} 
          onDelete={(id) => !isMockMode && deleteDoc(doc(db, "inventory", id))} 
          onAdd={async (data) => {
            if(isMockMode) {
              alert("Modo de Demonstração: O item foi simulado, mas não será salvo permanentemente.");
              return;
            }
            try {
              console.log("Tentando cadastrar produto:", data.name);
              // Clean up data: remove empty strings for dates
              const cleanData = { ...data };
              if (!cleanData.usageStartDate) delete cleanData.usageStartDate;
              if (!cleanData.purchaseDate) cleanData.purchaseDate = new Date().toISOString().split('T')[0];

              const docRef = await addDoc(collection(db, "inventory"), cleanData);
              console.log("Produto cadastrado com ID:", docRef.id);
              
              if (cleanData.purchasePrice && cleanData.purchasePrice > 0) {
                const isInstallment = ['credit', 'store_installments'].includes(cleanData.paymentMethod || '') && (cleanData.installmentsCount || 1) > 1;
                const pDate = cleanData.purchaseDate || new Date().toISOString().split('T')[0];
                
                if (isInstallment) {
                  const parentId = Math.random().toString(36).substr(2, 9);
                  const count = cleanData.installmentsCount || 1;
                  for (let i = 0; i < count; i++) {
                    const dueDate = new Date(pDate);
                    dueDate.setMonth(dueDate.getMonth() + i);
                    
                    await addDoc(collection(db, "transactions"), {
                      type: 'payable',
                      description: `Compra Estoque: ${cleanData.name} (${i + 1}/${count})`,
                      amount: Number((cleanData.purchasePrice / count).toFixed(2)),
                      date: pDate,
                      dueDate: dueDate.toISOString().split('T')[0],
                      status: i === 0 ? 'paid' : 'pending',
                      category: 'supplies',
                      paymentMethod: cleanData.paymentMethod,
                      installmentNumber: i + 1,
                      installmentsCount: count,
                      parentTransactionId: parentId,
                      createdAt: new Date().toISOString()
                    });
                  }
                } else {
                  await addDoc(collection(db, "transactions"), {
                    type: 'payable',
                    description: `Compra Estoque: ${cleanData.name}`,
                    amount: cleanData.purchasePrice,
                    date: pDate,
                    status: 'paid',
                    category: 'supplies',
                    paymentMethod: cleanData.paymentMethod,
                    createdAt: new Date().toISOString()
                  });
                }
              }
              alert(`Produto "${cleanData.name}" cadastrado com sucesso! ID: ${docRef.id}`);
            } catch (err: any) {
              console.error("Erro ao cadastrar produto:", err);
              if (err.code === 'permission-denied') {
                window.dispatchEvent(new Event('moria_permission_denied'));
                alert("Erro de permissão no Firebase. O sistema entrou em Modo de Demonstração.");
              } else {
                alert(`Erro ao cadastrar produto: ${err.message || 'Verifique sua conexão.'}`);
              }
            }
          }} 
        />;
        default: return <AdminDashboard bookings={bookings} transactions={transactions} customers={customers} services={services} settings={settings} waitlist={waitlist} inventory={inventory} onLogout={() => { setIsAdminAuthenticated(false); setIsAdmin(false); setCurrentView(View.CUSTOMER_HOME); localStorage.removeItem('moria_isAdminAuth'); }} />;
      }
    }

    if (currentUser && currentView === View.CUSTOMER_DASHBOARD) {
       return (
         <CustomerDashboard 
            customer={currentUser} 
            bookings={bookings} 
            services={services}
            transactions={transactions}
            settings={settings}
            onUpdateProfile={(upd) => !isMockMode && updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); setView(View.CUSTOMER_HOME); localStorage.removeItem('moria_user'); }}
            onCancelBooking={(id) => !isMockMode && updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            onGoToProfile={() => setView(View.CUSTOMER_PROFILE)}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id && w.status !== 'cancelled')}
            onRemoveWaitlist={(id) => !isMockMode && deleteDoc(doc(db, "waitlist", id))}
            promotions={promotions}
            initialTab={customerInitialTab}
         />
       );
    }

    if (currentUser && currentView === View.CUSTOMER_PROFILE) {
      return (
        <CustomerProfile 
          customer={currentUser} 
          transactions={transactions} 
          bookings={bookings} 
          onUpdateNotification={(val) => {
            if (currentUser) {
              const updated = { ...currentUser, receivesNotifications: val };
              setCurrentUser(updated);
              if (!isMockMode) updateDoc(doc(db, "customers", currentUser.id), { receivesNotifications: val });
            }
          }}
          onUpdatePassword={async (newPass) => {
            if (currentUser) {
              const updated = { ...currentUser, password: newPass };
              setCurrentUser(updated);
              if (!isMockMode) await updateDoc(doc(db, "customers", currentUser.id), { password: newPass });
              alert("Senha atualizada com sucesso!");
            }
          }}
          onBack={() => setView(View.CUSTOMER_DASHBOARD)} 
        />
      );
    }

    switch (currentView) {
      case View.CUSTOMER_REGISTER: return (
        <CustomerRegister 
          onRegister={async (n, w, c, p, not) => {
            if(isMockMode) return;
            try {
              const id = Math.random().toString(36).substr(2, 9);
              const finalCpf = c.trim() || `S/C-${id.toUpperCase()}`;
              const cleanCpf = finalCpf.replace(/\D/g, '');
              
              // Check for duplicate directly if global list is empty due to permissions
              if (c.trim() && customers.length === 0) {
                const q = query(collection(db, "customers"), where("cpf", "==", c));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  alert("Este CPF já possui um cadastro no Studio Moriá.");
                  return;
                }
              }

              const user = { id, name: n, whatsapp: w, cpf: finalCpf, password: p, receivesNotifications: not, agreedToTerms: true, history: [] };
              await setDoc(doc(db, "customers", id), user);
              setCurrentUser(user);
              setCustomerInitialTab('home');
              setView(View.CUSTOMER_DASHBOARD);
              alert("Cadastro realizado com sucesso!");
            } catch (err: any) {
              console.error("Erro no cadastro:", err);
              if (err.code === 'permission-denied') {
                alert("Erro de permissão no Firebase. Por favor, verifique as regras de segurança.");
              } else {
                alert("Erro ao realizar cadastro. Tente novamente.");
              }
            }
          }} 
          customers={customers} 
          onBack={() => setView(View.CUSTOMER_HOME)} 
        />
      );
      case View.CUSTOMER_LOGIN: return (
        <CustomerLoginView 
          onLogin={async (identifier, pass) => {
            const cleanInput = identifier.replace(/\D/g, '');
            
            // Try local search first (WhatsApp)
            let user = customers.find(c => c.whatsapp.replace(/\D/g, '') === cleanInput && c.password === pass);
            
            // If not found and list might be empty due to permissions, try direct query
            if (!user && !isMockMode) {
              try {
                const qWa = query(collection(db, "customers"), where("whatsapp", "==", cleanInput));
                const snapWa = await getDocs(qWa);
                if (!snapWa.empty) {
                  const found = snapWa.docs[0].data() as Customer;
                  if (found.password === pass) {
                    user = { ...found, id: snapWa.docs[0].id };
                  }
                }
              } catch (err) {
                console.error("Erro na consulta de login:", err);
              }
            }

            if (user) { 
              setCurrentUser(user); 
              setCustomerInitialTab('home');
              setView(View.CUSTOMER_DASHBOARD); 
            }
            else alert("Acesso inválido ou senha incorreta.");
          }} 
          onRegisterClick={() => setView(View.CUSTOMER_REGISTER)} 
          onBack={() => setView(View.CUSTOMER_HOME)} 
        />
      );
      default: return (
        <CustomerHome 
          settings={settings} services={services} bookings={bookings} promotions={promotions}
          currentUser={currentUser}
          onBook={handleBook} 
          onAuthClick={() => setView(View.CUSTOMER_LOGIN)} 
          onLoginSuccess={() => setView(View.CUSTOMER_DASHBOARD)}
          onAddToWaitlist={handleAddToWaitlist}
          onQuickRegister={async (name, whatsapp, bookingId, serviceId, isWaitlist) => {
            const cleanWhatsapp = whatsapp.replace(/\D/g, '');
            if (isMockMode) {
              const mockUser = { id: 'mock', name, whatsapp: cleanWhatsapp, cpf: '000', password: '000', receivesNotifications: true, agreedToTerms: true, history: [] };
              setCurrentUser(mockUser);
              setCustomerInitialTab('agenda');
              return { password: "1234", isNew: true }; 
            }
            try {
              const q = query(collection(db, "customers"), where("whatsapp", "==", cleanWhatsapp));
              const snap = await getDocs(q);
              
              let user: Customer;
              let randomPass = null;
              let isNew = false;

              if (!snap.empty) {
                user = { ...snap.docs[0].data(), id: snap.docs[0].id } as Customer;
              } else {
                isNew = true;
                const id = Math.random().toString(36).substr(2, 9);
                randomPass = Math.floor(1000 + Math.random() * 9000).toString();
                user = {
                  id,
                  name,
                  whatsapp: cleanWhatsapp,
                  cpf: `S/C-${id.toUpperCase()}`,
                  password: randomPass, 
                  receivesNotifications: true,
                  agreedToTerms: true,
                  history: []
                };
                await setDoc(doc(db, "customers", id), user);
                console.log("Novo cliente cadastrado:", user.id);
              }

              // Handle Booking
              if (bookingId && serviceId && !isWaitlist) {
                await updateDoc(doc(db, "bookings", bookingId), {
                  customerId: user.id,
                  serviceId: serviceId,
                  status: 'pending',
                  bookedAt: new Date().toISOString()
                });

                // Remove from waitlist if exists
                try {
                  const qW = query(
                    collection(db, "waitlist"), 
                    where("customerId", "==", user.id), 
                    where("serviceId", "==", serviceId),
                    where("status", "==", "active")
                  );
                  const snapW = await getDocs(qW);
                  for (const d of snapW.docs) {
                    await deleteDoc(doc(db, "waitlist", d.id));
                  }
                } catch (err) {
                  console.error("Erro ao remover da lista de espera (quick register):", err);
                }
              }

              // Handle Waitlist
              if (isWaitlist && serviceId) {
                const service = services.find(s => s.id === serviceId);
                const waitlistId = Math.random().toString(36).substr(2, 9);
                const waitlistEntry: WaitlistEntry = {
                  id: waitlistId,
                  customerId: user.id,
                  customerName: user.name,
                  customerWhatsapp: user.whatsapp,
                  serviceId: serviceId,
                  serviceName: service?.name || 'Serviço',
                  preferredDate: 'Qualquer data',
                  status: 'active',
                  createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, "waitlist", waitlistId), waitlistEntry);
              }

              setCurrentUser(user);
              setCustomerInitialTab('agenda');
              return { password: randomPass, isNew };
            } catch (err) {
              console.error("Quick Register Error:", err);
              throw err;
            }
          }}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {currentView !== View.CUSTOMER_DASHBOARD && (
        <Navbar 
          view={currentView} setView={setView} isAdmin={isAdmin} 
          isMockMode={isMockMode}
          onToggleAdmin={() => { setIsAdmin(!isAdmin); if(!isAdminAuthenticated) setView(View.ADMIN_LOGIN); else setView(isAdmin ? View.CUSTOMER_HOME : View.ADMIN_DASHBOARD); }} 
          salonName={settings.name} logo={settings.logo} currentUser={currentUser} 
          onLogout={() => { setCurrentUser(null); setView(View.CUSTOMER_HOME); localStorage.removeItem('moria_user'); }} 
          onAdminLogout={() => { setIsAdminAuthenticated(false); setIsAdmin(false); setView(View.CUSTOMER_HOME); localStorage.removeItem('moria_isAdminAuth'); }} 
          isAdminAuthenticated={isAdminAuthenticated} 
          lastUpdated={settings.lastUpdated}
          pendingBookingsCount={bookings.filter(b => {
            const isPending = b.status === 'pending';
            const testCustomer = customers.find(c => c.cpf.replace(/\D/g, '') === '33426618877');
            const isTestUser = testCustomer && b.customerId === testCustomer.id;
            return isPending && !isTestUser;
          }).length} 
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
