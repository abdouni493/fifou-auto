
import React, { useState, useEffect } from 'react';
import { PurchaseRecord, Language, Supplier } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { getCreatedByValue, uploadImagesToBucket } from '../utils';
import { InvoiceEditor } from './InvoiceEditor';

// Print styles - CRITICAL: Only show invoice content
const printStyles = `
  @media print {
    * {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    
    body, html {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    
    body {
      display: block !important;
    }
    
    /* Hide all elements by default */
    body > * {
      display: none !important;
    }
    
    /* Show only the invoice content */
    #invoice-content {
      display: block !important;
      position: static !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 40px !important;
      background: white !important;
      visibility: visible !important;
      opacity: 1 !important;
      overflow: visible !important;
      height: auto !important;
      page-break-inside: avoid !important;
    }
    
    /* Show all content inside invoice */
    #invoice-content * {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      margin: inherit !important;
      padding: inherit !important;
    }
    
    /* Restore flex and grid displays */
    #invoice-content > div,
    #invoice-content > h1,
    #invoice-content > h2,
    #invoice-content > p {
      display: block !important;
    }
    
    [style*="display: flex"] {
      display: flex !important;
    }
    
    [style*="display: grid"] {
      display: grid !important;
    }
    
    @page {
      size: A4;
      margin: 10mm;
    }
  }
`;

// Inject print styles once
if (typeof document !== 'undefined' && !document.querySelector('style[data-print-invoice]')) {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-print-invoice', 'true');
  styleEl.innerHTML = printStyles;
  document.head.appendChild(styleEl);
}

interface PurchaseProps {
  lang: Language;
  initialEditRecord?: PurchaseRecord | null;
  onClearEdit?: () => void;
  userName?: string;
}

export const Purchase: React.FC<PurchaseProps> = ({ lang, initialEditRecord, onClearEdit, userName }) => {
  const t = translations[lang];
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PurchaseRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<PurchaseRecord | null>(null);
  const [showCreatedDate, setShowCreatedDate] = useState(false);
  const [printRecord, setPrintRecord] = useState<PurchaseRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    if (initialEditRecord) {
      setEditingRecord(initialEditRecord);
      setIsFormOpen(true);
    }
  }, [initialEditRecord]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      console.log('Raw database purchases:', data);
      
      // Normalize database fields to camelCase for component compatibility
      const normalizedData = (data || []).map((p: any) => {
        const normalized = {
          id: p.id,
          supplierId: p.supplier_id,
          supplierName: p.supplier_name,
          make: p.make,
          model: p.model,
          plate: p.plate,
          year: p.year,
          color: p.color,
          vin: p.vin,
          fuel: p.fuel,
          transmission: p.transmission,
          seats: p.seats,
          doors: p.doors,
          mileage: p.mileage,
          insuranceExpiry: p.insurance_expiry,
          techControlDate: p.tech_control_date,
          insuranceCompany: p.insurance_company,
          photos: p.photos || [],
          totalCost: p.total_cost,
          sellingPrice: p.selling_price,
          dateAdded: p.created_at,
          purchaseDateTime: p.purchase_date_time,
          created_at: p.created_at,
          is_sold: p.is_sold,
          created_by: p.created_by,
          safety: p.safety_checklist || {},
          equipment: p.equipment_checklist || {},
          comfort: p.comfort_checklist || {}
        };
        if (Object.keys(normalized.safety).length > 0) console.log(`🛡️ Loaded safety for ${normalized.make} ${normalized.model}:`, normalized.safety);
        if (Object.keys(normalized.equipment).length > 0) console.log(`🧰 Loaded equipment for ${normalized.make} ${normalized.model}:`, normalized.equipment);
        if (Object.keys(normalized.comfort).length > 0) console.log(`✨ Loaded comfort for ${normalized.make} ${normalized.model}:`, normalized.comfort);
        if (Object.keys(normalized.safety).length === 0 && Object.keys(normalized.equipment).length === 0 && Object.keys(normalized.comfort).length === 0) {
          console.log(`⚠️ No inspection items for ${normalized.make} ${normalized.model}`);
        }
        return normalized;
      });
      
      console.log('Normalized purchases:', normalizedData);
      setPurchases(normalizedData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      // Convert camelCase to snake_case for database compatibility
      const dbData = {
        supplier_id: data.supplierId || null,
        supplier_name: data.supplierName || '',
        make: data.make || '',
        model: data.model || '',
        plate: data.plate || '',
        year: data.year || '',
        color: data.color || '',
        vin: data.vin || '',
        fuel: data.fuel || 'essence',
        transmission: data.transmission || 'manuelle',
        seats: parseInt(data.seats) || 5,
        doors: parseInt(data.doors) || 5,
        mileage: parseInt(data.mileage) || 0,
        insurance_expiry: data.insuranceExpiry || null,
        tech_control_date: data.techControlDate || null,
        insurance_company: data.insuranceCompany || '',
        photo_urls: data.photo_urls || [],
        total_cost: parseFloat(data.totalCost) || 0,
        selling_price: parseFloat(data.sellingPrice) || 0,
        is_sold: data.is_sold || false,
        created_by: data.created_by || getCreatedByValue(),
        safety_checklist: data.safety || {},
        equipment_checklist: data.equipment || {},
        comfort_checklist: data.comfort || {}
      };

      console.log('📝 Form data before save:', {
        safety: data.safety,
        equipment: data.equipment,
        comfort: data.comfort,
        make: data.make,
        model: data.model
      });
      console.log('🗄️ DB data being saved:', {
        safety_checklist: dbData.safety_checklist,
        equipment_checklist: dbData.equipment_checklist,
        comfort_checklist: dbData.comfort_checklist,
        make: dbData.make,
        model: dbData.model
      });
      console.log('✅ Has safety items?', Object.keys(dbData.safety_checklist).length > 0);
      console.log('✅ Has equipment items?', Object.keys(dbData.equipment_checklist).length > 0);
      console.log('✅ Has comfort items?', Object.keys(dbData.comfort_checklist).length > 0);

      if (editingRecord) {
        const { error } = await supabase.from('purchases').update(dbData).eq('id', editingRecord.id);
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase.from('purchases').insert([dbData]);
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }
      await fetchPurchases();
      setIsFormOpen(false);
      setEditingRecord(null);
      if (onClearEdit) onClearEdit();
    } catch (err: any) {
      console.error('Full error:', err);
      alert(`Erreur: ${err.message}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-16 w-16 border-[6px] border-slate-100 border-t-blue-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-blue-600 uppercase tracking-[0.4em] text-[10px]">Ouverture du registre des achats...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="flex justify-between items-end border-b border-slate-50 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.purchase.title}</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-3">Mise à jour du Stock Showroom</p>
        </div>
        <button 
          onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
          className="custom-gradient-btn px-14 py-5 rounded-[2.5rem] text-white font-black text-xs uppercase tracking-widest flex items-center gap-4 shadow-xl active:scale-95 transition-all"
        >
          <span className="text-2xl">🏷️</span> {t.purchase.addBtn}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {purchases.map(p => (
          <div key={p.id} className="bg-white rounded-[3.5rem] border border-slate-50 shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col overflow-hidden h-full group">
            <div className="relative h-64 overflow-hidden">
               <img 
                 src={p.photos?.[0] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000'} 
                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                 alt={p.model} 
               />
               <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm">
                  <span className="text-xs font-black text-blue-600">{p.year}</span>
               </div>
               <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full">
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">{p.fuel} • {p.transmission}</span>
               </div>
               {showCreatedDate && p.created_at && (
                  <div className="absolute bottom-6 right-6 bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">📅 {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
               )}
            </div>
            <div className="p-8 flex flex-col flex-grow">
               <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{p.make}</h3>
               <p className="text-lg font-bold text-slate-400 mb-6">{p.model}</p>
               
               {p.created_by && (
                  <div className="mb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    👤 Créé par: <span className="text-slate-700">{p.created_by}</span>
                  </div>
               )}
               
               <div className="bg-slate-50 p-6 rounded-[2.2rem] mb-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prix de Vente Showroom</p>
                  <p className="text-3xl font-black text-blue-600 tracking-tighter">
                    {(p.sellingPrice || p.selling_price)?.toLocaleString()} <span className="text-sm font-bold opacity-40">{t.currency}</span>
                  </p>
               </div>

               <div className="flex gap-3 mt-auto">
                 <button 
                   onClick={() => setDetailsRecord(p)} 
                   className="flex-grow py-4.5 rounded-[1.5rem] bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-blue-600"
                 >
                   👁️ Détails
                 </button>
                 <button 
                   onClick={() => { setPrintRecord(p); setShowPrintModal(true); }}
                   className="flex-grow py-4.5 rounded-[1.5rem] bg-green-500 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-green-600"
                 >
                   🖨️ Imprimer
                 </button>
                 <button 
                   onClick={() => { setEditingRecord(p); setIsFormOpen(true); }} 
                   className="flex-grow py-4.5 rounded-[1.5rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-blue-600"
                 >
                   ✏️ Modifier
                 </button>
                 <button 
                   onClick={async () => { if(confirm(t.purchase.confirmDelete)) { await supabase.from('purchases').delete().eq('id', p.id); fetchPurchases(); } }} 
                   className="h-14 w-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                 >
                   🗑️
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <PurchaseForm 
          lang={lang} 
          onClose={() => { setIsFormOpen(false); setEditingRecord(null); if(onClearEdit) onClearEdit(); }} 
          onSubmit={handleSave}
          initialData={editingRecord}
        />
      )}

      {detailsRecord && (
        <PurchaseDetailsModal 
          purchase={detailsRecord}
          onClose={() => setDetailsRecord(null)}
          lang={lang}
        />
      )}

      {showPrintModal && printRecord && (
        <PrintInvoiceModal 
          purchase={printRecord}
          lang={lang}
          onClose={() => { setShowPrintModal(false); setPrintRecord(null); }}
        />
      )}
    </div>
  );
};

const PurchaseForm: React.FC<{ lang: Language; onClose: () => void; onSubmit: (data: any) => void; initialData: PurchaseRecord | null }> = ({ lang, onClose, onSubmit, initialData }) => {
  const t = translations[lang];
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState<Partial<PurchaseRecord>>(initialData || {
    supplierId: '', supplierName: '', make: '', model: '', year: new Date().getFullYear().toString(),
    color: '', vin: '', fuel: 'essence', transmission: 'manuelle', seats: 5, doors: 5, mileage: 0,
    insuranceExpiry: '', techControlDate: '', insuranceCompany: '', photo_urls: [], totalCost: 0, sellingPrice: 0,
    purchaseDateTime: new Date().toISOString().slice(0, 16),
    // Inspection checklist items
    safety: {},
    equipment: {},
    comfort: {}
  });
  
  // States for custom inspection items
  const [newSafetyItem, setNewSafetyItem] = useState('');
  const [newEquipmentItem, setNewEquipmentItem] = useState('');
  const [newComfortItem, setNewComfortItem] = useState('');
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  
  const addCustomItem = async (section: 'safety' | 'equipment' | 'comfort', itemName: string) => {
    if (!itemName.trim()) return;
    
    // Add to local form state
    setFormData({
      ...formData,
      [section]: {
        ...(formData[section] || {}),
        [itemName]: true
      }
    });
    
    // Save to database as a template
    try {
      const { error } = await supabase
        .from('inspection_templates')
        .insert([
          {
            template_type: section,
            item_name: itemName,
            checked: true,
            created_by: 'user',
            is_active: true
          }
        ])
        .select();
      
      if (error && error.code !== '23505') { // 23505 is unique constraint violation (item already exists)
        throw error;
      }
      
      console.log(`✅ Template saved: ${section} - ${itemName}`);
    } catch (err) {
      console.error('Error saving custom template:', err);
    }
    
    // Clear input field
    if (section === 'safety') setNewSafetyItem('');
    if (section === 'equipment') setNewEquipmentItem('');
    if (section === 'comfort') setNewComfortItem('');
  };
  
  const deleteCustomItem = async (section: 'safety' | 'equipment' | 'comfort', key: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer "${key}" de la base de données?\n\n` +
      'Cette action supprimera le modèle pour TOUS les véhicules futurs.\n\n' +
      'Cliquez sur "OK" pour confirmer la suppression.'
    );
    
    if (!confirmed) {
      console.log('❌ Suppression annulée');
      return;
    }
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('inspection_templates')
        .delete()
        .eq('template_type', section)
        .eq('item_name', key);
      
      if (error) throw error;
      
      console.log(`🗑️ Template supprimé de la base de données: ${section} - ${key}`);
      
      // Remove from form state (only after database deletion succeeds)
      const currentSection = formData[section] || {};
      const updated = { ...currentSection };
      delete updated[key];
      
      setFormData(prevFormData => ({
        ...prevFormData,
        [section]: updated
      }));
      
      console.log(`✅ Suppression complète: ${key}`);
    } catch (err) {
      console.error('Erreur lors de la suppression du modèle:', err);
      alert(`Erreur: Impossible de supprimer "${key}" de la base de données.\n\nVérifiez la console pour plus de détails.`);
    }
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase.from('suppliers').select('id, name');
      setSuppliers(data || []);
    };
    fetchSuppliers();
  }, []);

  // Load inspection templates on component mount if form is empty
  useEffect(() => {
    const loadTemplates = async () => {
      // Only load templates if:
      // 1. Not already loaded
      // 2. Not editing an existing record
      // 3. Form inspection sections are empty
      if (templatesLoaded || initialData) {
        return;
      }
      
      try {
        const { data: templates, error } = await supabase
          .from('inspection_templates')
          .select('*')
          .eq('is_active', true)
          .order('template_type, item_name');
        
        if (error) throw error;
        
        if (templates && templates.length > 0) {
          const safetyChecks: any = {};
          const equipmentChecks: any = {};
          const comfortChecks: any = {};
          
          templates.forEach((template: any) => {
            if (template.template_type === 'safety') {
              safetyChecks[template.item_name] = template.checked;
            } else if (template.template_type === 'equipment') {
              equipmentChecks[template.item_name] = template.checked;
            } else if (template.template_type === 'comfort') {
              comfortChecks[template.item_name] = template.checked;
            }
          });
          
          setFormData(prev => ({
            ...prev,
            safety: Object.keys(safetyChecks).length > 0 ? safetyChecks : prev.safety,
            equipment: Object.keys(equipmentChecks).length > 0 ? equipmentChecks : prev.equipment,
            comfort: Object.keys(comfortChecks).length > 0 ? comfortChecks : prev.comfort
          }));
          
          setTemplatesLoaded(true);
          console.log('📋 Templates loaded:', { safetyChecks, equipmentChecks, comfortChecks });
        }
      } catch (err) {
        console.error('Error loading inspection templates:', err);
      }
    };
    
    loadTemplates();
  }, [templatesLoaded, initialData]);

  // Update form data when initialData changes (for editing existing records)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: ['totalCost', 'sellingPrice', 'mileage', 'seats', 'doors'].includes(name) ? Number(value) : value 
    }));
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = suppliers.find(sup => sup.id === e.target.value);
    setFormData(prev => ({ ...prev, supplierId: e.target.value, supplierName: s?.name || '' }));
  };

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const urls = await uploadImagesToBucket('vehicle-photos', Array.from(files));
      setFormData(prev => ({ ...prev, photo_urls: [...(prev.photo_urls || []), ...urls] }));
    } catch (err) {
      console.error('Vehicle photo upload failed:', err);
      alert('Erreur lors du téléchargement des photos');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[4rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 border border-white">
        
        {/* Header */}
        <div className="px-12 py-10 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[1.8rem] bg-blue-600 text-white flex items-center justify-center text-4xl shadow-xl">🛒</div>
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">{initialData ? "Modifier l'Achat" : "Nouvel Achat Véhicule"}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Acquisition Showroom</p>
            </div>
          </div>
          <button onClick={onClose} className="h-14 w-14 bg-white border border-slate-100 rounded-full flex items-center justify-center text-2xl hover:bg-red-50 text-slate-400 shadow-sm">✕</button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-white px-12 pb-12">
          <div className="space-y-12">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* SECTION 1: SOURCE & IDENTITÉ */}
              <Section title="Source & Identité" icon="🤝">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Partenaire Fournisseur</label>
                       <select 
                         name="supplierId" 
                         value={formData.supplierId} 
                         onChange={handleSupplierChange}
                         className="w-full bg-slate-50 border-2 border-slate-100 px-8 py-5 rounded-[2rem] outline-none focus:border-blue-500 font-bold text-slate-800 appearance-none shadow-inner text-lg"
                       >
                         <option value="">Sélectionner un fournisseur...</option>
                         {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                    <Field label="Marque" name="make" value={formData.make} onChange={handleChange} />
                    <Field label="Modèle" name="model" value={formData.model} onChange={handleChange} />
                    <Field label="Année" name="year" value={formData.year} onChange={handleChange} />
                    <Field label="Couleur" name="color" value={formData.color} onChange={handleChange} />
                    <div className="sm:col-span-2">
                      <Field label="Numéro de Châssis (VIN)" name="vin" value={formData.vin} onChange={handleChange} />
                    </div>
                 </div>
              </Section>

              {/* SECTION 2: CARACTÉRISTIQUES */}
              <Section title="Caractéristiques" icon="⚙️">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Transmission</label>
                       <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                          {['manuelle', 'auto'].map(t => (
                            <button key={t} type="button" onClick={() => setFormData({...formData, transmission: t as any})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.transmission === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                               {t}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Énergie</label>
                       <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                          {['essence', 'diesel'].map(e => (
                            <button key={e} type="button" onClick={() => setFormData({...formData, fuel: e as any})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.fuel === e ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                               {e}
                            </button>
                          ))}
                       </div>
                    </div>
                    <Field label="Kilométrage" name="mileage" type="number" value={formData.mileage} onChange={handleChange} />
                    <div className="grid grid-cols-2 gap-4">
                       <Field label="Seats" name="seats" type="number" value={formData.seats} onChange={handleChange} />
                       <Field label="Doors" name="doors" type="number" value={formData.doors} onChange={handleChange} />
                    </div>
                 </div>
              </Section>

              {/* SECTION 3: MÉDIA & VISUELS */}
              <Section title="Média & Visuels" icon="📸">
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {formData.photos?.map((p, i) => (
                      <div key={i} className="h-44 w-36 shrink-0 rounded-[2.5rem] border-[4px] border-white shadow-xl overflow-hidden group/img relative">
                         <img src={p} className="w-full h-full object-cover" />
                         <button onClick={() => setFormData({...formData, photo_urls: formData.photo_urls?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 h-7 w-7 bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">✕</button>
                      </div>
                    ))}
                    <label className="h-44 w-36 shrink-0 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-500 transition-all text-blue-500">
                       <input type="file" multiple className="hidden" onChange={handlePhotos} />
                       <span className="text-4xl">➕</span>
                    </label>
                 </div>
              </Section>

              {/* SECTION 4: ADMINISTRATION */}
              <Section title="Administration" icon="📜">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <details className="sm:col-span-2 space-y-4">
                      <summary className="cursor-pointer text-[10px] font-black text-slate-600 uppercase tracking-widest ml-3 pb-4 border-b border-slate-100">
                        📋 Informations d'Assurance (Optionnel)
                      </summary>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                        <Field label="Expiration Assurance" name="insuranceExpiry" type="date" value={formData.insuranceExpiry} onChange={handleChange} />
                        <Field label="Contrôle Technique" name="techControlDate" type="date" value={formData.techControlDate} onChange={handleChange} />
                        <div className="sm:col-span-2">
                           <Field label="Compagnie d'Assurance" name="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} placeholder="Ex: SAA, AXA..." />
                        </div>
                      </div>
                    </details>
                    
                    <details className="sm:col-span-2 space-y-4">
                      <summary className="cursor-pointer text-[10px] font-black text-slate-600 uppercase tracking-widest ml-3 pb-4 border-b border-slate-100">
                        ⏰ Date et Heure d'Achat
                      </summary>
                      <div className="pt-4">
                        <Field label="Date & Heure d'Achat" name="purchaseDateTime" type="datetime-local" value={formData.purchaseDateTime} onChange={handleChange} />
                      </div>
                    </details>
                    
                    <div className="sm:col-span-2 grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Investissement Initial (Achat)</label>
                          <div className="relative">
                            <input type="number" name="totalCost" value={formData.totalCost} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 px-8 py-5 rounded-[2rem] outline-none focus:border-red-500 font-black text-red-600 text-xl shadow-inner" />
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">DA</span>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Prix de Vente Showroom</label>
                          <div className="relative">
                            <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} className="w-full bg-blue-50 border-2 border-blue-100 px-8 py-5 rounded-[2rem] outline-none focus:border-blue-500 font-black text-blue-600 text-2xl shadow-inner" />
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-blue-300">DA</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </Section>

            </div>

            {/* SECTION 5: CONTRÔLE D'INSPECTION FULL WIDTH */}
            <Section title="Contrôle d'Inspection (Check-In)" icon="🛡️">
              <div className="space-y-8">
                {/* Safety Checklist */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-blue-200">
                    <span className="text-2xl">🛡️</span>
                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest">Contrôle Sécurité</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Template Safety Items */}
                    {Object.entries(formData.safety || {}).map(([key, val]) => (
                      <div key={key} className="relative flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200 group">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input 
                            type="checkbox" 
                            checked={val as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              safety: { ...(formData.safety || {}), [key]: e.target.checked }
                            })}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-700">{key}</span>
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteCustomItem('safety', key);
                          }}
                          className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Custom Safety Item */}
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      placeholder="Add custom safety check..."
                      value={newSafetyItem}
                      onChange={(e) => setNewSafetyItem(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCustomItem('safety', newSafetyItem);
                        }
                      }}
                      className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem('safety', newSafetyItem)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all"
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>

                {/* Equipment Checklist */}
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-green-200">
                    <span className="text-2xl">🧰</span>
                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest">Dotation Bord</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Template Equipment Items */}
                    {Object.entries(formData.equipment || {}).map(([key, val]) => (
                      <div key={key} className="relative flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-200 group">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input 
                            type="checkbox" 
                            checked={val as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              equipment: { ...(formData.equipment || {}), [key]: e.target.checked }
                            })}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-700">{key}</span>
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteCustomItem('equipment', key);
                          }}
                          className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Custom Equipment Item */}
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      placeholder="Add custom equipment check..."
                      value={newEquipmentItem}
                      onChange={(e) => setNewEquipmentItem(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCustomItem('equipment', newEquipmentItem);
                        }
                      }}
                      className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-green-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem('equipment', newEquipmentItem)}
                      className="px-6 py-2 bg-green-600 text-white rounded-2xl font-bold text-sm hover:bg-green-700 transition-all"
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>

                {/* Comfort Checklist */}
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-purple-200">
                    <span className="text-2xl">✨</span>
                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest">État & Ambiance</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Template Comfort Items */}
                    {Object.entries(formData.comfort || {}).map(([key, val]) => (
                      <div key={key} className="relative flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-200 group">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input 
                            type="checkbox" 
                            checked={val as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              comfort: { ...(formData.comfort || {}), [key]: e.target.checked }
                            })}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-700">{key}</span>
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteCustomItem('comfort', key);
                          }}
                          className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Custom Comfort Item */}
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      placeholder="Add custom comfort check..."
                      value={newComfortItem}
                      onChange={(e) => setNewComfortItem(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCustomItem('comfort', newComfortItem);
                        }
                      }}
                      className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem('comfort', newComfortItem)}
                      className="px-6 py-2 bg-purple-600 text-white rounded-2xl font-bold text-sm hover:bg-purple-700 transition-all"
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>
              </div>
            </Section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-12 py-10 bg-white border-t border-slate-50 flex items-center justify-center gap-8 shrink-0">
          <button onClick={onClose} className="px-16 py-5 bg-white border border-slate-100 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50">Annuler</button>
          <button onClick={() => { console.log('Submitting form data:', formData); onSubmit(formData); }} className="custom-gradient-btn px-24 py-5 rounded-[2.5rem] text-white font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Enregistrer le véhicule</button>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-[#fcfcfc] rounded-[3.5rem] p-10 space-y-8 border border-slate-100/50">
     <div className="flex items-center gap-6">
        <div className="h-12 w-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-2xl shadow-sm border border-slate-100">{icon}</div>
        <h4 className="text-xl font-black text-slate-800 tracking-tight">{title}</h4>
     </div>
     <div>{children}</div>
  </div>
);

// --- PURCHASE DETAILS MODAL ---
const PurchaseDetailsModal: React.FC<{ purchase: PurchaseRecord; onClose: () => void; lang: Language }> = ({ purchase, onClose, lang }) => {
  const t = translations[lang];
  console.log('PurchaseDetailsModal received:', purchase);
  const totalCost = purchase.totalCost || purchase.total_cost || 0;
  const sellingPrice = purchase.sellingPrice || purchase.selling_price || 0;
  const supplierName = purchase.supplierName || purchase.supplier_name || 'N/A';
  const createdBy = purchase.created_by || 'N/A';
  const profit = sellingPrice - totalCost;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-3xl rounded-[4rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 max-h-[90vh]">
        
        {/* Header */}
        <div className="px-12 py-10 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {purchase.make} {purchase.model}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Détails Complets de l'Achat</p>
          </div>
          <button onClick={onClose} className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center text-2xl hover:bg-red-50 text-slate-400 transition-all">✕</button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-10 space-y-8">
          
          {/* Creation Info */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-4">📝 Informations d'Enregistrement</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Créé par" value={createdBy} icon="👤" />
              {purchase.created_at && (
                <DetailItem label="Date d'Ajout" value={new Date(purchase.created_at).toLocaleDateString('fr-FR')} icon="📅" />
              )}
            </div>
          </div>
          
          {/* Photos Gallery */}
          {purchase.photo_urls && purchase.photo_urls.length > 0 && (
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-4">📸 Photos du Véhicule</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {purchase.photo_urls.map((photo, idx) => (
                  <img key={idx} src={photo} alt={`Photo ${idx + 1}`} className="w-full h-40 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Information */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">🚗 Informations Véhicule</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Marque" value={purchase.make} />
              <DetailItem label="Modèle" value={purchase.model} />
              <DetailItem label="Année" value={purchase.year} />
              <DetailItem label="Couleur" value={purchase.color} />
              <DetailItem label="Châssis (VIN)" value={purchase.vin} icon="🆔" />
              <DetailItem label="Immatriculation" value={purchase.plate} icon="🔢" />
              <DetailItem label="Carburant" value={purchase.fuel === 'essence' ? 'Essence' : 'Diesel'} />
              <DetailItem label="Transmission" value={purchase.transmission === 'manuelle' ? 'Manuelle' : 'Automatique'} />
              <DetailItem label="Kilométrage" value={`${purchase.mileage.toLocaleString()} KM`} />
              <DetailItem label="Portes" value={purchase.doors.toString()} />
              <DetailItem label="Places" value={purchase.seats.toString()} />
            </div>
          </div>

          {/* Supplier Information */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">🤝 Information Fournisseur</h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-2">Nom du Fournisseur</p>
              <p className="text-lg font-black text-blue-600">{supplierName}</p>
            </div>
          </div>

          {/* Insurance & Technical Information */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">📋 Informations d'Assurance & Technique</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Compagnie Assurance" value={purchase.insuranceCompany || 'N/A'} />
              <DetailItem label="Expiration Assurance" value={purchase.insuranceExpiry ? new Date(purchase.insuranceExpiry).toLocaleDateString('fr-FR') : 'N/A'} icon="📅" />
              <DetailItem label="Contrôle Technique" value={purchase.techControlDate ? new Date(purchase.techControlDate).toLocaleDateString('fr-FR') : 'N/A'} icon="📅" />
            </div>
          </div>

          {/* Purchase Date & Time */}
          {purchase.purchaseDateTime && (
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-4">⏰ Date & Heure d'Achat</h3>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-600 mb-2">Acheté le</p>
                <p className="text-lg font-black text-slate-900">{new Date(purchase.purchaseDateTime).toLocaleDateString('fr-FR')} à {new Date(purchase.purchaseDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          )}

          {/* Financial Information */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">💰 Informations Financières</h3>
            <div className="space-y-4">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Coût d'Achat</p>
                <p className="text-3xl font-black text-red-600">{totalCost.toLocaleString()} <span className="text-sm font-bold text-red-400">{t.currency}</span></p>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Prix de Vente Showroom</p>
                <p className="text-3xl font-black text-blue-600">{sellingPrice.toLocaleString()} <span className="text-sm font-bold text-blue-400">{t.currency}</span></p>
              </div>

              <div className={`p-6 rounded-2xl border-2 ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profit >= 0 ? 'Bénéfice Potentiel' : 'Perte Potentielle'}
                </p>
                <p className={`text-3xl font-black ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(profit).toLocaleString()} <span className="text-sm font-bold opacity-50">{t.currency}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Additional Dates */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">📍 Dates Importantes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem 
                label="Date d'Ajout" 
                value={purchase.dateAdded ? new Date(purchase.dateAdded).toLocaleDateString('fr-FR') : 'N/A'} 
                icon="📅"
              />
            </div>
          </div>

          {/* Inspection Checklists */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">✓ Contrôle de Qualité</h3>
            
            {/* Safety Checklist */}
            {purchase.safety && Object.keys(purchase.safety).length > 0 && (
              <div className="mb-6 bg-orange-50 p-6 rounded-2xl border border-orange-200">
                <p className="text-sm font-black text-orange-700 mb-4">🛡️ Contrôle Sécurité</p>
                <div className="space-y-2">
                  {Object.entries(purchase.safety).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`text-xl font-black ${value ? 'text-green-600' : 'text-red-600'}`}>
                        {value ? '✓' : '✕'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Equipment Checklist */}
            {purchase.equipment && Object.keys(purchase.equipment).length > 0 && (
              <div className="mb-6 bg-blue-50 p-6 rounded-2xl border border-blue-200">
                <p className="text-sm font-black text-blue-700 mb-4">🧰 Dotation Bord</p>
                <div className="space-y-2">
                  {Object.entries(purchase.equipment).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`text-xl font-black ${value ? 'text-green-600' : 'text-red-600'}`}>
                        {value ? '✓' : '✕'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Comfort Checklist */}
            {purchase.comfort && Object.keys(purchase.comfort).length > 0 && (
              <div className="mb-6 bg-purple-50 p-6 rounded-2xl border border-purple-200">
                <p className="text-sm font-black text-purple-700 mb-4">✨ État & Ambiance</p>
                <div className="space-y-2">
                  {Object.entries(purchase.comfort).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`text-xl font-black ${value ? 'text-green-600' : 'text-red-600'}`}>
                        {value ? '✓' : '✕'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No inspections message */}
            {(!purchase.safety || Object.keys(purchase.safety).length === 0) &&
             (!purchase.equipment || Object.keys(purchase.equipment).length === 0) &&
             (!purchase.comfort || Object.keys(purchase.comfort).length === 0) && (
              <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-500">Aucun contrôle enregistré pour ce véhicule</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-10 py-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem: React.FC<{ label: string; value: string; icon?: string }> = ({ label, value, icon }) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {label}
    </p>
    <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
  </div>
);

const Field: React.FC<{ label: string; name: string; value: any; onChange: any; type?: string; placeholder?: string }> = ({ label, name, value, onChange, type = 'text', placeholder }) => (
  <div className="space-y-2">
     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">{label}</label>
     <input 
       type={type} 
       name={name} 
       value={value} 
       onChange={onChange} 
       placeholder={placeholder}
       className="w-full bg-white border-2 border-slate-100 px-8 py-4.5 rounded-[2rem] outline-none focus:border-blue-500 font-bold text-slate-800 shadow-sm transition-all text-lg" 
     />
  </div>
);

interface PrintInvoiceModalProps {
  purchase: PurchaseRecord;
  lang: Language;
  onClose: () => void;
}

const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ purchase, lang, onClose }) => {
  const t = translations[lang];
  const [showroom, setShowroom] = useState<any>(null);
  const [isPersonalizing, setIsPersonalizing] = useState(false);

  useEffect(() => {
    const fetchShowroomConfig = async () => {
      const { data } = await supabase.from('showroom_config').select('*').eq('id', 1).maybeSingle();
      setShowroom(data);
    };
    fetchShowroomConfig();
  }, []);

  const handlePrintNow = () => {
    if (!showroom) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture d'Achat - ${purchase.id?.slice(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { font-family: system-ui, -apple-system, sans-serif; background: white; }
          .invoice-container { max-width: 210mm; margin: 0 auto; padding: 12mm; background: white; }
          .header { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
          .logo { flex-shrink: 0; }
          .logo img { height: 60px; width: 60px; object-fit: contain; }
          .header-info { flex: 1; }
          .header-info h1 { font-size: 24px; font-weight: bold; color: #1f2937; margin: 0; }
          .header-info p { font-size: 11px; color: #666; margin: 3px 0 0 0; }
          .header-right { text-align: right; }
          .title { font-size: 9px; color: #999; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
          .document-id { font-size: 14px; font-weight: bold; color: #1f2937; margin: 5px 0 0 0; }
          .section { margin-bottom: 12px; }
          .section-title { font-size: 13px; font-weight: bold; color: #1f2937; margin-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 10px; }
          .info-item { }
          .info-item-label { font-size: 8px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px; }
          .info-item-value { font-size: 12px; font-weight: bold; color: #1f2937; }
          .checklist { margin-bottom: 10px; padding: 8px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; }
          .checklist-title { font-size: 11px; font-weight: bold; color: #d97706; margin-bottom: 6px; }
          .checklist-items { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
          .checklist-item { display: flex; align-items: center; gap: 5px; }
          .checklist-check { font-size: 12px; font-weight: bold; }
          .check-yes { color: #16a34a; }
          .check-no { color: #dc2626; }
          .checklist-item-text { font-size: 10px; color: #1f2937; }
          .financial { margin-bottom: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
          .financial-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .financial-label { font-size: 11px; color: #666; }
          .financial-value { font-size: 14px; font-weight: bold; }
          .cost-value { color: #dc2626; }
          .signature-section { display: flex; gap: 40px; margin-top: 20px; }
          .signature-box { flex: 1; }
          .signature-label { font-size: 9px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; }
          .signature-line { border-top: 1px solid #1f2937; padding-top: 3px; font-size: 9px; color: #1f2937; font-weight: bold; }
          .cachet-box { flex: 1; text-align: center; }
          .cachet-label { font-size: 9px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; }
          .cachet-space { width: 80px; height: 50px; border: 2px dashed #d1d5db; border-radius: 6px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 10px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #999; }
          @media print {
            body > * { display: none !important; }
            #invoice-print { display: block !important; }
            .invoice-container { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container" id="invoice-print">
          <div class="header">
            ${showroom?.logo_data ? `
              <div class="logo">
                <img src="${showroom.logo_data}" alt="Logo" />
              </div>
            ` : ''}
            <div class="header-info">
              <h1>${showroom?.name || 'SHOWROOM'}</h1>
              <p>${showroom?.slogan || ''}</p>
            </div>
            <div class="header-right">
              <p class="title">FACTURE D'ACHAT</p>
              <p class="document-id">#${purchase.id?.slice(0, 8).toUpperCase() || 'N/A'}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🚗 Informations Véhicule</div>
            <div class="info-grid">
              <div class="info-item">
                <p class="info-item-label">Marque & Modèle</p>
                <p class="info-item-value">${purchase.make} ${purchase.model}</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">Année</p>
                <p class="info-item-value">${purchase.year}</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">Immatriculation</p>
                <p class="info-item-value">${purchase.plate || '-'}</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">VIN</p>
                <p class="info-item-value">${purchase.vin || '-'}</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">Carburant</p>
                <p class="info-item-value">${purchase.fuel || '-'}</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">Transmission</p>
                <p class="info-item-value">${purchase.transmission || '-'}</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">Kilométrage</p>
                <p class="info-item-value">${purchase.mileage?.toLocaleString() || '-'} KM</p>
              </div>
              <div class="info-item">
                <p class="info-item-label">Couleur</p>
                <p class="info-item-value">${purchase.color || '-'}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🤝 Fournisseur</div>
            <p style="font-size: 14px; font-weight: bold; color: #1f2937; margin: 0;">${purchase.supplierName}</p>
          </div>

          ${(Object.keys(purchase.safety || {}).length > 0 ||
              Object.keys(purchase.equipment || {}).length > 0 ||
              Object.keys(purchase.comfort || {}).length > 0) ? `
            <div class="section">
              <div class="section-title">✓ Contrôle de Qualité</div>
              ${Object.keys(purchase.safety || {}).length > 0 ? `
                <div class="checklist">
                  <div class="checklist-title">🛡️ Contrôle Sécurité</div>
                  <div class="checklist-items">
                    ${Object.entries(purchase.safety).map(([key, value]) => `
                      <div class="checklist-item">
                        <span class="checklist-check ${value ? 'check-yes' : 'check-no'}">${value ? '✓' : '✕'}</span>
                        <span class="checklist-item-text">${key}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${Object.keys(purchase.equipment || {}).length > 0 ? `
                <div class="checklist" style="background: #dbeafe; border-color: #93c5fd;">
                  <div class="checklist-title" style="color: #1e40af;">🧰 Dotation Bord</div>
                  <div class="checklist-items">
                    ${Object.entries(purchase.equipment).map(([key, value]) => `
                      <div class="checklist-item">
                        <span class="checklist-check ${value ? 'check-yes' : 'check-no'}">${value ? '✓' : '✕'}</span>
                        <span class="checklist-item-text">${key}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${Object.keys(purchase.comfort || {}).length > 0 ? `
                <div class="checklist" style="background: #f3e8ff; border-color: #e9d5ff;">
                  <div class="checklist-title" style="color: #7e22ce;">✨ État & Ambiance</div>
                  <div class="checklist-items">
                    ${Object.entries(purchase.comfort).map(([key, value]) => `
                      <div class="checklist-item">
                        <span class="checklist-check ${value ? 'check-yes' : 'check-no'}">${value ? '✓' : '✕'}</span>
                        <span class="checklist-item-text">${key}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div class="financial">
            <div class="section-title">💰 Coût d'Achat</div>
            <div class="financial-row">
              <span class="financial-label">Montant Total:</span>
              <span class="financial-value cost-value">${purchase.totalCost?.toLocaleString() || '0'} ${t.currency}</span>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-label">Signature</div>
              <div class="signature-line"></div>
            </div>
            <div class="cachet-box">
              <div class="cachet-label">Cachet/Sceau</div>
              <div class="cachet-space">Cachet</div>
            </div>
          </div>

          <div class="footer">
            <p>Facture générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p>${showroom?.address || ''}</p>
          </div>
        </div>

        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 100);
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      onClose();
    }
  };

  const handlePersonalize = () => {
    setIsPersonalizing(true);
  };

  const handleEditorPrint = (elements: any) => {
    window.print();
    setTimeout(() => onClose(), 1000);
  };

  if (isPersonalizing && showroom) {
    return (
      <InvoiceEditor
        purchase={purchase}
        lang={lang}
        showroom={showroom}
        onPrint={handleEditorPrint}
        onCancel={() => setIsPersonalizing(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Aperçu de la Facture</h2>
            <p className="text-sm text-slate-500">Vérifiez les détails avant d'imprimer</p>
          </div>
          
          {showroom && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-4 mb-4">
                {showroom?.logo_data && (
                  <img src={showroom.logo_data} alt="Logo" className="h-16 w-16 object-contain" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{showroom?.name}</h3>
                  <p className="text-sm text-slate-600">{showroom?.slogan}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase">FACTURE D'ACHAT #{purchase.id?.slice(0, 8)}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-8 py-4 rounded-lg bg-slate-200 text-slate-900 font-bold text-sm uppercase tracking-wider hover:bg-slate-300 transition"
          >
            ✕ Annuler
          </button>
          <button
            onClick={handlePersonalize}
            className="px-8 py-4 rounded-lg bg-blue-500 text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-600 transition"
          >
            ✏️ Personnaliser
          </button>
          <button
            onClick={handlePrintNow}
            className="px-8 py-4 rounded-lg bg-green-500 text-white font-bold text-sm uppercase tracking-wider hover:bg-green-600 transition shadow-lg"
          >
            ✓ Imprimer Maintenant
          </button>
        </div>
      </div>
    </div>
  );
  };
