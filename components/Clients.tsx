
import React, { useState, useEffect } from 'react';
import { Client, Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { uploadImageToBucket } from '../utils';

interface ClientsProps {
  lang: Language;
}

export const Clients: React.FC<ClientsProps> = ({ lang }) => {
  const t = translations[lang];
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Client | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Client | null>(null);
  const [viewingPayments, setViewingPayments] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      console.error('Database Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Client>) => {
    try {
      if (editingClient) {
        const { error } = await supabase.from('clients').update(data).eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([data]);
        if (error) throw error;
      }
      await fetchClients();
      setIsFormOpen(false);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const filtered = clients.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) || 
    c.mobile1?.includes(search) ||
    c.doc_number?.includes(search)
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-[6px] border-red-600/20 border-t-red-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-red-400 uppercase tracking-[0.4em] text-[10px]">Chargement des clients...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              👥 Clients
            </h1>
            <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
              {filtered.length} Client{filtered.length !== 1 ? 's' : ''} Enregistré{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button 
            onClick={() => { setEditingClient(null); setIsFormOpen(true); }}
            className="group relative px-8 py-4 rounded-xl overflow-hidden font-black uppercase tracking-wider text-sm transition-all duration-300 whitespace-nowrap"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
            <div className="relative z-10 flex items-center justify-center gap-3 text-white">
              <span className="transition-all duration-300 group-hover:scale-125 group-hover:animate-bounce">➕</span>
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Ajouter</span>
            </div>
          </button>
        </div>
      </div>

      {/* SEARCH BOX */}
      <div className="relative group">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, téléphone, document..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-6 py-4 rounded-[2rem] border border-red-600/40 bg-slate-900/50 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 transition-all backdrop-blur-sm font-black"
        />
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-red-600/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
      </div>

      {/* CLIENT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtered.map(c => (
          <div key={c.id} className="glass-card border border-red-600/40 rounded-[2rem] overflow-hidden shadow-xl hover:shadow-[0_0_60px_rgba(220,38,38,0.3)] transition-all duration-500 group flex flex-col h-full bg-gradient-to-b from-red-950/30 to-slate-900/50 hover:from-red-900/40 hover:to-slate-900/60">
            {/* Profile Section */}
            <div className="bg-gradient-to-r from-red-900/50 to-slate-950 p-6 flex items-center gap-4 border-b border-red-600/30">
              <div className="h-16 w-16 rounded-xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-2xl shrink-0 overflow-hidden shadow-inner">
                {c.photo_url ? <img src={c.photo_url} className="h-full w-full object-cover" /> : '👤'}
              </div>
              <div className="overflow-hidden flex-1">
                <h3 className="text-base font-black text-red-100 leading-tight tracking-tight truncate">
                  {c.first_name} {c.last_name}
                </h3>
                <p className="text-[9px] font-black text-red-400/60 uppercase tracking-[0.15em] mt-1">{c.profession || 'Particulier'}</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 p-6 flex-1">
              <div className="flex items-center gap-3 p-3 bg-red-600/10 rounded-lg border border-red-600/30 hover:bg-red-600/15 transition-colors">
                <span className="text-lg flex-shrink-0">📱</span>
                <p className="text-xs font-bold text-red-100 tracking-tight">{c.mobile1}</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-600/10 rounded-lg border border-red-600/30 hover:bg-red-600/15 transition-colors">
                <span className="text-lg flex-shrink-0">🆔</span>
                <p className="text-[8px] font-bold text-red-400/70 uppercase tracking-[0.1em]">{c.doc_type || 'DOC'}: {c.doc_number || '---'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 p-6 border-t border-red-600/30">
              {/* Row 1: View & History */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewingProfile(c)}
                  className="group/btn flex-1 relative py-3 px-4 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                  <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                    <span className="transition-all duration-300 group-hover/btn:scale-125">👁️</span>
                    <span>Voir</span>
                  </div>
                </button>
                <button 
                  onClick={() => setViewingHistory(c)}
                  className="group/btn flex-1 relative py-3 px-4 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                  <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                    <span className="transition-all duration-300 group-hover/btn:scale-125">📊</span>
                    <span>Achats</span>
                  </div>
                </button>
              </div>

              {/* Row 2: Payments & Edit */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewingPayments(c)}
                  className="group/btn flex-1 relative py-3 px-4 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                  <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                    <span className="transition-all duration-300 group-hover/btn:scale-125">💰</span>
                    <span>Paiements</span>
                  </div>
                </button>
                <button 
                  onClick={() => { setEditingClient(c); setIsFormOpen(true); }}
                  className="group/btn flex-1 relative py-3 px-4 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                  <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                    <span className="transition-all duration-300 group-hover/btn:scale-125">✏️</span>
                    <span>Editer</span>
                  </div>
                </button>
              </div>

              {/* Row 3: Delete */}
              <button 
                onClick={async () => { if(confirm('Voulez-vous supprimer ce client ?')) { await supabase.from('clients').delete().eq('id', c.id); fetchClients(); } }}
                className="w-full group/btn relative py-3 px-4 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-red-700 to-red-900 transition-all duration-300 group-hover/btn:from-red-800 group-hover/btn:via-red-600 group-hover/btn:to-red-800"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-red-800 via-red-600 to-red-800 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                  <span className="transition-all duration-300 group-hover/btn:scale-125">🗑️</span>
                  <span>Supprimer</span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modales */}
      {isFormOpen && <ClientForm onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} initialData={editingClient || undefined} />}
      {viewingProfile && <ProfileView client={viewingProfile} onClose={() => setViewingProfile(null)} />}
      {viewingHistory && <HistoryView client={viewingHistory} onClose={() => setViewingHistory(null)} />}
      {viewingPayments && <PaymentsHistoryView client={viewingPayments} onClose={() => setViewingPayments(null)} />}
    </div>
  );
};

// --- COMPOSANT : VUE PROFIL DÉTAILLÉE ---
const ProfileView: React.FC<{ client: Client; onClose: () => void }> = ({ client, onClose }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
    <div className="relative glass-card w-full max-w-4xl rounded-[3rem] p-12 overflow-hidden shadow-[0_0_120px_rgba(220,38,38,0.3)] animate-in zoom-in-95 border border-red-600/40 bg-gradient-to-b from-red-950/40 to-slate-950/60">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-900/50 to-transparent pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div className="flex items-center gap-8">
          <div className="h-32 w-32 rounded-2xl bg-red-600/20 border-2 border-red-600/40 shadow-xl overflow-hidden flex items-center justify-center text-6xl ring-2 ring-red-600/20">
            {client.photo_url ? <img src={client.photo_url} className="w-full h-full object-cover" /> : '👤'}
          </div>
          <div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tighter">{client.first_name} {client.last_name}</h2>
            <p className="text-red-400/80 font-black text-xs uppercase tracking-[0.2em] mt-2">{client.profession || 'Particulier'}</p>
          </div>
        </div>
        <button onClick={onClose} className="group h-12 w-12 bg-red-600/20 border border-red-600/40 rounded-full flex items-center justify-center text-xl hover:bg-red-600/40 hover:border-red-600/60 text-red-400 transition-all">
          <span className="group-hover:rotate-90 transition-transform">✕</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto max-h-[60vh] custom-scrollbar pr-4">
        <div className="space-y-6">
           <SectionBox title="Contact" icon="📱">
              <div className="space-y-4">
                 <InfoRow label="Mobile Principal" value={client.mobile1} icon="📞" />
                 <InfoRow label="Mobile Secondaire" value={client.mobile2} icon="☎️" />
                 <InfoRow label="Adresse de Résidence" value={client.address} icon="🏠" />
              </div>
           </SectionBox>
           <SectionBox title="État Civil" icon="👤">
              <div className="space-y-4">
                 <InfoRow label="Date de naissance" value={client.dob} icon="📅" />
                 <InfoRow label="Lieu de naissance" value={client.pob} icon="📍" />
                 <InfoRow label="Sexe" value={client.gender === 'M' ? 'Masculin' : 'Féminin'} icon="⚧" />
                 <InfoRow label="Profession" value={client.profession} icon="💼" />
              </div>
           </SectionBox>
        </div>
        <div className="space-y-6">
           <SectionBox title="Identité & Documents" icon="📄">
              <div className="space-y-4">
                 <InfoRow label="Type de document" value={client.doc_type} icon="🆔" />
                 <InfoRow label="Numéro de document" value={client.doc_number} icon="🔢" />
                 <InfoRow label="Date de délivrance" value={client.issue_date} icon="📅" />
                 <InfoRow label="Date d'expiration" value={client.expiry_date} icon="⏳" />
              </div>
           </SectionBox>
           <SectionBox title="Données Fiscales" icon="⚖️">
              <div className="grid grid-cols-2 gap-4">
                 <StatSmall label="NIF" value={client.nif} />
                 <StatSmall label="RC" value={client.rc} />
                 <StatSmall label="NIS" value={client.nis} />
                 <StatSmall label="ART" value={client.art} />
              </div>
           </SectionBox>
        </div>
      </div>
    </div>
  </div>
);

// --- COMPOSANT : VUE HISTORIQUE ACHATS ---
const HistoryView: React.FC<{ client: Client; onClose: () => void }> = ({ client, onClose }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const { data } = await supabase
        .from('sales')
        .select('*, car:purchases(*)')
        .eq('doc_number', client.doc_number)
        .order('created_at', { ascending: false });
      setSales(data || []);
      setLoading(false);
    };
    fetchSales();
  }, [client.doc_number]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-5xl h-[80vh] rounded-[3rem] p-12 flex flex-col shadow-[0_0_120px_rgba(220,38,38,0.3)] animate-in slide-in-from-bottom-10 border border-red-600/40 bg-gradient-to-b from-red-950/40 to-slate-950/60 overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-900/50 to-transparent pointer-events-none"></div>

        <div className="flex justify-between items-center mb-8 shrink-0 relative z-10">
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tighter flex items-center gap-4">
            <span className="text-4xl">🚗</span> Historique des Achats
          </h3>
          <button onClick={onClose} className="group h-12 w-12 bg-red-600/20 border border-red-600/40 rounded-full flex items-center justify-center text-xl hover:bg-red-600/40 hover:border-red-600/60 text-red-400 transition-all">
            <span className="group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-red-400/60 font-black uppercase tracking-widest">Chargement de l'historique...</div>
          ) : sales.length > 0 ? (
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[10px] font-black text-red-400/70 uppercase tracking-widest sticky top-0">
                  <th className="px-8 pb-4">Date</th>
                  <th className="px-8 pb-4">Véhicule</th>
                  <th className="px-8 pb-4 text-right">Prix de Vente</th>
                  <th className="px-8 pb-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="bg-red-600/10 hover:bg-red-600/20 transition-all group cursor-default border border-red-600/30">
                    <td className="px-8 py-6 rounded-l-xl font-bold text-red-100">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="font-black text-red-100 uppercase tracking-tight">{s.car?.make} {s.car?.model}</span>
                          <span className="text-[9px] font-bold text-red-400/70 uppercase tracking-widest">{s.car?.vin || '---'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-red-400 text-lg">{Number(s.total_price).toLocaleString()} DA</td>
                    <td className="px-8 py-6 rounded-r-xl text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm ${s.status === 'completed' ? 'bg-green-600/20 text-green-400 border border-green-600/40' : 'bg-amber-600/20 text-amber-400 border border-amber-600/40'}`}>
                        {s.status === 'completed' ? 'PAYÉ' : 'DÉBITEUR'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center text-red-400/60 font-black uppercase tracking-widest">Aucun achat enregistré</div>
          )}
        </div>
      </div>
    </div>
  );
};


// --- COMPOSANT : VUE HISTORIQUE PAIEMENTS ---
const PaymentsHistoryView: React.FC<{ client: Client; onClose: () => void }> = ({ client, onClose }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      // 1. Fetch all sales for this client (by ID or doc_number)
      const { data: clientSales } = await supabase
        .from('sales')
        .select('*, car:purchases(*)')
        .or(`client_id.eq.${client.id},doc_number.eq.${client.doc_number}`);
      
      const saleIds = clientSales?.map(s => s.id) || [];
      
      // 2. Fetch all actual payments from the payments table
      const { data: dbPayments } = await supabase
        .from('payments')
        .select('*, sale:sales(*, car:purchases(*))')
        .in('sale_id', saleIds.length > 0 ? saleIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false });

      // 3. Combine with synthetic records for legacy sales
      let finalPayments = dbPayments ? [...dbPayments] : [];
      
      clientSales?.forEach(sale => {
        // Check if there's already an initial payment recorded for this sale
        const hasInitial = finalPayments.some(p => p.sale_id === sale.id && (p.payment_method === 'Initial Payment' || p.payment_method === 'Cash'));
        
        if (!hasInitial && sale.amount_paid > 0) {
          // Add synthetic initial payment from legacy sale record
          finalPayments.push({
            id: `legacy-${sale.id}`,
            sale_id: sale.id,
            amount: sale.amount_paid,
            payment_method: 'Versement Initial',
            created_at: sale.created_at,
            sale: sale,
            is_legacy: true
          });
        }
      });

      // Sort by date descending
      finalPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setPayments(finalPayments);
      setLoading(false);
    };
    fetchPayments();
  }, [client]);

  const handlePrintPayment = (p: any) => {
    const printContent = `
      <html>
        <head>
          <title>Reçu de Paiement</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
            .details { margin-bottom: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .label { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .value { font-size: 16px; font-weight: 700; }
            .amount-box { background: #f8fafc; padding: 30px; border-radius: 20px; text-align: center; margin-bottom: 40px; border: 1px solid #e2e8f0; }
            .amount { font-size: 40px; font-weight: 900; color: #059669; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #f1f5f9; pt: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Reçu de Versement</div>
            <p>Showroom Management System</p>
          </div>
          <div class="details">
            <div><p class="label">Client</p><p class="value">${client.first_name} ${client.last_name}</p></div>
            <div><p class="label">Date du Paiement</p><p class="value">${new Date(p.created_at).toLocaleString()}</p></div>
            <div><p class="label">Véhicule Concerné</p><p class="value">${p.sale?.car?.make || '---'} ${p.sale?.car?.model || ''}</p></div>
            <div><p class="label">Méthode</p><p class="value">${p.payment_method || 'Espèces'}</p></div>
          </div>
          <div class="amount-box">
            <p class="label">Montant Versé</p>
            <p class="amount">${Number(p.amount).toLocaleString()} DA</p>
          </div>
          <div class="details">
            <div><p class="label">Référence Vente</p><p class="value">#VNT-${p.sale?.id?.slice(0,8).toUpperCase()}</p></div>
            <div><p class="label">Reste à payer après versement</p><p class="value">${Number(p.sale?.balance || 0).toLocaleString()} DA</p></div>
          </div>
          <div class="footer">Document généré le ${new Date().toLocaleDateString()} - Signature et Cachet</div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win?.document.write(printContent);
    win?.document.close();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-5xl h-[85vh] rounded-[3rem] p-12 flex flex-col shadow-[0_0_120px_rgba(220,38,38,0.3)] animate-in zoom-in-95 border border-red-600/40 bg-gradient-to-b from-red-950/40 to-slate-950/60 overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-900/50 to-transparent pointer-events-none"></div>

        <div className="flex justify-between items-center mb-8 shrink-0 relative z-10">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl flex items-center justify-center text-3xl shadow-lg">💰</div>
            <div>
              <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tighter">Historique des Paiements</h3>
              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-1">{client.first_name} {client.last_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="group h-12 w-12 bg-red-600/20 border border-red-600/40 rounded-full flex items-center justify-center text-xl hover:bg-red-600/40 hover:border-red-600/60 text-red-400 transition-all">
            <span className="group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-red-400/60 font-black uppercase tracking-widest">Récupération des paiements...</div>
          ) : payments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {payments.map(p => (
                <div key={p.id} className="bg-red-600/10 p-8 rounded-[2rem] border border-red-600/30 flex items-center justify-between hover:bg-red-600/15 hover:shadow-[0_0_40px_rgba(220,38,38,0.2)] transition-all relative overflow-hidden group">
                  {/* Visual Accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.payment_method.includes('Initial') ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  
                  <div className="flex items-center gap-10 flex-1">
                    <div className="text-center bg-red-600/20 px-8 py-4 rounded-lg border border-red-600/30 min-w-[140px] shadow-inner">
                      <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">{new Date(p.created_at).toLocaleDateString()}</p>
                      <p className="text-lg font-black text-red-100 tracking-tighter">{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${p.payment_method.includes('Initial') ? 'bg-blue-600/20 text-blue-400 border-blue-600/40' : 'bg-green-600/20 text-green-400 border-green-600/40'}`}>
                          {p.payment_method}
                        </span>
                        {p.is_legacy && <span className="text-[8px] font-black text-amber-400 uppercase bg-amber-600/20 px-3 py-1 rounded-full border border-amber-600/40">Dossier Archive</span>}
                      </div>
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tighter">{Number(p.amount).toLocaleString()} <span className="text-sm text-red-400/70 ml-1 bg-none">DA</span></p>
                    </div>

                    <div className="h-16 w-[1px] bg-red-600/30 mx-2"></div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest leading-none">Véhicule Associé</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🚗</span>
                        <div>
                          <p className="text-base font-black text-red-100 tracking-tight leading-none">{p.sale?.car?.make} {p.sale?.car?.model}</p>
                          <p className="text-[10px] font-bold text-red-400/70 mt-1 uppercase">ID Vente: #VNT-{p.sale_id?.slice(0,8).toUpperCase()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handlePrintPayment(p)}
                      className="group/btn relative px-8 py-4 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                      <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                        <span className="transition-all duration-300 group-hover/btn:scale-125">🖨️</span>
                        <span>Imprimer</span>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 text-center flex flex-col items-center gap-6">
              <span className="text-6xl opacity-20">💸</span>
              <p className="text-red-400/70 font-black uppercase text-sm tracking-widest">Aucun paiement enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANT : FORMULAIRE ---
export const ClientForm: React.FC<{ onClose: () => void, onSubmit: (data: any) => void, initialData?: Client }> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<Client>>(initialData || {
    first_name: '', last_name: '', dob: '', gender: 'M', pob: '', address: '',
    profession: '', mobile1: '', mobile2: '', nif: '', rc: '', nis: '', art: '',
    doc_type: 'ID', doc_number: '', issue_date: '', expiry_date: '', photo_url: '', scan_url: '', signature_url: ''
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImageToBucket('client-photos', file);
      setFormData(prev => ({ ...prev, photo_url: url }));
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Erreur lors du téléchargement de la photo');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-red-600/40 bg-gradient-to-b from-red-950/90 to-slate-950/90">
        
        <div className="px-12 py-8 flex items-center justify-between bg-gradient-to-r from-red-950 to-slate-900 shrink-0 border-b border-red-600/20">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-red-600/30 border border-red-600/40 text-red-100 flex items-center justify-center text-4xl shadow-xl">👥</div>
            <div>
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-500 tracking-tight">{initialData ? "Modifier Client" : "Nouveau Client"}</h2>
              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-1">Dossier Client</p>
            </div>
          </div>
          <button onClick={onClose} className="h-14 w-14 glass-card border border-red-600/40 rounded-full flex items-center justify-center text-2xl hover:bg-red-600/20 text-red-100 transition-all">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-950/20 p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="relative group mt-10">
                <div className="w-56 h-56 rounded-[4.5rem] bg-slate-900 border-4 border-red-600/30 shadow-xl flex items-center justify-center overflow-hidden">
                   {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <span className="text-[8rem] opacity-5">👤</span>}
                </div>
                <label className="absolute bottom-4 right-4 h-14 w-14 rounded-2xl bg-red-600 text-white flex items-center justify-center cursor-pointer hover:bg-red-700 shadow-2xl transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhoto} />
                  <span className="text-2xl">📷</span>
                </label>
              </div>
              <div className="w-full mt-12 space-y-4">
                 <FormField label="PRÉNOM" name="first_name" value={formData.first_name} onChange={(e:any) => setFormData({...formData, first_name: e.target.value})} />
                 <FormField label="NOM" name="last_name" value={formData.last_name} onChange={(e:any) => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
               <SectionBox title="Informations Personnelles" icon="👤">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormField label="Date de naissance" name="dob" type="date" value={formData.dob} onChange={(e:any) => setFormData({...formData, dob: e.target.value})} />
                     <FormField label="Lieu de naissance" name="pob" value={formData.pob} onChange={(e:any) => setFormData({...formData, pob: e.target.value})} />
                     <FormField label="Profession" name="profession" value={formData.profession} onChange={(e:any) => setFormData({...formData, profession: e.target.value})} />
                     <div className="space-y-4">
                        <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Genre</label>
                        <div className="flex gap-4">
                           <button type="button" onClick={() => setFormData({...formData, gender: 'M'})} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${formData.gender === 'M' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-900/50 text-red-400/70 border border-red-600/20'}`}>Homme</button>
                           <button type="button" onClick={() => setFormData({...formData, gender: 'F'})} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${formData.gender === 'F' ? 'bg-pink-600 text-white shadow-lg' : 'bg-slate-900/50 text-red-400/70 border border-red-600/20'}`}>Femme</button>
                        </div>
                     </div>
                  </div>
               </SectionBox>

               <SectionBox title="Coordonnées & Adresse" icon="📍">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormField label="Mobile Principal" name="mobile1" value={formData.mobile1} onChange={(e:any) => setFormData({...formData, mobile1: e.target.value})} />
                     <FormField label="Mobile Secondaire" name="mobile2" value={formData.mobile2} onChange={(e:any) => setFormData({...formData, mobile2: e.target.value})} />
                     <div className="md:col-span-2">
                        <FormField label="Adresse de résidence" name="address" value={formData.address} onChange={(e:any) => setFormData({...formData, address: e.target.value})} />
                     </div>
                  </div>
               </SectionBox>

               <SectionBox title="Documents d'Identité" icon="📄">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Type de document</label>
                        <div className="relative group/field">
                          <select 
                            name="doc_type" 
                            value={formData.doc_type} 
                            onChange={(e:any) => setFormData({...formData, doc_type: e.target.value})}
                            className="w-full bg-slate-900/50 border border-red-600/20 px-8 py-5 rounded-[2.2rem] outline-none focus:ring-4 focus:ring-red-600/10 focus:bg-slate-900 focus:border-red-600 font-black text-red-100 transition-all text-xl tracking-tight appearance-none cursor-pointer"
                          >
                            <option value="ID" className="bg-slate-900">Carte d'Identité (ID)</option>
                            <option value="Permis" className="bg-slate-900">Permis de Conduire</option>
                            <option value="Passport" className="bg-slate-900">Passeport</option>
                          </select>
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-focus-within/field:opacity-100 transition-all text-sm font-black text-red-400">
                             ▼
                          </div>
                        </div>
                     </div>
                     <FormField label="Numéro de document" name="doc_number" value={formData.doc_number} onChange={(e:any) => setFormData({...formData, doc_number: e.target.value})} />
                     <FormField label="Date de délivrance" name="issue_date" type="date" value={formData.issue_date} onChange={(e:any) => setFormData({...formData, issue_date: e.target.value})} />
                     <FormField label="Date d'expiration" name="expiry_date" type="date" value={formData.expiry_date} onChange={(e:any) => setFormData({...formData, expiry_date: e.target.value})} />
                  </div>
               </SectionBox>

               <SectionBox title="Informations Fiscales" icon="⚖️">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                     <FormField label="NIF" name="nif" value={formData.nif} onChange={(e:any) => setFormData({...formData, nif: e.target.value})} />
                     <FormField label="RC" name="rc" value={formData.rc} onChange={(e:any) => setFormData({...formData, rc: e.target.value})} />
                     <FormField label="NIS" name="nis" value={formData.nis} onChange={(e:any) => setFormData({...formData, nis: e.target.value})} />
                     <FormField label="ART" name="art" value={formData.art} onChange={(e:any) => setFormData({...formData, art: e.target.value})} />
                  </div>
               </SectionBox>
            </div>
          </div>
        </div>

        <div className="px-12 py-10 bg-gradient-to-r from-red-950 to-slate-900 border-t border-red-600/20 flex items-center justify-center gap-8 shrink-0">
          <button onClick={onClose} className="px-16 py-5 glass-card border border-red-600/40 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest text-red-100 hover:bg-red-600/20 transition-all">Annuler</button>
          <button onClick={() => onSubmit(formData)} className="relative group overflow-hidden px-24 py-5 font-black rounded-[2.5rem] transition-all duration-300 uppercase tracking-widest text-[11px] shadow-xl active:scale-95">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-[2.5rem] blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
            <div className="relative z-10 flex items-center justify-center gap-3 text-white">
              <span className="transition-all duration-300 group-hover:scale-125">✅</span>
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Enregistrer le client</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Helpers de style ---
const SectionBox: React.FC<{ title: string, icon: string, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="glass-card rounded-[3.5rem] p-10 space-y-8 border border-red-600/20 shadow-sm bg-slate-900/40">
    <div className="flex items-center gap-6">
       <div className="h-12 w-12 rounded-2xl bg-red-600/20 border border-red-600/40 text-red-100 flex items-center justify-center text-2xl shadow-inner">{icon}</div>
       <h4 className="text-xl font-black text-red-100 tracking-tight uppercase tracking-widest">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

const FormField: React.FC<{ label: string, name: string, value?: any, onChange?: any, type?: string, icon?: string, disabled?: boolean }> = ({ label, name, value, onChange, type = 'text', icon, disabled }) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">{label}</label>
    <div className="relative group/field">
      {icon && <span className="absolute left-7 top-1/2 -translate-y-1/2 text-2xl opacity-10 group-focus-within/field:opacity-100 transition-all">{icon}</span>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-slate-900/50 border border-red-600/20 ${icon ? 'pl-18' : 'px-8'} py-5 rounded-[2.2rem] outline-none focus:ring-4 focus:ring-red-600/10 focus:bg-slate-900 focus:border-red-600 font-black text-red-100 transition-all text-xl tracking-tight ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const InfoRow = ({ label, value, icon }: any) => (
  <div className="flex items-center gap-6 p-5 rounded-[2rem] hover:bg-red-600/10 transition-colors group">
    <div className="h-14 w-14 rounded-2xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{icon}</div>
    <div className="overflow-hidden">
      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold text-red-100 tracking-tight mt-1 truncate">{value || '---'}</p>
    </div>
  </div>
);

const StatSmall = ({ label, value }: any) => (
  <div className="bg-red-600/20 p-6 rounded-3xl border border-red-600/20/50">
    <p className="text-[8px] font-black text-red-400/70 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm font-black text-red-100 truncate">{value || 'N/A'}</p>
  </div>
);
