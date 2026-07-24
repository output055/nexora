'use client';

import { useState, useEffect } from 'react';
import { HeadphonesIcon, Save, Loader2 } from 'lucide-react';
import { getAllSystemSettings, updateSystemSettings } from '@/app/actions/settings';
import { toast } from 'sonner';

export function SupportSettingsCard() {
  const [supportPhone, setSupportPhone] = useState('+233 54 000 0000');
  const [supportEmail, setSupportEmail] = useState('support@credifon.app');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getAllSystemSettings();
        if (settings['support_phone']) setSupportPhone(settings['support_phone']);
        if (settings['support_email']) setSupportEmail(settings['support_email']);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateSystemSettings({
        support_phone: supportPhone,
        support_email: supportEmail,
      });

      if (result.success) {
        toast.success('Support settings updated successfully');
      } else {
        toast.error(result.error || 'Failed to update support settings');
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <HeadphonesIcon size={18} className="text-blue-400" />
          Support Contact Details
        </h2>
      </div>
      
      <p className="text-sm text-slate-400 mb-6">
        Configure the contact information displayed to customers in the Help & Support section.
      </p>

      <div className="space-y-4 flex-1">
        <div>
          <label htmlFor="support-phone" className="block text-sm font-medium text-slate-300 mb-1.5">
            Support Phone Number
          </label>
          <input
            id="support-phone"
            type="text"
            value={supportPhone}
            onChange={(e) => setSupportPhone(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="+233 54 000 0000"
          />
        </div>

        <div>
          <label htmlFor="support-email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Support Email Address
          </label>
          <input
            id="support-email"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="support@credifon.app"
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
