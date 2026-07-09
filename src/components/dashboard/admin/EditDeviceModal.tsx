'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Smartphone, Hash, Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateDeviceAction } from '@/app/actions/device-db';
import type { DeviceWithCustomer } from '@/app/dashboard/admin/devices/page';

interface EditDeviceModalProps {
  device: DeviceWithCustomer;
  onClose: () => void;
  onSuccess: (updatedDevice: Partial<DeviceWithCustomer>) => void;
}

export function EditDeviceModal({ device, onClose, onSuccess }: EditDeviceModalProps) {
  const [formData, setFormData] = useState({
    device_model: device.device_model || '',
    os_platform: device.os_platform || 'Android',
    base_price: device.base_price || 0,
    contract_duration_months: device.contract_duration_months || 0,
    payment_cycle_amount: device.payment_cycle_amount || 0,
    total_owed: device.total_owed || 0,
    remaining_balance: device.remaining_balance || 0,
    payment_status: device.payment_status || 'current',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Number conversion for financial fields
    const payload = {
      ...formData,
      base_price: Number(formData.base_price),
      contract_duration_months: Number(formData.contract_duration_months),
      payment_cycle_amount: Number(formData.payment_cycle_amount),
      total_owed: Number(formData.total_owed),
      remaining_balance: Number(formData.remaining_balance),
    };

    const { success, data, error } = await updateDeviceAction(device.id, payload as any);
    
    if (success && data) {
      toast.success('Device updated successfully');
      onSuccess(data);
      onClose();
    } else {
      toast.error(error || 'Failed to update device');
    }
    
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-16 pb-4 sm:p-0">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#111827] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0D1526]">
            <div>
              <h2 className="text-xl font-bold text-white">Edit Device Profile</h2>
              <p className="text-sm text-slate-400 mt-1">MDM ID: {device.mdm_device_id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <form id="edit-device-form" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Hardware Information */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white border-b border-white/5 pb-2">
                  <Smartphone size={18} className="text-blue-400" />
                  <h3 className="font-semibold">Hardware Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Device Model</label>
                    <input
                      name="device_model"
                      value={formData.device_model}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">OS Platform</label>
                    <select
                      name="os_platform"
                      value={formData.os_platform}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      <option value="Android" className="bg-[#111827]">Android</option>
                      <option value="iOS" className="bg-[#111827]">iOS</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Financial Information */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white border-b border-white/5 pb-2">
                  <Banknote size={18} className="text-emerald-400" />
                  <h3 className="font-semibold">Financial Plan</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Base Price (GH₵)</label>
                    <input
                      name="base_price"
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Total Owed (GH₵)</label>
                    <input
                      name="total_owed"
                      type="number"
                      step="0.01"
                      value={formData.total_owed}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Remaining Balance (GH₵)</label>
                    <input
                      name="remaining_balance"
                      type="number"
                      step="0.01"
                      value={formData.remaining_balance}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Cycle Amount (GH₵)</label>
                    <input
                      name="payment_cycle_amount"
                      type="number"
                      step="0.01"
                      value={formData.payment_cycle_amount}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Payment Status</label>
                    <select
                      name="payment_status"
                      value={formData.payment_status}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      <option value="current" className="bg-[#111827]">Current</option>
                      <option value="overdue" className="bg-[#111827]">Overdue</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Contract Duration (Months)</label>
                    <input
                      name="contract_duration_months"
                      type="number"
                      value={formData.contract_duration_months}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                </div>
              </section>

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-[#0D1526] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-device-form"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
