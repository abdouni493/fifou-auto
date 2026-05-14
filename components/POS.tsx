
import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseRecord, Language, SaleRecord, InvoiceDesign, ElementPosition, CustomText } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { getCreatedByValue, uploadImageToBucket } from '../utils';

interface POSProps {
  lang: Language;
  userName?: string;
}

// Removed defaultInvoiceDesign as personalization is no longer supported

type EditableField = 'logo' | 'title' | 'client' | 'car' | 'finance' | 'extra' | 'none';

export const POS: React.FC<POSProps> = ({ lang, userName }) => {
  const t = translations[lang];
  const [inventory, setInventory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<PurchaseRecord | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [allSales, setAllSales] = useState<(SaleRecord & { car?: PurchaseRecord })[]>([]);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [salesDebtFilter, setSalesDebtFilter] = useState<'all' | 'debts' | 'completed'>('all');
  
  // State pour l'impression
  const [printingRecord, setPrintingRecord] = useState<any | null>(null);
  const [printType, setPrintType] = useState<'sale' | 'receipt' | null>(null);
  const [printingSale, setPrintingSale] = useState<(SaleRecord & { car?: PurchaseRecord }) | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [showroomConfig, setShowroomConfig] = useState<any>(null);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<any>(null);

  // States Financiers
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Debt Payment States
  const [paymentModal, setPaymentModal] = useState<{ sale: SaleRecord | null; paymentAmount: number }>({ sale: null, paymentAmount: 0 });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // State Formulaire Client
  const [formData, setFormData] = useState<Partial<SaleRecord>>({
    gender: 'M',
    doc_type: "Biometric Driver's License",
  });

  // Wizard States
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [inspectionTemplates, setInspectionTemplates] = useState<any[]>([]);

  // Fetching Functions
  const fetchInspectionTemplates = async () => {
    try {
      const { data } = await supabase.from('inspection_templates').select('*').eq('is_active', true).order('template_type, item_name');
      setInspectionTemplates(data || []);
    } catch (err) {
      console.error('Error fetching inspection templates:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase.from('clients').select('*').order('first_name');
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchShowroomConfig = async () => {
    try {
      const { data } = await supabase.from('showroom_config').select('*');
      if (data && data.length > 0) {
        setShowroomConfig(data[0]);
      }
    } catch (err) {
      console.log('Showroom config not found or error:', err);
    }
  };

  const fetchAvailableCars = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('is_sold', false)
        .order('created_at', { ascending: false });
      
      const rawData = error ? (await supabase.from('purchases').select('*')).data : data;
      
      const normalized = (rawData || []).map((p: any) => ({
        ...p,
        sellingPrice: p.selling_price,
        totalCost: p.total_cost,
        safety: p.safety_checklist || {},
        equipment: p.equipment_checklist || {},
        comfort: p.comfort_checklist || {}
      }));
      
      setInventory(normalized);
    } catch (err) {
      console.error('Inventory Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableCars();
    fetchShowroomConfig();
    fetchClients();
    fetchInspectionTemplates();
  }, []);



  const handleDeleteSale = async (saleId: string, carId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible.')) {
      return;
    }

    try {
      // Delete sale record
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (deleteError) throw deleteError;

      // Mark car as not sold again
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ is_sold: false })
        .eq('id', carId);

      if (updateError) throw updateError;

      // Refresh sales list
      await fetchAllSales();
      alert('✅ Vente supprimée avec succès');
    } catch (err: any) {
      alert(`❌ Erreur lors de la suppression : ${err.message}`);
    }
  };

  const handlePaymentModalOpen = (sale: SaleRecord) => {
    if (sale.balance <= 0) {
      alert('✅ Cette vente est déjà complètement payée');
      return;
    }
    setPaymentModal({ sale, paymentAmount: sale.balance });
  };

  const handleSavePayment = async () => {
    if (!paymentModal.sale) return;

    const paymentAmount = paymentModal.paymentAmount;
    if (paymentAmount <= 0) {
      alert('❌ Le montant du paiement doit être supérieur à 0');
      return;
    }

    if (paymentAmount > paymentModal.sale.balance) {
      alert('❌ Le montant du paiement ne peut pas dépasser le solde restant');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Calculate new balance
      const newBalance = paymentModal.sale.balance - paymentAmount;
      const newAmountPaid = paymentModal.sale.amount_paid + paymentAmount;
      const newStatus: 'completed' | 'debt' = newBalance <= 0 ? 'completed' : 'debt';

      // Update the sale record
      const { error } = await supabase
        .from('sales')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus
        })
        .eq('id', paymentModal.sale.id);

      if (error) throw error;

      // Refresh the sales list
      await fetchAllSales();
      setPaymentModal({ sale: null, paymentAmount: 0 });
    } catch (err: any) {
      alert(`❌ Erreur lors de l'enregistrement du paiement : ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredSales = allSales.filter(sale => {
    // Search filter
    const searchLower = salesSearchQuery.toLowerCase();
    const matchesSearch = !salesSearchQuery || 
      (sale.car && (sale.car.make.toLowerCase().includes(searchLower) || sale.car.model.toLowerCase().includes(searchLower))) ||
      sale.first_name.toLowerCase().includes(searchLower) ||
      sale.last_name.toLowerCase().includes(searchLower);
    
    // Debt filter
    let matchesDebtFilter = true;
    if (salesDebtFilter === 'debts') {
      matchesDebtFilter = sale.status === 'debt' || sale.balance > 0;
    } else if (salesDebtFilter === 'completed') {
      matchesDebtFilter = sale.status === 'completed' && sale.balance === 0;
    }
    
    return matchesSearch && matchesDebtFilter;
  });

  const fetchAllSales = async () => {
    try {
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch car details for each sale
      const { data: purchases } = await supabase.from('purchases').select('*');
      const purchasesMap = new Map(purchases?.map(p => [p.id, p]) || []);
      
      // Fetch creator info from workers
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const creatorIds = [...new Set(sales?.map(s => s.created_by).filter(id => id && uuidRegex.test(id)))] as string[];
      
      const { data: profiles } = await supabase
        .from('workers')
        .select('id, fullname, username')
        .in('id', creatorIds.length > 0 ? creatorIds : []);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const salesWithCars = sales?.map(s => ({
        ...s,
        car: purchasesMap.get(s.car_id),
        creator_name: profilesMap.get(s.created_by)?.fullname || profilesMap.get(s.created_by)?.username || s.created_by
      })) || [];
      
      setAllSales(salesWithCars);
      setShowSalesHistory(true);
    } catch (err) {
      console.error('Sales Fetch Error:', err);
    }
  };

  const balance = useMemo(() => {
    const b = totalPrice - amountPaid;
    return b < 0 ? 0 : b;
  }, [totalPrice, amountPaid]);

  // Filtered inventory based on search
  const filteredInventory = useMemo(() => {
    if (!inventorySearchQuery.trim()) return inventory;
    const query = inventorySearchQuery.toLowerCase();
    return inventory.filter(car => 
      car.make.toLowerCase().includes(query) ||
      car.model.toLowerCase().includes(query) ||
      car.plate?.toLowerCase().includes(query) ||
      car.year?.toString().includes(query)
    );
  }, [inventory, inventorySearchQuery]);

  const handleStartSaleWizard = (car: PurchaseRecord) => {
    setSelectedCar(car);
    setTotalPrice(car.sellingPrice || (car as any).selling_price || 0);
    setAmountPaid(0);
    setWizardStep(1);
    setIsDrafting(true);
    setFormData({
      gender: 'M',
      doc_type: "Biometric Driver's License",
      safety: (car as any).safety || {},
      equipment: (car as any).equipment || {},
      comfort: (car as any).comfort || {}
    });
  };

  // Handle wizard navigation
  const handleWizardNext = () => {
    if (wizardStep === 1) {
      // Validate step 1: Client info
      if (!formData.first_name || !formData.last_name || !formData.mobile1 || !formData.doc_number) {
        alert('Veuillez remplir: Prénom, Nom, Mobile, N° Document');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    }
  };

  const handleWizardPrevious = () => {
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleWizardClose = () => {
    setIsDrafting(false);
    setWizardStep(1);
    setSelectedCar(null);
    setFormData({
      gender: 'M',
      doc_type: "Biometric Driver's License",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'photo_url' | 'scan_url' | 'signature_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bucketMap = {
      photo_url:     'client-photos',
      scan_url:      'client-id-scans',
      signature_url: 'client-signatures',
    } as const;

    try {
      const url = await uploadImageToBucket(bucketMap[field], file);
      setFormData(prev => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  const handleFinalize = async () => {
    if (!selectedCar || !formData.first_name || !formData.last_name || !formData.mobile1 || !formData.doc_number || totalPrice <= 0) {
      alert("Erreur: Veuillez remplir au moins le Prénom, le Nom, le Mobile, le N° de Document et le Prix.");
      return;
    }
    setIsSubmitting(true);
    
    let finalClientId = formData.client_id;

    // IF NEW CLIENT -> SAVE TO CLIENTS TABLE FIRST
    if (!finalClientId) {
      try {
        const clientData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          dob: formData.dob,
          pob: formData.pob,
          gender: formData.gender,
          address: formData.address,
          profession: formData.profession,
          mobile1: formData.mobile1,
          mobile2: formData.mobile2,
          doc_type: formData.doc_type,
          doc_number: formData.doc_number,
          issue_date: formData.issue_date,
          expiry_date: formData.expiry_date,
          photo_url: formData.photo_url,
          scan_url: formData.scan_url,
          nif: formData.nif,
          rc: formData.rc,
          nis: formData.nis,
          art: formData.art
        };
        const { data: newClient, error: clientErr } = await supabase.from('clients').insert([clientData]).select();
        if (clientErr) throw clientErr;
        if (newClient && newClient[0]) {
          finalClientId = newClient[0].id;
        }
      } catch (err) {
        console.error("Error creating new client:", err);
        // We continue even if client creation fails? No, better to alert.
        alert("Erreur lors de la création du dossier client.");
        setIsSubmitting(false);
        return;
      }
    }

    const saleData = {
      car_id: selectedCar.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      dob: formData.dob || null,
      gender: formData.gender || 'M',
      pob: formData.pob || '',
      address: formData.address || '',
      profession: formData.profession || '',
      mobile1: formData.mobile1,
      mobile2: formData.mobile2 || '',
      nif: formData.nif || '',
      rc: formData.rc || '',
      nis: formData.nis || '',
      art: formData.art || '',
      doc_type: formData.doc_type || '',
      doc_number: formData.doc_number,
      issue_date: formData.issue_date || null,
      expiry_date: formData.expiry_date || null,
      photo_url: formData.photo_url || null,
      scan_url: formData.scan_url || null,
      signature_url: formData.signature_url || null,
      total_price: totalPrice,
      amount_paid: amountPaid,
      balance: balance,
      status: balance > 0 ? 'debt' : 'completed',
      client_id: finalClientId || null,
      created_by: getCreatedByValue()
    };
    try {
      // Direct insert now that RLS is disabled
      const { data: insertedSale, error: saleError } = await supabase.from('sales').insert([saleData]).select();
      if (saleError) throw saleError;
      
      // Record the initial payment in the payments table
      if (insertedSale && insertedSale[0] && amountPaid > 0) {
        await supabase.from('payments').insert([{
          sale_id: insertedSale[0].id,
          client_id: saleData.client_id || null,
          amount: amountPaid,
          payment_method: 'Initial Payment',
          created_by: saleData.created_by
        }]);
      }

      await supabase.from('purchases').update({ is_sold: true }).eq('id', selectedCar.id);
      if (insertedSale && insertedSale[0]) {
        const finalSale = { ...saleData, id: insertedSale[0].id, created_at: insertedSale[0].created_at, car: selectedCar } as any;
        setPrintingSale(finalSale);
        setShowPrintPrompt(true);
      }
      setIsDrafting(false);
      setSelectedCar(null);
      setTotalPrice(0);
      setAmountPaid(0);
      setFormData({ gender: 'M', doc_type: "Biometric Driver's License" });
      fetchAvailableCars();
    } catch (err: any) {
      alert(`Erreur Transactionnelle : ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintInvoiceNow = (sale: any) => {
    setPrintingRecord(sale);
    setPrintType('sale');
  };

  const handlePrintReceipt = (sale: any) => {
    setPrintingRecord(sale);
    setPrintType('receipt');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-20 w-20 border-4 border-red-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-8 font-black text-red-400 uppercase tracking-widest text-[10px]">Ouverture du Showroom...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen pb-10">
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

      
      {/* PRINT PROMPT MODAL */}
      {showPrintPrompt && printingSale && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative glass-card w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-red-600/20">
            <div className="px-12 py-12 text-center space-y-8">
              <div className="h-32 w-32 rounded-[2.8rem] bg-emerald-50 text-emerald-600 flex items-center justify-center text-6xl mx-auto shadow-inner animate-bounce">✅</div>
              <div>
                <h3 className="text-4xl font-black text-red-100 tracking-tight">Vente Enregistrée !</h3>
                <p className="text-red-400/70 font-bold text-sm mt-3 uppercase tracking-widest">Le véhicule a été marqué comme vendu avec succès.</p>
              </div>

              <div className="bg-slate-50 rounded-[3rem] p-10 border border-red-600/20 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Acheteur</span>
                  <span className="font-black text-red-100">{printingSale.first_name} {printingSale.last_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Véhicule</span>
                  <span className="font-black text-red-400">{printingSale.car?.make} {printingSale.car?.model}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-red-600/30">
                  <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Total Transaction</span>
                  <span className="text-xl font-black text-red-100">{printingSale.total_price.toLocaleString()} DA</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <button 
                  onClick={() => { setShowPrintPrompt(false); setPrintingSale(null); }} 
                  className="py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest text-red-400/70 bg-red-950/30 hover:bg-slate-200 transition-all"
                >
                  Plus Tard
                </button>
                <button 
                  onClick={() => { handlePrintInvoiceNow(printingSale); setShowPrintPrompt(false); setPrintingSale(null); }} 
                  className="group relative py-6 rounded-[2.5rem] overflow-hidden text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <span className="relative z-10 flex items-center gap-2">
                    <span>🖨️</span>
                    <span>Imprimer Facture</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REDESIGNED INVENTORY & WIZARD INTERFACE */}
      {/* HEADER SECTION */}
      {!isDrafting && (
        <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
                🚗 Catalogue de Vente
              </h1>
              <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
                {filteredInventory.length} Véhicules en Stock • {allSales.length} Ventes Réalisées
              </p>
            </div>
            
            <button 
              onClick={fetchAllSales}
              className="group relative px-8 py-4 rounded-xl overflow-hidden font-black uppercase tracking-wider text-sm transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
              <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                <span className="transition-all duration-300 group-hover:scale-125">📋</span>
                <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Historique</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {!isDrafting && (
        <div className="space-y-8">
          {/* SEARCH BOX */}
          <div className="relative group px-4">
            <input
              type="text"
              placeholder="🔍 Rechercher par marque, modèle, immatriculation, année..."
              value={inventorySearchQuery}
              onChange={(e) => setInventorySearchQuery(e.target.value)}
              className="w-full px-8 py-5 rounded-[2.5rem] border border-red-600/40 bg-slate-900/50 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 transition-all backdrop-blur-sm font-black"
            />
            <div className="absolute inset-y-0 right-10 flex items-center gap-4">
              {inventorySearchQuery && (
                <button
                  onClick={() => setInventorySearchQuery('')}
                  className="text-red-400/70 hover:text-red-100 transition-all text-xl"
                >
                  ✕
                </button>
              )}
              <div className="h-8 w-[1px] bg-red-600/30 mx-2"></div>
              <div className="text-xs font-black text-red-400 uppercase tracking-widest whitespace-nowrap">
                {filteredInventory.length} Véhicules
              </div>
            </div>
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-r from-red-600/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
          </div>


          {/* Enhanced Car Grid with Full Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
            {filteredInventory.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 opacity-40">
                <span className="text-8xl mb-4">🔍</span>
                <p className="text-red-400/70 font-black uppercase tracking-widest">AUCUN VÉHICULE NE CORRESPOND À VOTRE RECHERCHE</p>
              </div>
            ) : (
              filteredInventory.map((car, idx) => (
                <div
                  key={car.id}
                  onClick={() => handleStartSaleWizard(car)}
                  className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group relative cursor-pointer"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Image Container */}
                  <div className="h-48 overflow-hidden relative bg-gradient-to-br from-red-900/50 to-black">
                    <img 
                      src={car.photo_urls?.[0] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000'} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt={car.model} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    
                    {/* Year Badge */}
                    <div className="absolute top-4 right-4 bg-red-600/50 backdrop-blur-md px-4 py-2 rounded-lg border border-red-600/60">
                      <span className="text-xs font-black text-red-100 uppercase">{car.year}</span>
                    </div>

                    {/* Quick Specs Overlay */}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <div className="bg-red-600/30 backdrop-blur-md px-2 py-1 rounded-md border border-red-600/40">
                        <span className="text-[8px] font-black text-red-100 uppercase tracking-widest">{car.fuel}</span>
                      </div>
                      <div className="bg-red-600/30 backdrop-blur-md px-2 py-1 rounded-md border border-red-600/40">
                        <span className="text-[8px] font-black text-red-100 uppercase tracking-widest">{car.transmission}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-grow space-y-4">
                    {/* Make & Model */}
                    <div>
                      <h3 className="text-2xl font-black text-red-100 leading-tight">{car.make}</h3>
                      <p className="text-sm font-black text-red-400/70">{car.model}</p>
                    </div>

                    {/* Price Card */}
                    <div className="bg-red-600/20 p-4 rounded-[1.5rem] border border-red-600/30">
                      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-1">Prix de Vente</p>
                      <p className="text-2xl font-black text-red-200 tracking-tighter">
                        {(car.sellingPrice || (car as any).selling_price)?.toLocaleString()} <span className="text-xs font-bold opacity-40">DA</span>
                      </p>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-red-600/10 p-2 rounded-xl border border-red-600/20 text-center">
                          <p className="text-[8px] font-black text-red-400/50 uppercase">Kilométrage</p>
                          <p className="text-xs font-black text-red-200">{(car.mileage || 0).toLocaleString()} KM</p>
                       </div>
                       <div className="bg-red-600/10 p-2 rounded-xl border border-red-600/20 text-center">
                          <p className="text-[8px] font-black text-red-400/50 uppercase">Plaque</p>
                          <p className="text-xs font-black text-red-200 uppercase">{car.plate || '---'}</p>
                       </div>
                    </div>

                    {/* CTA Button */}
                    <button 
                      className="w-full relative group overflow-hidden py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 mt-auto"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                        <span>→</span>
                        <span>Vendre ce Véhicule</span>
                      </div>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
        {/* MULTI-STEP SALE WIZARD */}
        {isDrafting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl overflow-y-auto">
          <div className="relative glass-card w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-500 border border-red-600/40">
            
            {/* WIZARD HEADER */}
            <div className="px-12 py-10 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 text-white shrink-0 relative overflow-hidden border-b border-red-600/20">
               <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_50%)]"></div>
               <div className="relative z-10 flex items-center gap-6">
                <div className="h-16 w-16 rounded-[2rem] bg-red-600/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-xl border border-red-600/30">
                  {wizardStep === 1 ? '👤' : wizardStep === 2 ? '🛡️' : '💰'}
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-100 to-red-400">
                    {wizardStep === 1 ? 'Client' : wizardStep === 2 ? 'Inspection' : 'Finalisation'}
                  </h2>
                  <p className="text-red-400 font-bold text-[10px] uppercase tracking-widest mt-1">Étape {wizardStep} sur 3 • {selectedCar?.make} {selectedCar?.model}</p>
                </div>
              </div>
              <button onClick={handleWizardClose} className="h-14 w-14 bg-red-600/10 hover:bg-red-600/20 rounded-full flex items-center justify-center text-2xl transition-all backdrop-blur-md border border-red-600/20 relative z-10 text-red-100">✕</button>
            </div>

            {/* WIZARD PROGRESS BAR */}
            <div className="h-2 bg-red-950/30 relative">
               <div 
                 className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(220,38,38,0.5)]" 
                 style={{ width: `${(wizardStep / 3) * 100}%` }}
               />
            </div>

            {/* WIZARD CONTENT - SCROLLABLE */}
            <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-10 bg-slate-950/20">
              
              {/* ========== STEP 1: CLIENT INFORMATION ========== */}
              {wizardStep === 1 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
                  <div className="glass-card border-2 border-red-600/20 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-4xl">👤</span>
                      <div>
                        <h3 className="text-2xl font-black text-red-100">Informations Personnelles</h3>
                        <p className="text-red-400/70 font-bold text-sm">Remplissez les détails du client</p>
                      </div>
                    </div>

                    {/* Client Search */}
                    <div className="mb-12 relative">
                       <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-3 mb-2 block">🔍 Rechercher un client existant</label>
                       <div className="relative">
                          <input 
                            type="text"
                            placeholder="Rechercher par nom, prénom ou numéro de téléphone..."
                            value={clientSearchQuery}
                            onChange={(e) => {
                              setClientSearchQuery(e.target.value);
                              setShowClientResults(true);
                            }}
                            onFocus={() => setShowClientResults(true)}
                            className="w-full bg-slate-900/50 border-2 border-red-600/20 px-8 py-5 rounded-[2rem] outline-none focus:border-red-600 font-bold text-red-100 shadow-sm transition-all text-lg"
                          />
                          {clientSearchQuery && (
                            <button 
                              onClick={() => { setClientSearchQuery(''); setShowClientResults(false); }}
                              className="absolute right-6 top-1/2 -translate-y-1/2 h-10 w-10 bg-red-950/30 rounded-full flex items-center justify-center text-red-400/70 hover:bg-red-600/20 hover:text-red-500 transition-all"
                            >✕</button>
                          )}
                       </div>

                       {showClientResults && clientSearchQuery.length > 1 && (
                         <div className="absolute z-50 left-0 right-0 mt-4 glass-card rounded-[2.5rem] shadow-2xl border border-red-600/30 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-4 bg-slate-900/95 backdrop-blur-md">
                            {clients.filter(c => 
                              `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                              c.mobile1?.includes(clientSearchQuery)
                            ).length === 0 ? (
                              <div className="p-10 text-center text-red-400/70 font-bold">Aucun client trouvé</div>
                            ) : (
                              clients.filter(c => 
                                `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                c.mobile1?.includes(clientSearchQuery)
                              ).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                      setFormData({
                                        ...formData,
                                        client_id: c.id,
                                        first_name: c.first_name,
                                        last_name: c.last_name,
                                      dob: c.dob,
                                      gender: c.gender,
                                      pob: c.pob,
                                      profession: c.profession,
                                      address: c.address,
                                      mobile1: c.mobile1,
                                      mobile2: c.mobile2,
                                      doc_type: c.doc_type || formData.doc_type,
                                      doc_number: c.doc_number,
                                      issue_date: c.issue_date,
                                      expiry_date: c.expiry_date,
                                      issue_address: c.issue_address,
                                      nif: c.nif,
                                      rc: c.rc,
                                      nis: c.nis,
                                      art: c.art,
                                      photo_url: c.photo_url,
                                      scan_url: c.scan_url
                                    });
                                    setClientSearchQuery(`${c.first_name} ${c.last_name}`);
                                    setShowClientResults(false);
                                  }}
                                  className="w-full p-6 text-left hover:bg-red-600/10 flex items-center gap-6 transition-all border-b border-red-600/10 last:border-0"
                                >
                                   <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-red-600/20 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                                      {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover" /> : '👤'}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className="font-black text-red-100 text-lg truncate">{c.first_name} {c.last_name}</p>
                                      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-1">{c.mobile1} {c.address ? `• ${c.address}` : ''}</p>
                                   </div>
                                   <div className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl text-[10px] font-black uppercase tracking-widest">SÉLECTIONNER</div>
                                </button>
                              ))
                            )}
                         </div>
                       )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12">
                      <div className="flex flex-col items-center justify-start lg:w-1/4 pt-4">
                         <div className="relative group w-48 h-48">
                            <div className="w-full h-full rounded-[4.5rem] bg-slate-900 border-4 border-red-600/30 shadow-xl flex items-center justify-center text-7xl overflow-hidden group-hover:bg-red-600/20 transition-colors">
                               {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : '👤'}
                            </div>
                            <label className="absolute bottom-2 right-2 h-14 w-14 rounded-2xl bg-red-600 text-white flex items-center justify-center cursor-pointer hover:bg-red-700 shadow-2xl transition-all">
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_url')} />
                               <span className="text-2xl">📷</span>
                            </label>
                         </div>
                         <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-6 text-center bg-red-600/10 px-4 py-2 rounded-xl border border-red-600/20">Photo Client</p>
                      </div>
                      
                      <div className="lg:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField label="Prénom" name="first_name" emoji="📝" value={formData.first_name} onChange={handleInputChange} required />
                        <FormField label="Nom" name="last_name" emoji="📝" value={formData.last_name} onChange={handleInputChange} required />
                        <FormField label="Date de Naissance" name="dob" emoji="🎂" type="date" value={formData.dob} onChange={handleInputChange} />
                        <FormField label="Sexe" name="gender" emoji="👥" type="select" value={formData.gender} onChange={handleInputChange} options={[{v:'M', l:'Masculin'}, {v:'F', l:'Féminin'}]} />
                        <FormField label="Lieu de Naissance" name="pob" emoji="📍" value={formData.pob} onChange={handleInputChange} />
                        <FormField label="Profession" name="profession" emoji="🛠️" value={formData.profession} onChange={handleInputChange} />
                        <FormField label="Adresse" name="address" emoji="🏠" value={formData.address} onChange={handleInputChange} />
                        <FormField label="Mobile Principal" name="mobile1" emoji="📱" value={formData.mobile1} onChange={handleInputChange} required />
                        <FormField label="Mobile Secondaire" name="mobile2" emoji="📞" value={formData.mobile2} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card border-2 border-red-600/20 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-4xl">🛂</span>
                      <div>
                        <h3 className="text-2xl font-black text-red-100">Document d'Identité & Pièces Jointes</h3>
                        <p className="text-red-400/70 font-bold text-sm">Informations officielles et scans requis</p>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12">
                      <div className="lg:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField label="Type de Document" name="doc_type" emoji="📋" type="select" value={formData.doc_type} onChange={handleInputChange} options={[{v:"Permis", l:"Permis Biométrique"}, {v:"CNI", l:"Carte d'Identité"}, {v:"Passeport", l:"Passeport"}]} />
                        <FormField label="N° Document" name="doc_number" emoji="🔢" value={formData.doc_number} onChange={handleInputChange} required />
                        <FormField label="Délivrance" name="issue_date" emoji="📅" type="date" value={formData.issue_date} onChange={handleInputChange} />
                        <FormField label="Expiration" name="expiry_date" emoji="⏰" type="date" value={formData.expiry_date} onChange={handleInputChange} />
                        <FormField label="Adresse Délivrance" name="issue_address" emoji="📍" value={formData.issue_address} onChange={handleInputChange} />
                        <FormField label="NIF" name="nif" emoji="📊" value={formData.nif} onChange={handleInputChange} placeholder="Optionnel" />
                        <FormField label="RC" name="rc" emoji="📊" value={formData.rc} onChange={handleInputChange} placeholder="Optionnel" />
                        <FormField label="NIS" name="nis" emoji="📊" value={formData.nis} onChange={handleInputChange} placeholder="Optionnel" />
                        <FormField label="ART" name="art" emoji="📊" value={formData.art} onChange={handleInputChange} placeholder="Optionnel" />
                      </div>

                      <div className="lg:w-1/2 flex flex-col gap-6">
                        <div className="flex-grow border-4 border-dashed border-red-600/20 glass-card rounded-[3.5rem] p-8 flex flex-col items-center justify-center relative group min-h-[250px] transition-all hover:border-red-600/50 bg-slate-900/50">
                           {formData.scan_url ? <img src={formData.scan_url} className="w-full h-full object-contain rounded-[2rem]" /> : (
                             <div className="text-center opacity-40"><span className="text-6xl mb-4 block">📑</span><p className="text-[10px] font-black uppercase tracking-widest text-red-400/70 mt-4">Scanner ID / Permis</p></div>
                           )}
                           <label className="absolute bottom-6 px-10 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-red-700 transition-all shadow-xl z-10">
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'scan_url')} />
                              Importer Scan
                           </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== STEP 2: INSPECTION CHECKLIST ========== */}
              {wizardStep === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
                  <div className="glass-card border-2 border-red-600/20 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-4xl">🛡️</span>
                      <div>
                        <h3 className="text-2xl font-black text-red-100">Inspection Véhicule</h3>
                        <p className="text-red-400/70 font-bold text-sm">Vérifiez l'état du véhicule</p>
                      </div>
                    </div>

                    {/* Safety Checklist */}
                    <div className="space-y-6 mb-10 pb-10 border-b-2 border-red-600/20">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🛡️</span>
                        <h4 className="text-lg font-black text-red-100 uppercase tracking-widest">Contrôle Sécurité</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {inspectionTemplates.filter(t => t.template_type === 'safety').map(t => (
                          <label key={t.id} className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-2xl border border-red-600/20 cursor-pointer hover:bg-red-600/10 transition-all group">
                            <input
                              type="checkbox"
                              checked={(formData.safety?.[t.item_name] || false) as boolean}
                              onChange={(e) => setFormData({...formData, safety: {...(formData.safety || {}), [t.item_name]: e.target.checked}})}
                              className="w-5 h-5 rounded cursor-pointer accent-red-600"
                            />
                            <span className="font-black text-red-100 group-hover:text-red-400 transition-colors">{t.item_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Equipment Checklist */}
                    <div className="space-y-6 mb-10 pb-10 border-b-2 border-red-600/20">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">⚙️</span>
                        <h4 className="text-lg font-black text-red-100 uppercase tracking-widest">Équipements</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {inspectionTemplates.filter(t => t.template_type === 'equipment').map(t => (
                          <label key={t.id} className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-2xl border border-red-600/20 cursor-pointer hover:bg-red-600/10 transition-all group">
                            <input
                              type="checkbox"
                              checked={(formData.equipment?.[t.item_name] || false) as boolean}
                              onChange={(e) => setFormData({...formData, equipment: {...(formData.equipment || {}), [t.item_name]: e.target.checked}})}
                              className="w-5 h-5 rounded cursor-pointer accent-red-600"
                            />
                            <span className="font-black text-red-100 group-hover:text-red-400 transition-colors">{t.item_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Comfort Checklist */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🪑</span>
                        <h4 className="text-lg font-black text-red-100 uppercase tracking-widest">Confort</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {inspectionTemplates.filter(t => t.template_type === 'comfort').map(t => (
                          <label key={t.id} className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-2xl border border-red-600/20 cursor-pointer hover:bg-red-600/10 transition-all group">
                            <input
                              type="checkbox"
                              checked={(formData.comfort?.[t.item_name] || false) as boolean}
                              onChange={(e) => setFormData({...formData, comfort: {...(formData.comfort || {}), [t.item_name]: e.target.checked}})}
                              className="w-5 h-5 rounded cursor-pointer accent-red-600"
                            />
                            <span className="font-black text-red-100 group-hover:text-red-400 transition-colors">{t.item_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== STEP 3: SUMMARY & REVIEW ========== */}
              {wizardStep === 3 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
                  {/* VÉHICULE SUMMARY */}
                  <div className="glass-card border-2 border-red-600/20 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-4xl">🚗</span>
                      <div>
                        <h3 className="text-2xl font-black text-red-100">Véhicule Sélectionné</h3>
                        <p className="text-red-400/70 font-bold text-sm">Détails de l'unité commercialisée</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">🏷️ Marque</p>
                        <p className="text-2xl font-black text-red-100">{selectedCar?.make}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">🚗 Modèle</p>
                        <p className="text-2xl font-black text-red-100">{selectedCar?.model}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">📅 Année</p>
                        <p className="text-2xl font-black text-red-100">{selectedCar?.year}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">📊 Kilométrage</p>
                        <p className="text-2xl font-black text-red-100">{(selectedCar?.mileage || 0).toLocaleString()} KM</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">🔐 VIN</p>
                        <p className="text-lg font-black text-red-100 font-mono">{selectedCar?.vin}</p>
                      </div>
                    </div>
                  </div>

                  {/* CLIENT SUMMARY */}
                  <div className="glass-card border-2 border-red-600/20 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-4xl">👤</span>
                      <div>
                        <h3 className="text-2xl font-black text-red-100">Informations Client</h3>
                        <p className="text-red-400/70 font-bold text-sm">Coordonnées de l'acquéreur</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">📝 Prénom</p>
                        <p className="text-xl font-black text-red-100">{formData.first_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">📝 Nom</p>
                        <p className="text-xl font-black text-red-100">{formData.last_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">📱 Mobile</p>
                        <p className="text-xl font-black text-red-100">{formData.mobile1}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">🏠 Adresse</p>
                        <p className="text-lg font-black text-red-100">{formData.address || '—'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">🆔 Document</p>
                        <p className="text-lg font-black text-red-100">{formData.doc_type}: {formData.doc_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* FINANCIAL SUMMARY */}
                  <div className="glass-card border-2 border-red-600/20 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-4xl">💰</span>
                      <div>
                        <h3 className="text-2xl font-black text-red-100">Détails Financiers</h3>
                        <p className="text-red-400/70 font-bold text-sm">Résumé de la transaction</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 bg-slate-900/40 rounded-2xl border border-red-600/20">
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3">💵 Prix Total de Vente</p>
                        <div className="relative group">
                          <input
                            type="number"
                            value={totalPrice}
                            onChange={(e) => setTotalPrice(Number(e.target.value))}
                            className="w-full bg-slate-950 border-2 border-red-600/10 px-4 py-4 rounded-xl outline-none focus:border-red-600 font-black text-2xl text-red-100 transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400/70 font-black">DA</span>
                        </div>
                      </div>
                      <div className="p-6 bg-slate-900/40 rounded-2xl border border-red-600/20">
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3">✅ Montant Déjà Encaissé</p>
                        <div className="relative group">
                          <input
                            type="number"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(Number(e.target.value))}
                            className="w-full bg-slate-950 border-2 border-red-600/10 px-4 py-4 rounded-xl outline-none focus:border-red-600 font-black text-2xl text-emerald-400 transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400/70 font-black">DA</span>
                        </div>
                      </div>
                      <div className={`md:col-span-2 p-8 rounded-[2.5rem] border-2 transition-all duration-500 shadow-2xl ${balance > 0 ? 'bg-red-950/40 border-red-600/40' : 'bg-emerald-950/40 border-emerald-600/40'}`}>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3">📊 Solde Restant à Percevoir</p>
                        <div className="flex justify-between items-center">
                          <p className={`text-5xl font-black tracking-tighter ${balance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                            {balance.toLocaleString()} <span className="text-xl opacity-50">DA</span>
                          </p>
                          <div className={`h-24 w-24 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-xl border ${balance > 0 ? 'bg-red-600/20 border-red-600/40 text-red-500' : 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400 animate-pulse'}`}>
                            {balance > 0 ? '⏳' : '✅'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WIZARD FOOTER - BUTTONS */}
            <div className="px-12 py-8 bg-gradient-to-r from-red-950/90 to-slate-900/90 border-t border-red-600/20 flex justify-between items-center shrink-0">
              <button
                onClick={handleWizardPrevious}
                disabled={wizardStep === 1}
                className="px-10 py-4 rounded-xl bg-slate-900/50 border border-red-600/40 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-600/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>

              <div className="text-red-400/50 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
                Étape {wizardStep} / 3
              </div>

              {wizardStep === 3 ? (
                <button
                  onClick={handleFinalize}
                  disabled={isSubmitting}
                  className="group relative px-12 py-4 rounded-xl overflow-hidden font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 transition-all duration-300 group-hover:from-emerald-700 group-hover:via-emerald-500 group-hover:to-emerald-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <span className="relative z-10 text-white flex items-center gap-2">
                    {isSubmitting ? '⏳' : '✅'} {isSubmitting ? 'Finalisation...' : 'Valider la Vente'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleWizardNext}
                  className="group relative px-12 py-4 rounded-xl overflow-hidden font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <span className="relative z-10 text-white flex items-center gap-2">
                    Suivant <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
        )}
             


      {/* Sales History Modal */}
      {showSalesHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="relative glass-card w-full max-w-7xl h-[90vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-red-600/40">
            {/* Header */}
            <div className="px-12 py-10 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/20 shrink-0">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-[1.8rem] bg-red-600/30 border border-red-600/40 text-red-100 flex items-center justify-center text-4xl shadow-xl">📋</div>
                <div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-500 tracking-tight">Historique des Ventes</h2>
                  <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-1">Tous les véhicules vendus avec détails complets</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSalesHistory(false)} 
                className="h-14 w-14 glass-card border border-red-600/30 rounded-full flex items-center justify-center text-2xl hover:bg-red-600/20 text-red-100 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Sales Grid */}
            <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-10 bg-slate-950/20">
              {/* Search and Filters */}
              <div className="mb-10 flex flex-col md:flex-row gap-6 items-center">
                <div className="relative flex-1 group">
                  <input
                    type="text"
                    placeholder="🔍 Rechercher par voiture, client..."
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                    className="w-full px-8 py-4 rounded-[2rem] border border-red-600/30 bg-slate-900/40 text-red-100 placeholder-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all backdrop-blur-sm font-black"
                  />
                </div>
                <div className="flex gap-2 p-1.5 bg-red-950/40 rounded-2xl border border-red-600/30">
                  <button onClick={() => setSalesDebtFilter('all')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${salesDebtFilter === 'all' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-red-400/50 hover:text-red-400'}`}>Tous</button>
                  <button onClick={() => setSalesDebtFilter('completed')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${salesDebtFilter === 'completed' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-red-400/50 hover:text-red-400'}`}>Complétées</button>
                  <button onClick={() => setSalesDebtFilter('debts')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${salesDebtFilter === 'debts' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-red-400/50 hover:text-red-400'}`}>Dettes</button>
                </div>
              </div>

              {filteredSales.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <span className="text-8xl mb-4">📭</span>
                  <p className="text-red-400/70 font-black uppercase tracking-widest">Aucune vente enregistrée</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredSales.map((sale, idx) => (
                    <div 
                      key={sale.id} 
                      className="glass-card rounded-[3rem] border border-red-600/20 p-8 shadow-md hover:shadow-xl hover:border-red-600/40 transition-all duration-500 flex flex-col h-full group"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {/* Sale Header */}
                      <div className="flex justify-between items-start mb-6 pb-6 border-b border-red-600/20">
                        <div>
                          <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-1">Vente #</p>
                          <p className="text-lg font-black text-red-100">VNT-{sale.id?.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${sale.status === 'completed' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'bg-red-600/10 text-red-400 border border-red-600/20'}`}>
                          {sale.status === 'completed' ? 'Complétée' : 'Dette'}
                        </span>
                      </div>

                      {/* Info Sections */}
                      <div className="space-y-6 flex-grow">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-red-600/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🚗</div>
                          <div>
                            <p className="text-sm font-black text-red-100 line-clamp-1">{sale.car?.make} {sale.car?.model}</p>
                            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-1">Acheteur: {sale.first_name} {sale.last_name}</p>
                          </div>
                        </div>

                        <div className="bg-red-600/10 p-5 rounded-3xl border border-red-600/20 space-y-3">
                           <div className="flex justify-between items-center text-[10px] font-black text-red-400/70 uppercase">
                              <span>Prix Total</span>
                              <span className="text-red-100">{sale.total_price.toLocaleString()} DA</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-black text-red-400/70 uppercase">
                              <span>Montant Payé</span>
                              <span className="text-emerald-400">{sale.amount_paid.toLocaleString()} DA</span>
                           </div>
                           <div className="flex justify-between items-center pt-3 border-t border-red-600/20 text-sm font-black">
                              <span className="text-red-400/70 uppercase text-[10px]">Solde</span>
                              <span className={sale.balance > 0 ? 'text-red-500' : 'text-emerald-500'}>{sale.balance.toLocaleString()} DA</span>
                           </div>
                        </div>

                        {sale.creator_name && (
                           <div className="flex items-center gap-2 px-2">
                              <span className="h-2 w-2 rounded-full bg-red-500"></span>
                              <p className="text-[10px] font-black text-red-400/50 uppercase tracking-widest">Par: {sale.creator_name}</p>
                           </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-8 pt-6 border-t border-red-600/20 flex gap-2">
                        {sale.balance > 0 && (
                          <button 
                            onClick={() => handlePaymentModalOpen(sale)} 
                            className="flex-1 relative group overflow-hidden py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-800 via-orange-600 to-orange-800"></div>
                            <span className="relative z-10 text-white">💳 Payer</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handlePrintInvoiceNow(sale)} 
                          className="flex-1 relative group overflow-hidden py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                          <span className="relative z-10 text-white">🖨️ Facture</span>
                        </button>
                        <button 
                          onClick={() => setSelectedSaleForDetails(sale)} 
                          className="flex-1 relative group overflow-hidden py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                          <span className="relative z-10 text-white">👁️ Détails</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(sale.id!, sale.car_id)} 
                          className="h-12 w-12 relative group overflow-hidden rounded-xl transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                          <span className="relative z-10 text-white text-lg">🗑️</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-12 py-8 bg-gradient-to-r from-red-950/90 to-slate-900/90 border-t border-red-600/20 flex justify-end shrink-0">
              <button 
                onClick={() => setShowSalesHistory(false)} 
                className="px-12 py-4 rounded-2xl bg-slate-900/50 border border-red-600/40 text-red-400 font-black uppercase text-xs tracking-widest hover:bg-slate-900/80 transition-all"
              >
                Fermer l'Historique
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DEBT PAYMENT MODAL */}
      {paymentModal.sale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="relative glass-card w-full max-w-md sm:max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto border border-red-600/40">
            {/* Header */}
            <div className="sticky top-0 px-8 py-6 bg-gradient-to-r from-red-950/90 to-slate-900/90 text-white shrink-0 relative overflow-hidden border-b border-red-600/20">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_50%)]"></div>
              <h2 className="text-2xl sm:text-3xl font-black relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-500">💳 Paiement</h2>
              <p className="text-red-400 font-bold text-[11px] sm:text-xs mt-1 relative z-10 uppercase tracking-widest">Enregistrer un versement</p>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-6 bg-slate-950/20">
              {/* Sale Summary - Compact */}
              <div className="bg-slate-900/50 rounded-[2rem] p-6 border border-red-600/20 space-y-4">
                <div className="text-[11px] sm:text-xs font-black text-red-400/70 uppercase tracking-widest mb-2 border-b border-red-600/10 pb-2">📋 Résumé de la Vente</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/70 font-bold uppercase text-[10px]">Véhicule</span>
                    <span className="font-black text-red-100">{paymentModal.sale.car?.make} {paymentModal.sale.car?.model}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/70 font-bold uppercase text-[10px]">Client</span>
                    <span className="font-black text-red-100">{paymentModal.sale.last_name} {paymentModal.sale.first_name}</span>
                  </div>
                  <div className="border-t border-red-600/10 pt-3 mt-3 flex justify-between">
                    <span className="text-red-400/70 font-bold uppercase text-[10px]">Total</span>
                    <span className="font-black text-red-100">{paymentModal.sale.total_price.toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400/70 font-bold uppercase text-[10px]">Déjà Payé</span>
                    <span className="font-black text-emerald-400">{paymentModal.sale.amount_paid.toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between bg-red-600/10 p-3 rounded-xl border border-red-600/20">
                    <span className="text-red-400 font-black text-xs uppercase">Solde Actuel</span>
                    <span className="font-black text-red-500">{paymentModal.sale.balance.toLocaleString()} DA</span>
                  </div>
                </div>
              </div>

              {/* Payment Input */}
              <div className="space-y-3">
                <label className="block font-black text-red-400/70 uppercase tracking-widest text-[10px] ml-4">
                  💰 Montant du Versement
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min="0"
                    max={paymentModal.sale.balance}
                    value={paymentModal.paymentAmount}
                    onChange={(e) => setPaymentModal(prev => ({ 
                      ...prev, 
                      paymentAmount: Math.min(Number(e.target.value), paymentModal.sale?.balance || 0) 
                    }))}
                    className="w-full px-6 py-5 text-lg font-black bg-slate-900/50 border-2 border-red-600/20 rounded-[1.5rem] focus:outline-none focus:border-red-600 text-red-100 transition-all"
                    placeholder="Montant"
                  />
                  <span className="absolute right-6 top-1/2 transform -translate-y-1/2 text-red-400/70 font-black text-sm">DA</span>
                </div>
                <p className="text-[10px] text-red-400/50 font-black uppercase tracking-widest ml-4">
                  Maximum autorisé: {paymentModal.sale.balance.toLocaleString()} DA
                </p>
              </div>

              {/* Balance Preview - Compact */}
              <div className={`rounded-[2rem] p-6 border transition-all ${
                (paymentModal.sale.balance - paymentModal.paymentAmount) <= 0 
                  ? 'bg-emerald-600/10 border-emerald-600/30' 
                  : 'bg-red-600/10 border-red-600/30'
              }`}>
                <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3 border-b border-red-600/10 pb-2">Projection après paiement</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-red-100">Nouveau Cumul Payé:</span>
                    <span className="font-black text-emerald-400">{(paymentModal.sale.amount_paid + paymentModal.paymentAmount).toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between font-black text-base">
                    <span className="text-red-100 uppercase text-xs">Nouveau Solde Restant:</span>
                    <span className={`${
                      (paymentModal.sale.balance - paymentModal.paymentAmount) <= 0 
                        ? 'text-emerald-400' 
                        : 'text-red-500'
                    }`}>{Math.max(0, paymentModal.sale.balance - paymentModal.paymentAmount).toLocaleString()} DA</span>
                  </div>
                  {(paymentModal.sale.balance - paymentModal.paymentAmount) <= 0 && (
                    <div className="mt-3 px-4 py-2 bg-emerald-600/20 border border-emerald-600/30 rounded-xl text-emerald-400 font-black text-[10px] uppercase tracking-widest text-center shadow-lg animate-pulse">
                      ✨ VENTE COMPLÈTE ET PAYÉE
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 py-6 bg-gradient-to-r from-red-950/90 to-slate-900/90 border-t border-red-600/20 flex gap-4 justify-end shrink-0">
              <button
                onClick={() => setPaymentModal({ sale: null, paymentAmount: 0 })}
                disabled={isProcessingPayment}
                className="px-8 py-4 rounded-xl border border-red-600/40 bg-slate-900/50 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900/80 transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePayment}
                disabled={isProcessingPayment || paymentModal.paymentAmount <= 0}
                className="group relative px-10 py-4 rounded-xl overflow-hidden font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-xl disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                <span className="relative z-10 text-white flex items-center gap-2">
                  {isProcessingPayment ? '⏳' : '✅'} {isProcessingPayment ? 'Validation...' : 'Confirmer'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PREMIUM PRINT PREVIEW */}
      {printingRecord && (
        <div className="fixed inset-0 z-[250] bg-red-950/30 flex flex-col overflow-hidden animate-in fade-in">
           <div className="p-4 border-b border-red-600/30 bg-gradient-to-r from-red-950/90 to-slate-900/90 flex justify-between items-center shadow-sm z-10 print:hidden">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 rounded-xl bg-slate-900/50 border border-red-600/30 text-red-400 flex items-center justify-center text-xl">📄</div>
               <div>
                 <h3 className="font-black text-red-100 tracking-tight">Aperçu Avant Impression</h3>
                 <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">
                   {printType === 'receipt' ? 'Reçu de Versement' : 'Facture de Vente'}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-4">
               <button onClick={() => { setPrintingRecord(null); setPrintType(null); }} className="px-6 py-3 rounded-xl bg-red-950/30 text-red-400 font-black uppercase text-xs tracking-widest hover:bg-slate-900/70 transition-all border border-red-600/30">Fermer</button>
               <button onClick={() => window.print()} className="custom-gradient-btn px-8 py-3 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2"><span>🖨️</span> Imprimer</button>
             </div>
           </div>
           
           <div id="invoice-content" className="flex-grow overflow-y-auto p-8 flex justify-center bg-red-600/10 custom-scrollbar print:p-0 print:bg-black print:overflow-visible print:block">
             <div className="glass-card shadow-2xl shadow-red-600/30 w-full max-w-[850px] min-h-[1130px] p-20 flex flex-col print:shadow-none print:m-0 print:p-10 relative overflow-hidden h-fit mb-40 print:mb-0">
                
                {/* Premium Header */}
                <div className="flex justify-between items-start border-b-2 border-red-600/20 pb-12 mb-12">
                   <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-slate-900 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-xl">
                        {(showroomConfig?.logo_url || showroomConfig?.logo_data) ? (
                          <img src={showroomConfig.logo_url || showroomConfig.logo_data} className="w-full h-full object-contain" alt="Logo" />
                        ) : (
                          <span className="text-4xl">🏎️</span>
                        )}
                      </div>
                      <div>
                        <h1 className="text-2xl font-black text-red-100 uppercase tracking-tight">{showroomConfig?.name || 'AutoLux Premium'}</h1>
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em]">{showroomConfig?.slogan || 'Excellence Automobile'}</p>
                        <p className="text-[10px] font-bold text-red-400/70 mt-1">📍 {showroomConfig?.address || 'Alger, Algérie'}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <h2 className="text-3xl font-black text-red-100 uppercase tracking-tighter">
                        {printType === 'receipt' ? 'REÇU' : 'FACTURE'}
                      </h2>
                      <p className="text-red-400 font-black text-sm mt-2">#{printType === 'receipt' ? 'PAY' : 'VNT'}-{printingRecord.id?.slice(0,8).toUpperCase()}</p>
                      <p className="text-red-400/70 font-bold text-[10px] mt-1">{printingRecord.payment_date || (printingRecord.created_at ? new Date(printingRecord.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'))}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                   <div className="bg-red-600/20 p-8 rounded-[2.5rem] border border-red-600/20">
                      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-4">Destinataire / Client</p>
                      <p className="font-black text-xl text-red-100">{`${printingRecord.first_name} ${printingRecord.last_name}`}</p>
                      <p className="text-sm font-bold text-red-400/70 mt-2 leading-relaxed">{printingRecord.address || '—'}</p>
                      <div className="mt-4 pt-4 border-t border-red-600/30 grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[8px] font-black text-red-400/70 uppercase">Document</p>
                            <p className="font-bold text-xs">{printingRecord.doc_number || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-black text-red-400/70 uppercase">Téléphone</p>
                            <p className="font-bold text-xs">{printingRecord.mobile1 || 'N/A'}</p>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="p-8 border-2 border-slate-900 rounded-[2.5rem]">
                         <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3">Désignation Véhicule</p>
                         <p className="font-black text-lg text-red-100 uppercase">
                            {printingRecord.car?.model || (inventory.find(c => c.id === printingRecord.car_id)?.model) || 'Modèle Prestige'}
                         </p>
                         <p className="text-xs font-mono font-bold text-red-400/70 mt-1">VIN: {printingRecord.vin || printingRecord.car?.vin || 'NON_RENSEIGNÉ'}</p>
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
                      ) : (
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
                   <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Document Officiel - {showroomConfig?.name || 'AutoLux Prestige'} ERP System - 2026</p>
                </div>

             </div>
           </div>
        </div>
      )}

      {/* SALE DETAILS MODAL - ALL INFORMATIONS - REDESIGNED */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in">
          <div className="relative glass-card w-full max-w-6xl h-[95vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border-4 border-red-600/30">
            {/* Header - REDESIGNED with Premium Red Theme */}
            <div className="px-12 py-10 flex items-center justify-between bg-gradient-to-r from-red-950 via-red-900 to-black text-white shrink-0 shadow-lg relative overflow-hidden border-b border-red-600/40">
               <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_50%)]"></div>
               <div className="flex items-center gap-8 relative z-10">
                  <div className="h-20 w-20 rounded-[2.2rem] bg-red-600/30 border border-red-600/40 text-red-100 flex items-center justify-center text-5xl shadow-2xl">🚗</div>
                  <div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-500 tracking-tight">Dossier de Vente</h2>
                    <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em] mt-2">Référence: #VNT-{selectedSaleForDetails.id?.slice(0,8).toUpperCase()} • {new Date(selectedSaleForDetails.created_at).toLocaleDateString()}</p>
                  </div>
               </div>
               <button 
                onClick={() => setSelectedSaleForDetails(null)} 
                className="h-16 w-16 glass-card border border-red-600/30 rounded-full flex items-center justify-center text-3xl text-red-100 transition-all backdrop-blur-md relative z-10"
               >
                ✕
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-12 bg-slate-950/20">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  
                  {/* Left Column: Car & Images */}
                  <div className="space-y-12">
                     <section className="glass-card rounded-[3.5rem] p-10 border border-red-600/20 shadow-sm space-y-8">
                        <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
                           <span className="text-4xl">🚘</span>
                           <h3 className="text-2xl font-black text-red-100">Spécifications Véhicule</h3>
                        </div>
                        
                        {/* Car Images Grid */}
                        <div className="grid grid-cols-2 gap-4">
                           {(selectedSaleForDetails.car?.photo_urls && selectedSaleForDetails.car.photo_urls.length > 0) ? (
                              selectedSaleForDetails.car.photo_urls.map((url: string, i: number) => (
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
                           <DetailItem label="Marque & Modèle" value={`${selectedSaleForDetails.car?.make} ${selectedSaleForDetails.car?.model}`} large />
                           <DetailItem label="Année" value={selectedSaleForDetails.car?.year} />
                           <DetailItem label="Kilométrage" value={`${(selectedSaleForDetails.car?.mileage || 0).toLocaleString()} KM`} />
                           <DetailItem label="Châssis (VIN)" value={selectedSaleForDetails.car?.vin} />
                           <DetailItem label="Transmission" value={selectedSaleForDetails.car?.transmission} />
                           <DetailItem label="Énergie" value={selectedSaleForDetails.car?.fuel} />
                           <DetailItem label="Immatriculation" value={selectedSaleForDetails.car?.plate || '—'} />
                           <DetailItem label="Prix Showroom" value={`${(selectedSaleForDetails.car?.selling_price || 0).toLocaleString()} DA`} />
                        </div>
                     </section>

                     <section className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-[3.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 h-40 w-40 bg-red-600/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center gap-5 border-b border-red-600/20 pb-6 relative z-10">
                           <span className="text-4xl">💰</span>
                           <h3 className="text-2xl font-black uppercase tracking-tight">Résumé de Transaction</h3>
                        </div>
                        <div className="space-y-8 relative z-10">
                           <div className="flex justify-between items-end border-b border-red-600/30/10 pb-6">
                              <div>
                                 <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Prix de Vente Final</p>
                                 <p className="text-5xl font-black tracking-tighter">{selectedSaleForDetails.total_price.toLocaleString()} DA</p>
                              </div>
                              <span className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white text-red-400 shadow-xl`}>
                                 {selectedSaleForDetails.status === 'completed' ? 'Totalement Payée' : 'Dette Restante'}
                              </span>
                           </div>
                           <div className="grid grid-cols-2 gap-8">
                              <div className="bg-red-600/10 p-6 rounded-[2rem] border border-red-600/30/10">
                                 <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Total Encaissé</p>
                                 <p className="text-2xl font-black text-white">{selectedSaleForDetails.amount_paid.toLocaleString()} DA</p>
                              </div>
                              <div className="bg-red-500/20 p-6 rounded-[2rem] border border-red-600/30/10">
                                 <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Reste à percevoir</p>
                                 <p className={`text-2xl font-black ${selectedSaleForDetails.balance > 0 ? 'text-white underline' : 'text-white/40'}`}>{selectedSaleForDetails.balance.toLocaleString()} DA</p>
                              </div>
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
                        
                        <div className="flex items-center gap-8 bg-slate-900/40 p-8 rounded-[2.5rem] border border-red-600/20">
                           <div className="h-32 w-32 rounded-[3rem] bg-slate-900 border-4 border-red-600/30 shadow-xl overflow-hidden shrink-0 flex items-center justify-center text-6xl">
                              {selectedSaleForDetails.photo_url ? (
                                <img src={selectedSaleForDetails.photo_url} className="w-full h-full object-cover" alt="Client" />
                              ) : (
                                '👤'
                              )}
                           </div>
                           <div>
                              <p className="text-3xl font-black text-red-100 leading-none mb-3 tracking-tight">{selectedSaleForDetails.first_name} {selectedSaleForDetails.last_name}</p>
                              <div className="flex gap-3">
                              <span className="px-4 py-1.5 bg-red-600/20 text-red-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-600/30">{selectedSaleForDetails.profession || 'Profession non renseignée'}</span>
                              <span className="px-4 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-600/30">Client Enregistré</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 px-4">
                           <DetailItem label="Téléphone Principal" value={selectedSaleForDetails.mobile1} large />
                           <DetailItem label="Mobile Secondaire" value={selectedSaleForDetails.mobile2 || '—'} />
                           <DetailItem label="Adresse" value={selectedSaleForDetails.address || '—'} />
                           <DetailItem label="Date de Naissance" value={selectedSaleForDetails.dob || '—'} />
                           <DetailItem label="Lieu de Naissance" value={selectedSaleForDetails.pob || '—'} />
                           <DetailItem label="Sexe" value={selectedSaleForDetails.gender === 'M' ? 'Masculin' : 'Féminin'} />
                           <DetailItem label="NIF" value={selectedSaleForDetails.nif || '—'} />
                           <DetailItem label="RC" value={selectedSaleForDetails.rc || '—'} />
                        </div>
                     </section>

                     <section className="bg-gradient-to-br from-purple-500 to-red-600 text-white rounded-[3.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 h-40 w-40 bg-white/5 rounded-full blur-3xl"></div>
                        <div className="flex items-center gap-5 border-b border-red-600/20 pb-6 relative z-10">
                           <span className="text-4xl">📂</span>
                           <h3 className="text-2xl font-black tracking-tight uppercase">Dossier Juridique</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-8 relative z-10">
                           <div className="bg-red-600/10 p-8 rounded-[3rem] border border-red-600/20">
                              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">Pièce d'Identité ({selectedSaleForDetails.doc_type})</p>
                              <div className="flex justify-between items-center mb-8">
                                 <div>
                                    <p className="text-[8px] font-black text-white/50 uppercase">Numéro du Document</p>
                                    <p className="text-2xl font-black">{selectedSaleForDetails.doc_number}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[8px] font-black text-white/50 uppercase">Expiration</p>
                                    <p className="text-sm font-black text-red-300">{selectedSaleForDetails.expiry_date || 'N/A'}</p>
                                 </div>
                              </div>
                              
                              <div className="rounded-[2.5rem] overflow-hidden border-2 border-red-600/30/30 aspect-[16/10] bg-white group relative shadow-inner">
                                 {selectedSaleForDetails.scan_url ? (
                                   <>
                                     <img src={selectedSaleForDetails.scan_url} className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110" alt="Scan ID" />
                                     <a href={selectedSaleForDetails.scan_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                        <span className="px-8 py-4 bg-white text-red-400 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl">Ouvrir l'original ↗</span>
                                     </a>
                                   </>
                                 ) : (
                                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                      <span className="text-6xl">📄</span>
                                      <p className="text-[10px] font-black uppercase tracking-widest">Aucun scan disponible</p>
                                   </div>
                                 )}
                              </div>
                           </div>
                           
                           {selectedSaleForDetails.signature_url && (
                              <div className="bg-slate-900 p-8 rounded-[3rem] border border-red-600/30 shadow-xl">
                                 <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-4">Signature Digitale de l'Acquéreur</p>
                                 <div className="h-32 bg-white/5 rounded-2xl border-2 border-dashed border-red-600/20 flex items-center justify-center p-6">
                                    <img src={selectedSaleForDetails.signature_url} className="h-full object-contain brightness-0 invert" alt="Signature" />
                                 </div>
                              </div>
                           )}
                        </div>
                     </section>
                  </div>
               </div>
            </div>

            {/* Footer Actions - REDESIGNED */}
            <div className="px-12 py-10 bg-gradient-to-r from-red-950 via-red-900 to-black border-t border-red-600/20 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-8">
                  <div className="flex -space-x-5">
                     {[1,2,3].map(i => <div key={i} className="h-12 w-12 rounded-full border-4 border-red-600/30 bg-slate-900 flex items-center justify-center text-xl shadow-md">🛡️</div>)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest leading-none">Vérification de Conformité</p>
                    <p className="text-xs font-black text-red-200 mt-1">Dossier Certifié conforme par l'Administration</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={() => { setPrintingRecord(selectedSaleForDetails); setPrintType('sale'); }} 
                    className="px-10 py-4 rounded-xl bg-slate-900/50 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-600/20 transition-all border border-red-600/30"
                  >
                    🖨️ Facture A4
                  </button>
                  <button 
                    onClick={() => setSelectedSaleForDetails(null)} 
                    className="group relative px-10 py-4 rounded-xl overflow-hidden font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                    <span className="relative z-10 text-white flex items-center gap-2">
                      <span>✕</span>
                      <span>Quitter le Dossier</span>
                    </span>
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper pour Details ---
const DetailItem: React.FC<{ label: string; value: any; large?: boolean }> = ({ label, value, large }) => (
  <div className={large ? 'col-span-2' : ''}>
    <p className="text-[9px] font-black text-red-400/70 uppercase tracking-[0.1em] mb-1">{label}</p>
    <p className={`font-black text-red-100 tracking-tight ${large ? 'text-lg' : 'text-sm'}`}>{value || '—'}</p>
  </div>
);

  // Removed Inspector components as personalization is disabled

  // Removed Inspector components as personalization is disabled

// --- Sub-composants Helper ---
const Card: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="glass-card rounded-[4.5rem] border border-red-600/20 p-12 md:p-16 shadow-sm space-y-12">
    <div className="flex items-center gap-6 border-b border-red-600/20 pb-10">
      <div className="h-20 w-20 rounded-[2.2rem] bg-slate-900 text-white flex items-center justify-center text-4xl shadow-2xl">{icon}</div>
      <h4 className="text-3xl font-black text-red-100 tracking-tighter">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

const FlowInput: React.FC<{ label: string; name: string; value: any; onChange: any; type?: string; required?: boolean; placeholder?: string; icon?: string; options?: {v:string, l:string}[] }> = ({ label, name, value, onChange, type = 'text', required, placeholder, icon, options }) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-5">{label}</label>
    <div className="relative group/field">
      {icon && <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl opacity-10 group-focus-within/field:opacity-100 transition-all">{icon}</span>}
      {type === 'select' ? (
        <select 
          name={name} 
          value={value} 
          onChange={onChange} 
          className={`w-full bg-slate-900/30 border-2 border-red-600/20 ${icon ? 'pl-20' : 'px-10'} py-6 rounded-[2.2rem] outline-none focus:border-red-600 font-black text-red-100 transition-all appearance-none shadow-inner text-xl tracking-tight`}
        >
          {options?.map(o => <option key={o.v} value={o.v} className="bg-slate-950">{o.l}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          name={name} 
          value={value} 
          onChange={onChange} 
          required={required} 
          placeholder={placeholder} 
          className={`w-full bg-slate-900/30 border-2 border-red-600/20 ${icon ? 'pl-20' : 'px-10'} py-6 rounded-[2.2rem] outline-none focus:border-red-600 transition-all font-black text-red-100 shadow-inner text-xl tracking-tight placeholder:text-red-900/40`} 
        />
      )}
      {type === 'select' && <span className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none text-red-400/50">▼</span>}
    </div>
  </div>
);

// FormField component for wizard with emoji support
const FormField: React.FC<{ label: string; name: string; emoji: string; value: any; onChange: any; type?: string; required?: boolean; placeholder?: string; options?: {v:string, l:string}[] }> = ({ label, name, emoji, value, onChange, type = 'text', required, placeholder, options }) => (
  <div className="space-y-3">
    <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-3 flex items-center gap-2">
      <span>{emoji}</span>
      {label}
    </label>
    <div className="relative group/field">
      {type === 'select' ? (
        <select 
          name={name} 
          value={value || ''} 
          onChange={onChange} 
          required={required}
          className="w-full bg-slate-900/30 border-2 border-red-600/20 px-6 py-4 rounded-[2rem] outline-none focus:border-red-600 font-black text-red-100 transition-all appearance-none shadow-sm text-lg"
        >
          <option value="" className="bg-slate-950">Sélectionner...</option>
          {options?.map(o => <option key={o.v} value={o.v} className="bg-slate-950">{o.l}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          name={name} 
          value={value || ''} 
          onChange={onChange} 
          required={required} 
          placeholder={placeholder}
          className="w-full bg-slate-900/30 border-2 border-red-600/20 px-6 py-4 rounded-[2rem] outline-none focus:border-red-600 transition-all font-black text-red-100 shadow-sm text-lg placeholder:text-red-900/40"
        />
      )}
      {type === 'select' && <span className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-red-400/70 font-black">▼</span>}
    </div>
  </div>
);

