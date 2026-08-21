'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { getCalculatedPaymentStatus } from '@/lib/utils';
import { CustomerTable } from '@/components/dashboard/admin/CustomerTable';
import type { Customer, Device } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

import { useAuth } from '@/contexts/auth-context';

export interface CustomerWithDevices extends Customer {
  devices: Device[] | null;
}

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const isPaystackReviewer = user?.roles.some(r => r.name === 'paystack_reviewer');
  const [customers, setCustomers] = useState<CustomerWithDevices[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*, devices(*)')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setCustomers(data as any);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const handleCustomerUpdate = (id: string, updates: Partial<CustomerWithDevices>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const liveOverdue = customers.filter((c) => {
    const primaryDevice = c.devices?.[0];
    if (!primaryDevice) return false;
    return getCalculatedPaymentStatus(primaryDevice.payment_status, primaryDevice.remaining_balance, primaryDevice.next_payment_date) === 'overdue';
  }).length;
  const liveActive = customers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Users size={18} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-white">
          {isPaystackReviewer ? "Agent Portfolio" : "Customer Portfolio"}
        </h3>
        {!loading && (
          <span className="ml-auto text-sm text-slate-500 font-medium">
            <span className="text-red-400">{liveOverdue} {isPaystackReviewer ? 'suspended' : 'overdue'}</span> · {liveActive - liveOverdue} current
          </span>
        )}
      </div>
      
      <CustomerTable customers={customers} onCustomerUpdate={handleCustomerUpdate} />
    </motion.div>
  );
}
