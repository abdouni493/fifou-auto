
import React, { useState } from 'react';
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
      const { data: workerData } = await supabase.from('workers').select('id, role, type, fullname, username').or(`username.eq."${identifier}",email.eq."${identifier}"`).eq('password', password).maybeSingle();
      if (workerData) {
        // Use role if available, otherwise fall back to type
        const userRole = (workerData.role || workerData.type || 'worker').toLowerCase();
        localStorage.setItem('autolux_role', userRole);
        localStorage.setItem('autolux_user_name', workerData.fullname || workerData.username);
        onLogin(userRole as Role);
        return;
      }

      let loginEmail = identifier;
      if (!identifier.includes('@')) {
        const { data: profileLookup } = await supabase.from('profiles').select('email, username').eq('username', identifier).maybeSingle();
        if (profileLookup?.email) loginEmail = profileLookup.email;
        else throw new Error("Identifiants invalides.");
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: password });
      if (authError) throw new Error("Identifiants invalides.");

      if (data.user) {
        const { data: profileData } = await supabase.from('profiles').select('role, username').eq('id', data.user.id).maybeSingle();
        const role = (profileData?.role as Role) || 'admin';
        localStorage.setItem('autolux_role', role);
        localStorage.setItem('autolux_user_name', profileData?.username || identifier);
        onLogin(role);
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation
      if (!adminForm.fullName.trim()) throw new Error("Le nom complet est requis.");
      if (!adminForm.username.trim()) throw new Error("Le nom d'utilisateur est requis.");
      if (!adminForm.email.trim()) throw new Error("L'email est requis.");
      if (adminForm.password.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      if (adminForm.password !== adminForm.confirmPassword) throw new Error("Les mots de passe ne correspondent pas.");

      // Check if username already exists
      const { data: existingUser } = await supabase.from('workers').select('id').eq('username', adminForm.username).maybeSingle();
      if (existingUser) throw new Error("Ce nom d'utilisateur existe déjà.");

      // Create auth user with sign up (client-side method)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminForm.email,
        password: adminForm.password,
        options: {
          data: {
            full_name: adminForm.fullName,
            username: adminForm.username,
            role: 'admin'
          }
        }
      });

      if (signUpError) throw new Error(`Erreur création compte: ${signUpError.message}`);
      if (!signUpData?.user?.id) throw new Error("Impossible de créer le compte.");

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: signUpData.user.id,
        username: adminForm.username,
        full_name: adminForm.fullName,
        role: 'admin'
      }]);

      if (profileError) throw new Error(`Erreur création profil: ${profileError.message}`);

      // Create worker entry (optional, for consistency)
      const { error: workerError } = await supabase.from('workers').insert([{
        fullname: adminForm.fullName,
        username: adminForm.username,
        email: adminForm.email,
        password: adminForm.password,
        type: 'Admin',
        role: 'admin',
        payment_type: 'month',
        amount: 0,
        telephone: '',
        created_by: 'system'
      }]);

      if (workerError) console.warn('Worker entry creation note:', workerError);

      // Check if email confirmation is required
      const requiresConfirmation = !signUpData.session;
      
      if (requiresConfirmation) {
        setSuccess('✅ Compte admin créé! Un email de confirmation a été envoyé. Veuillez confirmer votre email pour vous connecter.');
      } else {
        setSuccess('✅ Compte admin créé avec succès! Vous pouvez maintenant vous connecter.');
      }
      setAdminForm({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
      
      // Auto-switch to login after 2 seconds
      setTimeout(() => {
        setMode('login');
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du compte.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfd] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
      <div className="w-full max-w-[440px] z-10 p-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[3rem] shadow-2xl p-12 space-y-10 animate-in zoom-in-95 duration-700">
          <div className="text-center">
            <div className="h-24 w-24 rounded-[2.5rem] bg-slate-900 mx-auto mb-6 flex items-center justify-center shadow-xl overflow-hidden">
              {showroomLogo ? <img src={showroomLogo} className="w-full h-full object-cover" /> : <span className="text-4xl">🏎️</span>}
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">{showroomName || 'AutoLux'}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">{showroomSlogan || 'Management Cloud'}</p>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-3 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                mode === 'login' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              🔐 Connexion
            </button>
            <button
              onClick={() => { setMode('setup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                mode === 'setup' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              ➕ Setup Admin
            </button>
          </div>

          {/* Login Mode */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-4 rounded-2xl text-[10px] font-black uppercase text-center bg-red-50 text-red-600">⚠️ {error}</div>}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{t.username}</label>
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full bg-slate-50 px-8 py-5 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{t.password}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 px-8 py-5 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" required />
              </div>
              <button disabled={isLoading} className="w-full custom-gradient-btn py-6 rounded-[2rem] text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all mt-4">{isLoading ? "Ouverture de session..." : t.loginBtn}</button>
            </form>
          )}

          {/* Admin Setup Mode */}
          {mode === 'setup' && (
            <form onSubmit={handleAdminSetup} className="space-y-4">
              {error && <div className="p-3 rounded-2xl text-[10px] font-black uppercase text-center bg-red-50 text-red-600">⚠️ {error}</div>}
              {success && <div className="p-3 rounded-2xl text-[10px] font-black uppercase text-center bg-green-50 text-green-600">{success}</div>}
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">👤 Nom Complet</label>
                <input 
                  type="text" 
                  value={adminForm.fullName} 
                  onChange={(e) => setAdminForm({...adminForm, fullName: e.target.value})} 
                  className="w-full bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" 
                  placeholder="ex: Jean Admin"
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">📝 Nom d'utilisateur</label>
                <input 
                  type="text" 
                  value={adminForm.username} 
                  onChange={(e) => setAdminForm({...adminForm, username: e.target.value})} 
                  className="w-full bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" 
                  placeholder="ex: admin_jean"
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">📧 Email</label>
                <input 
                  type="email" 
                  value={adminForm.email} 
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})} 
                  className="w-full bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" 
                  placeholder="ex: admin@autolux.com"
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">🔒 Mot de passe</label>
                <input 
                  type="password" 
                  value={adminForm.password} 
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})} 
                  className="w-full bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" 
                  placeholder="Minimum 6 caractères"
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">✅ Confirmer mot de passe</label>
                <input 
                  type="password" 
                  value={adminForm.confirmPassword} 
                  onChange={(e) => setAdminForm({...adminForm, confirmPassword: e.target.value})} 
                  className="w-full bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 outline-none focus:border-blue-500 transition-all font-bold" 
                  placeholder="Confirmer le mot de passe"
                  required 
                />
              </div>

              <button 
                disabled={isLoading} 
                className="w-full custom-gradient-btn py-5 rounded-[2rem] text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all mt-6"
              >
                {isLoading ? "Création en cours..." : "🎉 Créer Compte Admin"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
