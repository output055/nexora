'use client';

import { motion } from 'framer-motion';
import { History, FileText, Search, Filter } from 'lucide-react';

interface AuditLogsTabProps {
  device: any;
}

export function AuditLogsTab({ device }: AuditLogsTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <History className="text-indigo-400" size={20} />
            Audit Logs
          </h3>
          <p className="text-sm text-slate-400 mt-1">Comprehensive historical logs of actions performed on this device.</p>
        </div>
      </div>

      <div className="bg-[#0A0F1C] border border-white/10 rounded-2xl overflow-hidden relative shadow-inner h-[500px] flex flex-col items-center justify-center text-center px-6">
        {/* Glassmorphic Overlay for "Coming Soon" */}
        <div className="absolute inset-0 bg-blue-900/5 backdrop-blur-sm pointer-events-none" />
        
        <div className="relative z-10 max-w-md mx-auto">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
            <FileText size={32} className="text-indigo-400" />
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Audit Logs Pipeline in Development</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            We are currently building the high-performance pipeline necessary to stream and index real-time audit logs directly from the MDM core. This feature will be available in an upcoming release.
          </p>
          
          {/* Decorative skeleton UI elements in background */}
          <div className="flex gap-3 opacity-20 pointer-events-none justify-center">
            <div className="h-8 w-8 bg-white rounded-lg" />
            <div className="h-8 w-48 bg-white rounded-lg" />
            <div className="h-8 w-24 bg-white rounded-lg" />
          </div>
          <div className="flex gap-3 opacity-10 pointer-events-none justify-center mt-3">
            <div className="h-8 w-8 bg-white rounded-lg" />
            <div className="h-8 w-32 bg-white rounded-lg" />
            <div className="h-8 w-40 bg-white rounded-lg" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
