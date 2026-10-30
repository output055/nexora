'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Smartphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { syncMdmDevicesAction } from '@/app/actions/devices';
import { DeviceTable } from '@/components/dashboard/admin/DeviceTable';
import { getCalculatedPaymentStatus } from '@/lib/utils';
import type { Customer, Device } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export interface DeviceWithCustomer extends Device {
  customers: Customer | null;
}

export default function AdminDevicesPage() {
  console.log('AdminDevicesPage rendering');
  const [devices, setDevices] = useState<DeviceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncMdmDevicesAction();
      if (res.success) {
        toast.success(res.message || 'Synced devices with MDM successfully.');
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase
          .from('devices')
          .select('*, customers(*)')
          .order('created_at', { ascending: false });
        if (data) setDevices(data as any);
      } else {
        toast.error(res.error || 'Failed to sync with MDM.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error syncing with MDM.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const fetchDevices = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('devices')
        .select('*, customers(*)')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setDevices(data as any);
      }
      setLoading(false);
    };
    fetchDevices();
  }, []);

  const handleDeviceUpdate = (id: string, updates: Partial<DeviceWithCustomer>) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const activeFinancedDevices = devices.filter((d) => {
    const status = getCalculatedPaymentStatus(d.payment_status, d.remaining_balance, d.next_payment_date);
    return status !== 'completed';
  });
  const lockedDevices = activeFinancedDevices.filter((d) => {
    const status = getCalculatedPaymentStatus(d.payment_status, d.remaining_balance, d.next_payment_date);
    return status === 'overdue';
  }).length;
  const activeCount = activeFinancedDevices.length - lockedDevices;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div className="flex items-center gap-2">
        <Smartphone size={18} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Device Management</h3>
        {!loading && (
          <span className="text-sm text-slate-500 font-medium">
            <span className="text-red-400">{lockedDevices} locked</span> · {activeCount} active
          </span>
        )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 disabled:opacity-50"
            title="Sync devices with MDM"
          >
            <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync with MDM"}
          </button>
          <Link
            href="/dashboard/admin/devices/onboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-500"
          >
            <Plus size={16} />
            Onboard Device
          </Link>
        </div>
      </div>
      
      <DeviceTable devices={devices} onDeviceUpdate={handleDeviceUpdate} />
    </motion.div>
  );
}
