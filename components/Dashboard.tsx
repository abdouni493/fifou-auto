
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface DashboardProps {
  lang: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ lang }) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    stockValue: 0,
    debt: 0,
    expenses: 0,
    teamCost: 0,
    carsInStock: 0,
    partners: 0,
    inspections: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: sales, error: salesError } = await supabase.from('sales').select('total_price, amount_paid, balance, car_id, created_at, first_name, last_name');
      const { data: purchases, error: purchasesError } = await supabase.from('purchases').select('*');
      
      if (salesError) console.warn('Sales fetch error:', salesError);
      if (purchasesError) console.warn('Purchases fetch error:', purchasesError);
      
      let rev = 0, debt = 0, gain = 0;
      sales?.forEach(s => {
        rev += Number(s.total_price || 0);
        debt += Number(s.balance || 0);
        const original = purchases?.find(p => p.id === s.car_id);
        if (original) gain += (Number(s.total_price) - Number(original.totalCost));
      });

      const inStock = purchases?.filter(p => !p.is_sold) || [];
      const stockVal = inStock.reduce((acc, curr) => acc + (Number(curr.sellingPrice) || 0), 0);

      const { data: exp, error: expError } = await supabase.from('expenses').select('cost');
      if (expError) console.warn('Expenses fetch error:', expError);
      const totalExp = exp?.reduce((acc, curr) => acc + Number(curr.cost), 0) || 0;

      const { data: trans, error: transError } = await supabase.from('worker_transactions').select('amount, type');
      if (transError) console.warn('Transactions fetch error:', transError);
      const totalSalaries = trans?.filter(tr => tr.type === 'paiement').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const { data: suppliers, error: suppError } = await supabase.from('suppliers').select('id');
      if (suppError) console.warn('Suppliers fetch error:', suppError);
      
      const { data: insp, error: inspError } = await supabase.from('inspections').select('id');
      if (inspError) console.warn('Inspections fetch error:', inspError);

      setStats({
        revenue: rev,
        profit: gain,
        stockValue: stockVal,
        debt: debt,
        expenses: totalExp,
        teamCost: totalSalaries,
        carsInStock: inStock.length,
        partners: suppliers?.length || 0,
        inspections: insp?.length || 0
      });

      const activities = [
        ...(sales || []).map(s => ({ type: 'Vente', val: s.total_price, date: s.created_at, label: `${s.first_name} ${s.last_name}` })),
        ...(purchases || []).slice(0, 5).map(p => ({ type: 'Achat', val: p.totalCost, date: p.dateAdded, label: `${p.make} ${p.model}` }))
      ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
      
      setRecentActivity(activities);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 animate-pulse">
       <div className="h-20 w-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
       <p className="mt-8 font-black text-slate-400 uppercase tracking-[0.4em] text-[10px]">Analyse du Showroom...</p>
    </div>
  );

  const netBilan = stats.profit - stats.expenses - stats.teamCost;
  const profitMargin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* --- NEW LIGHT MODE HERO SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white rounded-[4rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] p-12 md:p-16 flex flex-col relative overflow-hidden">
           {/* Background subtle glow */}
           <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-60"></div>
           
           <div className="relative z-10 space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <div className="flex items-center gap-3 mb-4">
                       <span className="text-2xl">💎</span>
                       <h3 className="text-slate-400 font-black text-[12px] uppercase tracking-[0.4em]">Bilan Net Estimé</h3>
                    </div>
                    <div className="flex items-baseline gap-4">
                       <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter">
                          {netBilan.toLocaleString()}
                       </h1>
                       <span className="text-3xl font-black text-blue-600">DA</span>
                    </div>
                 </div>

                 <div className="bg-emerald-50 border border-emerald-100 px-8 py-4 rounded-[2.5rem] flex flex-col items-center">
                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Marge Brut 📈</p>
                    <p className="text-3xl font-black text-emerald-700 tracking-tight">{profitMargin.toFixed(1)}%</p>
                 </div>
              </div>

              {/* Grid of Sub-Stats with individual cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-50">
                 <HeroCard label="Chiffre d'Affaires" value={stats.revenue} emoji="💰" color="blue" />
                 <HeroCard label="Total Dépenses" value={stats.expenses + stats.teamCost} emoji="💸" color="rose" />
                 <HeroCard label="Créances Clients" value={stats.debt} emoji="⏳" color="amber" />
              </div>
           </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
           <CompactStat icon="🏎️" label="Unités en Stock" value={stats.carsInStock} color="blue" />
           <CompactStat icon="🤝" label="Partenaires" value={stats.partners} color="indigo" />
           <CompactStat icon="🔍" label="Inspections" value={stats.inspections} color="amber" />
        </div>
      </div>

      {/* Reste du Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <KPIBox title="Valeur Stock" value={stats.stockValue} icon="💎" color="emerald" sub="Potentiel Vente" />
        <KPIBox title="Frais Magasin" value={stats.expenses} icon="🏠" color="rose" sub="Charges Fixes" />
        <KPIBox title="Masse Salariale" value={stats.teamCost} icon="👥" color="sky" sub="Salaires Payés" />
        <KPIBox title="Dettes" value={stats.debt} icon="⏳" color="orange" sub="À Encaisser" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
         <div className="xl:col-span-7 space-y-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight px-4">Flux d'Activité Récent</h3>
            <div className="bg-white rounded-[3.5rem] border border-slate-50 p-6 space-y-4 shadow-sm">
               {recentActivity.map((act, i) => (
                 <div key={i} className="flex items-center justify-between p-6 rounded-[2.5rem] hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-6">
                       <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${act.type === 'Vente' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {act.type === 'Vente' ? '💰' : '🛒'}
                       </div>
                       <div>
                          <p className="font-black text-slate-900 tracking-tight">{act.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{act.type} • {new Date(act.date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <p className="text-xl font-black text-slate-800 tracking-tighter">{act.val?.toLocaleString()} DA</p>
                 </div>
               ))}
            </div>
         </div>

         <div className="xl:col-span-5 bg-white rounded-[4rem] border border-slate-100 p-12 shadow-sm space-y-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center">État du Showroom</h3>
            <div className="space-y-6">
               <ProgressBar label="Remplissage Stock" progress={Math.min((stats.carsInStock / 50) * 100, 100)} color="bg-blue-600" />
               <ProgressBar label="Objectif Ventes" progress={65} color="bg-green-500" />
               <ProgressBar label="Recouvrement Dettes" progress={stats.revenue > 0 ? ((stats.revenue - stats.debt) / stats.revenue) * 100 : 100} color="bg-amber-500" />
            </div>
         </div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT FOR LIGHT MODE HERO ---
const HeroCard = ({ label, value, emoji, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 flex flex-col group hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-500">
       <div className={`h-12 w-12 rounded-2xl ${colorMap[color]} flex items-center justify-center text-xl mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
          {emoji}
       </div>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
       <p className="text-2xl font-black text-slate-900 tracking-tighter">
          {value.toLocaleString()} <span className="text-xs font-bold opacity-30">DA</span>
       </p>
    </div>
  );
};

const CompactStat = ({ icon, label, value, color }: any) => {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100'
  };
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 flex items-center gap-6 shadow-sm group hover:shadow-xl transition-all">
       <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform ${colors[color]}`}>
          {icon}
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
       </div>
    </div>
  );
};

const KPIBox = ({ title, value, icon, color, sub }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
    orange: 'bg-orange-500'
  };
  return (
    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:scale-[1.03] transition-all duration-500">
       <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl text-white mb-6 shadow-lg ${colorMap[color]}`}>
          {icon}
       </div>
       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
       <p className="text-2xl font-black text-slate-900 tracking-tighter mb-2">{Number(value).toLocaleString()} DA</p>
       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{sub}</p>
    </div>
  );
};

const ProgressBar = ({ label, progress, color }: any) => (
  <div className="space-y-3 px-2">
     <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-black text-slate-900">{Math.round(progress)}%</span>
     </div>
     <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
     </div>
  </div>
);
