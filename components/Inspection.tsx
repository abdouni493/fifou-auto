
import React, { useState, useEffect, useMemo } from 'react';
import { InspectionRecord, Language, PurchaseRecord, InvoiceDesign, ElementPosition } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { uploadImagesToBucket } from '../utils';

interface InspectionProps {
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
  headerPadding: 40,
  showChecklist: true,
  labels: {
    title: 'RAPPORT DE DIAGNOSTIC TECHNIQUE',
    total: 'KILOMÉTRAGE CONSTATÉ',
    date: 'DATE DU CONTRÔLE',
    ref: 'DOSSIER N°',
    safetyTitle: 'Contrôle Sécurité',
    equipmentTitle: 'Dotation Bord',
    comfortTitle: 'État & Ambiance',
    partnerLabel: 'Opérateur / Client',
    carLabel: 'Unité Inspectée'
  }
};

export const Inspection: React.FC<InspectionProps> = ({ lang }) => {
  const t = translations[lang];
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [inventory, setInventory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatedDate, setShowCreatedDate] = useState(false);
  
  // UI States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingRecord, setEditingRecord] = useState<InspectionRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<InspectionRecord | null>(null);
  const [printingRecord, setPrintingRecord] = useState<InspectionRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Print Studio States
  const [printDesign, setPrintDesign] = useState<InvoiceDesign>(defaultInvoiceDesign);
  const [activePrintField, setActivePrintField] = useState<'logo' | 'title' | 'metadata' | 'checklist' | 'none'>('none');

  const initialFormState: Partial<InspectionRecord> = {
    type: 'checkin',
    safety: { lights: true, tires: true, brakes: true, wipers: true, mirrors: true, seatbelts: true, horn: true },
    equipment: { spareWheel: true, jack: true, triangles: true, firstAid: true, docs: true },
    comfort: { ac: true, cleanliness: true },
    exterior_photo_urls: [],
    interior_photo_urls: [],
    note: '',
    mileage: 0
  };

  const [formData, setFormData] = useState<Partial<InspectionRecord>>(initialFormState);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [inspRes, invRes] = await Promise.all([
        supabase.from('inspections').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').order('created_at', { ascending: false })
      ]);
      
      if (inspRes.data) {
        setInspections(inspRes.data.map((item: any) => ({
          ...item,
          carId: item.car_id,
          carName: item.car_name,
          partnerName: item.partner_name
        })));
      }
      if (invRes.data) setInventory(invRes.data);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    return inventory.filter(p => 
      `${p.make} ${p.model}`.toLowerCase().includes(q) || p.vin?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery, inventory]);

  const handleSelectCar = (car: PurchaseRecord) => {
    setFormData(prev => ({
      ...prev,
      carId: car.id,
      carName: `${car.make} ${car.model}`,
      vin: car.vin,
      mileage: car.mileage || 0,
      partnerName: car.supplierName || 'Client Showroom'
    }));
    setSearchQuery('');
  };

  const handleToggle = (section: 'safety' | 'equipment' | 'comfort', field: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as any), [field]: !(prev[section] as any)[field] }
    }));
  };

  const handleSave = async () => {
    if (!formData.carId) {
      alert("Erreur: Aucun véhicule sélectionné.");
      setWizardStep(1);
      return;
    }
    setIsSaving(true);
    const payload = {
      type: formData.type,
      car_id: formData.carId,
      car_name: formData.carName,
      vin: formData.vin,
      date: new Date().toISOString().split('T')[0],
      mileage: Number(formData.mileage),
      safety: formData.safety,
      equipment: formData.equipment,
      comfort: formData.comfort,
      note: formData.note || '',
      exterior_photo_urls: formData.exterior_photo_urls,
      interior_photo_urls: formData.interior_photo_urls,
      partner_name: formData.partnerName
    };
    try {
      const { data, error } = editingRecord?.id 
        ? await supabase.from('inspections').update(payload).eq('id', editingRecord.id).select()
        : await supabase.from('inspections').insert([payload]).select();
      if (error) throw error;
      const result = data?.[0] || { id: editingRecord?.id || Math.random().toString(), ...payload };
      const normalized = { ...result, carId: result.car_id, carName: result.car_name, partnerName: result.partner_name };
      setInspections(prev => {
        if (editingRecord?.id) return prev.map(i => i.id === editingRecord.id ? normalized : i);
        return [normalized, ...prev];
      });
      setIsWizardOpen(false);
      setEditingRecord(null);
      setFormData(initialFormState);
      setWizardStep(1);
      setTimeout(fetchInitialData, 1500);
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(`Erreur Critique : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 animate-in fade-in">
      <div className="relative h-24 w-24">
         <div className="absolute inset-0 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
         <div className="absolute inset-0 flex items-center justify-center text-2xl">🏎️</div>
      </div>
      <p className="font-black text-slate-400 uppercase tracking-[0.4em] text-[10px] mt-8 text-center leading-relaxed">Initialisation...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-50 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Contrôle Technique</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
            Surveillance Active
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowCreatedDate(!showCreatedDate)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showCreatedDate ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            📅 {showCreatedDate ? 'Masquer' : 'Afficher'} Date Création
          </button>
          <button 
            onClick={() => { setEditingRecord(null); setFormData(initialFormState); setWizardStep(1); setIsWizardOpen(true); }}
          className="custom-gradient-btn px-10 py-5 rounded-[2.5rem] text-white font-black text-sm shadow-2xl active:scale-95 transition-all flex items-center gap-4 group"
        >
          <span className="text-2xl group-hover:rotate-90 transition-transform duration-500">📋</span> Nouveau Dossier
        </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {inspections.map(insp => (
          <InspectionCard 
            key={insp.id} 
            inspection={insp} 
            onEdit={() => { setEditingRecord(insp); setFormData(insp); setWizardStep(1); setIsWizardOpen(true); }} 
            onView={() => setViewingRecord(insp)} 
            onPrint={() => setPrintingRecord(insp)}
            showCreatedDate={showCreatedDate}
          />
        ))}
      </div>

      {/* PRINT STUDIO MODAL */}
      {printingRecord && (
        <div className="fixed inset-0 z-[150] bg-slate-100 flex overflow-hidden animate-in fade-in">
          {/* Studio Sidebar (Inspector) */}
          <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-lg">🖨️</div>
                <div>
                   <h3 className="font-black text-slate-900 tracking-tight">Studio Print</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Édition en direct</p>
                </div>
              </div>
              <button onClick={() => setPrintingRecord(null)} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-xl hover:bg-red-50">✕</button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {activePrintField === 'none' && (
                <div className="py-20 text-center space-y-4 opacity-40">
                  <span className="text-6xl">🖱️</span>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Cliquer sur un élément de la facture <br/> pour le personnaliser</p>
                </div>
              )}

              {activePrintField === 'logo' && (
                <InspectorGroup title="Identité Visuelle" icon="🖼️">
                   <InspectorPosition 
                     value={printDesign.logoPosition} 
                     onChangeX={(v) => setPrintDesign({...printDesign, logoPosition: {...printDesign.logoPosition, x: v}})}
                     onChangeY={(v) => setPrintDesign({...printDesign, logoPosition: {...printDesign.logoPosition, y: v}})}
                   />
                   <InspectorRange label="Marge Entête" value={printDesign.headerPadding} min={10} max={150} onChange={(v) => setPrintDesign({...printDesign, headerPadding: v})} />
                </InspectorGroup>
              )}

              {activePrintField === 'title' && (
                <InspectorGroup title="Titre du Dossier" icon="🖋️">
                   <InspectorText label="Texte Titre" value={printDesign.labels.title} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, title: v}})} />
                   <InspectorColor label="Couleur de Marque" value={printDesign.primaryColor} onChange={(v) => setPrintDesign({...printDesign, primaryColor: v})} />
                   <InspectorRange label="Taille Police" value={printDesign.fontSizeBase + 10} min={14} max={40} onChange={(v) => setPrintDesign({...printDesign, fontSizeBase: v - 10})} />
                   <InspectorPosition 
                     value={printDesign.titlePosition} 
                     onChangeX={(v) => setPrintDesign({...printDesign, titlePosition: {...printDesign.titlePosition, x: v}})}
                     onChangeY={(v) => setPrintDesign({...printDesign, titlePosition: {...printDesign.titlePosition, y: v}})}
                   />
                </InspectorGroup>
              )}

              {activePrintField === 'metadata' && (
                <InspectorGroup title="Libellés & Données" icon="📝">
                   <InspectorText label="Date" value={printDesign.labels.date} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, date: v}})} />
                   <InspectorText label="Référence" value={printDesign.labels.ref} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, ref: v}})} />
                   <InspectorText label="Kilométrage" value={printDesign.labels.total} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, total: v}})} />
                </InspectorGroup>
              )}

              {activePrintField === 'checklist' && (
                <InspectorGroup title="Paramètres Checklist" icon="🛡️">
                   <InspectorText label="Titre Sécurité" value={printDesign.labels.safetyTitle} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, safetyTitle: v}})} />
                   <InspectorText label="Titre Équipement" value={printDesign.labels.equipmentTitle} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, equipmentTitle: v}})} />
                   <InspectorText label="Titre Ambiance" value={printDesign.labels.comfortTitle} onChange={(v) => setPrintDesign({...printDesign, labels: {...printDesign.labels, comfortTitle: v}})} />
                   <InspectorColor label="Accent Checklist" value={printDesign.accentColor} onChange={(v) => setPrintDesign({...printDesign, accentColor: v})} />
                </InspectorGroup>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
              <button 
                onClick={() => window.print()} 
                className="w-full custom-gradient-btn py-5 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
              >
                Imprimer Document 🖨️
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-grow overflow-y-auto p-12 md:p-20 flex justify-center custom-scrollbar bg-slate-200/50">
             <div className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] w-full max-w-[850px] min-h-[1130px] p-20 flex flex-col transition-all duration-500 origin-top h-fit mb-40 overflow-hidden print:shadow-none print:m-0 print:p-10 print:max-w-none print:min-h-0">
                
                {/* Header (Editable & Draggable) */}
                <div style={{ paddingBottom: `${printDesign.headerPadding}px` }} className="relative flex flex-col items-center">
                   <div 
                     onClick={() => setActivePrintField('logo')}
                     style={{ transform: `translate(${printDesign.logoPosition.x}px, ${printDesign.logoPosition.y}px)` }} 
                     className={`cursor-pointer transition-all ${activePrintField === 'logo' ? 'ring-4 ring-blue-500 ring-offset-4' : 'hover:bg-slate-50'}`}
                   >
                      <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-5xl text-white shadow-xl">🏎️</div>
                   </div>

                   <div 
                     onClick={() => setActivePrintField('title')}
                     style={{ transform: `translate(${printDesign.titlePosition.x}px, ${printDesign.titlePosition.y}px)` }} 
                     className={`w-full text-center mt-10 cursor-pointer transition-all ${activePrintField === 'title' ? 'ring-4 ring-blue-500 ring-offset-4' : 'hover:bg-slate-50'}`}
                   >
                      <h1 style={{ color: printDesign.primaryColor, fontSize: `${printDesign.fontSizeBase + 12}px` }} className="font-black tracking-tighter leading-none mb-2 uppercase">{printDesign.labels.title}</h1>
                      <p className="text-slate-400 font-bold tracking-[0.4em] uppercase text-[10px]">AutoLux Premium Showroom - Services Experts</p>
                   </div>
                </div>

                {/* Metadata Info */}
                <div 
                  onClick={() => setActivePrintField('metadata')}
                  className={`grid grid-cols-2 gap-16 my-16 p-8 rounded-[2rem] cursor-pointer transition-all ${activePrintField === 'metadata' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50/20' : 'hover:bg-slate-50'}`}
                >
                   <div className="space-y-6">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{printDesign.labels.ref}</p>
                         <p className="font-black text-xl text-slate-900">#INSP-{printingRecord.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{printDesign.labels.partnerLabel}</p>
                         <p className="font-black text-lg text-slate-800">{printingRecord.partnerName}</p>
                      </div>
                   </div>
                   <div className="text-right space-y-6">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{printDesign.labels.date}</p>
                         <p className="font-black text-xl text-slate-900">{printingRecord.date}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{printDesign.labels.carLabel}</p>
                         <p className="font-black text-lg text-slate-800 uppercase tracking-tighter">{printingRecord.carName}</p>
                      </div>
                   </div>
                </div>

                {/* Checklist Sections */}
                <div 
                  onClick={() => setActivePrintField('checklist')}
                  className={`flex-grow space-y-12 cursor-pointer p-6 rounded-[2rem] transition-all ${activePrintField === 'checklist' ? 'ring-4 ring-blue-500 ring-offset-4' : ''}`}
                >
                   {/* Safety Checklist */}
                   <div className="space-y-6">
                      <h4 style={{ color: printDesign.primaryColor }} className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-4">
                        <span className="h-2 w-8 bg-blue-600 rounded-full" style={{ backgroundColor: printDesign.accentColor }}></span>
                        🛡️ {printDesign.labels.safetyTitle}
                      </h4>
                      <div className="grid grid-cols-3 gap-x-8 gap-y-4 px-12">
                         {Object.entries(printingRecord.safety || {}).map(([key, val]) => (
                            <CheckItem key={key} label={(t.inspection.safetyItems as any)[key] || key} checked={val as boolean} accent={printDesign.accentColor} />
                         ))}
                      </div>
                   </div>

                   {/* Equipment Checklist */}
                   <div className="space-y-6">
                      <h4 style={{ color: printDesign.primaryColor }} className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-4">
                        <span className="h-2 w-8 bg-blue-600 rounded-full" style={{ backgroundColor: printDesign.accentColor }}></span>
                        🧰 {printDesign.labels.equipmentTitle}
                      </h4>
                      <div className="grid grid-cols-3 gap-x-8 gap-y-4 px-12">
                         {Object.entries(printingRecord.equipment || {}).map(([key, val]) => (
                            <CheckItem key={key} label={(t.inspection.eqItems as any)[key] || key} checked={val as boolean} accent={printDesign.accentColor} />
                         ))}
                      </div>
                   </div>

                   {/* Comfort Checklist */}
                   <div className="space-y-6">
                      <h4 style={{ color: printDesign.primaryColor }} className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-4">
                        <span className="h-2 w-8 bg-blue-600 rounded-full" style={{ backgroundColor: printDesign.accentColor }}></span>
                        ✨ {printDesign.labels.comfortTitle}
                      </h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-12">
                         <CheckItem label="Climatisation OK" checked={printingRecord.comfort?.ac} accent={printDesign.accentColor} />
                         <CheckItem label="Nettoyage Premium" checked={printingRecord.comfort?.cleanliness} accent={printDesign.accentColor} />
                      </div>
                   </div>

                   {/* Notes */}
                   <div className="pt-10 border-t border-slate-100">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-4">Observations Techniques</p>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                        {printingRecord.note || "Aucune observation particulière n'a été signalée pour ce dossier."}
                      </p>
                   </div>
                </div>

                {/* Footer Signatures */}
                <div className="mt-20 flex justify-between items-end border-t-2 pt-12" style={{ borderColor: printDesign.primaryColor }}>
                   <div className="space-y-12">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{printDesign.labels.total}</p>
                         <p className="text-4xl font-black text-slate-900 tracking-tighter">{printingRecord.mileage.toLocaleString()} KM</p>
                      </div>
                      <div className="w-64 border-2 border-slate-100 border-dashed rounded-[3rem] p-8 text-center opacity-30">
                         <p className="text-[8px] font-black uppercase tracking-widest mb-10">Signature du Client</p>
                      </div>
                   </div>
                   <div className="flex flex-col items-center gap-8">
                      <div className="w-64 h-32 border-2 border-slate-100 border-dashed rounded-[3rem] p-8 flex flex-col items-center justify-center relative">
                         <span className="text-[8px] font-black uppercase tracking-widest absolute top-4 opacity-20">Cachet du Showroom</span>
                         <span className="text-3xl opacity-10 grayscale">🏎️ AUTOLUX</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xl animate-in fade-in" onClick={() => setViewingRecord(null)}></div>
          <div className="relative bg-white w-full max-w-4xl p-14 rounded-[4.5rem] shadow-2xl animate-in zoom-in-95 border border-white/20">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h3 className="text-4xl font-black tracking-tighter text-slate-900">{viewingRecord.carName}</h3>
                   <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-2 italic">Dossier Certifié AutoLux</p>
                </div>
                <button onClick={() => setViewingRecord(null)} className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center text-2xl active:scale-90 transition-all">✕</button>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <StatBox label="Date" value={viewingRecord.date} />
                <StatBox label="Kilométrage" value={`${viewingRecord.mileage} KM`} />
                <StatBox label="Opération" value={viewingRecord.type.toUpperCase()} />
                <StatBox label="Châssis" value={viewingRecord.vin} />
             </div>

             <div className="space-y-8">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-50 pb-4">Captures Médias</h4>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                   {[...(viewingRecord.exterior_photo_urls || []), ...(viewingRecord.interior_photo_urls || [])].map((p, i) => (
                     <div key={i} className="aspect-square rounded-[2rem] overflow-hidden border-2 border-slate-50 shadow-sm">
                        <img src={p} className="h-full w-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* WIZARD MODAL (Standard UI) */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xl animate-in fade-in" onClick={() => !isSaving && setIsWizardOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[1300px] h-full max-h-[92vh] overflow-hidden rounded-[4.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 border border-white/40">
            {/* Nav Wizard Header */}
            <div className="px-14 py-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-8">
                  <div className="h-16 w-16 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center text-3xl shadow-xl">⚙️</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Diagnostic Haute Précision</h3>
                    <div className="flex items-center gap-3 mt-2">
                       <span className={`h-1.5 w-16 rounded-full ${wizardStep >= 1 ? 'bg-blue-600' : 'bg-slate-200'} transition-all duration-500`}></span>
                       <span className={`h-1.5 w-16 rounded-full ${wizardStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'} transition-all duration-500`}></span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phase {wizardStep} / 2</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => !isSaving && setIsWizardOpen(false)} className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-xl hover:bg-red-50 text-slate-400 border border-slate-100 shadow-sm transition-all active:scale-90">✕</button>
            </div>
            <div className="flex-grow overflow-y-auto p-12 custom-scrollbar bg-white">
              {/* Simplified Step Implementation for speed */}
               {wizardStep === 1 ? (
                 <div className="space-y-14 animate-in slide-in-from-left-6 duration-500">
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
                      <div className="lg:col-span-4 space-y-10">
                         <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Mouvement</label>
                            <div className="flex p-2 bg-slate-100 rounded-[2.5rem] border border-slate-200 shadow-inner">
                               <button onClick={() => setFormData({...formData, type: 'checkin'})} className={`flex-1 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${formData.type === 'checkin' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>Entrée</button>
                               <button onClick={() => setFormData({...formData, type: 'checkout'})} className={`flex-1 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${formData.type === 'checkout' ? 'bg-white text-purple-600 shadow-xl' : 'text-slate-400'}`}>Sortie</button>
                            </div>
                         </div>
                         <div className="space-y-4 relative">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Unité Showroom</label>
                            <div className="relative group">
                               <span className="absolute left-7 top-1/2 -translate-y-1/2 text-3xl opacity-20 transition-all">🔍</span>
                               <input type="text" value={formData.carName ? formData.carName : searchQuery} onChange={(e) => { if(formData.carName) setFormData({...formData, carName: '', carId: ''}); setSearchQuery(e.target.value); }} className="w-full bg-slate-50 border-2 border-slate-100 px-18 py-6 rounded-[2.5rem] outline-none focus:border-blue-500 font-black text-xl shadow-inner transition-all" placeholder="Rechercher..." />
                               {filteredInventory.length > 0 && (
                                 <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl z-[150] overflow-hidden">
                                   {filteredInventory.map(car => (
                                     <button key={car.id} onClick={() => handleSelectCar(car)} className="w-full p-8 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-all group/item">
                                       <div>
                                         <p className="font-black text-slate-900 text-lg group-hover/item:text-blue-600">{car.make} {car.model}</p>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{car.vin}</p>
                                       </div>
                                       <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 opacity-0 group-hover/item:opacity-100 transition-all">→</div>
                                     </button>
                                   ))}
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                      <div className="lg:col-span-8">
                         {formData.carId ? (
                           <div className="h-full bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10 animate-in zoom-in-95 duration-700">
                              <div className="relative z-10 flex justify-between items-start">
                                 <div>
                                    <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block">Unité Active</span>
                                    <h4 className="text-5xl font-black tracking-tighter leading-none">{formData.carName}</h4>
                                    <p className="text-slate-400 font-mono tracking-[0.3em] text-sm opacity-60 mt-4">{formData.vin}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-2xl font-black text-blue-400">{formData.partnerName}</p>
                                 </div>
                              </div>
                              <div className="relative z-10 flex items-end gap-12 mt-12 bg-white/5 p-8 rounded-[3rem] border border-white/5 backdrop-blur-md">
                                 <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block ml-3">Relevé KM</label>
                                    <div className="relative"><input type="number" value={formData.mileage} onChange={(e) => setFormData({...formData, mileage: Number(e.target.value)})} className="bg-transparent border-b-2 border-blue-500/50 text-5xl font-black text-white outline-none w-full py-2 focus:border-blue-400 transition-all" /></div>
                                 </div>
                              </div>
                           </div>
                         ) : <div className="h-full border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center justify-center text-slate-300 bg-slate-50/20">...</div>}
                      </div>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-14 border-t border-slate-100">
                      <DiagnosticSection title="Contrôle Sécurité" icon="🛡️">
                         {Object.entries(formData.safety || {}).map(([k, v]) => <DiagnosticTile key={k} label={(t.inspection.safetyItems as any)[k] || k} active={v as boolean} onToggle={() => handleToggle('safety', k)} />)}
                      </DiagnosticSection>
                      <DiagnosticSection title="Dotation Bord" icon="🧰">
                         {Object.entries(formData.equipment || {}).map(([k, v]) => <DiagnosticTile key={k} label={(t.inspection.eqItems as any)[k] || k} active={v as boolean} onToggle={() => handleToggle('equipment', k)} />)}
                      </DiagnosticSection>
                      <DiagnosticSection title="État & Ambiance" icon="✨">
                         <DiagnosticTile label="Climatisation OK" active={formData.comfort?.ac as boolean} onToggle={() => handleToggle('comfort', 'ac')} />
                         <DiagnosticTile label="Nettoyage Premium" active={formData.comfort?.cleanliness as boolean} onToggle={() => handleToggle('comfort', 'cleanliness')} />
                         <textarea value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-8 rounded-[3rem] outline-none mt-8 focus:border-blue-500 font-bold min-h-[160px] shadow-inner transition-all resize-none" placeholder="Notes additionnelles..."></textarea>
                      </DiagnosticSection>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-16 animate-in slide-in-from-right-6 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <MediaUploader title="Captures Extérieures" bucket="inspection-exterior" photos={formData.exterior_photo_urls || []} onUpdate={(p) => setFormData({...formData, exterior_photo_urls: p})} />
                        <MediaUploader title="Captures Intérieures" bucket="inspection-interior" photos={formData.interior_photo_urls || []} onUpdate={(p) => setFormData({...formData, interior_photo_urls: p})} />
                    </div>
                 </div>
               )}
            </div>
            <div className="px-14 py-10 border-t border-slate-100 flex justify-between bg-slate-50/50 shrink-0">
               <button onClick={() => wizardStep === 1 ? setIsWizardOpen(false) : setWizardStep(1)} disabled={isSaving} className="px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30">Annuler</button>
               <button onClick={() => wizardStep === 1 ? setWizardStep(2) : handleSave()} disabled={!formData.carId || isSaving} className="custom-gradient-btn px-20 py-5 rounded-full text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale">
                 {isSaving ? 'Synchronisation...' : wizardStep === 1 ? 'Phase Médias →' : 'Enregistrer'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const InspectionCard = ({ inspection, onEdit, onView, onPrint, showCreatedDate }: any) => (
  <div className="bg-white rounded-[4rem] border border-slate-100 p-10 shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col group h-full">
    <div className="flex justify-between items-start mb-8">
      <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${inspection.type === 'checkin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
        {inspection.type === 'checkin' ? 'Check-In' : 'Check-Out'}
      </span>
      <div className="text-right">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{inspection.date}</p>
        {showCreatedDate && inspection.created_at && (
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">📅 {new Date(inspection.created_at).toLocaleDateString('fr-FR')}</p>
        )}
      </div>
    </div>
    <h3 className="text-2xl font-black text-slate-900 mb-1 line-clamp-1 tracking-tighter">{inspection.carName}</h3>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-10">{inspection.vin}</p>
    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100/50 flex-grow mb-10 space-y-4 shadow-inner">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relevé KM</span>
        <span className="text-xl font-black text-blue-600 tracking-tighter">{inspection.mileage?.toLocaleString()} KM</span>
      </div>
      <div className="h-px bg-slate-200/50"></div>
      <p className="text-[11px] font-bold text-slate-500 truncate italic">👤 Opérateur : {inspection.partnerName}</p>
      {inspection.created_by && (
        <>
          <div className="h-px bg-slate-200/50"></div>
          <p className="text-[11px] font-bold text-slate-600 truncate">📋 Créé par : {inspection.created_by}</p>
        </>
      )}
    </div>
    <div className="grid grid-cols-3 gap-2">
      <button onClick={onView} className="bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">👀 Voir</button>
      <button onClick={onEdit} className="bg-amber-50 text-amber-600 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all active:scale-95">✏️ Editer</button>
      <button onClick={onPrint} className="bg-blue-50 text-blue-600 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-blue-500/10">🖨️ Print</button>
    </div>
  </div>
);

const DiagnosticSection = ({ title, icon, children }: any) => (
  <div className="space-y-8">
     <div className="flex items-center gap-5 border-b border-slate-50 pb-5">
        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shadow-sm">{icon}</div>
        <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h4>
     </div>
     <div className="grid grid-cols-1 gap-4">{children}</div>
  </div>
);

const DiagnosticTile = ({ label, active, onToggle }: any) => (
  <button onClick={onToggle} className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] border-2 transition-all duration-300 active:scale-[0.98] ${active ? 'bg-blue-50/50 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-white border-slate-100 opacity-40 hover:opacity-100 grayscale'}`}>
     <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-blue-700' : 'text-slate-400'}`}>{label}</span>
     <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 ${active ? 'bg-blue-600 text-white rotate-[360deg] shadow-lg shadow-blue-500/30' : 'bg-slate-200 text-slate-400'}`}>{active ? '✓' : '✕'}</div>
  </button>
);

const CheckItem = ({ label, checked, accent }: any) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 font-bold text-slate-600">
    <span className="text-[11px] uppercase tracking-tight">{label}</span>
    <span className="text-xl" style={{ color: checked ? accent : '#e2e8f0' }}>{checked ? '✓' : '✕'}</span>
  </div>
);

const MediaUploader = ({ title, bucket, photos, onUpdate }: any) => {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const urls = await uploadImagesToBucket(bucket, Array.from(files));
      onUpdate([...photos, ...urls]);
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Erreur lors du téléchargement des photos');
    }
  };
  return (
    <div className="space-y-8">
       <h4 className="text-2xl font-black tracking-tighter flex items-center gap-5"><span className="h-2 w-10 bg-blue-600 rounded-full"></span>{title}</h4>
       <div className="grid grid-cols-2 gap-6">
          <label className="aspect-[4/3] rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all text-blue-500 shadow-inner group">
             <input type="file" multiple className="hidden" onChange={handleUpload} />
             <span className="text-5xl group-hover:scale-125 transition-transform duration-500">📸</span>
          </label>
          {photos.map((p: any, i: number) => (
            <div key={i} className="aspect-[4/3] rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl relative group/img hover:scale-[1.03] transition-transform duration-500">
               <img src={p} className="w-full h-full object-cover" />
               <button onClick={() => onUpdate(photos.filter((_: any, idx: number) => idx !== i))} className="absolute top-4 right-4 h-10 w-10 rounded-2xl bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all shadow-xl">✕</button>
            </div>
          ))}
       </div>
    </div>
  );
};

const StatBox = ({ label, value }: any) => (
  <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 shadow-inner">
     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
     <p className="text-lg font-black text-slate-900 truncate tracking-tight">{value}</p>
  </div>
);

// --- INSPECTOR COMPONENTS (Studio Studio) ---

const InspectorGroup: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-6 animate-in slide-in-from-right-4">
     <div className="flex items-center gap-4 text-slate-900">
        <span className="text-2xl">{icon}</span>
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">{title}</h4>
     </div>
     <div className="space-y-6">{children}</div>
  </div>
);

const InspectorRange: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <div className="space-y-3">
     <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-blue-600">{value}px</span>
     </div>
     <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
  </div>
);

const InspectorPosition: React.FC<{ value: ElementPosition; onChangeX: (v: number) => void; onChangeY: (v: number) => void }> = ({ value, onChangeX, onChangeY }) => (
  <div className="grid grid-cols-2 gap-6">
     <div className="space-y-3">
        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase"><span>Axe X</span><span className="text-blue-600">{value.x}px</span></div>
        <input type="range" min={-300} max={300} value={value.x} onChange={(e) => onChangeX(Number(e.target.value))} className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
     </div>
     <div className="space-y-3">
        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase"><span>Axe Y</span><span className="text-blue-600">{value.y}px</span></div>
        <input type="range" min={-100} max={200} value={value.y} onChange={(e) => onChangeY(Number(e.target.value))} className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
     </div>
  </div>
);

const InspectorColor: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
     <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
     <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer" />
  </div>
);

const InspectorText: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
     <label className="text-[8px] font-black text-slate-400 uppercase ml-2">{label}</label>
     <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl outline-none font-bold text-xs" />
  </div>
);