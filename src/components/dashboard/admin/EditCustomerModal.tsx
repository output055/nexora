'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Phone, MapPin, Building2, CreditCard, Loader2, Upload, FileImage, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateCustomerAction, getSignedScanUrl, uploadScan } from '@/app/actions/customers';
import type { Customer } from '@/types';
import type { CustomerWithDevices } from '@/app/dashboard/admin/customers/page';

interface EditCustomerModalProps {
  customer: CustomerWithDevices;
  onClose: () => void;
  onSuccess: (updatedCustomer: Partial<CustomerWithDevices>) => void;
}

export function EditCustomerModal({ customer, onClose, onSuccess }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    email: customer.email || '',
    full_name: customer.full_name || '',
    phone_number: customer.phone_number || '',
    alternative_phone_number: customer.alternative_phone_number || '',
    whatsapp_number: customer.whatsapp_number || '',
    ghana_card_id: customer.ghana_card_id || '',
    digital_address: customer.digital_address || '',
    location_landmarks: customer.location_landmarks || '',
    occupation: customer.occupation || '',
    place_of_work: customer.place_of_work || '',
    landlord_contact: customer.landlord_contact || '',
    residential_status: customer.residential_status || 'other',
    payment_cycle: customer.payment_cycle || 'monthly',
    ghana_card_scan_path: customer.ghana_card_scan_path || '',
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (formData.ghana_card_scan_path) {
        const { success, url } = await getSignedScanUrl(formData.ghana_card_scan_path);
        if (success && url) {
          setSignedUrl(url);
        }
      }
    };
    fetchSignedUrl();
  }, [formData.ghana_card_scan_path]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('The uploaded image exceeds the 2MB size limit.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  const currentImageUrl = filePreview || signedUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalScanPath = formData.ghana_card_scan_path;

      if (selectedFile) {
        // Upload the new file via Server Action
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${formData.ghana_card_id || 'no-id'}/${Date.now()}-${customer.id}.${fileExt}`;
        
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);

        const { success: uploadSuccess, path, error: uploadError } = await uploadScan(fileName, uploadData);

        if (!uploadSuccess || !path) throw new Error(`Upload failed: ${uploadError}`);
        finalScanPath = path;
      }

      const updatesToSave = {
        ...formData,
        ghana_card_scan_path: finalScanPath
      };

      const { success, data, error } = await updateCustomerAction(customer.id, updatesToSave as Partial<Customer>);
      
      if (success && data) {
        toast.success('Customer updated successfully');
        onSuccess(data);
        onClose();
      } else {
        toast.error(error || 'Failed to update customer');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pt-16 pb-4 sm:p-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-[#111827] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
              <form id="edit-customer-form" onSubmit={handleSubmit} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <label className="text-xs font-medium text-slate-400">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
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
                      <label className="text-xs font-medium text-slate-400">Alternative Phone</label>
                      <input
                        type="tel"
                        name="alternative_phone_number"
                        value={formData.alternative_phone_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">WhatsApp Number</label>
                      <input
                        type="tel"
                        name="whatsapp_number"
                        value={formData.whatsapp_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Address & Work */}
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
                      <label className="text-xs font-medium text-slate-400">Location Landmarks</label>
                      <input
                        type="text"
                        name="location_landmarks"
                        value={formData.location_landmarks}
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

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">Landlord Contact</label>
                      <input
                        type="text"
                        name="landlord_contact"
                        value={formData.landlord_contact}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* ID & Billing */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 pb-2 border-b border-white/5">
                      <CreditCard size={16} className="text-purple-400" />
                      ID & Billing
                    </h4>

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

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">Ghana Card Scan</label>
                      <div className="flex flex-col gap-3">
                        {currentImageUrl ? (
                          <div className="relative group w-full h-32 bg-black/40 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={currentImageUrl} 
                              alt="ID Scan Preview" 
                              className="max-h-full max-w-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button 
                                type="button"
                                onClick={() => setIsImageModalOpen(true)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-sm"
                                title="View Full Image"
                              >
                                <Maximize2 size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50 rounded-lg text-blue-400 backdrop-blur-sm"
                                title="Change Image"
                              >
                                <Upload size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 bg-black/20 hover:bg-black/40 border border-dashed border-white/20 hover:border-blue-500/50 rounded-xl text-sm text-slate-400 hover:text-blue-400 transition-all flex flex-col items-center justify-center gap-2"
                          >
                            <FileImage size={24} className="opacity-50" />
                            <span>Upload ID Scan</span>
                          </button>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider text-center">Max size: 2MB</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
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

      {/* Full Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && currentImageUrl && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImageModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            >
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={currentImageUrl} 
                alt="ID Scan Full View" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/20 shadow-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
