
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { uploadImageToBucket } from '../utils';

interface ConfigProps {
  lang: Language;
  onConfigUpdate: () => void;
}

const ConfigInput = ({ label, value, onChange, icon, type = 'text', placeholder }: any) => (
  <div className="space-y-3">
     <label className="text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">{label}</label>
     <div className="relative group">
        <span className="absolute left-7 top-1/2 -translate-y-1/2 text-xl opacity-30 group-focus-within:opacity-100 transition-opacity">{icon}</span>
        <input 
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-900/50 border-2 border-red-600/20 px-16 py-6 rounded-[2.2rem] outline-none focus:border-red-600 font-bold text-red-100 transition-all shadow-inner text-lg placeholder:text-red-400/20"
        />
     </div>
  </div>
);

const SocialInput = ({ label, value, onChange, icon }: any) => (
  <div className="flex items-center gap-5 bg-red-950/40 p-5 rounded-[2.5rem] border border-red-600/20 group hover:border-red-600/40 transition-all backdrop-blur-sm">
     <div className="h-14 w-14 rounded-2xl bg-red-600/20 border border-red-600/30 flex items-center justify-center text-2xl shadow-sm group-hover:rotate-12 transition-transform">{icon}</div>
     <div className="flex-grow">
        <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest leading-none mb-1.5 ml-1">{label}</p>
        <input 
          type="text" 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-none p-0 outline-none font-black text-sm text-red-100 placeholder:text-red-400/20"
          placeholder="Non renseigné"
        />
     </div>
  </div>
);

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
      const { data: prof } = await supabase.from('workers').select('*').eq('id', user.id).maybeSingle();
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
          phone1: showroom.phone1,
          phone2: showroom.phone2,
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
            phone1: showroom.phone1,
            phone2: showroom.phone2,
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
      // 2. Update Worker Table (Username)
      await supabase.from('workers').update({ username: profile.username }).eq('id', profile.id);
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen pb-20">
      {/* Premium background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-slate-950 to-black pointer-events-none -z-20"></div>
      
      {/* Ambient background blobs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-800 rounded-full blur-[150px] opacity-[0.08] animate-blob pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-700 rounded-full blur-[140px] opacity-[0.07] animate-blob pointer-events-none -z-10" style={{animationDelay:'2s'}}></div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none -z-10"></div>
      
      {/* Radial gradient accent */}
      <div className="fixed inset-0 bg-gradient-radial from-red-600/5 via-transparent to-transparent pointer-events-none -z-10"></div>

      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex justify-center">
          <div className="bg-red-950/30 p-2 rounded-[2.5rem] flex gap-2 border border-red-600/20 backdrop-blur-md shadow-inner overflow-x-auto max-w-full">
               {[
                 { id: 'store', label: 'Boutique', icon: '🏪' },
                 { id: 'profile', label: 'Compte', icon: '👤' },
                 { id: 'system', label: 'Système', icon: '⚙️' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`px-10 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all relative overflow-hidden group ${activeTab === tab.id ? 'text-white shadow-xl scale-105' : 'text-red-400/50 hover:text-red-300'}`}
                 >
                   {activeTab === tab.id && (
                     <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 animate-in fade-in duration-300"></div>
                   )}
                   <span className="relative z-10">{tab.icon}</span> 
                   <span className="relative z-10">{tab.label}</span>
                 </button>
               ))}
          </div>
        </div>

      <div className="glass-card rounded-[4rem] border border-red-600/20 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeTab === 'store' && (
            <div className="p-12 md:p-16 space-y-16 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
               
               <div className="grid grid-cols-1 md:grid-cols-12 gap-16 relative z-10">
                  <div className="md:col-span-4 flex flex-col items-center">
                     <label className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-6">Logo du Showroom</label>
                     <div className="relative group w-56 h-56">
                        <div className="w-full h-full rounded-[4.5rem] bg-slate-900/50 border-4 border-dashed border-red-600/30 flex flex-col items-center justify-center overflow-hidden transition-all cursor-pointer hover:border-red-600 group shadow-inner">
                           {showroom.logo_url ? (
                             <img src={showroom.logo_url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                           ) : (
                             <span className="text-5xl opacity-20">🏎️</span>
                           )}
                           <div className="absolute inset-0 bg-red-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                              <span className="text-white font-black text-[10px] uppercase tracking-widest px-4 text-center">Changer le Logo</span>
                           </div>
                        </div>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} />
                     </div>
                  </div>
                  
                  <div className="md:col-span-8 space-y-8">
                     <ConfigInput label="Nom Commercial" value={showroom.name} onChange={(v:string)=>setShowroom({...showroom, name: v})} icon="🏷️" />
                     <ConfigInput label="Slogan Publicitaire" value={showroom.slogan} onChange={(v:string)=>setShowroom({...showroom, slogan: v})} icon="✨" />
                     <ConfigInput label="Localisation Showroom" value={showroom.address} onChange={(v:string)=>setShowroom({...showroom, address: v})} icon="📍" />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ConfigInput label="Téléphone Principal" value={showroom.phone1} onChange={(v:string)=>setShowroom({...showroom, phone1: v})} icon="📞" />
                        <ConfigInput label="Téléphone Secondaire" value={showroom.phone2} onChange={(v:string)=>setShowroom({...showroom, phone2: v})} icon="☎️" />
                     </div>
                  </div>
               </div>

               <div className="pt-16 border-t border-red-600/20 relative z-10">
                  <h4 className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.4em] mb-10 text-center">Contacts & Réseaux Sociaux</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <SocialInput label="Facebook" value={showroom.facebook} onChange={(v:string)=>setShowroom({...showroom, facebook: v})} icon="📘" />
                     <SocialInput label="Instagram" value={showroom.instagram} onChange={(v:string)=>setShowroom({...showroom, instagram: v})} icon="📸" />
                     <SocialInput label="WhatsApp Showroom" value={showroom.whatsapp} onChange={(v:string)=>setShowroom({...showroom, whatsapp: v})} icon="📞" />
                  </div>
               </div>

               <div className="flex justify-center pt-8 relative z-10">
                  <button 
                    onClick={saveShowroomConfig} 
                    disabled={loading}
                    className="group relative px-24 py-6 rounded-3xl overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-3xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
                    
                    <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                      <span className="text-lg transition-transform group-hover:scale-125 duration-300">💎</span>
                      <span>{loading ? 'Mise à jour...' : 'Synchroniser le Showroom'}</span>
                    </div>
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="p-12 md:p-20 space-y-12 max-w-3xl mx-auto relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
               <div className="relative z-10">
                 <div className="text-center mb-10">
                    <div className="h-28 w-28 rounded-[2.5rem] bg-gradient-to-br from-red-800 to-slate-900 text-white flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] border border-red-600/30">👤</div>
                    <h3 className="text-3xl font-black text-red-100 tracking-tight">Paramètres d'Accès</h3>
                    <p className="text-red-400/70 font-bold text-[10px] uppercase tracking-widest mt-2">ID: {profile.id}</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ConfigInput label="Nom d'utilisateur" value={profile.username} onChange={(v:string)=>setProfile({...profile, username: v})} icon="👤" />
                    <ConfigInput label="Adresse Email Professionnelle" value={profile.email} onChange={(v:string)=>setProfile({...profile, email: v})} icon="✉️" type="email" />
                    <div className="md:col-span-2 pt-6 border-t border-red-600/20">
                       <ConfigInput label="Modifier le Mot de Passe" value={profile.password} onChange={(v:string)=>setProfile({...profile, password: v})} placeholder="Laisser vide pour ne pas changer" icon="🔒" type="password" />
                    </div>
                 </div>

                 <div className="pt-12 flex justify-center">
                    <button 
                      onClick={saveProfileUpdate}
                      disabled={loading}
                      className="group relative w-full py-6 rounded-[2rem] overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-[2rem] blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
                      
                      <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                        <span className="text-lg transition-transform group-hover:scale-125 duration-300">💾</span>
                        <span>{loading ? 'Traitement...' : 'Sauvegarder mon Profil'}</span>
                      </div>
                    </button>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="p-12 md:p-16 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                  <div className="p-14 rounded-[4.5rem] bg-gradient-to-br from-slate-900 to-black text-white shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden group border border-red-600/20">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-[2s]"></div>
                     <div className="relative z-10">
                        <span className="text-6xl mb-8 block transition-transform group-hover:scale-110 duration-500">☁️</span>
                        <h4 className="text-4xl font-black tracking-tighter mb-4 leading-none text-red-100">Exportation<br/>Cloud Sync</h4>
                        <p className="text-red-400/60 text-sm font-medium leading-relaxed mb-12 opacity-80 max-w-xs">Générez un duplicata complet de votre showroom (véhicules, clients, finances).</p>
                        
                        <button 
                          onClick={handleBackup}
                          disabled={loading}
                          className="group relative w-full py-6 rounded-[2rem] overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                          <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                            <span>Télécharger la Sauvegarde</span>
                          </div>
                        </button>
                     </div>
                  </div>

                  <div className="p-14 rounded-[4.5rem] bg-gradient-to-br from-slate-900 to-black text-white shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden group border border-red-600/20">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-[2s]"></div>
                     <div className="relative z-10">
                        <span className="text-6xl mb-8 block transition-transform group-hover:scale-110 duration-500">📥</span>
                        <h4 className="text-4xl font-black tracking-tighter mb-4 leading-none text-red-100">Restauration<br/>de Données</h4>
                        <p className="text-red-400/60 text-sm font-medium leading-relaxed mb-12 opacity-80 max-w-xs">Injectez un fichier .json pour restaurer l'intégralité de vos archives Showroom.</p>
                        
                        <label className="group relative block w-full py-6 rounded-[2rem] overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300 cursor-pointer text-center">
                          <div className="absolute inset-0 bg-red-600/10 border border-red-600/20 transition-all group-hover:bg-red-600/20"></div>
                          <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
                          <span className="relative z-10 text-red-100">Importer un Fichier</span>
                        </label>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



