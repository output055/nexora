'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Apple, Smartphone, ChevronUp, ChevronDown, X, MoreVertical, Edit2, Trash2, Eye, CreditCard } from 'lucide-react';
import type { Customer } from '@/types';
import type { CustomerWithDevices } from '@/app/dashboard/admin/customers/page';
import Link from 'next/link';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';
import { EditCustomerModal } from './EditCustomerModal';
import LogPaymentForm from '@/components/dashboard/payments/LogPaymentForm';
import { deleteCustomerAction } from '@/app/actions/customers';
import { toast } from 'sonner';

interface CustomerTableProps {
  customers: CustomerWithDevices[];
  onCustomerUpdate?: (customerId: string, updates: Partial<CustomerWithDevices>) => void;
  onCustomerDelete?: (customerId: string) => void;
}

type SortKey = 'full_name' | 'remaining_balance' | 'payment_status' | 'created_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'current' | 'overdue';
type PlatformFilter = 'all' | 'iOS' | 'Android';
type CycleFilter = 'all' | 'daily' | 'weekly' | 'bi_weekly';

export function CustomerTable({ customers, onCustomerUpdate }: CustomerTableProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterPlatform, setFilterPlatform] = useState<PlatformFilter>('all');
  const [filterCycle, setFilterCycle] = useState<CycleFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithDevices | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<{ customer: CustomerWithDevices, deviceId: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() =>
    [...customers]
      .filter((c) => {
        const primaryDevice = c.devices?.[0];
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          c.full_name.toLowerCase().includes(q) ||
          c.phone_number.includes(q) ||
          (primaryDevice?.device_model || '').toLowerCase().includes(q) ||
          (c.ghana_card_id ?? '').toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || primaryDevice?.payment_status === filterStatus;
        const matchPlatform = filterPlatform === 'all' || primaryDevice?.os_platform === filterPlatform;
        const matchCycle = filterCycle === 'all' || c.payment_cycle === filterCycle;
        return matchSearch && matchStatus && matchPlatform && matchCycle;
      })
      .sort((a, b) => {
        const aDevice = a.devices?.[0];
        const bDevice = b.devices?.[0];
        
        if (sortKey === 'full_name') {
          return sortDir === 'asc'
            ? a.full_name.localeCompare(b.full_name)
            : b.full_name.localeCompare(a.full_name);
        }
        if (sortKey === 'remaining_balance') {
          const aBal = aDevice?.remaining_balance || 0;
          const bBal = bDevice?.remaining_balance || 0;
          return sortDir === 'asc'
            ? aBal - bBal
            : bBal - aBal;
        }
        if (sortKey === 'payment_status') {
          const aStat = aDevice?.payment_status || '';
          const bStat = bDevice?.payment_status || '';
          return sortDir === 'asc'
            ? aStat.localeCompare(bStat)
            : bStat.localeCompare(aStat);
        }
        if (sortKey === 'created_at') {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
        }
        return 0;
      }),
    [customers, search, filterStatus, filterPlatform, filterCycle, sortKey, sortDir]
  );

  const pagination = usePagination(filtered, 10);

  const hasActiveFilters =
    search || filterStatus !== 'all' || filterPlatform !== 'all' || filterCycle !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterPlatform('all');
    setFilterCycle('all');
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
  };

  const cycleLabel: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    bi_weekly: 'Bi-weekly',
    monthly: 'Monthly',
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    
    setIsDeleting(id);
    const { success, error } = await deleteCustomerAction(id);
    
    if (success) {
      toast.success('Customer deleted successfully');
      // Optimistic delete: hide it locally by updating via prop or just re-fetching.
      // Assuming onCustomerUpdate handles it or we'll add onCustomerDelete prop.
      // Wait, there's no onCustomerDelete in the parent, but I added it to props.
      // Let's call onCustomerUpdate with null or something. Actually, we'll just wait for the parent to refresh.
      // Let's rely on window.location.reload() or let parent handle it.
      window.location.reload(); 
    } else {
      toast.error(error || 'Failed to delete customer');
    }
    setIsDeleting(null);
  };

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 p-4 border-b border-white/5">
        {/* Row 1: search + clear */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              id="customer-search"
              type="text"
              placeholder="Search by name, phone, device, or Ghana Card ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all whitespace-nowrap"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>

        {/* Row 2: filter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Status */}
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-600 font-medium mr-0.5">Status:</span>
            {(['all', 'current', 'overdue'] as const).map((s) => (
              <button
                key={s}
                id={`filter-status-${s}`}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  filterStatus === s
                    ? s === 'overdue'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : s === 'current'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="w-px bg-white/8 self-stretch mx-1" />

          {/* Platform */}
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-600 font-medium mr-0.5">Platform:</span>
            {(['all', 'iOS', 'Android'] as const).map((p) => (
              <button
                key={p}
                id={`filter-platform-${p}`}
                onClick={() => setFilterPlatform(p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterPlatform === p
                    ? p === 'iOS'
                      ? 'bg-slate-700/60 text-slate-200 border border-slate-500/30'
                      : p === 'Android'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {p === 'iOS' && <Apple size={11} />}
                {p === 'Android' && <Smartphone size={11} />}
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>

          <div className="w-px bg-white/8 self-stretch mx-1" />

          {/* Payment cycle */}
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-600 font-medium mr-0.5">Cycle:</span>
            {(['all', 'daily', 'weekly', 'bi_weekly'] as const).map((c) => (
              <button
                key={c}
                id={`filter-cycle-${c}`}
                onClick={() => setFilterCycle(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCycle === c
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {c === 'all' ? 'All' : cycleLabel[c]}
              </button>
            ))}
          </div>
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
                { label: 'Cycle', key: null },
                { label: 'Outstanding', key: 'remaining_balance' as SortKey },
                { label: 'Status', key: 'payment_status' as SortKey },
                { label: 'Registered', key: 'created_at' as SortKey },
                { label: '', key: null }, // Actions column
              ].map(({ label, key }) => (
                <th
                  key={label}
                  onClick={() => key && handleSort(key)}
                  className={`text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap ${
                    key ? 'cursor-pointer hover:text-slate-300' : ''
                  }`}
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
              {pagination.paginated.map((c, i) => {
                const primaryDevice = c.devices?.[0];
                return (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-white">{c.full_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.phone_number}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-300">{primaryDevice?.device_model || 'No device'}</p>
                    {primaryDevice?.mdm_device_id && (
                      <p className="text-xs text-slate-600 mt-0.5">ID: {primaryDevice.mdm_device_id}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {primaryDevice?.os_platform ? (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
                        primaryDevice.os_platform === 'iOS'
                          ? 'bg-slate-700/60 text-slate-300'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {primaryDevice.os_platform === 'iOS' ? <Apple size={12} /> : <Smartphone size={12} />}
                        {primaryDevice.os_platform}
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-300 capitalize">
                      {c.payment_cycle ? cycleLabel[c.payment_cycle] ?? c.payment_cycle : '—'}
                    </p>
                    {primaryDevice?.payment_cycle_amount ? (
                      <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                        GH₵{Number(primaryDevice.payment_cycle_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={`text-sm font-bold tabular-nums ${
                      (primaryDevice?.remaining_balance || 0) > 0 ? 'text-white' : 'text-emerald-400'
                    }`}>
                      {(primaryDevice?.remaining_balance || 0) === 0 ? 'Paid ✓' : `GH₵${(primaryDevice?.remaining_balance || 0).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">of GH₵{(primaryDevice?.total_owed || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      primaryDevice?.payment_status === 'overdue'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        primaryDevice?.payment_status === 'overdue' ? 'bg-red-400' : 'bg-emerald-400'
                      }`} />
                      {primaryDevice?.payment_status === 'overdue' ? 'Overdue' : 'Current'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/admin/customers/${c.id}`}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 bg-transparent hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="View Details & History"
                      >
                        <Eye size={16} />
                      </Link>
                      {primaryDevice?.mdm_device_id && (
                        <Link
                          href={`/dashboard/admin/mdm?deviceId=${primaryDevice.mdm_device_id}`}
                          className="p-1.5 text-slate-400 hover:text-sky-400 bg-transparent hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="Manage Device"
                        >
                          <Smartphone size={16} />
                        </Link>
                      )}
                      <button
                        onClick={() => setPayingCustomer({ customer: c, deviceId: primaryDevice?.id || null })}
                        disabled={isDeleting === c.id}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 bg-transparent hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Log Payment"
                      >
                        <CreditCard size={16} />
                      </button>
                      <button
                        onClick={() => setEditingCustomer(c)}
                        disabled={isDeleting === c.id}
                        className="p-1.5 text-slate-400 hover:text-blue-400 bg-transparent hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={isDeleting === c.id}
                        className="p-1.5 text-slate-400 hover:text-red-400 bg-transparent hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )})}
            </AnimatePresence>
          </tbody>
        </table>

        {pagination.paginated.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No customers match your filters.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-blue-400 hover:underline">
                Clear all filters
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
        pageSizeOptions={[10, 25, 50]}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="accounts"
      />

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={(updates) => {
            if (onCustomerUpdate) {
              onCustomerUpdate(editingCustomer.id, updates);
            }
          }}
        />
      )}

      <AnimatePresence>
        {payingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md"
            >
              <button
                onClick={() => setPayingCustomer(null)}
                className="absolute -top-4 -right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
              <LogPaymentForm
                customerId={payingCustomer.customer.id}
                deviceId={payingCustomer.deviceId || undefined}
                remainingBalance={Number(payingCustomer.customer.devices?.[0]?.remaining_balance) || 0}
                customerEmail="customer@nexora.test" 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
