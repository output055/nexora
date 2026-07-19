'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/auth-context';
import { StatsCard } from '@/components/dashboard/admin/StatsCard';
import Link from 'next/link';

export default function FieldAgentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({
    collectionsThisMonth: 0,
    collectionsLastMonth: 0,
    totalLifetimeCollections: 0,
    totalTransactions: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      const supabase = createBrowserSupabaseClient();
      
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id, 
          amount_paid, 
          created_at, 
          collection_date,
          payment_method,
          transaction_reference,
          customers ( full_name )
        `)
        .eq('collector_id', user.id)
        .order('created_at', { ascending: false });

      if (!paymentsData) {
        setLoading(false);
        return;
      }

      setRecentPayments(paymentsData.slice(0, 10));

      const now = new Date();
      let collectionsThisMonth = 0;
      let collectionsLastMonth = 0;
      let totalLifetimeCollections = 0;
      let totalTransactions = paymentsData.length;

      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      paymentsData.forEach(p => {
        const d = new Date(p.collection_date || p.created_at);
        const amount = Number(p.amount_paid);
        totalLifetimeCollections += amount;

        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          collectionsThisMonth += amount;
        } else if (d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear()) {
          collectionsLastMonth += amount;
        }
      });

      const newChartData = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = monthNames[targetDate.getMonth()];
        
        const collected = paymentsData.reduce((sum, p) => {
          const d = new Date(p.collection_date || p.created_at);
          if (d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear()) {
            return sum + Number(p.amount_paid);
          }
          return sum;
        }, 0);

        newChartData.push({
          month: monthLabel,
          collected,
        });
      }

      setStats({
        collectionsThisMonth,
        collectionsLastMonth,
        totalLifetimeCollections,
        totalTransactions,
      });
      setChartData(newChartData);
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  const collDiff = stats.collectionsThisMonth - stats.collectionsLastMonth;
  const collDiffLabel = collDiff >= 0 
    ? `▲ GH₵${(collDiff).toFixed(2)} vs last month`
    : `▼ GH₵${Math.abs(collDiff).toFixed(2)} vs last month`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 max-w-[1400px] mx-auto p-4 md:p-8"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Overview</h1>
        <p className="text-slate-400">Track your personal collection performance and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          label="Collected This Month"
          value={stats.collectionsThisMonth}
          isCurrency
          trend={collDiff >= 0 ? 'up' : 'down'}
          trendLabel={collDiffLabel}
          icon={<CreditCard size={18} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          delay={0}
        />
        <StatsCard
          label="Lifetime Collections"
          value={stats.totalLifetimeCollections}
          isCurrency
          trend="up"
          trendLabel="All time cash collected"
          icon={<TrendingUp size={18} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
          delay={0.1}
        />
        <StatsCard
          label="Total Transactions"
          value={stats.totalTransactions}
          trend="neutral"
          trendLabel="Payments successfully logged"
          icon={<Calendar size={18} className="text-purple-400" />}
          iconBg="bg-purple-500/10"
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6">Collection Performance (6 Months)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `GH₵${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#34d399' }}
                  formatter={(val: number) => [`GH₵${val.toLocaleString()}`, 'Collected']}
                />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ fill: '#34d399', strokeWidth: 2, r: 4, stroke: '#111827' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Collections</h2>
            <Link href="/dashboard/admin/customers" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              Directory <ArrowUpRight size={14} />
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recentPayments.length === 0 && !loading ? (
              <p className="text-sm text-slate-500 text-center py-10">No collections yet.</p>
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-white">{payment.customers?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(payment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">+ GH₵{Number(payment.amount_paid).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{payment.payment_method.replace('_', ' ')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
