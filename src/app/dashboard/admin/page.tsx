'use client';

import { useState, useEffect } from 'react';
import { getCalculatedPaymentStatus } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { StatsCard } from '@/components/dashboard/admin/StatsCard';
import { CustomerTable } from '@/components/dashboard/admin/CustomerTable';
import { AuditLogStream } from '@/components/dashboard/admin/AuditLogStream';
import { mockDashboardStats, collectionsChartData } from '@/lib/mock-data';
import type { Customer } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<DashboardStats & { collectionsLastMonth?: number }>(mockDashboardStats);
  const [chartData, setChartData] = useState(collectionsChartData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createBrowserSupabaseClient();
      
      const [
        { data: customersData },
        { data: devicesData },
        { data: paymentsData }
      ] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('devices').select('id, payment_status, total_owed, remaining_balance, next_payment_date'),
        supabase.from('payments').select('amount_paid, created_at, collection_date')
      ]);

      if (customersData) setCustomers(customersData);

      let totalCapitalDeployed = 0;
      let activeAccounts = 0;
      let overdueAccounts = 0;

      if (devicesData) {
        totalCapitalDeployed = devicesData.reduce((sum, d) => sum + Number(d.total_owed), 0);
        activeAccounts = devicesData.length;
        overdueAccounts = devicesData.filter((d) => 
          getCalculatedPaymentStatus(d.payment_status, d.remaining_balance || 0, d.next_payment_date) === 'overdue'
        ).length;
      }

      let collectionsThisMonth = 0;
      let collectionsLastMonth = 0;
      const now = new Date();
      const newChartData = [...collectionsChartData];

      if (paymentsData) {
        // Calculate collections this month and last month
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        collectionsThisMonth = paymentsData.reduce((sum, p) => {
          const d = new Date(p.collection_date || p.created_at);
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            return sum + Number(p.amount_paid);
          }
          return sum;
        }, 0);

        collectionsLastMonth = paymentsData.reduce((sum, p) => {
          const d = new Date(p.collection_date || p.created_at);
          if (d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear()) {
            return sum + Number(p.amount_paid);
          }
          return sum;
        }, 0);

        // Update chart data with actuals for the last 6 months
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

          newChartData[5 - i] = {
            ...newChartData[5 - i],
            month: monthLabel,
            collected,
          };
        }
      }

      setStats({
        ...mockDashboardStats,
        totalCapitalDeployed,
        activeAccounts,
        overdueAccounts,
        collectionsThisMonth,
        collectionsLastMonth,
        overdueRate: activeAccounts > 0 ? (overdueAccounts / activeAccounts) * 100 : 0
      });
      setChartData(newChartData);
      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  const handleCustomerUpdate = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const formatCapital = (val: number) => {
    if (val >= 1000000) return `GH₵${(val / 1000000).toFixed(2)}M total`;
    if (val >= 1000) return `GH₵${(val / 1000).toFixed(0)}K total`;
    return `GH₵${val} total`;
  };

  const collDiff = stats.collectionsThisMonth - (stats.collectionsLastMonth || 0);
  const collDiffLabel = collDiff >= 0 
    ? `▲ GH₵${(collDiff / 1000).toFixed(1)}K vs last month`
    : `▼ GH₵${(Math.abs(collDiff) / 1000).toFixed(1)}K vs last month`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 max-w-[1400px] mx-auto"
    >
      {/* ── Stats Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Capital Deployed"
          value={stats.totalCapitalDeployed}
          isCurrency
          trend="up"
          trendLabel={formatCapital(stats.totalCapitalDeployed)}
          icon={<DollarSign size={18} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
          delay={0}
        />
        <StatsCard
          label="Active Accounts"
          value={stats.activeAccounts}
          trend="neutral"
          trendLabel="Live data"
          icon={<Users size={18} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          delay={0.05}
        />
        <StatsCard
          label="Overdue Accounts"
          value={stats.overdueAccounts}
          trend={stats.overdueAccounts > 2 ? 'down' : 'up'}
          trendLabel={`${stats.overdueRate.toFixed(0)}% overdue rate`}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          iconBg="bg-red-500/10"
          delay={0.1}
        />
        <StatsCard
          label="Collected This Month"
          value={stats.collectionsThisMonth}
          isCurrency
          trend={collDiff >= 0 ? "up" : "down"}
          trendLabel={collDiffLabel}
          icon={<TrendingUp size={18} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
          delay={0.15}
        />
      </div>

      {/* ── Collections Chart ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111827] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white">Collections Performance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly collected vs. target — last 6 months</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Collected
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              Target
            </div>
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#475569' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#475569' }}
                tickFormatter={(v) => `GH₵${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1E293B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#E2E8F0',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [`GH₵${value.toLocaleString()}`, '']}
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              />
              <Bar dataKey="target" fill="rgba(255,255,255,0.08)" radius={[4, 4, 4, 4]} barSize={32} />
              <Bar dataKey="collected" fill="#3B82F6" radius={[4, 4, 4, 4]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
}
