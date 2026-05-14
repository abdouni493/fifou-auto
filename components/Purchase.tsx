
import React, { useState, useEffect } from 'react';
import { PurchaseRecord, Language, Supplier, Client } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { getCreatedByValue, uploadImagesToBucket } from '../utils';
import { InvoiceEditor } from './InvoiceEditor';
import { ClientForm } from './Clients';

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
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');


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
        .select(`
          *,
          supplier:suppliers(name, photo_url),
          client:clients(first_name, last_name, mobile1, photo_url)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      console.log('Raw database purchases:', data);
      
      // Normalize database fields to camelCase for component compatibility
      const normalizedData = (data || []).map((p: any) => {
        const normalized = {
          id: p.id,
          supplierId: p.supplier_id,
          supplierName: p.supplier_name || p.supplier?.name || '',
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
          photo_urls: p.photo_urls || p.photos || [],
          totalCost: p.total_cost,
          sellingPrice: p.selling_price,
          dateAdded: p.created_at,
          purchaseDateTime: p.purchase_date_time,
          created_at: p.created_at,
          is_sold: p.is_sold,
          created_by: p.created_by,
          safety: p.safety_checklist || {},
          equipment: p.equipment_checklist || {},
          comfort: p.comfort_checklist || {},
          clientId: p.client_id,
          clientName: p.client_name || (p.client ? `${p.client.first_name} ${p.client.last_name}` : ''),
          clientPhone: p.client_phone || p.client?.mobile1 || '',
          initialClientPrice: p.initial_client_price,
          carNotes: p.car_notes || '',
          carInfo: p.car_info || '',
          supplier: p.supplier,
          client: p.client
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
        comfort_checklist: data.comfort || {},
        client_id: data.clientId || null,
        client_name: data.clientName || '',
        client_phone: data.clientPhone || '',
        initial_client_price: parseFloat(data.initialClientPrice) || 0,
        car_notes: data.carNotes || '',
        car_info: data.carInfo || ''
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
      <div className="h-16 w-16 border-[6px] border-red-600/20 border-t-red-600 rounded-full animate-spin mb-8"></div>
      <p className="font-black text-red-400 uppercase tracking-[0.4em] text-[10px]">Ouverture du registre des achats...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen">
      {/* Premium background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-slate-950 to-black pointer-events-none -z-20"></div>
      
      {/* Ambient background blobs with enhanced opacity */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-800 rounded-full blur-[150px] opacity-[0.08] animate-blob pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-700 rounded-full blur-[140px] opacity-[0.07] animate-blob pointer-events-none -z-10" style={{animationDelay:'2s'}}></div>
      <div className="fixed top-1/2 left-1/3 w-[400px] h-[400px] bg-red-900 rounded-full blur-[130px] opacity-[0.05] animate-blob pointer-events-none -z-10" style={{animationDelay:'4s'}}></div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none -z-10"></div>
      
      {/* Radial gradient accent */}
      <div className="fixed inset-0 bg-gradient-radial from-red-600/5 via-transparent to-transparent pointer-events-none -z-10"></div>

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              🏷️ {t.purchase.title}
            </h1>
            <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
              Mise à jour du Stock Showroom • {purchases.length} Achats
            </p>
          </div>
          
          <button 
            onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
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
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Ajouter Achat</span>
            </div>
          </button>
        </div>
      </div>

      {/* FILTERING & SEARCH SECTION */}
      <div className="bg-red-950/20 backdrop-blur-md rounded-[2.5rem] p-8 border border-red-600/20 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Search Bar */}
          <div className="lg:col-span-2 relative group">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-40 group-focus-within:opacity-100 transition-opacity">🔍</span>
            <input 
              type="text" 
              placeholder="Rechercher par Marque, Modèle ou VIN..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-red-600/5 border border-red-600/20 pl-16 pr-8 py-5 rounded-2xl outline-none focus:border-red-600/50 focus:bg-red-600/10 font-bold text-red-100 placeholder:text-red-900/40 transition-all text-lg shadow-inner"
            />
          </div>

          {/* Supplier Filter */}
          <div className="relative group">
            <select 
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full bg-red-600/5 border border-red-600/20 px-8 py-5 rounded-2xl outline-none focus:border-red-600/50 focus:bg-red-600/10 font-bold text-red-100 appearance-none transition-all text-lg shadow-inner cursor-pointer"
            >
              <option value="all" className="bg-slate-950">Tous les Fournisseurs</option>
              {Array.from(new Set(purchases.filter(p => p.supplierName).map(p => p.supplierName))).map(name => (
                <option key={name} value={name} className="bg-slate-950">{name}</option>
              ))}
            </select>
            <span className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within:opacity-100">▼</span>
          </div>

          {/* Client Source Filter */}
          <div className="relative group">
            <select 
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full bg-red-600/5 border border-red-600/20 px-8 py-5 rounded-2xl outline-none focus:border-red-600/50 focus:bg-red-600/10 font-bold text-red-100 appearance-none transition-all text-lg shadow-inner cursor-pointer"
            >
              <option value="all" className="bg-slate-950">Toutes les Sources Clients</option>
              {Array.from(new Set(purchases.filter(p => p.clientName).map(p => p.clientName))).map(name => (
                <option key={name} value={name} className="bg-slate-950">{name}</option>
              ))}
            </select>
            <span className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within:opacity-100">▼</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-red-600/10">
          <div className="flex items-center gap-6">
            {/* Status Tabs */}
            <div className="flex p-1 bg-red-900/20 rounded-xl border border-red-600/20">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/50 hover:text-red-400'}`}
              >
                Tout
              </button>
              <button 
                onClick={() => setStatusFilter('available')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'available' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/50 hover:text-red-400'}`}
              >
                Disponible
              </button>
              <button 
                onClick={() => setStatusFilter('sold')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'sold' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/50 hover:text-red-400'}`}
              >
                Vendu
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-red-400/50 uppercase tracking-widest">Trier par:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-[10px] font-black text-red-200 uppercase tracking-widest outline-none cursor-pointer hover:text-red-400 transition-colors"
              >
                <option value="newest" className="bg-slate-950">Plus Récents</option>
                <option value="oldest" className="bg-slate-950">Plus Anciens</option>
                <option value="price-asc" className="bg-slate-950">Prix Croissant</option>
                <option value="price-desc" className="bg-slate-950">Prix Décroissant</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => {
              setSearchTerm('');
              setSupplierFilter('all');
              setClientFilter('all');
              setStatusFilter('all');
              setSortBy('newest');
            }}
            className="text-[10px] font-black text-red-400/70 uppercase tracking-widest hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <span>🔄</span> Réinitialiser Filtres
          </button>
        </div>
      </div>


      {/* PURCHASE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {purchases
          .filter(p => {
            const matchesSearch = 
              p.make.toLowerCase().includes(searchTerm.toLowerCase()) || 
              p.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
              p.vin.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesSupplier = supplierFilter === 'all' || p.supplierName === supplierFilter;
            const matchesClient = clientFilter === 'all' || p.clientName === clientFilter;
            const matchesStatus = 
              statusFilter === 'all' || 
              (statusFilter === 'available' && !p.is_sold) || 
              (statusFilter === 'sold' && p.is_sold);
            
            return matchesSearch && matchesSupplier && matchesClient && matchesStatus;
          })
          .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'price-asc') return (a.sellingPrice || a.selling_price) - (b.sellingPrice || b.selling_price);
            if (sortBy === 'price-desc') return (b.sellingPrice || b.selling_price) - (a.sellingPrice || a.selling_price);
            return 0;
          })
          .map((p, idx) => (

          <div 
            key={p.id} 
            className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group relative"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Image Container */}
            <div className="h-48 overflow-hidden relative bg-gradient-to-br from-red-900/50 to-black">
              <img 
                src={p.photo_urls?.[0] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000'} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                alt={p.model} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              
              {/* Year Badge */}
              <div className="absolute top-4 right-4 bg-red-600/50 backdrop-blur-md px-4 py-2 rounded-lg border border-red-600/60">
                <span className="text-xs font-black text-red-100 uppercase">{p.year}</span>
              </div>
              
              {/* Supplier/Client Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="h-9 w-9 rounded-full border-2 border-red-600/40 shadow-lg overflow-hidden bg-red-600/30 backdrop-blur-md flex items-center justify-center text-sm">
                  {(p as any).supplier?.photo_url || (p as any).client?.photo_url ? (
                    <img 
                      src={(p as any).supplier?.photo_url || (p as any).client?.photo_url} 
                      className="w-full h-full object-cover" 
                      alt="partner"
                    />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <div className="bg-red-600/30 backdrop-blur-md px-3 py-1 rounded-lg border border-red-600/40">
                  <p className="text-[8px] font-black text-red-100 uppercase tracking-widest truncate max-w-[100px]">
                    {p.supplierName || p.clientName || '---'}
                  </p>
                </div>
              </div>
              
              {/* Fuel & Transmission Badge */}
              <div className="absolute bottom-4 left-4 bg-red-600/30 backdrop-blur-md px-3 py-1 rounded-lg border border-red-600/40">
                <span className="text-[8px] font-black text-red-100 uppercase tracking-widest">{p.fuel} • {p.transmission}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-grow space-y-4">
              {/* Make & Model */}
              <div>
                <h3 className="text-2xl font-black text-red-100 leading-tight">{p.make}</h3>
                <p className="text-sm font-black text-red-400/70">{p.model}</p>
              </div>

              {/* Created By */}
              {p.created_by && (
                <p className="text-[10px] font-black text-red-400/50 uppercase">👤 Créé par: {p.created_by}</p>
              )}

              {/* Price Card */}
              <div className="bg-red-600/20 p-4 rounded-[1.5rem] border border-red-600/30">
                <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-1">Prix de Vente</p>
                <p className="text-2xl font-black text-red-200 tracking-tighter">
                  {(p.sellingPrice || p.selling_price)?.toLocaleString()} <span className="text-xs font-bold opacity-40">{t.currency}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-4 border-t border-red-600/20 flex-wrap">
                <button 
                  onClick={() => setDetailsRecord(p)} 
                  className="flex-1 min-w-[70px] relative group overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                    <span className="transition-all duration-300 group-hover:scale-125">👁️</span>
                    <span>Voir</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => { setPrintRecord(p); setShowPrintModal(true); }}
                  className="flex-1 min-w-[70px] relative group overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                    <span className="transition-all duration-300 group-hover:scale-125">🖨️</span>
                    <span>Imprimer</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => { setEditingRecord(p); setIsFormOpen(true); }} 
                  className="flex-1 min-w-[70px] relative group overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-1 text-white">
                    <span className="transition-all duration-300 group-hover:scale-125">✏️</span>
                    <span>Modifier</span>
                  </div>
                </button>
                
                <button 
                  onClick={async () => { if(confirm(t.purchase.confirmDelete)) { await supabase.from('purchases').delete().eq('id', p.id); fetchPurchases(); } }} 
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
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'supplier' | 'client'>(initialData?.clientId ? 'client' : 'supplier');
  const [clientSearch, setClientSearch] = useState('');
  const [formData, setFormData] = useState<Partial<PurchaseRecord>>(initialData || {
    supplierId: '', supplierName: '', clientId: '', clientName: '', clientPhone: '',
    make: '', model: '', year: new Date().getFullYear().toString(),
    color: '', vin: '', fuel: 'essence', transmission: 'manuelle', seats: 5, doors: 5, mileage: 0,
    insuranceExpiry: '', techControlDate: '', insuranceCompany: '', photo_urls: [], 
    totalCost: 0, sellingPrice: 0, initialClientPrice: 0, carNotes: '', carInfo: '',
    purchaseDateTime: new Date().toISOString().slice(0, 16),
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
    fetchSuppliers();
    fetchClients();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('first_name');
    setClients(data || []);
  };

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl shadow-red-600/40 border border-red-600/40 flex flex-col animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 md:px-8 py-8 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 shrink-0 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-full bg-red-600/30 text-red-300 flex items-center justify-center text-2xl border border-red-600/40">🛒</div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">{initialData ? "Modifier l'Achat" : "Nouvel Achat Véhicule"}</h2>
              <p className="text-xs font-black text-red-400/70 uppercase tracking-widest mt-1">Acquisition Showroom</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="relative z-10 text-white">✕</div>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 md:px-8 pb-8">
          <div className="flex flex-col lg:flex-row gap-8 py-8">
            
            {/* Left Column - Photos & Basic Source */}
            <div className="lg:w-1/3 flex flex-col space-y-8">
              <Section title="Média & Visuels" icon="📸">
                 <div className="grid grid-cols-2 gap-4">
                    {formData.photo_urls?.map((p, i) => (
                      <div key={i} className="h-32 rounded-2xl border border-red-600/30 shadow-xl overflow-hidden group/img relative">
                         <img src={p} className="w-full h-full object-cover" />
                         <button onClick={() => setFormData({...formData, photo_urls: formData.photo_urls?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 h-6 w-6 bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-xs">✕</button>
                      </div>
                    ))}
                    <label className="h-32 rounded-2xl border-2 border-dashed border-red-600/30 flex flex-col items-center justify-center cursor-pointer hover:bg-red-600/10 transition-all text-red-400">
                       <input type="file" multiple className="hidden" onChange={handlePhotos} />
                       <span className="text-3xl">➕</span>
                       <span className="text-[10px] font-black uppercase mt-2">Ajouter Photo</span>
                    </label>
                 </div>
              </Section>

              <Section title="Origine du Véhicule" icon="🤝">
                 <div className="space-y-4">
                    <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-red-600/30">
                       <button 
                         type="button" 
                         onClick={() => setPurchaseType('supplier')} 
                         className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${purchaseType === 'supplier' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/70 hover:text-red-300'}`}
                       >
                          <span>🏢</span> Fournisseur
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setPurchaseType('client')} 
                         className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${purchaseType === 'client' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/70 hover:text-red-300'}`}
                       >
                          <span>👤</span> Client
                       </button>
                    </div>

                    {purchaseType === 'supplier' ? (
                      <div className="space-y-2">
                         <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Partenaire Fournisseur</label>
                         <select 
                           name="supplierId" 
                           value={formData.supplierId} 
                           onChange={handleSupplierChange}
                           className="w-full bg-slate-900/30 border border-red-600/30 px-4 py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 font-black text-red-200 text-sm"
                         >
                           <option value="" className="bg-slate-900">Sélectionner un fournisseur...</option>
                           {suppliers.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
                         </select>
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <div className="flex items-center justify-between px-2">
                           <label className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Rechercher Client</label>
                           <button 
                             type="button" 
                             onClick={() => setIsClientModalOpen(true)}
                             className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                           >
                             + Nouveau
                           </button>
                         </div>
                         <div className="relative group/search">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40">🔍</span>
                           <input 
                             type="text" 
                             placeholder="Nom ou téléphone..." 
                             value={clientSearch}
                             onChange={(e) => setClientSearch(e.target.value)}
                             className="w-full bg-slate-900/30 border border-red-600/30 pl-12 pr-4 py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 font-black text-red-200 text-sm"
                           />
                           {clientSearch && (
                             <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-red-600/40 rounded-2xl shadow-2xl z-[150] max-h-60 overflow-y-auto custom-scrollbar p-2">
                               {clients.filter(c => 
                                 `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                 c.mobile1.includes(clientSearch)
                               ).map(c => (
                                 <button 
                                   key={c.id} 
                                   type="button"
                                   onClick={() => {
                                     setFormData({
                                       ...formData, 
                                       clientId: c.id, 
                                       clientName: `${c.first_name} ${c.last_name}`,
                                       clientPhone: c.mobile1,
                                       supplierId: '',
                                       supplierName: ''
                                     });
                                     setClientSearch(`${c.first_name} ${c.last_name}`);
                                   }}
                                   className="w-full text-left px-4 py-3 hover:bg-red-600/20 rounded-xl flex items-center gap-3 transition-colors border border-transparent hover:border-red-600/30"
                                 >
                                   <div className="h-8 w-8 rounded-full bg-red-600/20 flex items-center justify-center text-sm border border-red-600/30">
                                     {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover rounded-full" /> : '👤'}
                                   </div>
                                   <div>
                                     <p className="font-black text-red-100 text-xs">{c.first_name} {c.last_name}</p>
                                     <p className="text-[9px] font-bold text-red-400/60">{c.mobile1}</p>
                                   </div>
                                 </button>
                               ))}
                             </div>
                           )}
                         </div>
                         {formData.clientId && (
                           <div className="bg-emerald-600/10 border border-emerald-600/30 p-3 rounded-xl flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <span className="text-emerald-500">✅</span>
                               <div>
                                 <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Client Sélectionné</p>
                                 <p className="font-black text-emerald-200 text-xs">{formData.clientName}</p>
                               </div>
                             </div>
                             <button type="button" onClick={() => setFormData({...formData, clientId: '', clientName: '', clientPhone: ''})} className="text-emerald-400 hover:text-red-500">✕</button>
                           </div>
                         )}
                      </div>
                    )}
                 </div>
              </Section>
            </div>

            {/* Right Column - Fiche Technique & Administration */}
            <div className="lg:w-2/3 space-y-8">
              <Section title="Informations Véhicule" icon="🚗">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Marque" name="make" value={formData.make} onChange={handleChange} placeholder="ex: Mercedes-Benz" emoji="🏷️" />
                    <Field label="Modèle" name="model" value={formData.model} onChange={handleChange} placeholder="ex: S-Class" emoji="🚗" />
                    <Field label="Immatriculation" name="plate" value={formData.plate} onChange={handleChange} placeholder="ex: 12345-123-16" emoji="🔢" />
                    <Field label="Année" name="year" value={formData.year} onChange={handleChange} placeholder="2026" emoji="📅" />
                    <Field label="Couleur" name="color" value={formData.color} onChange={handleChange} placeholder="ex: Obsidian Black" emoji="🎨" />
                    <Field label="Châssis (VIN)" name="vin" value={formData.vin} onChange={handleChange} emoji="🔐" />
                    
                    <div className="space-y-2">
                       <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Boîte de Vitesse</label>
                       <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-red-600/30">
                          {['Manuelle', 'Automatique'].map(t => (
                            <button key={t} type="button" onClick={() => setFormData({...formData, transmission: (t === 'Automatique' ? 'auto' : t.toLowerCase()) as any})} className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.transmission === (t === 'Automatique' ? 'auto' : t.toLowerCase()) ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/70 hover:text-red-300'}`}>
                               {t}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Énergie</label>
                       <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-red-600/30">
                          {['Essence', 'Diesel'].map(e => (
                            <button key={e} type="button" onClick={() => setFormData({...formData, fuel: e.toLowerCase() as any})} className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.fuel === e.toLowerCase() ? 'bg-red-600 text-white shadow-lg' : 'text-red-400/70 hover:text-red-300'}`}>
                               {e}
                            </button>
                          ))}
                       </div>
                    </div>
                    <Field label="Places" name="seats" type="number" value={formData.seats} onChange={handleChange} emoji="👥" />
                    <Field label="Portes" name="doors" type="number" value={formData.doors} onChange={handleChange} emoji="🚪" />
                    <div className="md:col-span-2">
                      <Field label="Kilométrage" name="mileage" type="number" value={formData.mileage} onChange={handleChange} placeholder="0" emoji="📊" />
                    </div>
                 </div>
              </Section>

              <Section title="Administration & Prix" icon="💰">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <TextAreaField 
                         label="Informations supplémentaires" 
                         name="carInfo" 
                         value={formData.carInfo} 
                         onChange={(e: any) => setFormData({...formData, carInfo: e.target.value})}
                         placeholder="Carrosserie, accidents, état général..."
                         emoji="ℹ️"
                         minHeight="80px"
                       />
                    </div>
                    <div className="md:col-span-2">
                       <TextAreaField 
                         label="Notes internes" 
                         name="carNotes" 
                         value={formData.carNotes} 
                         onChange={(e: any) => setFormData({...formData, carNotes: e.target.value})}
                         placeholder="Notes confidentielles..."
                         emoji="📝"
                         minHeight="80px"
                       />
                    </div>
                    <div className="md:col-span-2">
                       <Field label="Date & Heure d'Achat" name="purchaseDateTime" type="datetime-local" value={formData.purchaseDateTime} onChange={handleChange} emoji="⏰" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Prix Initial Client</label>
                      <div className="relative">
                        <input type="number" name="initialClientPrice" value={formData.initialClientPrice} onChange={handleChange} className="w-full bg-slate-900/30 border border-red-600/30 px-4 py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-amber-500 font-black text-amber-500 text-sm" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500/50">DA</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Coût Total Achat</label>
                      <div className="relative">
                        <input type="number" name="totalCost" value={formData.totalCost} onChange={handleChange} className="w-full bg-slate-900/30 border border-red-600/30 px-4 py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 font-black text-red-400 text-sm" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-400/50">DA</span>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Prix de Vente Showroom</label>
                      <div className="relative">
                        <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} className="w-full bg-emerald-600/10 border border-emerald-600/30 px-4 py-4 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-400 text-lg shadow-inner" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400/50">DA</span>
                      </div>
                    </div>
                 </div>
              </Section>
            </div>
          </div>

          {/* Inspection Section - Full Width */}
          <div className="py-8">
            <Section title="Contrôle d'Inspection (Check-In)" icon="🛡️">
              <div className="space-y-8">
                {/* Safety Checklist */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-red-600/20">
                    <span className="text-xl">🛡️</span>
                    <h5 className="text-sm font-black text-red-100 uppercase tracking-widest">Sécurité</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(formData.safety || {}).map(([key, val]) => (
                      <div key={key} className="relative flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-red-600/20 group hover:border-red-600/40 transition-all">
                        <input 
                          type="checkbox" 
                          checked={val as boolean}
                          onChange={(e) => setFormData({
                            ...formData,
                            safety: { ...(formData.safety || {}), [key]: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-red-600/40 text-red-600 focus:ring-red-500 bg-slate-900"
                        />
                        <span className="text-[11px] font-black text-red-200 truncate">{key}</span>
                        <button type="button" onClick={() => deleteCustomItem('safety', key)} className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all shadow-lg">✕</button>
                      </div>
                    ))}
                    <div className="relative group/add flex items-center h-[46px]">
                      <input
                        type="text"
                        placeholder="Nouveau..."
                        value={newSafetyItem}
                        onChange={(e) => setNewSafetyItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('safety', newSafetyItem)}
                        className="w-full h-full bg-slate-900/30 border border-dashed border-red-600/40 rounded-xl px-3 pr-10 text-[11px] font-black text-red-200 outline-none focus:border-red-600/60"
                      />
                      <button onClick={() => addCustomItem('safety', newSafetyItem)} className="absolute right-2 text-red-500 hover:text-red-300">➕</button>
                    </div>
                  </div>
                </div>

                {/* Equipment Checklist */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-red-600/20">
                    <span className="text-xl">🧰</span>
                    <h5 className="text-sm font-black text-red-100 uppercase tracking-widest">Équipements</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(formData.equipment || {}).map(([key, val]) => (
                      <div key={key} className="relative flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-red-600/20 group hover:border-red-600/40 transition-all">
                        <input 
                          type="checkbox" 
                          checked={val as boolean}
                          onChange={(e) => setFormData({
                            ...formData,
                            equipment: { ...(formData.equipment || {}), [key]: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-red-600/40 text-red-600 focus:ring-red-500 bg-slate-900"
                        />
                        <span className="text-[11px] font-black text-red-200 truncate">{key}</span>
                        <button type="button" onClick={() => deleteCustomItem('equipment', key)} className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all shadow-lg">✕</button>
                      </div>
                    ))}
                    <div className="relative group/add flex items-center h-[46px]">
                      <input
                        type="text"
                        placeholder="Nouveau..."
                        value={newEquipmentItem}
                        onChange={(e) => setNewEquipmentItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('equipment', newEquipmentItem)}
                        className="w-full h-full bg-slate-900/30 border border-dashed border-red-600/40 rounded-xl px-3 pr-10 text-[11px] font-black text-red-200 outline-none focus:border-red-600/60"
                      />
                      <button onClick={() => addCustomItem('equipment', newEquipmentItem)} className="absolute right-2 text-red-500 hover:text-red-300">➕</button>
                    </div>
                  </div>
                </div>

                {/* Comfort Checklist */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-red-600/20">
                    <span className="text-xl">✨</span>
                    <h5 className="text-sm font-black text-red-100 uppercase tracking-widest">Confort & État</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(formData.comfort || {}).map(([key, val]) => (
                      <div key={key} className="relative flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-red-600/20 group hover:border-red-600/40 transition-all">
                        <input 
                          type="checkbox" 
                          checked={val as boolean}
                          onChange={(e) => setFormData({
                            ...formData,
                            comfort: { ...(formData.comfort || {}), [key]: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-red-600/40 text-red-600 focus:ring-red-500 bg-slate-900"
                        />
                        <span className="text-[11px] font-black text-red-200 truncate">{key}</span>
                        <button type="button" onClick={() => deleteCustomItem('comfort', key)} className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all shadow-lg">✕</button>
                      </div>
                    ))}
                    <div className="relative group/add flex items-center h-[46px]">
                      <input
                        type="text"
                        placeholder="Nouveau..."
                        value={newComfortItem}
                        onChange={(e) => setNewComfortItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('comfort', newComfortItem)}
                        className="w-full h-full bg-slate-900/30 border border-dashed border-red-600/40 rounded-xl px-3 pr-10 text-[11px] font-black text-red-200 outline-none focus:border-red-600/60"
                      />
                      <button onClick={() => addCustomItem('comfort', newComfortItem)} className="absolute right-2 text-red-500 hover:text-red-300">➕</button>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 bg-slate-900/50 border-t border-red-600/40 flex justify-end gap-4 shrink-0">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-xl hover:bg-slate-900/70 transition-all uppercase tracking-wider text-[10px]"
          >
            Annuler
          </button>
          <button 
            onClick={() => onSubmit(formData)}
            className="group relative px-12 py-3 rounded-xl overflow-hidden font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-2xl shadow-red-600/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <div className="relative z-10 flex items-center justify-center gap-2 text-white">
              <span>{initialData ? 'Mettre à jour l\'Achat' : 'Confirmer l\'Achat'}</span>
            </div>
          </button>
        </div>

        {isClientModalOpen && (
          <ClientForm 
            lang={lang} 
            onClose={() => setIsClientModalOpen(false)} 
            onSubmit={async (newClientData) => {
              try {
                const { data, error } = await supabase.from('clients').insert([newClientData]).select();
                if (error) throw error;
                if (data && data[0]) {
                  await fetchClients();
                  setFormData({
                    ...formData,
                    clientId: data[0].id,
                    clientName: `${data[0].first_name} ${data[0].last_name}`,
                    clientPhone: data[0].mobile1,
                    supplierId: '',
                    supplierName: ''
                  });
                  setClientSearch(`${data[0].first_name} ${data[0].last_name}`);
                }
                setIsClientModalOpen(false);
              } catch (err: any) {
                alert(`Erreur lors de la création du client: ${err.message}`);
              }
            }} 
          />
        )}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-red-600/10 rounded-[2rem] p-6 space-y-6 border border-red-600/30">
    <div className="flex items-center gap-4">
       <div className="h-10 w-10 rounded-lg bg-red-600/30 text-red-300 flex items-center justify-center text-lg border border-red-600/30">{icon}</div>
       <h4 className="text-lg font-black text-red-200 tracking-tight">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

// --- PURCHASE DETAILS MODAL ---
const PurchaseDetailsModal: React.FC<{ purchase: PurchaseRecord; onClose: () => void; lang: Language }> = ({ purchase, onClose, lang }) => {
  const t = translations[lang];
  const totalCost = purchase.totalCost || 0;
  const sellingPrice = purchase.sellingPrice || 0;
  const initialClientPrice = purchase.initialClientPrice || 0;
  const supplierName = purchase.supplierName || 'N/A';
  const clientName = purchase.clientName || 'N/A';
  const createdBy = purchase.created_by || 'N/A';
  const profit = sellingPrice - totalCost;
  const partnerPhoto = (purchase as any).supplier?.photo_url || (purchase as any).client?.photo_url;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl shadow-red-600/40 border border-red-600/40 flex flex-col animate-in zoom-in-95 max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-8 py-8 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-full bg-red-600/30 text-red-300 flex items-center justify-center text-2xl border border-red-600/40">🛒</div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">
                {purchase.make} {purchase.model}
              </h2>
              <p className="text-xs font-black text-red-400/70 uppercase tracking-widest mt-1">Détails de l'Achat</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="relative z-10 text-white">✕</div>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar px-8 py-8 space-y-8 bg-slate-950/20 backdrop-blur-md">
          
          {/* Photos Gallery */}
          {purchase.photo_urls && purchase.photo_urls.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {purchase.photo_urls.map((photo, idx) => (
                <div key={idx} className="h-48 w-72 shrink-0 rounded-[2rem] border-2 border-red-600/30 shadow-xl overflow-hidden">
                  <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Info & Partner */}
            <div className="space-y-8">
              <Section title="Informations Partenaire" icon="🤝">
                <div className="bg-red-600/10 p-6 rounded-2xl border border-red-600/20 flex items-center gap-6">
                  <div className="h-20 w-20 rounded-2xl bg-slate-900 border border-red-600/30 shadow-lg overflow-hidden flex items-center justify-center shrink-0">
                    {partnerPhoto ? (
                      <img src={partnerPhoto} className="w-full h-full object-cover" alt="Partner" />
                    ) : (
                      <span className="text-3xl opacity-40">👤</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-red-400/60 uppercase tracking-widest mb-1">
                      {purchase.clientId ? 'Client Showroom' : 'Fournisseur'}
                    </p>
                    <h3 className="text-xl font-black text-red-200 tracking-tight">
                      {purchase.clientId ? clientName : supplierName}
                    </h3>
                    <p className="text-xs font-bold text-red-400/50 mt-1">
                      {purchase.clientPhone || (purchase as any).supplier?.mobile || 'Pas de téléphone'}
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Détails Véhicule" icon="🚗">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem label="Marque" value={purchase.make} color="red" />
                  <DetailItem label="Modèle" value={purchase.model} color="red" />
                  <DetailItem label="Année" value={purchase.year} color="red" />
                  <DetailItem label="Couleur" value={purchase.color} color="red" />
                  <DetailItem label="Châssis" value={purchase.vin} icon="🆔" color="red" />
                  <DetailItem label="Immatriculation" value={purchase.plate} icon="🔢" color="red" />
                  <DetailItem label="Kilométrage" value={`${purchase.mileage.toLocaleString()} KM`} color="amber" />
                  <DetailItem label="Énergie" value={purchase.fuel === 'essence' ? 'Essence' : 'Diesel'} color="blue" />
                </div>
              </Section>

              {purchase.carInfo && (
                <Section title="Infos Complémentaires" icon="ℹ️">
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-red-600/20">
                    <p className="text-red-200 font-bold leading-relaxed whitespace-pre-wrap text-sm">{purchase.carInfo}</p>
                  </div>
                </Section>
              )}
            </div>

            {/* Right Side - Financial & Inspection */}
            <div className="space-y-8">
              <Section title="Informations Financières" icon="💰">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-600/20 to-amber-900/20 p-6 rounded-2xl border border-amber-600/30">
                    <p className="text-[10px] font-black text-amber-400/70 uppercase tracking-widest mb-2">Prix Initial Client</p>
                    <p className="text-3xl font-black text-amber-500">{initialClientPrice.toLocaleString()} <span className="text-sm font-bold opacity-50">DA</span></p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-red-600/20 to-red-900/20 p-6 rounded-2xl border border-red-600/30">
                    <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Coût Total Achat</p>
                    <p className="text-3xl font-black text-red-400">{totalCost.toLocaleString()} <span className="text-sm font-bold opacity-50">DA</span></p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-900/20 p-6 rounded-2xl border border-emerald-600/30">
                    <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest mb-2">Prix de Vente</p>
                    <p className="text-4xl font-black text-emerald-400">{sellingPrice.toLocaleString()} <span className="text-sm font-bold opacity-50">DA</span></p>
                  </div>

                  <div className={`p-6 rounded-2xl border ${profit >= 0 ? 'bg-emerald-600/10 border-emerald-600/30' : 'bg-rose-600/10 border-rose-600/30'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {profit >= 0 ? 'Marge Estimée' : 'Déficit Estimé'}
                    </p>
                    <p className={`text-3xl font-black ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Math.abs(profit).toLocaleString()} <span className="text-sm font-bold opacity-50">DA</span>
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Contrôle de Qualité" icon="✓">
                <div className="space-y-4">
                  {/* Safety */}
                  {purchase.safety && Object.keys(purchase.safety).length > 0 && (
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-red-600/20">
                      <p className="text-[10px] font-black text-red-400/60 uppercase tracking-widest mb-4">🛡️ Sécurité</p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(purchase.safety).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`text-xs ${value ? 'text-emerald-500' : 'text-rose-500'}`}>{value ? '✓' : '✕'}</span>
                            <span className="text-[11px] font-bold text-red-200">{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {purchase.equipment && Object.keys(purchase.equipment).length > 0 && (
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-red-600/20">
                      <p className="text-[10px] font-black text-red-400/60 uppercase tracking-widest mb-4">🧰 Équipements</p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(purchase.equipment).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`text-xs ${value ? 'text-emerald-500' : 'text-rose-500'}`}>{value ? '✓' : '✕'}</span>
                            <span className="text-[11px] font-bold text-red-200">{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No inspections message */}
                  {(!purchase.safety || Object.keys(purchase.safety).length === 0) &&
                   (!purchase.equipment || Object.keys(purchase.equipment).length === 0) && (
                    <div className="bg-red-950/20 p-6 rounded-2xl border border-red-600/20 text-center">
                      <p className="text-xs font-bold text-red-400/40 italic">Aucun contrôle enregistré</p>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Traçabilité" icon="📍">
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem label="Créé par" value={createdBy} icon="👤" color="red" />
                  <DetailItem label="Date d'Enregistrement" value={purchase.created_at ? new Date(purchase.created_at).toLocaleDateString('fr-FR') : 'N/A'} icon="📅" color="red" />
                  {purchase.purchaseDateTime && (
                    <DetailItem label="Date Effective d'Achat" value={new Date(purchase.purchaseDateTime).toLocaleString('fr-FR')} icon="⏰" color="amber" />
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 bg-gradient-to-r from-red-950/50 to-slate-900/50 border-t border-red-600/40 flex justify-end shrink-0">
          <button onClick={onClose} className="px-12 py-3 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-xl hover:bg-slate-900/70 transition-all uppercase tracking-wider text-sm">Fermer</button>
        </div>
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem: React.FC<{ label: string; value: string; icon?: string; color?: 'red' | 'blue' | 'rose' | 'amber' | 'emerald' }> = ({ label, value, icon, color = 'red' }) => {
  const colorMap = {
    red: { bg: 'bg-red-600/20', border: 'border-red-600/30', label: 'text-red-400/70', value: 'text-red-200' },
    blue: { bg: 'bg-blue-600/20', border: 'border-blue-600/30', label: 'text-blue-400/70', value: 'text-blue-200' },
    rose: { bg: 'bg-rose-600/20', border: 'border-rose-600/30', label: 'text-rose-400/70', value: 'text-rose-200' },
    amber: { bg: 'bg-amber-600/20', border: 'border-amber-600/30', label: 'text-amber-400/70', value: 'text-amber-200' },
    emerald: { bg: 'bg-emerald-600/20', border: 'border-emerald-600/30', label: 'text-emerald-400/70', value: 'text-emerald-200' }
  };
  
  const colors = colorMap[color] || colorMap.red;

  return (
    <div className={`${colors.bg} ${colors.border} p-4 rounded-[1.5rem] border`}>
      <p className={`text-xs font-black ${colors.label} uppercase tracking-wider flex items-center gap-2`}>
        {icon && <span>{icon}</span>}
        {label}
      </p>
      <p className={`font-black ${colors.value} mt-2 break-words`}>{value}</p>
    </div>
  );
};

const Field: React.FC<{ label: string; name: string; value: any; onChange: any; type?: string; placeholder?: string; emoji?: string; disabled?: boolean }> = ({ label, name, value, onChange, type = 'text', placeholder, emoji, disabled }) => (
  <div className="space-y-2">
    <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative group/field">
      {emoji && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40 group-focus-within/field:opacity-100 transition-all">{emoji}</span>}
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full bg-slate-900/30 border ${emoji ? 'pl-12' : 'px-4'} py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-black text-red-200 shadow-sm transition-all text-sm tracking-tight border-red-600/30 placeholder-red-400/40 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const TextAreaField: React.FC<{ label: string; name: string; value: any; onChange: any; placeholder?: string; emoji?: string; minHeight?: string }> = ({ label, name, value, onChange, placeholder, emoji, minHeight = '100px' }) => (
  <div className="space-y-2">
    <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative group/field">
      {emoji && <span className="absolute left-4 top-4 text-lg opacity-40 group-focus-within/field:opacity-100 transition-all">{emoji}</span>}
      <textarea
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{ minHeight }}
        className={`w-full bg-slate-900/30 border ${emoji ? 'pl-12' : 'px-4'} py-3 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-black text-red-200 shadow-sm transition-all text-sm tracking-tight border-red-600/30 placeholder-red-400/40 resize-none`}
      />
    </div>
  </div>
);
interface PrintInvoiceModalProps {
  purchase: PurchaseRecord;
  lang: Language;
  onClose: () => void;
}

const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ purchase, lang, onClose }) => {
  const [showroom, setShowroom] = useState<any>(null);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'ar' | null>(null);
  const [printPreview, setPrintPreview] = useState<string>('');

  useEffect(() => {
    const fetchShowroomConfig = async () => {
      const { data } = await supabase.from('showroom_config').select('*').eq('id', 1).maybeSingle();
      setShowroom(data);
    };
    fetchShowroomConfig();
  }, []);

  const generateInvoiceHTML = (invoiceLang: 'fr' | 'ar') => {
    if (!showroom) return '';

    const isArabic = invoiceLang === 'ar';
    const direction = isArabic ? 'rtl' : 'ltr';
    
    const labels = {
      invoiceTitle: isArabic ? 'فاتورة الشراء' : 'Facture d\'Achat',
      showroomInfo: isArabic ? 'معلومات المعرض' : 'Informations Showroom',
      supplierInfo: isArabic ? 'معلومات الموردين' : 'Fournisseur',
      vehicleDetails: isArabic ? 'تفاصيل المركبة' : 'Détails du Véhicule',
      inspectionTitle: isArabic ? 'تقرير الفحص' : 'Rapport d\'Inspection',
      safetySection: isArabic ? 'أنظمة الأمان' : 'Sécurité & Protection',
      equipmentSection: isArabic ? 'التجهيزات' : 'Équipements & Options',
      comfortSection: isArabic ? 'الحالة العامة' : 'État & Confort',
      make: isArabic ? 'الماركة والموديل' : 'Marque & Modèle',
      year: isArabic ? 'السنة' : 'Année',
      color: isArabic ? 'اللون' : 'Couleur',
      vin: isArabic ? 'رقم الهيكل' : 'VIN/Châssis',
      plate: isArabic ? 'لوحة الترخيص' : 'Immatriculation',
      mileage: isArabic ? 'المسافة المقطوعة' : 'Kilométrage',
      fuel: isArabic ? 'الوقود' : 'Carburant',
      transmission: isArabic ? 'ناقل الحركة' : 'Transmission',
      seatsAndDoors: isArabic ? 'المقاعد/الأبواب' : 'Sièges/Portes',
      totalAmount: isArabic ? 'المبلغ الإجمالي المستحق:' : 'MONTANT TOTAL A PAYER:',
      paymentMethod: isArabic ? 'طريقة الدفع' : 'Mode de Paiement',
      status: isArabic ? 'الحالة' : 'Statut',
      paymentTerms: isArabic ? 'شروط الدفع' : 'Délai de Paiement',
      registrationDate: isArabic ? 'تاريخ التسجيل' : 'Date d\'Enregistrement',
      showroomSignature: isArabic ? 'توقيع المعرض' : 'Signature Showroom',
      supplierSignature: isArabic ? 'توقيع الموردين' : 'Signature Fournisseur',
      stamp: isArabic ? 'الختم/الطابع' : 'Cachet / Sceau',
      generalConditions: isArabic ? 'الشروط العامة:' : 'CONDITIONS GÉNÉRALES:',
      conditions: isArabic ? '• يتم بيع المركبة كما رأيتها. • العيوب غير المذكورة لا تضمن. • يجب إجراء الدفع وفقا للشروط المتفق عليها. • هذه الفاتورة صالحة لمدة 30 يوما.' : '• Le véhicule est vendu en état vu. • Les défauts non signalés ne sont pas garantis. • Le paiement doit être effectué selon les modalités convenues. • Cette facture est valable 30 jours.',
      phone: isArabic ? 'الهاتف:' : 'Tél:',
      reference: isArabic ? 'المرجعية:' : 'Référence:',
      partnerType: isArabic ? 'نوع الشريك' : 'Partenaire Fournisseur',
      validatedPurchase: isArabic ? 'شراء موثق' : 'Achat Validé',
      km: isArabic ? 'كم' : 'KM',
      da: 'DA',
      thankyou: isArabic ? 'شكرا لثقتك!' : 'Merci de votre confiance!',
      invoiceGenerated: isArabic ? 'تم إنشاء الفاتورة في' : 'Facture générée le',
      agreePayment: isArabic ? 'يتفق عليه' : 'À Convenir',
      recorded: isArabic ? '✓ مسجل' : '✓ ENREGISTRÉ',
      onDelivery: isArabic ? 'عند التسليم' : 'À la Livraison',
      essence: isArabic ? 'بنزين' : 'Essence',
      diesel: isArabic ? 'ديزل' : 'Diesel',
      manual: isArabic ? 'يدوي' : 'Manuelle',
      automatic: isArabic ? 'أوتوماتيكي' : 'Automatique',
    };

    const renderChecklist = (items: any) => {
      if (!items || Object.keys(items).length === 0) return '';
      return Object.entries(items).map(([key, value]) => `
        <div class="check-item ${value ? 'checked' : 'unchecked'}">
          <span class="icon">${value ? '✓' : '✕'}</span>
          <span class="text">${key}</span>
        </div>
      `).join('');
    };
    
    const logoSrc = showroom?.logo_url || showroom?.logo_data;
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${labels.invoiceTitle} - ${purchase.id?.slice(0, 8)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; }
          html, body { font-family: 'Inter', sans-serif; background: #fdfdfd; color: #111827; direction: ${direction}; line-height: 1.2; font-size: 12px; }
          .invoice-container { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 8mm; background: white; border: 1px solid #eee; zoom: 0.88; }
          
          /* Sidebar Style Header */
          .premium-header { 
            background: #111; 
            color: white; 
            padding: 20px 30px; 
            border-radius: 1.5rem; 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            flex-direction: ${isArabic ? 'row-reverse' : 'row'};
            border-bottom: 4px solid #dc2626;
          }
          
          .logo-box {
            background: rgba(220, 38, 36, 0.2);
            padding: 10px;
            border-radius: 1.2rem;
            border: 1px solid rgba(220, 38, 36, 0.4);
            width: 85px;
            height: 85px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: ${isArabic ? '0' : '20px'};
            margin-left: ${isArabic ? '20px' : '0'};
          }
          .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.8rem; }
          
          .showroom-title h1 { font-size: 24px; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: -0.5px; }
          .showroom-title p { font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 2px; }
          
          .meta-right { text-align: ${isArabic ? 'left' : 'right'}; }
          .meta-right .doc-label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #6b7280; letter-spacing: 3px; margin-bottom: 1px; }
          .meta-right .doc-id { font-size: 20px; font-weight: 950; color: white; line-height: 1; }
          
          /* Cards Grid */
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
          .info-card { background: #f9fafb; border: 1.2px solid #f3f4f6; border-radius: 16px; padding: 14px; border-left: 5px solid #dc2626; }
          .info-card-header { display: flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 900; color: #dc2626; text-transform: uppercase; margin-bottom: 8px; flex-direction: ${isArabic ? 'row-reverse' : 'row'}; }
          .info-card-content strong { font-size: 14px; font-weight: 900; color: #111827; display: block; margin-bottom: 4px; }
          .info-card-content p { font-size: 11px; font-weight: 600; color: #4b5563; line-height: 1.4; }
          
          /* Main Section Header */
          .section-title { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            margin-bottom: 12px; 
            padding: 8px 16px; 
            background: #f3f4f6; 
            border-radius: 10px;
            flex-direction: ${isArabic ? 'row-reverse' : 'row'};
          }
          .section-title h2 { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #111827; letter-spacing: 1px; }
          .section-title .line { flex: 1; height: 1.5px; background: #e5e7eb; }
          
          /* Specs Table */
          .specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
          .spec-box { background: white; border: 1px solid #f3f4f6; border-bottom: 2.5px solid #f3f4f6; padding: 10px; border-radius: 12px; }
          .spec-label { font-size: 8px; font-weight: 800; color: #9ca3af; text-transform: uppercase; margin-bottom: 3px; }
          .spec-value { font-size: 11px; font-weight: 700; color: #111827; }
          
          /* Inspection Section */
          .inspection-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 15px; }
          .inspection-column { background: #fff; border: 1px solid #f3f4f6; border-radius: 14px; padding: 10px; }
          .inspection-column h3 { font-size: 9px; font-weight: 900; color: #374151; text-transform: uppercase; margin-bottom: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
          .check-item { display: flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; margin-bottom: 3px; flex-direction: ${isArabic ? 'row-reverse' : 'row'}; }
          .check-item.checked { color: #16a34a; }
          .check-item.unchecked { color: #94a3b8; opacity: 0.6; }
          .check-item .icon { font-weight: 900; font-size: 10px; }
          
          /* Financial Summary */
          .financial-bar { 
            display: flex; 
            gap: 12px; 
            margin-bottom: 20px; 
            flex-direction: ${isArabic ? 'row-reverse' : 'row'};
          }
          .total-card { 
            flex: 1; 
            background: #111827; 
            color: white; 
            padding: 15px; 
            border-radius: 20px; 
            text-align: center; 
            position: relative;
            overflow: hidden;
            border-bottom: 5px solid #dc2626;
          }
          .total-card .label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; opacity: 0.8; }
          .total-card .amount { font-size: 28px; font-weight: 950; letter-spacing: -1px; }
          
          .payment-card { flex: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #fff; border: 1.2px solid #f3f4f6; border-radius: 20px; padding: 12px; }
          .p-item .l { font-size: 7px; font-weight: 900; color: #9ca3af; text-transform: uppercase; }
          .p-item .v { font-size: 11px; font-weight: 700; color: #111827; }
          
          /* Signatures */
          .signature-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 20px; }
          .sig-box { text-align: center; }
          .sig-area { height: 60px; background: #fafafa; border: 1.2px dashed #e5e7eb; border-radius: 10px; margin-bottom: 6px; }
          .sig-label { font-size: 9px; font-weight: 900; color: #4b5563; text-transform: uppercase; }
          
          .footer { margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 10px; text-align: center; }
          .footer p { font-size: 8px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
          .thank-you { margin-top: 8px; font-size: 11px; font-weight: 900; color: #dc2626; letter-spacing: 2px; }
          
          @media print {
            @page { margin: 0; }
            body { background: white; margin: 0; padding: 0; }
            .invoice-container { border: none; width: 100%; margin: 0; padding: 15mm; zoom: 0.88; }
            .premium-header { background: #111 !important; color: white !important; -webkit-print-color-adjust: exact; }
            .total-card { background: #111827 !important; color: white !important; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Premium Header -->
          <header class="premium-header">
            <div style="display: flex; align-items: center; flex-direction: ${isArabic ? 'row-reverse' : 'row'};">
              <div class="logo-box">
                ${logoSrc 
                  ? `<img src="${logoSrc}" alt="Logo" />` 
                  : `<div style="font-size: 32px;">🚗</div>`
                }
              </div>
              <div class="showroom-title">
                <h1>${showroom?.name || 'SHOWROOM'}</h1>
                <p>${showroom?.slogan || 'Service Premium'}</p>
                <div style="display: flex; gap: 12px; margin-top: 5px; font-size: 9px; font-weight: 700; color: #9ca3af; flex-direction: ${isArabic ? 'row-reverse' : 'row'};">
                  <span>📍 ${showroom?.address || '-'}</span>
                  <span>📞 ${showroom?.phone1 || '-'}</span>
                </div>
              </div>
            </div>
            
            <div class="meta-right">
              <p class="doc-label">${labels.invoiceTitle}</p>
              <p class="doc-id">#${purchase.id?.slice(0, 8).toUpperCase()}</p>
              <p style="font-size: 10px; font-weight: 800; color: #dc2626; margin-top: 4px;">
                ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'fr-FR')}
              </p>
            </div>
          </header>
          
          <!-- Information Grid -->
          <div class="info-grid">
            <div class="info-card">
              <div class="info-card-header">
                <span>🏢</span> ${labels.showroomInfo}
              </div>
              <div class="info-card-content">
                <strong>${showroom?.name || 'SHOWROOM'}</strong>
                <p>${showroom?.address || '-'}</p>
                <p>${labels.phone} ${showroom?.phone1 || 'N/A'}</p>
                <p>${showroom?.phone2 ? 'Tél 2: ' + showroom.phone2 : ''}</p>
              </div>
            </div>
            
            <div class="info-card">
              <div class="info-card-header">
                <span>👤</span> ${labels.supplierInfo}
              </div>
              <div class="info-card-content">
                <strong>${purchase.supplierName || purchase.clientName || 'N/A'}</strong>
                <p>${labels.partnerType}</p>
                <p>${labels.reference} ${purchase.id?.slice(0, 12) || ''}</p>
                <p style="color: #16a34a; font-weight: 900;">${labels.validatedPurchase}</p>
              </div>
            </div>
          </div>
          
          <!-- Vehicle Section -->
          <div class="section-title">
            <span>🏎️</span>
            <h2>${labels.vehicleDetails}</h2>
            <div class="line"></div>
          </div>
          
          <div class="specs-grid">
            <div class="spec-box"><p class="spec-label">${labels.make}</p><p class="spec-value">${purchase.make} ${purchase.model}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.year}</p><p class="spec-value">${purchase.year}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.color}</p><p class="spec-value">${purchase.color || '-'}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.vin}</p><p class="spec-value">${purchase.vin || '-'}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.plate}</p><p class="spec-value">${purchase.plate || '-'}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.mileage}</p><p class="spec-value">${purchase.mileage?.toLocaleString() || '-'} ${labels.km}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.fuel}</p><p class="spec-value">${purchase.fuel === 'essence' ? labels.essence : labels.diesel}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.transmission}</p><p class="spec-value">${purchase.transmission === 'manuelle' ? labels.manual : labels.automatic}</p></div>
            <div class="spec-box"><p class="spec-label">${labels.seatsAndDoors}</p><p class="spec-value">${purchase.seats} Sièges / ${purchase.doors} Portes</p></div>
          </div>
          
          <!-- Inspection Report Section -->
          <div class="section-title">
            <span>📋</span>
            <h2>${labels.inspectionTitle}</h2>
            <div class="line"></div>
          </div>
          
          <div class="inspection-container">
            <div class="inspection-column">
              <h3>🛡️ ${labels.safetySection}</h3>
              ${renderChecklist(purchase.safety)}
            </div>
            <div class="inspection-column">
              <h3>🧰 ${labels.equipmentSection}</h3>
              ${renderChecklist(purchase.equipment)}
            </div>
            <div class="inspection-column">
              <h3>✨ ${labels.comfortSection}</h3>
              ${renderChecklist(purchase.comfort)}
            </div>
          </div>
          
          <!-- Financial Summary -->
          <div class="financial-bar">
            <div class="total-card">
              <p class="label">${labels.totalAmount}</p>
              <p class="amount">${purchase.totalCost?.toLocaleString() || '0'} ${labels.da}</p>
            </div>
            
            <div class="payment-card">
              <div class="p-item"><p class="l">${labels.paymentMethod}</p><p class="v">${labels.agreePayment}</p></div>
              <div class="p-item"><p class="l">${labels.status}</p><p class="v" style="color: #16a34a;">${labels.recorded}</p></div>
              <div class="p-item"><p class="l">${labels.paymentTerms}</p><p class="v">${labels.onDelivery}</p></div>
              <div class="p-item"><p class="l">${labels.registrationDate}</p><p class="v">${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'fr-FR')}</p></div>
            </div>
          </div>
          
          <!-- Signatures -->
          <div class="signature-row">
            <div class="sig-box">
              <div class="sig-area"></div>
              <p class="sig-label">${labels.showroomSignature}</p>
            </div>
            <div class="sig-box">
              <div class="sig-area"></div>
              <p class="sig-label">${labels.supplierSignature}</p>
            </div>
            <div class="sig-box">
              <div class="sig-area"></div>
              <p class="sig-label">${labels.stamp}</p>
            </div>
          </div>
          
          
          <!-- Footer -->
          <div class="footer">
            <p>${labels.invoiceGenerated} ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'fr-FR')} | ${showroom?.name}</p>
            <p class="thank-you">${labels.thankyou}</p>
          </div>
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `;
    return printContent;
  };

  const handleLanguageSelect = (selectedLang: 'fr' | 'ar') => {
    setSelectedLanguage(selectedLang);
    const html = generateInvoiceHTML(selectedLang);
    setPrintPreview(html);
  };

  const handlePrintFromPreview = () => {
    if (printPreview) {
      const printWindow = window.open('', '', 'width=900,height=1200');
      if (printWindow) {
        printWindow.document.write(printPreview);
        printWindow.document.close();
      }
    }
  };

  const handleEditorPrint = (elements: any) => {
    window.print();
    setTimeout(() => onClose(), 1000);
  };

  // Language selection view
  if (!selectedLanguage && !printPreview) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="glass-card rounded-[3.5rem] shadow-[0_0_100px_rgba(220,38,38,0.3)] max-w-2xl w-full overflow-hidden flex flex-col border border-red-600/50 transform animate-in zoom-in-95 duration-500">
          <div className="p-10 md:p-14 bg-gradient-to-br from-red-950 via-slate-900 to-black relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-red-400 to-red-600 mb-4 tracking-tight">
                🌐 Sélection Langue
              </h2>
              <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">Choisissez la langue d'impression</p>
            </div>
          </div>

          <div className="p-10 md:p-14 space-y-6 flex-1 bg-black/40">
            <button
              onClick={() => handleLanguageSelect('fr')}
              className="group relative w-full p-1 rounded-[2rem] overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center gap-6 bg-slate-900/90 group-hover:bg-transparent p-6 rounded-[1.9rem] transition-colors border border-red-600/20 group-hover:border-transparent">
                <span className="text-5xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">🇫🇷</span>
                <div className="text-left">
                  <p className="font-black text-red-100 text-2xl tracking-tight mb-1">Français</p>
                  <p className="text-xs font-black text-red-400/60 uppercase tracking-widest">Imprimer maintenant</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                  <span className="text-2xl text-white">🖨️</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleLanguageSelect('ar')}
              className="group relative w-full p-1 rounded-[2rem] overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center gap-6 bg-slate-900/90 group-hover:bg-transparent p-6 rounded-[1.9rem] transition-colors border border-red-600/20 group-hover:border-transparent">
                <span className="text-5xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">🇸🇦</span>
                <div className="text-left">
                  <p className="font-black text-red-100 text-2xl tracking-tight mb-1">العربية</p>
                  <p className="text-xs font-black text-red-400/60 uppercase tracking-widest">اطبع الآن</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                  <span className="text-2xl text-white">🖨️</span>
                </div>
              </div>
            </button>
          </div>

          <div className="p-10 bg-slate-950/80 border-t border-red-600/30 flex justify-center">
            <button
              onClick={onClose}
              className="px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] text-red-400 hover:text-white hover:bg-red-600/20 transition-all border border-red-600/30"
            >
              ✕ Annuler & Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Invoice preview in modal
  if (selectedLanguage && printPreview) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-500">
        <div className="glass-card rounded-[3.5rem] shadow-[0_0_100px_rgba(220,38,38,0.2)] max-w-6xl w-full h-full max-h-[90vh] overflow-hidden flex flex-col border border-red-600/40 transform animate-in zoom-in-95 duration-500">
          <div className="p-8 md:p-10 bg-gradient-to-r from-red-950 via-slate-900 to-black flex justify-between items-center relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-red-400 to-red-600 tracking-tight">
                📄 Aperçu Impression
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-red-600/20 border border-red-600/30 rounded-lg text-[10px] font-black text-red-400 uppercase tracking-widest">
                  {selectedLanguage === 'fr' ? '🇫🇷 Français' : '🇸🇦 العربية'}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
                <span className="text-[10px] font-black text-red-400/50 uppercase tracking-widest">Document prêt à imprimer</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                setSelectedLanguage(null);
                setPrintPreview('');
              }}
              className="group relative h-14 w-14 rounded-full overflow-hidden transition-all duration-300 hover:rotate-90"
            >
              <div className="absolute inset-0 bg-red-600 group-hover:bg-red-500 transition-colors"></div>
              <span className="relative z-10 text-white text-xl font-black">✕</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-950/50 custom-scrollbar">
            <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-0 md:p-4 mx-auto max-w-[210mm] transform transition-transform hover:scale-[1.01] duration-500">
              <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-inner" dangerouslySetInnerHTML={{ __html: printPreview }} />
            </div>
          </div>

          <div className="p-8 md:p-10 bg-slate-900/90 border-t border-red-600/30 flex gap-6 justify-between items-center shrink-0">
            <button
              onClick={() => {
                setSelectedLanguage(null);
                setPrintPreview('');
              }}
              className="px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-white transition-all flex items-center gap-3"
            >
              ← Retour au choix
            </button>

            <button
              onClick={handlePrintFromPreview}
              className="group relative px-12 py-5 rounded-2xl overflow-hidden font-black uppercase tracking-[0.2em] text-[12px] transition-all duration-300 shadow-2xl shadow-red-600/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
              <div className="relative z-10 flex items-center justify-center gap-4 text-white">
                <span className="text-xl group-hover:animate-bounce">🖨️</span>
                <span>Lancer l'Impression</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: Loading state
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[150] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="h-20 w-20 border-[6px] border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
        <p className="text-red-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Initialisation...</p>
      </div>
    </div>
  );
};


