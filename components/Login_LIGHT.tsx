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
  const [carEmoji, setCarEmoji] = useState('🚗');
  
  // Admin setup form states
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const t = translations[lang];

  useEffect(() => {
    const interval = setInterval(() => {
      setCarEmoji(prev => prev === '🚗' ? '🏎️' : '🚗');
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First try to authenticate with email using Supabase Auth
      let authEmail = identifier;
      
      // If identifier is a username, find the corresponding email
      if (!identifier.includes('@')) {
        const { data: workerData } = await supabase
          .from('workers')
          .select('email')
          .eq('username', identifier)
          .maybeSingle();
        
        if (workerData?.email) {
          authEmail = workerData.email;
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

      // Get worker data to get the role
      const { data: workerData } = await supabase
        .from('workers')
        .select('id, role, type, fullname, username')
        .eq('email', authEmail)
        .maybeSingle();

      if (workerData) {
        // Store user info in localStorage
        localStorage.setItem('autolux_role', workerData.role);
        localStorage.setItem('autolux_user_name', workerData.fullname);
        onLogin(workerData.role as Role);
        return;
      }
      setError('Worker profile not found');
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
        setError('Failed to create worker profile');
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-40 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-40 left-20 w-80 h-80 bg-violet-200 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 md:p-10 backdrop-blur-xl">
          
          {/* Logo section */}
          <div className="flex flex-col items-center mb-8">
            {showroomLogo ? (
              <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-lg mb-4 border border-slate-200">
                <img src={showroomLogo} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl mb-4 shadow-lg">
                🚗
              </div>
            )}
            <h1 className="text-3xl font-black text-slate-900 text-center">
              {showroomName || 'Showroom'}
            </h1>
            {showroomSlogan && (
              <p className="text-sm text-indigo-600 font-bold mt-2 text-center">{showroomSlogan}</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode('setup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${
                mode === 'setup'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Setup Admin
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-2xl">❌</span>
              <p className="text-red-700 font-bold text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-2xl">✅</span>
              <p className="text-emerald-700 font-bold text-sm">{success}</p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Username or Email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isLoading ? 'Logging in...' : `Login ${carEmoji}`}
              </button>
            </form>
          )}

          {/* Setup Form */}
          {mode === 'setup' && (
            <form onSubmit={handleAdminSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Username</label>
                <input
                  type="text"
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  placeholder="Choose a username"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isLoading ? 'Setting up...' : `Create Admin Account ${carEmoji}`}
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 font-bold mt-6 uppercase tracking-widest">
            🔒 Secure Authentication
          </p>
        </div>
      </div>
    </div>
  );
};
