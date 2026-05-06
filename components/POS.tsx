
import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseRecord, Language, SaleRecord, InvoiceDesign, ElementPosition, CustomText } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { getCreatedByValue, uploadImageToBucket } from '../utils';

interface POSProps {
  lang: Language;
  userName?: string;
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
    title: 'FACTURE DE VENTE VÉHICULE',
    total: 'MONTANT TOTAL TRANSACTION',
    date: 'DATE DE VENTE',
    ref: 'FACTURE N°',
    safetyTitle: 'Informations Client',
    equipmentTitle: 'Détails du Véhicule',
    comfortTitle: 'Conditions Financières',
    partnerLabel: 'Acquéreur',
    carLabel: 'Unité Commercialisée'
  }
};

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
  
  // Payment Invoice States
  const [printingPaymentInvoice, setPrintingPaymentInvoice] = useState<(SaleRecord & { car?: PurchaseRecord }) | null>(null);
  const [paymentInvoiceDesign, setPaymentInvoiceDesign] = useState<InvoiceDesign>(defaultInvoiceDesign);
  const [personalizePaymentInvoice, setPersonalizePaymentInvoice] = useState(false);
  const [selectedPaymentElement, setSelectedPaymentElement] = useState<{ type: EditableField; id?: string }>({ type: 'none' });
  const [showroomConfig, setShowroomConfig] = useState<any>(null);

  // States pour le Studio d'Impression
  const [printingSale, setPrintingSale] = useState<SaleRecord | null>(null);
  const [printDesign, setPrintDesign] = useState<InvoiceDesign>(defaultInvoiceDesign);
  const [selectedElement, setSelectedElement] = useState<{ type: EditableField; id?: string }>({ type: 'none' });

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

  useEffect(() => {
    fetchAvailableCars();
    fetchShowroomConfig();
  }, []);

  const fetchShowroomConfig = async () => {
    try {
      const { data } = await supabase.from('showroom_config').select('*').single();
      setShowroomConfig(data);
    } catch (err) {
      console.log('Showroom config not found');
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
      
      if (error) {
        const { data: allData } = await supabase.from('purchases').select('*');
        setInventory(allData || []);
      } else {
        setInventory(data || []);
      }
    } catch (err) {
      console.error('Inventory Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const printPaymentInvoice = (sale: SaleRecord & { car?: PurchaseRecord }) => {
    setPrintingPaymentInvoice(sale);
    setPersonalizePaymentInvoice(false);
    setSelectedPaymentElement({ type: 'none' });
  };

  const generatePaymentInvoiceHTML = (sale: SaleRecord & { car?: PurchaseRecord }, design: InvoiceDesign) => {
    const showroomName = showroomConfig?.name || 'Auto Showroom';
    const showroomPhone = showroomConfig?.phone || '';
    const showroomAddress = showroomConfig?.address || '';
    const logoEmoji = showroomConfig?.logo_emoji || '🏎️';
    const logoData = showroomConfig?.logo_data;
    
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Facture de Paiement</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; padding: 0; }
            @page { size: A4; margin: 0; }
            .invoice { width: 210mm; height: 297mm; margin: 0 auto; background: white; padding: 20mm; box-sizing: border-box; display: flex; flex-direction: column; position: relative; }
            .header { display: flex; gap: 15px; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid ${design.primaryColor}; }
            .logo-img { width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px; background: linear-gradient(135deg, ${design.primaryColor}, ${design.accentColor}); color: white; font-weight: bold; flex-shrink: 0; overflow: hidden; }
            .logo-img img { width: 100%; height: 100%; object-fit: contain; }
            .header-content { flex: 1; }
            .showroom-name { font-size: 16px; font-weight: bold; color: ${design.primaryColor}; margin-bottom: 2px; }
            .showroom-contact { font-size: 9px; color: #666; line-height: 1.3; }
            .invoice-title { text-align: center; font-size: 18px; font-weight: bold; color: ${design.primaryColor}; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
            .date-row { text-align: center; font-size: 10px; color: ${design.secondaryColor}; margin-bottom: 18px; }
            .content { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 15px; }
            .section { }
            .section-title { font-size: 10px; font-weight: bold; color: white; background: ${design.primaryColor}; padding: 6px 10px; margin-bottom: 10px; border-radius: 3px; text-transform: uppercase; }
            .info-row { display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 10px; margin-bottom: 6px; }
            .info-label { font-weight: bold; color: #333; }
            .info-value { color: #666; }
            .financial-section { grid-column: 1 / -1; margin-top: 10px; }
            .financial { background: linear-gradient(135deg, ${design.primaryColor}15, ${design.accentColor}15); border-left: 4px solid ${design.accentColor}; padding: 12px; border-radius: 4px; }
            .financial-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 8px; }
            .financial-item { display: flex; justify-content: space-between; font-size: 11px; }
            .label { font-weight: 600; color: #333; }
            .amount { font-weight: bold; color: ${design.accentColor}; }
            .balance-row { border-top: 2px solid ${design.accentColor}; padding-top: 8px; margin-top: 8px; }
            .balance-item { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
            .balance-amount { color: ${sale.balance > 0 ? '#dc2626' : '#15803d'}; }
            .status-section { grid-column: 1 / -1; text-align: center; margin-top: 12px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .completed { background: #dcfce7; color: #15803d; }
            .debt { background: #fee2e2; color: #dc2626; }
            .footer { text-align: center; font-size: 8px; color: #999; padding-top: 15px; border-top: 1px solid #eee; margin-top: auto; }
            @media print {
              body { background: white; padding: 0; }
              .invoice { margin: 0; padding: 12mm; box-shadow: none; page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="logo-img">${logoData ? `<img src="${logoData}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />` : logoEmoji}</div>
              <div class="header-content">
                <div class="showroom-name">${showroomName}</div>
                <div class="showroom-contact">
                  ${showroomPhone ? `☎️ ${showroomPhone}<br>` : ''}
                  ${showroomAddress ? `📍 ${showroomAddress}` : ''}
                </div>
              </div>
            </div>

            <div class="invoice-title">${design.labels.title}</div>
            <div class="date-row">${new Date(sale.created_at!).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

            <div class="content">
              <div class="section">
                <div class="section-title">🚗 Véhicule</div>
                ${sale.car ? `
                  <div class="info-row">
                    <span class="info-label">Marque & Modèle:</span>
                    <span class="info-value">${sale.car.make} ${sale.car.model}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Année:</span>
                    <span class="info-value">${sale.car.year}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">VIN:</span>
                    <span class="info-value">${sale.car.vin}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Kilométrage:</span>
                    <span class="info-value">${sale.car.mileage.toLocaleString()} KM</span>
                  </div>
                ` : ''}
              </div>

              <div class="section">
                <div class="section-title">👤 Acheteur</div>
                <div class="info-row">
                  <span class="info-label">Nom:</span>
                  <span class="info-value">${sale.last_name} ${sale.first_name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Mobile:</span>
                  <span class="info-value">${sale.mobile1}</span>
                </div>
                ${sale.address ? `
                  <div class="info-row">
                    <span class="info-label">Adresse:</span>
                    <span class="info-value">${sale.address}</span>
                  </div>
                ` : ''}
              </div>

              <div class="financial-section">
                <div class="financial">
                  <div class="financial-row">
                    <div class="financial-item">
                      <span class="label">Prix Total:</span>
                      <span class="amount">${sale.total_price.toLocaleString('fr-FR')} DA</span>
                    </div>
                    <div class="financial-item">
                      <span class="label">Montant Payé:</span>
                      <span class="amount">${sale.amount_paid.toLocaleString('fr-FR')} DA</span>
                    </div>
                  </div>
                  <div class="balance-row">
                    <div class="balance-item">
                      <span>SOLDE:</span>
                      <span class="balance-amount">${sale.balance.toLocaleString('fr-FR')} DA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="status-section">
                <span class="status-badge ${sale.status === 'completed' ? 'completed' : 'debt'}">
                  ${sale.status === 'completed' ? '✅ COMPLÉTÉE' : ' '}
                </span>
              </div>
            </div>

            <div class="footer">
              Facture de Paiement - ${new Date().toLocaleDateString('fr-FR')} | ${showroomName}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintPaymentInvoiceNow = (sale: SaleRecord & { car?: PurchaseRecord }) => {
    const content = generatePaymentInvoiceHTML(sale, paymentInvoiceDesign);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      setTimeout(() => newWindow.print(), 250);
    }
    setPrintingPaymentInvoice(null);
  };

  const updatePaymentExtraText = (id: string, updates: Partial<CustomText>) => {
    setPaymentInvoiceDesign(prev => ({
      ...prev,
      extraTexts: prev.extraTexts.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const removePaymentExtraText = (id: string) => {
    setPaymentInvoiceDesign(prev => ({ ...prev, extraTexts: prev.extraTexts.filter(t => t.id !== id) }));
    setSelectedPaymentElement({ type: 'none' });
  };

  const addPaymentExtraText = () => {
    const newText: CustomText = { id: Date.now().toString(), content: 'Texte libre', x: 50, y: 50, fontSize: 12, color: '#000000', isBold: false };
    setPaymentInvoiceDesign(prev => ({ ...prev, extraTexts: [...prev.extraTexts, newText] }));
  };

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
      
      // Fetch creator info from profiles
      const creatorIds = [...new Set(sales?.map(s => s.created_by).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', creatorIds.length > 0 ? creatorIds : []);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const salesWithCars = sales?.map(s => ({
        ...s,
        car: purchasesMap.get(s.car_id),
        creator_name: profilesMap.get(s.created_by)?.full_name || profilesMap.get(s.created_by)?.username || s.created_by
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
      created_by: getCreatedByValue()
    };
    try {
      // Direct insert now that RLS is disabled
      const { data: insertedSale, error: saleError } = await supabase.from('sales').insert([saleData]).select();
      if (saleError) throw saleError;
      await supabase.from('purchases').update({ is_sold: true }).eq('id', selectedCar.id);
      if (insertedSale && insertedSale[0]) {
        setPrintingSale({ ...saleData, id: insertedSale[0].id, created_at: insertedSale[0].created_at, car: selectedCar } as any);
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

  const addExtraText = () => {
    const newText: CustomText = {
      id: `text-${Date.now()}`,
      content: 'Nouveau texte personnalisable',
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

  const removeExtraText = (id: string) => {
    setPrintDesign(prev => ({ ...prev, extraTexts: prev.extraTexts.filter(t => t.id !== id) }));
    setSelectedElement({ type: 'none' });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="h-20 w-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-8 font-black text-blue-600 uppercase tracking-widest text-[10px]">Ouverture du Showroom...</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-8 pb-10">
      
      {/* FACTURE PRINT STUDIO INTERACTIF */}
      {printingSale && (
        <div className="fixed inset-0 z-[150] bg-slate-100 flex overflow-hidden animate-in fade-in">
           {/* Inspecteur Latéral */}
           <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-lg">🎨</div>
                 <div>
                   <h3 className="font-black text-slate-900 tracking-tight">Studio AutoLux</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Éditeur de Facture</p>
                 </div>
               </div>
               <button onClick={() => setPrintingSale(null)} className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-xl hover:bg-red-50 transition-all">✕</button>
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
                  <InspectorGroup title={`Bloc ${selectedElement.type === 'client' ? 'Acheteur' : selectedElement.type === 'car' ? 'Véhicule' : 'Finance'}`} icon="📦">
                    <InspectorPosition 
                      value={selectedElement.type === 'client' ? printDesign.clientInfoPosition : selectedElement.type === 'car' ? printDesign.carInfoPosition : printDesign.financialsPosition} 
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
                    <button onClick={() => removeExtraText(selectedElement.id!)} className="w-full py-4 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4">Supprimer la mention</button>
                  </InspectorGroup>
                )}
             </div>

             <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-4">
                <button onClick={addExtraText} className="w-full bg-white border border-slate-200 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Ajouter Mention Libre +</button>
                <button onClick={() => window.print()} className="w-full custom-gradient-btn py-6 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl">Imprimer Dossier 🖨️</button>
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
                      {showroomConfig?.logo_data ? (
                        <img src={showroomConfig.logo_data} alt="Logo" className="h-24 w-24 object-contain shadow-xl rounded-[2rem]" />
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
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">{showroomConfig?.name || 'AutoLux'} Showroom - {showroomConfig?.slogan || 'Excellence & Prestige'}</p>
                   </div>
                </div>

                {/* Section Client Détails Interactif */}
                <div 
                  onClick={() => setSelectedElement({ type: 'client' })}
                  style={{ transform: `translate(${printDesign.clientInfoPosition.x}px, ${printDesign.clientInfoPosition.y}px)` }}
                  className={`grid grid-cols-2 gap-12 my-14 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 cursor-pointer transition-all ${selectedElement.type === 'client' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50' : 'hover:bg-slate-100'}`}
                >
                   <div className="space-y-6">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Acquéreur</p>
                        <p className="font-black text-xl">{printingSale.first_name} {printingSale.last_name}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Adresse & Résidence</p>
                        <p className="font-bold text-sm text-slate-700">{printingSale.address || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">NIF</p>
                          <p className="font-bold text-sm">{printingSale.nif || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">RC</p>
                          <p className="font-bold text-sm">{printingSale.rc || 'N/A'}</p>
                        </div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">N° Facture & Date</p>
                        <p className="font-black text-xl">#VNT-{printingSale.id?.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm font-bold text-slate-600 mt-1">{new Date(printingSale.created_at!).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Document Présenté</p>
                        <p className="font-bold text-sm">{printingSale.doc_type || 'Biometric Driver\'s License'} N°</p>
                        <p className="font-black text-lg">{printingSale.doc_number}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Contact Client</p>
                        <p className="font-black text-lg">{printingSale.mobile1}</p>
                      </div>
                   </div>
                </div>

                {/* Section Véhicule Détails Interactif */}
                <div 
                  onClick={() => setSelectedElement({ type: 'car' })}
                  style={{ transform: `translate(${printDesign.carInfoPosition.x}px, ${printDesign.carInfoPosition.y}px)` }}
                  className={`p-8 border-3 border-slate-900 rounded-[2.5rem] space-y-6 cursor-pointer transition-all ${selectedElement.type === 'car' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                   <div className="flex justify-between items-center gap-8">
                      <div className="flex-1">
                        <h4 className="text-2xl font-black tracking-tighter uppercase mb-4">Désignation de l'unité</h4>
                        <div className="h-0.5 w-32 bg-slate-900"></div>
                      </div>
                      <span className="px-6 py-2 bg-slate-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Certifié Showroom</span>
                   </div>
                   <div className="grid grid-cols-3 gap-8 mt-6">
                      <div>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">Modèle</p>
                         <p className="font-black text-lg leading-tight">{printingSale?.car?.make || 'N/A'} {printingSale?.car?.model || ''}</p>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">Année / Chassis</p>
                         <p className="font-black text-lg leading-tight">{printingSale?.car?.year || 'N/A'}</p>
                         <p className="font-bold text-sm text-slate-600">• {printingSale?.car?.vin?.slice(-6).toUpperCase() || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">Configuration</p>
                         <p className="font-black text-lg leading-tight uppercase">{printingSale?.car?.fuel || 'N/A'}</p>
                         <p className="font-bold text-sm text-slate-600">• {printingSale?.car?.transmission || 'N/A'}</p>
                      </div>
                   </div>
                </div>

                {/* Section Finance Interactif */}
                {/* Fixed duplicate style attribute by merging them into one */}
                <div 
                   onClick={() => setSelectedElement({ type: 'finance' })}
                   style={{ 
                     transform: `translate(${printDesign.financialsPosition.x}px, ${printDesign.financialsPosition.y}px)`,
                     borderColor: printDesign.primaryColor 
                   }}
                   className={`mt-12 border-t-4 pt-10 flex justify-between items-end cursor-pointer transition-all ${selectedElement.type === 'finance' ? 'ring-4 ring-blue-500 ring-offset-4 bg-blue-50/50' : 'hover:opacity-70'}`}
                >
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Versement Réalisé</p>
                         <p className="text-3xl font-black text-green-600 tracking-tighter">{printingSale.amount_paid.toLocaleString()} DA</p>
                      </div>
                      <div className="space-y-2">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Reste à Encaisser</p>
                         <p className="text-4xl font-black" style={{ color: printDesign.primaryColor }}>{printingSale.balance.toLocaleString()} DA</p>
                      </div>
                   </div>
                   <div className="h-32 w-56 border-3 border-slate-200 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center opacity-30">
                      <span className="text-[7px] font-black uppercase tracking-widest mb-10">Signature & Cachet</span>
                      <span className="text-lg font-black tracking-tighter opacity-20">{showroomConfig?.name || 'AUTOLUX'}</span>
                   </div>
                </div>

                {/* Textes Supplémentaires Mobiles */}
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

      {/* Catalogue & Catalogue - Reste du POS inchangé pour la stabilité */}
      {!isDrafting ? (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
          <div className="flex justify-between items-center px-4">
             <div>
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Catalogue de Vente</h3>
               <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 italic">UNITÉS DISPONIBLES EN SHOWROOM</p>
             </div>
             <div className="flex gap-4 items-center">
               <button onClick={fetchAllSales} className="px-10 py-4 rounded-2xl bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm">📋 Historique Ventes</button>
               {selectedCar && (
                 <button onClick={() => { setIsDrafting(true); setTotalPrice(selectedCar.sellingPrice || selectedCar.selling_price); }} className="custom-gradient-btn px-16 py-6 rounded-[2.5rem] text-white font-black uppercase text-xs tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 animate-in zoom-in-75">Ouvrir Dossier Client →</button>
               )}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
             {inventory.map(car => (
               <button key={car.id} onClick={() => setSelectedCar(car)} className={`group relative text-left p-8 rounded-[4rem] border-4 transition-all duration-500 ${selectedCar?.id === car.id ? 'border-blue-600 bg-white shadow-2xl scale-[1.05]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                 <div className="aspect-[16/10] rounded-[3.5rem] overflow-hidden mb-8 border border-slate-50 relative">
                    <img src={car.photo_urls?.[0] || 'https://via.placeholder.com/400x250?text=AutoLux'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]" />
                 </div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{car.make} {car.model}</h4>
                 <p className="text-sm font-black text-blue-500 mt-2 uppercase tracking-widest">{car.year} • {(car.sellingPrice || car.selling_price)?.toLocaleString()} DA</p>
                 {selectedCar?.id === car.id && <div className="absolute -top-4 -right-4 bg-blue-600 text-white h-12 w-12 rounded-full flex items-center justify-center text-xl shadow-2xl ring-4 ring-white animate-in zoom-in-75">✓</div>}
               </button>
             ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-16 animate-in fade-in slide-in-from-right-10 duration-500 max-w-[1400px] mx-auto w-full pb-20">
          <div className="flex-grow space-y-12 lg:w-2/3">
             <div className="flex items-center justify-between px-4">
                <button onClick={() => setIsDrafting(false)} className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">← Retour</button>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Vente de : {selectedCar?.model}</h3>
             </div>
             
             <div className="space-y-12">
                <Card title="Identité Acheteur" icon="👤">
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                      <div className="md:col-span-4 flex flex-col items-center">
                         <div className="relative group w-48 h-48">
                            <div className="w-full h-full rounded-[4.5rem] bg-slate-50 border-4 border-white shadow-2xl flex items-center justify-center text-7xl overflow-hidden group-hover:bg-blue-50 transition-colors">
                               {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : '👤'}
                            </div>
                            <label className="absolute bottom-2 right-2 h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 shadow-2xl transition-all">
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_url')} />
                               <span className="text-2xl">📷</span>
                            </label>
                         </div>
                      </div>
                      <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                         <FlowInput label="Prénom" name="first_name" value={formData.first_name} onChange={handleInputChange} required icon="🖋️" />
                         <FlowInput label="Nom" name="last_name" value={formData.last_name} onChange={handleInputChange} required icon="🖋️" />
                         <FlowInput label="Date de Naissance" name="dob" type="date" value={formData.dob} onChange={handleInputChange} icon="🎂" />
                         <FlowInput label="Sexe" name="gender" type="select" value={formData.gender} onChange={handleInputChange} options={[{v:'M', l:'Masculin'}, {v:'F', l:'Féminin'}]} />
                      </div>
                      <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                         <FlowInput label="Lieu de Naissance" name="pob" value={formData.pob} onChange={handleInputChange} icon="📍" />
                         <FlowInput label="Adresse Résidentielle" name="address" value={formData.address} onChange={handleInputChange} icon="🏠" />
                      </div>
                   </div>
                </Card>

                <Card title="Contact & Profession" icon="💼">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <FlowInput label="Profession" name="profession" value={formData.profession} onChange={handleInputChange} icon="🛠️" />
                      <FlowInput label="Mobile Principal" name="mobile1" value={formData.mobile1} onChange={handleInputChange} required icon="📱" />
                      <FlowInput label="Mobile Secondaire" name="mobile2" value={formData.mobile2} onChange={handleInputChange} icon="📞" />
                   </div>
                   <div className="mt-12 p-12 bg-slate-50 rounded-[3.5rem] grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <FlowInput label="NIF (Optionnel)" name="nif" value={formData.nif} onChange={handleInputChange} placeholder="Non obligatoire" />
                      <FlowInput label="RC (Optionnel)" name="rc" value={formData.rc} onChange={handleInputChange} placeholder="Non obligatoire" />
                      <FlowInput label="NIS (Optionnel)" name="nis" value={formData.nis} onChange={handleInputChange} placeholder="Non obligatoire" />
                      <FlowInput label="ART (Optionnel)" name="art" value={formData.art} onChange={handleInputChange} placeholder="Non obligatoire" />
                   </div>
                </Card>

                <Card title="Documents de Bord" icon="📜">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-8">
                         <FlowInput label="Type de Document" name="doc_type" type="select" value={formData.doc_type} onChange={handleInputChange} icon="🛂" options={[{v:"Permis", l:"Permis Biométrique"}, {v:"CNI", l:"Carte d'Identité"}, {v:"Passeport", l:"Passeport"}]} />
                         <FlowInput label="Numéro de Document" name="doc_number" value={formData.doc_number} onChange={handleInputChange} required icon="🆔" />
                         <div className="grid grid-cols-2 gap-6">
                            <FlowInput label="Émis le" name="issue_date" type="date" value={formData.issue_date} onChange={handleInputChange} />
                            <FlowInput label="Expire le" name="expiry_date" type="date" value={formData.expiry_date} onChange={handleInputChange} />
                         </div>
                      </div>
                      <div className="flex flex-col gap-6">
                        <div className="flex-grow border-4 border-dashed border-slate-100 rounded-[3.5rem] p-10 flex flex-col items-center justify-center relative group">
                           {formData.scan_url ? <img src={formData.scan_url} className="w-full h-full object-contain" /> : (
                             <div className="text-center opacity-20"><span className="text-6xl mb-4 block">📑</span><p className="text-[10px] font-black uppercase tracking-widest">Scanner ID / Permis</p></div>
                           )}
                           <label className="absolute bottom-6 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-blue-600 transition-all shadow-xl">
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'scan_url')} />
                              Importer Scan
                           </label>
                        </div>
                        <div className="h-44 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-8 flex flex-col items-center justify-center relative group">
                           {formData.signature_url ? <img src={formData.signature_url} className="w-full h-full object-contain" /> : (
                             <div className="text-center opacity-20"><span className="text-4xl mb-2 block">🖋️</span><p className="text-[10px] font-black uppercase tracking-widest">Signature Client</p></div>
                           )}
                           <label className="absolute bottom-4 px-8 py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-green-700 transition-all shadow-xl">
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'signature_url')} />
                              Capturer Signature
                           </label>
                        </div>
                      </div>
                   </div>
                </Card>
             </div>
          </div>

          <div className="lg:w-1/3">
             <div className="sticky top-12 space-y-10 animate-in slide-in-from-top-10 duration-700">
                <div className="bg-white rounded-[4.5rem] p-12 text-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] relative border border-slate-100">
                   <div className="flex items-center gap-6 mb-12 border-b border-slate-50 pb-10">
                      <div className="h-28 w-28 rounded-[3rem] overflow-hidden border-2 border-slate-100 shadow-lg">
                         <img src={selectedCar?.photos?.[0]} className="w-full h-full object-cover" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{selectedCar?.make} {selectedCar?.year}</p>
                         <h4 className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{selectedCar?.model}</h4>
                      </div>
                   </div>
                   
                   <div className="space-y-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Prix de Vente Final</label>
                        <div className="relative group">
                          <input type="number" value={totalPrice || ''} onChange={(e) => setTotalPrice(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 px-10 py-6 rounded-[2.5rem] outline-none focus:border-blue-500 font-black text-4xl text-slate-900 tracking-tighter transition-all" />
                          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">DA</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Montant Encaissé (Acompte)</label>
                        <div className="relative group">
                          <input type="number" value={amountPaid || ''} onChange={(e) => setAmountPaid(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 px-10 py-6 rounded-[2.5rem] outline-none focus:border-green-500 font-black text-4xl text-green-600 tracking-tighter transition-all" />
                          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">DA</span>
                        </div>
                      </div>

                      <div className={`p-10 rounded-[3.5rem] border-2 transition-all duration-1000 ${balance > 0 ? 'bg-red-50 border-red-100 shadow-red-500/5' : 'bg-green-50 border-green-100 shadow-green-500/5'}`}>
                         <div className="flex justify-between items-center">
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Solde à Payer</p>
                               <p className={`text-5xl font-black tracking-tighter ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                  {balance.toLocaleString()} <span className="text-sm font-bold opacity-30">DA</span>
                               </p>
                            </div>
                            <div className={`h-16 w-16 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-2xl transition-all duration-700 ${balance > 0 ? 'bg-red-500 text-white' : 'bg-green-600 text-white animate-bounce'}`}>
                               {balance > 0 ? '⏳' : '✅'}
                            </div>
                         </div>
                      </div>
                   </div>

                   <button onClick={handleFinalize} disabled={isSubmitting} className="w-full mt-14 py-8 rounded-[3rem] font-black uppercase text-sm tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 custom-gradient-btn text-white">
                     {isSubmitting ? 'Synchronisation Cloud...' : 'Confirmer la Vente 💎'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-7xl h-[90vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-12 py-10 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-[1.8rem] bg-blue-600 text-white flex items-center justify-center text-4xl shadow-xl">📋</div>
                <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tight">Historique des Ventes</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tous les véhicules vendus avec détails complets</p>
                </div>
              </div>
              <button onClick={() => setShowSalesHistory(false)} className="h-14 w-14 bg-white border border-slate-100 rounded-full flex items-center justify-center text-2xl hover:bg-red-50 text-slate-400 transition-all">✕</button>
            </div>

            {/* Sales Grid */}
            <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-10">
              {/* Search and Filters */}
              <div className="mb-8 space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="🔍 Rechercher par voiture (marque, modèle) ou client..."
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                    className="flex-1 px-6 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-600 font-bold"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSalesDebtFilter('all')}
                    className={`px-6 py-2 rounded-full font-black text-sm transition-all ${
                      salesDebtFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📊 Tous
                  </button>
                  <button
                    onClick={() => setSalesDebtFilter('completed')}
                    className={`px-6 py-2 rounded-full font-black text-sm transition-all ${
                      salesDebtFilter === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ✅ Complétées
                  </button>
                  <button
                    onClick={() => setSalesDebtFilter('debts')}
                    className={`px-6 py-2 rounded-full font-black text-sm transition-all ${
                      salesDebtFilter === 'debts'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ⏳ Dettes
                  </button>
                </div>
              </div>

              {filteredSales.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <span className="text-8xl mb-4">📭</span>
                  <p className="text-slate-400 font-black uppercase tracking-widest">Aucune vente enregistrée</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredSales.map(sale => (
                    <div key={sale.id} className="bg-white rounded-[3rem] border-2 border-slate-100 p-8 shadow-md hover:shadow-xl transition-all duration-500 flex flex-col h-full">
                      {/* Sale Number & Date */}
                      <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facture N°</p>
                          <p className="text-lg font-black text-slate-900 mt-1">#VNT-{sale.id?.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de Vente</p>
                          <p className="text-sm font-bold text-slate-600 mt-1">{new Date(sale.created_at!).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>

                      {/* Created By */}
                      {sale.created_by && (
                        <div className="mb-6 pb-6 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">👤 Créé par</p>
                          <p className="text-sm font-black text-slate-700">{(sale as any).creator_name || sale.created_by}</p>
                        </div>
                      )}

                      {/* Vehicle Information */}
                      {sale.car && (
                        <div className="mb-6 pb-6 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🚗 Véhicule</p>
                          <div className="space-y-2">
                            <p className="text-lg font-black text-slate-900">{sale.car.make} {sale.car.model}</p>
                            <div className="flex gap-4 text-sm font-bold text-slate-600">
                              <span>Année: {sale.car.year}</span>
                              <span>•</span>
                              <span>VIN: {sale.car.vin?.slice(-6).toUpperCase()}</span>
                            </div>
                            <div className="text-xs font-bold text-slate-500 mt-2">
                              {sale.car.fuel} • {sale.car.transmission} • {sale.car.mileage.toLocaleString()} KM
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Client Information */}
                      <div className="mb-6 pb-6 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">👤 Client</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{sale.last_name} {sale.first_name}</p>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-600"><span className="font-bold">Mobile:</span> {sale.mobile1}</p>
                            {sale.mobile2 && <p className="text-slate-600"><span className="font-bold">Mobile 2:</span> {sale.mobile2}</p>}
                            {sale.address && <p className="text-slate-600"><span className="font-bold">Adresse:</span> {sale.address}</p>}
                            {sale.profession && <p className="text-slate-600"><span className="font-bold">Profession:</span> {sale.profession}</p>}
                          </div>
                          {(sale.nif || sale.rc) && (
                            <div className="text-xs text-slate-600 mt-2">
                              {sale.nif && <p><span className="font-bold">NIF:</span> {sale.nif}</p>}
                              {sale.rc && <p><span className="font-bold">RC:</span> {sale.rc}</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Financial Information */}
                      <div className="mb-6 pb-6 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">💰 Financier</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-600">Prix Total:</span>
                            <span className="text-lg font-black text-blue-600">{sale.total_price.toLocaleString()} DA</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-600">Montant Payé:</span>
                            <span className="text-lg font-black text-green-600">{sale.amount_paid.toLocaleString()} DA</span>
                          </div>
                          <div className={`flex justify-between items-center pt-3 border-t ${sale.balance > 0 ? 'border-red-100' : 'border-green-100'}`}>
                            <span className="text-sm font-bold text-slate-600">Solde:</span>
                            <span className={`text-lg font-black ${sale.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{sale.balance.toLocaleString()} DA</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Statut</p>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${sale.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {sale.status === 'completed' ? '✅ Complétée' : '⏳ Detteurs'}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {sale.balance > 0 && (
                            <button 
                              onClick={() => handlePaymentModalOpen(sale)}
                              className="px-4 py-3 rounded-2xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg"
                              title="Payer une partie ou la totalité de la dette"
                            >
                              💳 Payer
                            </button>
                          )}
                          <button 
                            onClick={() => printPaymentInvoice(sale)}
                            className="px-4 py-3 rounded-2xl bg-green-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg"
                            title="Imprimer facture de paiement"
                          >
                            🖨️ Facture
                          </button>
                          <button 
                            onClick={() => {
                              // Use car data already attached to sale from fetchAllSales
                              setPrintingSale(sale);
                            }}
                            className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                            title="Voir détails facture"
                          >
                            👁️ Détails
                          </button>
                          <button 
                            onClick={() => handleDeleteSale(sale.id!, sale.car_id)}
                            className="px-4 py-3 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
                            title="Supprimer cette vente"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setShowSalesHistory(false)} className="px-10 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBT PAYMENT MODAL */}
      {paymentModal.sale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white w-full max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-orange-600 to-orange-700 text-white shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black">💳 Paiement</h2>
              <p className="text-orange-100 font-bold text-[11px] sm:text-xs mt-1">Enregistrer un paiement</p>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
              {/* Sale Summary - Compact */}
              <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 space-y-2">
                <div className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-2">📋 Résumé</div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-bold">Véhicule:</span>
                    <span className="font-black text-slate-900 text-right text-[10px] sm:text-sm">{paymentModal.sale.car?.make} {paymentModal.sale.car?.model}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-bold">Client:</span>
                    <span className="font-black text-slate-900 text-right text-[10px] sm:text-sm">{paymentModal.sale.last_name} {paymentModal.sale.first_name}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                    <span className="text-slate-600 font-bold">Total:</span>
                    <span className="font-black text-blue-600">{paymentModal.sale.total_price.toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">Payé:</span>
                    <span className="font-black text-green-600">{paymentModal.sale.amount_paid.toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between bg-red-50 p-2 rounded-lg mt-1">
                    <span className="text-red-700 font-black text-xs">Solde:</span>
                    <span className="font-black text-red-600">{paymentModal.sale.balance.toLocaleString()} DA</span>
                  </div>
                </div>
              </div>

              {/* Payment Input */}
              <div className="space-y-2">
                <label className="block font-black text-slate-900 text-xs sm:text-sm">
                  💰 Montant à Payer
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={paymentModal.sale.balance}
                    value={paymentModal.paymentAmount}
                    onChange={(e) => setPaymentModal(prev => ({ 
                      ...prev, 
                      paymentAmount: Math.min(Number(e.target.value), paymentModal.sale?.balance || 0) 
                    }))}
                    className="w-full px-4 sm:px-5 py-3 text-sm sm:text-base font-black border-2 border-orange-300 rounded-xl sm:rounded-2xl focus:outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
                    placeholder="Montant"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-black text-xs sm:text-sm">DA</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold">
                  Max: {paymentModal.sale.balance.toLocaleString()} DA
                </p>
              </div>

              {/* Balance Preview - Compact */}
              <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
                (paymentModal.sale.balance - paymentModal.paymentAmount) <= 0 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Après Paiement</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Nouveau Payé:</span>
                    <span className="font-black text-green-600">{(paymentModal.sale.amount_paid + paymentModal.paymentAmount).toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between font-black text-xs sm:text-sm">
                    <span>Nouveau Solde:</span>
                    <span className={`${
                      (paymentModal.sale.balance - paymentModal.paymentAmount) <= 0 
                        ? 'text-green-700' 
                        : 'text-orange-700'
                    }`}>{Math.max(0, paymentModal.sale.balance - paymentModal.paymentAmount).toLocaleString()} DA</span>
                  </div>
                  {(paymentModal.sale.balance - paymentModal.paymentAmount) <= 0 && (
                    <div className="mt-2 px-3 py-1.5 bg-green-200 rounded text-green-800 font-black text-[9px] text-center">
                      ✨ COMPLÈTE ET PAYÉE
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end shrink-0">
              <button
                onClick={() => setPaymentModal({ sale: null, paymentAmount: 0 })}
                disabled={isProcessingPayment}
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-2xl border border-slate-300 text-slate-900 font-black text-[11px] sm:text-xs uppercase tracking-wide hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePayment}
                disabled={isProcessingPayment || paymentModal.paymentAmount <= 0}
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-2xl bg-gradient-to-r from-orange-600 to-orange-700 text-white font-black text-[11px] sm:text-xs uppercase tracking-wide hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? '⏳' : '✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT INVOICE MODAL */}
      {printingPaymentInvoice && !personalizePaymentInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-12 py-10 bg-white border-b border-slate-100">
              <h2 className="text-4xl font-black text-slate-900">🖨️ Imprimer Facture de Paiement</h2>
              <p className="text-slate-400 font-bold text-sm mt-2">Choisissez comment imprimer votre facture</p>
            </div>

            <div className="px-12 py-10 space-y-6">
              <div className="bg-slate-50 rounded-[2rem] p-8 space-y-4">
                <h3 className="text-lg font-black text-slate-900">📋 Résumé Facture</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 font-bold">Véhicule</p>
                    <p className="font-black text-slate-900">{printingPaymentInvoice.car?.make} {printingPaymentInvoice.car?.model}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold">Client</p>
                    <p className="font-black text-slate-900">{printingPaymentInvoice.last_name} {printingPaymentInvoice.first_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold">Montant Total</p>
                    <p className="font-black text-blue-600">{printingPaymentInvoice.total_price.toLocaleString()} DA</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold">Solde</p>
                    <p className={`font-black ${printingPaymentInvoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {printingPaymentInvoice.balance.toLocaleString()} DA
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handlePrintPaymentInvoiceNow(printingPaymentInvoice)}
                  className="w-full px-8 py-6 rounded-[2rem] bg-green-600 hover:bg-green-700 text-white font-black uppercase text-sm shadow-lg transition-all"
                >
                  ✅ Imprimer avec Design Courant
                </button>

                <button
                  onClick={() => setPersonalizePaymentInvoice(true)}
                  className="w-full px-8 py-6 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-sm shadow-lg transition-all"
                >
                  ✏️ Personnaliser Avant d'Imprimer
                </button>

                <button
                  onClick={() => setPrintingPaymentInvoice(null)}
                  className="w-full px-8 py-6 rounded-[2rem] bg-slate-200 hover:bg-slate-300 text-slate-900 font-black uppercase text-sm transition-all"
                >
                  ✕ Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT INVOICE CUSTOMIZATION STUDIO */}
      {printingPaymentInvoice && personalizePaymentInvoice && (
        <div className="fixed inset-0 z-[150] bg-slate-100 flex overflow-hidden animate-in fade-in">
          {/* Side Inspector */}
          <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-lg">🎨</div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">Studio Facture</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paiement</p>
                </div>
              </div>
              <button onClick={() => setPersonalizePaymentInvoice(false)} className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-xl hover:bg-red-50 transition-all">✕</button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {selectedPaymentElement.type === 'none' && (
                <div className="py-20 text-center space-y-6 opacity-40">
                  <span className="text-7xl">🖱️</span>
                  <p className="text-sm font-black uppercase tracking-widest leading-relaxed">Cliquer sur un élément pour le modifier</p>
                  <button onClick={addPaymentExtraText} className="custom-gradient-btn px-8 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl w-full">Ajouter Texte +</button>
                </div>
              )}

              {selectedPaymentElement.type === 'logo' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-4 text-slate-900"><span className="text-2xl">🏎️</span><h4 className="text-[10px] font-black uppercase tracking-widest">Logo</h4></div>
                  <InspectorGroup title="Position Logo" icon="🖱️">
                    <InspectorPosition value={paymentInvoiceDesign.logoPosition} onChangeX={(v) => setPaymentInvoiceDesign({...paymentInvoiceDesign, logoPosition: {...paymentInvoiceDesign.logoPosition, x: v}})} onChangeY={(v) => setPaymentInvoiceDesign({...paymentInvoiceDesign, logoPosition: {...paymentInvoiceDesign.logoPosition, y: v}})} />
                  </InspectorGroup>
                  <InspectorGroup title="Padding En-Tête" icon="📏">
                    <InspectorRange label="Espace" value={paymentInvoiceDesign.headerPadding} min={0} max={50} onChange={(v) => setPaymentInvoiceDesign({...paymentInvoiceDesign, headerPadding: v})} />
                  </InspectorGroup>
                </div>
              )}

              {selectedPaymentElement.type === 'title' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-4 text-slate-900"><span className="text-2xl">🖋️</span><h4 className="text-[10px] font-black uppercase tracking-widest">Titre</h4></div>
                  <InspectorGroup title="Texte Titre" icon="📝">
                    <input type="text" value={paymentInvoiceDesign.labels.title} onChange={(e) => setPaymentInvoiceDesign({...paymentInvoiceDesign, labels: {...paymentInvoiceDesign.labels, title: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl outline-none font-bold focus:border-blue-500" />
                  </InspectorGroup>
                  <InspectorGroup title="Couleur" icon="🎨">
                    <InspectorColor value={paymentInvoiceDesign.primaryColor} onChange={(v) => setPaymentInvoiceDesign({...paymentInvoiceDesign, primaryColor: v})} />
                  </InspectorGroup>
                </div>
              )}

              {selectedPaymentElement.type === 'extra' && selectedPaymentElement.id && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-4 text-slate-900"><span className="text-2xl">✍️</span><h4 className="text-[10px] font-black uppercase tracking-widest">Texte Libre</h4></div>
                  <InspectorGroup title="Contenu" icon="📄">
                    <textarea value={paymentInvoiceDesign.extraTexts.find(t=>t.id===selectedPaymentElement.id)?.content || ''} onChange={(e) => updatePaymentExtraText(selectedPaymentElement.id!, {content: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl outline-none font-bold focus:border-blue-500" rows={3} />
                  </InspectorGroup>
                  <InspectorGroup title="Position" icon="🖱️">
                    <InspectorPosition value={{x: paymentInvoiceDesign.extraTexts.find(t=>t.id===selectedPaymentElement.id)?.x || 0, y: paymentInvoiceDesign.extraTexts.find(t=>t.id===selectedPaymentElement.id)?.y || 0}} onChangeX={(v) => updatePaymentExtraText(selectedPaymentElement.id!, {x: v})} onChangeY={(v) => updatePaymentExtraText(selectedPaymentElement.id!, {y: v})} />
                  </InspectorGroup>
                  <InspectorGroup title="Taille & Couleur" icon="✨">
                    <InspectorRange label="Taille" value={paymentInvoiceDesign.extraTexts.find(t=>t.id===selectedPaymentElement.id)?.fontSize || 12} min={8} max={32} onChange={(v) => updatePaymentExtraText(selectedPaymentElement.id!, {fontSize: v})} />
                    <InspectorColor value={paymentInvoiceDesign.extraTexts.find(t=>t.id===selectedPaymentElement.id)?.color || '#000000'} onChange={(v) => updatePaymentExtraText(selectedPaymentElement.id!, {color: v})} />
                  </InspectorGroup>
                  <button onClick={() => removePaymentExtraText(selectedPaymentElement.id!)} className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4 hover:bg-red-100 transition-all">Supprimer</button>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <button onClick={addPaymentExtraText} className="w-full bg-white border border-slate-200 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Ajouter Texte +</button>
              <button onClick={() => { setPersonalizePaymentInvoice(false); }} className="w-full custom-gradient-btn py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl">Enregistrer Modifications ✅</button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-grow overflow-y-auto p-12 flex justify-center bg-slate-200/50 custom-scrollbar">
            <div className="relative w-full max-w-[600px]">
              <div 
                className="bg-white shadow-2xl w-full p-10 flex flex-col print:shadow-none print:m-0 print:p-8 relative overflow-hidden h-fit mb-40 transition-all duration-300"
                style={{
                  transform: `scale(${0.85})`
                }}
              >
                {/* Interactive Invoice Preview */}
                <div className="space-y-4">
                  {/* Header with Logo */}
                  <div 
                    className="flex items-center gap-3 pb-4 border-b-4 cursor-pointer hover:bg-blue-50/50 p-3 rounded-lg transition-all group"
                    onClick={() => setSelectedPaymentElement({ type: 'logo' })}
                    style={{
                      borderBottomColor: paymentInvoiceDesign.primaryColor,
                      transform: `translate(${paymentInvoiceDesign.logoPosition.x}px, ${paymentInvoiceDesign.logoPosition.y}px)`
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-lg" style={{background: `linear-gradient(135deg, ${paymentInvoiceDesign.primaryColor}, ${paymentInvoiceDesign.accentColor})`}}>
                      {showroomConfig?.logo_emoji || '🏎️'}
                    </div>
                    <div className="text-sm">
                      <div className="font-bold" style={{color: paymentInvoiceDesign.primaryColor}}>{showroomConfig?.name || 'Auto Showroom'}</div>
                      <div className="text-xs text-gray-500">{showroomConfig?.phone || ''}</div>
                    </div>
                    {selectedPaymentElement.type === 'logo' && <div className="absolute -right-2 -top-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                  </div>

                  {/* Title */}
                  <div 
                    className="text-center py-3 px-4 rounded-lg cursor-pointer hover:bg-blue-50 transition-all group relative"
                    onClick={() => setSelectedPaymentElement({ type: 'title' })}
                  >
                    <div className="font-bold text-lg uppercase tracking-wider" style={{color: paymentInvoiceDesign.primaryColor}}>{paymentInvoiceDesign.labels.title}</div>
                    <div className="text-xs" style={{color: paymentInvoiceDesign.secondaryColor}}>
                      {new Date(printingPaymentInvoice.created_at!).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {selectedPaymentElement.type === 'title' && <div className="absolute -right-2 -top-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                  </div>

                  {/* Vehicle & Buyer Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="font-bold mb-2">🚗 Véhicule</div>
                      <div className="space-y-1">
                        <div><span className="font-bold">Marque:</span> {printingPaymentInvoice.car?.make} {printingPaymentInvoice.car?.model}</div>
                        <div><span className="font-bold">Année:</span> {printingPaymentInvoice.car?.year}</div>
                        <div><span className="font-bold">VIN:</span> {printingPaymentInvoice.car?.vin}</div>
                        <div><span className="font-bold">KM:</span> {printingPaymentInvoice.car?.mileage.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="font-bold mb-2">👤 Acheteur</div>
                      <div className="space-y-1">
                        <div><span className="font-bold">Nom:</span> {printingPaymentInvoice.last_name} {printingPaymentInvoice.first_name}</div>
                        <div><span className="font-bold">Mobile:</span> {printingPaymentInvoice.mobile1}</div>
                        <div><span className="font-bold">Adresse:</span> {printingPaymentInvoice.address?.slice(0, 20)}...</div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Section */}
                  <div 
                    className="p-4 rounded-lg cursor-pointer hover:opacity-80 transition-all relative"
                    style={{background: `linear-gradient(135deg, ${paymentInvoiceDesign.primaryColor}15, ${paymentInvoiceDesign.accentColor}15)`, borderLeft: `4px solid ${paymentInvoiceDesign.accentColor}`}}
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <div className="text-gray-500">Prix Total</div>
                        <div className="font-bold" style={{color: paymentInvoiceDesign.accentColor}}>{printingPaymentInvoice.total_price.toLocaleString()} DA</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Montant Payé</div>
                        <div className="font-bold" style={{color: paymentInvoiceDesign.accentColor}}>{printingPaymentInvoice.amount_paid.toLocaleString()} DA</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-300 pt-3 font-bold">
                      <div className="flex justify-between">
                        <span>SOLDE:</span>
                        <span style={{color: printingPaymentInvoice.balance > 0 ? '#dc2626' : '#15803d'}}>{printingPaymentInvoice.balance.toLocaleString()} DA</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="text-center py-2">
                    <span className="inline-block px-4 py-2 rounded-full text-xs font-bold" style={{background: printingPaymentInvoice.status === 'completed' ? '#dcfce7' : '#fee2e2', color: printingPaymentInvoice.status === 'completed' ? '#15803d' : '#dc2626'}}>
                      {printingPaymentInvoice.status === 'completed' ? '✅ COMPLÉTÉE' : ' '}
                    </span>
                  </div>

                  {/* Custom Text Elements */}
                  {paymentInvoiceDesign.extraTexts.map((txt, idx) => (
                    <div
                      key={txt.id}
                      onClick={() => setSelectedPaymentElement({ type: 'extra', id: txt.id })}
                      className="p-3 rounded-lg cursor-pointer hover:bg-blue-50 transition-all relative border-2 border-dashed border-gray-200 hover:border-blue-400"
                      style={{
                        fontSize: `${txt.fontSize * 0.7}px`,
                        color: txt.color,
                        fontWeight: txt.isBold ? '900' : '500',
                        transform: `translate(${txt.x * 0.85}px, ${txt.y * 0.85}px)`
                      }}
                    >
                      {txt.content}
                      {selectedPaymentElement.id === txt.id && <div className="absolute -right-2 -top-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Button */}
              <div className="sticky bottom-8 text-center mt-4">
                <button 
                  onClick={() => handlePrintPaymentInvoiceNow(printingPaymentInvoice)}
                  className="custom-gradient-btn px-12 py-4 rounded-2xl text-white font-black uppercase text-sm tracking-widest shadow-2xl hover:scale-105 transition-all"
                >
                  🖨️ Imprimer Facture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

// --- Sub-composants Helper ---
const Card: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-[4.5rem] border border-slate-100 p-12 md:p-16 shadow-sm space-y-12">
    <div className="flex items-center gap-6 border-b border-slate-50 pb-10"><div className="h-20 w-20 rounded-[2.2rem] bg-slate-900 text-white flex items-center justify-center text-4xl shadow-2xl">{icon}</div><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{title}</h4></div>
    <div>{children}</div>
  </div>
);
const FlowInput: React.FC<{ label: string; name: string; value: any; onChange: any; type?: string; required?: boolean; placeholder?: string; icon?: string; options?: {v:string, l:string}[] }> = ({ label, name, value, onChange, type = 'text', required, placeholder, icon, options }) => (
  <div className="space-y-4">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">{label}</label>
    <div className="relative group/field">
      {icon && <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl opacity-10 group-focus-within/field:opacity-100 transition-all">{icon}</span>}
      {type === 'select' ? (
        <select name={name} value={value} onChange={onChange} className={`w-full bg-slate-50 border-2 border-slate-100 ${icon ? 'pl-20' : 'px-10'} py-6 rounded-[2.2rem] outline-none focus:border-blue-500 font-black text-slate-800 transition-all appearance-none shadow-inner text-xl tracking-tight`}>
          {options?.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} className={`w-full bg-slate-50 border-2 border-slate-100 ${icon ? 'pl-20' : 'px-10'} py-6 rounded-[2.2rem] outline-none focus:border-blue-500 transition-all font-black text-slate-800 shadow-inner text-xl tracking-tight`} />
      )}
      {type === 'select' && <span className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</span>}
    </div>
  </div>
);