'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { CustomerTable } from '@/components/dashboard/admin/CustomerTable';
import type { Customer } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*, devices(*)')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setCustomers(data);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const handleCustomerUpdate = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const liveOverdue = customers.filter((c) => c.devices?.[0]?.payment_status === 'overdue').length;
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
        <h3 className="text-lg font-semibold text-white">Customer Portfolio</h3>
        {!loading && (
          <span className="ml-auto text-sm text-slate-500 font-medium">
            <span className="text-red-400">{liveOverdue} overdue</span> · {liveActive - liveOverdue} current
          </span>
        )}
      </div>
      
      <CustomerTable customers={customers} onCustomerUpdate={handleCustomerUpdate} />
    </motion.div>
  );
}
