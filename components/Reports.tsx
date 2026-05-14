import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface ReportsProps { lang: Language; }

const StatCard = ({ label, value, icon, color, highlight, danger, unit }: any) => {
  const colors: any = {
    blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    green: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    red: 'bg-red-600/20 text-red-400 border-red-600/30',
  };
  return (
    <div className={`glass-card p-10 rounded-[3rem] border-2 ${highlight ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : (danger ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-red-600/40')} transition-all duration-300 flex flex-col items-center text-center group relative overflow-hidden hover:scale-105 hover:-translate-y-2`}>
      {highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>}
      {danger && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>}
      
      <div className={`h-16 w-16 rounded-2xl ${colors[color]} border flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform relative z-10`}>{icon}</div>
      <p className="text-[10px] font-black text-red-400/50 uppercase tracking-widest mb-3 relative z-10">{label}</p>
      <p className={`text-3xl font-black tracking-tighter relative z-10 ${highlight ? 'text-emerald-400' : (danger ? 'text-red-400' : 'text-red-100')}`}>
        {value.toLocaleString()} <span className="text-xs opacity-40 font-bold ml-1">{unit}</span>
      </p>
    </div>
  );
};

const ReportRow = ({ label, value, unit, highlight, danger, inverse }: any) => (
  <div className={`flex justify-between items-center py-4 border-b ${inverse ? 'border-red-600/10' : 'border-red-600/10'} group-hover:px-2 transition-all`}>
    <span className={`${inverse ? 'text-red-400/70' : 'text-red-400/70'} font-bold tracking-tight text-sm`}>{label}</span>
    <span className={`text-xl font-black ${danger ? 'text-red-500' : (highlight ? 'text-emerald-400' : (inverse ? 'text-red-100' : 'text-red-100'))} tracking-tighter`}>
      {value.toLocaleString()} <span className="text-[10px] font-black opacity-40 tracking-normal ml-1 uppercase">{unit}</span>
    </span>
  </div>
);

export const Reports: React.FC<ReportsProps> = ({ lang }) => {
  const t = translations[lang];
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'sales' | 'debts'>('overview');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filterSupplier, setFilterSupplier] = useState('ALL');
  const [filterClient, setFilterClient] = useState('ALL');

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    const [suppRes, cliRes] = await Promise.all([
      supabase.from('suppliers').select('id, name'),
      supabase.from('clients').select('id, first_name, last_name')
    ]);
    if (suppRes.data) setSuppliers(suppRes.data);
    if (cliRes.data) setClients(cliRes.data);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const [salesRes, purchasesRes, expensesRes, transRes, vehExpRes, payRes] = await Promise.all([
        supabase.from('sales').select('*').gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`),
        supabase.from('purchases').select('*'), 
        supabase.from('expenses').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('worker_transactions').select('*').gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`),
        supabase.from('vehicle_expenses').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('payments').select('*').gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)
      ]);

      let sales = salesRes.data || [];
      let purchases = purchasesRes.data || [];
      const expenses = expensesRes.data || [];
      const transactions = transRes.data || [];
      const vehicleExpenses = vehExpRes.data || [];
      const payments = payRes.data || [];

      if (filterClient !== 'ALL') {
        sales = sales.filter(s => s.client_id === filterClient);
      }
      if (filterSupplier !== 'ALL') {
        purchases = purchases.filter(p => p.supplier_id === filterSupplier);
      }

      let revenue = 0;
      let grossGain = 0;
      let totalDebt = 0;
      let incomingPayments = 0;
      
      sales.forEach(s => {
        revenue += Number(s.total_price || 0);
        totalDebt += Number(s.balance || 0);
        const original = purchases.find(p => p.id === s.car_id);
        if (original) {
          const vExps = vehicleExpenses.filter(ve => ve.vehicle_id === original.id).reduce((sum, curr) => sum + Number(curr.cost), 0);
          grossGain += (Number(s.total_price || 0) - Number(original.total_cost || 0) - vExps);
        }
      });

      payments.forEach(p => {
        incomingPayments += Number(p.amount || 0);
      });

      const shopExpensesTotal = expenses.reduce((acc, curr) => acc + Number(curr.cost), 0);
      const salariesPaid = transactions.filter(tr => tr.type === 'paiement').reduce((acc, curr) => acc + Number(curr.amount), 0);
      const advancesGiven = transactions.filter(tr => tr.type === 'avance').reduce((acc, curr) => acc + Number(curr.amount), 0);
      const penaltyDeductions = transactions.filter(tr => tr.type === 'absence').reduce((acc, curr) => acc + Number(curr.amount), 0);
      const allVehicleExpenses = vehicleExpenses.reduce((acc, curr) => acc + Number(curr.cost), 0);

      const activeStock = purchases.filter(p => !p.is_sold);
      const stockValuation = activeStock.reduce((acc, curr) => acc + Number(curr.selling_price || 0), 0);
      const stockInvestment = activeStock.reduce((acc, curr) => acc + Number(curr.total_cost || 0), 0);

      const periodPurchases = purchases.filter(p => {
        const pd = new Date(p.purchase_datetime || p.created_at);
        const sd = new Date(`${startDate}T00:00:00`);
        const ed = new Date(`${endDate}T23:59:59`);
        return pd >= sd && pd <= ed;
      });

      const netProfit = grossGain - shopExpensesTotal - salariesPaid - allVehicleExpenses;

      setReport({
        revenue,
        grossGain,
        totalDebt,
        incomingPayments,
        shopExpenses: shopExpensesTotal,
        salaries: salariesPaid,
        advances: advancesGiven,
        penalties: penaltyDeductions,
        vehicleExpensesTotal: allVehicleExpenses,
        netProfit,
        soldCount: sales.length,
        stockCount: activeStock.length,
        stockValuation,
        stockInvestment,
        rawSales: sales,
        rawPurchases: periodPurchases,
        rawActiveStock: activeStock,
        rawVehicleExpenses: vehicleExpenses,
        rawPurchasesAll: purchases
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen pb-20">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-slate-950 to-black pointer-events-none -z-20"></div>
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-800 rounded-full blur-[150px] opacity-[0.08] animate-blob pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-700 rounded-full blur-[140px] opacity-[0.07] animate-blob pointer-events-none -z-10" style={{animationDelay:'2s'}}></div>
      <div className="fixed inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none -z-10"></div>
      <div className="fixed inset-0 bg-gradient-radial from-red-600/5 via-transparent to-transparent pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto space-y-12">
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="relative z-10 flex flex-col gap-10">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              📊 Rapports & Analyses
            </h1>
            <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
              Suivi financier et performance du showroom
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 items-end justify-between">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Date Début</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-900/50 border-2 border-red-600/20 px-6 py-4 rounded-[2rem] outline-none focus:border-red-600 font-bold text-red-100 transition-all shadow-inner" />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Date Fin</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-900/50 border-2 border-red-600/20 px-6 py-4 rounded-[2rem] outline-none focus:border-red-600 font-bold text-red-100 transition-all shadow-inner" />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Fournisseur</label>
                <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full bg-slate-900/50 border-2 border-red-600/20 px-6 py-4 rounded-[2rem] outline-none focus:border-red-600 font-bold text-red-100 appearance-none shadow-inner">
                  <option value="ALL">Tous les Fournisseurs</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-red-400/70 uppercase tracking-widest ml-4">Client</label>
                <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full bg-slate-900/50 border-2 border-red-600/20 px-6 py-4 rounded-[2rem] outline-none focus:border-red-600 font-bold text-red-100 appearance-none shadow-inner">
                  <option value="ALL">Tous les Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
            </div>
            <button 
              onClick={generateReport} 
              disabled={loading}
              className="group relative px-12 py-5 rounded-[2rem] overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-[2rem] blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
              <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                <span className="text-lg transition-transform group-hover:scale-125 group-hover:rotate-12 duration-300">{loading ? '⌛' : '📊'}</span>
                <span>{loading ? 'Calcul...' : 'Analyser'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {report && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
          <div className="flex justify-center">
            <div className="bg-red-950/30 p-2 rounded-[2.5rem] flex gap-2 border border-red-600/20 backdrop-blur-md shadow-inner overflow-x-auto max-w-full">
               {[
                 { id: 'overview', label: "Vue d'ensemble", icon: '📊' },
                 { id: 'purchases', label: 'Achats & Stock', icon: '🛒' },
                 { id: 'sales', label: 'Ventes', icon: '🏎️' },
                 { id: 'debts', label: 'Créances', icon: '⌛' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all whitespace-nowrap relative overflow-hidden group ${activeTab === tab.id ? 'text-white shadow-xl scale-105' : 'text-red-400/50 hover:text-red-300'}`}
                 >
                   {activeTab === tab.id && (
                     <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 animate-in fade-in duration-300"></div>
                   )}
                   <span className="relative z-10">{tab.icon}</span> 
                   <span className="relative z-10">{tab.label}</span>
                 </button>
               ))}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard label="Chiffre d'Affaires" value={report.revenue} unit="DA" icon="📈" color="blue" />
                <StatCard label="Bénéfice Net" value={report.netProfit} unit="DA" icon="💎" color="green" highlight />
                <StatCard label="Paiements Reçus" value={report.incomingPayments} unit="DA" icon="💰" color="purple" />
                <StatCard label="Créances Clients" value={report.totalDebt} unit="DA" icon="⌛" color="red" danger />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="glass-card rounded-[4rem] border border-red-600/40 p-12 shadow-xl relative overflow-hidden group hover:border-red-600/60 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
                  <h3 className="text-2xl font-black text-red-100 mb-10 border-b border-red-600/20 pb-6 flex items-center gap-4">
                    <span className="p-3 bg-red-600/20 text-red-400 rounded-2xl">📉</span> Ventilation des Charges
                  </h3>
                  <div className="space-y-6">
                    <ReportRow label="Achats Véhicules (Période)" value={report.rawPurchases.reduce((a:any,b:any)=>a+Number(b.total_cost||0),0)} unit="DA" />
                    <ReportRow label="Dépenses Showroom" value={report.shopExpenses} unit="DA" danger />
                    <ReportRow label="Dépenses Véhicules" value={report.vehicleExpensesTotal} unit="DA" danger />
                    <ReportRow label="Salaires Net Versés" value={report.salaries} unit="DA" danger />
                    <ReportRow label="Avances sur Salaire" value={report.advances} unit="DA" danger />
                    <div className="pt-8 border-t border-red-600/20 mt-4 flex justify-between items-center">
                       <span className="text-xs font-black uppercase text-red-400/50 tracking-widest">Total Charges Période</span>
                       <span className="text-3xl font-black text-red-500 tracking-tighter">{(report.shopExpenses + report.vehicleExpensesTotal + report.salaries + report.advances).toLocaleString()} <span className="text-sm">DA</span></span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[4rem] p-12 shadow-2xl relative overflow-hidden group border border-red-600/40">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-[2s]"></div>
                   <h3 className="text-2xl font-black mb-10 border-b border-red-600/20 pb-6 text-red-300 flex items-center gap-4 relative z-10">
                     <span className="p-3 bg-red-600/20 text-red-400 rounded-2xl">📊</span> Bilan Actif Showroom
                   </h3>
                   <div className="space-y-6 relative z-10">
                      <ReportRow label="Véhicules en Stock" value={report.stockCount} unit="Unités" inverse />
                      <ReportRow label="Valeur Marchande du Stock" value={report.stockValuation} unit="DA" inverse highlight />
                      <ReportRow label="Investissement Initial Stock" value={report.stockInvestment} unit="DA" inverse />
                      <div className="pt-8 border-t border-red-600/20 mt-4 text-center bg-red-600/5 rounded-[2rem] p-6 border border-red-600/10">
                         <p className="text-[10px] font-black uppercase text-red-400/70 tracking-[0.4em] mb-2">Prévisionnel</p>
                         <p className="text-4xl font-black text-red-100 tracking-tighter">{(report.stockValuation - report.stockInvestment).toLocaleString()} <span className="text-lg text-red-400">DA</span></p>
                         <p className="text-[10px] font-bold text-red-400/40 uppercase mt-2">Plus-value latente estimée</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h3 className="text-2xl font-black text-red-100 px-4">Achats de la période ({report.rawPurchases.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {report.rawPurchases.map((car: any) => {
                   const vExps = report.rawVehicleExpenses.filter((e:any) => e.vehicle_id === car.id).reduce((s:any,c:any)=>s+Number(c.cost), 0);
                   return (
                     <div key={car.id} className="glass-card rounded-[2.5rem] border border-red-600/40 overflow-hidden shadow-xl hover:shadow-red-600/20 transition-all group hover:scale-105">
                       <div className="h-48 bg-red-950/50 relative">
                         {car.photo_urls && car.photo_urls.length > 0 ? (
                           <img src={car.photo_urls[0]} alt={car.make} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🚗</div>
                         )}
                         <div className="absolute top-4 right-4 px-3 py-1 bg-red-600/50 backdrop-blur-md rounded-full text-[9px] font-black text-red-100 uppercase border border-red-600/30">
                           {car.plate}
                         </div>
                       </div>
                       <div className="p-6 space-y-4">
                         <div>
                           <p className="text-lg font-black text-red-100 leading-tight">{car.make} {car.model}</p>
                           <p className="text-[10px] font-bold text-red-400/50 mt-1 uppercase">Fournisseur: {car.supplier_name}</p>
                         </div>
                         <div className="pt-4 border-t border-red-600/20 flex justify-between items-center">
                           <span className="text-[10px] font-black text-red-400/50 uppercase tracking-widest">Coût Initial</span>
                           <span className="text-lg font-black text-red-100 tracking-tighter">{Number(car.total_cost || 0).toLocaleString()} <span className="text-[9px]">DA</span></span>
                         </div>
                         {vExps > 0 && (
                           <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-rose-400/70 uppercase tracking-widest">Charges</span>
                             <span className="text-sm font-black text-rose-400">+{vExps.toLocaleString()} DA</span>
                           </div>
                         )}
                       </div>
                     </div>
                   );
                })}
              </div>
              {report.rawPurchases.length === 0 && <p className="text-center py-12 text-red-400/50 font-black uppercase italic">Aucun achat sur cette période.</p>}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h3 className="text-2xl font-black text-red-100 px-4">Ventes de la période ({report.rawSales.length})</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {report.rawSales.map((sale: any) => {
                   const car = report.rawPurchasesAll.find((p:any) => p.id === sale.car_id);
                   const vExps = report.rawVehicleExpenses.filter((e:any) => e.vehicle_id === sale.car_id).reduce((s:any,c:any)=>s+Number(c.cost), 0);
                   const margin = Number(sale.total_price) - Number(car?.total_cost || 0) - vExps;
                   
                   return (
                     <div key={sale.id} className="glass-card rounded-[2.5rem] border border-red-600/40 overflow-hidden shadow-xl hover:shadow-red-600/20 transition-all flex flex-col sm:flex-row group hover:scale-[1.02]">
                       <div className="w-full sm:w-1/3 bg-red-950/50 relative min-h-[160px]">
                         {car?.photo_urls && car.photo_urls.length > 0 ? (
                           <img src={car.photo_urls[0]} alt={car.make} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🚗</div>
                         )}
                       </div>
                       <div className="p-8 flex-grow flex flex-col justify-between">
                         <div className="flex justify-between items-start mb-6">
                           <div>
                             <p className="text-xl font-black text-red-100 leading-tight">{car?.make} {car?.model}</p>
                             <p className="text-[10px] font-bold text-red-400/50 mt-1 uppercase tracking-wider">Client: {sale.first_name} {sale.last_name}</p>
                           </div>
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${sale.status === 'debt' ? 'bg-rose-600/20 text-rose-400 border-rose-600/30' : 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'}`}>
                             {sale.status === 'debt' ? 'Avec Dette' : 'Soldé'}
                           </span>
                         </div>
                         <div className="space-y-3 pt-4 border-t border-red-600/20">
                           <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-red-400/50 uppercase tracking-widest">Prix de Vente</span>
                             <span className="text-lg font-black text-red-100">{Number(sale.total_price).toLocaleString()} DA</span>
                           </div>
                           <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-red-400/50 uppercase tracking-widest">Marge Nette</span>
                             <span className={`text-lg font-black ${margin > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{margin > 0 ? '+' : ''}{margin.toLocaleString()} DA</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
              {report.rawSales.length === 0 && <p className="text-center py-12 text-red-400/50 font-black uppercase italic">Aucune vente sur cette période.</p>}
            </div>
          )}

          {activeTab === 'debts' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h3 className="text-2xl font-black text-red-100 px-4">Suivi des Créances Clients</h3>
              <div className="glass-card rounded-[3rem] border border-red-600/40 shadow-xl overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-red-950/50 border-b border-red-600/20">
                      <tr>
                        <th className="py-6 px-8 text-[10px] font-black text-red-400/70 uppercase tracking-widest">Client</th>
                        <th className="py-6 px-8 text-[10px] font-black text-red-400/70 uppercase tracking-widest">Véhicule</th>
                        <th className="py-6 px-8 text-[10px] font-black text-red-400/70 uppercase tracking-widest">Total Vente</th>
                        <th className="py-6 px-8 text-[10px] font-black text-emerald-400/70 uppercase tracking-widest">Payé</th>
                        <th className="py-6 px-8 text-[10px] font-black text-rose-400 uppercase tracking-widest text-right">Reste à Payer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-600/10">
                      {report.rawSales.filter((s:any) => Number(s.balance) > 0).map((sale: any) => {
                        const car = report.rawPurchasesAll.find((p:any) => p.id === sale.car_id);
                        return (
                          <tr key={sale.id} className="hover:bg-red-600/5 transition-colors">
                            <td className="py-6 px-8">
                              <p className="font-black text-red-100">{sale.first_name} {sale.last_name}</p>
                              <p className="text-[10px] font-bold text-red-400/50">{sale.mobile1}</p>
                            </td>
                            <td className="py-6 px-8">
                              <p className="font-bold text-red-200">{car?.make} {car?.model}</p>
                              <p className="text-[10px] font-bold text-red-400/50 uppercase">{car?.plate}</p>
                            </td>
                            <td className="py-6 px-8 font-black text-red-100">{Number(sale.total_price).toLocaleString()} DA</td>
                            <td className="py-6 px-8 font-black text-emerald-400">{Number(sale.amount_paid).toLocaleString()} DA</td>
                            <td className="py-6 px-8 font-black text-rose-400 text-right text-xl tracking-tighter">{Number(sale.balance).toLocaleString()} DA</td>
                          </tr>
                        );
                      })}
                      {report.rawSales.filter((s:any) => Number(s.balance) > 0).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-red-400/50 font-black uppercase italic">Aucune créance en cours.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 flex justify-center">
             <button 
               onClick={() => window.print()} 
               className="group relative px-16 py-6 rounded-[2.5rem] overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300"
             >
               <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
               <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-[2.5rem] blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
               <div className="relative z-10 flex items-center justify-center gap-4 text-white">
                 <span className="text-2xl transition-transform group-hover:scale-125 duration-300">🖨️</span>
                 <span>Imprimer le Rapport Complet</span>
               </div>
             </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
