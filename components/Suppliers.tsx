
import React, { useState, useEffect } from 'react';
import { Supplier, Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { uploadImageToBucket, uploadImagesToBucket } from '../utils';

interface SuppliersProps {
  lang: Language;
}

export const Suppliers: React.FC<SuppliersProps> = ({ lang }) => {
  const t = translations[lang];
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Supplier | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      console.error('Database Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Supplier>) => {
    try {
      // Convert camelCase to snake_case for database compatibility
      const dbData = {
        code: data.code,
        name: data.name,
        dob: data.dob || null,
        pob: data.pob || '',
        address: data.address || '',
        art: data.art || '',
        nif: data.nif || '',
        rc: data.rc || '',
        nis: data.nis || '',
        mobile: data.mobile,
        phone2: data.phone2 || '',
        id_doc_type: data.idDocType || '',
        id_doc_number: data.idDocNumber || '',
        id_doc_image_urls: data.id_doc_image_urls || [],
        photo_url: data.photo_url || null
      };

      if (editingSupplier) {
        await supabase.from('suppliers').update(dbData).eq('id', editingSupplier.id);
      } else {
        await supabase.from('suppliers').insert([dbData]);
      }
      await fetchSuppliers();
      setIsFormOpen(false);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const filtered = suppliers.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-[6px] border-slate-100 border-t-blue-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-blue-600 uppercase tracking-[0.4em] text-[10px]">Chargement des partenaires...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      {/* Barre de recherche et ajout */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-[450px]">
          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl opacity-20">🔍</span>
          <input
            type="text"
            placeholder={t.suppliers.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 pl-18 pr-10 py-5 rounded-[2.5rem] outline-none focus:border-blue-500 transition-all shadow-sm font-bold text-black"
          />
        </div>
        <button 
          onClick={() => { setEditingSupplier(null); setIsFormOpen(true); }} 
          className="custom-gradient-btn px-14 py-5 rounded-[2.5rem] text-white font-black text-xs uppercase tracking-widest flex items-center gap-4 shadow-xl active:scale-95 transition-all"
        >
          <span className="text-2xl">👤</span> {t.suppliers.addBtn}
        </button>
      </div>

      {/* Grille des Cartes (Style Image Demandé) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-[3.5rem] border border-slate-50 p-8 shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col group h-full">
            <div className="mb-8">
               <h3 className="text-[28px] font-black text-[#0f172a] leading-tight tracking-tight truncate w-full">
                 {s.name}
               </h3>
               {s.created_by && (
                  <p className="text-[10px] font-black text-slate-500 uppercase mt-2">👤 Créé par: {s.created_by}</p>
               )}
            </div>

            <div className="space-y-6 mb-10">
               <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0 text-2xl">📍</div>
                  <p className="text-sm font-bold text-slate-500 leading-snug line-clamp-2">{s.address || "Alger, Algérie"}</p>
               </div>
               <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-2xl">📱</div>
                  <p className="text-lg font-black text-[#0f172a] tracking-tight">{s.mobile}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
               <button 
                 onClick={() => setViewingProfile(s)}
                 className="bg-[#0f172a] text-white py-4.5 px-6 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
               >
                 <span>👀</span> PROFIL
               </button>
               <button 
                 onClick={() => setViewingHistory(s)}
                 className="bg-[#2563eb] text-white py-4.5 px-6 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
               >
                 <span>📜</span> HISTORIQUE
               </button>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-slate-50 mt-auto">
               <button 
                 onClick={() => { setEditingSupplier(s); setIsFormOpen(true); }}
                 className="flex-grow bg-[#fffbeb] text-[#b45309] py-4.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#fef3c7] transition-all"
               >
                 <span>✏️</span> MODIFIER
               </button>
               <button 
                 onClick={async () => { if(confirm(t.suppliers.confirmDelete)) { await supabase.from('suppliers').delete().eq('id', s.id); fetchSuppliers(); } }}
                 className="h-14 w-14 rounded-full bg-[#fef2f2] flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
               >
                 <span className="text-xl">🗑️</span>
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modales */}
      {isFormOpen && <SupplierForm lang={lang} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} initialData={editingSupplier || undefined} />}
      {viewingProfile && <ProfileView supplier={viewingProfile} onClose={() => setViewingProfile(null)} />}
      {viewingHistory && <HistoryView supplier={viewingHistory} onClose={() => setViewingHistory(null)} />}
    </div>
  );
};

// --- COMPOSANT : VUE PROFIL DÉTAILLÉE ---
const ProfileView: React.FC<{ supplier: Supplier; onClose: () => void }> = ({ supplier, onClose }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
    <div className="relative bg-white w-full max-w-4xl rounded-[4rem] p-12 overflow-hidden shadow-2xl animate-in zoom-in-95">
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-center gap-8">
          <div className="h-32 w-32 rounded-[3.5rem] bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-6xl">
            {supplier.photo_url ? <img src={supplier.photo_url} className="w-full h-full object-cover" /> : '👤'}
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{supplier.name}</h2>
            <p className="text-blue-600 font-black text-xs uppercase tracking-widest mt-2">{supplier.code}</p>
          </div>
        </div>
        <button onClick={onClose} className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center text-2xl hover:bg-red-50 text-slate-400">✕</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <InfoRow label="Date de Naissance" value={supplier.dob} icon="📅" />
          <InfoRow label="Lieu de Naissance" value={supplier.pob} icon="📍" />
          <InfoRow label="Adresse" value={supplier.address} icon="🏠" />
        </div>
        <div className="bg-slate-50 p-10 rounded-[3rem] space-y-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Données Fiscales</h4>
          <div className="grid grid-cols-2 gap-6">
            <StatSmall label="NIF" value={supplier.nif} />
            <StatSmall label="RC" value={supplier.rc} />
            <StatSmall label="NIS" value={supplier.nis} />
            <StatSmall label="ART" value={supplier.art} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- COMPOSANT : VUE HISTORIQUE ---
const HistoryView: React.FC<{ supplier: Supplier; onClose: () => void }> = ({ supplier, onClose }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
    <div className="relative bg-white w-full max-w-5xl h-[80vh] rounded-[4rem] p-12 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
      <div className="flex justify-between items-center mb-12 shrink-0">
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
          <span className="text-4xl">📜</span> Historique des Achats : {supplier.name}
        </h3>
        <button onClick={onClose} className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center text-2xl">✕</button>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-y-4">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-8 pb-4">Date / Réf</th>
              <th className="px-8 pb-4">Véhicule</th>
              <th className="px-8 pb-4 text-right">Montant</th>
              <th className="px-8 pb-4 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(supplier.purchaseHistory || []).length > 0 ? (
              supplier.purchaseHistory.map(h => (
                <tr key={h.id} className="bg-slate-50 hover:bg-blue-50 transition-colors group">
                  <td className="px-8 py-6 rounded-l-[2rem] font-bold text-slate-800">{h.date}</td>
                  <td className="px-8 py-6 font-black text-slate-900 uppercase tracking-tight">{h.item}</td>
                  <td className="px-8 py-6 text-right font-black text-blue-600 text-lg">{h.amount.toLocaleString()} DA</td>
                  <td className="px-8 py-6 rounded-r-[2rem] text-center">
                    <span className="px-4 py-1.5 rounded-full bg-white text-[10px] font-black uppercase text-green-600 shadow-sm">PAYÉ</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold italic uppercase">Aucune transaction enregistrée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// --- COMPOSANT : FORMULAIRE (Style Images Demandé) ---
const SupplierForm: React.FC<{ lang: Language, onClose: () => void, onSubmit: (data: any) => void, initialData?: Supplier }> = ({ lang, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<Supplier>>(initialData || {
    name: '', code: `S-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, 
    dob: '', pob: '', address: '', art: '', nif: '', rc: '', nis: '', 
    mobile: '', phone2: '', idDocType: 'CNI Biométrique', idDocNumber: '', photo_url: '', id_doc_image_urls: []
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImageToBucket('supplier-photos', file);
      setFormData(prev => ({ ...prev, photo_url: url }));
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Erreur lors du téléchargement de la photo');
    }
  };

  const handleIdDocImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      const urls = await uploadImagesToBucket('supplier-id-docs', files);
      setFormData(prev => ({ ...prev, id_doc_image_urls: [...(prev.id_doc_image_urls ?? []), ...urls] }));
    } catch (err) {
      console.error('ID doc upload failed:', err);
      alert('Erreur lors du téléchargement des documents');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-white">
        
        <div className="px-12 py-10 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[1.8rem] bg-blue-600 text-white flex items-center justify-center text-4xl shadow-xl">👤</div>
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">{initialData ? "Modifier Partenaire" : "Nouveau Fournisseur"}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Informations d'identité</p>
            </div>
          </div>
          <button onClick={onClose} className="h-14 w-14 bg-white border border-slate-100 rounded-full flex items-center justify-center text-2xl hover:bg-red-50 text-slate-400">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar bg-white px-12 pb-12">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Colonne Gauche Identité */}
            <div className="lg:w-1/3 space-y-12 flex flex-col items-center">
              <div className="relative group mt-8">
                <div className="w-56 h-56 rounded-[4.5rem] bg-[#fcfcfc] border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                   {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <span className="text-[8rem] opacity-5">👤</span>}
                </div>
                <label className="absolute bottom-4 right-4 h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 shadow-2xl transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhoto} />
                  <span className="text-2xl">📷</span>
                </label>
              </div>
              <div className="w-full space-y-6">
                <FormField label="CODE FOURNISSEUR" name="code" value={formData.code} disabled icon="🏷️" />
                <FormField label="🖋️ NOM COMPLET" name="name" value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>

            {/* Colonne Droite Formulaire */}
            <div className="lg:w-2/3 space-y-10">
               <SectionBox title="Informations d'Identité" icon="📅">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormField label="Date de naissance" name="dob" type="date" value={formData.dob} onChange={(e:any) => setFormData({...formData, dob: e.target.value})} />
                     <FormField label="Lieu de naissance" name="pob" value={formData.pob} onChange={(e:any) => setFormData({...formData, pob: e.target.value})} />
                     <div className="md:col-span-2">
                        <FormField label="🏠 Adresse de résidence" name="address" value={formData.address} onChange={(e:any) => setFormData({...formData, address: e.target.value})} />
                     </div>
                  </div>
               </SectionBox>

               <SectionBox title="Coordonnées de Contact" icon="📱">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormField label="📱 N° Mobile Principal" name="mobile" value={formData.mobile} onChange={(e:any) => setFormData({...formData, mobile: e.target.value})} />
                     <FormField label="☎️ N° Téléphone Secondaire" name="phone2" value={formData.phone2} onChange={(e:any) => setFormData({...formData, phone2: e.target.value})} />
                  </div>
               </SectionBox>

               <details className="bg-[#fcfcfc]/80 rounded-[3.5rem] p-10 space-y-8 border border-slate-100/50 group">
                  <summary className="cursor-pointer flex items-center gap-6">
                     <div className="h-12 w-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-2xl shadow-sm border border-slate-100">⚖️</div>
                     <h4 className="text-xl font-black text-slate-800 tracking-tight">Données Fiscales & Légales <span className="text-xs font-bold text-slate-400">(Optionnel)</span></h4>
                  </summary>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
                     <FormField label="ART" name="art" value={formData.art} onChange={(e:any) => setFormData({...formData, art: e.target.value})} />
                     <FormField label="NIF" name="nif" value={formData.nif} onChange={(e:any) => setFormData({...formData, nif: e.target.value})} />
                     <FormField label="RC" name="rc" value={formData.rc} onChange={(e:any) => setFormData({...formData, rc: e.target.value})} />
                     <FormField label="NIS" name="nis" value={formData.nis} onChange={(e:any) => setFormData({...formData, nis: e.target.value})} />
                  </div>
               </details>
            </div>
          </div>
        </div>

        <div className="px-12 py-10 bg-white border-t border-slate-50 flex items-center justify-center gap-8 shrink-0">
          <button onClick={onClose} className="px-16 py-5 bg-white border border-slate-100 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest text-slate-600 hover:bg-slate-50">Annuler</button>
          <button onClick={() => onSubmit(formData)} className="custom-gradient-btn px-24 py-5 rounded-[2.5rem] text-white font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Enregistrer le fournisseur</button>
        </div>
      </div>
    </div>
  );
};

// --- Helpers de style ---
const SectionBox: React.FC<{ title: string, icon: string, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-[#fcfcfc]/80 rounded-[3.5rem] p-10 space-y-8 border border-slate-100/50">
    <div className="flex items-center gap-6">
       <div className="h-12 w-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-2xl shadow-sm border border-slate-100">{icon}</div>
       <h4 className="text-xl font-black text-slate-800 tracking-tight">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

const FormField: React.FC<{ label: string, name: string, value?: any, onChange?: any, type?: string, icon?: string, disabled?: boolean }> = ({ label, name, value, onChange, type = 'text', icon, disabled }) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
    <div className="relative group/field">
      {icon && <span className="absolute left-7 top-1/2 -translate-y-1/2 text-2xl opacity-10 group-focus-within/field:opacity-100 transition-all">{icon}</span>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-white border-none ${icon ? 'pl-18' : 'px-8'} py-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-500/5 font-black text-slate-800 shadow-sm transition-all text-xl tracking-tight ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const InfoRow = ({ label, value, icon }: any) => (
  <div className="flex items-center gap-6 p-6 rounded-[2rem] hover:bg-slate-50 transition-colors group">
    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold text-slate-900 tracking-tight mt-1">{value || '---'}</p>
    </div>
  </div>
);

const StatSmall = ({ label, value }: any) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100/50">
    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm font-black text-slate-800 truncate">{value || 'N/A'}</p>
  </div>
);
