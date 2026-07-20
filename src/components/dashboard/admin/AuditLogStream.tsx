'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, CreditCard, Shield, RefreshCw, Activity, Search, X, Calendar } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import type { AuditLog } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';

type ActionFilter = 'all' | 'lock' | 'unlock' | 'payment' | 'role' | 'system';
type DateFilter = 'today' | '7d' | '30d' | 'all';

function getActionIcon(description: string) {
  const d = description.toLowerCase();
  if (d.includes('lock') && !d.includes('unlock')) return { icon: <Lock size={14} />, color: 'text-red-400 bg-red-500/10', type: 'lock' };
  if (d.includes('unlock')) return { icon: <Unlock size={14} />, color: 'text-emerald-400 bg-emerald-500/10', type: 'unlock' };
  if (d.includes('payment') || d.includes('balance')) return { icon: <CreditCard size={14} />, color: 'text-blue-400 bg-blue-500/10', type: 'payment' };
  if (d.includes('role') || d.includes('permission')) return { icon: <Shield size={14} />, color: 'text-amber-400 bg-amber-500/10', type: 'role' };
  return { icon: <Activity size={14} />, color: 'text-slate-400 bg-slate-500/10', type: 'system' };
}

const DATE_LABELS: Record<DateFilter, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

const ACTION_LABELS: Record<ActionFilter, string> = {
  all: 'All',
  lock: 'Lock',
  unlock: 'Unlock',
  payment: 'Payment',
  role: 'Role',
  system: 'System',
};

export function AuditLogStream() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const refresh = async () => {
    setRefreshing(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500); // raised from 50 — client-side pagination handles display

      if (data) setLogs(data);
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<DateFilter, number> = {
      today: now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
      all: 0,
    };
    const cutoff = cutoffs[dateFilter];

    return logs.filter((log) => {
      const { type } = getActionIcon(log.action_description);
      const q = search.toLowerCase();

      const matchSearch =
        !q ||
        log.action_description.toLowerCase().includes(q) ||
        log.actor_name.toLowerCase().includes(q);

      const matchAction = actionFilter === 'all' || type === actionFilter;

      const matchDate = dateFilter === 'all' || new Date(log.timestamp).getTime() >= cutoff;

      return matchSearch && matchAction && matchDate;
    });
  }, [logs, search, actionFilter, dateFilter]);

  const pagination = usePagination(filtered, 25);
  const hasActiveFilters = search || actionFilter !== 'all' || dateFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-white">Live Audit Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-refreshes every 30s — Last: {formatTimeAgo(lastRefresh.toISOString())}
          </p>
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

      {/* Filters */}
      <div className="flex flex-col gap-3 px-5 py-3 border-b border-white/5">
        {/* Search */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              id="log-search"
              type="text"
              placeholder="Search by action or actor name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/8 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all whitespace-nowrap"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>

        {/* Action type + Date */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Action tabs */}
          <div className="flex gap-1.5 items-center flex-wrap">
            {(Object.keys(ACTION_LABELS) as ActionFilter[]).map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  actionFilter === a
                    ? a === 'lock' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : a === 'unlock' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : a === 'payment' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : a === 'role' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : a === 'system' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    : 'bg-white/10 text-white border border-white/15'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>

          <div className="w-px bg-white/8 self-stretch mx-1" />

          {/* Date range */}
          <div className="flex gap-1.5 items-center">
            <Calendar size={12} className="text-slate-600" />
            {(Object.keys(DATE_LABELS) as DateFilter[]).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateFilter === d
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {DATE_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="divide-y divide-white/5 min-h-[120px]">
        <AnimatePresence>
          {pagination.paginated.map((log) => {
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

        {pagination.paginated.length === 0 && (
          <div className="text-center py-10 text-slate-600">
            <Activity size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {logs.length === 0 ? 'No events recorded yet.' : 'No events match your filters.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-blue-400 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <PaginationBar
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        pageSize={pagination.pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="events"
      />
    </div>
  );
}
