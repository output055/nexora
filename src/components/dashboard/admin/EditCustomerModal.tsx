'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Phone, MapPin, Building2, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateCustomerAction } from '@/app/actions/customers';
import type { Customer } from '@/types';
import type { CustomerWithDevices } from '@/app/dashboard/admin/customers/page';

interface EditCustomerModalProps {
  customer: CustomerWithDevices;
  onClose: () => void;
  onSuccess: (updatedCustomer: Partial<CustomerWithDevices>) => void;
}

export function EditCustomerModal({ customer, onClose, onSuccess }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    full_name: customer.full_name || '',
    phone_number: customer.phone_number || '',
    ghana_card_id: customer.ghana_card_id || '',
    digital_address: customer.digital_address || '',
    occupation: customer.occupation || '',
    place_of_work: customer.place_of_work || '',
    residential_status: customer.residential_status || 'other',
    payment_cycle: customer.payment_cycle || 'monthly',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { success, data, error } = await updateCustomerAction(customer.id, formData as Partial<Customer>);
    
    if (success && data) {
      toast.success('Customer updated successfully');
      onSuccess(data);
      onClose();
    } else {
      toast.error(error || 'Failed to update customer');
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
          className="relative w-full max-w-2xl bg-[#111827] border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0D1526] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <User className="text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Customer</h3>
                <p className="text-sm text-slate-400">Update customer profile information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <form id="edit-customer-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 pb-2 border-b border-white/5">
                    <User size={16} className="text-blue-400" />
                    Personal Details
                  </h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Phone Number</label>
                    <input
                      type="tel"
                      name="phone_number"
                      required
                      value={formData.phone_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Ghana Card ID</label>
                    <input
                      type="text"
                      name="ghana_card_id"
                      value={formData.ghana_card_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 pb-2 border-b border-white/5">
                    <MapPin size={16} className="text-emerald-400" />
                    Address & Work
                  </h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Digital Address (GhanaPostGPS)</label>
                    <input
                      type="text"
                      name="digital_address"
                      value={formData.digital_address}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Occupation</label>
                    <input
                      type="text"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Place of Work</label>
                    <input
                      type="text"
                      name="place_of_work"
                      value={formData.place_of_work}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 pb-2 border-b border-white/5">
                  <CreditCard size={16} className="text-purple-400" />
                  Billing Configuration
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Payment Cycle</label>
                    <select
                      name="payment_cycle"
                      value={formData.payment_cycle}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Residential Status</label>
                    <select
                      name="residential_status"
                      value={formData.residential_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    >
                      <option value="owner">Owner</option>
                      <option value="renting">Renting</option>
                      <option value="family_house">Family House</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-[#0D1526] shrink-0 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-customer-form"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
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
