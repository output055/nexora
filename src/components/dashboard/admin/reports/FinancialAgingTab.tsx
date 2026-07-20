'use client';

import { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, ShieldAlert, BarChart3 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface FinancialAgingTabProps {
  devices: any[];
}

export function FinancialAgingTab({ devices }: FinancialAgingTabProps) {
  const agingStats = useMemo(() => {
    let healthyCount = 0;
    let mildRiskCount = 0;
    let highRiskCount = 0;
    let criticalRiskCount = 0;

    let healthyValue = 0;
    let mildRiskValue = 0;
    let highRiskValue = 0;
    let criticalRiskValue = 0;

    let expectedRevenue7Days = 0;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    devices.forEach(d => {
      // If fully paid, skip
      if (d.remaining_balance <= 0) return;

      const nextPaymentDate = new Date(d.next_payment_date);
      const daysOverdue = Math.floor((now.getTime() - nextPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
      const bal = Number(d.remaining_balance || 0);

      if (daysOverdue <= 0) {
        healthyCount++;
        healthyValue += bal;

        // Check if next payment falls within the next 7 days
        if (nextPaymentDate <= sevenDaysFromNow) {
          expectedRevenue7Days += Number(d.payment_cycle_amount || 0);
        }
      } else if (daysOverdue > 0 && daysOverdue <= 14) {
        mildRiskCount++;
        mildRiskValue += bal;
      } else if (daysOverdue > 14 && daysOverdue <= 30) {
        highRiskCount++;
        highRiskValue += bal;
      } else {
        criticalRiskCount++;
        criticalRiskValue += bal;
      }
    });

    const totalAtRisk = mildRiskValue + highRiskValue + criticalRiskValue;

    return {
      counts: { healthyCount, mildRiskCount, highRiskCount, criticalRiskCount },
      values: { healthyValue, mildRiskValue, highRiskValue, criticalRiskValue },
      totalAtRisk,
      expectedRevenue7Days
    };
  }, [devices]);

  const { counts, values, totalAtRisk, expectedRevenue7Days } = agingStats;

  const chartData = [
    { name: 'Healthy', value: values.healthyValue, count: counts.healthyCount, color: '#10b981' }, // emerald-500
    { name: 'Mild Risk (1-14d)', value: values.mildRiskValue, count: counts.mildRiskCount, color: '#f59e0b' }, // amber-500
    { name: 'High Risk (15-30d)', value: values.highRiskValue, count: counts.highRiskCount, color: '#ef4444' }, // red-500
    { name: 'Critical / Repossession', value: values.criticalRiskValue, count: counts.criticalRiskCount, color: '#991b1b' }, // red-800
  ].filter(d => d.value > 0);

  const formatGHS = (val: number) => `GHS ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="font-medium text-white mb-1">{data.name}</p>
          <p className="text-sm text-slate-300">Capital: <span className="font-bold text-white">{formatGHS(data.value)}</span></p>
          <p className="text-sm text-slate-300">Devices: <span className="font-bold text-white">{data.count}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertOctagon size={100} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="text-red-400" size={20} />
              <p className="text-sm font-medium text-slate-400">Total Capital At Risk</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatGHS(totalAtRisk)}</p>
            <p className="text-sm text-red-400 mt-2">
              {counts.mildRiskCount + counts.highRiskCount + counts.criticalRiskCount} accounts are overdue
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 size={100} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-emerald-400" size={20} />
              <p className="text-sm font-medium text-slate-400">7-Day Revenue Forecast</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatGHS(expectedRevenue7Days)}</p>
            <p className="text-sm text-emerald-400 mt-2">
              Based on {counts.healthyCount} healthy accounts
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Portfolio Risk Distribution</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No active devices found.
              </div>
            )}
          </div>
        </div>

        {/* Breakdown List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Aging Breakdown</h3>
          <div className="space-y-4">
            
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-emerald-400">Healthy</span>
                <span className="text-sm font-bold text-emerald-400">{formatGHS(values.healthyValue)}</span>
              </div>
              <p className="text-xs text-slate-400">{counts.healthyCount} devices</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-amber-400">Mild Risk (1-14d)</span>
                <span className="text-sm font-bold text-amber-400">{formatGHS(values.mildRiskValue)}</span>
              </div>
              <p className="text-xs text-slate-400">{counts.mildRiskCount} devices</p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-red-400">High Risk (15-30d)</span>
                <span className="text-sm font-bold text-red-400">{formatGHS(values.highRiskValue)}</span>
              </div>
              <p className="text-xs text-slate-400">{counts.highRiskCount} devices</p>
            </div>

            <div className="p-4 rounded-xl bg-red-900/30 border border-red-800/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-red-500">Critical / Repossession</span>
                <span className="text-sm font-bold text-red-500">{formatGHS(values.criticalRiskValue)}</span>
              </div>
              <p className="text-xs text-slate-400">{counts.criticalRiskCount} devices (30+ days)</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
