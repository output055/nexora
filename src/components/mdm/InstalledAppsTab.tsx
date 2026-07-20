'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppWindow, Send, RefreshCw } from 'lucide-react';
import { getDeviceAppsAction, associateDeviceAppAction } from '@/app/actions/devices';
import { toast } from 'sonner';

interface InstalledAppsTabProps {
  device: any;
}

export function InstalledAppsTab({ device }: InstalledAppsTabProps) {
  const [apps, setApps] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [newAppId, setNewAppId] = useState('');

  const fetchApps = async () => {
    setLoading(true);
    const res = await getDeviceAppsAction(device.device_id);
    if (res.success && res.data) {
      setApps(res.data.apps || res.data || []);
    } else {
      toast.error('Failed to fetch apps: ' + res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.device_id]);

  const handlePushApp = async () => {
    if (!newAppId) return;
    const res = await associateDeviceAppAction(device.device_id, [newAppId]);
    if (res.success) {
      toast.success('App pushed successfully!');
      setNewAppId('');
      fetchApps();
    } else {
      toast.error('Failed to push app: ' + res.error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <AppWindow className="text-blue-400" size={20} />
          Push Application
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Enter the App ID from the app repository to associate and silently push it to this device.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter App ID..."
            value={newAppId}
            onChange={(e) => setNewAppId(e.target.value)}
            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button 
            onClick={handlePushApp}
            disabled={!newAppId}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            <Send size={16} />
            Push
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/10">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Installed Applications</h3>
          <button 
            onClick={fetchApps}
            className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
            title="Refresh Apps"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : apps && apps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {apps.map((app: any, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <AppWindow size={18} className="text-blue-400" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-200 truncate">{app.app_name || app.identifier || 'Unknown App'}</p>
                      <p className="text-xs text-slate-500 truncate">v{app.version || '1.0'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 font-medium rounded uppercase tracking-wider">Installed</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AppWindow size={32} className="mx-auto mb-3 opacity-20" />
              <p>No managed applications found on this device.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
