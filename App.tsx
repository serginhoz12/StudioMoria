
import React, { useState, useEffect } from 'react';
import { View, Customer, Service, Booking, Transaction, SalonSettings, WaitlistEntry, Promotion, InventoryItem, ProductInterest, ProductOrder } from './types.ts';
import { INITIAL_SERVICES, DEFAULT_SETTINGS, INITIAL_INVENTORY } from './constants.ts';
import { db, auth, ensureAuthenticated } from './firebase.ts';
import firebaseConfig from './firebase-applet-config.json';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
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
  getDoc,
  getDocFromServer,
  writeBatch
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
import AdminStoreManagement from './components/AdminStoreManagement.tsx';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const getLocalDateString = (date: Date) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

const handleFirestoreError = (error: any, operation: OperationType, path: string | null) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType: operation,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

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
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productInterests, setProductInterests] = useState<ProductInterest[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
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
  const [pendingPasswordChangeUser, setPendingPasswordChangeUser] = useState<Customer | null>(null);

  // Firebase Auth Initialization
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      if (isMockMode) {
        setIsAuthReady(true);
        setIsLoading(false);
        return;
      }

      console.log("Initializing Auth...");
      const user = await ensureAuthenticated();
      if (isMounted) {
        setFirebaseUser(user);
        setIsAuthReady(true);
        console.log("Auth is ready. User UID:", user.uid);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (isMounted) {
        setFirebaseUser(user);
        if (user) setIsAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
      console.warn("Global permission error detected.");
    };
    window.addEventListener('moria_permission_denied', handleGlobalPermissionError);
    return () => window.removeEventListener('moria_permission_denied', handleGlobalPermissionError);
  }, [isMockMode]);

  useEffect(() => {
    if (isMockMode) return;

    const testConnection = async () => {
      if (!isAuthReady) return;
      try {
        console.log("Testando conexão direta com o servidor Firestore...");
        const config = {
          projectId: (firebaseConfig as any).projectId,
          databaseId: (db as any)._databaseId || '(default)',
          apiKey: (firebaseConfig as any).apiKey ? 'Presente' : 'Ausente'
        };
        console.log("Configuração sendo usada:", config);
        
        // Força uma leitura do servidor para validar a configuração e conectividade
        const snap = await getDocFromServer(doc(db, "settings", "main"));
        console.log("Conexão com servidor Firestore OK. Documento existe:", snap.exists());
        setIsFirebaseConnected(true);
        
        if (!snap.exists() && isAdminAuthenticated) {
          console.warn("Documento de configurações não existe no servidor. Criando inicial...");
          await setDoc(doc(db, "settings", "main"), DEFAULT_SETTINGS);
        } else if (snap.exists()) {
          const remoteData = snap.data() as SalonSettings;
          console.log("Dados remotos carregados via getDocFromServer. Última atualização:", new Date(remoteData.lastUpdated).toLocaleString());
        }
      } catch (err: any) {
        setIsFirebaseConnected(false);
        try {
          handleFirestoreError(err, OperationType.GET, "settings/main");
        } catch (e) {
          // Error is already logged and thrown
        }
      }
    };

    testConnection();
  }, [isMockMode, isAuthReady]);

  useEffect(() => {
    console.log("Firebase Config:", {
      projectId: (firebaseConfig as any).projectId,
      authDomain: (firebaseConfig as any).authDomain,
      databaseId: (db as any)._databaseId || '(default)'
    });
    console.log("Mock Mode Status:", isMockMode);
    console.log("Firestore Instance is Mock:", (db as any)._isMock);

    if (isMockMode) {
      console.log("Modo Visual: Firestore Mock Ativo.");
      setServices(INITIAL_SERVICES);
      setSettings(DEFAULT_SETTINGS);
      setInventory(INITIAL_INVENTORY);
      setIsLoading(false);
      return;
    }

    if (!isAuthReady) return;

    const handlePermissionError = (error: any, collectionName: string, operation: OperationType = OperationType.LIST) => {
      try {
        handleFirestoreError(error, operation, collectionName);
      } catch (e) {
        // Error is already logged and thrown
      }
    };

    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        console.log(`Settings loaded from Firebase. Source: ${snap.metadata.fromCache ? 'Cache' : 'Server'}. Last updated:`, new Date(snap.data().lastUpdated).toLocaleString());
        const remoteData = snap.data() as SalonSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...remoteData });
        setIsFirebaseConnected(true);
        setIsLoading(false);
      } else {
        console.warn("Settings document not found in Firebase (onSnapshot).");
        setSettings(DEFAULT_SETTINGS);
        setIsFirebaseConnected(true); // We are connected, even if doc is missing
        setIsLoading(false);
        
        // Only try to create if we are admin
        if (isAdminAuthenticated) {
          console.log("Creating default settings as Admin (onSnapshot fallback)...");
          setDoc(doc(db, "settings", "main"), DEFAULT_SETTINGS).catch(err => {
            console.error("Failed to create default settings:", err);
          });
        }
      }
    }, (error) => {
      handlePermissionError(error, "settings");
      setSettings(DEFAULT_SETTINGS);
      setIsFirebaseConnected(false);
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

    const customersQuery = isAdminAuthenticated ? collection(db, "customers") : query(collection(db, "customers"), where("__name__", "==", auth.currentUser?.uid || "none"));
    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
    }, (error) => {
      handlePermissionError(error, "customers");
    });

    const bookingsQuery = isAdminAuthenticated ? collection(db, "bookings") : query(collection(db, "bookings"), where("customerId", "==", auth.currentUser?.uid || "none"));
    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
    }, (error) => {
      handlePermissionError(error, "bookings");
    });

    const transactionsQuery = isAdminAuthenticated ? collection(db, "transactions") : query(collection(db, "transactions"), where("customerId", "==", auth.currentUser?.uid || "none"));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    }, (error) => {
      handlePermissionError(error, "transactions");
    });

    const waitlistQuery = isAdminAuthenticated ? collection(db, "waitlist") : query(collection(db, "waitlist"), where("customerId", "==", auth.currentUser?.uid || "none"));
    const unsubWaitlist = onSnapshot(waitlistQuery, (snapshot) => {
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
      setInventory(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem)));
    }, (error) => {
      handlePermissionError(error, "inventory");
    });

    const productInterestsQuery = isAdminAuthenticated ? collection(db, "productInterests") : query(collection(db, "productInterests"), where("customerId", "==", auth.currentUser?.uid || "none"));
    const unsubInterests = onSnapshot(productInterestsQuery, (snapshot) => {
      setProductInterests(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ProductInterest)));
    }, (error) => {
      handlePermissionError(error, "productInterests");
    });

    const productOrdersQuery = isAdminAuthenticated ? collection(db, "productOrders") : query(collection(db, "productOrders"), where("customerId", "==", auth.currentUser?.uid || "none"));
    const unsubOrders = onSnapshot(productOrdersQuery, (snapshot) => {
      setProductOrders(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ProductOrder)));
    }, (error) => {
      handlePermissionError(error, "productOrders");
    });

    return () => {
      unsubSettings(); unsubServices(); unsubCustomers();
      unsubBookings(); unsubTransactions(); unsubWaitlist(); unsubPromotions();
      unsubInventory(); unsubInterests(); unsubOrders();
    };
  }, [isMockMode, isAuthReady]);

  // Increment visit count when on Customer Home
  useEffect(() => {
    if (!isLoading && !isMockMode && currentView === View.CUSTOMER_HOME) {
      const incrementVisit = async () => {
        try {
          // Use setDoc with merge to ensure document exists
          await setDoc(doc(db, "settings", "main"), {
            visitCount: increment(1),
            lastUpdated: Date.now()
          }, { merge: true });
          console.log("Visita contabilizada com sucesso.");
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

  const handleBook = async (sid: string, dt: string, mid?: string, isPackageSession?: boolean) => {
    if (!currentUser) { setView(View.CUSTOMER_LOGIN); return; }
    if (isMockMode) return;
    const srv = services.find(s => s.id === sid);
    if (!srv) {
      alert("Erro: Procedimento não encontrado.");
      return;
    }
    const booking = {
      customerId: currentUser.id,
      customerName: currentUser.name,
      serviceId: sid,
      serviceName: srv.name,
      dateTime: dt,
      duration: srv.duration || 30,
      originalPrice: isPackageSession ? 0 : (srv.price || 0),
      status: 'pending',
      depositStatus: isPackageSession ? 'paid' : 'pending',
      isPackageSession: !!isPackageSession,
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

  const handleAddInterest = async (interest: Omit<ProductInterest, 'id'>) => {
    if (isMockMode) {
      setProductInterests(prev => [...prev, { ...interest, id: Math.random().toString() }]);
      return;
    }
    try {
      await addDoc(collection(db, 'productInterests'), interest);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'productInterests');
    }
  };

  const handlePlaceOrder = async (order: Omit<ProductOrder, 'id'>) => {
    if (isMockMode) {
      setProductOrders(prev => [...prev, { ...order, id: Math.random().toString() }]);
      return;
    }
    try {
      await addDoc(collection(db, 'productOrders'), order);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'productOrders');
    }
  };

  const handleUpdateInterest = async (id: string, data: Partial<ProductInterest>) => {
    if (isMockMode) {
      setProductInterests(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
      return;
    }
    try {
      await updateDoc(doc(db, 'productInterests', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'productInterests');
    }
  };

  const handleUpdateOrder = async (id: string, data: Partial<ProductOrder>) => {
    if (isMockMode) {
      setProductOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
      return;
    }
    try {
      await updateDoc(doc(db, 'productOrders', id), data);
      
      // If order is being marked as paid or delivered (for store_installments), generate transactions
      if (data.status === 'paid' || (data.status === 'delivered' && data.paymentMethod === 'store_installments')) {
        const order = productOrders.find(o => o.id === id);
        if (order) {
          const isInstallment = order.paymentMethod === 'store_installments' && (order.installmentsCount || 1) > 1;
          
          if (isInstallment) {
            const parentId = Math.random().toString(36).substr(2, 9);
            const count = order.installmentsCount || 1;
            const installmentValue = Number((order.totalPrice / count).toFixed(2));
            
            for (let i = 0; i < count; i++) {
              const dueDateObj = new Date(new Date().setMonth(new Date().getMonth() + i));
              const dueDateStr = getLocalDateString(dueDateObj);
              
              await addDoc(collection(db, "transactions"), {
                type: 'receivable',
                description: `Venda Loja: ${order.productName} - ${order.customerName} (${i + 1}/${count}) (A Prazo)`,
                amount: installmentValue,
                date: getLocalDateString(new Date()),
                dueDate: dueDateStr,
                status: 'pending',
                customerId: order.customerId,
                customerName: order.customerName,
                paymentMethod: order.paymentMethod,
                installmentsCount: count,
                installmentNumber: i + 1,
                parentTransactionId: parentId,
                createdAt: new Date().toISOString()
              });
            }
          } else {
            await addDoc(collection(db, "transactions"), {
              type: 'receivable',
              description: `Venda Loja: ${order.productName} - ${order.customerName}${order.paymentMethod === 'store_installments' ? ' (A Prazo)' : ''}`,
              amount: order.totalPrice,
              date: getLocalDateString(new Date()),
              dueDate: order.paymentMethod === 'store_installments' ? getLocalDateString(new Date()) : null,
              status: order.paymentMethod === 'store_installments' ? 'pending' : 'paid',
              customerId: order.customerId,
              customerName: order.customerName,
              paymentMethod: order.paymentMethod,
              paidAt: order.paymentMethod === 'store_installments' ? null : new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'productOrders');
    }
  };

  const handleDeleteInterest = async (id: string) => {
    if (isMockMode) {
      setProductInterests(prev => prev.filter(i => i.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'productInterests', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'productInterests');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (isMockMode) {
      setProductOrders(prev => prev.filter(o => o.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'productOrders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'productOrders');
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && firebaseUser && isAuthReady && !isMockMode) {
      const authorizeSession = async () => {
        try {
          // If we are authenticated as admin via Google or have the admin email, ensure the session doc exists
          const isAdminEmail = firebaseUser.email === 'Serginhoz12@gmail.com' || firebaseUser.email === 'serginhoz12@gmail.com';
          
          if (isAdminEmail) {
            await setDoc(doc(db, "admin_sessions", firebaseUser.uid), {
              authorizedAt: new Date().toISOString(),
              method: 'auto-restore',
              passcode: '460206'
            }, { merge: true });
            console.log("Admin session auto-restored for UID:", firebaseUser.uid);
          }
        } catch (err) {
          console.error("Failed to auto-restore admin session:", err);
        }
      };
      authorizeSession();
    }
  }, [isAdminAuthenticated, firebaseUser, isAuthReady, isMockMode]);

  const handleAdminLogin = async (method: string) => {
    setIsAdminAuthenticated(true);
    localStorage.setItem('moria_isAdminAuth', 'true');
    
    // Authorize session in Firebase
    const authorize = async (user: any) => {
      try {
        console.log("Authorizing admin session for UID:", user.uid);
        const sessionData: any = {
          authorizedAt: new Date().toISOString(),
          method: method === 'google-auth' ? 'google' : 'password'
        };
        
        // If it's a password login, we MUST include the passcode to satisfy rules
        if (method !== 'google-auth') {
          sessionData.passcode = method;
        } else {
          // even for google auth, we might need a dummy passcode if rules require it, 
          // or rely on isBaseAdmin() which also works.
          // In our rules, isBaseAdmin doesn't need passcode, but let's be safe.
          sessionData.passcode = '460206';
        }

        await setDoc(doc(db, "admin_sessions", user.uid), sessionData);
        console.log("Admin session authorized successfully.");
      } catch (err) {
        console.error("Failed to authorize admin session in Firebase:", err);
      }
    };

    if (firebaseUser || auth.currentUser) {
      await authorize(firebaseUser || auth.currentUser);
    } else {
      console.log("No authenticated user found for session authorization.");
    }
    
    setView(View.ADMIN_DASHBOARD);
  };

  const renderView = () => {
    if (isAdmin) {
      if (!isAdminAuthenticated) return <AdminLogin onLogin={handleAdminLogin} onBack={() => setIsAdmin(false)} />;
      switch (currentView) {
        case View.ADMIN_SETTINGS: return <AdminSettingsView settings={settings} services={services} customers={customers} bookings={bookings} transactions={transactions} inventory={inventory} isMockMode={isMockMode} />;
        case View.ADMIN_CALENDAR: return <AdminCalendar 
          bookings={bookings} 
          services={services} 
          customers={customers} 
          transactions={transactions} 
          waitlist={waitlist} 
          teamMembers={settings.teamMembers} 
          inventory={inventory} 
          settings={settings} 
          onUpdateStatus={handleUpdateStatus} 
          onUpdateInventory={(id, data) => {
            if (isMockMode) {
              setInventory(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
              return;
            }
            updateDoc(doc(db, "inventory", id), data);
          }} 
        />;
        // FIX: Added missing 'services' prop to AdminConfirmations to resolve TS error
        case View.ADMIN_CONFIRMATIONS: return <AdminConfirmations 
          bookings={bookings} 
          customers={customers} 
          services={services} 
          transactions={transactions} 
          teamMembers={settings.teamMembers} 
          inventory={inventory} 
          settings={settings} 
          onUpdateStatus={handleUpdateStatus} 
          onUpdateDeposit={handleUpdateDeposit} 
          onDeleteBooking={(id) => {
            if (isMockMode) {
              setBookings(prev => prev.filter(b => b.id !== id));
              return;
            }
            deleteDoc(doc(db, "bookings", id));
          }} 
          waitlist={waitlist} 
          onRemoveWaitlist={(id) => {
            if (isMockMode) {
              setWaitlist(prev => prev.filter(w => w.id !== id));
              return;
            }
            deleteDoc(doc(db, "waitlist", id));
          }} 
          onUpdateInventory={(id, data) => {
            if (isMockMode) {
              setInventory(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
              return;
            }
            updateDoc(doc(db, "inventory", id), data);
          }} 
        />;
        case View.ADMIN_CLIENTS: return <AdminClients 
          customers={customers} 
          bookings={bookings} 
          transactions={transactions} 
          waitlist={waitlist} 
          onDelete={(id) => {
            if (isMockMode) {
              setCustomers(prev => prev.filter(c => c.id !== id));
              return;
            }
            deleteDoc(doc(db, "customers", id));
          }} 
          onUpdate={(id, data) => {
            if (isMockMode) {
              setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
              return;
            }
            updateDoc(doc(db, "customers", id), data);
          }} 
        />;
        case View.ADMIN_FINANCE: return <AdminFinance 
          transactions={transactions} 
          bookings={bookings} 
          customers={customers} 
          services={services} 
          settings={settings} 
          inventory={inventory} 
          onAdd={async (d) => { 
            if(isMockMode) {
              const newT = { ...d, id: Math.random().toString(36).substr(2, 9) } as Transaction;
              setTransactions(prev => [...prev, newT]);
              return;
            }
            await addDoc(collection(db, "transactions"), d); 
          }} 
          onUpdate={(id, d) => {
            if (isMockMode) {
              setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...d } : t));
              return;
            }
            updateDoc(doc(db, "transactions", id), d);
          }} 
          onDelete={(id) => {
            if (isMockMode) {
              setTransactions(prev => prev.filter(t => t.id !== id));
              return;
            }
            deleteDoc(doc(db, "transactions", id));
          }} 
        />;
        case View.ADMIN_MARKETING: return <AdminMarketing 
          customers={customers} 
          promotions={promotions} 
          services={services} 
          bookings={bookings} 
          transactions={transactions}
          settings={settings}
          onUpdateSettings={(data) => !isMockMode && updateDoc(doc(db, "settings", "main"), data)}
          onUpdateCustomer={(id, data) => !isMockMode && updateDoc(doc(db, "customers", id), data)}
        />;
        case View.ADMIN_INVENTORY: return <AdminInventory 
          inventory={inventory} 
          customers={customers}
          services={services}
          transactions={transactions}
          onUpdate={async (id, data) => {
            if (isMockMode) {
              setInventory(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
              return;
            }
            try {
              if (!auth.currentUser) await signInAnonymously(auth);
              await updateDoc(doc(db, "inventory", id), data);
            } catch (err: any) {
              console.error("Erro ao atualizar estoque:", err);
              if (err.code === 'permission-denied') {
                alert("Erro de permissão ao atualizar estoque.");
              }
            }
          }} 
          onDelete={async (id) => {
            if (isMockMode) {
              setInventory(prev => prev.filter(item => item.id !== id));
              return;
            }
            try {
              if (!auth.currentUser) await signInAnonymously(auth);
              await deleteDoc(doc(db, "inventory", id));
            } catch (err: any) {
              console.error("Erro ao excluir do estoque:", err);
              if (err.code === 'permission-denied') {
                alert("Erro de permissão ao excluir do estoque.");
              }
            }
          }} 
          onAdd={async (data) => {
            if(isMockMode) {
              const newItem = { ...data, id: Math.random().toString(36).substr(2, 9) } as InventoryItem;
              setInventory(prev => [...prev, newItem]);
              alert("Modo de Demonstração: O item foi adicionado localmente.");
              return;
            }
            try {
              // Ensure we are authenticated
              if (!auth.currentUser) {
                await signInAnonymously(auth);
              }

              console.log("Tentando cadastrar produto:", data.name);
              
              // Clean up data
              const cleanData: any = {};
              Object.keys(data).forEach(key => {
                const val = (data as any)[key];
                if (val !== undefined && val !== null && val !== '') {
                  cleanData[key] = val;
                } else if (typeof val === 'number') {
                  cleanData[key] = val;
                }
              });

              if (!cleanData.purchaseDate) cleanData.purchaseDate = getLocalDateString(new Date());
              if (!cleanData.lastRestockedAt) cleanData.lastRestockedAt = new Date().toISOString();

              let docRef;
              try {
                docRef = await addDoc(collection(db, "inventory"), cleanData);
                console.log("Produto cadastrado com ID:", docRef.id);
              } catch (invErr: any) {
                console.error("Erro na coleção inventory:", invErr);
                throw new Error(`Erro na coleção 'inventory': ${invErr.message}`);
              }
              
              if (cleanData.purchasePrice && cleanData.purchasePrice > 0) {
                try {
                  const isInstallment = ['credit', 'store_installments'].includes(cleanData.paymentMethod || '') && (cleanData.installmentsCount || 1) > 1;
                  const pDate = cleanData.purchaseDate;
                  
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
                        dueDate: getLocalDateString(dueDate),
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
                } catch (transErr: any) {
                  console.error("Erro na coleção transactions ao salvar estoque:", transErr);
                  // We don't throw here so the inventory item is still considered "added"
                  alert(`O produto foi adicionado ao estoque, mas houve um erro ao registrar a transação financeira: ${transErr.message}`);
                }
              }
              alert(`Produto "${cleanData.name}" cadastrado com sucesso!`);
            } catch (err: any) {
              console.error("Erro ao cadastrar produto:", err);
              alert(`Erro ao cadastrar produto: ${err.message || 'Verifique sua conexão.'}`);
            }
          }} 
          onSellProduct={async (sale) => {
            if (isMockMode) {
              const saleId = Math.random().toString(36).substr(2, 9);
              const fullSale = { ...sale, id: saleId };
              
              // Update inventory
              setInventory(prev => prev.map(item => 
                item.id === sale.productId ? { ...item, quantity: item.quantity - sale.quantity } : item
              ));
              
              // Update customer history
              setCustomers(prev => prev.map(c => 
                c.id === sale.customerId ? { ...c, productHistory: [...(c.productHistory || []), fullSale] } : c
              ));
              
              // Add transaction
              const transId = Math.random().toString(36).substr(2, 9);
              setTransactions(prev => [...prev, {
                id: transId,
                type: 'receivable',
                description: `Venda: ${sale.productName} para ${sale.customerName}`,
                amount: sale.price,
                date: sale.saleDate,
                status: 'paid',
                customerId: sale.customerId,
                customerName: sale.customerName,
                createdAt: new Date().toISOString()
              } as any]);
              
              alert("Venda realizada com sucesso (Modo Demonstração)!");
              return;
            }
            
            try {
              if (!auth.currentUser) await signInAnonymously(auth);
              
              // 1. Update inventory
              const item = inventory.find(i => i.id === sale.productId);
              if (item) {
                await updateDoc(doc(db, "inventory", item.id), {
                  quantity: item.quantity - sale.quantity
                });
              }
              
              // 2. Add to customer history
              const customer = customers.find(c => c.id === sale.customerId);
              if (customer) {
                const saleId = Math.random().toString(36).substr(2, 9);
                const fullSale = { ...sale, id: saleId };
                await updateDoc(doc(db, "customers", customer.id), {
                  productHistory: [...(customer.productHistory || []), fullSale]
                });
              }
              
              // 3. Add transaction
              await addDoc(collection(db, "transactions"), {
                type: 'receivable',
                description: `Venda: ${sale.productName} para ${sale.customerName}`,
                amount: sale.price,
                date: sale.saleDate,
                status: 'paid',
                customerId: sale.customerId,
                customerName: sale.customerName,
                createdAt: new Date().toISOString()
              });
              
              alert("Venda registrada com sucesso!");
            } catch (err: any) {
              console.error("Erro ao registrar venda:", err);
              alert("Erro ao registrar venda: " + err.message);
            }
          }}
        />;
      case View.ADMIN_STORE:
        return <AdminStoreManagement 
          interests={productInterests}
          orders={productOrders}
          inventory={inventory}
          onUpdateInterest={handleUpdateInterest}
          onUpdateOrder={handleUpdateOrder}
          onDeleteInterest={handleDeleteInterest}
          onDeleteOrder={handleDeleteOrder}
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
            inventory={inventory}
            onUpdateProfile={(upd) => !isMockMode && updateDoc(doc(db, "customers", currentUser.id), upd)}
            onLogout={() => { setCurrentUser(null); setView(View.CUSTOMER_HOME); localStorage.removeItem('moria_user'); }}
            onCancelBooking={(id) => !isMockMode && updateDoc(doc(db, "bookings", id), {status: 'cancelled'})}
            onGoToProfile={() => setView(View.CUSTOMER_PROFILE)}
            waitlist={waitlist.filter(w => w.customerId === currentUser.id && w.status !== 'cancelled')}
            onRemoveWaitlist={(id) => !isMockMode && deleteDoc(doc(db, "waitlist", id))}
            promotions={promotions}
            onPlaceOrder={handlePlaceOrder}
            onAddInterest={handleAddInterest}
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
              if (!auth.currentUser) await ensureAuthenticated();
              const id = auth.currentUser!.uid;
              const finalCpf = c.trim() || `S/C-${id.toUpperCase().substring(0, 8)}`;
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

              const user: Customer = { 
                id, 
                name: n, 
                whatsapp: w, 
                cpf: finalCpf, 
                password: p, 
                receivesNotifications: not, 
                agreedToTerms: true, 
                history: [],
                createdAt: new Date().toISOString(),
                createdBy: 'client'
              };
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
          pendingUser={pendingPasswordChangeUser}
          onPasswordChange={async (newPass) => {
            if (pendingPasswordChangeUser) {
              try {
                await updateDoc(doc(db, "customers", pendingPasswordChangeUser.id), {
                  password: newPass,
                  mustChangePassword: false
                });
                const updatedUser = { ...pendingPasswordChangeUser, password: newPass, mustChangePassword: false };
                setCurrentUser(updatedUser);
                setPendingPasswordChangeUser(null);
                setCustomerInitialTab('home');
                setView(View.CUSTOMER_DASHBOARD);
                alert("Senha alterada com sucesso! Bem-vinda.");
              } catch (err) {
                console.error("Erro ao alterar senha:", err);
                alert("Erro ao alterar senha. Tente novamente.");
              }
            }
          }}
          onLogin={async (identifier, pass) => {
            const cleanInput = identifier.replace(/\D/g, '');
            
            // Try local search first (WhatsApp or CPF)
            let user = customers.find(c => {
              const cleanWa = c.whatsapp.replace(/\D/g, '');
              const cleanCpf = c.cpf.replace(/\D/g, '');
              return (cleanWa === cleanInput || cleanCpf === cleanInput) && c.password === pass;
            });
            
            // If not found and list might be empty due to permissions, try direct query
            if (!user && !isMockMode) {
              try {
                // Try WhatsApp
                const qWa = query(collection(db, "customers"), where("whatsapp", "==", cleanInput));
                const snapWa = await getDocs(qWa);
                if (!snapWa.empty) {
                  const found = snapWa.docs[0].data() as Customer;
                  if (found.password === pass) {
                    user = { ...found, id: snapWa.docs[0].id };
                  }
                }

                // If still not found, try CPF
                if (!user) {
                  const qCpf = query(collection(db, "customers"), where("cpf", "==", identifier)); // CPF might have dots/dashes in DB
                  const snapCpf = await getDocs(qCpf);
                  if (!snapCpf.empty) {
                    const found = snapCpf.docs[0].data() as Customer;
                    if (found.password === pass) {
                      user = { ...found, id: snapCpf.docs[0].id };
                    }
                  }
                }
              } catch (err) {
                console.error("Erro na consulta de login:", err);
              }
            }

            if (user) { 
              if (user.mustChangePassword) {
                setPendingPasswordChangeUser(user);
                setView(View.CUSTOMER_LOGIN); // Keep in login view but we'll show the change form
                return;
              }
              setCurrentUser(user); 
              setCustomerInitialTab('home');
              setView(View.CUSTOMER_DASHBOARD); 
            }
            else alert("Acesso inválido ou senha incorreta.");
          }} 
          onRegisterClick={() => { setPendingPasswordChangeUser(null); setView(View.CUSTOMER_REGISTER); }} 
          onBack={() => { setPendingPasswordChangeUser(null); setView(View.CUSTOMER_HOME); }} 
        />
      );
      default: return (
        <CustomerHome 
          settings={settings} 
          services={services} 
          bookings={bookings} 
          promotions={promotions}
          inventory={inventory}
          currentUser={currentUser}
          onBook={handleBook} 
          onAuthClick={() => setView(View.CUSTOMER_LOGIN)} 
          onLoginSuccess={() => setView(View.CUSTOMER_DASHBOARD)}
          onAddToWaitlist={handleAddToWaitlist}
          onPlaceOrder={handlePlaceOrder}
          onAddInterest={handleAddInterest}
          onQuickRegister={async (name, whatsapp, bookingId, serviceId, isWaitlist, isPackageSession) => {
            const cleanWhatsapp = whatsapp.replace(/\D/g, '');
            if (isMockMode) {
              const mockUser = { id: 'mock', name, whatsapp: cleanWhatsapp, cpf: '000', password: '000', receivesNotifications: true, agreedToTerms: true, history: [] };
              setCurrentUser(mockUser);
              setCustomerInitialTab('agenda');
              return { password: "1234", isNew: true }; 
            }
            try {
              if (!auth.currentUser) await ensureAuthenticated();
              const q = query(collection(db, "customers"), where("whatsapp", "==", cleanWhatsapp));
              const snap = await getDocs(q);
              
              let user: Customer;
              let randomPass = null;
              let isNew = false;

              if (!snap.empty) {
                user = { ...snap.docs[0].data(), id: snap.docs[0].id } as Customer;
              } else {
                isNew = true;
                const id = auth.currentUser!.uid;
                randomPass = Math.floor(1000 + Math.random() * 9000).toString();
                user = {
                  id,
                  name,
                  whatsapp: cleanWhatsapp,
                  cpf: `S/C-${id.toUpperCase().substring(0, 8)}`,
                  password: randomPass, 
                  receivesNotifications: true,
                  agreedToTerms: true,
                  history: [],
                  createdAt: new Date().toISOString(),
                  createdBy: 'client'
                };
                await setDoc(doc(db, "customers", id), user);
                console.log("Novo cliente cadastrado:", user.id);
              }

              // Handle Booking
              if (bookingId && serviceId && !isWaitlist) {
                const service = services.find(s => s.id === serviceId);
                await updateDoc(doc(db, "bookings", bookingId), {
                  customerId: user.id,
                  customerName: user.name,
                  serviceId: serviceId,
                  serviceName: service?.name || 'Procedimento',
                  originalPrice: isPackageSession ? 0 : (service?.price || 0),
                  duration: service?.duration || 30,
                  status: 'pending',
                  depositStatus: isPackageSession ? 'paid' : 'pending',
                  isPackageSession: !!isPackageSession,
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
          isFirebaseConnected={isFirebaseConnected}
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
