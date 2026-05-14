
import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Suppliers } from './components/Suppliers';
import { Team } from './components/Team';
import { Expenses } from './components/Expenses';
import { Maintenance } from './components/Maintenance';
import { Reports } from './components/Reports';
import { Purchase } from './components/Purchase';
import { Showroom } from './components/Showroom';
import { POS } from './components/POS';
import { Inspection } from './components/Inspection';
import { Dashboard } from './components/Dashboard';
import { Config } from './components/Config';
import { Billing } from './components/Billing';
import { WorkerPayments } from './components/WorkerPayments';
import { Receipts } from './components/Receipts';
import { Clients } from './components/Clients';
import { Role, Language, PurchaseRecord } from './types';
import { translations } from './translations';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>((localStorage.getItem('autolux_lang') as Language) || 'fr');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeItem, setActiveItem] = useState(localStorage.getItem('autolux_active_item') || 'dashboard');
  const [editingCar, setEditingCar] = useState<PurchaseRecord | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showroomConfig, setShowroomConfig] = useState<any>(null);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('autolux_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('autolux_active_item', activeItem);
  }, [activeItem]);

  const fetchGlobalConfig = async () => {
    try {
      const { data, error } = await supabase.from('showroom_config').select('*').eq('id', 1).maybeSingle();
      if (error) {
        console.error('Error fetching showroom config:', error);
        return;
      }
      if (data) setShowroomConfig(data);
    } catch (err) {
      console.error('Failed to fetch showroom config:', err);
    }
  };

  useEffect(() => {
    fetchGlobalConfig();
    const checkAuth = async () => {
      try {
        // Get current session immediately
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('Session error (this is normal on first load):', sessionError.message);
        }
        
        // If session exists, refresh it to get a fresh token
        if (session?.user) {
          try {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn('Session refresh warning:', refreshError.message);
              // Use the original session if refresh fails
            } else if (refreshed?.session) {
              session = refreshed.session;
              console.log('Session refreshed successfully');
            }
          } catch (refreshErr) {
            console.warn('Session refresh error:', refreshErr);
            // Continue with original session
          }
        }
        
        // Set userId from session
        if (session?.user) {
          setUserId(session.user.id);
          console.log('App.tsx: Session found, userId set to:', session.user.id);
        } else {
          console.log('App.tsx: No active session found');
          setUserId(null);
        }

        // Check localStorage for saved role
        const savedRole = localStorage.getItem('autolux_role');
        const savedUserName = localStorage.getItem('autolux_user_name');
        if (savedRole) {
          setRole(savedRole as Role);
          if (savedUserName) setUserName(savedUserName);
          setIsInitializing(false);
          return;
        }

        // If no saved role, fetch from workers table with error handling
        if (session?.user) {
          try {
            const { data: worker, error: workerError } = await supabase.from('workers').select('id, role, fullname').eq('id', session.user.id).maybeSingle();
            if (workerError) {
              console.warn('Worker fetch error:', workerError.message);
              setRole('admin');
              localStorage.setItem('autolux_role', 'admin');
              setUserName('Admin');
            } else if (worker) {
              const userRole = (worker?.role as Role) || 'admin';
              setRole(userRole);
              setUserName(worker?.fullname || 'User');
              localStorage.setItem('autolux_role', userRole);
              localStorage.setItem('autolux_user_id', worker?.id || session.user.id);
              localStorage.setItem('autolux_user_name', worker?.fullname || 'User');
            } else {
              // Worker record doesn't exist yet (trigger may not have fired)
              // Default to admin for new signups
              console.log('Worker record not found, using default admin role');
              setRole('admin');
              localStorage.setItem('autolux_role', 'admin');
              localStorage.setItem('autolux_user_id', session.user.id);
              localStorage.setItem('autolux_user_name', 'Admin');
            }
          } catch (workerErr) {
            console.error('Worker fetch failed:', workerErr);
            setRole('admin');
            localStorage.setItem('autolux_role', 'admin');
          }
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        // Try to use saved role as fallback
        const savedRole = localStorage.getItem('autolux_role');
        if (savedRole) {
          setRole(savedRole as Role);
          const savedName = localStorage.getItem('autolux_user_name');
          if (savedName) {
            setUserName(savedName);
          }
        } else {
          setRole(null);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuth();

    // Subscribe to auth changes to update userId when user logs in/out
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, 'Session:', session?.user?.id);
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    // Clear local state FIRST for instant UI response
    localStorage.removeItem('autolux_role');
    localStorage.removeItem('autolux_user_id');
    localStorage.removeItem('autolux_user_name');
    localStorage.removeItem('autolux_active_item');
    setRole(null);
    setUserName(null);
    setUserId(null);
    setActiveItem('dashboard');
    
    // Then sign out from Supabase in background (non-blocking)
    supabase.auth.signOut().catch(console.error);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🏎️</div>
        </div>
      </div>
    );
  }

  if (!role) return <Login onLogin={(r) => { setRole(r); fetchGlobalConfig(); }} lang={lang} showroomLogo={showroomConfig?.logo_url || showroomConfig?.logo_data} showroomName={showroomConfig?.name} showroomSlogan={showroomConfig?.slogan} />;

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex">
      <Sidebar
        isOpen={isSidebarOpen}
        lang={lang}
        role={role}
        activeItem={activeItem}
        onSelectItem={(id) => setActiveItem(id)}
        onClose={() => setIsSidebarOpen(false)}
        showroomLogo={showroomConfig?.logo_url || showroomConfig?.logo_data}
        showroomName={showroomConfig?.name}
      />
      <div className={`flex-grow flex flex-col transition-all duration-500 ${isSidebarOpen ? (lang === 'ar' ? 'md:mr-[280px]' : 'md:ml-[280px]') : ''}`}>
        <Navbar lang={lang} role={role} userName={userName || undefined} onToggleLang={() => setLang(l => l === 'fr' ? 'ar' : 'fr')} onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        <main className="p-4 md:p-8 mt-20 h-[calc(100vh-80px)] overflow-hidden">
          <div className="rounded-[2.5rem] shadow-2xl shadow-red-600/20 border border-red-600/40 p-6 md:p-10 h-full overflow-y-auto custom-scrollbar bg-gradient-to-br from-slate-950 via-black to-slate-950">
            {activeItem === 'config' ? <Config lang={lang} onConfigUpdate={fetchGlobalConfig} /> : 
             activeItem === 'dashboard' ? <Dashboard lang={lang} onNavigate={setActiveItem} /> :
             activeItem === 'showroom' ? <Showroom lang={lang} onNavigateToPurchase={() => setActiveItem('purchase')} onEdit={(c) => { setEditingCar(c); setActiveItem('purchase'); }} /> :
             activeItem === 'purchase' ? <Purchase lang={lang} initialEditRecord={editingCar} onClearEdit={() => setEditingCar(null)} userName={userName || undefined} /> :
             activeItem === 'receipts' ? <Receipts lang={lang} showroom={showroomConfig} userId={userId || undefined} /> :
             activeItem === 'pos' ? <POS lang={lang} userName={userName || undefined} /> :
             activeItem === 'clients' ? <Clients lang={lang} /> :
             activeItem === 'checkin' ? <Inspection lang={lang} /> :
             activeItem === 'suppliers' ? <Suppliers lang={lang} /> :
             activeItem === 'team' ? <Team lang={lang} /> :
             activeItem === 'expenses' ? <Expenses lang={lang} userName={userName || undefined} /> :
             activeItem === 'reports' ? <Reports lang={lang} /> :
             activeItem === 'billing' ? <Billing lang={lang} /> :
             activeItem === 'worker-payments' ? <WorkerPayments lang={lang} /> : null
            }
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
