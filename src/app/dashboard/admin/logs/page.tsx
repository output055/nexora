'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { AuditLogStream } from '@/components/dashboard/admin/AuditLogStream';

export default function AdminLogsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-[1400px] mx-auto space-y-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={18} className="text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">System Activity & Audit Logs</h3>
      </div>
      
      <AuditLogStream />
    </motion.div>
  );
}
