'use client';

import { useMemo } from 'react';
import { Trophy, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AgentPerformanceTabProps {
  users: any[];
  payments: any[];
}

export function AgentPerformanceTab({ users, payments }: AgentPerformanceTabProps) {
  const agentStats = useMemo(() => {
    const stats: Record<string, { id: string; email: string; totalCollected: number; txCount: number; lastActive: string }> = {};

    // Only agents are likely to have collected payments, but we aggregate by all users
    users.forEach(u => {
      stats[u.id] = { id: u.id, email: u.email, totalCollected: 0, txCount: 0, lastActive: 'Never' };
    });

    payments.forEach(p => {
      if (p.collector_id && stats[p.collector_id]) {
        stats[p.collector_id].totalCollected += Number(p.amount_paid || 0);
        stats[p.collector_id].txCount += 1;
        
        // Find most recent collection
        const pDate = new Date(p.created_at);
        if (stats[p.collector_id].lastActive === 'Never' || pDate > new Date(stats[p.collector_id].lastActive)) {
          stats[p.collector_id].lastActive = pDate.toISOString();
        }
      }
    });

    // Filter out users with zero collections to keep the leaderboard clean
    return Object.values(stats)
      .filter(s => s.totalCollected > 0)
      .sort((a, b) => b.totalCollected - a.totalCollected);
  }, [users, payments]);

  const topPerformer = agentStats[0];

  const chartData = agentStats.map(s => ({
    name: s.email.split('@')[0],
    amount: s.totalCollected,
  })).slice(0, 10); // Top 10 for the chart

  const formatGHS = (val: number) => `GHS ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Trophy className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Top Performer</p>
            <p className="text-xl font-bold text-white truncate max-w-[150px]">
              {topPerformer ? topPerformer.email.split('@')[0] : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <DollarSign className="text-emerald-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Top Collection Vol.</p>
            <p className="text-xl font-bold text-white">
              {topPerformer ? formatGHS(topPerformer.totalCollected) : 'GHS 0.00'}
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Activity className="text-purple-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Active Agents</p>
            <p className="text-xl font-bold text-white">{agentStats.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Collection Leaderboard</h3>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `GH₵${val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No collection data available
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto max-h-[400px] custom-scrollbar">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Agent Detail</h3>
          </div>
          
          <div className="space-y-3">
            {agentStats.length > 0 ? (
              agentStats.map((agent, i) => (
                <div key={agent.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-slate-400'}`}>
                        {i + 1}
                      </span>
                      <p className="font-medium text-white text-sm truncate max-w-[120px]" title={agent.email}>
                        {agent.email.split('@')[0]}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">
                      {formatGHS(agent.totalCollected)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{agent.txCount} transactions</span>
                    <span>Last active: {agent.lastActive !== 'Never' ? new Date(agent.lastActive).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No agents have collected payments yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
