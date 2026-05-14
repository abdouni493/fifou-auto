import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface DashboardProps {
  lang: Language;
  onNavigate?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ lang, onNavigate }) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [stats, setStats] = useState({
    carsInStock: 0,
    partners: 0,
    inspections: 0,
    salesThisMonth: 0,
    purchasesThisMonth: 0,
    workers: 0
  });
  const [recentCars, setRecentCars] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showroomConfig, setShowroomConfig] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: configData } = await supabase.from('showroom_config').select('*').eq('id', 1).maybeSingle();
      if (configData) setShowroomConfig(configData);

      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('is_sold', false)
        .order('created_at', { ascending: false });

      const inStock = purchases || [];
      setRecentCars(inStock.slice(0, 4));

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data: salesThisMonth } = await supabase
        .from('sales')
        .select('id, total_price, amount_paid, balance, car_id, created_at, first_name, last_name')
        .gte('created_at', monthStart);

      const { data: purchasesThisMonth } = await supabase
        .from('purchases')
        .select('id, make, model, year, created_at')
        .gte('created_at', monthStart);

      const { data: allSales } = await supabase
        .from('sales')
        .select('id, total_price, created_at, first_name, last_name')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: allPurchases } = await supabase
        .from('purchases')
        .select('id, make, model, total_cost, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities = [
        ...(allSales || []).map(s => ({ 
          type: 'Vente', 
          val: s.total_price, 
          date: s.created_at, 
          label: `${s.first_name} ${s.last_name}` 
        })),
        ...(allPurchases || []).map(p => ({ 
          type: 'Achat', 
          val: p.total_cost, 
          date: p.created_at, 
          label: `${p.make} ${p.model}` 
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setRecentActivity(activities);

      const { data: suppliers } = await supabase.from('suppliers').select('id');
      const { data: inspections } = await supabase.from('inspections').select('id');
      const { data: workers } = await supabase.from('workers').select('id');

      setStats({
        carsInStock: inStock.length,
        partners: suppliers?.length || 0,
        inspections: inspections?.length || 0,
        salesThisMonth: salesThisMonth?.length || 0,
        purchasesThisMonth: purchasesThisMonth?.length || 0,
        workers: workers?.length || 0
      });

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-6 font-bold text-slate-600 uppercase tracking-widest text-xs">Loading Showroom...</p>
      </div>
    );
  }

  const dayName = clock.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'fr-FR', { weekday: 'long' });
  const dateName = clock.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'fr-FR');
  const timeName = clock.toLocaleTimeString();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HERO BANNER */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
            Welcome to {showroomConfig?.name || 'Showroom'} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-white/90 font-bold text-sm uppercase tracking-wide">
            <span>{dayName}</span>
            <span>•</span>
            <span>{dateName}</span>
            <span>•</span>
            <span className="font-mono text-white">{timeName}</span>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          emoji="🚗" 
          label="Vehicles in Stock" 
          value={stats.carsInStock} 
          max={50}
          progress={(stats.carsInStock / 50) * 100}
          color="blue"
        />
        <StatCard 
          emoji="🤝" 
          label="Partners" 
          value={stats.partners}
          color="indigo"
        />
        <StatCard 
          emoji="🔍" 
          label="Inspections" 
          value={stats.inspections}
          color="violet"
        />
        <StatCard 
          emoji="📋" 
          label="Sales This Month" 
          value={stats.salesThisMonth}
          color="emerald"
        />
        <StatCard 
          emoji="🛒" 
          label="Purchases This Month" 
          value={stats.purchasesThisMonth}
          color="amber"
        />
        <StatCard 
          emoji="👥" 
          label="Active Team" 
          value={stats.workers}
          color="rose"
        />
      </div>

      {/* ALERTS PANEL */}
      <AlertsPanel onNavigate={onNavigate} />

      {/* RECENT CARS IN STOCK */}
      <div className="space-y-4">
        <h3 className="text-slate-900 font-black text-lg">🚗 Recently Added Vehicles</h3>
        {recentCars.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-slate-500 font-bold">No vehicles in stock</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentCars.map((car, i) => (
              <div
                key={car.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 card-hover-lift"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {car.images && JSON.parse(car.images || '[]')[0] && (
                  <div className="h-32 overflow-hidden bg-slate-100">
                    <img 
                      src={JSON.parse(car.images)[0]} 
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-slate-900 font-black text-sm mb-1">{car.make} {car.model}</p>
                  <p className="text-slate-500 text-xs font-bold mb-3">{car.year} • {car.color}</p>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Cost: {Number(car.totalCost).toLocaleString()} DA</span>
                    <span className="text-indigo-600">Price: {Number(car.sellingPrice).toLocaleString()} DA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      <div className="space-y-4">
        <h3 className="text-slate-900 font-black text-lg">📊 Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 font-bold">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((act, i) => (
              <div
                key={i}
                className="bg-white border-l-4 border border-slate-200 border-l-indigo-500 rounded-xl p-4 flex items-center justify-between hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${act.type === 'Vente' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    {act.type === 'Vente' ? '💰' : '🛒'}
                  </div>
                  <div>
                    <p className="text-slate-900 font-black text-sm">{act.label}</p>
                    <p className="text-slate-500 text-xs font-bold">
                      {act.type} • {new Date(act.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-indigo-600 font-black text-sm">{Number(act.val).toLocaleString()} DA</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ emoji, label, value, max, progress, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  const progressMap: any = {
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    violet: 'bg-violet-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    rose: 'bg-rose-600'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all card-hover-lift">
      <div className="flex items-center gap-4 mb-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl ${colorMap[color]}`}>
          {emoji}
        </div>
        <p className="text-slate-600 text-xs font-black uppercase tracking-wider flex-1">{label}</p>
      </div>
      <p className="text-3xl font-black text-slate-900 mb-3">{value}</p>
      {max && progress !== undefined && (
        <div className="space-y-2">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressMap[color]} transition-all duration-300`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold">{Math.round(progress)}% Capacity ({value}/{max})</p>
        </div>
      )}
    </div>
  );
};

const AlertsPanel = ({ onNavigate }: { onNavigate?: (page: string) => void }) => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const checkPaymentAlerts = async () => {
      try {
        const { data: workers } = await supabase.from('workers').select('*');
        if (!workers) return;

        const today = new Date();
        const newAlerts: any[] = [];

        for (const worker of workers) {
          const { data: lastTx } = await supabase
            .from('worker_transactions')
            .select('created_at, date')
            .eq('worker_id', worker.id)
            .eq('type', 'paiement')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!lastTx || lastTx.length === 0) continue;

          const lastPaymentDate = new Date(lastTx[0].date || lastTx[0].created_at);

          if (worker.payment_type === 'month') {
            const nextDue = new Date(lastPaymentDate);
            nextDue.setMonth(nextDue.getMonth() + 1);
            const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilDue <= 2 && daysUntilDue >= 0) {
              newAlerts.push({
                id: worker.id,
                workerName: worker.fullname,
                daysUntilDue,
                amount: worker.amount,
                type: 'monthly',
                urgency: daysUntilDue === 0 ? 'critical' : daysUntilDue === 1 ? 'high' : 'medium'
              });
            }
          }
        }
        setAlerts(newAlerts);
      } catch (err) {
        console.error('Error checking payment alerts:', err);
      }
    };

    checkPaymentAlerts();
    const interval = setInterval(checkPaymentAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
        🔔 Payment Alerts
        <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse">
          {alerts.length}
        </span>
      </h3>
      {alerts.map((alert, i) => (
        <button
          key={alert.id}
          onClick={() => onNavigate?.('team')}
          className={`w-full text-left p-5 rounded-2xl border-l-4 border flex items-center justify-between gap-4 
            transition-all duration-300 hover:shadow-lg
            ${alert.urgency === 'critical' 
              ? 'bg-red-50 border border-red-200 border-l-red-500 hover:bg-red-100' 
              : alert.urgency === 'high'
              ? 'bg-amber-50 border border-amber-200 border-l-amber-500 hover:bg-amber-100'
              : 'bg-indigo-50 border border-indigo-200 border-l-indigo-500 hover:bg-indigo-100'
            }`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">
              {alert.urgency === 'critical' ? '🚨' : alert.urgency === 'high' ? '⚠️' : '🔔'}
            </span>
            <div>
              <p className="text-slate-900 font-black">{alert.workerName}</p>
              <p className={`text-xs font-bold ${alert.urgency === 'critical' ? 'text-red-600' : alert.urgency === 'high' ? 'text-amber-600' : 'text-indigo-600'}`}>
                {alert.daysUntilDue === 0 
                  ? "Payment due TODAY" 
                  : `Payment in ${alert.daysUntilDue} day(s)`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-slate-900 font-black">{Number(alert.amount).toLocaleString()} DA</p>
            <p className="text-indigo-600 text-xs font-black">Click → Pay</p>
          </div>
        </button>
      ))}
    </div>
  );
};
