
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
  
  const [activeModal, setActiveModal] = useState<'create' | 'advance' | 'absences' | 'payment' | 'history' | null>(null);
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
      delete payload.created_at;
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
        const { error } = await supabase.from('workers').insert([payload]);
        if (error) throw error;
      }
      fetchWorkers();
      setActiveModal(null);
    } catch (err: any) {
      alert(`Erreur base de données : ${err.message}`);
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
      alert("Enregistré avec succès.");
      fetchWorkers();
    } catch (err: any) {
      alert(`Erreur transaction : ${err.message}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-[6px] border-slate-100 border-t-blue-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-blue-600 uppercase tracking-[0.4em] text-[10px]">Chargement de l'équipe...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-50 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Équipe</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-3">Gestion RH & Salaires</p>
        </div>
        <button 
          onClick={() => { setSelectedWorker(null); setActiveModal('create'); }} 
          className="custom-gradient-btn px-14 py-5 rounded-[2.5rem] text-white font-black text-xs uppercase tracking-widest flex items-center gap-4 shadow-xl active:scale-95 transition-all"
        >
          <span className="text-2xl">👤</span> {t.team.addWorker}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {workers.map(w => (
          <WorkerCard 
            key={w.id} 
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
      case 'admin': return 'bg-blue-50 text-blue-600';
      case 'driver': return 'bg-orange-50 text-orange-600';
      case 'worker':
      default: return 'bg-green-50 text-green-600';
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
    <div className="bg-white rounded-[3.5rem] border border-slate-50 p-8 shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col group h-full relative">
      <div className="flex flex-col items-center mb-6">
        <div className="w-28 h-28 rounded-full bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center mb-4">
          {worker.photo_url ? <img src={worker.photo_url} className="w-full h-full object-cover" /> : <span className="text-5xl">👨‍🔧</span>}
        </div>
        <h3 className="text-2xl font-black text-[#0f172a] text-center truncate w-full mb-2">{worker.fullname}</h3>
        {/* created_by removed from UI - auditing handled server-side */}
        <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${getRoleColor(worker.role)}`}>
          <span className="text-lg">{getRoleEmoji(worker.role)}</span>
          {getRoleLabel(worker.role)}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-4">
          <span className="text-2xl">📞</span>
          <p className="text-sm font-bold text-[#0f172a]">{worker.telephone}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl">💰</span>
          <p className="text-sm font-bold text-blue-600">
            {Number(worker.amount || 0).toLocaleString()} {t.currency} <span className="text-[10px] text-slate-400 font-medium">/ {worker.payment_type === 'month' ? 'Mois' : 'Jour'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => onAction('payment')} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg">💸 Paiement</button>
        <button onClick={() => onAction('advance')} className="bg-amber-400 text-amber-900 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-lg">💎 Avance</button>
        <button onClick={() => onAction('absences')} className="bg-red-500 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg">🚫 Absences</button>
        <button onClick={() => onAction('history')} className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg">📋 Historique</button>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-50 mt-auto">
        <button onClick={onEdit} className="flex-grow bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">✏️ Modifier</button>
        <button onClick={onDelete} className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-xl hover:bg-red-500 hover:shadow-lg transition-all">🗑️</button>
      </div>
    </div>
  );
};

const WorkerFormModal = ({ lang, initialData, onClose, onSubmit }: any) => {
  const t = translations[lang as Language];
  const [formData, setFormData] = useState<Partial<Worker>>(initialData || {
    fullname: '', birthday: '', telephone: '', email: '', address: '', id_card: '',
    type: 'Worker', role: 'worker', payment_type: 'month', amount: 0, username: '', password: '', photo_url: ''
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-white">
        
        <div className="px-12 py-8 flex items-center justify-between bg-white shrink-0 border-b border-slate-50">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl shadow-xl">👤</div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{initialData ? t.team.editWorker : t.team.addWorker}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Profil Collaborateur</p>
            </div>
          </div>
          <button onClick={onClose} className="h-12 w-12 bg-white border border-slate-100 rounded-full flex items-center justify-center text-xl hover:bg-red-50 text-slate-400">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#f8fafc]/30 px-12 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="relative group mt-10">
                <div className="w-56 h-56 rounded-[4.5rem] bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                   {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <span className="text-[8rem] opacity-5">👤</span>}
                </div>
                <label className="absolute bottom-4 right-4 h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 shadow-2xl transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhoto} />
                  <span className="text-2xl">📷</span>
                </label>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
               <SectionBox title="Informations Personnelles" icon="👤">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldBox label="NOM COMPLET" name="fullname" value={formData.fullname} onChange={(e:any) => setFormData({...formData, fullname: e.target.value})} />
                    <FieldBox label="DATE DE NAISSANCE" name="birthday" type="date" value={formData.birthday} onChange={(e:any) => setFormData({...formData, birthday: e.target.value})} />
                    <FieldBox label="TÉLÉPHONE" name="telephone" value={formData.telephone} onChange={(e:any) => setFormData({...formData, telephone: e.target.value})} />
                    <FieldBox label="EMAIL" name="email" type="email" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} />
                  </div>
               </SectionBox>

               <SectionBox title="Contrat & Compte" icon="💰">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldBox label="SALAIRE / MONTANT" name="amount" type="number" value={formData.amount} onChange={(e:any) => setFormData({...formData, amount: Number(e.target.value)})} />
                    <SelectFieldBox label="TYPE DE PAIEMENT" name="payment_type" value={formData.payment_type} onChange={(e:any) => setFormData({...formData, payment_type: e.target.value as any})} options={[{label:'Par mois', value:'month'}, {label:'Par jour', value:'day'}]} />
                    <FieldBox label="USERNAME" name="username" value={formData.username} onChange={(e:any) => setFormData({...formData, username: e.target.value})} />
                    <FieldBox label="PASSWORD" name="password" type="password" value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} />
                  </div>
               </SectionBox>

               <SectionBox title="Rôle & Permissions" icon="🔐">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <label className="relative flex items-center cursor-pointer group">
                      <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={(e) => setFormData({...formData, role: e.target.value as any})} className="sr-only" />
                      <div className={`flex-1 p-6 rounded-[2rem] border-2 transition-all ${formData.role === 'admin' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}>
                        <div className="text-3xl mb-2">👑</div>
                        <div className="font-black uppercase text-[10px] text-slate-900">Admin</div>
                        <div className="text-[9px] text-slate-500 mt-1">Accès complet</div>
                      </div>
                    </label>
                    <label className="relative flex items-center cursor-pointer group">
                      <input type="radio" name="role" value="worker" checked={formData.role === 'worker'} onChange={(e) => setFormData({...formData, role: e.target.value as any})} className="sr-only" />
                      <div className={`flex-1 p-6 rounded-[2rem] border-2 transition-all ${formData.role === 'worker' ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-white'}`}>
                        <div className="text-3xl mb-2">👨‍💼</div>
                        <div className="font-black uppercase text-[10px] text-slate-900">Worker</div>
                        <div className="text-[9px] text-slate-500 mt-1">Accès limité</div>
                      </div>
                    </label>
                    
                  </div>
               </SectionBox>
            </div>
          </div>
        </div>

        <div className="px-12 py-8 bg-white border-t border-slate-50 flex items-center justify-center gap-6 shrink-0">
          <button onClick={onClose} className="px-10 py-4 bg-slate-50 border border-slate-100 rounded-full font-black text-[11px] uppercase tracking-widest text-slate-500">ANNULER</button>
          <button onClick={() => onSubmit(formData)} className="bg-slate-900 px-20 py-4 rounded-full text-white font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95">ENREGISTRER</button>
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
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-white">
        <h3 className="text-3xl font-black text-slate-900 mb-10 tracking-tight text-center">{title}</h3>
        <div className="space-y-8">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">MONTANT (DA)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className={`w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2.5rem] outline-none focus:border-${color}-500 font-black text-3xl transition-all shadow-inner`} />
           </div>
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">DATE</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2.5rem] outline-none focus:border-blue-500 font-bold" />
           </div>
           <div className="grid grid-cols-2 gap-4 pt-6">
              <button onClick={onClose} className="py-5 rounded-full font-black uppercase text-[10px] tracking-widest text-slate-400 bg-slate-50">ANNULER</button>
              <button onClick={() => onConfirm(amount, date)} className={`py-5 rounded-full font-black uppercase text-[10px] tracking-widest text-white bg-${color}-500 shadow-xl active:scale-95 transition-all hover:opacity-90`}>CONFIRMER</button>
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

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const { data } = await supabase.from('worker_transactions')
        .select('*')
        .eq('worker_id', worker.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        // Trouver le dernier paiement pour resetter les compteurs visuels
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
  }, [worker.id]);

  const final = baseSalary - advances - absences;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[4.5rem] shadow-2xl animate-in zoom-in-95 border border-white overflow-hidden flex flex-col">
        
        <div className="bg-slate-900 p-12 text-white flex justify-between items-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
           <div className="relative z-10">
              <h3 className="text-4xl font-black tracking-tighter uppercase leading-none">Bulletin de Paie</h3>
              <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mt-3">{worker.fullname} • {new Date().toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})}</p>
           </div>
           <div className="relative z-10 h-16 w-16 bg-white/10 rounded-3xl flex items-center justify-center text-3xl">💵</div>
        </div>

        <div className="p-12 space-y-10">
           {loadingStats ? (
             <div className="py-10 text-center animate-pulse text-slate-300 font-black uppercase text-xs tracking-widest">Calcul du solde...</div>
           ) : (
             <div className="space-y-4">
                <div className="flex justify-between items-center py-5 border-b border-slate-50">
                   <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Salaire de base</span>
                   <span className="text-xl font-black text-slate-800">{baseSalary.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between items-center py-5 border-b border-slate-50">
                   <span className="text-amber-500 font-bold uppercase text-[10px] tracking-widest">Total des avances</span>
                   <span className="text-xl font-black text-amber-500">- {advances.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between items-center py-5 border-b border-slate-50">
                   <span className="text-red-500 font-bold uppercase text-[10px] tracking-widest">Pénalités d'absence</span>
                   <span className="text-xl font-black text-red-500">- {absences.toLocaleString()} DA</span>
                </div>
                <div className="bg-blue-50/50 p-8 rounded-[2.5rem] flex justify-between items-center border border-blue-100 mt-6 shadow-inner">
                   <span className="text-blue-600 font-black uppercase text-xs tracking-[0.2em]">Net à verser</span>
                   <span className="text-4xl font-black text-blue-600 tracking-tighter">{final.toLocaleString()} DA</span>
                </div>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date du versement</label>
                 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-[2rem] outline-none font-bold" />
              </div>
              <div className="flex items-end">
                 <button 
                   onClick={() => onConfirm(final, date)} 
                   disabled={loadingStats}
                   className="w-full custom-gradient-btn py-5 rounded-[2rem] text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                   Confirmer le paiement 💎
                 </button>
              </div>
           </div>
           <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">Après confirmation, les avances et absences seront remises à 0 pour la prochaine période.</p>
        </div>

        <div className="p-8 bg-slate-50 text-center">
           <button onClick={onClose} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">Annuler</button>
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
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[4rem] p-14 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[85vh] overflow-hidden flex flex-col border border-white">
        <div className="flex justify-between items-center mb-12 shrink-0">
           <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Historique RH</h3>
           <button onClick={onClose} className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
        </div>
        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-grow">
           {loading ? <p className="text-center py-20 font-black uppercase animate-pulse text-slate-300">Chargement...</p> : 
            history.map((p, idx) => (
             <div key={idx} className="bg-slate-50/50 border border-slate-100 p-8 rounded-[3rem] flex items-center justify-between hover:bg-white hover:shadow-xl transition-all group">
                <div className="flex items-center gap-6">
                   <div className={`h-16 w-16 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-sm ${p.type.toLowerCase() === 'paiement' ? 'bg-blue-50' : p.type.toLowerCase() === 'avance' ? 'bg-amber-50' : 'bg-red-50'}`}>
                     {p.type.toLowerCase() === 'paiement' ? '💰' : p.type.toLowerCase() === 'avance' ? '💎' : '🚫'}
                   </div>
                   <div>
                      <p className="font-black text-slate-800 text-xl tracking-tight capitalize">{p.type}</p>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                   </div>
                </div>
                <p className={`text-3xl font-black tracking-tighter ${p.type.toLowerCase() === 'absence' ? 'text-red-500' : 'text-[#0f172a]'}`}>
                   {Number(p.amount).toLocaleString()} <span className="text-sm font-bold text-slate-300 tracking-normal">DA</span>
                </p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const SectionBox = ({ title, icon, children }: any) => (
  <div className="bg-white rounded-[3.5rem] p-10 space-y-8 shadow-sm border border-slate-100">
    <div className="flex items-center gap-6">
       <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center text-2xl shadow-inner">{icon}</div>
       <h4 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

const FieldBox = ({ label, name, value, onChange, type = 'text' }: any) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} className="w-full bg-[#f8fafc] border border-slate-100 px-6 py-5 rounded-[2rem] outline-none focus:border-blue-500 font-bold text-slate-800 transition-all shadow-inner" />
  </div>
);

const SelectFieldBox = ({ label, name, value, onChange, options }: any) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
    <select name={name} value={value} onChange={onChange} className="w-full bg-[#f8fafc] border border-slate-100 px-6 py-5 rounded-[2rem] outline-none font-bold text-slate-800 appearance-none" >
      {options.map((opt: any) => (
        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
      ))}
    </select>
  </div>
);
