
import React, { useState, useEffect, useMemo } from 'react';
import { BillingRecord, Language, SaleRecord, InspectionRecord, InvoiceDesign, ElementPosition, CustomText, PurchaseRecord } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface BillingProps {
  lang: Language;
}

const defaultInvoiceDesign: InvoiceDesign = {
  logoPosition: { x: 0, y: 0 },
  titlePosition: { x: 0, y: 0 },
  clientInfoPosition: { x: 0, y: 0 },
  carInfoPosition: { x: 0, y: 0 },
  financialsPosition: { x: 0, y: 0 },
  extraTexts: [],
  primaryColor: '#0f172a',
  secondaryColor: '#64748b',
  accentColor: '#2563eb',
  fontSizeBase: 12,
  headerPadding: 60,
  showChecklist: false,
  labels: {
    title: 'DOCUMENT OFFICIEL',
    total: 'TOTAL TRANSACTION',
    date: 'DATE D\'ÉMISSION',
    ref: 'RÉFÉRENCE N°',
    safetyTitle: 'Informations Client',
    equipmentTitle: 'Détails du Véhicule',
    comfortTitle: 'Conditions de Vente',
    partnerLabel: 'Partenaire',
    carLabel: 'Unité Concernée'
  }
};

type EditableField = 'logo' | 'title' | 'client' | 'car' | 'finance' | 'extra' | 'none';

export const Billing: React.FC<BillingProps> = ({ lang }) => {
  const t = translations[lang];
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sale' | 'purchase' | 'checkin' | 'checkout'>('all');
  
  // Studio States
  const [printingRecord, setPrintingRecord] = useState<any | null>(null);
  const [printType, setPrintType] = useState<'sale' | 'inspection' | 'receipt' | null>(null);
  const [printDesign, setPrintDesign] = useState<InvoiceDesign>(defaultInvoiceDesign);
  const [selectedElement, setSelectedElement] = useState<{ type: EditableField; id?: string }>({ type: 'none' });
  const [inventory, setInventory] = useState<PurchaseRecord[]>([]);
  const [showroom, setShowroom] = useState<any>({
    name: 'AutoLux Premium',
    slogan: 'Excellence Automobile',
    address: 'Alger, Algérie',
    facebook: '',
    instagram: '@autolux_dz',
    whatsapp: '',
    logo_url: ''
  });

  // Payment Modal States
  const [payingSale, setPayingSale] = useState<any | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [salesRes, inspectionsRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('inspections').select('*').order('created_at', { ascending: false })
      ]);

      const sales = (salesRes.data || []).map(s => ({
        ...s,
        type: 'sale',
        ref: `VNT-${s.id.slice(0, 8).toUpperCase()}`,
        date: new Date(s.created_at).toLocaleDateString(),
        partner: `${s.first_name} ${s.last_name}`,
        amount: s.total_price,
        paid: s.amount_paid,
        balance: s.balance,
        car: s.car_id,
        raw: s
      }));

      const inspections = (inspectionsRes.data || []).map(i => ({
        ...i,
        type: i.type,
        ref: `INSP-${i.id.slice(0, 8).toUpperCase()}`,
        date: new Date(i.created_at).toLocaleDateString(),
        partner: i.partner_name,
        car: i.car_name,
        raw: i
      }));

      setHistory([...sales, ...inspections].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Fetch History Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = history.filter(item => filter === 'all' || item.type === filter);

  const handlePrintRequest = (item: any) => {
    setPrintingRecord(item.raw);
    setPrintType(item.type === 'sale' ? 'sale' : 'inspection');
    
    if (item.type === 'sale') {
      setPrintDesign({
        ...defaultInvoiceDesign,
        labels: { ...defaultInvoiceDesign.labels, title: 'FACTURE DE VENTE VÉHICULE' }
      });
    } else {
      setPrintDesign({
        ...defaultInvoiceDesign,
        showChecklist: true,
        labels: { 
          ...defaultInvoiceDesign.labels, 
          title: 'RAPPORT DE DIAGNOSTIC TECHNIQUE',
          total: 'KILOMÉTRAGE RELEVÉ',
          partnerLabel: 'Opérateur / Client'
        }
      });
    }
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

      // Afficher le reçu de ce paiement spécifique
      setPrintingRecord({
        ...payingSale,
        payment_received: newPaymentAmount,
        total_after: updatedPaid,
        balance_after: updatedBalance,
        payment_date: new Date().toLocaleDateString()
      });
      setPrintType('receipt');
      setPrintDesign({
        ...defaultInvoiceDesign,
        labels: { ...defaultInvoiceDesign.labels, title: 'REÇU DE VERSEMENT' }
      });

      setPayingSale(null);
      setNewPaymentAmount(0);
      setShowPrintPreview(true);
      fetchHistory();
    } catch (err: any) {
      alert(`Erreur de paiement : ${err.message}`);
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const addExtraText = () => {
    const newText: CustomText = {
      id: `text-${Date.now()}`,
      content: 'Note additionnelle...',
      x: 0,
      y: 0,
      fontSize: 12,
      color: '#000000',
      isBold: false
    };
    setPrintDesign(prev => ({ ...prev, extraTexts: [...prev.extraTexts, newText] }));
    setSelectedElement({ type: 'extra', id: newText.id });
  };

  const updateExtraText = (id: string, updates: Partial<CustomText>) => {
    setPrintDesign(prev => ({
      ...prev,
      extraTexts: prev.extraTexts.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const handleDelete = async (item: any) => {
    if (confirm("Archiver définitivement cette pièce comptable ?")) {
      const table = item.type === 'sale' ? 'sales' : 'inspections';
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (!error) fetchHistory();
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Chargement des archives...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Facturation & Historique</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Suivi des Paiements & Dossiers Techniques
          </p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] border border-slate-200">
           {['all', 'sale', 'purchase', 'checkin', 'checkout'].map(f => (
             <button 
               key={f} 
               onClick={() => setFilter(f as any)}
               className={`px-6 py-3 rounded-[1.5rem] font-black text-[9px] uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}
             >
                {f}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-8 py-8">Réf / Date</th>
                  <th className="px-8 py-8">Nature</th>
                  <th className="px-8 py-8">Client & Véhicule</th>
                  <th className="px-8 py-8 text-right">Total</th>
                  <th className="px-8 py-8 text-right">Payé / Reste</th>
                  <th className="px-8 py-8 text-center">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {filtered.map(item => (
                 <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-8">
                       <p className="font-black text-slate-900 leading-none mb-1.5">{item.ref}</p>
                       <p className="text-[10px] font-bold text-slate-400">{item.date}</p>
                    </td>
                    <td className="px-8 py-8">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getTypeStyle(item.type)}`}>
                          {item.type}
                       </span>
                    </td>
                    <td className="px-8 py-8">
                       <p className="font-black text-slate-700 leading-none mb-1.5">{item.partner}</p>
                       <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest truncate max-w-[200px]">
                         {item.type === 'sale' ? (inventory.find(c => c.id === item.car)?.model || 'Détails archivés') : item.car}
                       </p>
                    </td>
                    <td className="px-8 py-8 text-right font-black text-slate-900">
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
                       ) : (
                         <p className="font-bold text-slate-400 text-xs">{(item as any).mileage?.toLocaleString()} KM</p>
                       )}
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex justify-center gap-2">
                          <button onClick={() => handlePrintRequest(item)} className="h-11 w-11 flex items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-lg active:scale-95" title="Imprimer Facture">🖨️</button>
                          {item.type === 'sale' && (item.balance || 0) > 0 && (
                            <button onClick={() => setPayingSale(item.raw)} className="h-11 w-11 flex items-center justify-center rounded-2xl bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg active:scale-95" title="Encaisser Versement">💸</button>
                          )}
                          <button onClick={() => handleDelete(item)} className="h-11 w-11 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95" title="Supprimer">🗑️</button>
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
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-white/20">
             <div className="text-center mb-10">
                <div className="h-20 w-20 rounded-[2.2rem] bg-green-50 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">💰</div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Nouvel Encaissement</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">{payingSale.first_name} {payingSale.last_name}</p>
             </div>

             <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix Total</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{(payingSale.total_price || 0).toLocaleString()} DA</p>
                   </div>
                   <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100">
                      <p className="text-[10px] font-black text-red-400 uppercase mb-1">Dette Actuelle</p>
                      <p className="text-xl font-black text-red-600 tracking-tight">{(payingSale.balance || 0).toLocaleString()} DA</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Montant Versé Aujourd'hui</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        autoFocus
                        value={newPaymentAmount || ''} 
                        onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-100 px-10 py-6 rounded-[2.5rem] outline-none focus:border-green-500 font-black text-4xl text-green-600 tracking-tighter transition-all"
                        placeholder="0"
                      />
                      <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">DA</span>
                   </div>
                </div>

                <div className="p-8 bg-blue-50 rounded-[3rem] border border-blue-100 flex justify-between items-center animate-pulse">
                   <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Futur Solde</p>
                      <p className="text-2xl font-black text-blue-600 tracking-tight">
                        {((payingSale.balance || 0) - newPaymentAmount).toLocaleString()} DA
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Total Payé</p>
                      <p className="text-lg font-bold text-blue-600">{((payingSale.amount_paid || 0) + newPaymentAmount).toLocaleString()} DA</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                   <button onClick={() => setPayingSale(null)} className="py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest text-slate-400 bg-slate-100">Annuler</button>
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

      {/* PRINT STUDIO MODAL INTERACTIF (Factures, Inspections, Reçus) */}
      {printingRecord && (
        <div className="fixed inset-0 z-[250] bg-slate-100 flex overflow-hidden animate-in fade-in">
           {/* Inspecteur Latéral */}
           <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-lg">🎨</div>
                 <div>
                   <h3 className="font-black text-slate-900 tracking-tight">Studio Archive</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     {printType === 'receipt' ? 'Éditeur de Reçu' : 'Éditeur de Dossier'}
                   </p>
                 </div>
               </div>
               <button onClick={() => { setPrintingRecord(null); setPrintType(null); }} className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-xl hover:bg-red-50 transition-all">✕</button>
             </div>
             
             <div className="flex-grow overflow-y-auto p-8 space-y-12 custom-scrollbar">
                {selectedElement.type === 'none' && (
                  <div className="py-20 text-center space-y-6 opacity-40">
                    <span className="text-7xl">🖱️</span>
                    <p className="text-sm font-black uppercase tracking-widest leading-relaxed">Cliquer sur un texte de l'aperçu <br/> pour le déplacer ou le modifier</p>
                    <button onClick={addExtraText} className="custom-gradient-btn px-8 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl">Ajouter Mention Libre +</button>
                  </div>
                )}

                {selectedElement.type === 'logo' && (
                  <InspectorGroup title="Position Logo" icon="🏎️">
                    <InspectorPosition value={printDesign.logoPosition} onChangeX={(v) => setPrintDesign({...printDesign, logoPosition: {...printDesign.logoPosition, x: v}})} onChangeY={(v) => setPrintDesign({...printDesign, logoPosition: {...printDesign.logoPosition, y: v}})} />
                    <InspectorRange label="Espacement Haut" value={printDesign.headerPadding} min={20} max={200} onChange={(v) => setPrintDesign({...printDesign, headerPadding: v})} />
                  </InspectorGroup>
                )}

                {selectedElement.type === 'title' && (
                  <InspectorGroup title="Titre Document" icon="🖋️">
                    <InspectorText label="Texte Titre" value={printDesign.labels.title} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, title: v}})} />
                    <InspectorColor label="Couleur Marque" value={printDesign.primaryColor} onChange={(v) => setPrintDesign({...printDesign, primaryColor: v})} />
                    <InspectorPosition value={printDesign.titlePosition} onChangeX={(v) => setPrintDesign({...printDesign, titlePosition: {...printDesign.titlePosition, x: v}})} onChangeY={(v) => setPrintDesign({...printDesign, titlePosition: {...printDesign.titlePosition, y: v}})} />
                  </InspectorGroup>
                )}

                {(['client', 'car', 'finance'] as EditableField[]).includes(selectedElement.type) && (
                  <InspectorGroup title={`Bloc ${selectedElement.type === 'client' ? 'Partenaire' : selectedElement.type === 'car' ? 'Véhicule' : 'Détails'}`} icon="📦">
                    <InspectorPosition 
                      value={(printDesign as any)[`${selectedElement.type}InfoPosition`] || printDesign.financialsPosition} 
                      onChangeX={(v) => setPrintDesign({...printDesign, [`${selectedElement.type}InfoPosition` as keyof InvoiceDesign]: {...(printDesign as any)[`${selectedElement.type}InfoPosition`], x: v}} as any)} 
                      onChangeY={(v) => setPrintDesign({...printDesign, [`${selectedElement.type}InfoPosition` as keyof InvoiceDesign]: {...(printDesign as any)[`${selectedElement.type}InfoPosition`], y: v}} as any)} 
                    />
                  </InspectorGroup>
                )}

                {selectedElement.type === 'extra' && selectedElement.id && (
                  <InspectorGroup title="Mention Spéciale" icon="✍️">
                    <InspectorText label="Texte" value={printDesign.extraTexts.find(t=>t.id===selectedElement.id)?.content || ''} onChange={(v) => updateExtraText(selectedElement.id!, {content: v})} />
                    <InspectorPosition value={{x: printDesign.extraTexts.find(t=>t.id===selectedElement.id)?.x || 0, y: printDesign.extraTexts.find(t=>t.id===selectedElement.id)?.y || 0}} onChangeX={(v) => updateExtraText(selectedElement.id!, {x: v})} onChangeY={(v) => updateExtraText(selectedElement.id!, {y: v})} />
                    <InspectorRange label="Taille" value={printDesign.extraTexts.find(t=>t.id===selectedElement.id)?.fontSize || 12} min={8} max={40} onChange={(v) => updateExtraText(selectedElement.id!, {fontSize: v})} />
                    <button onClick={() => setPrintDesign({...printDesign, extraTexts: printDesign.extraTexts.filter(t=>t.id!==selectedElement.id)})} className="w-full py-4 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4">Supprimer la mention</button>
                  </InspectorGroup>
                )}
             </div>

             <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-4">
                <button onClick={addExtraText} className="w-full bg-white border border-slate-200 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Ajouter Mention Libre +</button>
                <button onClick={() => window.print()} className="w-full custom-gradient-btn py-6 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl">Imprimer le Document 🖨️</button>
             </div>
           </div>

           {/* Zone Aperçu Facture */}
           <div className="flex-grow overflow-y-auto p-20 flex justify-center bg-slate-200/50 custom-scrollbar">
             <div className="bg-white shadow-2xl w-full max-w-[850px] min-h-[1130px] p-20 flex flex-col print:shadow-none print:m-0 print:p-10 relative overflow-hidden h-fit mb-40">
                
                {/* Header Interactif */}
                <div style={{ paddingBottom: `${printDesign.headerPadding}px` }} className="flex flex-col items-center">
                   <div 
                     onClick={() => setSelectedElement({ type: 'logo' })} 
                     style={{ transform: `translate(${printDesign.logoPosition.x}px, ${printDesign.logoPosition.y}px)` }} 
                     className={`cursor-pointer transition-all ${selectedElement.type === 'logo' ? 'ring-4 ring-blue-500 ring-offset-4' : 'hover:opacity-70'}`}
                   >
                      {showroom.logo_url ? (
                        <img src={showroom.logo_url} className="w-24 h-24 object-contain shadow-xl rounded-[2rem]" alt="Logo" />
                      ) : (
                        <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-5xl text-white shadow-xl">🏎️</div>
                      )}
                   </div>
                   <div 
                     onClick={() => setSelectedElement({ type: 'title' })} 
                     style={{ transform: `translate(${printDesign.titlePosition.x}px, ${printDesign.titlePosition.y}px)` }} 
                     className={`cursor-pointer transition-all mt-10 w-full text-center ${selectedElement.type === 'title' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50/30' : 'hover:opacity-70'}`}
                   >
                      <h1 style={{ color: printDesign.primaryColor }} className="text-4xl font-black uppercase tracking-tighter leading-none">{printDesign.labels.title}</h1>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">{showroom.name} - {showroom.slogan}</p>
                      <p className="text-slate-300 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">{showroom.address}</p>
                   </div>
                </div>

                {/* Section Partenaire Interactif */}
                <div 
                  onClick={() => setSelectedElement({ type: 'client' })}
                  style={{ transform: `translate(${printDesign.clientInfoPosition.x}px, ${printDesign.clientInfoPosition.y}px)` }}
                  className={`grid grid-cols-2 gap-16 my-16 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 cursor-pointer transition-all ${selectedElement.type === 'client' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50' : 'hover:bg-slate-100'}`}
                >
                   <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinataire</p>
                        <p className="font-black text-xl">
                          {printType === 'sale' || printType === 'receipt' ? `${printingRecord.first_name} ${printingRecord.last_name}` : (printingRecord.partner_name || 'Partenaire')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse de contact</p>
                        <p className="font-bold text-sm text-slate-600 leading-snug">{printingRecord.address || 'Non spécifiée'}</p>
                      </div>
                      {printType === 'receipt' && (
                         <div className="pt-4">
                            <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-xl text-[9px] font-black uppercase tracking-widest">Paiement Validé</span>
                         </div>
                      )}
                   </div>
                   <div className="text-right space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence Dossier</p>
                        <p className="font-black text-lg">#{printType === 'receipt' ? 'PAY' : (printType === 'sale' ? 'VNT' : 'INSP')}-{printingRecord.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-sm font-bold text-slate-400">{printingRecord.payment_date || (printingRecord.created_at ? new Date(printingRecord.created_at).toLocaleDateString() : '--')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document d'identité</p>
                        <p className="font-bold text-sm text-slate-600">{printingRecord.doc_type || 'ID Client'} • {printingRecord.doc_number || 'N/A'}</p>
                      </div>
                   </div>
                </div>

                {/* Section Véhicule Interactif */}
                <div 
                  onClick={() => setSelectedElement({ type: 'car' })}
                  style={{ transform: `translate(${printDesign.carInfoPosition.x}px, ${printDesign.carInfoPosition.y}px)` }}
                  className={`p-10 border-2 border-slate-900 rounded-[3rem] space-y-8 cursor-pointer transition-all ${selectedElement.type === 'car' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                   <div className="flex justify-between items-center border-b border-slate-900 pb-6">
                      <h4 className="text-xl font-black tracking-tighter uppercase">Désignation du véhicule</h4>
                      <span className="px-4 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">Unité Showroom</span>
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase">Modèle / Gamme</p>
                         <p className="font-black text-lg leading-none uppercase">
                           {printType === 'sale' || printType === 'receipt' ? (inventory.find(c=>c.id===printingRecord.car_id)?.model || 'Véhicule Prestige') : (printingRecord.car_name || 'Inconnu')}
                         </p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Châssis / VIN</p>
                         <p className="font-black text-lg leading-none uppercase font-mono">{printingRecord.vin || 'NON_SPECIFIE'}</p>
                      </div>
                   </div>
                </div>

                {/* Section Finance Interactif */}
                <div 
                   onClick={() => setSelectedElement({ type: 'finance' })}
                   style={{ 
                     transform: `translate(${printDesign.financialsPosition.x}px, ${printDesign.financialsPosition.y}px)`,
                     borderColor: printDesign.primaryColor 
                   }}
                   className={`mt-16 border-t-2 pt-12 flex justify-between items-end cursor-pointer transition-all ${selectedElement.type === 'finance' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50/50' : 'hover:opacity-70'}`}
                >
                   <div className="space-y-8">
                      {printType === 'receipt' ? (
                        <>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Reçu ce Jour</p>
                             <p className="text-4xl font-black text-green-600 tracking-tighter">{(printingRecord.payment_received || 0).toLocaleString()} DA</p>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Cumul Payé</p>
                                <p className="text-xl font-black text-slate-900">{(printingRecord.total_after || 0).toLocaleString()} DA</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Solde Restant</p>
                                <p className="text-xl font-black text-red-500">{(printingRecord.balance_after || 0).toLocaleString()} DA</p>
                             </div>
                          </div>
                        </>
                      ) : (
                        printType === 'sale' ? (
                          <>
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Total Véhicule</p>
                               <p className="text-4xl font-black text-slate-900 tracking-tighter">{(printingRecord.total_price || 0).toLocaleString()} DA</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reste à Encaisser</p>
                               <p className="text-5xl font-black" style={{ color: printDesign.primaryColor }}>{(printingRecord.balance || 0).toLocaleString()} DA</p>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kilométrage Constate</p>
                             <p className="text-5xl font-black" style={{ color: printDesign.primaryColor }}>{(printingRecord.mileage || 0).toLocaleString()} KM</p>
                          </div>
                        )
                      )}
                   </div>
                   <div className="h-40 w-64 border-2 border-slate-100 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center opacity-40">
                      <span className="text-[8px] font-black uppercase tracking-widest mb-12">Cachet Officiel Showroom</span>
                      <span className="text-xl font-black tracking-tighter opacity-10 grayscale">🏎️ AUTOLUX</span>
                   </div>
                </div>

                {/* Textes Libres */}
                {printDesign.extraTexts.map(txt => (
                  <div 
                    key={txt.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'extra', id: txt.id }); }}
                    style={{ 
                      position: 'absolute', 
                      left: `calc(50% + ${txt.x}px)`, 
                      top: `calc(50% + ${txt.y}px)`,
                      fontSize: `${txt.fontSize}px`,
                      color: txt.color,
                      fontWeight: txt.isBold ? '900' : '500',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 100
                    }}
                    className={`cursor-move px-4 py-2 rounded-lg transition-all ${selectedElement.id === txt.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    {txt.content}
                  </div>
                ))}
             </div>
           </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {showPrintPreview && printingRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={() => setShowPrintPreview(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-white">
            <div className="text-center mb-8">
              <div className="h-20 w-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">📄</div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Options d'Impression</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Reçu de Versement</p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-black flex-shrink-0">1</div>
                  <div>
                    <p className="font-black text-slate-900 mb-1">Imprimer Directement</p>
                    <p className="text-sm text-slate-600">Imprimer le reçu avec le modèle standard du showroom</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-lg font-black flex-shrink-0">2</div>
                  <div>
                    <p className="font-black text-slate-900 mb-1">Personnaliser & Imprimer</p>
                    <p className="text-sm text-slate-600">Modifier le design avant impression (logo, couleurs, texte)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200">
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="py-5 px-6 rounded-2xl bg-slate-100 text-slate-900 font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
              >
                ← Retour
              </button>
              <button 
                onClick={() => { setShowPrintPreview(false); window.print(); }}
                className="py-5 px-6 rounded-2xl bg-green-600 text-white font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-all shadow-lg"
              >
                🖨️ Imprimer Directement
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="w-full py-5 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                🎨 Personnaliser le Design
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getTypeStyle(type: string) {
  switch(type) {
    case 'sale': return 'bg-green-50 text-green-600 border-green-100';
    case 'purchase': return 'bg-red-50 text-red-600 border-red-100';
    case 'checkin': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'checkout': return 'bg-purple-50 text-purple-600 border-purple-100';
    default: return 'bg-slate-50 text-slate-400 border-slate-100';
  }
}

// --- INSPECTOR COMPONENTS ---
const InspectorGroup: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-6 animate-in slide-in-from-right-4">
     <div className="flex items-center gap-4 text-slate-900"><span className="text-2xl">{icon}</span><h4 className="text-[10px] font-black uppercase tracking-widest">{title}</h4></div>
     <div className="space-y-6">{children}</div>
  </div>
);
const InspectorRange: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <div className="space-y-3">
     <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest"><span>{label}</span><span className="text-blue-600">{value}px</span></div>
     <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
  </div>
);
const InspectorPosition: React.FC<{ value: ElementPosition; onChangeX: (v: number) => void; onChangeY: (v: number) => void }> = ({ value, onChangeX, onChangeY }) => (
  <div className="grid grid-cols-2 gap-6">
     <div className="space-y-3"><div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest"><span>Axe X</span><span className="text-blue-600">{value.x}px</span></div><input type="range" min={-400} max={400} value={value.x} onChange={(e) => onChangeX(Number(e.target.value))} className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" /></div>
     <div className="space-y-3"><div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest"><span>Axe Y</span><span className="text-blue-600">{value.y}px</span></div><input type="range" min={-400} max={400} value={value.y} onChange={(e) => onChangeY(Number(e.target.value))} className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" /></div>
  </div>
);
const InspectorColor: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer shadow-sm" /></div>
);
const InspectorText: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl outline-none font-bold text-xs" /></div>
);
