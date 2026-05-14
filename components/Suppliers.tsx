
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
      // Fetch all suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (suppliersError) throw suppliersError;
      
      // Fetch all purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('id, supplier_id, make, model, year, total_cost, created_at')
        .order('created_at', { ascending: false });
      
      if (purchasesError) throw purchasesError;

      // Map purchases to suppliers and normalize fields
      const suppliersWithHistory = (suppliersData || []).map(s => {
        const supplierPurchases = (purchasesData || [])
          .filter(p => p.supplier_id === s.id)
          .map(p => ({
            id: p.id,
            date: new Date(p.created_at || '').toLocaleDateString('fr-FR'),
            item: `${p.make} ${p.model} (${p.year})`,
            amount: p.total_cost || 0
          }));
        
        return {
          ...s,
          idDocType: s.id_doc_type,
          idDocNumber: s.id_doc_number,
          purchaseHistory: supplierPurchases
        };
      });
      
      setSuppliers(suppliersWithHistory);
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
      <div className="h-16 w-16 border-[6px] border-red-600/20 border-t-blue-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-red-400 uppercase tracking-[0.4em] text-[10px]">Chargement des partenaires...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              👥 {t.menu.suppliers}
            </h1>
            <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
              {filtered.length} Fournisseur{filtered.length !== 1 ? 's' : ''} Disponible{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button 
            onClick={() => { setEditingSupplier(null); setIsFormOpen(true); }} 
            className="group relative px-8 py-4 rounded-xl overflow-hidden font-black uppercase tracking-wider text-sm transition-all duration-300"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            
            {/* Dynamic shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            
            {/* Enhanced glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-center gap-3 text-white">
              <span className="transition-all duration-300 group-hover:scale-125 group-hover:animate-bounce">➕</span>
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Ajouter Fournisseur</span>
            </div>
          </button>
        </div>
      </div>

      {/* SEARCH BOX */}
      <div className="relative group">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-6 py-4 rounded-[2rem] border border-red-600/40 bg-slate-900/50 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 transition-all backdrop-blur-sm font-black"
        />
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-red-600/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
      </div>

      {/* SUPPLIERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((s, idx) => (
          <div 
            key={s.id} 
            className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group relative"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Profile Image */}
            <div className="h-40 overflow-hidden relative bg-gradient-to-br from-red-900/50 to-black flex items-center justify-center">
              {s.photo_url ? (
                <img 
                  src={s.photo_url} 
                  alt={s.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <span className="text-7xl opacity-20">👤</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-grow space-y-4">
              {/* Name & Code */}
              <div>
                <h3 className="text-xl font-black text-red-100 leading-tight line-clamp-2">{s.name}</h3>
                <p className="text-xs font-black text-red-400/70 mt-2">📦 {s.code}</p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center gap-2 text-red-300/80">
                  <span>📱</span>
                  <span className="font-black truncate">{s.mobile}</span>
                </div>
                {s.address && (
                  <div className="flex items-center gap-2 text-red-300/80 line-clamp-1">
                    <span>📍</span>
                    <span className="font-black truncate">{s.address}</span>
                  </div>
                )}
              </div>

              {s.created_by && (
                <p className="text-[10px] font-black text-red-400/50 uppercase">👤 Créé par: {s.created_by}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-4 border-t border-red-600/20 flex-wrap">
                <button 
                  onClick={() => setViewingProfile(s)} 
                  className="flex-1 min-w-[80px] relative group overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                    <span className="transition-all duration-300 group-hover:scale-125">👁️</span>
                    <span>Voir</span>
                  </div>
                </button>
                <button 
                  onClick={() => setViewingHistory(s)} 
                  className="flex-1 min-w-[80px] relative group overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                    <span className="transition-all duration-300 group-hover:scale-125">📊</span>
                    <span>Achats</span>
                  </div>
                </button>
                <button 
                  onClick={() => { setEditingSupplier(s); setIsFormOpen(true); }} 
                  className="flex-1 min-w-[80px] relative group overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                    <span className="transition-all duration-300 group-hover:scale-125">✏️</span>
                    <span>Modifier</span>
                  </div>
                </button>
                <button 
                  onClick={async () => { if(confirm(t.suppliers.confirmDelete)) { await supabase.from('suppliers').delete().eq('id', s.id); fetchSuppliers(); } }}
                  className="h-11 w-11 relative group overflow-hidden rounded-lg font-black flex items-center justify-center transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 text-lg transition-all duration-300 group-hover:scale-125">🗑️</div>
                </button>
              </div>
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
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    <div className="relative glass-card w-full max-w-4xl rounded-[3rem] p-6 md:p-8 shadow-2xl shadow-red-600/40 border border-red-600/40 animate-in zoom-in-95 overflow-y-auto max-h-[95vh]">
      {/* Header */}
      <div className="sticky top-0 flex justify-between items-start mb-8 pb-6 border-b border-red-600/40 bg-gradient-to-r from-red-950/90 to-slate-900/90 -m-8 p-8 mb-8 rounded-t-[3rem]">
        <div className="flex items-center gap-6 flex-1">
          <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-red-900/50 to-black border-2 border-red-600/40 shadow-xl overflow-hidden flex items-center justify-center flex-shrink-0 text-5xl">
            {supplier.photo_url ? <img src={supplier.photo_url} className="w-full h-full object-cover" /> : '👤'}
          </div>
          <div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">{supplier.name}</h2>
            <p className="text-red-400/70 font-black text-sm uppercase tracking-widest mt-2">📦 {supplier.code}</p>
          </div>
        </div>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 flex items-center justify-center text-xl font-black transition-all border border-red-600/30 flex-shrink-0">✕</button>
      </div>

      <div className="space-y-8">
        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500 mb-4">📞 Coordonnées de Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailBox label="📱 Téléphone Principal" value={supplier.mobile || 'N/A'} />
            {supplier.phone2 && <DetailBox label="☎️ Téléphone Secondaire" value={supplier.phone2 || 'N/A'} />}
            <DetailBox label="📍 Adresse" value={supplier.address || 'N/A'} />
          </div>
        </div>

        {/* Identity Information */}
        <div>
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 mb-4">📅 Informations d'Identité</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailBox label="Date de Naissance" value={supplier.dob ? new Date(supplier.dob).toLocaleDateString('fr-FR') : 'N/A'} />
            <DetailBox label="Lieu de Naissance" value={supplier.pob || 'N/A'} />
            <DetailBox label="Type de Document" value={supplier.idDocType || 'N/A'} />
            <DetailBox label="Numéro de Document" value={supplier.idDocNumber || 'N/A'} />
          </div>
        </div>

        {/* Tax Information */}
        <div>
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">⚖️ Données Fiscales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailBox label="NIF" value={supplier.nif || 'N/A'} color="blue" />
            <DetailBox label="RC" value={supplier.rc || 'N/A'} color="blue" />
            <DetailBox label="NIS" value={supplier.nis || 'N/A'} color="blue" />
            <DetailBox label="ART" value={supplier.art || 'N/A'} color="blue" />
          </div>
        </div>

        {/* ID Documents */}
        {supplier.id_doc_image_urls && supplier.id_doc_image_urls.length > 0 && (
          <div>
            <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-rose-500 mb-4">📄 Documents d'Identité</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {supplier.id_doc_image_urls.map((doc, idx) => (
                <img 
                  key={idx} 
                  src={doc} 
                  alt={`Document ${idx + 1}`} 
                  className="w-full h-40 object-cover rounded-[1.5rem] border border-rose-600/40 hover:scale-110 transition-transform hover:shadow-lg hover:shadow-rose-600/20"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- COMPOSANT : VUE HISTORIQUE ---
const HistoryView: React.FC<{ supplier: Supplier; onClose: () => void }> = ({ supplier, onClose }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    <div className="relative glass-card w-full max-w-6xl h-[85vh] rounded-[3rem] p-6 md:p-8 flex flex-col shadow-2xl shadow-red-600/40 border border-red-600/40 animate-in zoom-in-95">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-red-600/40 flex-shrink-0">
        <div>
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 flex items-center gap-4 mb-2">
            <span className="text-4xl">📜</span> Historique des Achats
          </h3>
          <p className="text-sm font-black text-red-400/70 uppercase tracking-widest">
            Fournisseur: <span className="text-red-300">{supplier.name}</span> • {(supplier.purchaseHistory || []).length} Achat{(supplier.purchaseHistory || []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onClose} className="h-12 w-12 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
          <div className="relative z-10 text-white">✕</div>
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {(supplier.purchaseHistory || []).length > 0 ? (
          <div className="space-y-4">
            {supplier.purchaseHistory.map((h, idx) => (
              <div key={h.id || idx} className="bg-red-600/10 hover:bg-red-600/20 transition-all border border-red-600/30 rounded-2xl p-6 group">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-16 w-16 bg-gradient-to-br from-red-600/40 to-red-600/20 rounded-2xl border border-red-600/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">🚗</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-red-100 mb-1">{h.item}</h4>
                      <p className="text-sm font-bold text-red-400/70">
                        <span className="inline-block bg-red-600/20 px-3 py-1 rounded-lg mr-3">
                          📅 {h.date}
                        </span>
                        <span className="inline-block bg-emerald-600/20 px-3 py-1 rounded-lg">
                          ✅ Enregistré
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Montant</p>
                    <p className="text-2xl font-black text-red-400">{h.amount.toLocaleString()}</p>
                    <p className="text-xs font-bold text-red-400/60">DA</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Summary Section */}
            <div className="sticky bottom-0 bg-gradient-to-t from-red-950/90 to-red-950/70 border-t border-red-600/30 rounded-b-[3rem] -mx-6 -mb-6 p-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-600/20 p-4 rounded-xl border border-red-600/30">
                  <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Total Achats</p>
                  <p className="text-xl font-black text-red-300">{(supplier.purchaseHistory || []).length}</p>
                </div>
                <div className="bg-red-600/20 p-4 rounded-xl border border-red-600/30">
                  <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Montant Cumulé</p>
                  <p className="text-xl font-black text-red-300">
                    {(supplier.purchaseHistory || [])
                      .reduce((sum, h) => sum + (h.amount || 0), 0)
                      .toLocaleString()} DA
                  </p>
                </div>
                <div className="bg-emerald-600/20 p-4 rounded-xl border border-emerald-600/30">
                  <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest mb-2">Statut Global</p>
                  <p className="text-xl font-black text-emerald-300">✅ Actif</p>
                </div>
                <div className="bg-blue-600/20 p-4 rounded-xl border border-blue-600/30">
                  <p className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest mb-2">Dernier Achat</p>
                  <p className="text-sm font-black text-blue-300">
                    {supplier.purchaseHistory && supplier.purchaseHistory.length > 0 
                      ? supplier.purchaseHistory[0].date 
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-red-400/70 font-black italic uppercase tracking-widest text-lg">Aucune transaction enregistrée</p>
            <p className="text-red-400/50 font-bold text-sm mt-3">Ce fournisseur n'a pas encore d'historique d'achat</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- COMPOSANT : FORMULAIRE ---
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
      const urls = await uploadImagesToBucket('supplier-id-docs', files as File[]);
      setFormData(prev => ({ ...prev, id_doc_image_urls: [...(prev.id_doc_image_urls ?? []), ...urls] }));
    } catch (err) {
      console.error('ID doc upload failed:', err);
      alert('Erreur lors du téléchargement des documents');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl shadow-red-600/40 border border-red-600/40 flex flex-col animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 md:px-8 py-8 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 shrink-0 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-full bg-red-600/30 text-red-300 flex items-center justify-center text-2xl border border-red-600/40">👤</div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">{initialData ? "Modifier Fournisseur" : "Nouveau Fournisseur"}</h2>
              <p className="text-xs font-black text-red-400/70 uppercase tracking-widest mt-1">Complétez les informations</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="relative z-10 text-white">✕</div>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 md:px-8 pb-8">
          <div className="flex flex-col lg:flex-row gap-8 py-8">
            
            {/* Left Column - Photo & Basic Info */}
            <div className="lg:w-1/3 flex flex-col items-center space-y-8">
              <div className="relative group mt-4">
                <div className="w-48 h-48 rounded-[3rem] bg-gradient-to-br from-red-900/50 to-black border-2 border-red-600/40 shadow-xl flex items-center justify-center overflow-hidden">
                   {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <span className="text-6xl opacity-20">👤</span>}
                </div>
                <label className="absolute bottom-3 right-3 h-12 w-12 rounded-full bg-red-600/50 hover:bg-red-600/70 text-white flex items-center justify-center cursor-pointer shadow-lg transition-all border border-red-500/50">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhoto} />
                  <span className="text-xl">📷</span>
                </label>
              </div>
              <div className="w-full space-y-6">
                <FormField label="CODE FOURNISSEUR" name="code" value={formData.code} disabled icon="🏷️" />
                <FormField label="NOM COMPLET" name="name" value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} icon="👤" />
              </div>
            </div>

            {/* Right Column - Form Fields */}
            <div className="lg:w-2/3 space-y-8">
               {/* Identity Section */}
               <SectionBox title="Informations d'Identité" icon="📅">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField label="Date de naissance" name="dob" type="date" value={formData.dob} onChange={(e:any) => setFormData({...formData, dob: e.target.value})} />
                     <FormField label="Lieu de naissance" name="pob" value={formData.pob} onChange={(e:any) => setFormData({...formData, pob: e.target.value})} icon="📍" />
                     <div className="md:col-span-2">
                        <FormField label="Adresse de résidence" name="address" value={formData.address} onChange={(e:any) => setFormData({...formData, address: e.target.value})} icon="🏠" />
                     </div>
                     <FormField label="Type de Document" name="idDocType" value={formData.idDocType} onChange={(e:any) => setFormData({...formData, idDocType: e.target.value})} icon="🆔" />
                     <FormField label="N° de Document" name="idDocNumber" value={formData.idDocNumber} onChange={(e:any) => setFormData({...formData, idDocNumber: e.target.value})} icon="🔢" />
                  </div>
               </SectionBox>

               {/* ID Doc Images Section */}
               <SectionBox title="Documents Scannés" icon="📄">
                 <div className="grid grid-cols-2 gap-4">
                   {formData.id_doc_image_urls?.map((url, i) => (
                     <img key={i} src={url} className="h-24 w-full object-cover rounded-xl border border-red-600/30" alt="doc" />
                   ))}
                   <label className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-red-600/40 rounded-xl cursor-pointer hover:bg-red-600/10 transition-all">
                     <span className="text-2xl">➕</span>
                     <input type="file" className="hidden" multiple accept="image/*" onChange={handleIdDocImages} />
                   </label>
                 </div>
               </SectionBox>

               {/* Contact Section */}
               <SectionBox title="Coordonnées de Contact" icon="📱">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField label="N° Mobile Principal" name="mobile" value={formData.mobile} onChange={(e:any) => setFormData({...formData, mobile: e.target.value})} icon="📱" />
                     <FormField label="N° Téléphone Secondaire" name="phone2" value={formData.phone2} onChange={(e:any) => setFormData({...formData, phone2: e.target.value})} icon="☎️" />
                  </div>
               </SectionBox>

               {/* Tax Information - Collapsible */}
               <details className="bg-red-600/10 rounded-[2rem] p-6 space-y-6 border border-red-600/30 group">
                  <summary className="cursor-pointer flex items-center gap-4">
                     <div className="h-10 w-10 rounded-lg bg-red-600/30 text-red-300 flex items-center justify-center text-lg border border-red-600/30">⚖️</div>
                     <h4 className="text-lg font-black text-red-200 tracking-tight">Données Fiscales & Légales <span className="text-xs font-bold text-red-400/70">(Optionnel)</span></h4>
                  </summary>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                     <FormField label="ART" name="art" value={formData.art} onChange={(e:any) => setFormData({...formData, art: e.target.value})} />
                     <FormField label="NIF" name="nif" value={formData.nif} onChange={(e:any) => setFormData({...formData, nif: e.target.value})} />
                     <FormField label="RC" name="rc" value={formData.rc} onChange={(e:any) => setFormData({...formData, rc: e.target.value})} />
                     <FormField label="NIS" name="nis" value={formData.nis} onChange={(e:any) => setFormData({...formData, nis: e.target.value})} />
                  </div>
               </details>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-red-950/50 to-slate-900/50 border-t border-red-600/40 flex items-center justify-center gap-4 shrink-0 flex-wrap">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-xl hover:bg-slate-900/70 transition-all uppercase tracking-wider text-sm">Annuler</button>
          <button onClick={() => onSubmit(formData)} className="relative group overflow-hidden px-12 py-3 font-black rounded-xl transition-all duration-300 uppercase tracking-wider text-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <div className="relative z-10 flex items-center justify-center gap-2 text-white">
              <span className="transition-all duration-300 group-hover:scale-125">✅</span>
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Enregistrer</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Helpers de style ---
const SectionBox: React.FC<{ title: string, icon: string, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-red-600/10 rounded-[2rem] p-6 space-y-6 border border-red-600/30">
    <div className="flex items-center gap-4">
       <div className="h-10 w-10 rounded-lg bg-red-600/30 text-red-300 flex items-center justify-center text-lg border border-red-600/30">{icon}</div>
       <h4 className="text-lg font-black text-red-200 tracking-tight">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

const FormField: React.FC<{ label: string, name: string, value?: any, onChange?: any, type?: string, icon?: string, disabled?: boolean }> = ({ label, name, value, onChange, type = 'text', icon, disabled }) => (
  <div className="space-y-2">
    <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative group/field">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40 group-focus-within/field:opacity-100 transition-all">{icon}</span>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-slate-900/30 border ${icon ? 'pl-12' : 'px-4'} py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-black text-red-200 shadow-sm transition-all text-sm tracking-tight border-red-600/30 placeholder-red-400/40 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const DetailBox = ({ label, value, color = 'red' }: { label: string; value: string; color?: string }) => {
  const colorMap = {
    red: { bg: 'bg-red-600/20', border: 'border-red-600/30', label: 'text-red-400/70', value: 'text-red-200' },
    blue: { bg: 'bg-blue-600/20', border: 'border-blue-600/30', label: 'text-blue-400/70', value: 'text-blue-200' },
    rose: { bg: 'bg-rose-600/20', border: 'border-rose-600/30', label: 'text-rose-400/70', value: 'text-rose-200' }
  };
  
  const colors = colorMap[color as keyof typeof colorMap] || colorMap.red;

  return (
    <div className={`${colors.bg} ${colors.border} p-4 rounded-[1.5rem] border`}>
      <p className={`text-xs font-black ${colors.label} uppercase tracking-wider`}>{label}</p>
      <p className={`font-black ${colors.value} mt-2 break-words`}>{value}</p>
    </div>
  );
};


