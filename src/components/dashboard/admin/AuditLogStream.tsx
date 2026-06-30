'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, CreditCard, Shield, RefreshCw, Activity } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import type { AuditLog } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

function getActionIcon(description: string) {
  const d = description.toLowerCase();
  if (d.includes('lock')) return { icon: <Lock size={14} />, color: 'text-red-400 bg-red-500/10' };
  if (d.includes('unlock')) return { icon: <Unlock size={14} />, color: 'text-emerald-400 bg-emerald-500/10' };
  if (d.includes('payment')) return { icon: <CreditCard size={14} />, color: 'text-blue-400 bg-blue-500/10' };
  if (d.includes('role') || d.includes('permission')) return { icon: <Shield size={14} />, color: 'text-amber-400 bg-amber-500/10' };
  return { icon: <Activity size={14} />, color: 'text-slate-400 bg-slate-500/10' };
}

export function AuditLogStream() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = async () => {
    setRefreshing(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (data) setLogs(data);
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load and auto-refresh every 30 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-white">Live Audit Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">Auto-refreshes every 30s — Last: {formatTimeAgo(lastRefresh.toISOString())}</p>
        </div>
        <button
          id="audit-refresh"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white text-xs font-medium transition-all disabled:opacity-50 hover:bg-white/8"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Log entries */}
      <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {logs.map((log) => {
            const { icon, color } = getActionIcon(log.action_description);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">{log.action_description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-medium">{log.actor_name}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-600">{formatTimeAgo(log.timestamp)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-600">
        {logs.length} recent events
      </div>
    </div>
  );
}
