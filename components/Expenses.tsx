
import React, { useState, useEffect } from 'react';
import { Expense, Language, PurchaseRecord } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';
import { getCreatedByValue } from '../utils';

interface VehicleExpense {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  vehicle_make: string;
  vehicle_model: string;
  name: string;
  cost: number;
  date: string;
  note?: string;
  created_at?: string;
}

interface ExpensesProps {
  lang: Language;
  userName?: string;
}

export const Expenses: React.FC<ExpensesProps> = ({ lang, userName }) => {
  const t = translations[lang];
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingVehicleExpense, setEditingVehicleExpense] = useState<VehicleExpense | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'vehicles'>('vehicles');
  const [vehicles, setVehicles] = useState<PurchaseRecord[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [expandedVehicles, setExpandedVehicles] = useState<string[]>([]);
  const [showCreatedDate, setShowCreatedDate] = useState(false);

  useEffect(() => {
    if (activeTab === 'general') {
      fetchExpenses();
    } else {
      fetchVehicleExpenses();
      fetchVehicles();
    }
  }, [activeTab]);

  const fetchExpenses = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) console.error(error);
    else setExpenses(data || []);
    if (showLoading) setLoading(false);
  };

  const fetchVehicleExpenses = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase.from('vehicle_expenses').select('*').order('date', { ascending: false });
    if (error) console.error(error);
    else setVehicleExpenses(data || []);
    if (showLoading) setLoading(false);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setVehicles((data || []) as PurchaseRecord[]);
  };

  const vehiclesById = vehicles.reduce((acc: Record<string, PurchaseRecord>, v) => {
    if (v && v.id) acc[v.id] = v;
    return acc;
  }, {} as Record<string, PurchaseRecord>);

  const handleDelete = async (id: string) => {
    if (window.confirm(t.suppliers.confirmDelete)) {
      await supabase.from('expenses').delete().eq('id', id);
      fetchExpenses(false);
    }
  };

  const handleDeleteVehicleExpense = async (id: string) => {
    if (window.confirm(t.suppliers.confirmDelete)) {
      await supabase.from('vehicle_expenses').delete().eq('id', id);
      fetchVehicleExpenses(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const dataWithCreatedBy = {
        ...data,
        created_by: data.created_by || getCreatedByValue()
      };
      
      // Delete empty note to avoid schema errors if the column hasn't been created yet
      if (!dataWithCreatedBy.note) {
        delete dataWithCreatedBy.note;
      }

      let resError = null;
      if (editingExpense) {
        const { error } = await supabase.from('expenses').update(dataWithCreatedBy).eq('id', editingExpense.id);
        resError = error;
      } else {
        const { error } = await supabase.from('expenses').insert([dataWithCreatedBy]);
        resError = error;
      }

      if (resError) throw resError;

      fetchExpenses(false);
      setIsFormOpen(false);
      setEditingExpense(null);
    } catch (err: any) {
      console.error("Submission Error:", err);
      if (err.code === '42703' && err.message?.includes('note')) {
         alert("Erreur: La colonne 'note' n'existe pas encore. Veuillez exécuter le code SQL fourni.");
      } else {
         alert(`Erreur de connexion ou de base de données : ${err.message || 'Vérifiez votre connexion internet.'}`);
      }
    }
  };

  const handleVehicleExpenseSubmit = async (data: any) => {
    try {
      const { newMileage, ...expenseData } = data;
      const dataWithCreatedBy = {
        ...expenseData,
        created_by: expenseData.created_by || getCreatedByValue()
      };

      if (!dataWithCreatedBy.note) {
        delete dataWithCreatedBy.note;
      }

      let resError = null;
      if (editingVehicleExpense) {
        const { error } = await supabase.from('vehicle_expenses').update(dataWithCreatedBy).eq('id', editingVehicleExpense.id);
        resError = error;
      } else {
        const { error } = await supabase.from('vehicle_expenses').insert([dataWithCreatedBy]);
        resError = error;
        if (!error && newMileage !== undefined && expenseData.vehicle_id) {
          await supabase.from('purchases').update({ mileage: newMileage }).eq('id', expenseData.vehicle_id);
        }
      }

      if (resError) throw resError;

      fetchVehicleExpenses(false);
      fetchVehicles();
      setIsVehicleFormOpen(false);
      setEditingVehicleExpense(null);
    } catch (err: any) {
      console.error("Vehicle Submission Error:", err);
      alert(`Erreur d'enregistrement : ${err.message || 'Vérifiez votre connexion internet.'}`);
    }
  };

  const printVehicleExpenseInvoice = (expense: VehicleExpense) => {
    const content = `
      <html>
        <head>
          <title>Facture Dépense Véhicule</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .invoice { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; font-size: 28px; }
            .header p { margin: 5px 0 0 0; color: #666; }
            .info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .info-label { font-weight: bold; color: #333; }
            .info-value { color: #666; text-align: right; }
            .total { font-size: 24px; font-weight: bold; color: #0891b2; text-align: right; margin-top: 20px; padding: 20px; background: #f0f9fa; border-radius: 8px; }
            .note { margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #0891b2; border-radius: 4px; }
            .print-button { text-align: center; margin-top: 20px; }
            button { padding: 10px 20px; background: #0891b2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; }
            button:hover { background: #0e7490; }
            @media print {
              .print-button { display: none; }
              body { background: white; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <h1>📋 Facture Dépense Véhicule</h1>
              <p>${new Date(expense.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="info">
              <div class="info-row">
                <span class="info-label">🚗 Véhicule:</span>
                <span class="info-value">${expense.vehicle_make} ${expense.vehicle_model}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📌 Plaque:</span>
                <span class="info-value">${expense.vehicle_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📝 Type de Charge:</span>
                <span class="info-value">${expense.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📅 Date:</span>
                <span class="info-value">${new Date(expense.date).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
            <div class="total">
              Montant: ${expense.cost.toLocaleString('fr-FR')} DA
            </div>
            ${expense.note ? `<div class="note"><strong>Note:</strong> ${expense.note}</div>` : ''}
            <div class="print-button">
              <button onclick="window.print()">🖨️ Imprimer</button>
            </div>
          </div>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      setTimeout(() => newWindow.print(), 250);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <div className="text-center animate-pulse">
          <div className="h-24 w-24 border-t-4 border-red-600 rounded-full animate-spin mx-auto mb-8"></div>
          <p className="text-red-400 font-black uppercase text-xl tracking-[0.5em] italic">Analyse des flux financiers...</p>
       </div>
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

      <div className="relative z-10 space-y-12">

        
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-red-700 rounded-full blur-[120px] opacity-8 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-[2rem] bg-red-600 text-white flex items-center justify-center text-4xl shadow-xl border border-red-400/30 group-hover:scale-110 transition-transform duration-500">
                💸
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-2">
                  {t.expenses.title}
                </h1>
                <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
                  Architecture de Gestion des Charges
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 relative z-10">
              <button 
                onClick={() => setShowCreatedDate(!showCreatedDate)}
                className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 border ${
                  showCreatedDate 
                    ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                    : 'bg-red-950/30 border-red-600/40 text-red-400/70 hover:bg-red-600/20'
                }`}
              >
                📅 {showCreatedDate ? 'Masquer' : 'Afficher'} Dates
              </button>
              
              <button 
                onClick={() => { 
                  if (activeTab === 'general') {
                    setEditingExpense(null);
                    setIsFormOpen(true);
                  } else {
                    setEditingVehicleExpense(null);
                    setIsVehicleFormOpen(true);
                  }
                }}
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
                  <span className="transition-all duration-300 group-hover:scale-125 group-hover:animate-bounce">💰</span>
                  <span className="transition-all duration-300 group-hover:tracking-[0.2em]">
                    {activeTab === 'general' ? t.expenses.add : '+ Nouvelle Charge'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>


        {/* Tab Navigation */}
        <div className="flex gap-4 p-2 bg-red-950/20 border border-red-600/20 rounded-[2rem] w-fit">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'general'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-red-400/50 hover:text-red-400 hover:bg-red-600/10'
            }`}
          >
            <span>💰</span> Magasin / Général
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'vehicles'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-red-400/50 hover:text-red-400 hover:bg-red-600/10'
            }`}
          >
            <span>🚗</span> Dépenses Véhicules
          </button>
        </div>


        {/* General Expenses Tab */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {expenses.map((ex, idx) => (
              <div 
                key={ex.id} 
                className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex flex-col group relative"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
                
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="px-4 py-1.5 rounded-lg bg-red-600/20 border border-red-600/30 text-red-300 font-black text-[9px] uppercase tracking-widest inline-block">
                        {ex.date}
                      </span>
                      {showCreatedDate && ex.created_at && (
                        <p className="text-[8px] font-black text-red-500/40 uppercase tracking-widest">
                          {new Date(ex.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center text-2xl border border-red-600/30">
                      💸
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-red-100 mb-2 uppercase tracking-tight truncate">{ex.name}</h3>
                    {ex.created_by && (
                      <p className="text-[9px] font-black text-red-400/40 uppercase tracking-widest flex items-center gap-2">
                        <span className="h-1.5 w-1.5 bg-red-600 rounded-full"></span>
                        {ex.created_by}
                      </p>
                    )}
                  </div>

                  {ex.note && (
                    <div className="bg-red-950/20 border border-red-600/20 p-4 rounded-xl relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600/40"></div>
                      <p className="text-[10px] font-bold text-red-400/70 italic leading-relaxed line-clamp-2">
                        {ex.note}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-red-600/20">
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-400 tracking-tighter">
                      {ex.cost.toLocaleString()} <span className="text-[10px] text-red-400/40 uppercase tracking-normal font-black">DA</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <button 
                      onClick={() => { setEditingExpense(ex); setIsFormOpen(true); }} 
                      className="flex-1 relative group/btn overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      <span className="relative z-10 text-white flex items-center justify-center gap-2">
                        <span>✏️</span> Modifier
                      </span>
                    </button>
                    <button 
                      onClick={() => handleDelete(ex.id)} 
                      className="h-10 w-10 relative group/btn overflow-hidden rounded-lg font-black flex items-center justify-center transition-all duration-300 border border-red-600/30"
                    >
                      <div className="absolute inset-0 bg-red-600/10 group-hover/btn:bg-red-600 transition-all duration-300"></div>
                      <span className="relative z-10 text-red-400 group-hover/btn:text-white transition-all duration-300 group-hover/btn:scale-125">🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="col-span-full py-40 text-center glass-card rounded-[4rem] border border-red-600/10">
                 <p className="text-7xl mb-10 grayscale opacity-20 animate-pulse">💰</p>
                 <p className="text-red-400/40 font-black uppercase text-xs tracking-[0.5em] italic">Aucun flux financier détecté dans cette section.</p>
              </div>
            )}
          </div>
        )}

        {/* Vehicle Expenses Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-12">
            <div className="bg-red-950/20 p-6 rounded-2xl border border-red-600/20 flex flex-col lg:flex-row items-center gap-6 shadow-xl">
              <div className="relative flex-grow w-full group">
                <div className="absolute inset-y-0 left-6 flex items-center text-red-500/40 group-focus-within:text-red-500 transition-colors">🔍</div>
                <input
                  type="text"
                  placeholder="Filtrer par plaque, VIN ou modèle..."
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  className="w-full bg-red-600/5 border border-red-600/20 p-5 pl-14 rounded-xl outline-none font-black text-red-100 placeholder:text-red-900/40 focus:border-red-600/50 focus:bg-red-600/10 transition-all text-sm uppercase tracking-wider"
                />
              </div>
              <button 
                onClick={() => setVehicleSearch('')} 
                className="px-8 py-5 bg-red-950/40 border border-red-600/30 rounded-xl font-black text-[10px] uppercase tracking-widest text-red-400/70 hover:bg-red-600/20 transition-all shrink-0"
              >
                Réinitialiser
              </button>
            </div>


            {(() => {
              const q = vehicleSearch.trim().toLowerCase();
              const filtered = q === '' ? vehicleExpenses : vehicleExpenses.filter(ex => {
                const plate = (ex.vehicle_name || '').toLowerCase();
                const v = vehiclesById[ex.vehicle_id];
                const vin = (v?.vin || '').toLowerCase();
                const makeModel = ((v?.make || '') + ' ' + (v?.model || '')).toLowerCase();
                return plate.includes(q) || vin.includes(q) || makeModel.includes(q) || (ex.vehicle_make + ' ' + ex.vehicle_model).toLowerCase().includes(q);
              });

              if (filtered.length === 0) return (
                <div className="py-40 text-center glass-card rounded-[4rem] border border-red-600/10">
                   <p className="text-7xl mb-10 grayscale opacity-20 animate-pulse">🚗</p>
                   <p className="text-red-400/40 font-black uppercase text-xs tracking-[0.5em] italic">Aucune dépense véhicule ne correspond à votre recherche.</p>
                </div>
              );

              if (q === '') {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {vehicleExpenses.map((ex, idx) => (
                      <div 
                        key={ex.id} 
                        className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex flex-col group relative"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
                        
                        <div className="p-8 space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <span className="px-4 py-1.5 rounded-lg bg-red-600/20 border border-red-600/30 text-red-300 font-black text-[9px] uppercase tracking-widest inline-block">
                                🚗 {ex.vehicle_make} {ex.vehicle_model}
                              </span>
                              <p className="text-[8px] font-black text-red-500/40 uppercase tracking-widest ml-1">{ex.vehicle_name}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center text-2xl border border-red-600/30">
                              🔧
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-black text-red-100 mb-4 tracking-tight uppercase truncate">{ex.name}</h3>
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-red-400/40 flex items-center gap-2 uppercase tracking-widest italic">📅 {ex.date}</p>
                              {ex.created_by && <p className="text-[9px] font-black text-red-400/30 flex items-center gap-2 uppercase tracking-widest italic">👤 {ex.created_by}</p>}
                            </div>
                          </div>

                          {ex.note && (
                            <div className="bg-red-950/20 border border-red-600/20 p-4 rounded-xl relative overflow-hidden">
                               <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600/40 transition-colors"></div>
                               <p className="text-[10px] font-bold text-red-400/70 italic leading-relaxed line-clamp-2">{ex.note}</p>
                            </div>
                          )}
                          
                          <div className="pt-4 border-t border-red-600/20">
                             <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-400 tracking-tighter">
                               {ex.cost.toLocaleString()} <span className="text-[10px] text-red-400/40 uppercase tracking-normal font-black font-black">DA</span>
                             </p>
                          </div>
                          
                          <div className="flex flex-col gap-3 pt-4">
                            <button 
                              onClick={() => printVehicleExpenseInvoice(ex)} 
                              className="group/print relative overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 transition-all duration-300 group-hover/print:from-emerald-700 group-hover/print:via-emerald-500 group-hover/print:to-emerald-700"></div>
                              <span className="relative z-10 text-white flex items-center justify-center gap-2">
                                <span>🖨️</span> Imprimer Facture
                              </span>
                            </button>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { setEditingVehicleExpense(ex); setIsVehicleFormOpen(true); }} 
                                className="flex-grow relative group/btn overflow-hidden py-3 rounded-lg font-black text-[10px] uppercase transition-all duration-300"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                                <span className="relative z-10 text-white flex items-center justify-center gap-2">
                                  <span>✏️</span> Modifier
                                </span>
                              </button>
                              <button 
                                onClick={() => handleDeleteVehicleExpense(ex.id)} 
                                className="h-10 w-10 relative group/btn overflow-hidden rounded-lg font-black flex items-center justify-center transition-all duration-300 border border-red-600/30"
                              >
                                <div className="absolute inset-0 bg-red-600/10 group-hover/btn:bg-red-600 transition-all duration-300"></div>
                                <span className="relative z-10 text-red-400 group-hover/btn:text-white transition-all duration-300 group-hover/btn:scale-125">🗑️</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  </div>
                );
              }

              // Grouped view
              const groups: Record<string, { vehicle?: PurchaseRecord; expenses: VehicleExpense[]; total: number }> = {};
              for (const ex of filtered) {
                if (!groups[ex.vehicle_id]) groups[ex.vehicle_id] = { vehicle: vehiclesById[ex.vehicle_id], expenses: [], total: 0 };
                groups[ex.vehicle_id].expenses.push(ex);
                groups[ex.vehicle_id].total += Number(ex.cost || 0);
              }

              return (
                <div className="space-y-8">
                  {Object.entries(groups).map(([vid, grp], gIdx) => (
                    <div 
                      key={vid} 
                      className="glass-card rounded-[2.5rem] border border-red-600/40 p-8 md:p-12 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-6"
                      style={{ animationDelay: `${gIdx * 100}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-8">
                          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-red-600/20 to-red-950/40 text-red-400 flex items-center justify-center text-4xl shadow-xl border border-red-600/30 group-hover:scale-110 transition-transform duration-500">
                            🚗
                          </div>
                          <div>
                            <p className="text-3xl font-black text-red-100 tracking-tight uppercase mb-3 truncate max-w-[300px]">{grp.vehicle ? `${grp.vehicle.make} ${grp.vehicle.model}` : 'Véhicule Inconnu'}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 bg-red-600/20 border border-red-600/30 rounded-lg text-[9px] font-black text-red-300 uppercase tracking-widest">Plaque: {grp.vehicle?.plate || grp.expenses[0]?.vehicle_name}</span>
                              {grp.vehicle?.vin && <span className="px-3 py-1 bg-red-950/30 border border-red-600/20 rounded-lg text-[9px] font-black text-red-400/40 uppercase tracking-widest truncate max-w-[150px]">VIN: {grp.vehicle.vin}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-center lg:text-right p-6 bg-red-950/20 border border-red-600/30 rounded-2xl min-w-[250px]">
                          <p className="text-4xl font-black text-red-100 tracking-tighter mb-1">{grp.total.toLocaleString()} <span className="text-[10px] font-black text-red-400/40 tracking-normal ml-1 uppercase">DA</span></p>
                          <p className="text-[8px] font-black text-red-500/50 uppercase tracking-[0.3em] italic">Investissement Entretien Total</p>
                        </div>
                      </div>

                      <div className="mt-10 border-t border-red-600/20 pt-8">
                        <button 
                          onClick={() => setExpandedVehicles(prev => prev.includes(vid) ? prev.filter(x=>x!==vid) : [...prev, vid])} 
                          className={`w-full md:w-auto px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-4 ${
                            expandedVehicles.includes(vid) 
                              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                              : 'bg-red-950/30 border border-red-600/40 text-red-400 hover:bg-red-600/20'
                          }`}
                        >
                          {expandedVehicles.includes(vid) ? 'Masquer Détails ⬆️' : `Analyser ${grp.expenses.length} Opérations ⬇️`}
                        </button>
                        
                        {expandedVehicles.includes(vid) && (
                          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            {grp.expenses.map(ex => (
                              <div key={ex.id} className="p-6 border border-red-600/20 rounded-2xl bg-red-950/10 hover:bg-red-950/20 hover:border-red-600/40 transition-all flex flex-col justify-between group/subitem">
                                <div className="flex justify-between items-start mb-6">
                                  <div className="space-y-2">
                                    <p className="text-xl font-black text-red-100 tracking-tight uppercase group-hover/subitem:text-white transition-colors">{ex.name}</p>
                                    <p className="text-[9px] font-black text-red-400/40 uppercase tracking-widest flex items-center gap-2 italic">
                                      <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                                      📅 {ex.date}
                                    </p>
                                  </div>
                                  <p className="font-black text-2xl text-red-200 tracking-tighter">{Number(ex.cost).toLocaleString()} <span className="text-[10px] text-red-400/40 uppercase">DA</span></p>
                                </div>
                                
                                {ex.note && (
                                  <div className="bg-red-950/20 border border-red-600/20 p-4 rounded-xl mb-6 relative overflow-hidden">
                                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600/40 transition-colors"></div>
                                     <p className="text-[10px] font-bold text-red-400/70 italic leading-relaxed line-clamp-3">{ex.note}</p>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mt-auto pt-6 border-t border-red-600/10">
                                  <button onClick={() => printVehicleExpenseInvoice(ex)} className="flex-1 px-4 py-2 bg-emerald-800/40 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-black text-[9px] uppercase tracking-widest transition-all">🖨️ Facture</button>
                                  <button onClick={() => { setEditingVehicleExpense(ex); setIsVehicleFormOpen(true); }} className="flex-1 px-4 py-2 bg-red-800/40 border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white rounded-lg font-black text-[9px] uppercase tracking-widest transition-all">✏️ Modifier</button>
                                  <button onClick={() => handleDeleteVehicleExpense(ex.id)} className="h-9 w-9 bg-red-950/40 border border-red-600/40 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-all ml-auto">🗑️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                </div>
              );
            })()}
          </div>
        )}

        {isFormOpen && (
          <ExpenseForm 
            lang={lang} 
            onClose={() => setIsFormOpen(false)} 
            onSubmit={handleSubmit}
            initialData={editingExpense}
          />
        )}

        {isVehicleFormOpen && (
          <VehicleExpenseForm 
            lang={lang} 
            onClose={() => setIsVehicleFormOpen(false)} 
            onSubmit={handleVehicleExpenseSubmit}
            initialData={editingVehicleExpense}
            vehicles={vehicles}
          />
        )}
      </div>
    </div>
  );
};

// --- Helper Components ---
const SectionBox: React.FC<{ title: string, icon: string, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-red-600/10 rounded-[2rem] p-6 space-y-6 border border-red-600/30">
    <div className="flex items-center gap-4">
       <div className="h-10 w-10 rounded-lg bg-red-600/30 text-red-300 flex items-center justify-center text-lg border border-red-600/30">{icon}</div>
       <h4 className="text-lg font-black text-red-200 tracking-tight">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);

const FormField: React.FC<{ label: string, name: string, value?: any, onChange?: any, type?: string, icon?: string, disabled?: boolean, placeholder?: string }> = ({ label, name, value, onChange, type = 'text', icon, disabled, placeholder }) => (
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
        placeholder={placeholder}
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

const ExpenseForm: React.FC<{ lang: Language; onClose: () => void; onSubmit: (data: any) => void; initialData: Expense | null }> = ({ lang, onClose, onSubmit, initialData }) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<Partial<Expense>>(initialData || { name: '', cost: 0, date: new Date().toISOString().split('T')[0] });

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl shadow-red-600/40 border border-red-600/40 flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 md:px-8 py-8 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 shrink-0 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-full bg-red-600/30 text-red-300 flex items-center justify-center text-2xl border border-red-600/40">
              📝
            </div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">
                {initialData ? 'Modifier Charge' : 'Nouvelle Charge'}
              </h2>
              <p className="text-xs font-black text-red-400/70 uppercase tracking-widest mt-1">Architecture de Gestion Magasin</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="relative z-10 text-white">✕</div>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 md:px-8 pb-8">
          <div className="flex flex-col lg:flex-row gap-8 py-8">
            
            {/* Left Column - Summary & Visual */}
            <div className="lg:w-1/3 flex flex-col items-center space-y-8">
              <div className="w-48 h-48 rounded-[3rem] bg-gradient-to-br from-red-900/50 to-black border-2 border-red-600/40 shadow-xl flex items-center justify-center overflow-hidden group">
                 <span className="text-7xl group-hover:scale-110 transition-transform duration-500">💸</span>
              </div>
              <div className="w-full space-y-6">
                 <SectionBox title="Récapitulatif" icon="📊">
                    <div className="space-y-4">
                       <DetailBox label="Désignation" value={formData.name || 'En attente...'} />
                       <DetailBox label="Valeur Totale" value={`${(formData.cost || 0).toLocaleString()} DA`} color="blue" />
                    </div>
                 </SectionBox>
              </div>
            </div>

            {/* Right Column - Form Fields */}
            <div className="lg:w-2/3 space-y-8">
              <SectionBox title="Paramètres de la Charge" icon="💰">
                <div className="space-y-6">
                  <FormField 
                    label="Désignation de la Charge" 
                    name="name"
                    value={formData.name} 
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Loyer, Electricité, Papeterie..."
                    icon="📝"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField 
                       label="Montant de la Charge (DA)" 
                       name="cost"
                       type="number" 
                       value={formData.cost} 
                       onChange={(e: any) => setFormData({ ...formData, cost: Number(e.target.value) })} 
                       icon="💵"
                     />
                     <FormField 
                       label="Date d'Exécution" 
                       name="date"
                       type="date" 
                       value={formData.date} 
                       onChange={(e: any) => setFormData({ ...formData, date: e.target.value })} 
                       icon="📅"
                     />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Observations / Notes</label>
                    <textarea 
                      value={formData.note || ''} 
                      onChange={e => setFormData({ ...formData, note: e.target.value })} 
                      className="w-full bg-slate-900/30 border border-red-600/30 px-6 py-4 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-black text-red-200 transition-all min-h-[150px] shadow-sm" 
                      placeholder="Détails techniques ou administratifs supplémentaires..."
                    />
                  </div>
                </div>
              </SectionBox>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-red-950/50 to-slate-900/50 border-t border-red-600/40 flex items-center justify-center gap-4 shrink-0 flex-wrap">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-xl hover:bg-slate-900/70 transition-all uppercase tracking-wider text-sm">
            Annuler
          </button>
          <button 
            onClick={() => onSubmit(formData)} 
            className="relative group overflow-hidden px-12 py-3 font-black rounded-xl transition-all duration-300 uppercase tracking-wider text-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <span className="relative z-10 text-white flex items-center justify-center gap-3">
              <span>💾</span> Enregistrer Charge
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};


const VehicleExpenseForm: React.FC<{ 
  lang: Language; 
  onClose: () => void; 
  onSubmit: (data: any) => void; 
  initialData: VehicleExpense | null;
  vehicles: PurchaseRecord[];
}> = ({ lang, onClose, onSubmit, initialData, vehicles }) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [showVehicleSearch, setShowVehicleSearch] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<PurchaseRecord | null>(
    initialData ? vehicles.find(v => v.id === initialData.vehicle_id) || null : null
  );

  let initCat: 'vidange' | 'assurance' | 'controle' | 'chaine' | 'autre' = 'autre';
  if (initialData?.name) {
    if (initialData.name.includes('Vidange')) initCat = 'vidange';
    else if (initialData.name.includes('Assurance')) initCat = 'assurance';
    else if (initialData.name.includes('Contrôle')) initCat = 'controle';
    else if (initialData.name.includes('Chaîne')) initCat = 'chaine';
  }

  const [expenseCategory, setExpenseCategory] = useState<'vidange' | 'assurance' | 'controle' | 'chaine' | 'autre'>(initCat);
  const [currentMileage, setCurrentMileage] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<string>('');

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cost: initialData?.cost || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    note: initialData?.note || '',
  });

  const filteredVehicles = vehicles.filter(v => {
    const searchLower = searchQuery.toLowerCase();
    return (
      v.make.toLowerCase().includes(searchLower) ||
      v.model.toLowerCase().includes(searchLower) ||
      v.plate.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectVehicle = (vehicle: PurchaseRecord) => {
    setSelectedVehicle(vehicle);
    setCurrentMileage(vehicle.mileage || 0);
    setShowVehicleSearch(false);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    if (!selectedVehicle) {
      alert('Veuillez sélectionner un véhicule');
      return;
    }

    let finalName = formData.name;
    let finalNote = formData.note;

    if (expenseCategory === 'vidange') {
      finalName = '🛢️ Vidange';
      finalNote = `Kilométrage: ${currentMileage} KM\n${finalNote}`;
    } else if (expenseCategory === 'chaine') {
      finalName = '⛓️ Chaîne de distribution';
      finalNote = `Kilométrage: ${currentMileage} KM\n${finalNote}`;
    } else if (expenseCategory === 'assurance') {
      finalName = '🛡️ Assurance';
      if (expiryDate) finalNote = `Expire le: ${expiryDate}\n${finalNote}`;
    } else if (expenseCategory === 'controle') {
      finalName = '🛠️ Contrôle Technique';
      if (expiryDate) finalNote = `Expire le: ${expiryDate}\n${finalNote}`;
    } else {
      finalName = `❓ ${formData.name || 'Autre'}`;
    }

    onSubmit({
      vehicle_id: selectedVehicle.id,
      vehicle_name: selectedVehicle.plate,
      vehicle_make: selectedVehicle.make,
      vehicle_model: selectedVehicle.model,
      name: finalName,
      cost: formData.cost,
      date: formData.date,
      note: finalNote.trim(),
      newMileage: (expenseCategory === 'vidange' || expenseCategory === 'chaine') ? currentMileage : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-6xl h-full max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl shadow-red-600/40 border border-red-600/40 flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 md:px-8 py-8 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 shrink-0 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-full bg-red-600/30 text-red-300 flex items-center justify-center text-2xl border border-red-600/40">
              🚗
            </div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">
                {initialData ? 'Modifier Maintenance' : 'Maintenance Véhicule'}
              </h2>
              <p className="text-xs font-black text-red-400/70 uppercase tracking-widest mt-1">Optimisation de l'Actif Roulant</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="relative z-10 text-white">✕</div>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 md:px-8 pb-8">
          <div className="flex flex-col lg:flex-row gap-8 py-8">
            
            {/* Left Column - Category Selection */}
            <div className="lg:w-1/3 space-y-8">
              <SectionBox title="Identification de l'Unité" icon="🚗">
                 <div className="space-y-4 relative">
                    <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Ciblage du Véhicule</label>
                    <button 
                      onClick={() => setShowVehicleSearch(!showVehicleSearch)}
                      className="w-full bg-slate-900/30 border border-red-600/30 p-4 rounded-xl outline-none font-black text-left text-red-200 hover:border-red-600/50 transition-all flex items-center justify-between group/select"
                    >
                      <span className="tracking-tight italic text-sm">{selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.plate})` : 'Rechercher une unité...'}</span>
                      <span className="text-red-600/40 group-hover/select:translate-y-1 transition-transform">▼</span>
                    </button>
                    
                    {showVehicleSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-red-600/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                        <input
                          type="text"
                          placeholder="Plaque, Modèle, Marque..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-red-600/5 border-b border-red-600/20 p-4 outline-none font-black text-red-100 placeholder:text-red-400/20"
                          autoFocus
                        />
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {filteredVehicles.length > 0 ? (
                            filteredVehicles.map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleSelectVehicle(v)}
                                className="w-full text-left px-6 py-4 border-b border-red-600/10 hover:bg-red-600/10 transition-all flex justify-between items-center group/item"
                              >
                                <div>
                                   <p className="text-red-100 font-black text-sm tracking-tight">{v.make} {v.model}</p>
                                   <p className="text-[10px] text-red-400/50 font-black uppercase tracking-widest italic">{v.plate}</p>
                                </div>
                                <span className="text-red-600 opacity-0 group-hover/item:opacity-100 transition-opacity">→</span>
                              </button>
                            ))
                          ) : (
                            <p className="p-6 text-red-400/30 text-center font-black uppercase text-[10px] tracking-widest italic">Aucun résultat trouvé</p>
                          )}
                        </div>
                      </div>
                    )}
                 </div>
              </SectionBox>

              <SectionBox title="Classification" icon="🔍">
                 <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'vidange', icon: '🛢️', label: 'Vidange' },
                      { id: 'assurance', icon: '🛡️', label: 'Assurance' },
                      { id: 'controle', icon: '🛠️', label: 'Contrôle' },
                      { id: 'chaine', icon: '⛓️', label: 'Chaîne' },
                      { id: 'autre', icon: '❓', label: 'Autre' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setExpenseCategory(cat.id as any)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group/cat ${
                          expenseCategory === cat.id 
                            ? 'border-red-600 bg-red-600/20 shadow-lg shadow-red-600/20 scale-105' 
                            : 'border-red-600/10 bg-slate-900/30 hover:border-red-600/30 hover:bg-red-600/5'
                        }`}
                      >
                        <span className="text-2xl mb-2 group-hover/cat:scale-110 transition-transform">{cat.icon}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${expenseCategory === cat.id ? 'text-red-100' : 'text-red-400/40'}`}>{cat.label}</span>
                      </button>
                    ))}
                 </div>
              </SectionBox>
            </div>

            {/* Right Column - Parameters */}
            <div className="lg:w-2/3 space-y-8">
              <SectionBox title="Paramètres d'Exécution" icon="⚙️">
                 <div className="space-y-6">
                    {expenseCategory === 'autre' && (
                      <FormField 
                        label="Désignation de la charge" 
                        name="name"
                        value={formData.name} 
                        onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="Ex: Lavage, Pneus, Réparation..."
                        icon="✍️"
                      />
                    )}

                    {(expenseCategory === 'vidange' || expenseCategory === 'chaine') && (
                      <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-2xl animate-in fade-in zoom-in-95">
                         <FormField 
                           label="Kilométrage Actuel (KM)" 
                           name="mileage"
                           type="number" 
                           value={currentMileage} 
                           onChange={(e: any) => setCurrentMileage(Number(e.target.value))} 
                           icon="📏"
                         />
                         <p className="text-[10px] text-red-400/50 font-black uppercase tracking-widest mt-4 italic ml-2 leading-relaxed">
                           ⚠️ La mise à jour synchronisera l'odomètre du véhicule.
                         </p>
                      </div>
                    )}

                    {(expenseCategory === 'assurance' || expenseCategory === 'controle') && (
                      <FormField 
                        label="Date d'Échéance (Expiration)" 
                        name="expiry"
                        type="date" 
                        value={expiryDate} 
                        onChange={(e: any) => setExpiryDate(e.target.value)} 
                        icon="📅"
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <FormField 
                         label="Coût de l'Opération (DA)" 
                         name="cost"
                         type="number" 
                         value={formData.cost} 
                         onChange={(e: any) => setFormData({ ...formData, cost: Number(e.target.value) })} 
                         icon="💰"
                       />
                       <FormField 
                         label="Date de Facturation" 
                         name="date"
                         type="date" 
                         value={formData.date} 
                         onChange={(e: any) => setFormData({ ...formData, date: e.target.value })} 
                         icon="📅"
                       />
                    </div>

                     <div className="space-y-2">
                      <label className="block text-xs font-black text-red-400/70 uppercase tracking-widest ml-2">Observations (Note)</label>
                      <textarea 
                        value={formData.note} 
                        onChange={e => setFormData({ ...formData, note: e.target.value })} 
                        className="w-full bg-slate-900/30 border border-red-600/30 px-6 py-4 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-black text-red-200 transition-all min-h-[100px] shadow-sm" 
                        placeholder="Détails techniques..."
                      />
                    </div>
                  </div>
              </SectionBox>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-red-950/50 to-slate-900/50 border-t border-red-600/40 flex items-center justify-center gap-4 shrink-0 flex-wrap">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-xl hover:bg-slate-900/70 transition-all uppercase tracking-wider text-sm">
            Annuler
          </button>
          <button 
            onClick={handleSubmit} 
            className="relative group overflow-hidden px-12 py-3 font-black rounded-xl transition-all duration-300 uppercase tracking-wider text-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <span className="relative z-10 text-white flex items-center justify-center gap-3">
              <span>💾</span> Synchroniser Maintenance
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};


