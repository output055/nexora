'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Smartphone, ShieldAlert, AlertTriangle, Check, Terminal, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';

interface DeviceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

type DeviceDetails = {
  id: number;
  model: string;
  make: string;
  serial_no: string;
  os_type: string;
  os_version: string;
  charging: boolean;
  locked: boolean;
  last_connected_at: string;
  battery_status?: number;
};

const AVAILABLE_ACTIONS = [
  { id: 'screen_lock', label: 'Lock Screen', icon: ShieldAlert, destructive: false },
  { id: 'shutdown', label: 'Shutdown', icon: Terminal, destructive: false },
  { id: 'reboot', label: 'Reboot', icon: Terminal, destructive: false },
  { id: 'mark_as_lost', label: 'Mark as Lost', icon: AlertTriangle, destructive: false },
  { id: 'mark_as_found', label: 'Mark as Found', icon: Check, destructive: false },
  { id: 'buzz_device', label: 'Buzz Device', icon: Smartphone, destructive: false },
  { id: 'pause_kiosk', label: 'Disable Kiosk Mode', icon: LayoutGrid, destructive: false },
  { id: 'factory_reset', label: 'Factory Reset', icon: AlertTriangle, destructive: true },
  { id: 'delete_device', label: 'Delete Device', icon: AlertTriangle, destructive: true },
];

export function DeviceActionModal({ isOpen, onClose, deviceId, deviceName }: DeviceActionModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<DeviceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedAction, setSelectedAction] = useState<string>('');
  const [executing, setExecuting] = useState(false);

  // Lost mode form state
  const [lostMessage, setLostMessage] = useState('This device is lost. Please return it.');
  const [lostPhone, setLostPhone] = useState('');
  const [lostFootnote, setLostFootnote] = useState('');

  // Destructive action confirmation
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    if (!isOpen || !deviceId) return;
    
    let isMounted = true;
    setLoading(true);
    setError(null);
    setDetails(null);
    setSelectedAction('');
    setConfirmName('');

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/devices/${deviceId}`);
        const json = await res.json();
        
        if (!isMounted) return;

        if (json.success && json.data) {
          setDetails(json.data.device || json.data);
        } else {
          setError(json.error || 'Failed to fetch details');
        }
      } catch (err) {
        if (isMounted) setError('Network error fetching device details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();

    return () => { isMounted = false; };
  }, [isOpen, deviceId]);

  if (!isOpen) return null;

  const currentAction = AVAILABLE_ACTIONS.find(a => a.id === selectedAction);
  
  const canExecute = () => {
    if (!selectedAction) return false;
    if (selectedAction === 'mark_as_lost') {
      if (!lostMessage.trim()) return false;
    }
    if (currentAction?.destructive) {
      if (confirmName !== deviceName) return false;
    }
    return true;
  };

  const handleExecute = async () => {
    if (!canExecute()) return;
    
    setExecuting(true);
    
    try {
      const payload: any = {
        deviceId,
        actionType: selectedAction,
      };

      if (selectedAction === 'mark_as_lost') {
        payload.lost_mode_message = lostMessage;
        if (lostPhone) payload.lost_mode_phone = lostPhone;
        if (lostFootnote) payload.lost_mode_footnote = lostFootnote;
      }

      const res = await fetch('/api/devices/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Successfully executed ${currentAction?.label}`);
        onClose();
      } else {
        toast.error(json.error || 'Failed to execute action');
      }
    } catch (err) {
      toast.error('Network error during execution');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Smartphone size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Manage Device</h2>
                <p className="text-sm text-slate-400">{deviceName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={executing}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p>Connecting to MDM Server...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            ) : details ? (
              <>
                {/* Device Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoCard label="Model" value={getHumanReadableDeviceName(details.model) || details.model || 'Unknown'} />
                  <InfoCard label="Make" value={details.make || 'Unknown'} />
                  <InfoCard label="OS" value={`${details.os_type || 'N/A'} ${details.os_version || ''}`} />
                  <InfoCard label="Serial No" value={details.serial_no || 'Unknown'} />
                  <InfoCard label="Battery" value={details.battery_status ? `${details.battery_status}% ${details.charging ? '(Charging)' : ''}` : 'Unknown'} />
                  <InfoCard label="Status" value={details.locked ? 'Locked' : 'Unlocked'} valueClass={details.locked ? 'text-red-400' : 'text-emerald-400'} />
                  <div className="col-span-2 sm:col-span-3">
                    <InfoCard label="Last Connected" value={details.last_connected_at ? new Date(details.last_connected_at).toLocaleString() : 'Never'} />
                  </div>
                </div>

                {/* Actions Selection */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="text-sm font-medium text-slate-300">Select Action</label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    disabled={executing}
                    className="w-full rounded-xl border border-white/10 bg-[#1e293b] px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
                  >
                    <option value="">-- Choose an action --</option>
                    {AVAILABLE_ACTIONS.map(action => (
                      <option key={action.id} value={action.id}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Forms based on selected action */}
                <AnimatePresence mode="wait">
                  {selectedAction === 'mark_as_lost' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-4">
                        <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                          <AlertTriangle size={16} /> Lost Mode Configuration
                        </h4>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Message (Required)</label>
                          <input
                            type="text"
                            value={lostMessage}
                            onChange={(e) => setLostMessage(e.target.value)}
                            disabled={executing}
                            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone (Optional)</label>
                            <input
                              type="text"
                              value={lostPhone}
                              onChange={(e) => setLostPhone(e.target.value)}
                              disabled={executing}
                              placeholder="e.g. 0551234567"
                              className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Footnote (Optional)</label>
                            <input
                              type="text"
                              value={lostFootnote}
                              onChange={(e) => setLostFootnote(e.target.value)}
                              disabled={executing}
                              className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentAction?.destructive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                        <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                          <ShieldAlert size={16} /> Danger Zone
                        </h4>
                        <p className="text-sm text-slate-300">
                          You are about to execute a destructive action on <strong>{deviceName}</strong>. This cannot be undone.
                        </p>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Type <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded select-all">{deviceName}</span> to confirm
                          </label>
                          <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            disabled={executing}
                            className="w-full rounded-lg bg-black/20 border border-red-500/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                            placeholder={deviceName}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 bg-white/5 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={executing}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={!canExecute() || executing || !details}
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                currentAction?.destructive 
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
              }`}
            >
              {executing && <Loader2 size={16} className="animate-spin" />}
              {!executing && currentAction?.icon && <currentAction.icon size={16} />}
              Execute Action
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function InfoCard({ label, value, valueClass = 'text-white' }: { label: string; value: string | React.ReactNode; valueClass?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-medium ${valueClass} truncate`}>{value}</p>
    </div>
  );
}
