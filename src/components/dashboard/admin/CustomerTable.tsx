'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Lock, Unlock, Loader2, Apple, Smartphone, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/types';



interface CustomerTableProps {
  customers: Customer[];
  onCustomerUpdate?: (customerId: string, updates: Partial<Customer>) => void;
}

type SortKey = 'full_name' | 'remaining_balance' | 'payment_status';
type SortDir = 'asc' | 'desc';

export function CustomerTable({ customers, onCustomerUpdate }: CustomerTableProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'current' | 'overdue'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...customers]
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.full_name.toLowerCase().includes(q) || c.phone_number.includes(q) || c.device_model.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || c.payment_status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortKey === 'full_name') { aVal = a.full_name; bVal = b.full_name; }
      else if (sortKey === 'remaining_balance') { aVal = a.remaining_balance; bVal = b.remaining_balance; }
      else if (sortKey === 'payment_status') { aVal = a.payment_status; bVal = b.payment_status; }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });



  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-400" /> : <ChevronDown size={12} className="text-blue-400" />;
  };

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            id="customer-search"
            type="text"
            placeholder="Search by name, phone, or device…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'current', 'overdue'] as const).map((s) => (
            <button
              key={s}
              id={`filter-${s}`}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize
                ${filterStatus === s
                  ? s === 'overdue' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : s === 'current' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }
              `}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {[
                { label: 'Customer', key: 'full_name' as SortKey },
                { label: 'Device', key: null },
                { label: 'Platform', key: null },
                { label: 'Outstanding', key: 'remaining_balance' as SortKey },
                { label: 'Status', key: 'payment_status' as SortKey },
              ].map(({ label, key }) => (
                <th
                  key={label}
                  onClick={() => key && handleSort(key)}
                  className={`text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap ${key ? 'cursor-pointer hover:text-slate-300' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {key && <SortIcon field={key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sorted.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors group"
                >
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-white">{c.full_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.phone_number}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-300">{c.device_model}</p>
                    <p className="text-xs text-slate-600 mt-0.5">ID: {c.miradore_device_id}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold
                      ${c.os_platform === 'iOS' ? 'bg-slate-700/60 text-slate-300' : 'bg-emerald-500/10 text-emerald-400'}
                    `}>
                      {c.os_platform === 'iOS' ? <Apple size={12} /> : <Smartphone size={12} />}
                      {c.os_platform}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className={`text-sm font-bold tabular-nums ${c.remaining_balance > 0 ? 'text-white' : 'text-emerald-400'}`}>
                        {c.remaining_balance === 0 ? 'Paid ✓' : `GH₵${c.remaining_balance.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">of GH₵{c.total_owed.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
                      ${c.payment_status === 'overdue'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.payment_status === 'overdue' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      {c.payment_status === 'overdue' ? 'Overdue' : 'Current'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No customers match your search.</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/5 text-xs text-slate-600">
        Showing {sorted.length} of {customers.length} accounts
      </div>
    </div>
  );
}
