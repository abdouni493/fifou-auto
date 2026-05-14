import React, { useState, useEffect } from 'react';
import { CustomButton } from './CustomButton';
import { Role, Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface LoginProps {
  onLogin: (role: Role) => void;
  lang: Language;
  showroomLogo?: string;
  showroomName?: string;
  showroomSlogan?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, lang, showroomLogo, showroomName, showroomSlogan }) => {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Admin setup form states
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const t = translations[lang];



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Single query: get email + role together (eliminates N+1)
      let authEmail = identifier;
      let workerRole = 'admin';
      let workerId = '';
      let workerName = '';
      
      // If identifier is a username, find the corresponding email + role in ONE query
      if (!identifier.includes('@')) {
        const { data: workerData } = await supabase
          .from('workers')
          .select('email, role, id, fullname')
          .eq('username', identifier)
          .maybeSingle();
        
        if (workerData?.email) {
          authEmail = workerData.email;
          workerRole = workerData.role || 'admin';
          workerId = workerData.id;
          workerName = workerData.fullname;
        } else {
          setError('Invalid username or password');
          setIsLoading(false);
          return;
        }
      }

      // Authenticate using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: password
      });

      if (authError || !authData.user) {
        setError('Invalid username or password');
        return;
      }

      // Only fetch worker data if we haven't already (optimized lookup)
      if (!workerId) {
        const { data: workerData } = await supabase
          .from('workers')
          .select('id, role, fullname, username')
          .eq('email', authEmail)
          .maybeSingle();

        if (workerData) {
          workerId = workerData.id;
          workerRole = workerData.role;
          workerName = workerData.fullname;
        }
      }

      if (workerId && workerName) {
        // Store user info in localStorage
        localStorage.setItem('autolux_role', workerRole);
        localStorage.setItem('autolux_user_id', workerId);
        localStorage.setItem('autolux_user_name', workerName);
        onLogin(workerRole as Role);
        return;
      }
      
      // If worker record doesn't exist but auth succeeded, create it
      if (!workerId && identifier) {
        try {
          // Try to create worker record
          const { error: createError } = await supabase.from('workers').insert({
            id: authData.user.id,
            email: authEmail,
            fullname: authEmail.split('@')[0],
            username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
            role: 'admin',
            type: 'admin',
            amount: 0,
            payment_type: 'monthly',
            telephone: '',
            address: '',
            permissions: '[]'
          });

          if (!createError) {
            localStorage.setItem('autolux_role', 'admin');
            localStorage.setItem('autolux_user_id', authData.user.id);
            localStorage.setItem('autolux_user_name', authEmail);
            onLogin('admin');
            return;
          }
        } catch (err) {
          console.warn('Could not create worker record:', err);
        }
      }
      
      // If we got here but auth succeeded, still log them in as admin
      localStorage.setItem('autolux_role', 'admin');
      localStorage.setItem('autolux_user_id', authData.user.id);
      localStorage.setItem('autolux_user_name', authEmail);
      onLogin('admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!adminForm.fullName || !adminForm.username || !adminForm.email || !adminForm.password) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existing } = await supabase.from('workers').select('id').eq('username', adminForm.username).maybeSingle();
      if (existing) {
        setError('Username already exists');
        setIsLoading(false);
        return;
      }

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminForm.email,
        password: adminForm.password,
        options: {
          data: {
            full_name: adminForm.fullName
          }
        }
      });

      if (authError) {
        setError(authError.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create account');
        setIsLoading(false);
        return;
      }

      // Create worker profile
      const { error: insertError } = await supabase.from('workers').insert({
        id: authData.user.id,
        fullname: adminForm.fullName,
        username: adminForm.username,
        email: adminForm.email,
        role: 'admin',
        type: 'admin',
        amount: 0,
        payment_type: 'monthly',
        telephone: '',
        address: '',
        permissions: JSON.stringify([])
      });

      if (insertError) {
        console.error('Worker insert error:', insertError);
        // Even if worker creation fails, auth user was created successfully
        // User can still login, trigger might create worker later
        setSuccess('Account created! You can now login.');
        setTimeout(() => {
          setAdminForm({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
          setMode('login');
          setSuccess(null);
        }, 3000);
        setIsLoading(false);
        return;
      }

      setSuccess('Admin account created! Please login.');
      setTimeout(() => {
        setAdminForm({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
        setMode('login');
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Setup error:', err);
      setError('An error occurred during setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium animated background elements with deeper red */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-red-700 rounded-full blur-[100px] opacity-15 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-600 rounded-full blur-[100px] opacity-10 animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-red-800 rounded-full blur-[100px] opacity-8 animate-blob" style={{ animationDelay: '4s' }}></div>

      {/* Enhanced grid pattern overlay with darker red */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Sophisticated animated rays */}
      <div className="absolute top-0 left-1/2 w-0.5 h-96 bg-gradient-to-b from-red-600 via-red-700 to-transparent opacity-25 blur-xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/3 w-0.5 h-96 bg-gradient-to-t from-red-700 via-red-600 to-transparent opacity-20 blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 right-0 w-0.5 h-80 bg-gradient-to-l from-red-600 to-transparent opacity-15 blur-xl animate-pulse" style={{ animationDelay: '2.5s' }}></div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md group perspective">
        {/* Enhanced glow wrapper */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-all duration-500 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-b from-slate-900/95 via-black to-black rounded-3xl shadow-2xl border border-red-600/40 p-8 md:p-10 backdrop-blur-2xl hover:border-red-600/60 transition-all duration-500">
          
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent rounded-t-3xl opacity-50"></div>
          
          {/* Logo section */}
          <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            {showroomLogo ? (
              <div className="relative mb-8 inline-flex p-5 rounded-[2.5rem] bg-gradient-to-br from-red-600/25 to-black/50 backdrop-blur-lg shadow-2xl shadow-red-600/30 group border border-red-600/50 hover:border-red-500/80 transition-all duration-500 hover:shadow-3xl hover:shadow-red-500/40">
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-[2.5rem] border-2 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)] opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="absolute inset-0 rounded-[2.5rem] ring-8 ring-red-600/20 animate-pulse group-hover:ring-red-500/40 transition-all duration-500"></div>
                
                {/* Logo Image with smooth animation */}
                <img src={showroomLogo} className="h-24 w-auto max-w-[240px] object-contain rounded-2xl relative z-10 drop-shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(220,38,38,0.9)] animate-in zoom-in-50 fill-mode-backwards" style={{ animationDelay: '0.2s' }} />
              </div>
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-6xl mb-6 shadow-2xl shadow-red-600/50 animate-in zoom-in-50 duration-700 hover:shadow-red-500/70 transition-all hover:scale-105 group border border-red-500/50 hover:border-red-400" style={{ animationDelay: '0.1s' }}>
                🚙
              </div>
            )}
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-600 text-center animate-in fade-in duration-500 drop-shadow-lg" style={{ animationDelay: '0.3s' }}>
              {showroomName || 'AutoLux'}
            </h1>
            {showroomSlogan && (
              <p className="text-sm text-red-400/90 font-bold mt-3 text-center animate-in fade-in duration-500 uppercase tracking-wider" style={{ animationDelay: '0.4s' }}>{showroomSlogan}</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2.5 mb-10 p-2 bg-slate-900/70 border border-red-600/30 rounded-xl backdrop-blur-lg animate-in fade-in duration-500 hover:border-red-600/50 transition-all" style={{ animationDelay: '0.5s' }}>
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-lg font-black text-sm transition-all duration-300 uppercase tracking-wider ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg shadow-red-600/50 scale-105 hover:shadow-red-500/60'
                  : 'text-red-400/70 hover:text-red-400 hover:bg-red-600/15'
              }`}
            >
              🔓 Connexion
            </button>
            <button
              onClick={() => { setMode('setup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-lg font-black text-sm transition-all duration-300 uppercase tracking-wider ${
                mode === 'setup'
                  ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg shadow-red-600/50 scale-105 hover:shadow-red-500/60'
                  : 'text-red-400/70 hover:text-red-400 hover:bg-red-600/15'
              }`}
            >
              ⚙️ Configuration
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-5 bg-red-600/20 border border-red-600/60 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-lg shadow-lg shadow-red-600/20 hover:border-red-600/80 transition-all">
              <span className="text-3xl animate-bounce">❌</span>
              <p className="text-red-200 font-bold text-sm flex-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-5 bg-emerald-600/20 border border-emerald-600/60 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-lg shadow-lg shadow-emerald-600/20 hover:border-emerald-600/80 transition-all">
              <span className="text-3xl animate-bounce">✅</span>
              <p className="text-emerald-200 font-bold text-sm flex-1">Succès! Connexion en cours...</p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500" style={{ animationDelay: '0.6s' }}>
              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">🔑 Utilisateur ou Email</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@autolux.local"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                  <div className="absolute right-4 top-3.5 text-red-500/40 group-hover:text-red-500/60 transition-colors">🔑</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">🔒 Mot de passe</label>
                <div className="relative group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                  <div className="absolute right-4 top-3.5 text-red-500/40 group-hover:text-red-500/60 transition-colors">🔒</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden rounded-xl py-4 font-black uppercase text-sm tracking-widest transition-all duration-300 animate-in fade-in mt-8"
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                
                {/* Dynamic shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                
                {/* Enhanced glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
                
                {/* Content with smooth animations */}
                <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                  <span className={`text-2xl transition-all duration-300 ${isLoading ? 'animate-spin' : 'group-hover:scale-125 group-hover:animate-bounce'}`}>
                    {isLoading ? '⏳' : '🔐'}
                  </span>
                  <span className="transition-all duration-300 group-hover:tracking-[0.2em] text-base">
                    {isLoading ? 'Connexion...' : 'Se Connecter'}
                  </span>
                </div>
                
                {/* Disabled state overlay */}
                {(isLoading || !identifier || !password) && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl backdrop-blur-sm"></div>
                )}
              </button>
            </form>
          )}

          {/* Setup Form */}
          {mode === 'setup' && (
            <form onSubmit={handleAdminSetup} className="space-y-5 animate-in fade-in duration-500" style={{ animationDelay: '0.6s' }}>
              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">👤 Nom Complet</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">📝 Nom d'utilisateur</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    placeholder="johndoe"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">📧 Email</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="john@autolux.local"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">🔒 Mot de passe</label>
                <div className="relative group">
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-red-400/90 mb-3 uppercase tracking-wider">🔐 Confirmer Mot de passe</label>
                <div className="relative group">
                  <input
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md group-hover:border-red-600/60 group-hover:bg-slate-900/80"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden rounded-xl py-4 font-black uppercase text-sm tracking-widest transition-all duration-300 animate-in fade-in mt-8"
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                
                {/* Dynamic shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                
                {/* Enhanced glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
                
                {/* Content with smooth animations */}
                <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                  <span className={`text-2xl transition-all duration-300 ${isLoading ? 'animate-spin' : 'group-hover:scale-125 group-hover:animate-bounce'}`}>
                    {isLoading ? '⏳' : '⚙️'}
                  </span>
                  <span className="transition-all duration-300 group-hover:tracking-[0.2em] text-base">
                    {isLoading ? 'Configuration...' : 'Créer Admin'}
                  </span>
                </div>
                
                {/* Disabled state overlay */}
                {(isLoading || !adminForm.fullName || !adminForm.username || !adminForm.email || !adminForm.password) && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl backdrop-blur-sm"></div>
                )}
              </button>
            </form>
          )}

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent rounded-b-3xl opacity-50"></div>

         
        </div>
      </div>
    </div>
  );
};
