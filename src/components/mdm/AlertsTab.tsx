'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Info, ShieldAlert, RefreshCw } from 'lucide-react';
import { getDeviceAlertsAction } from '@/app/actions/devices';

interface AlertsTabProps {
  device: any;
}

export function AlertsTab({ device }: AlertsTabProps) {
  const [alerts, setAlerts] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    const res = await getDeviceAlertsAction(device.device_id);
    if (res.success) {
      setAlerts(res.data.alerts || []);
    } else {
      setError(res.error || 'Failed to fetch alerts');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.device_id]);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <ShieldAlert size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      default: return <Info size={18} />;
    }
  };

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
            <Bell className="text-amber-400" size={20} />
            Device Alerts
          </h3>
          <p className="text-sm text-slate-400 mt-1">Review system and compliance alerts triggered by this device.</p>
        </div>
        <button 
          onClick={fetchAlerts}
          className="p-2 text-slate-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-xl transition-colors"
          title="Refresh Alerts"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium">Failed to load alerts</h4>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && !alerts ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Bell size={48} className="mb-4 opacity-20 animate-pulse" />
          <p className="animate-pulse">Retrieving alert history...</p>
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert: any, idx: number) => (
            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start gap-4 hover:bg-white/[0.07] transition-colors">
              <div className={`p-2.5 rounded-xl border shrink-0 ${getSeverityColor(alert.severity)}`}>
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-base font-medium text-white">{alert.alert_name || alert.message || 'Unknown Alert'}</h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {alert.created_time ? new Date(alert.created_time).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{alert.description || alert.details || 'No additional details provided.'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-2xl border-dashed">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <ShieldAlert size={28} className="text-emerald-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No Active Alerts</h4>
          <p className="text-sm text-slate-400">This device is healthy and has not triggered any recent alerts.</p>
        </div>
      )}
    </motion.div>
  );
}
