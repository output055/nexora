'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { getDeviceSecurityAction } from '@/app/actions/devices';

interface RestrictionsTabProps {
  device: any;
}

export function RestrictionsTab({ device }: RestrictionsTabProps) {
  const [securityData, setSecurityData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurity = async () => {
    setLoading(true);
    setError(null);
    const res = await getDeviceSecurityAction(device.device_id);
    if (res.success) {
      setSecurityData(res.data);
    } else {
      setError(res.error || 'Failed to fetch security info');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSecurity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.device_id]);

  const fileVaultEnabled = securityData?.filevault?.status === 'enabled';

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
            <Shield className="text-emerald-400" size={20} />
            Security & Compliance
          </h3>
          <p className="text-sm text-slate-400 mt-1">Review active policies and encryption status.</p>
        </div>
        <button 
          onClick={fetchSecurity}
          className="p-2 text-slate-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-xl transition-colors"
          title="Refresh Security Data"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium">Audit Failed</h4>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && !securityData ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <ShieldAlert size={48} className="mb-4 opacity-20 animate-pulse" />
          <p className="animate-pulse">Running comprehensive security audit...</p>
        </div>
      ) : securityData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* FileVault Status */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative group">
              <div className={`absolute inset-0 bg-gradient-to-br ${fileVaultEnabled ? 'from-emerald-500/5' : 'from-amber-500/5'} to-transparent pointer-events-none`} />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fileVaultEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    <Lock size={20} />
                  </div>
                  <h4 className="text-base font-medium text-white">Encryption</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">FileVault Status</p>
                  <p className={`text-lg font-semibold ${fileVaultEnabled ? 'text-emerald-400' : 'text-amber-400 capitalize'}`}>
                    {securityData.filevault?.status || securityData.filevault?.error || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {/* Restrictions JSON */}
            <div className="bg-[#0A0F1C] border border-white/10 rounded-2xl overflow-hidden h-full flex flex-col shadow-inner">
              <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-300">Active Restrictions payload</h4>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">JSON</span>
              </div>
              <div className="p-4 overflow-auto custom-scrollbar flex-1 max-h-[500px]">
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(securityData.restrictions, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
