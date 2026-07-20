'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, ShieldAlert, Smartphone, AppWindow, FileText, AlertCircle, MapPin, Activity, ChevronDown, Lock, RefreshCw, Power, Trash2, Shield, Key, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { GeoTrackingTab } from './GeoTrackingTab';
import { SummaryTab } from './SummaryTab';
import { InstalledAppsTab } from './InstalledAppsTab';
import { RestrictionsTab } from './RestrictionsTab';
import { AlertsTab } from './AlertsTab';
import { AuditLogsTab } from './AuditLogsTab';

import { executeDeviceCommandAction, getDeviceDetailsAction } from '@/app/actions/devices';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';

interface DeviceDetailsViewProps {
  device: any;
  location?: any;
  onBack: () => void;
}

type TabType = 'Summary' | 'Installed Apps' | 'Restrictions' | 'Alerts' | 'Geo-Tracking' | 'Audit Logs';

const tabs: { id: TabType; label: string }[] = [
  { id: 'Summary', label: 'Summary' },
  { id: 'Installed Apps', label: 'Installed Apps' },
  { id: 'Restrictions', label: 'Restrictions' },
  { id: 'Alerts', label: 'Alerts' },
  { id: 'Geo-Tracking', label: 'Geo-Tracking' },
  { id: 'Audit Logs', label: 'Audit Logs' },
];

export function DeviceDetailsView({ device: initialDevice, location, onBack }: DeviceDetailsViewProps) {
  const [device, setDevice] = useState<any>(initialDevice);
  const [activeTab, setActiveTab] = useState<TabType>('Summary');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [lockPin, setLockPin] = useState<string | null>(null);
  const [isCommanding, setIsCommanding] = useState(false);
  useEffect(() => {
    const fetchDetails = async () => {
      const res = await getDeviceDetailsAction(initialDevice.device_id);
      if (res.success && res.data) {
        setDevice((prev: any) => ({ ...prev, ...res.data }));
      }
    };
    fetchDetails();
  }, [initialDevice.device_id]);
  
  // Security States initialized from device data
  const [isLostMode, setIsLostMode] = useState(
    device.is_lost_mode_enabled === true || 
    device.lost_mode_status === 1 || 
    device.lost_mode === 1
  );
  
  const [isKioskMode, setIsKioskMode] = useState(
    device.is_kiosk_mode_enabled === true || 
    device.kiosk_mode_status === 1 || 
    device.kiosk_mode === 1 ||
    device.is_kiosk === true ||
    (device.profiles && device.profiles.some((p: any) => p.profile_name?.toLowerCase().includes('kiosk')))
  );

  const handleAction = async (actionName: string) => {
    setIsCommanding(true);
    setActionsOpen(false);

    let apiCommandName = actionName;
    if (actionName === 'Secure Device (Lost Mode)' || actionName === 'Lock Device') apiCommandName = 'enable_lost_mode';
    if (actionName === 'Disable Lost Mode') apiCommandName = 'disable_lost_mode';
    if (actionName === 'Sync Policies') apiCommandName = 'scan'; 
    if (actionName === 'Restart Device') apiCommandName = 'restart';
    if (actionName === 'Clear Passcode') apiCommandName = 'clear_passcode';
    if (actionName === 'Corporate Wipe') apiCommandName = 'corporate_wipe';
    if (actionName === 'Buzz Device') apiCommandName = 'remote_alarm';

    const extraData = actionName === 'Lock Device' ? { passcode: Math.floor(100000 + Math.random() * 900000).toString() } : {};
    
    // Optimistic / simulated passcode generation for the UI 
    const generatedPin = extraData.passcode;

    toast.promise(executeDeviceCommandAction(device.device_id, apiCommandName, extraData), {
      loading: `Sending ${actionName} command to device...`,
      success: (res) => {
        setIsCommanding(false);
        if (!res.success) {
          throw new Error(res.error || 'Command failed');
        }
        
        // Update local state to reflect the new security status
        if (actionName === 'Secure Device (Lost Mode)' || actionName === 'Lock Device') setIsLostMode(true);
        if (actionName === 'Disable Lost Mode') {
          setIsLostMode(false);
          setLockPin(null);
          // Also clear any passcode that ManageEngine enforced during Lost Mode
          setTimeout(() => {
            executeDeviceCommandAction(device.device_id, 'clear_passcode', {});
          }, 1000);
        }

        if (actionName === 'Lock Device') {
          setLockPin(generatedPin || null);
          return `Device locked. Unlock PIN generated.`;
        }
        return `${actionName} command executed successfully`;
      },
      error: (err) => {
        setIsCommanding(false);
        return `Failed to execute ${actionName}: ${err.message}`;
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-[calc(100vh-140px)] bg-[#111827] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0D1526] shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Smartphone className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {getHumanReadableDeviceName(device.product_name) || getHumanReadableDeviceName(device.model_name) || getHumanReadableDeviceName(device.model) || device.product_name || device.model_name || device.model || device.device_name || 'Unnamed Device'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                <span className="flex items-center gap-1"><ShieldAlert size={14}/> {device.platform_type || 'Unknown OS'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><AppWindow size={14}/> {getHumanReadableDeviceName(device.product_name) || getHumanReadableDeviceName(device.model_name) || getHumanReadableDeviceName(device.model) || device.product_name || device.model_name || device.model || 'Unknown Model'}</span>
              </div>
            </div>
            
            <AnimatePresence>
              {lockPin && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono"
                >
                  <Key size={14} />
                  PIN: {lockPin}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setActionsOpen(!actionsOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Manage Device
            <ChevronDown size={16} className={`transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-[#1A2333] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-1.5 space-y-0.5">
                    {isLostMode ? (
                      <button onClick={() => handleAction('Disable Lost Mode')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors group">
                        <Lock size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                        Disable Lost Mode
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleAction('Secure Device (Lost Mode)')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-amber-500/10 rounded-lg transition-colors group">
                          <Lock size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                          Secure Device
                        </button>
                        <button onClick={() => handleAction('Lock Device')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-red-500/10 rounded-lg transition-colors group">
                          <Key size={16} className="text-red-400 group-hover:scale-110 transition-transform" />
                          Lock with PIN
                        </button>
                      </>
                    )}
                    
                    <button onClick={() => handleAction('Sync Policies')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors group">
                      <RefreshCw size={16} className="text-blue-500 group-hover:rotate-180 transition-transform duration-500" />
                      Sync Policies
                    </button>
                    <button onClick={() => handleAction('Buzz Device')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-emerald-500/10 rounded-lg transition-colors group">
                      <Smartphone size={16} className="text-emerald-400 group-hover:scale-110 group-hover:animate-ping transition-transform" />
                      Buzz Device
                    </button>
                    <div className="h-px w-full bg-white/5 my-1" />
                    <button onClick={() => handleAction('Restart Device')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group">
                      <Power size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                      Remote Restart
                    </button>
                    <button onClick={() => handleAction('Clear Passcode')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group">
                      <Shield size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                      Clear Passcode
                    </button>
                    <div className="h-px bg-white/5 my-1.5" />
                    <button onClick={() => handleAction('Corporate Wipe')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors group">
                      <Trash2 size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
                      Corporate Wipe
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex px-6 border-b border-white/5 bg-[#0D1526] shrink-0 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#111827]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'Summary' && <SummaryTab device={device} />}
            {activeTab === 'Installed Apps' && <InstalledAppsTab device={device} />}
            {activeTab === 'Restrictions' && <RestrictionsTab device={device} />}
            {activeTab === 'Alerts' && <AlertsTab device={device} />}
            {activeTab === 'Audit Logs' && <AuditLogsTab device={device} />}
            {activeTab === 'Geo-Tracking' && (
              <GeoTrackingTab device={device} initialLocation={location} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
