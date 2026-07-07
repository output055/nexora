'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, MapPin, Shield, AppWindow, RefreshCw, Server, Send } from 'lucide-react';
import { 
  getDeviceAppsAction, 
  associateDeviceAppAction, 
  requestDeviceLocationUpdateAction, 
  getDeviceSecurityAction,
  getDeviceLocationAction
} from '@/app/actions/devices';
import { toast } from 'sonner';

interface DeviceMgmtModalProps {
  device: any;
  location?: any;
  onClose: () => void;
}

export function DeviceMgmtModal({ device, location, onClose }: DeviceMgmtModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'apps' | 'security'>('info');
  
  const [apps, setApps] = useState<any[] | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [newAppId, setNewAppId] = useState('');
  
  const [securityData, setSecurityData] = useState<any | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  
  const [deviceLocation, setDeviceLocation] = useState<any>(location);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [pingingLocation, setPingingLocation] = useState(false);

  const fetchApps = async () => {
    setLoadingApps(true);
    const res = await getDeviceAppsAction(device.device_id);
    if (res.success && res.data) {
      // Assuming res.data.apps exists or similar structure
      setApps(res.data.apps || res.data || []);
    } else {
      toast.error('Failed to fetch apps: ' + res.error);
    }
    setLoadingApps(false);
  };

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

  const handlePingLocation = async () => {
    setPingingLocation(true);
    const res = await requestDeviceLocationUpdateAction(device.device_id);
    if (res.success) {
      toast.success('Location update requested from device.');
    } else {
      toast.error('Failed to request location: ' + res.error);
    }
    setPingingLocation(false);
  };

  const fetchLastLocation = async () => {
    setFetchingLocation(true);
    const res = await getDeviceLocationAction(device.device_id);
    if (res.success && res.data) {
      // The API returns the location object or locations array depending on version
      const locData = Array.isArray(res.data.locations) ? res.data.locations[0] : res.data;
      if (locData && locData.latitude) {
        setDeviceLocation(locData);
      }
    }
    setFetchingLocation(false);
  };

  useEffect(() => {
    // Automatically fetch the last known location when the modal opens
    if (!deviceLocation || !deviceLocation.latitude) {
      fetchLastLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.device_id]);

  const fetchSecurity = async () => {
    setLoadingSecurity(true);
    const res = await getDeviceSecurityAction(device.device_id);
    if (res.success) {
      setSecurityData(res.data);
    } else {
      toast.error('Failed to fetch security info: ' + res.error);
    }
    setLoadingSecurity(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0D1526] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#111827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Smartphone className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">{device.device_name || 'Unknown Device'}</h2>
              <p className="text-sm text-slate-400">{device.model} • {device.platform_type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 border-b border-white/5 bg-[#111827]">
          {[
            { id: 'info', label: 'Overview', icon: Server },
            { id: 'apps', label: 'App Management', icon: AppWindow },
            { id: 'security', label: 'Security & Compliance', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'apps' && !apps) fetchApps();
                if (tab.id === 'security' && !securityData) fetchSecurity();
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Serial Number</span>
                    <span className="text-slate-200">{device.serial_number || 'N/A'}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">OS Version</span>
                    <span className="text-slate-200">{device.os_version || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-slate-400" />
                      <h4 className="font-medium text-white">Location Services</h4>
                    </div>
                    <button 
                      onClick={handlePingLocation}
                      disabled={pingingLocation}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={pingingLocation ? 'animate-spin' : ''} />
                      Ping Now
                    </button>
                  </div>
                  <div className="p-4 bg-black/20">
                    {deviceLocation && deviceLocation.latitude ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Address</span>
                          <span className="text-slate-300 text-right max-w-[70%]">{deviceLocation.address || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Coordinates</span>
                          <span className="text-slate-300">{deviceLocation.latitude}, {deviceLocation.longitude}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Last Updated</span>
                          <span className="text-slate-300">
                            {deviceLocation.located_time ? new Date(parseInt(deviceLocation.located_time)).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ) : fetchingLocation ? (
                      <p className="text-slate-500 text-sm animate-pulse">Fetching last known location...</p>
                    ) : (
                      <p className="text-slate-500 text-sm">No recent location data available.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'apps' && (
              <motion.div
                key="apps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Enter App ID to push..."
                    value={newAppId}
                    onChange={(e) => setNewAppId(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button 
                    onClick={handlePushApp}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                  >
                    <Send size={16} />
                    Push App
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Installed Applications</h4>
                  {loadingApps ? (
                    <div className="text-center py-8 text-slate-500 animate-pulse">Loading apps...</div>
                  ) : apps && apps.length > 0 ? (
                    apps.map((app: any, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{app.app_name || app.identifier || 'Unknown App'}</p>
                          <p className="text-xs text-slate-500">v{app.version || '1.0'}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md">Installed</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white/5 border border-white/5 rounded-xl text-slate-500 text-sm">
                      No apps found on this device.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {loadingSecurity ? (
                   <div className="text-center py-8 text-slate-500 animate-pulse">Running security audit...</div>
                ) : securityData ? (
                  <div className="space-y-4">
                    {/* FileVault (macOS mainly) */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Encryption Status</h4>
                      <div className="flex items-center gap-2">
                        {securityData.filevault?.status === 'enabled' ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        <span className="text-sm text-slate-400">
                          {securityData.filevault?.status || securityData.filevault?.error || 'Unknown / Not Applicable'}
                        </span>
                      </div>
                    </div>

                    {/* Restrictions */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Device Restrictions</h4>
                      <p className="text-xs text-slate-500 mb-3">Policy compliance check</p>
                      <pre className="text-xs text-slate-400 bg-black/30 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(securityData.restrictions, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">Failed to load security profile.</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
