import React, { useState, useEffect, useMemo } from 'react';
import { BillingRecord, Language, SaleRecord, InspectionRecord, PurchaseRecord } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface BillingProps {
  lang: Language;
}

export const getTypeStyle = (type: string) => {
  switch(type) {
    case 'sale': return 'bg-green-50 text-green-600 border-green-100';
    case 'purchase': return 'bg-red-50 text-red-600 border-red-100';
    case 'checkin': return 'bg-blue-50 text-red-400 border-red-600/30';
    case 'checkout': return 'bg-purple-50 text-purple-600 border-purple-100';
    default: return 'bg-slate-50 text-red-400/70 border-red-600/20';
  }
};

export const Billing: React.FC<BillingProps> = ({ lang }) => {
  const t = translations[lang];
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sale' | 'purchase'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebtsOnly, setShowDebtsOnly] = useState(false);
  
  const [printingRecord, setPrintingRecord] = useState<any | null>(null);
  const [printType, setPrintType] = useState<'sale' | 'purchase' | 'inspection' | 'receipt' | null>(null);
  const [inventory, setInventory] = useState<PurchaseRecord[]>([]);
  const [showroom, setShowroom] = useState<any>({
    name: 'AutoLux Premium',
    slogan: 'Excellence Automobile',
    address: 'Alger, Algérie',
    facebook: '',
    instagram: '@autolux_dz',
    whatsapp: '',
    logo_url: '',
    logo_data: ''
  });

  const [payingSale, setPayingSale] = useState<any | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<any | null>(null);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
    fetchInventory();
    fetchShowroom();
  }, []);

  const fetchShowroom = async () => {
    const { data } = await supabase.from('showroom_config').select('*').eq('id', 1).maybeSingle();
    if (data) setShowroom(data);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('purchases').select('*');
    if (data) setInventory(data);
  };

  const handleShowDetails = (item: any) => {
    if (item.type === 'sale') {
      const carData = inventory.find(c => c.id === item.raw.car_id);
      // Find the most recent checkout inspection linked to this car
      const linkedInsp = allInspections.find(i => i.car_id === item.raw.car_id && i.type === 'checkout')
                      || allInspections.find(i => i.car_id === item.raw.car_id);
      setSelectedItemForDetails({ ...item.raw, car: carData, type: 'sale', linkedInspection: linkedInsp });
    } else if (item.type === 'purchase') {
      // Find the most recent checkin inspection linked to this purchase (car)
      const linkedInsp = allInspections.find(i => i.car_id === item.raw.id && i.type === 'checkin')
                      || allInspections.find(i => i.car_id === item.raw.id);
      setSelectedItemForDetails({ ...item.raw, type: 'purchase', linkedInspection: linkedInsp });
    } else {
      setSelectedItemForDetails({ ...item.raw, type: item.type });
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').order('created_at', { ascending: false })
      ]);

      const salesData = (salesRes.data || []).map(s => ({
        ...s,
        type: 'sale',
        ref: `VNT-${s.id.slice(0, 8).toUpperCase()}`,
        date: new Date(s.created_at).toLocaleDateString('fr-FR'),
        partner: `${s.first_name} ${s.last_name}`,
        amount: s.total_price,
        paid: s.amount_paid,
        balance: s.balance,
        car: s.car_id,
        isImpaye: (s.balance || 0) > 0,
        raw: s
      }));

      const purchases = (purchasesRes.data || []).map(p => ({
        ...p,
        type: 'purchase',
        ref: `ACH-${p.id.slice(0, 8).toUpperCase()}`,
        date: new Date(p.created_at).toLocaleDateString('fr-FR'),
        partner: p.supplier_name || 'Supplier',
        amount: p.total_cost,
        paid: p.total_cost,
        balance: 0,
        car: `${p.make} ${p.model}`,
        isImpaye: false,
        raw: p
      }));

      setSales(salesData);
      setHistory([...salesData, ...purchases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Fetch History Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = history.filter(item => {
    let matchesFilter = filter === 'all' || item.type === filter;

    const matchesDebt = !showDebtsOnly || (item.isImpaye === true);

    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (item.ref && item.ref.toLowerCase().includes(q)) ||
      (item.partner && item.partner.toLowerCase().includes(q)) ||
      (item.raw?.first_name && item.raw.first_name.toLowerCase().includes(q)) ||
      (item.raw?.last_name && item.raw.last_name.toLowerCase().includes(q)) ||
      (item.raw?.mobile1 && item.raw.mobile1.toLowerCase().includes(q)) ||
      (item.raw?.phone && item.raw.phone.toLowerCase().includes(q)) ||
      (item.raw?.doc_number && item.raw.doc_number.toLowerCase().includes(q)) ||
      (item.raw?.vin && item.raw.vin.toLowerCase().includes(q)) ||
      (item.car && typeof item.car === 'string' && item.car.toLowerCase().includes(q)) ||
      (item.type === 'sale' && inventory.find(c => c.id === item.car)?.model?.toLowerCase().includes(q));

    return matchesFilter && matchesDebt && matchesSearch;
  });

  const stats = useMemo(() => {
    const salesOnly = history.filter(h => h.type === 'sale');
    return {
      revenue: salesOnly.reduce((acc, s) => acc + (s.paid || 0), 0),
      debts: salesOnly.reduce((acc, s) => acc + (s.balance || 0), 0),
      count: salesOnly.length
    };
  }, [history]);

  const handlePrintRequest = (item: any) => {
    setPrintingRecord(item.raw);
    if (item.type === 'sale') setPrintType('sale');
    else if (item.type === 'purchase') setPrintType('purchase');
    else setPrintType('inspection');
  };

  const handleUpdatePayment = async () => {
    if (!payingSale || newPaymentAmount <= 0) return;
    setIsUpdatingPayment(true);
    
    const updatedPaid = (payingSale.amount_paid || 0) + newPaymentAmount;
    const updatedBalance = Math.max(0, (payingSale.total_price || 0) - updatedPaid);
    
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({
          amount_paid: updatedPaid,
          balance: updatedBalance,
          status: updatedBalance === 0 ? 'completed' : 'debt'
        })
        .eq('id', payingSale.id)
        .select();

      if (error) throw error;

      // Record the payment in the payments table
      await supabase.from('payments').insert([{
        sale_id: payingSale.id,
        client_id: (payingSale as any).client_id || null,
        amount: newPaymentAmount,
        payment_method: 'Installment',
        created_by: (await supabase.auth.getUser()).data.user?.id
      }]);

      setPrintType('receipt');
      const finalRecord = {
        ...payingSale,
        payment_received: newPaymentAmount,
        total_after: updatedPaid,
        balance_after: updatedBalance,
        payment_date: new Date().toLocaleDateString('fr-FR')
      };
      setPrintingRecord(finalRecord);

      setPayingSale(null);
      setNewPaymentAmount(0);
      fetchHistory();
    } catch (err: any) {
      alert(`Erreur de paiement : ${err.message}`);
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (confirm("Archiver définitivement cette pièce comptable ?")) {
      let table = 'sales';
      if (item.type === 'purchase') table = 'purchases';
      else if (item.type === 'checkin' || item.type === 'checkout') table = 'inspections';
      
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (!error) fetchHistory();
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
      <p className="mt-6 font-black text-red-400/70 uppercase tracking-widest text-[10px]">Chargement des archives...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">📋 Facturation & Historique</h1>
          <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">Suivi des Paiements & Dossiers Techniques</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
        <div></div>

        {/* Stats Summary */}
        <div className="flex gap-4">
           <div className="bg-red-600/10 border border-red-600/30 px-6 py-4 rounded-[2rem] flex items-center gap-4 hover:bg-red-600/15 transition-colors">
              <div className="h-12 w-12 bg-green-600/30 text-green-400 border border-green-600/40 rounded-2xl flex items-center justify-center text-xl shadow-lg">💰</div>
              <div>
                 <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Revenus Encaissés</p>
                 <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600">{stats.revenue.toLocaleString()} DA</p>
              </div>
           </div>
           <div className="bg-red-600/10 border border-red-600/30 px-6 py-4 rounded-[2rem] flex items-center gap-4 hover:bg-red-600/15 transition-colors">
              <div className="h-12 w-12 bg-amber-600/30 text-amber-400 border border-amber-600/40 rounded-2xl flex items-center justify-center text-xl shadow-lg">⏳</div>
              <div>
                 <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Dettes Clients</p>
                 <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600">{stats.debts.toLocaleString()} DA</p>
              </div>
           </div>
           <div className="bg-red-600/10 border border-red-600/30 px-6 py-4 rounded-[2rem] flex items-center gap-4 hover:bg-red-600/15 transition-colors">
              <div className="h-12 w-12 bg-blue-600/30 text-blue-400 border border-blue-600/40 rounded-2xl flex items-center justify-center text-xl shadow-lg">📋</div>
              <div>
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Ventes Totales</p>
                 <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600">{stats.count} Dossiers</p>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          <div className="flex w-full md:w-[450px] gap-2">
             <div className="relative flex-grow group">
                <input 
                  type="text" 
                  placeholder="🔍 Recherche globale (Client, Tél, ID, VIN...)" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-3 rounded-[2rem] border border-red-600/40 bg-slate-900/50 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 transition-all backdrop-blur-sm font-black text-xs"
                />
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-red-600/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
             </div>
             <button 
               onClick={() => setShowDebtsOnly(!showDebtsOnly)}
               className={`flex-shrink-0 px-5 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${showDebtsOnly ? 'bg-red-600/20 border border-red-600/40 text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-red-600/10 border border-red-600/30 text-red-400/70 hover:bg-red-600/15'}`}
               title="N'afficher que les impayés"
             >
                <span className={showDebtsOnly ? 'animate-pulse text-red-400' : 'opacity-50'}>⚠️</span>
                Impayés
             </button>
          </div>

          <div className="flex bg-red-950/30 p-2 rounded-[2rem] border border-red-600/30 w-full overflow-x-auto custom-scrollbar gap-1">
             {[
               { key: 'all',      label: '🗂️ Tous',       color: '' },
               { key: 'sale',     label: '🛍️ Ventes',    color: '' },
               { key: 'purchase', label: '🛒 Achats',     color: '' },
             ].map(f => (
               <button
                 key={f.key}
                 onClick={() => setFilter(f.key as any)}
                 className={`flex-shrink-0 px-6 py-3 rounded-[1.5rem] font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${
                   filter === f.key
                     ? 'bg-red-600/20 border border-red-600/40 text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                     : 'text-red-400/70 hover:bg-red-600/10'
                 }`}
               >
                 {f.label}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Contextual banner for grouped inspection filters */}
      {/* Removed - No longer needed as we removed checkin/checkout filters */}

      <div className="glass-card rounded-[3rem] border border-red-600/40 shadow-xl overflow-hidden min-h-[400px] bg-gradient-to-b from-red-950/20 to-slate-900/40">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-red-950/30 border-b border-red-600/30 text-[9px] font-black text-red-400/70 uppercase tracking-[0.2em]">
                  <th className="px-8 py-8">Réf / Date</th>
                  <th className="px-8 py-8">Nature</th>
                  <th className="px-8 py-8">Client & Véhicule</th>
                  <th className="px-8 py-8 text-right">Total</th>
                  <th className="px-8 py-8 text-right">Payé / Reste</th>
                  <th className="px-8 py-8 text-center">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-red-600/20">
               {filtered.map(item => (
                 <tr key={item.id} className="group hover:bg-red-600/10 transition-colors">
                    <td className="px-8 py-8">
                       <p className="font-black text-red-100 leading-none mb-1.5">{item.ref}</p>
                       <p className="text-[10px] font-bold text-red-400/70">{item.date}</p>
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex items-center gap-2">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getTypeStyle(item.type)}`}>
                             {item.type === 'sale' ? '🛍️ Vente' : '🛒 Achat'}
                          </span>
                          {item.isImpaye && <span className="text-xl animate-pulse" title="Impayé">⚠️</span>}
                       </div>
                    </td>
                    <td className="px-8 py-8">
                       <p className="font-black text-red-100 leading-none mb-1.5">{item.partner}</p>
                       <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest truncate max-w-[200px]">
                         {item.type === 'sale' ? (inventory.find(c => c.id === item.car)?.model || item.car || 'Détails archivés') : item.car}
                       </p>
                    </td>
                    <td className="px-8 py-8 text-right font-black text-red-100">
                       {item.amount ? `${item.amount.toLocaleString()} DA` : '--'}
                    </td>
                    <td className="px-8 py-8 text-right">
                       {item.type === 'sale' ? (
                         <div className="flex flex-col items-end">
                            <p className="font-black text-green-600 text-sm">{(item.paid || 0).toLocaleString()} DA</p>
                            <p className={`text-[10px] font-black ${item.balance > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                              Reste: {(item.balance || 0).toLocaleString()} DA
                            </p>
                         </div>
                       ) : item.type === 'purchase' ? (
                         <p className="font-bold text-red-400/70 text-xs">Achat comptabilisé</p>
                       ) : (
                         <p className="font-bold text-red-400/70 text-xs">{(item.raw?.mileage || 0).toLocaleString()} KM</p>
                       )}
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleShowDetails(item)}
                            className="group/btn relative px-4 py-2 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                            title="Voir détails complets"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                            <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                              <span className="transition-all duration-300 group-hover/btn:scale-125">👁️</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => handlePrintRequest(item)}
                            className="group/btn relative px-4 py-2 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                            <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                              <span className="transition-all duration-300 group-hover/btn:scale-125">🖨️</span>
                            </div>
                          </button>
                          {item.type === 'sale' && (item.balance || 0) > 0 && (
                            <button 
                              onClick={() => setPayingSale(item.raw)}
                              className="group/btn relative px-4 py-2 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                              <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                              <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                                <span className="transition-all duration-300 group-hover/btn:scale-125">💸</span>
                              </div>
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(item)}
                            className="group/btn relative px-4 py-2 rounded-lg overflow-hidden font-black text-[9px] uppercase tracking-wider transition-all duration-300"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-red-700 to-red-900 transition-all duration-300 group-hover/btn:from-red-800 group-hover/btn:via-red-600 group-hover/btn:to-red-800"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-800 via-red-600 to-red-800 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 -z-10"></div>
                            <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                              <span className="transition-all duration-300 group-hover/btn:scale-125">🗑️</span>
                            </div>
                          </button>
                       </div>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
         {filtered.length === 0 && (
           <div className="py-32 flex flex-col items-center justify-center text-center opacity-30">
              <span className="text-7xl mb-6">📄</span>
              <p className="text-xl font-black italic">Aucun document trouvé</p>
           </div>
         )}
      </div>

      {/* MODAL ENCAISSEMENT RAPIDE */}
      {payingSale && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setPayingSale(null)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-red-600/20">
             <div className="text-center mb-10">
                <div className="h-20 w-20 rounded-[2.2rem] bg-green-50 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">💰</div>
                <h3 className="text-3xl font-black text-red-100 tracking-tight">Nouvel Encaissement</h3>
                <p className="text-red-400/70 font-bold text-xs uppercase tracking-widest mt-2">{payingSale.first_name} {payingSale.last_name}</p>
             </div>

             <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-red-600/20 p-6 rounded-[2.5rem] border border-red-600/20">
                      <p className="text-[10px] font-black text-red-400/70 uppercase mb-1">Prix Total</p>
                      <p className="text-xl font-black text-red-100 tracking-tight">{(payingSale.total_price || 0).toLocaleString()} DA</p>
                   </div>
                   <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100">
                      <p className="text-[10px] font-black text-red-400 uppercase mb-1">Dette Actuelle</p>
                      <p className="text-xl font-black text-red-600 tracking-tight">{(payingSale.balance || 0).toLocaleString()} DA</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Montant Versé Aujourd'hui</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        autoFocus
                        value={newPaymentAmount || ''} 
                        onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-red-600/20 px-10 py-6 rounded-[2.5rem] outline-none focus:border-green-500 font-black text-4xl text-green-600 tracking-tighter transition-all"
                        placeholder="0"
                      />
                      <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">DA</span>
                   </div>
                </div>

                <div className="p-8 bg-blue-50 rounded-[3rem] border border-red-600/30 flex justify-between items-center animate-pulse">
                   <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Futur Solde</p>
                      <p className="text-2xl font-black text-red-400 tracking-tight">
                        {((payingSale.balance || 0) - newPaymentAmount).toLocaleString()} DA
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Total Payé</p>
                      <p className="text-lg font-bold text-red-400">{((payingSale.amount_paid || 0) + newPaymentAmount).toLocaleString()} DA</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                   <button onClick={() => setPayingSale(null)} className="py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest text-red-400/70 bg-red-950/30">Annuler</button>
                   <button 
                     onClick={handleUpdatePayment}
                     disabled={isUpdatingPayment || newPaymentAmount <= 0 || newPaymentAmount > (payingSale.balance || 0)}
                     className="custom-gradient-btn py-6 rounded-[2.5rem] text-white font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50"
                   >
                     {isUpdatingPayment ? 'Validation...' : 'Valider le Paiement 💎'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* PREMIUM PRINT PREVIEW */}
      {printingRecord && (
        <div className="fixed inset-0 z-[250] bg-red-950/30 flex flex-col overflow-hidden animate-in fade-in">
           <div className="p-4 border-b border-red-600/30 bg-white flex justify-between items-center shadow-sm z-10 print:hidden">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 rounded-xl bg-blue-50 text-red-400 flex items-center justify-center text-xl">📄</div>
               <div>
                 <h3 className="font-black text-red-100 tracking-tight">Aperçu Avant Impression</h3>
                 <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">
                   {printType === 'receipt' ? 'Reçu de Versement' : (printType === 'sale' ? 'Facture de Vente' : 'Rapport de Diagnostic')}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-4">
               <button onClick={() => { setPrintingRecord(null); setPrintType(null); }} className="px-6 py-3 rounded-xl bg-red-950/30 text-red-400/70 font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Fermer</button>
               <button onClick={() => window.print()} className="custom-gradient-btn px-8 py-3 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2"><span>🖨️</span> Imprimer</button>
             </div>
           </div>
           
           <div id="invoice-content" className="flex-grow overflow-y-auto p-8 flex justify-center bg-red-600/10 custom-scrollbar print:p-0 print:bg-black print:overflow-visible print:block">
             <div className="glass-card shadow-2xl shadow-red-600/30 w-full max-w-[850px] min-h-[1130px] p-20 flex flex-col print:shadow-none print:m-0 print:p-10 relative overflow-hidden h-fit mb-40 print:mb-0">
                
                {/* Premium Header */}
               <div className="flex justify-between items-start border-b-2 border-red-600/20 pb-12 mb-12">
                   <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-slate-900 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-xl">
                        {showroom.logo_url || showroom.logo_data ? (
                          <img src={showroom.logo_url || showroom.logo_data} className="w-full h-full object-contain" alt="Logo" />
                        ) : (
                          <span className="text-4xl">🏎️</span>
                        )}
                      </div>
                      <div>
                        <h1 className="text-2xl font-black text-red-100 uppercase tracking-tight">{showroom.name}</h1>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em]">{showroom.slogan}</p>
                        <p className="text-[10px] font-bold text-red-400/70 mt-1">📍 {showroom.address}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <h2 className="text-3xl font-black text-red-100 uppercase tracking-tighter">
                        {printType === 'receipt' ? 'REÇU' : (printType === 'sale' ? 'FACTURE' : (printType === 'purchase' ? 'BON D\'ACHAT' : 'RAPPORT'))}
                      </h2>
                      <p className="text-red-400 font-black text-sm mt-2">
                        #{printType === 'receipt' ? 'PAY' : (printType === 'sale' ? 'VNT' : (printType === 'purchase' ? 'ACH' : 'INSP'))}-{printingRecord.id.slice(0,8).toUpperCase()}
                      </p>
                      <p className="text-red-400/70 font-bold text-[10px] mt-1">{printingRecord.payment_date || (printingRecord.created_at ? new Date(printingRecord.created_at).toLocaleDateString('fr-FR') : '--')}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                   <div className="bg-red-600/20 p-8 rounded-[2.5rem] border border-red-600/20">
                      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-4">Destinataire / Fournisseur</p>
                      <p className="font-black text-xl text-red-100">
                        {printType === 'sale' || printType === 'receipt' ? `${printingRecord.first_name} ${printingRecord.last_name}` : (printType === 'purchase' ? printingRecord.supplier_name : (printingRecord.partner_name || 'Client'))}
                      </p>
                      <p className="text-sm font-bold text-red-400/70 mt-2 leading-relaxed">{printingRecord.address || '—'}</p>
                      <div className="mt-4 pt-4 border-t border-red-600/30 grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[8px] font-black text-red-400/70 uppercase">Document</p>
                            <p className="font-bold text-xs">{printingRecord.doc_number || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-black text-red-400/70 uppercase">Téléphone</p>
                            <p className="font-bold text-xs">{printingRecord.mobile1 || printingRecord.phone || 'N/A'}</p>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="p-8 border-2 border-slate-900 rounded-[2.5rem]">
                         <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3">Désignation Véhicule</p>
                         <p className="font-black text-lg text-red-100 uppercase">
                            {printType === 'sale' || printType === 'receipt' 
                              ? (inventory.find(c=>c.id===printingRecord.car_id)?.model || 'Modèle Prestige') 
                              : (printType === 'purchase' ? `${printingRecord.make} ${printingRecord.model}` : (printingRecord.car_name || 'Inconnu'))}
                         </p>
                         <p className="text-xs font-mono font-bold text-red-400/70 mt-1">VIN: {printingRecord.vin || 'NON_RENSEIGNÉ'}</p>
                      </div>
                      
                      {printType === 'receipt' && (
                        <div className="px-6 py-3 bg-green-50 text-green-700 border border-green-100 rounded-2xl text-center font-black text-[10px] uppercase tracking-widest">
                           Encaissement Validé ✓
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-slate-900 text-white rounded-[3rem] p-12 mb-12">
                   <div className="grid grid-cols-3 gap-8">
                      {printType === 'receipt' ? (
                        <>
                           <div>
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Versement du jour</p>
                              <p className="text-3xl font-black text-white">{(printingRecord.payment_received || 0).toLocaleString()} DA</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Total déjà payé</p>
                              <p className="text-xl font-black text-green-400">{(printingRecord.total_after || 0).toLocaleString()} DA</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Solde restant</p>
                              <p className="text-xl font-black text-red-400">{(printingRecord.balance_after || 0).toLocaleString()} DA</p>
                           </div>
                        </>
                      ) : printType === 'sale' ? (
                        <>
                           <div className="col-span-2">
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Prix Total Véhicule</p>
                              <p className="text-5xl font-black text-white">{(printingRecord.total_price || 0).toLocaleString()} DA</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Reste à payer</p>
                              <p className="text-3xl font-black text-red-400">{(printingRecord.balance || 0).toLocaleString()} DA</p>
                           </div>
                        </>
                      ) : printType === 'purchase' ? (
                        <>
                           <div className="col-span-2">
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Coût Total d'Achat</p>
                              <p className="text-5xl font-black text-white">{(printingRecord.total_cost || 0).toLocaleString()} DA</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Prix de Revente</p>
                              <p className="text-3xl font-black text-green-400">{(printingRecord.selling_price || 0).toLocaleString()} DA</p>
                           </div>
                        </>
                      ) : (
                        <div className="col-span-3 text-center">
                           <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Kilométrage du véhicule</p>
                           <p className="text-5xl font-black text-white">{(printingRecord.mileage || 0).toLocaleString()} KM</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="mt-auto pt-12 grid grid-cols-2 gap-12">
                   <div className="flex flex-col items-center">
                      <div className="h-32 w-full border-2 border-dashed border-red-600/30 rounded-[2rem] flex items-center justify-center mb-4">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cachet Showroom</span>
                      </div>
                      <p className="text-[10px] font-black text-red-100 uppercase">Responsable des Ventes</p>
                   </div>
                   <div className="flex flex-col items-center">
                      <div className="h-32 w-full border-2 border-dashed border-red-600/30 rounded-[2rem] flex items-center justify-center mb-4">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Signature Client</span>
                      </div>
                      <p className="text-[10px] font-black text-red-100 uppercase">Le Client (Bon pour accord)</p>
                   </div>
                </div>

                <div className="absolute bottom-10 left-10 right-10 text-center border-t border-slate-50 pt-6">
                   <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Document Officiel - AutoLux Prestige ERP System - 2026</p>
                </div>

             </div>
           </div>
        </div>
      )}

      {/* COMPREHENSIVE DETAILS MODAL - REDESIGNED */}
      {selectedItemForDetails && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in">
          <div className="relative bg-slate-50 w-full max-w-6xl h-[95vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border-4 border-red-600/30">
            {/* Header - REDESIGNED with Client Colors */}
            <div className={`px-12 py-10 flex items-center justify-between bg-gradient-to-r ${
              selectedItemForDetails.type === 'sale' ? 'from-cyan-500 to-blue-600' :
              selectedItemForDetails.type === 'purchase' ? 'from-slate-700 to-slate-900' :
              selectedItemForDetails.type === 'checkin' ? 'from-blue-500 to-red-600' :
              'from-purple-500 to-pink-600'
            } text-white shrink-0 shadow-lg relative overflow-hidden`}>
               <div className="absolute inset-0 bg-red-600/10 backdrop-blur-[2px]"></div>
               <div className="flex items-center gap-8 relative z-10">
                  <div className="h-20 w-20 rounded-[2.2rem] bg-white text-red-400 flex items-center justify-center text-5xl shadow-2xl">
                     {selectedItemForDetails.type === 'sale' ? '🚗' : selectedItemForDetails.type === 'purchase' ? '🛒' : selectedItemForDetails.type === 'checkin' ? '📥' : '📤'}
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">
                      {selectedItemForDetails.type === 'sale' ? 'Détails de Vente' : selectedItemForDetails.type === 'purchase' ? 'Détails Achat' : selectedItemForDetails.type === 'checkin' ? 'Rapport Check-In' : 'Rapport Check-Out'}
                    </h2>
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mt-2">
                       Référence: #{selectedItemForDetails.id?.slice(0,8).toUpperCase()} • {selectedItemForDetails.created_at ? new Date(selectedItemForDetails.created_at).toLocaleDateString('fr-FR') : '--'}
                    </p>
                  </div>
               </div>
               <button onClick={() => setSelectedItemForDetails(null)} className="h-16 w-16 bg-red-600/20 hover:bg-red-600/40 rounded-full flex items-center justify-center text-3xl text-white transition-all backdrop-blur-md relative z-10 border border-red-600/30/30">✕</button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-12 bg-slate-50/50">
               {selectedItemForDetails.type === 'sale' ? (
                 /* SALE DETAILS - REDESIGNED */
                 <>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Car & Images */}
                    <div className="space-y-12">
                       <section className="glass-card rounded-[3.5rem] p-10 border border-red-600/20 shadow-sm space-y-8">
                          <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
                             <span className="text-4xl">🚘</span>
                             <h3 className="text-2xl font-black text-red-100">Spécifications Véhicule</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             {(selectedItemForDetails.car?.photo_urls && selectedItemForDetails.car.photo_urls.length > 0) ? (
                                selectedItemForDetails.car.photo_urls.map((url: string, i: number) => (
                                  <div key={i} className={`rounded-[2.5rem] overflow-hidden shadow-md border-2 border-red-600/30 ${i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}>
                                     <img src={url} className="w-full h-full object-cover" alt={`Car ${i}`} />
                                  </div>
                                ))
                             ) : (
                                <div className="col-span-2 aspect-video bg-red-950/30 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                                   <span className="text-6xl">📷</span>
                                </div>
                             )}
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                             <DetailItem label="Marque & Modèle" value={`${selectedItemForDetails.car?.make} ${selectedItemForDetails.car?.model}`} large />
                             <DetailItem label="Année" value={selectedItemForDetails.car?.year} />
                             <DetailItem label="Kilométrage" value={`${(selectedItemForDetails.car?.mileage || 0).toLocaleString()} KM`} />
                             <DetailItem label="Châssis (VIN)" value={selectedItemForDetails.car?.vin} />
                             <DetailItem label="Transmission" value={selectedItemForDetails.car?.transmission} />
                             <DetailItem label="Prix Showroom" value={`${(selectedItemForDetails.car?.selling_price || 0).toLocaleString()} DA`} />
                          </div>
                       </section>
                       
                       <section className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-[3.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden">
                          <div className="absolute -top-10 -right-10 h-40 w-40 bg-red-600/10 rounded-full blur-3xl"></div>
                          <div className="flex items-center gap-5 border-b border-red-600/20 pb-6 relative z-10">
                             <span className="text-4xl">💰</span>
                             <h3 className="text-2xl font-black uppercase tracking-tight">Résumé Financier</h3>
                          </div>
                          <div className="space-y-8 relative z-10">
                             <div className="flex justify-between items-end border-b border-red-600/30/10 pb-6">
                                <div><p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Prix de Vente</p><p className="text-5xl font-black tracking-tighter">{selectedItemForDetails.total_price.toLocaleString()} DA</p></div>
                                <span className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white text-red-400 shadow-xl`}>{selectedItemForDetails.status === 'completed' ? 'Totalement Payée' : 'Dette en cours'}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-8">
                                <div className="bg-red-600/10 p-6 rounded-[2rem] border border-red-600/30/10"><p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Total Encaissé</p><p className="text-2xl font-black text-white">{selectedItemForDetails.amount_paid.toLocaleString()} DA</p></div>
                                <div className="bg-red-500/20 p-6 rounded-[2rem] border border-red-600/30/10"><p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Reste</p><p className="text-2xl font-black text-white underline">{selectedItemForDetails.balance.toLocaleString()} DA</p></div>
                             </div>
                          </div>
                       </section>
                    </div>

                    {/* Right Column: Client & Documents */}
                    <div className="space-y-12">
                       <section className="glass-card rounded-[3.5rem] p-10 border border-red-600/20 shadow-sm space-y-10">
                          <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
                             <span className="text-4xl">👤</span>
                             <h3 className="text-2xl font-black text-red-100">Informations Client</h3>
                          </div>
                          <div className="flex items-center gap-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-50">
                             <div className="h-32 w-32 rounded-[3rem] bg-white border-4 border-red-600/30 shadow-xl overflow-hidden shrink-0 flex items-center justify-center text-6xl">
                                {selectedItemForDetails.photo_url ? <img src={selectedItemForDetails.photo_url} className="w-full h-full object-cover" /> : '👤'}
                             </div>
                             <div><p className="text-3xl font-black text-red-100 leading-none mb-3 tracking-tight">{selectedItemForDetails.first_name} {selectedItemForDetails.last_name}</p><p className="text-red-400 font-black text-sm uppercase tracking-widest">{selectedItemForDetails.mobile1}</p></div>
                          </div>
                          <div className="grid grid-cols-2 gap-8 px-4">
                             <DetailItem label="Adresse" value={selectedItemForDetails.address || '—'} large />
                             <DetailItem label="Profession" value={selectedItemForDetails.profession || '—'} />
                             <DetailItem label="NIF" value={selectedItemForDetails.nif || '—'} />
                             <DetailItem label="RC" value={selectedItemForDetails.rc || '—'} />
                          </div>
                       </section>

                       <section className="bg-gradient-to-br from-purple-500 to-red-600 text-white rounded-[3.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                          <div className="absolute bottom-0 right-0 h-40 w-40 bg-white/5 rounded-full blur-3xl"></div>
                          <div className="flex items-center gap-5 border-b border-red-600/20 pb-6 relative z-10">
                             <span className="text-4xl">📂</span>
                             <h3 className="text-2xl font-black tracking-tight uppercase">Dossier Juridique</h3>
                          </div>
                          <div className="bg-red-600/10 p-8 rounded-[3rem] border border-red-600/20 relative z-10">
                             <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">{selectedItemForDetails.doc_type} N° {selectedItemForDetails.doc_number}</p>
                             <div className="rounded-[2.5rem] overflow-hidden border-2 border-red-600/30/30 aspect-[16/10] bg-white group relative shadow-inner">
                                {selectedItemForDetails.scan_url ? (
                                  <>
                                    <img src={selectedItemForDetails.scan_url} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" />
                                    <a href={selectedItemForDetails.scan_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                       <span className="px-8 py-4 bg-white text-red-400 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl">Ouvrir ↗</span>
                                    </a>
                                  </>
                                ) : <div className="w-full h-full flex items-center justify-center text-slate-300 text-6xl">📄</div>}
                             </div>
                          </div>
                       </section>
                    </div>
                 </div>

                  {/* LINKED INSPECTION CHECKLIST */}
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3">
                       <span className="h-1.5 w-8 rounded-full bg-slate-300"></span>
                       <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Inspection Check-Out liée</p>
                    </div>
                    {selectedItemForDetails.linkedInspection ? (
                      <div className="space-y-6 glass-card rounded-[3.5rem] p-10 border border-red-600/20 shadow-sm">
                         <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
                           <span className="text-3xl">📤</span>
                           <div>
                             <p className="font-black text-red-100 text-lg">{selectedItemForDetails.linkedInspection.car_name}</p>
                             <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">{(selectedItemForDetails.linkedInspection.mileage||0).toLocaleString()} KM • {selectedItemForDetails.linkedInspection.partner_name}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <InspectionSection title="Contrôle Sécurité" icon="🛡️" items={selectedItemForDetails.linkedInspection.safety} labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }} color="blue" />
                           <InspectionSection title="Dotation Bord" icon="🧰" items={selectedItemForDetails.linkedInspection.equipment} labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }} color="emerald" />
                           <InspectionSection title="État et Confort" icon="✨" items={selectedItemForDetails.linkedInspection.comfort} labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }} color="purple" note={selectedItemForDetails.linkedInspection.note} />
                         </div>
                      </div>
                    ) : (
                      <div className="rounded-[2rem] border-2 border-dashed border-red-600/30 p-8 text-center opacity-50">
                         <span className="text-4xl">🛡️</span>
                         <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-3">Aucune inspection Check-Out liée à ce véhicule</p>
                      </div>
                    )}
                  </div>
                 </>
               ) : selectedItemForDetails.type === 'purchase' ? (
                 /* PURCHASE DETAILS WITH LINKED CHECKLIST */
                 <div className="space-y-8">
                    <section className="glass-card rounded-[3rem] p-8 border border-red-600/20 shadow-sm">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-red-600/20">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Fournisseur</p>
                             <p className="font-black text-red-100 text-sm truncate">{selectedItemForDetails.supplier_name || '—'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-red-600/20">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Véhicule</p>
                             <p className="font-black text-red-100 text-sm">{selectedItemForDetails.make} {selectedItemForDetails.model} {selectedItemForDetails.year}</p>
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-red-600/20">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">VIN</p>
                             <p className="font-black text-red-400 text-xs font-mono">{selectedItemForDetails.vin || '—'}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-[2rem] p-5 border border-emerald-100">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Coût Achat</p>
                             <p className="font-black text-xl text-emerald-700">{(selectedItemForDetails.total_cost||0).toLocaleString()} DA</p>
                          </div>
                       </div>
                    </section>
                    <div>
                       <div className="flex items-center gap-3 mb-4"><span className="h-1.5 w-8 rounded-full bg-slate-300"></span><p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Checklist d'Achat</p></div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <InspectionSection title="Contrôle Sécurité" icon="🛡️" items={selectedItemForDetails.safety_checklist} labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }} color="blue" />
                         <InspectionSection title="Dotation Bord" icon="🧰" items={selectedItemForDetails.equipment_checklist} labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }} color="emerald" />
                         <InspectionSection title="État et Confort" icon="✨" items={selectedItemForDetails.comfort_checklist} labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }} color="purple" />
                       </div>
                    </div>
                    {selectedItemForDetails.linkedInspection && (
                      <section className="glass-card rounded-[3.5rem] p-10 border border-red-600/20 shadow-sm space-y-6">
                         <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
                           <span className="text-3xl">📥</span>
                           <div>
                             <p className="font-black text-red-100 text-lg">Inspection Check-In associée</p>
                             <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">{(selectedItemForDetails.linkedInspection.mileage||0).toLocaleString()} KM • {selectedItemForDetails.linkedInspection.partner_name}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <InspectionSection title="Contrôle Sécurité" icon="🛡️" items={selectedItemForDetails.linkedInspection.safety} labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }} color="blue" />
                           <InspectionSection title="Dotation Bord" icon="🧰" items={selectedItemForDetails.linkedInspection.equipment} labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }} color="emerald" />
                           <InspectionSection title="État et Confort" icon="✨" items={selectedItemForDetails.linkedInspection.comfort} labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }} color="purple" note={selectedItemForDetails.linkedInspection.note} />
                         </div>
                      </section>
                    )}
                 </div>
               ) : (
                 /* INSPECTION DETAILS - FULL CHECKLIST */
                 <div className="space-y-8">
                    {/* Header Info Bar */}
                    <section className="glass-card rounded-[3rem] p-8 border border-red-600/20 shadow-sm">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-red-600/20">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Opérateur</p>
                             <p className="font-black text-red-100 text-sm truncate">{selectedItemForDetails.partner_name || '—'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-red-600/20">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Véhicule</p>
                             <p className="font-black text-red-100 text-sm truncate">{selectedItemForDetails.car_name || '—'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-red-600/20">
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">VIN / Châssis</p>
                             <p className="font-black text-red-400 text-xs font-mono">{selectedItemForDetails.vin || '—'}</p>
                          </div>
                          <div className={`rounded-[2rem] p-5 border ${selectedItemForDetails.type === 'checkin' ? 'bg-blue-50 border-red-600/30' : 'bg-purple-50 border-purple-100'}`}>
                             <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Kilométrage</p>
                             <p className={`font-black text-xl tracking-tighter ${selectedItemForDetails.type === 'checkin' ? 'text-red-400' : 'text-purple-600'}`}>{(selectedItemForDetails.mileage || 0).toLocaleString()} KM</p>
                          </div>
                       </div>
                    </section>

                    {/* Full Checklist Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <InspectionSection
                          title="Contrôle Sécurité"
                          icon="🛡️"
                          items={selectedItemForDetails.safety}
                          labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }}
                          color="blue"
                       />
                       <InspectionSection
                          title="Dotation Bord"
                          icon="🧰"
                          items={selectedItemForDetails.equipment}
                          labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }}
                          color="emerald"
                       />
                       <InspectionSection
                          title="État & Confort"
                          icon="✨"
                          items={selectedItemForDetails.comfort}
                          labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }}
                          color="purple"
                          note={selectedItemForDetails.note}
                       />
                    </div>

                    {/* Photos */}
                    {((selectedItemForDetails.exterior_photo_urls?.length > 0) || (selectedItemForDetails.interior_photo_urls?.length > 0)) && (
                       <section className="glass-card rounded-[3rem] p-8 border border-red-600/20 shadow-sm">
                          <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-6">
                             <span className="text-2xl">📸</span>
                             <h4 className="font-black text-red-100 uppercase tracking-widest text-xs">Galerie d'Inspection</h4>
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                             {[...(selectedItemForDetails.exterior_photo_urls || []), ...(selectedItemForDetails.interior_photo_urls || [])].map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-[1.5rem] overflow-hidden border-2 border-red-600/20 shadow-sm hover:scale-105 transition-transform block">
                                   <img src={url} className="w-full h-full object-cover" alt={`Photo ${i+1}`} />
                                </a>
                             ))}
                          </div>
                       </section>
                    )}
                 </div>
               )}
            </div>

            {/* Footer Actions */}
            <div className="px-12 py-10 bg-white border-t border-red-600/20 flex justify-end items-center shrink-0">
               <button onClick={() => setSelectedItemForDetails(null)} className="px-12 py-5 rounded-[2rem] bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black uppercase text-xs tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95">Fermer le Dossier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---
const DetailItem: React.FC<{ label: string; value: any; large?: boolean }> = ({ label, value, large }) => (
  <div className={large ? 'col-span-2' : ''}>
    <p className="text-[9px] font-black text-red-400/70 uppercase tracking-[0.1em] mb-1">{label}</p>
    <p className={`font-black text-red-100 tracking-tight ${large ? 'text-lg' : 'text-sm'}`}>{value || '—'}</p>
  </div>
);

const InspectionSection: React.FC<{ title: string; icon: string; items: any; labels?: Record<string,string>; color?: string; note?: string }> = ({ title, icon, items, labels = {}, color = 'blue', note }) => {
  const allEntries = Object.entries(items || {});
  const passCount = allEntries.filter(([_, v]) => v).length;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  const badgeColor = colorMap[color] || colorMap.blue;
  return (
    <div className="bg-white border-2 border-red-600/20 rounded-[2.5rem] p-8 space-y-5 flex flex-col">
       <div className="flex items-center justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
             <span className="text-2xl">{icon}</span>
             <h4 className="font-black text-red-100 uppercase tracking-widest text-[10px]">{title}</h4>
          </div>
          <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${badgeColor}`}>{passCount}/{allEntries.length}</span>
       </div>
       <div className="space-y-2 flex-grow">
          {allEntries.length > 0 ? allEntries.map(([key, val]) => (
            <div key={key} className={`flex items-center justify-between p-3 rounded-[1.2rem] border transition-all ${
              val ? 'bg-green-50/60 border-green-100' : 'bg-red-50/40 border-red-100 opacity-70'
            }`}>
               <span className={`text-[11px] font-black uppercase tracking-wide ${val ? 'text-red-100' : 'text-red-400/70'}`}>
                 {labels[key] || key}
               </span>
               <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                 val ? 'bg-green-500 text-white shadow-sm shadow-green-300' : 'bg-red-200 text-red-500'
               }`}>
                 {val ? '✓' : '✕'}
               </div>
            </div>
          )) : <p className="text-slate-300 text-[10px] font-bold uppercase text-center py-4">Aucun élément</p>}
       </div>
       {note && (
         <div className="mt-2 pt-4 border-t border-slate-50">
            <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Note</p>
            <p className="text-xs font-bold text-red-400/70 italic leading-relaxed">{note}</p>
         </div>
       )}
    </div>
  );
};


