import { Metadata } from 'next';
import SettingsForm from '@/components/dashboard/admin/SettingsForm';
import { getAllSystemSettings } from '@/app/actions/settings';
import { Settings as SettingsIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'System Settings | Nexora',
  description: 'Manage Nexora platform settings',
};

export default async function SettingsPage() {
  const initialSettings = await getAllSystemSettings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-purple-400" />
            System Settings
          </h1>
          <p className="text-gray-400 mt-1">Configure global platform behavior and integrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsForm initialSettings={initialSettings} />
        
        {/* Additional Settings Panels can go here */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Payment Gateway</h2>
          <p className="text-gray-400 mb-4 text-sm">
            Paystack integration is currently active. Mobile Money and Card payments are supported.
          </p>
          <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full w-fit text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Paystack Webhooks: Active
          </div>
        </div>
      </div>
    </div>
  );
}
