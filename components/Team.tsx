
import React, { useState, useEffect } from 'react';
import { Worker, Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { uploadImageToBucket } from '../utils';

interface TeamProps {
  lang: Language;
}

export const Team: React.FC<TeamProps> = ({ lang }) => {
  const t = translations[lang];
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeModal, setActiveModal] = useState<'create' | 'advance' | 'absences' | 'payment' | 'history' | 'permissions' | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setWorkers(data || []);
    } catch (err) {
      console.error("Fetch Workers Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorker = async (data: any) => {
    try {
      const payload = { ...data };
      // Do not send or modify created_by from the client UI
      delete payload.created_by;

      // Normalize empty strings to NULL to avoid type errors (e.g. date columns)
      Object.keys(payload).forEach((k) => {
        const v: any = (payload as any)[k];
        if (typeof v === 'string' && v.trim() === '') {
          (payload as any)[k] = null;
        }
      });

      // Ensure birthday is a valid date or null
      if (payload.birthday) {
        const d = new Date(payload.birthday as any);
        if (Number.isNaN(d.getTime())) payload.birthday = null;
      }

      // Ensure numeric fields are numbers
      if (payload.amount !== undefined && payload.amount !== null) {
        payload.amount = Number(payload.amount) || 0;
      }
      // Ensure role and type are in sync
      if (payload.role) {
        payload.type = payload.role.charAt(0).toUpperCase() + payload.role.slice(1);
      }
      if (payload.type) {
        payload.role = payload.type.toLowerCase();
      }
      
      if (data.id) {
        const { error } = await supabase.from('workers').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        // Validation
        if (!payload.username) throw new Error("Le nom d'utilisateur est obligatoire");
        if (!payload.password) throw new Error("Le mot de passe est obligatoire");

        // Use RPC for creation to handle Auth
        const workerEmail = payload.email || `${payload.username}@autolux.local`;
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_worker_v3', {
          p_fullname: payload.fullname || payload.username,
          p_username: payload.username,
          p_email: workerEmail,
          p_password: payload.password,
          p_role: payload.role || 'worker',
          p_telephone: payload.telephone || '',
          p_address: payload.address || '',
          p_payment_type: payload.payment_type || 'month',
          p_amount: Number(payload.amount) || 0,
          p_photo_url: payload.photo_url || null,
          p_created_at: payload.created_at || null
        });

        if (rpcError) throw rpcError;
        if (rpcData && rpcData.error) throw new Error(rpcData.error);
      }
      fetchWorkers();
      setActiveModal(null);
     
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleRecordTransaction = async (type: string, amount: number, date: string) => {
    if (!selectedWorker) return;
    try {
      const { error } = await supabase.from('worker_transactions').insert([{
        worker_id: selectedWorker.id,
        type: type.toLowerCase(),
        amount: Number(amount),
        date: date
      }]);
      if (error) throw error;
      setActiveModal(null);
      fetchWorkers();
    } catch (err: any) {
      alert(`Erreur transaction : ${err.message}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-[6px] border-red-600/20 border-t-blue-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-red-400 uppercase tracking-[0.4em] text-[10px]">Chargement de l'équipe...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 relative min-h-screen">
      {/* Premium background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-slate-950 to-black pointer-events-none -z-20"></div>
      
      {/* Ambient background blobs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-800 rounded-full blur-[150px] opacity-[0.08] animate-blob pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-700 rounded-full blur-[140px] opacity-[0.07] animate-blob pointer-events-none -z-10" style={{animationDelay:'2s'}}></div>
      <div className="fixed top-1/2 left-1/3 w-[400px] h-[400px] bg-red-900 rounded-full blur-[130px] opacity-[0.05] animate-blob pointer-events-none -z-10" style={{animationDelay:'4s'}}></div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none -z-10"></div>

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              👥 {t.menu.team}
            </h1>
            <p className="text-red-400/80 font-black text-xs uppercase tracking-[0.3em]">Gestion RH & Salaires des Collaborateurs</p>
          </div>

          <button 
            onClick={() => { setSelectedWorker(null); setActiveModal('create'); }} 
            className="group relative px-10 py-5 rounded-[2rem] overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-[0_0_40px_rgba(220,38,38,0.3)] hover:shadow-[0_0_60px_rgba(220,38,38,0.5)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <span className="relative z-10 flex items-center gap-3 text-white">
              <span className="text-2xl transition-transform duration-300 group-hover:scale-125">👤</span> 
              {t.team.addWorker}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-2">
        {workers.map((w, idx) => (
          <div key={w.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
            <WorkerCard 
              worker={w} 
              onAction={(type: any) => {
                setSelectedWorker(w);
                setActiveModal(type);
              }}
              onDelete={async () => {
                  if (window.confirm(t.suppliers.confirmDelete)) {
                      await supabase.from('workers').delete().eq('id', w.id);
                      fetchWorkers();
                  }
              }}
              onEdit={() => {
                setSelectedWorker(w);
                setActiveModal('create');
              }}
              lang={lang}
            />
          </div>
        ))}
      </div>

      {activeModal === 'create' && (
        <WorkerFormModal 
          lang={lang} 
          initialData={selectedWorker} 
          onClose={() => setActiveModal(null)} 
          onSubmit={handleSaveWorker} 
        />
      )}
      {activeModal === 'advance' && selectedWorker && (
        <TransactionModal 
          title="Nouvelle Avance" 
          icon="💎"
          color="amber"
          onClose={() => setActiveModal(null)} 
          onConfirm={(amt: number, dt: string) => handleRecordTransaction('avance', amt, dt)}
        />
      )}
      {activeModal === 'absences' && selectedWorker && (
        <TransactionModal 
          title="Enregistrer Absence" 
          icon="🚫"
          color="red"
          onClose={() => setActiveModal(null)} 
          onConfirm={(amt: number, dt: string) => handleRecordTransaction('absence', amt, dt)}
        />
      )}
      {activeModal === 'payment' && selectedWorker && (
        <PaymentModal 
          lang={lang} 
          worker={selectedWorker} 
          onClose={() => setActiveModal(null)} 
          onConfirm={(amt: number, dt: string) => handleRecordTransaction('paiement', amt, dt)}
        />
      )}
      {activeModal === 'history' && selectedWorker && (
        <HistoryModal 
          lang={lang} 
          worker={selectedWorker} 
          onClose={() => setActiveModal(null)} 
        />
      )}
      {activeModal === 'permissions' && selectedWorker && (
        <PermissionsModal 
          worker={selectedWorker} 
          onClose={() => { setActiveModal(null); fetchWorkers(); }} 
        />
      )}
    </div>
  );
};

const WorkerCard = ({ worker, onAction, onDelete, onEdit, lang }: any) => {
  const t = translations[lang as Language];
  
  const getRoleEmoji = (role?: string) => {
    switch(role) {
      case 'admin': return '👑';
      case 'driver': return '🚗';
      case 'worker':
      default: return '👨‍💼';
    }
  };

  const getRoleColor = (role?: string) => {
    switch(role) {
      case 'admin': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'driver': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'worker':
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch(role) {
      case 'admin': return 'Admin';
      case 'driver': return 'Driver';
      case 'worker':
      default: return 'Worker';
    }
  };

  return (
    <div className="glass-card rounded-[3.5rem] border border-red-600/20 p-8 shadow-md hover:shadow-[0_0_50px_rgba(220,38,38,0.2)] transition-all duration-700 flex flex-col group h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="w-32 h-32 rounded-[2.8rem] bg-slate-900 border-4 border-red-600/30 shadow-2xl overflow-hidden flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-700 group-hover:border-red-600/60">
          {worker.photo_url ? (
            <img src={worker.photo_url} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl grayscale group-hover:grayscale-0 transition-all">👨‍🔧</span>
          )}
        </div>
        <h3 className="text-2xl font-black text-red-100 text-center truncate w-full mb-3 tracking-tight">{worker.fullname}</h3>
        <div className={`px-6 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${getRoleColor(worker.role)}`}>
          <span className="text-lg">{getRoleEmoji(worker.role)}</span>
          {getRoleLabel(worker.role)}
        </div>
      </div>

      <div className="space-y-4 mb-10 relative z-10">
        <div className="flex items-center gap-4 p-5 bg-red-600/5 rounded-3xl border border-red-600/10 group-hover:border-red-600/30 transition-colors">
          <span className="text-2xl opacity-60 transition-transform group-hover:scale-110">📞</span>
          <p className="text-sm font-black text-red-100/90">{worker.telephone || '---'}</p>
        </div>
        <div className="flex items-center gap-4 p-5 bg-red-600/5 rounded-3xl border border-red-600/10 group-hover:border-red-600/30 transition-colors">
          <span className="text-2xl opacity-60 transition-transform group-hover:scale-110">💰</span>
          <div>
            <p className="text-sm font-black text-red-400">
              {Number(worker.amount || 0).toLocaleString()} <span className="text-[10px] opacity-60">DA</span>
            </p>
            <p className="text-[9px] font-black text-red-400/50 uppercase tracking-widest">/ {worker.payment_type === 'month' ? 'Mois' : 'Jour'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mt-auto relative z-10">
        {[
          { type: 'payment', label: 'Paiement', emoji: '💰' },
          { type: 'advance', label: 'Avance', emoji: '💎' },
          { type: 'absences', label: 'Absence', emoji: '🚫' },
          { type: 'history', label: 'Historique', emoji: '📊' },
          { type: 'permissions', label: 'Accès', emoji: '🔐' },
          { type: 'edit', label: 'Editer', emoji: '✏️', onClick: onEdit }
        ].map((btn) => (
          <button 
            key={btn.type}
            onClick={btn.onClick || (() => onAction(btn.type))} 
            className="flex-grow min-w-[100px] relative group/btn overflow-hidden py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <span className="relative z-10 text-white flex items-center justify-center gap-2">
              <span className="transition-transform duration-300 group-hover/btn:scale-125">{btn.emoji}</span>
              <span>{btn.label}</span>
            </span>
          </button>
        ))}
        
        <button 
          onClick={onDelete} 
          className="h-12 w-12 relative group/btn overflow-hidden rounded-xl font-black flex items-center justify-center transition-all duration-300 shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-900 to-red-800 transition-all duration-300 group-hover/btn:from-red-800 group-hover/btn:to-red-700"></div>
          <div className="relative z-10 text-lg transition-transform duration-300 group-hover/btn:scale-125">🗑️</div>
        </button>
      </div>
    </div>
  );
};

const WorkerFormModal = ({ lang, initialData, onClose, onSubmit }: any) => {
  const t = translations[lang as Language];
  const [formData, setFormData] = useState<Partial<Worker>>(initialData || {
    fullname: '', birthday: '', telephone: '', email: '', address: '', id_card: '',
    type: 'Worker', role: 'worker', payment_type: 'month', amount: 0, username: '', password: '', photo_url: '',
    created_at: new Date().toISOString().split('T')[0]
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImageToBucket('worker-photos', file);
      setFormData(prev => ({ ...prev, photo_url: url }));
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Erreur lors du téléchargement de la photo');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-[#020617] w-full max-w-6xl h-full max-h-[95vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-red-600/30">
        
        {/* Header */}
        <div className="px-12 py-10 flex items-center justify-between bg-gradient-to-r from-red-950 via-slate-900 to-black shrink-0 border-b border-red-600/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.05)_0%,transparent_50%)]"></div>
          <div className="flex items-center gap-8 relative z-10">
            <div className="h-20 w-20 rounded-[2.2rem] bg-red-600/20 text-red-400 flex items-center justify-center text-4xl shadow-2xl border border-red-600/30">👤</div>
            <div>
              <h2 className="text-4xl font-black text-red-100 tracking-tight leading-none mb-3">{initialData ? t.team.editWorker : t.team.addWorker}</h2>
              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.4em] mt-1">Configuration du Profil Collaborateur</p>
            </div>
          </div>
          <button onClick={onClose} className="h-14 w-14 glass-card border border-red-600/30 rounded-full flex items-center justify-center text-2xl hover:bg-red-600/20 text-red-400/70 transition-all active:scale-90">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="relative group mt-10">
                <div className="w-64 h-64 rounded-[4.5rem] bg-slate-900 border-4 border-red-600/30 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-red-600/60 group-hover:scale-[1.02]">
                   {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <span className="text-[8rem] opacity-10">👤</span>}
                </div>
                <label className="absolute bottom-4 right-4 h-16 w-16 rounded-2xl bg-red-600 text-white flex items-center justify-center cursor-pointer hover:bg-red-500 shadow-2xl transition-all hover:scale-110 active:scale-95">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhoto} />
                  <span className="text-3xl">📷</span>
                </label>
              </div>
              <div className="w-full mt-12">
                 <FieldBox label="DATE D'EMBAUCHE" name="created_at" type="date" value={formData.created_at?.split('T')[0]} onChange={(e:any) => setFormData({...formData, created_at: e.target.value})} />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-12">
               <SectionBox title="Informations Personnelles" icon="👤">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldBox label="NOM COMPLET" name="fullname" value={formData.fullname} onChange={(e:any) => setFormData({...formData, fullname: e.target.value})} />
                    <FieldBox label="DATE DE NAISSANCE" name="birthday" type="date" value={formData.birthday} onChange={(e:any) => setFormData({...formData, birthday: e.target.value})} />
                    <FieldBox label="TÉLÉPHONE" name="telephone" value={formData.telephone} onChange={(e:any) => setFormData({...formData, telephone: e.target.value})} />
                    <FieldBox label="EMAIL PROFESSIONNEL" name="email" type="email" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} />
                  </div>
               </SectionBox>

               <SectionBox title="Contrat & Compte" icon="💰">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldBox label="SALAIRE / MONTANT (DA)" name="amount" type="number" value={formData.amount} onChange={(e:any) => setFormData({...formData, amount: Number(e.target.value)})} />
                    <SelectFieldBox label="TYPE DE PAIEMENT" name="payment_type" value={formData.payment_type} onChange={(e:any) => setFormData({...formData, payment_type: e.target.value as any})} options={[{label:'Par mois', value:'month'}, {label:'Par jour', value:'day'}]} />
                    <FieldBox label="NOM D'UTILISATEUR" name="username" value={formData.username} onChange={(e:any) => setFormData({...formData, username: e.target.value})} />
                    <FieldBox label="MOT DE PASSE" name="password" type="password" value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} />
                  </div>
               </SectionBox>

               <SectionBox title="Rôle & Permissions" icon="🔐">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <label className="relative flex items-center cursor-pointer group">
                      <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={(e) => setFormData({...formData, role: e.target.value as any})} className="sr-only" />
                      <div className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${formData.role === 'admin' ? 'border-red-600 bg-red-600/10 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-red-600/10 bg-red-600/[0.02] hover:bg-red-600/[0.05]'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <div className="text-4xl">👑</div>
                           <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${formData.role === 'admin' ? 'bg-red-600 border-red-600' : 'border-red-600/30'}`}>
                             {formData.role === 'admin' && <span className="text-white text-[10px]">✓</span>}
                           </div>
                        </div>
                        <div className="font-black uppercase text-[11px] text-red-100 tracking-widest">Admin Principal</div>
                        <div className="text-[9px] text-red-400/50 mt-1 uppercase font-bold">Contrôle Total du Système</div>
                      </div>
                    </label>
                    <label className="relative flex items-center cursor-pointer group">
                      <input type="radio" name="role" value="worker" checked={formData.role === 'worker'} onChange={(e) => setFormData({...formData, role: e.target.value as any})} className="sr-only" />
                      <div className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${formData.role === 'worker' ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-red-600/10 bg-red-600/[0.02] hover:bg-red-600/[0.05]'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <div className="text-4xl">👨‍💼</div>
                           <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${formData.role === 'worker' ? 'bg-emerald-500 border-emerald-500' : 'border-red-600/30'}`}>
                             {formData.role === 'worker' && <span className="text-white text-[10px]">✓</span>}
                           </div>
                        </div>
                        <div className="font-black uppercase text-[11px] text-red-100 tracking-widest">Collaborateur</div>
                        <div className="text-[9px] text-red-400/50 mt-1 uppercase font-bold">Accès selon Permissions</div>
                      </div>
                    </label>
                  </div>
               </SectionBox>
            </div>
          </div>
        </div>

        <div className="px-12 py-10 bg-slate-950/50 border-t border-red-600/20 flex items-center justify-center gap-10 shrink-0">
          <button onClick={onClose} className="px-14 py-5 bg-red-950/30 border border-red-600/20 rounded-full font-black text-[11px] uppercase tracking-widest text-red-400/70 hover:bg-red-600/10 transition-all">ANNULER</button>
          <button 
            onClick={() => onSubmit(formData)} 
            className="group relative px-28 py-5 rounded-full overflow-hidden font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse"></div>
            <span className="relative z-10 text-white">ENREGISTRER LE PROFIL</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TransactionModal = ({ title, icon, color, onClose, onConfirm }: any) => {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-[#020617] w-full max-w-lg rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-red-600/30 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
        <h3 className="text-4xl font-black text-red-100 mb-12 tracking-tighter text-center leading-tight uppercase italic">{title}</h3>
        <div className="space-y-10">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em] ml-6">Montant du Versement (DA)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(Number(e.target.value))} 
                className="w-full bg-red-600/[0.03] border-2 border-red-600/20 p-8 rounded-[2.5rem] outline-none focus:border-red-600 font-black text-5xl transition-all shadow-inner text-red-100 text-center tracking-tighter" 
              />
           </div>
           <div className="space-y-4">
              <label className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em] ml-6">Date d'Opération</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full bg-red-600/[0.03] border-2 border-red-600/20 p-6 rounded-[2.5rem] outline-none focus:border-red-600 font-bold text-red-100 text-center transition-all" 
              />
           </div>
           <div className="grid grid-cols-2 gap-6 pt-8">
              <button onClick={onClose} className="py-6 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] text-red-400/70 bg-red-950/30 border border-red-600/10 hover:bg-red-600/10 transition-all">ANNULER</button>
              <button 
                onClick={() => onConfirm(amount, date)} 
                className="relative group overflow-hidden py-6 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] text-white shadow-2xl transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse"></div>
                <span className="relative z-10">CONFIRMER {icon}</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ worker, onClose, onConfirm }: any) => {
  const baseSalary = Number(worker.amount || 0);
  const [advances, setAdvances] = useState(0);
  const [absences, setAbsences] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const { data } = await supabase.from('worker_transactions')
        .select('*')
        .eq('worker_id', worker.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        const selectedMonth = new Date(date).getMonth();
        const selectedYear = new Date(date).getFullYear();
        
        const existingPaymentThisMonth = data.find(d => {
           const dDate = new Date(d.date || d.created_at);
           return d.type.toLowerCase() === 'paiement' && 
                  dDate.getMonth() === selectedMonth && 
                  dDate.getFullYear() === selectedYear;
        });

        setAlreadyPaid(!!existingPaymentThisMonth);

        const lastPayment = data.find(d => d.type.toLowerCase() === 'paiement');
        const lastPaymentTime = lastPayment ? new Date(lastPayment.created_at).getTime() : 0;

        let advSum = 0;
        let absSum = 0;

        data.forEach(item => {
           const itemTime = new Date(item.created_at).getTime();
           if (itemTime > lastPaymentTime) {
              if (item.type.toLowerCase() === 'avance') advSum += Number(item.amount);
              if (item.type.toLowerCase() === 'absence') absSum += Number(item.amount);
           }
        });

        setAdvances(advSum);
        setAbsences(absSum);
      }
      setLoadingStats(false);
    };
    fetchStats();
  }, [worker.id, date]);

  const final = baseSalary - advances - absences;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-[#020617] w-full max-w-5xl h-full max-h-[95vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-red-600/30">
        
        <div className="px-12 py-12 bg-gradient-to-r from-red-950 via-slate-900 to-black text-white flex justify-between items-center relative overflow-hidden shrink-0 border-b border-red-600/20">
           <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[150px] pointer-events-none"></div>
           <div className="relative z-10 flex items-center gap-10">
              <div className="h-24 w-24 bg-red-600/20 backdrop-blur-xl rounded-[2.5rem] border border-red-600/30 flex items-center justify-center text-5xl shadow-2xl">💵</div>
              <div>
                 <h3 className="text-5xl font-black tracking-tighter uppercase leading-none mb-3">Bulletin de Paie</h3>
                 <p className="text-red-400 font-black text-sm uppercase tracking-[0.4em] mt-3 opacity-80">{worker.fullname} • {new Date(date).toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})}</p>
              </div>
           </div>
           <button onClick={onClose} className="relative z-10 h-16 w-16 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-90">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-12">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              <div className="lg:col-span-4 space-y-10">
                 <div className="glass-card p-10 rounded-[3.5rem] border border-red-600/20 shadow-xl flex flex-col items-center group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="w-48 h-48 rounded-[3.5rem] bg-slate-900 border-4 border-red-600/30 shadow-2xl overflow-hidden mb-8 relative z-10 group-hover:scale-105 transition-transform duration-700">
                       {worker.photo_url ? <img src={worker.photo_url} className="w-full h-full object-cover" /> : <span className="text-7xl flex items-center justify-center h-full opacity-10 grayscale">👤</span>}
                    </div>
                    <h4 className="text-3xl font-black text-red-100 text-center relative z-10 tracking-tight leading-none mb-3">{worker.fullname}</h4>
                    <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.4em] mt-2 relative z-10">{worker.role}</p>
                 </div>

                 <div className="glass-card p-10 rounded-[3.5rem] border border-red-600/20 shadow-xl space-y-8">
                    <FieldBox label="DATE DU RÈGLEMENT" type="date" value={date} onChange={(e:any) => setDate(e.target.value)} />
                    {alreadyPaid && (
                      <div className="p-8 bg-red-600/10 border-2 border-red-600/30 rounded-[2.5rem] flex items-center gap-6 animate-pulse">
                         <span className="text-4xl">⚠️</span>
                         <p className="text-[11px] font-black text-red-100 uppercase tracking-widest leading-relaxed">Alerte : Un paiement a déjà été validé pour ce mois-ci.</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="lg:col-span-8 space-y-10">
                 <SectionBox title="Calcul de la Rémunération" icon="📊">
                    {loadingStats ? (
                      <div className="py-24 text-center animate-pulse">
                         <div className="h-12 w-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mx-auto mb-6"></div>
                         <p className="text-red-400 font-black uppercase text-xs tracking-[0.3em]">Analyse du solde en cours...</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                         <div className="flex justify-between items-center py-8 border-b border-red-600/10 hover:bg-red-600/[0.02] px-4 rounded-3xl transition-all">
                            <div className="flex items-center gap-6">
                               <div className="h-14 w-14 bg-red-600/10 text-red-400 rounded-2xl flex items-center justify-center text-3xl border border-red-600/20">💰</div>
                               <span className="text-red-100/70 font-black uppercase text-xs tracking-widest">Salaire Brut Contractuel</span>
                            </div>
                            <span className="text-3xl font-black text-red-100 tracking-tighter">{baseSalary.toLocaleString()} <span className="text-sm opacity-40">DA</span></span>
                         </div>
                         <div className="flex justify-between items-center py-8 border-b border-red-600/10 hover:bg-red-600/[0.02] px-4 rounded-3xl transition-all">
                            <div className="flex items-center gap-6">
                               <div className="h-14 w-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center text-3xl border border-amber-500/20">💎</div>
                               <span className="text-amber-500 font-black uppercase text-xs tracking-widest">Retenue sur Avances</span>
                            </div>
                            <span className="text-3xl font-black text-amber-500 tracking-tighter">- {advances.toLocaleString()} <span className="text-sm opacity-40">DA</span></span>
                         </div>
                         <div className="flex justify-between items-center py-8 border-b border-red-600/10 hover:bg-red-600/[0.02] px-4 rounded-3xl transition-all">
                            <div className="flex items-center gap-6">
                               <div className="h-14 w-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl border border-red-500/20">🚫</div>
                               <span className="text-red-500 font-black uppercase text-xs tracking-widest">Pénalités d'Absences</span>
                            </div>
                            <span className="text-3xl font-black text-red-500 tracking-tighter">- {absences.toLocaleString()} <span className="text-sm opacity-40">DA</span></span>
                         </div>
                         
                         <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black p-12 rounded-[3.5rem] flex justify-between items-center border border-red-600/30 mt-12 shadow-[0_0_50px_rgba(220,38,38,0.2)] overflow-hidden relative">
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
                            <div className="relative z-10">
                               <span className="text-red-400 font-black uppercase text-xs tracking-[0.4em] block mb-2">Salaire Net à Verser</span>
                               <p className="text-[10px] text-red-100/40 font-bold uppercase tracking-widest italic">Virement définitif pour {new Date(date).toLocaleDateString('fr-FR', {month: 'long'})}</p>
                            </div>
                            <span className="relative z-10 text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-red-400 to-red-600 tracking-tighter">{final.toLocaleString()} <span className="text-xl font-bold opacity-40 text-red-400">DA</span></span>
                         </div>
                      </div>
                    )}
                 </SectionBox>

                 <div className="flex gap-8">
                    <button 
                      onClick={onClose} 
                      className="flex-1 py-6 bg-red-950/30 border border-red-600/20 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-red-400/70 hover:bg-red-600/10 transition-all"
                    >
                      ANNULER
                    </button>
                    <button 
                      onClick={() => onConfirm(final, date)} 
                      disabled={loadingStats || alreadyPaid}
                      className={`flex-[2] relative group overflow-hidden py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all duration-300 ${alreadyPaid ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-95'}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse"></div>
                      <span className="relative z-10 text-white flex items-center justify-center gap-4">
                        {alreadyPaid ? 'DÉJÀ RÉGLÉ' : (
                          <>
                            <span>VALIDER LE PAIEMENT</span>
                            <span className="text-2xl transition-transform duration-300 group-hover:translate-x-2">💎</span>
                          </>
                        )}
                      </span>
                    </button>
                 </div>
                 <p className="text-center text-[10px] font-black text-red-400/40 uppercase tracking-[0.3em] italic">Une fois validé, le compteur d'avances et d'absences sera réinitialisé pour la prochaine période.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const HistoryModal = ({ worker, onClose }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase.from('worker_transactions')
        .select('*')
        .eq('worker_id', worker.id)
        .order('created_at', { ascending: false });
      setHistory(data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [worker.id]);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-[#020617] w-full max-w-2xl rounded-[4rem] p-14 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[85vh] overflow-hidden flex flex-col border border-red-600/30">
        <div className="flex justify-between items-center mb-12 shrink-0 relative z-10">
           <div>
              <h3 className="text-4xl font-black text-red-100 tracking-tighter italic uppercase leading-none">Journal RH</h3>
              <p className="text-[10px] font-black text-red-400/50 uppercase tracking-[0.4em] mt-3">{worker.fullname}</p>
           </div>
           <button onClick={onClose} className="h-14 w-14 bg-red-600/10 border border-red-600/20 rounded-full flex items-center justify-center text-red-400/70 hover:bg-red-600/20 transition-all hover:scale-110 active:scale-90">✕</button>
        </div>
        
        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-grow pr-2 relative z-10">
           {loading ? (
             <div className="py-20 text-center animate-pulse text-red-400 font-black uppercase text-xs tracking-widest">Analyse des flux...</div>
           ) : history.length === 0 ? (
             <div className="py-20 text-center glass-card rounded-3xl border border-red-600/10">
                <p className="text-5xl mb-6 grayscale">📊</p>
                <p className="text-red-400/50 font-black uppercase text-[10px] tracking-widest">Aucune transaction enregistrée</p>
             </div>
           ) : history.map((p, idx) => (
             <div key={idx} className="bg-red-600/[0.02] border border-red-600/10 p-8 rounded-[3rem] flex items-center justify-between hover:bg-red-600/10 hover:border-red-600/30 transition-all group/item cursor-default">
                <div className="flex items-center gap-8">
                   <div className={`h-16 w-16 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-2xl border transition-all duration-500 group-hover/item:scale-110 ${
                     p.type.toLowerCase() === 'paiement' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                     p.type.toLowerCase() === 'avance' ? 'bg-amber-500/10 border-amber-500/20' : 
                     'bg-red-500/10 border-red-500/20'
                   }`}>
                     {p.type.toLowerCase() === 'paiement' ? '💰' : p.type.toLowerCase() === 'avance' ? '💎' : '🚫'}
                   </div>
                   <div>
                      <p className="font-black text-red-100 text-xl tracking-tight capitalize group-hover/item:text-white transition-colors">{p.type}</p>
                      <p className="text-[10px] font-black text-red-400/30 uppercase tracking-[0.2em] mt-1 italic">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className={`text-3xl font-black tracking-tighter ${p.type.toLowerCase() === 'absence' ? 'text-red-500' : 'text-red-100'}`}>
                      {Number(p.amount).toLocaleString()} <span className="text-sm font-bold text-red-400/40 tracking-normal ml-1">DA</span>
                   </p>
                </div>
             </div>
           ))}
        </div>

        <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
};

const SectionBox = ({ title, icon, children }: any) => (
  <div className="glass-card rounded-[3.5rem] p-10 space-y-10 shadow-2xl border border-red-600/10 hover:border-red-600/30 transition-all duration-500 relative overflow-hidden group/section">
    <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.02] to-transparent opacity-0 group-hover/section:opacity-100 transition-opacity"></div>
    <div className="flex items-center gap-6 relative z-10">
       <div className="h-14 w-14 rounded-2xl bg-red-600/10 text-red-400 flex items-center justify-center text-3xl shadow-inner border border-red-600/20 group-hover/section:scale-110 transition-transform">{icon}</div>
       <h4 className="text-base font-black text-red-100 uppercase tracking-[0.4em] italic">{title}</h4>
    </div>
    <div className="relative z-10">{children}</div>
  </div>
);

const FieldBox = ({ label, name, value, onChange, type = 'text' }: any) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-red-400/50 uppercase tracking-[0.3em] ml-6">{label}</label>
    <div className="relative group/input">
      <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange} 
        className="w-full bg-red-600/[0.03] border border-red-600/20 px-8 py-6 rounded-[2.5rem] outline-none focus:border-red-600/60 focus:bg-red-600/[0.06] font-black text-red-100 transition-all shadow-inner group-hover/input:border-red-600/40" 
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-red-600 transition-all duration-500 group-hover/input:w-1/2 opacity-50 blur-sm"></div>
    </div>
  </div>
);

const SelectFieldBox = ({ label, name, value, onChange, options }: any) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-red-400/50 uppercase tracking-[0.3em] ml-6">{label}</label>
    <div className="relative group/input">
      <select 
        name={name} 
        value={value} 
        onChange={onChange} 
        className="w-full bg-red-600/[0.03] border border-red-600/20 px-8 py-6 rounded-[2.5rem] outline-none font-black text-red-100 appearance-none focus:border-red-600/60 transition-all cursor-pointer group-hover/input:border-red-600/40" 
      >
        {options.map((opt: any) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value} className="bg-slate-900 text-red-100">{typeof opt === 'string' ? opt : opt.label}</option>
        ))}
      </select>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-red-600 opacity-40">▼</div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-red-600 transition-all duration-500 group-hover/input:w-1/2 opacity-50 blur-sm"></div>
    </div>
  </div>
);

const PermissionsModal = ({ worker, onClose }: { worker: Worker; onClose: () => void }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const ALL_INTERFACES = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: '🏠', description: 'Statistiques générales' },
    { id: 'showroom', label: 'Showroom', icon: '🏎️', description: 'Vue des véhicules' },
    { id: 'suppliers', label: 'Fournisseurs', icon: '🤝', description: 'Gestion partenaires' },
    { id: 'purchase', label: 'Achats', icon: '🛒', description: 'Enregistrer achats' },
    { id: 'pos', label: 'Point de Vente', icon: '🏪', description: 'Créer des ventes' },
    { id: 'team', label: 'Équipe', icon: '👥', description: 'Gestion personnel' },
    { id: 'billing', label: 'Facturation', icon: '📄', description: 'Gestion factures' },
    { id: 'expenses', label: 'Dépenses', icon: '💸', description: 'Suivi des charges' },
    { id: 'reports', label: 'Rapports', icon: '📊', description: 'Analyses & stats' },
    { id: 'inspection', label: 'Inspections', icon: '🔍', description: 'Fiches inspection' },
    { id: 'config', label: 'Configuration', icon: '⚙️', description: 'Paramètres système' }
  ];

  useEffect(() => {
    if (worker.permissions) {
      try {
        const perms = typeof worker.permissions === 'string' 
          ? JSON.parse(worker.permissions) 
          : worker.permissions;
        setPermissions(perms || []);
      } catch (e) {
        setPermissions([]);
      }
    }
  }, [worker]);

  const togglePermission = (id: string) => {
    setPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('workers')
      .update({ permissions: permissions })
      .eq('id', worker.id);
    
    if (error) {
      alert('Erreur lors de la mise à jour des permissions');
    } else {
      alert('Permissions mises à jour avec succès');
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-[#020617] w-full max-w-5xl h-full max-h-[90vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-red-600/30">
        
        <div className="px-12 py-10 flex items-center justify-between bg-gradient-to-r from-red-950 via-slate-900 to-black shrink-0 border-b border-red-600/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.05)_0%,transparent_50%)]"></div>
          <div className="flex items-center gap-8 relative z-10">
            <div className="h-20 w-20 rounded-[2.2rem] bg-red-600/20 text-red-400 flex items-center justify-center text-4xl shadow-2xl border border-red-600/30">🔐</div>
            <div>
              <h2 className="text-4xl font-black text-red-100 tracking-tight leading-none mb-3">Gestion des Accès</h2>
              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.4em] mt-1">{worker.fullname} • Matrice de Permissions</p>
            </div>
          </div>
          <button onClick={onClose} className="h-14 w-14 glass-card border border-red-600/30 rounded-full flex items-center justify-center text-2xl hover:bg-red-600/20 text-red-400/70 transition-all active:scale-90">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-10">
           <div className="mb-8 flex gap-6">
              <button 
                onClick={() => setPermissions(ALL_INTERFACES.map(i => i.id))}
                className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
              >
                ✅ TOUT AUTORISER
              </button>
              <button 
                onClick={() => setPermissions([])}
                className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                ❌ TOUT RÉVOQUER
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ALL_INTERFACES.map((itf, idx) => (
                <div 
                  key={itf.id}
                  onClick={() => togglePermission(itf.id)}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className={`group relative cursor-pointer p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden animate-in fade-in zoom-in-95 ${
                    permissions.includes(itf.id) 
                      ? 'border-red-600 bg-red-600/10 shadow-[0_0_40px_rgba(220,38,38,0.1)]' 
                      : 'border-red-600/10 bg-red-600/[0.02] hover:bg-red-600/[0.05] hover:border-red-600/30'
                  }`}
                >
                   <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <div className="relative z-10 flex items-center justify-between mb-6">
                      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 group-hover:scale-110 ${permissions.includes(itf.id) ? 'bg-red-600 text-white' : 'bg-red-600/10 text-red-400'}`}>
                         {itf.icon}
                      </div>
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${permissions.includes(itf.id) ? 'bg-red-600 border-red-600' : 'border-red-600/20'}`}>
                         {permissions.includes(itf.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                   </div>
                   <h4 className="relative z-10 text-xl font-black text-red-100 mb-2 tracking-tight">{itf.label}</h4>
                   <p className="relative z-10 text-[10px] font-black text-red-400/50 uppercase tracking-widest">{itf.description}</p>
                </div>
              ))}
           </div>
        </div>

        <div className="px-12 py-10 bg-slate-950/50 border-t border-red-600/20 flex items-center justify-center gap-10 shrink-0">
          <button onClick={onClose} className="px-14 py-5 bg-red-950/30 border border-red-600/20 rounded-full font-black text-[11px] uppercase tracking-widest text-red-400/70 hover:bg-red-600/10 transition-all">FERMER</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="group relative px-28 py-5 rounded-full overflow-hidden font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse"></div>
            <span className="relative z-10 text-white flex items-center gap-3">
              {saving ? 'SYNCHRONISATION...' : 'METTRE À JOUR LES ACCÈS'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};


