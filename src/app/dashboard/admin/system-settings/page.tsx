import { Metadata } from 'next';
import SettingsForm from '@/components/dashboard/admin/SettingsForm';
import PaymentGatewayForm from '@/components/dashboard/admin/PaymentGatewayForm';
import { getAllSystemSettings } from '@/app/actions/settings';
import { Settings as SettingsIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'System Settings | Credifon',
  description: 'Manage Credifon platform settings',
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
        
        {/* Payment Gateway Panel */}
        <PaymentGatewayForm initialSettings={initialSettings} />
      </div>
    </div>
  );
}
