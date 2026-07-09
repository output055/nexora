'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Smartphone } from 'lucide-react';
import { DeviceTable } from '@/components/dashboard/admin/DeviceTable';
import type { Customer, Device } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export interface DeviceWithCustomer extends Device {
  customers: Customer | null;
}

export default function AdminDevicesPage() {
  console.log('AdminDevicesPage rendering');
  const [devices, setDevices] = useState<DeviceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalDevices = devices.length;
  const lockedDevices = devices.filter((d) => d.payment_status === 'overdue').length;

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
            <span className="text-red-400">{lockedDevices} locked</span> · {totalDevices - lockedDevices} active
          </span>
        )}
        </div>
        <Link
          href="/dashboard/admin/devices/onboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-500"
        >
          <Plus size={16} />
          Onboard Device
        </Link>
      </div>
      
      <DeviceTable devices={devices} onDeviceUpdate={handleDeviceUpdate} />
    </motion.div>
  );
}
