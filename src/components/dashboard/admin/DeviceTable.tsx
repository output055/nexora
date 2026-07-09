'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Search, Lock, Unlock, Loader2, Apple, Smartphone, ChevronUp, ChevronDown, X, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/types';
import type { DeviceWithCustomer } from '@/app/dashboard/admin/devices/page';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';
import LogPaymentForm from '@/components/dashboard/payments/LogPaymentForm';

interface DeviceTableProps {
  devices: DeviceWithCustomer[];
  onDeviceUpdate?: (deviceId: string, updates: Partial<DeviceWithCustomer>) => void;
}

type SortKey = 'full_name' | 'device_model' | 'os_platform' | 'payment_status';
type SortDir = 'asc' | 'desc';
type PlatformFilter = 'all' | 'iOS' | 'Android';
type LockFilter = 'all' | 'locked' | 'unlocked';

export function DeviceTable({ devices, onDeviceUpdate }: DeviceTableProps) {
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<PlatformFilter>('all');
  const [filterLock, setFilterLock] = useState<LockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('device_model');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedDeviceForPayment, setSelectedDeviceForPayment] = useState<DeviceWithCustomer | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() =>
    [...devices]
      .filter((d) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          d.customers?.full_name.toLowerCase().includes(q) ||
          d.device_model.toLowerCase().includes(q) ||
          d.mdm_device_id.toLowerCase().includes(q) ||
          d.customers?.phone_number.includes(q);
        const matchPlatform = filterPlatform === 'all' || d.os_platform === filterPlatform;
        const matchLock =
          filterLock === 'all' ||
          (filterLock === 'locked' && d.payment_status === 'overdue') ||
          (filterLock === 'unlocked' && d.payment_status !== 'overdue');
        return matchSearch && matchPlatform && matchLock;
      })
      .sort((a, b) => {
        const aVal = String((sortKey === 'full_name' ? a.customers?.full_name : (a as any)[sortKey]) ?? '');
        const bVal = String((sortKey === 'full_name' ? b.customers?.full_name : (b as any)[sortKey]) ?? '');
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }),
    [devices, search, filterPlatform, filterLock, sortKey, sortDir]
  );

  const pagination = usePagination(filtered, 10);

  const hasActiveFilters = search || filterPlatform !== 'all' || filterLock !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterPlatform('all');
    setFilterLock('all');
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
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
              id="device-search"
              type="text"
              placeholder="Search by owner, device model, Scalefusion ID, or phone…"
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
              Clear
            </button>
          )}
        </div>

        {/* Row 2: filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Platform */}
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-600 font-medium mr-0.5">Platform:</span>
            {(['all', 'iOS', 'Android'] as const).map((p) => (
              <button
                key={p}
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

          {/* Lock status */}
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-600 font-medium mr-0.5">Lock:</span>
            {([
              { value: 'all', label: 'All' },
              { value: 'locked', label: 'Locked' },
              { value: 'unlocked', label: 'Unlocked' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterLock(value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterLock === value
                    ? value === 'locked'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : value === 'unlocked'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {value === 'locked' && <Lock size={10} />}
                {value === 'unlocked' && <Unlock size={10} />}
                {label}
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
                { label: 'Device Model', key: 'device_model' as SortKey },
                { label: 'Platform', key: 'os_platform' as SortKey },
                { label: 'Owner', key: 'full_name' as SortKey },
                { label: 'Lock Status', key: 'payment_status' as SortKey },
                { label: 'Action', key: null },
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
              {pagination.paginated.map((d, i) => {
                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-white">{d.device_model}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ID: {d.mdm_device_id}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
                        d.os_platform === 'iOS'
                          ? 'bg-slate-700/60 text-slate-300'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {d.os_platform === 'iOS' ? <Apple size={12} /> : <Smartphone size={12} />}
                        {d.os_platform}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-slate-300">{d.customers?.full_name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{d.customers?.phone_number}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        d.payment_status === 'overdue'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {d.payment_status === 'overdue'
                          ? <><Lock size={10} /> Locked</>
                          : <><Unlock size={10} /> Unlocked</>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/admin/mdm?deviceId=${d.mdm_device_id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/20"
                        >
                          <Smartphone size={12} />
                          Manage
                        </Link>
                        {d.remaining_balance > 0 && (
                          <button
                            onClick={() => setSelectedDeviceForPayment(d)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-400 transition-all hover:bg-purple-500/20"
                          >
                            <Banknote size={12} />
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {pagination.paginated.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No devices match your filters.</p>
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
        itemLabel="devices"
      />

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedDeviceForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <button
                onClick={() => setSelectedDeviceForPayment(null)}
                className="absolute -top-4 -right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
              <LogPaymentForm
                customerId={selectedDeviceForPayment.customer_id}
                deviceId={selectedDeviceForPayment.id}
                remainingBalance={Number(selectedDeviceForPayment.remaining_balance) || 0}
                customerEmail="customer@nexora.test" // Mock email for Paystack demo
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
