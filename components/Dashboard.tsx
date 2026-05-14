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
    salesThisMonth: 0,
    purchasesThisMonth: 0,
    workers: 0,
    totalRevenue: 0
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentCars, setRecentCars] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showroomConfig, setShowroomConfig] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
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
      setRecentCars(inStock.slice(0, 6));

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
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

      setRecentActivity(activities);

      const { data: suppliers } = await supabase.from('suppliers').select('id');
      const { data: workers } = await supabase.from('workers').select('id');
      const totalRevenue = (allSales || []).reduce((sum, s) => sum + Number(s.total_price || 0), 0);

      setStats({
        carsInStock: inStock.length,
        partners: suppliers?.length || 0,
        salesThisMonth: salesThisMonth?.length || 0,
        purchasesThisMonth: purchasesThisMonth?.length || 0,
        workers: workers?.length || 0,
        totalRevenue
      });

      // Fetch alerts
      fetchAlerts();
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const today = new Date();
      const newAlerts: any[] = [];

      // 1. Worker Payment Alerts
      const { data: workers } = await supabase.from('workers').select('*');
      if (workers) {
        for (const worker of workers) {
          const { data: lastTx } = await supabase
            .from('worker_transactions')
            .select('created_at, date')
            .eq('worker_id', worker.id)
            .eq('type', 'paiement')
            .order('created_at', { ascending: false })
            .limit(1);

          const lastPaymentDate = (lastTx && lastTx.length > 0) 
            ? new Date(lastTx[0].date || lastTx[0].created_at)
            : new Date(worker.created_at);

          if (worker.payment_type === 'month') {
            const nextDue = new Date(lastPaymentDate);
            nextDue.setMonth(nextDue.getMonth() + 1);
            const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilDue <= 5 && daysUntilDue >= -5) {
              newAlerts.push({
                id: `worker_${worker.id}`,
                title: worker.fullname,
                daysUntilDue,
                amount: worker.amount,
                type: 'payment',
                urgency: daysUntilDue <= 0 ? 'critical' : daysUntilDue <= 2 ? 'high' : 'medium',
                emoji: '💰',
                label: 'Paiement Salarié',
                actionLabel: 'Régler',
                route: 'team'
              });
            }
          }
        }
      }

      // 2. Vehicle Assurance & Contrôle Alerts
      const { data: vehicles } = await supabase
        .from('purchases')
        .select('id, make, model, plate, insurance_expiry, tech_control_date')
        .eq('is_sold', false);
        
      if (vehicles) {
        for (const v of vehicles) {
          if (v.insurance_expiry) {
            const expDate = new Date(v.insurance_expiry);
            const daysUntilDue = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 20) {
              newAlerts.push({
                id: `ins_${v.id}`,
                title: `${v.make} ${v.model}`,
                subtitle: v.plate,
                daysUntilDue,
                type: 'insurance',
                urgency: daysUntilDue <= 0 ? 'critical' : daysUntilDue <= 7 ? 'high' : 'medium',
                emoji: '🛡️',
                label: 'Assurance Expire',
                actionLabel: 'Détails',
                route: 'showroom'
              });
            }
          }

          if (v.tech_control_date) {
            const expDate = new Date(v.tech_control_date);
            const daysUntilDue = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 20) {
              newAlerts.push({
                id: `tech_${v.id}`,
                title: `${v.make} ${v.model}`,
                subtitle: v.plate,
                daysUntilDue,
                type: 'tech',
                urgency: daysUntilDue <= 0 ? 'critical' : daysUntilDue <= 7 ? 'high' : 'medium',
                emoji: '🛠️',
                label: 'Contrôle Technique',
                actionLabel: 'Détails',
                route: 'showroom'
              });
            }
          }
        }
      }

      // 3. Debt Alerts
      const { data: debts } = await supabase.from('sales').select('id, first_name, last_name, balance, created_at').gt('balance', 0).order('created_at', { ascending: true }).limit(5);
      if (debts) {
        for (const debt of debts) {
          const createdDate = new Date(debt.created_at);
          const daysOverdue = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 30) {
            newAlerts.push({
              id: `debt_${debt.id}`,
              title: `${debt.first_name} ${debt.last_name}`,
              daysUntilDue: -daysOverdue,
              amount: debt.balance,
              type: 'debt',
              urgency: daysOverdue > 90 ? 'critical' : daysOverdue > 60 ? 'high' : 'medium',
              emoji: '💳',
              label: 'Dette Impayée',
              actionLabel: 'Récupérer',
              route: 'billing'
            });
          }
        }
      }

      newAlerts.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.daysUntilDue - b.daysUntilDue;
      });
      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="h-16 w-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
        <p className="mt-6 font-bold text-red-400/60 uppercase tracking-widest text-xs">Chargement...</p>
      </div>
    );
  }

  const dayName = clock.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'fr-FR', { weekday: 'long' });
  const dateName = clock.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'fr-FR');
  const timeName = clock.toLocaleTimeString();

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
      
      {/* HERO BANNER — Login-style Premium */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-red-700 rounded-full blur-[120px] opacity-8 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-6">
            {showroomConfig?.name || 'Showroom'} Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <span className="text-red-500">📅</span>
              <span>{dayName}</span>
            </div>
            <span className="text-red-600/40">•</span>
            <div className="flex items-center gap-2">
              <span className="text-red-500">📆</span>
              <span>{dateName}</span>
            </div>
            <span className="text-red-600/40">•</span>
            <div className="flex items-center gap-2">
              <span className="text-red-500">🕐</span>
              <span className="font-mono text-red-300">{timeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KEY METRICS — Premium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard emoji="🚗" label="Véhicules en Stock" value={stats.carsInStock} color="blue" />
        <MetricCard emoji="📋" label="Ventes ce Mois" value={stats.salesThisMonth} color="red" />
        <MetricCard emoji="🛒" label="Achats ce Mois" value={stats.purchasesThisMonth} color="amber" />
        <MetricCard emoji="🤝" label="Fournisseurs" value={stats.partners} color="violet" />
        <MetricCard emoji="👥" label="Équipe Active" value={stats.workers} color="rose" />
      </div>

      {/* ALERTS SECTION — Major Focus */}
      {alerts.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                Alertes Urgentes
              </h2>
            </div>
            <span className="glass-card px-6 py-2 rounded-full text-red-400 text-xs font-black uppercase tracking-wider">
              {alerts.length} Notification{alerts.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {alerts.map((alert, i) => (
              <AlertCard key={alert.id} alert={alert} onNavigate={onNavigate} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* RECENT VEHICLES */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 flex items-center gap-3">
          <span className="text-4xl">🚗</span>
          Nouveaux Véhicules
        </h2>
        {recentCars.length === 0 ? (
          <div className="glass-card rounded-[2.5rem] p-16 text-center border border-red-600/30">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-red-400/70 font-black uppercase tracking-wider">Aucun véhicule en stock</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCars.map((car, i) => (
              <VehicleCard key={car.id} car={car} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          Activité Récente
        </h2>
        {recentActivity.length === 0 ? (
          <div className="glass-card rounded-[2.5rem] p-16 text-center border border-red-600/30">
            <p className="text-red-400/70 font-black">Aucune activité</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((act, i) => (
              <ActivityItem key={i} activity={act} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ emoji, label, value, subtext, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-600/20 text-blue-400',
    red: 'bg-red-600/20 text-red-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    amber: 'bg-amber-600/20 text-amber-400',
    violet: 'bg-violet-600/20 text-violet-400',
    rose: 'bg-rose-600/20 text-rose-400'
  };

  return (
    <div className="glass-card p-8 rounded-[2.5rem] border border-red-600/40 relative overflow-hidden group hover:border-red-600/60 transition-all duration-300 hover:shadow-lg hover:shadow-red-600/20">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={`h-14 w-14 rounded-[1.5rem] flex items-center justify-center text-3xl ${colorMap[color]} border border-current/30`}>
            {emoji}
          </div>
          <p className="text-red-500/50 text-xs font-black uppercase tracking-widest group-hover:text-red-400 transition-colors">Premium</p>
        </div>
        <p className="text-red-400/70 text-xs font-black uppercase tracking-wider mb-2">{label}</p>
        <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">
          {value}
          {subtext && <span className="text-xl text-red-400/70 ml-1">{subtext}</span>}
        </p>
      </div>
    </div>
  );
};

const AlertCard = ({ alert, onNavigate, index }: any) => {
  const urgencyColors: any = {
    critical: 'from-rose-950 to-red-950 border-rose-600/40 bg-rose-600/10',
    high: 'from-amber-950 to-orange-950 border-amber-600/40 bg-amber-600/10',
    medium: 'from-blue-950 to-cyan-950 border-blue-600/40 bg-blue-600/10'
  };

  const urgencyEmoji: any = {
    critical: '🔴',
    high: '🟠',
    medium: '🔵'
  };

  return (
    <button
      onClick={() => onNavigate?.(alert.route)}
      className={`glass-card p-8 rounded-[2.5rem] border bg-gradient-to-br ${urgencyColors[alert.urgency]} hover:scale-105 hover:-translate-y-2 transition-all duration-300 cursor-pointer group relative overflow-hidden text-left`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="text-5xl animate-bounce" style={{ animationDelay: `${index * 200}ms` }}>
            {alert.emoji}
          </div>
          <div>
            <p className="text-xl font-black text-red-100 mb-1">{alert.title}</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-red-300 bg-red-600/20 px-3 py-1 rounded-lg">
                {alert.label}
              </span>
              <span className="text-2xl">{urgencyEmoji[alert.urgency]}</span>
            </div>
            {alert.subtitle && (
              <p className="text-xs font-mono text-red-400/70">{alert.subtitle}</p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-2xl font-black tracking-tight ${
            alert.urgency === 'critical' ? 'text-rose-400' : 
            alert.urgency === 'high' ? 'text-amber-400' : 
            'text-blue-400'
          }`}>
            {alert.daysUntilDue === 0 ? 'AUJOURD\'HUI' : 
             alert.daysUntilDue < 0 ? `RETARD ${Math.abs(alert.daysUntilDue)}J` :
             `${alert.daysUntilDue}J`}
          </p>
          <p className="text-xs font-black text-red-400/70 uppercase tracking-wider mt-4">
            {alert.actionLabel} →
          </p>
        </div>
      </div>
    </button>
  );
};

const VehicleCard = ({ car, index }: any) => {
  let photoUrl = '';
  try {
    if (car.photo_urls) {
      const urls = typeof car.photo_urls === 'string' ? JSON.parse(car.photo_urls) : car.photo_urls;
      photoUrl = Array.isArray(urls) ? urls[0] : '';
    }
  } catch (e) {
    console.warn('Photo URL parse error:', e);
  }

  return (
    <div
      className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 hover:border-red-600/60 hover:shadow-lg hover:shadow-red-600/20 transition-all duration-300 hover:scale-105 hover:-translate-y-2 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {photoUrl && (
        <div className="h-40 overflow-hidden bg-red-950/50 relative">
          <img 
            src={photoUrl} 
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        </div>
      )}
      <div className="p-6 space-y-4">
        <div>
          <p className="text-red-100 font-black text-lg mb-1">{car.make} {car.model}</p>
          <div className="flex items-center gap-3 text-xs text-red-400/70 font-black">
            <span>{car.year}</span>
            <span>•</span>
            <span>{car.color}</span>
            <span>•</span>
            <span>{car.plate}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-red-600/20">
          <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">✓ En Stock</span>
          <span className="text-red-400/60 text-xs font-black uppercase tracking-wider">Détails →</span>
        </div>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity, index }: any) => {
  const isVente = activity.type === 'Vente';
  
  return (
    <div
      className="glass-card p-6 rounded-[2rem] border border-red-600/30 hover:border-red-600/50 hover:shadow-lg hover:shadow-red-600/20 transition-all duration-300 flex items-center justify-between group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-5">
        <div className={`h-14 w-14 rounded-[1.2rem] flex items-center justify-center text-2xl ${
          isVente ? 'bg-emerald-600/20' : 'bg-blue-600/20'
        } border ${isVente ? 'border-emerald-600/30' : 'border-blue-600/30'} group-hover:scale-110 transition-transform`}>
          {isVente ? '💰' : '🛒'}
        </div>
        <div>
          <p className="text-red-100 font-black text-sm">{activity.label}</p>
          <p className="text-red-500/50 text-xs uppercase font-black tracking-wider">
            {activity.type} • {new Date(activity.date).toLocaleDateString()}
          </p>
        </div>
      </div>
      <p className={`font-black text-xs uppercase tracking-wider ${isVente ? 'text-emerald-400' : 'text-blue-400'}`}>
        {isVente ? 'Vente Conclue' : 'Achat Fait'}
      </p>
    </div>
  );
};
