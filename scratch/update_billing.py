import os
import re

with open('components/Billing.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_print_modal = """      {/* DIRECT PRINT PREVIEW */}
      {printingRecord && (
        <div className="fixed inset-0 z-[250] bg-slate-100 flex flex-col overflow-hidden animate-in fade-in">
           <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10 print:hidden">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">📄</div>
               <div>
                 <h3 className="font-black text-slate-900 tracking-tight">Aperçu Avant Impression</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   {printType === 'receipt' ? 'Reçu de Versement' : (printType === 'sale' ? 'Facture de Vente' : 'Rapport de Diagnostic')}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-4">
               <button onClick={() => { setPrintingRecord(null); setPrintType(null); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Fermer</button>
               <button onClick={() => window.print()} className="custom-gradient-btn px-8 py-3 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2"><span>🖨️</span> Imprimer</button>
             </div>
           </div>
           
           <div id="invoice-content" className="flex-grow overflow-y-auto p-8 flex justify-center bg-slate-200/50 custom-scrollbar print:p-0 print:bg-white print:overflow-visible print:block">
             <div className="bg-white shadow-2xl w-full max-w-[850px] min-h-[1130px] p-20 flex flex-col print:shadow-none print:m-0 print:p-10 relative overflow-hidden h-fit mb-40 print:mb-0">
                
                {/* Header */}
                <div className="flex flex-col items-center pb-16">
                   <div>
                      {showroom.logo_url ? (
                        <img src={showroom.logo_url} className="w-24 h-24 object-contain shadow-xl rounded-[2rem] print:shadow-none" alt="Logo" />
                      ) : (
                        <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-5xl text-white shadow-xl print:shadow-none print:border print:border-slate-200">🏎️</div>
                      )}
                   </div>
                   <div className="mt-10 w-full text-center">
                      <h1 className="text-4xl font-black uppercase tracking-tighter leading-none text-slate-900">
                        {printType === 'receipt' ? 'REÇU DE VERSEMENT' : (printType === 'sale' ? 'FACTURE DE VENTE VÉHICULE' : 'RAPPORT DE DIAGNOSTIC')}
                      </h1>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">{showroom.name} - {showroom.slogan}</p>
                      <p className="text-slate-300 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">{showroom.address}</p>
                   </div>
                </div>

                {/* Section Partenaire */}
                <div className="grid grid-cols-2 gap-16 my-16 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 print:bg-transparent print:border-2 print:border-slate-200">
                   <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinataire</p>
                        <p className="font-black text-xl text-slate-900">
                          {printType === 'sale' || printType === 'receipt' ? `${printingRecord.first_name} ${printingRecord.last_name}` : (printingRecord.partner_name || 'Partenaire')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse de contact</p>
                        <p className="font-bold text-sm text-slate-600 leading-snug">{printingRecord.address || 'Non spécifiée'}</p>
                      </div>
                      {printType === 'receipt' && (
                         <div className="pt-4">
                            <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-xl text-[9px] font-black uppercase tracking-widest print:border print:border-green-200 print:bg-transparent">Paiement Validé</span>
                         </div>
                      )}
                   </div>
                   <div className="text-right space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence Dossier</p>
                        <p className="font-black text-lg text-slate-900">#{printType === 'receipt' ? 'PAY' : (printType === 'sale' ? 'VNT' : 'INSP')}-{printingRecord.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-sm font-bold text-slate-400">{printingRecord.payment_date || (printingRecord.created_at ? new Date(printingRecord.created_at).toLocaleDateString() : '--')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document d'identité</p>
                        <p className="font-bold text-sm text-slate-600">{printingRecord.doc_type || 'ID Client'} • {printingRecord.doc_number || 'N/A'}</p>
                      </div>
                   </div>
                </div>

                {/* Section Véhicule */}
                <div className="p-10 border-2 border-slate-900 rounded-[3rem] space-y-8">
                   <div className="flex justify-between items-center border-b border-slate-900 pb-6">
                      <h4 className="text-xl font-black tracking-tighter uppercase text-slate-900">Désignation du véhicule</h4>
                      <span className="px-4 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest print:bg-transparent print:text-slate-900 print:border print:border-slate-900">Unité Showroom</span>
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase">Modèle / Gamme</p>
                         <p className="font-black text-lg leading-none uppercase text-slate-900">
                           {printType === 'sale' || printType === 'receipt' ? (inventory.find(c=>c.id===printingRecord.car_id)?.model || 'Véhicule Prestige') : (printingRecord.car_name || 'Inconnu')}
                         </p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Châssis / VIN</p>
                         <p className="font-black text-lg leading-none uppercase font-mono text-slate-900">{printingRecord.vin || 'NON_SPECIFIE'}</p>
                      </div>
                   </div>
                </div>

                {/* Section Finance */}
                <div className="mt-16 border-t-2 border-slate-900 pt-12 flex justify-between items-end">
                   <div className="space-y-8">
                      {printType === 'receipt' ? (
                        <>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Reçu ce Jour</p>
                             <p className="text-4xl font-black text-slate-900 tracking-tighter">{(printingRecord.payment_received || 0).toLocaleString()} DA</p>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Cumul Payé</p>
                                <p className="text-xl font-black text-slate-900">{(printingRecord.total_after || 0).toLocaleString()} DA</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Solde Restant</p>
                                <p className="text-xl font-black text-slate-900">{(printingRecord.balance_after || 0).toLocaleString()} DA</p>
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
                               <p className="text-5xl font-black text-slate-900">{(printingRecord.balance || 0).toLocaleString()} DA</p>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kilométrage Constate</p>
                             <p className="text-5xl font-black text-slate-900">{(printingRecord.mileage || 0).toLocaleString()} KM</p>
                          </div>
                        )
                      )}
                   </div>
                   <div className="h-40 w-64 border-2 border-slate-100 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center opacity-40 print:border-solid print:border-slate-300 print:opacity-100">
                      <span className="text-[8px] font-black uppercase tracking-widest mb-12">Cachet Officiel Showroom</span>
                      <span className="text-xl font-black tracking-tighter opacity-20 grayscale">🏎️ AUTOLUX</span>
                   </div>
                </div>

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
"""

content = re.sub(r'      \{\/\* PRINT STUDIO MODAL INTERACTIF.*', new_print_modal, content, flags=re.DOTALL)

with open('components/Billing.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
