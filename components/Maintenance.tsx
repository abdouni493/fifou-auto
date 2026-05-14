
import React, { useState } from 'react';
import { Maintenance as MaintenanceType, Language } from '../types';
import { translations } from '../translations';

interface MaintenanceProps { lang: Language; }

export const Maintenance: React.FC<MaintenanceProps> = ({ lang }) => {
  const t = translations[lang];
  const [records, setRecords] = useState<MaintenanceType[]>([
    { id: '1', vehicleId: 'CAR-01', vehicleName: 'Mercedes G-Class AMG', type: 'vidange', name: 'Vidange moteur', cost: 35000, date: '2023-11-20', expiryDate: '2024-05-20', note: 'Huile 5W30 synthétique premium' },
    { id: '2', vehicleId: 'CAR-02', vehicleName: 'BMW M5 Competition', type: 'assurance', name: 'Assurance annuelle AXA', cost: 120000, date: '2023-12-10', expiryDate: '2024-12-10' }
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceType | null>(null);

  const handleEdit = (rec: MaintenanceType) => {
    setEditingRecord(rec);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const record = records.find(r => r.id === id);
    if (window.confirm(`${t.suppliers.confirmDelete}\n\nOperation: ${record?.name} (${record?.vehicleName})`)) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-red-600/20 pb-8">
        <div>
           <h2 className="text-4xl font-black text-red-100 tracking-tight leading-none">{t.maintenance.title}</h2>
           <p className="text-red-400/70 font-bold text-xs uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
             <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
             Suivi Technique & Administratif
           </p>
        </div>
        <button 
          onClick={() => { setEditingRecord(null); setIsFormOpen(true); }} 
          className="group custom-gradient-btn px-10 py-5 rounded-[2.5rem] text-white font-black text-sm shadow-2xl transition-all active:scale-95 flex items-center gap-4"
        >
           <div className="h-8 w-8 rounded-full bg-red-600/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
             <span className="text-xl">🔧</span>
           </div>
           {t.maintenance.add}
        </button>
      </div>

      {/* Modern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {records.map(r => (
          <div key={r.id} className="glass-card rounded-[4rem] border border-red-600/20 p-10 shadow-sm hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] transition-all duration-700 group relative flex flex-col overflow-hidden h-full">
            <div className={`absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 transition-colors duration-700 opacity-20 ${
               r.type === 'vidange' ? 'bg-amber-500' : 
               r.type === 'assurance' ? 'bg-purple-500' : 
               r.type === 'controle' ? 'bg-blue-500' : 
               'bg-slate-500'
            }`}></div>
            
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="flex items-center gap-5 flex-grow">
                 <div className={`h-20 w-20 rounded-[2.2rem] flex items-center justify-center text-4xl transition-all duration-700 shadow-inner group-hover:scale-110 group-hover:rotate-6 ${
                   r.type === 'vidange' ? 'bg-amber-50 text-amber-500' : 
                   r.type === 'assurance' ? 'bg-purple-50 text-purple-500' : 
                   r.type === 'controle' ? 'bg-blue-50 text-red-600' : 
                   'bg-red-950/30 text-red-400/70'
                 }`}>
                    {r.type === 'vidange' ? '🛢️' : r.type === 'assurance' ? '🛡️' : r.type === 'controle' ? '🔍' : '⚙️'}
                 </div>
                 <div className="flex flex-col flex-grow">
                    <h3 className="text-2xl font-black text-red-100 tracking-tight leading-tight group-hover:text-red-400 transition-colors">{r.vehicleName}</h3>
                    {r.created_by && (
                      <p className="text-[9px] font-black text-red-400/70 uppercase mt-1">👤 Créé par: {r.created_by}</p>
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2 ${
                      r.type === 'assurance' ? 'text-purple-500' : 
                      r.type === 'vidange' ? 'text-amber-500' : 
                      'text-red-600'
                    }`}>
                      <span className="h-1 w-3 rounded-full bg-current"></span>
                      {t.maintenance[r.type]}
                    </span>
                 </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-red-600/20/50 mb-10 flex-grow space-y-6 relative z-10 group-hover:bg-white group-hover:border-red-600/20 transition-all duration-700">
               <div>
                 <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.2em] mb-2">Détail de l'opération</p>
                 <p className="text-base font-bold text-red-100 leading-snug">{r.name}</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-red-600/20">
                    <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Coût</p>
                    <p className="text-xl font-black text-red-600 tracking-tighter">{r.cost.toLocaleString()} <span className="text-[10px] font-bold">{t.currency}</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-red-600/20">
                    <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest mb-1">Effectué le</p>
                    <p className="text-sm font-black text-red-100">{r.date}</p>
                  </div>
               </div>

               {r.expiryDate && (
                 <div className={`p-6 rounded-[2.2rem] border-2 flex items-center justify-between transition-all duration-700 ${isExpired(r.expiryDate) ? 'bg-red-50/50 border-red-100 text-red-600' : 'bg-green-50/50 border-green-100 text-green-600'}`}>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-2 opacity-60">{t.maintenance.expiry}</p>
                      <p className="text-lg font-black tracking-tight">{r.expiryDate}</p>
                   </div>
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl ${isExpired(r.expiryDate) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600 shadow-lg shadow-green-500/10'}`}>
                    {isExpired(r.expiryDate) ? '⚠️' : '✅'}
                   </div>
                 </div>
               )}

               {r.note && (
                 <div className="pt-6 border-t border-red-600/30/50 text-xs text-red-400/70 italic font-medium leading-relaxed">
                   "{r.note}"
                 </div>
               )}
            </div>

            <div className="flex gap-4 relative z-10">
              <button 
                onClick={() => handleEdit(r)} 
                className="flex-1 py-5 rounded-[1.8rem] bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
              >
                ✏️ {t.actions.edit}
              </button>
              <button 
                onClick={() => handleDelete(r.id)} 
                className="px-8 py-5 rounded-[1.8rem] bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/5"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {records.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-center">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-slate-200 rounded-full blur-3xl opacity-20"></div>
               <span className="text-9xl relative grayscale">⚙️</span>
            </div>
            <h3 className="text-2xl font-black text-slate-300 italic tracking-tight">Aucun enregistrement trouvé</h3>
            <p className="text-red-400/70 text-sm mt-2 max-w-xs mx-auto">Commencez par ajouter une nouvelle opération de maintenance pour vos véhicules.</p>
          </div>
        )}
      </div>

      {/* Refined Maintenance Modal */}
      {isFormOpen && (
        <MaintenanceForm 
          lang={lang} 
          onClose={() => setIsFormOpen(false)} 
          onSubmit={(data) => {
            if (editingRecord) {
              setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...data } : r));
            } else {
              setRecords(prev => [...prev, { ...data, id: Date.now().toString() }]);
            }
            setIsFormOpen(false);
          }}
          initialData={editingRecord}
        />
      )}
    </div>
  );
};

const MaintenanceForm: React.FC<{ lang: Language; onClose: () => void; onSubmit: (data: any) => void; initialData: MaintenanceType | null }> = ({ lang, onClose, onSubmit, initialData }) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<Partial<MaintenanceType>>(initialData || { 
    vehicleName: '', 
    type: 'vidange', 
    name: 'Vidange moteur', 
    cost: 0, 
    date: new Date().toISOString().split('T')[0], 
    note: '' 
  });

  const handleTypeChange = (newType: MaintenanceType['type']) => {
    let name = '';
    if (newType === 'vidange') name = t.maintenance.vidange;
    else if (newType === 'assurance') name = t.maintenance.assurance;
    else if (newType === 'controle') name = t.maintenance.controle;
    else name = '';
    
    setFormData({ 
      ...formData, 
      type: newType, 
      name, 
      expiryDate: (newType !== 'other' ? (formData.expiryDate || '') : undefined) 
    });
  };

  const showExpiry = formData.type !== 'other';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-2xl max-h-[95vh] overflow-hidden rounded-[4.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] flex flex-col animate-in zoom-in-95 duration-500">
        
        {/* Modal Header */}
        <div className="p-12 border-b border-red-600/20 flex justify-between items-center bg-gradient-to-br from-slate-50 to-white relative">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -mr-24 -mt-24"></div>
           <div className="flex items-center gap-8 relative z-10">
             <div className="h-16 w-16 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center text-3xl shadow-2xl shadow-slate-900/30">
               {formData.type === 'vidange' ? '🛢️' : formData.type === 'assurance' ? '🛡️' : '🔧'}
             </div>
             <div>
               <h3 className="text-4xl font-black text-red-100 tracking-tighter leading-none mb-2">
                 {initialData ? t.actions.edit : "Nouvelle Entrée"}
               </h3>
               <p className="text-[11px] font-black text-red-400 uppercase tracking-[0.3em] flex items-center gap-2">
                 <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                 Détails Techniques du Véhicule
               </p>
             </div>
           </div>
           <button onClick={onClose} className="p-5 bg-white border border-red-600/30 rounded-[2rem] hover:bg-red-600/20 hover:text-red-500 transition-all relative z-10 text-2xl shadow-sm active:scale-90">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="flex-grow overflow-y-auto p-12 md:p-16 space-y-12 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Vehicle Selection */}
            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-black text-red-400/70 uppercase tracking-[0.3em] ml-2">Sélection du Véhicule</label>
              <div className="relative group">
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-3xl opacity-40 group-focus-within:opacity-100 group-focus-within:scale-110 transition-all duration-500">🏎️</span>
                <input 
                  type="text" 
                  value={formData.vehicleName} 
                  onChange={e => setFormData({ ...formData, vehicleName: e.target.value })} 
                  required 
                  className="w-full bg-slate-50 border-2 border-red-600/20 px-8 py-6 pl-20 rounded-[2.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-red-600 font-bold text-xl text-red-100 transition-all shadow-inner" 
                  placeholder="Rechercher ou saisir un véhicule..."
                />
              </div>
            </div>

            {/* Category Type */}
            <div className="space-y-4">
              <label className="block text-xs font-black text-red-400/70 uppercase tracking-[0.3em] ml-2">{t.maintenance.type}</label>
              <div className="relative">
                <select 
                  value={formData.type} 
                  onChange={e => handleTypeChange(e.target.value as any)} 
                  className="w-full bg-slate-50 border-2 border-red-600/20 px-8 py-6 rounded-[2.5rem] outline-none focus:border-red-600 font-bold text-lg text-red-100 transition-all appearance-none shadow-inner"
                >
                  <option value="vidange">{t.maintenance.vidange}</option>
                  <option value="assurance">{t.maintenance.assurance}</option>
                  <option value="controle">{t.maintenance.controle}</option>
                  <option value="other">{t.maintenance.other}</option>
                </select>
                <span className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-xl">▼</span>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-4">
              <label className="block text-xs font-black text-red-400/70 uppercase tracking-[0.3em] ml-2">Intitulé Précis</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                required 
                placeholder={formData.type === 'other' ? "Nom de l'opération..." : ""}
                className="w-full bg-slate-50 border-2 border-red-600/20 px-8 py-6 rounded-[2.5rem] outline-none focus:border-red-600 font-bold text-lg text-red-100 transition-all shadow-inner" 
              />
            </div>

            {/* Financials & Dates */}
            <div className="space-y-4">
              <label className="block text-xs font-black text-red-400/70 uppercase tracking-[0.3em] ml-2">{t.expenses.cost}</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={formData.cost} 
                  onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} 
                  required 
                  className="w-full bg-slate-50 border-2 border-red-600/20 px-8 py-6 rounded-[2.5rem] outline-none focus:border-red-600 font-bold text-lg text-red-100 transition-all shadow-inner" 
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-red-400/70 font-black text-xs uppercase">{t.currency}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-red-400/70 uppercase tracking-[0.3em] ml-2">Date d'Opération</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
                required 
                className="w-full bg-slate-50 border-2 border-red-600/20 px-8 py-6 rounded-[2.5rem] outline-none focus:border-red-600 font-bold text-lg text-red-100 transition-all shadow-inner" 
              />
            </div>

            {/* Dynamic Expiry Field */}
            {showExpiry && (
              <div className="md:col-span-2 space-y-4 animate-in slide-in-from-top-6 duration-700">
                <label className="block text-xs font-black text-red-600 uppercase tracking-[0.3em] ml-2 flex items-center gap-3">
                  <span className="h-2 w-4 rounded-full bg-blue-500"></span>
                  {t.maintenance.expiry}
                </label>
                <div className="relative group">
                  <span className="absolute left-7 top-1/2 -translate-y-1/2 text-2xl group-focus-within:scale-110 transition-transform">⌛</span>
                  <input 
                    type="date" 
                    value={formData.expiryDate} 
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} 
                    className="w-full bg-blue-50/20 border-2 border-red-600/30 px-8 py-6 pl-20 rounded-[2.5rem] outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-red-600 font-bold text-lg text-red-100 transition-all shadow-sm" 
                  />
                </div>
              </div>
            )}

            {/* Note Area */}
            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-black text-red-400/70 uppercase tracking-[0.3em] ml-2">{t.maintenance.note}</label>
              <textarea 
                value={formData.note} 
                onChange={e => setFormData({ ...formData, note: e.target.value })} 
                placeholder="Pièces remplacées, nom du garage, observations..."
                className="w-full bg-slate-50 border-2 border-red-600/20 px-8 py-6 rounded-[3rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-red-600 font-bold text-lg text-red-100 transition-all shadow-inner min-h-[160px] custom-scrollbar" 
              />
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="p-12 border-t border-red-600/20 bg-slate-50/50 flex justify-end gap-6 relative">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-12 py-6 rounded-[2.5rem] text-red-400/70 font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all border border-transparent hover:border-red-600/30"
          >
            {t.actions.cancel}
          </button>
          <button 
            type="submit" 
            onClick={(e: any) => { e.preventDefault(); if(formData.vehicleName && formData.name) onSubmit(formData); }} 
            className="custom-gradient-btn px-24 py-6 rounded-[2.5rem] text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
          >
            {t.actions.save}
          </button>
        </div>
      </div>
    </div>
  );
};


