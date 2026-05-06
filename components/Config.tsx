
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { uploadImageToBucket } from '../utils';

interface ConfigProps {
  lang: Language;
  onConfigUpdate: () => void;
}

export const Config: React.FC<ConfigProps> = ({ lang, onConfigUpdate }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'store' | 'profile' | 'system'>('store');
  const [loading, setLoading] = useState(false);
  
  // Showroom State
  const [showroom, setShowroom] = useState({
    name: '', slogan: '', address: '', facebook: '', instagram: '', whatsapp: '', logo_url: ''
  });

  // Profile State
  const [profile, setProfile] = useState({
    id: '', email: '', username: '', role: '', password: ''
  });

  useEffect(() => {
    fetchConfig();
    fetchUserProfile();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from('showroom_config').select('*').eq('id', 1).maybeSingle();
    if (data) setShowroom(data);
  };

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile({
        id: user.id,
        email: user.email || '',
        username: prof?.username || '',
        role: prof?.role || 'admin',
        password: ''
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImageToBucket('showroom-logo', file);
      setShowroom(prev => ({ ...prev, logo_url: url }));
    } catch (err) {
      console.error('Logo upload failed:', err);
      alert('Erreur lors du téléchargement du logo');
    }
  };

  const saveShowroomConfig = async () => {
    setLoading(true);
    try {
      // First try to update; check whether any rows were affected
      const { data: updatedRows, error: updateError } = await supabase
        .from('showroom_config')
        .update({
          name: showroom.name,
          slogan: showroom.slogan,
          address: showroom.address,
          facebook: showroom.facebook,
          instagram: showroom.instagram,
          whatsapp: showroom.whatsapp,
          logo_url: showroom.logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select();

      // If update produced an error, throw
      if (updateError) throw updateError;

      // If update succeeded but didn't affect any rows, insert the row
      if (!updatedRows || (Array.isArray(updatedRows) && updatedRows.length === 0)) {
        const { error: insertError } = await supabase
          .from('showroom_config')
          .insert([{
            id: 1,
            name: showroom.name,
            slogan: showroom.slogan,
            address: showroom.address,
            facebook: showroom.facebook,
            instagram: showroom.instagram,
            whatsapp: showroom.whatsapp,
            logo_url: showroom.logo_url,
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      console.log('✅ Configuration du showroom mise à jour !');
      alert("Configuration du showroom mise à jour avec succès ! 🎉");
      onConfigUpdate();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert("Erreur lors de la sauvegarde: " + err.message);
    }
    setLoading(false);
  };

  const saveProfileUpdate = async () => {
    setLoading(true);
    try {
      // 1. Update Auth Email/Password
      if (profile.password) {
        await supabase.auth.updateUser({ password: profile.password });
      }
      if (profile.email) {
        await supabase.auth.updateUser({ email: profile.email });
      }
      // 2. Update Profile Table (Username)
      await supabase.from('profiles').update({ username: profile.username }).eq('id', profile.id);
      alert("Profil mis à jour avec succès !");
    } catch (err: any) {
      alert("Erreur profil: " + err.message);
    }
    setLoading(false);
  };

  const handleBackup = async () => {
    setLoading(true);
    const tables = ['purchases', 'sales', 'suppliers', 'workers', 'expenses', 'inspections', 'showroom_config'];
    const backupData: any = {};
    
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backupData[table] = data;
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autolux_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setLoading(false);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("AVERTISSEMENT : Cela écrasera toutes vos données actuelles. Continuer ?")) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        for (const [table, rows] of Object.entries(data)) {
          // Suppression sécurisée (certaines tables peuvent échouer si RLS est strict)
          await supabase.from(table).delete().neq('id', '0'); 
          // Insertion massive
          if (Array.isArray(rows) && rows.length > 0) {
            await supabase.from(table).insert(rows);
          }
        }
        alert("Restauration terminée ! L'application va redémarrer.");
        window.location.reload();
      } catch (err) {
        alert("Fichier de sauvegarde invalide.");
      }
    };
    reader.readAsText(file);
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex justify-center">
         <div className="bg-slate-100 p-2 rounded-[2.5rem] flex gap-2 shadow-inner">
            {[
              { id: 'store', label: 'Boutique', icon: '🏪' },
              { id: 'profile', label: 'Compte', icon: '👤' },
              { id: 'system', label: 'Système', icon: '⚙️' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-10 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
         </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
         {activeTab === 'store' && (
           <div className="p-12 md:p-16 space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
                 <div className="md:col-span-4 flex flex-col items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Logo du Showroom</label>
                    <div className="relative group w-56 h-56">
                       <div className="w-full h-full rounded-[4.5rem] bg-slate-50 border-4 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all cursor-pointer hover:border-blue-500 group">
                          {showroom.logo_url ? (
                            <img src={showroom.logo_url} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-5xl opacity-20">🏎️</span>
                          )}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <span className="text-white font-black text-[10px] uppercase tracking-widest">Changer le Logo</span>
                          </div>
                       </div>
                       <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} />
                    </div>
                 </div>
                 
                 <div className="md:col-span-8 space-y-8">
                    <ConfigInput label="Nom Commercial" value={showroom.name} onChange={(v:string)=>setShowroom({...showroom, name: v})} icon="🏷️" />
                    <ConfigInput label="Slogan Publicitaire" value={showroom.slogan} onChange={(v:string)=>setShowroom({...showroom, slogan: v})} icon="✨" />
                    <ConfigInput label="Localisation Showroom" value={showroom.address} onChange={(v:string)=>setShowroom({...showroom, address: v})} icon="📍" />
                 </div>
              </div>

              <div className="pt-16 border-t border-slate-50">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 text-center">Contacts & Réseaux Sociaux</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <SocialInput label="Facebook" value={showroom.facebook} onChange={(v:string)=>setShowroom({...showroom, facebook: v})} icon="📘" />
                    <SocialInput label="Instagram" value={showroom.instagram} onChange={(v:string)=>setShowroom({...showroom, instagram: v})} icon="📸" />
                    <SocialInput label="WhatsApp Showroom" value={showroom.whatsapp} onChange={(v:string)=>setShowroom({...showroom, whatsapp: v})} icon="📞" />
                 </div>
              </div>

              <div className="flex justify-center pt-8">
                 <button 
                   onClick={saveShowroomConfig} 
                   disabled={loading}
                   className="custom-gradient-btn px-24 py-6 rounded-3xl text-white font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                 >
                   {loading ? 'Mise à jour...' : 'Synchroniser le Showroom 💎'}
                 </button>
              </div>
           </div>
         )}

         {activeTab === 'profile' && (
           <div className="p-12 md:p-20 space-y-12 max-w-3xl mx-auto">
              <div className="text-center mb-10">
                 <div className="h-28 w-28 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl">👤</div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tight">Paramètres d'Accès</h3>
                 <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">ID: {profile.id}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ConfigInput label="Nom d'utilisateur" value={profile.username} onChange={(v:string)=>setProfile({...profile, username: v})} icon="👤" />
                 <ConfigInput label="Adresse Email Professionnelle" value={profile.email} onChange={(v:string)=>setProfile({...profile, email: v})} icon="✉️" type="email" />
                 <div className="md:col-span-2 pt-6 border-t border-slate-50">
                    <ConfigInput label="Modifier le Mot de Passe" value={profile.password} onChange={(v:string)=>setProfile({...profile, password: v})} placeholder="Laisser vide pour ne pas changer" icon="🔒" type="password" />
                 </div>
              </div>

              <div className="pt-8">
                 <button 
                   onClick={saveProfileUpdate}
                   disabled={loading}
                   className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95"
                 >
                   {loading ? 'Traitement...' : 'Sauvegarder mon Profil'}
                 </button>
              </div>
           </div>
         )}

         {activeTab === 'system' && (
           <div className="p-12 md:p-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="p-14 rounded-[4.5rem] bg-blue-600 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-[2s]"></div>
                    <div className="relative z-10">
                       <span className="text-6xl mb-8 block">☁️</span>
                       <h4 className="text-4xl font-black tracking-tighter mb-4 leading-none">Exportation<br/>Cloud Sync</h4>
                       <p className="text-blue-100 text-sm font-medium leading-relaxed mb-12 opacity-80 max-w-xs">Générez un duplicata complet de votre showroom (véhicules, clients, finances).</p>
                       <button 
                         onClick={handleBackup}
                         disabled={loading}
                         className="w-full py-6 bg-white text-blue-600 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                       >
                         Télécharger la Sauvegarde
                       </button>
                    </div>
                 </div>

                 <div className="p-14 rounded-[4.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-[2s]"></div>
                    <div className="relative z-10">
                       <span className="text-6xl mb-8 block">📥</span>
                       <h4 className="text-4xl font-black tracking-tighter mb-4 leading-none">Restauration<br/>de Données</h4>
                       <p className="text-slate-400 text-sm font-medium leading-relaxed mb-12 opacity-80 max-w-xs">Injectez un fichier .json pour restaurer l'intégralité de vos archives Showroom.</p>
                       <label className="block w-full py-6 bg-white/10 border border-white/20 text-white text-center rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-white/20 cursor-pointer transition-all active:scale-95">
                          <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
                          Importer un Fichier
                       </label>
                    </div>
                 </div>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

const ConfigInput = ({ label, value, onChange, icon, type = 'text', placeholder }: any) => (
  <div className="space-y-3">
     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
     <div className="relative group">
        <span className="absolute left-7 top-1/2 -translate-y-1/2 text-xl opacity-30 group-focus-within:opacity-100 transition-opacity">{icon}</span>
        <input 
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-50 border-2 border-slate-100 px-16 py-6 rounded-[2.2rem] outline-none focus:border-blue-500 font-bold text-slate-800 transition-all shadow-inner text-lg"
        />
     </div>
  </div>
);

const SocialInput = ({ label, value, onChange, icon }: any) => (
  <div className="flex items-center gap-5 bg-slate-50 p-5 rounded-[2.5rem] border border-slate-100 group hover:border-blue-500/30 transition-all">
     <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm group-hover:rotate-12 transition-transform">{icon}</div>
     <div className="flex-grow">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 ml-1">{label}</p>
        <input 
          type="text" 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-none p-0 outline-none font-black text-sm text-slate-900"
          placeholder="Non renseigné"
        />
     </div>
  </div>
);
