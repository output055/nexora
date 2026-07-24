'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { updatePassword, updateProfileInfo } from '@/app/actions/profile';
import { toast } from 'sonner';
import { Save, Lock, User, MapPin } from 'lucide-react';

export function ProfilePageContent({ isCustomer }: { isCustomer: boolean }) {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    digital_address: '',
    location_landmarks: '',
    residential_status: '',
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      setIsLoading(true);
      const supabase = createBrowserSupabaseClient();
      
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
      }));

      if (isCustomer) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (customer) {
          setFormData({
            full_name: customer.full_name || user.full_name || '',
            email: customer.email || user.email || '',
            phone_number: customer.phone_number || '',
            digital_address: customer.digital_address || '',
            location_landmarks: customer.location_landmarks || '',
            residential_status: customer.residential_status || '',
          });
        }
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user, isCustomer]);

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const result = await updateProfileInfo({
        full_name: formData.full_name,
        digital_address: formData.digital_address,
        location_landmarks: formData.location_landmarks,
        residential_status: formData.residential_status,
      });

      if (result.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      return toast.error('Passwords do not match');
    }

    setIsSaving(true);
    try {
      const result = await updatePassword(passwordData.new_password);
      if (result.success) {
        toast.success('Password updated successfully');
        setPasswordData({ new_password: '', confirm_password: '' });
      } else {
        toast.error(result.error || 'Failed to update password');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-slate-400">Manage your profile information and security preferences.</p>
      </div>

      <div className="flex gap-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'general' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          General Information
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'security' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Security
        </button>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleGeneralSubmit} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <User size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Basic Details</h2>
              <p className="text-sm text-slate-400">Your personal information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full bg-[#0B1120]/50 border border-white/5 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
              {isCustomer && <p className="text-xs text-slate-500 mt-1">Please contact support to change your email.</p>}
            </div>
          </div>

          {isCustomer && (
            <>
              <hr className="border-white/10" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <MapPin size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Contact & Location</h2>
                  <p className="text-sm text-slate-400">Where we can reach you</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Primary Phone</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    disabled
                    className="w-full bg-[#0B1120]/50 border border-white/5 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">Please contact support to change your primary phone number.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">GhanaPost GPS (Digital Address)</label>
                  <input
                    type="text"
                    value={formData.digital_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, digital_address: e.target.value }))}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Residential Status</label>
                  <select
                    value={formData.residential_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, residential_status: e.target.value }))}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">Select Status</option>
                    <option value="owned">Owned</option>
                    <option value="rented">Rented</option>
                    <option value="living_with_family">Living with Family</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Location Landmarks</label>
                  <textarea
                    rows={2}
                    value={formData.location_landmarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_landmarks: e.target.value }))}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    placeholder="e.g., Near the big mango tree"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleSecuritySubmit} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Lock size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Password Settings</h2>
              <p className="text-sm text-slate-400">Update your account password</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Lock size={16} />}
              {isSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
