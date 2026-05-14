
import React, { useState, useEffect } from 'react';
import { Language, Worker } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface WorkerPaymentRecord {
  id: string;
  worker_id: string;
  amount: number;
  payment_date: string;
  payment_type: 'advance' | 'monthly' | 'daily';
  description?: string;
  created_at?: string;
  created_by?: string;
}

interface WorkerPaymentsProps {
  lang: Language;
}

export const WorkerPayments: React.FC<WorkerPaymentsProps> = ({ lang }) => {
  const t = translations[lang];
  const [payments, setPayments] = useState<WorkerPaymentRecord[]>([]);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [showCreatedDate, setShowCreatedDate] = useState(false);

  useEffect(() => {
    fetchCurrentWorker();
  }, []);

  const fetchCurrentWorker = async () => {
    try {
      const username = localStorage.getItem('autolux_user_name');
      if (username) {
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('username', username)
          .maybeSingle();
        
        if (data) {
          setCurrentWorker(data);
          await fetchPayments(data.id);
        }
      }
    } catch (err) {
      console.error('Error fetching current worker:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (workerId: string) => {
    try {
      const { data, error } = await supabase
        .from('worker_payments')
        .select('*')
        .eq('worker_id', workerId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      
      const paymentsList = data || [];
      setPayments(paymentsList);
      
      // Calculate total earned
      const total = paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
      setTotalEarned(total);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">💳</div>
          <p className="text-red-400/70 font-bold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentWorker) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400/70 font-bold">Erreur: Travailleur non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-400 text-white flex items-center justify-center text-4xl shadow-xl">
            💳
          </div>
          <div>
            <h1 className="text-4xl font-black text-red-100 tracking-tight">Historique des Paiements</h1>
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-1">Vos Transactions Financières</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreatedDate(!showCreatedDate)}
          className="px-6 py-3 bg-slate-50 rounded-2xl text-red-400/70 font-bold text-sm hover:bg-red-950/30 transition-all"
        >
          {showCreatedDate ? '📅 Masquer' : '📅 Afficher'} Dates
        </button>
      </div>

      {/* Worker Info Card */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2.5rem] p-8 border border-red-600/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Nom Complet</p>
            <p className="text-2xl font-black text-red-100">{currentWorker.fullname}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Type de Paiement</p>
            <p className="text-lg font-black text-red-400">
              {currentWorker.payment_type === 'month' ? '📅 Mensuel' : '📆 Quotidien'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Montant de Base</p>
            <p className="text-2xl font-black text-green-600">{currentWorker.amount?.toLocaleString()} DA</p>
          </div>
        </div>
      </div>

      {/* Total Earned Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[2.5rem] p-8 border border-green-200 shadow-sm">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3">Total Gagné</p>
          <p className="text-4xl font-black text-green-600">{totalEarned.toLocaleString()}</p>
          <p className="text-sm font-bold text-green-500 mt-2">DA</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2.5rem] p-8 border border-red-600/30 shadow-sm">
          <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-3">Nombre de Paiements</p>
          <p className="text-4xl font-black text-red-100">{payments.length}</p>
          <p className="text-sm font-bold text-red-400/70 mt-2">Transactions</p>
        </div>
      </div>

      {/* Payments History */}
      <div>
        <h2 className="text-2xl font-black text-red-100 mb-6">📜 Historique Détaillé</h2>
        {payments.length === 0 ? (
          <div className="bg-slate-50 rounded-[2rem] p-12 text-center border border-red-600/30">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-red-400/70 font-bold">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="glass-card rounded-[2.5rem] border border-red-600/20 shadow-sm hover:shadow-lg transition-all duration-300 p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {payment.payment_type === 'advance' ? '💰' : payment.payment_type === 'monthly' ? '📅' : '📆'}
                      </span>
                      <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">
                        {payment.payment_type === 'advance' ? 'Avance' : payment.payment_type === 'monthly' ? 'Mensuel' : 'Quotidien'}
                      </p>
                    </div>
                    <p className="text-3xl font-black text-red-100">
                      {payment.amount?.toLocaleString()} <span className="text-lg text-red-400/70">DA</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400/70 mb-1">
                      📅 {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                    </p>
                    {showCreatedDate && payment.created_at && (
                      <p className="text-xs font-bold text-red-400/70">
                        Créé: {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                {payment.description && (
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-red-600/20">
                    <p className="text-xs font-bold text-red-400/70">📝 Note</p>
                    <p className="text-sm text-red-100 font-semibold">{payment.description}</p>
                  </div>
                )}

                {payment.created_by && (
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400/70">
                    <span>👤</span>
                    <span>Créé par: {payment.created_by}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


