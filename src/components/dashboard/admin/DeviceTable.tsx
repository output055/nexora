'use client';

import { useState, useMemo } from 'react';
import { getCalculatedPaymentStatus } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { Smartphone, Apple, CheckCircle2, Lock, XCircle, Search, Filter, RefreshCw, X, ChevronDown, ChevronUp, FileText, Unlock, Loader2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';
import type { Customer } from '@/types';
import type { DeviceWithCustomer } from '@/app/dashboard/admin/devices/page';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';
import { EditDeviceModal } from './EditDeviceModal';
import { deleteDeviceAction } from '@/app/actions/device-db';

interface DeviceTableProps {
  devices: DeviceWithCustomer[];
  onDeviceUpdate?: (deviceId: string, updates: Partial<DeviceWithCustomer>) => void;
}

type SortKey = 'full_name' | 'device_model' | 'os_platform' | 'payment_status';
type SortDir = 'asc' | 'desc';
type PlatformFilter = 'all' | 'iOS' | 'Android';
type LockFilter = 'all' | 'locked' | 'unlocked';

export function DeviceTable({ devices, onDeviceUpdate }: DeviceTableProps) {
  const { user } = useAuth();
  const isPaystackReviewer = user?.roles.some(r => r.name === 'paystack_reviewer');
  
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<PlatformFilter>('all');
  const [filterLock, setFilterLock] = useState<LockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('device_model');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingDevice, setEditingDevice] = useState<DeviceWithCustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device? This action cannot be undone.')) return;
    
    setIsDeleting(id);
    const { success, error } = await deleteDeviceAction(id);
    
    if (success) {
      toast.success('Device deleted successfully');
      window.location.reload(); 
    } else {
      toast.error(error || 'Failed to delete device');
    }
    setIsDeleting(null);
  };

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
        const calcStatus = getCalculatedPaymentStatus(d.payment_status, d.remaining_balance, d.next_payment_date);
        const matchLock =
          filterLock === 'all' ||
          (filterLock === 'locked' && calcStatus === 'overdue') ||
          (filterLock === 'unlocked' && calcStatus !== 'overdue');
        return matchSearch && matchPlatform && matchLock;
      })
      .sort((a, b) => {
        if (sortKey === 'payment_status') {
          const aStat = getCalculatedPaymentStatus(a.payment_status, a.remaining_balance, a.next_payment_date);
          const bStat = getCalculatedPaymentStatus(b.payment_status, b.remaining_balance, b.next_payment_date);
          return sortDir === 'asc' ? aStat.localeCompare(bStat) : bStat.localeCompare(aStat);
        }
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
              placeholder="Search by owner, device model, MDM Device ID, or phone…"
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
                      <p className="text-sm font-semibold text-white">{getHumanReadableDeviceName(d.device_model) || d.device_model}</p>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const status = getCalculatedPaymentStatus(d.payment_status, d.remaining_balance, d.next_payment_date);
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          status === 'overdue'
                            ? 'bg-red-500/15 text-red-400'
                            : status === 'completed'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {isPaystackReviewer 
                            ? (status === 'overdue' ? 'Suspended' : 'Active') 
                            : (status === 'overdue' ? 'Overdue' : status === 'completed' ? 'Completed' : 'Current')
                          }
                        </span>
                      );
                    })()}
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
                        <button
                          onClick={() => setEditingDevice(d)}
                          disabled={isDeleting === d.id}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/20 disabled:opacity-50"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={isDeleting === d.id}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {isDeleting === d.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Delete
                        </button>
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
      {editingDevice && (
        <EditDeviceModal
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSuccess={(updates) => {
            if (onDeviceUpdate) {
              onDeviceUpdate(editingDevice.id, updates);
            }
          }}
        />
      )}
    </div>
  );
}
