'use client';

import { useState } from 'react';
import { updateSystemSettings } from '@/app/actions/settings';

interface PaymentGatewayFormProps {
  initialSettings: Record<string, string>;
}

export default function PaymentGatewayForm({ initialSettings }: PaymentGatewayFormProps) {
  const [adminPaystackEmail, setAdminPaystackEmail] = useState(
    initialSettings['admin_paystack_email'] || 'admin@credifon.com'
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateSystemSettings({
      'admin_paystack_email': adminPaystackEmail,
    });
    
    if (result.success) {
      setMessage({ text: 'Payment settings updated.', type: 'success' });
    } else {
      setMessage({ text: `Failed to update: ${result.error}`, type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-4">Payment Gateway</h2>
      
      {message && (
        <div className={`p-4 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      <div className="text-gray-400 mb-6 text-sm">
        Paystack integration is currently active. Mobile Money and Card payments are supported.
      </div>
      
      <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full w-fit text-sm mb-6">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Paystack Webhooks: Active
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-auto">
        <div className="pt-4 border-t border-white/5">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Admin Paystack Email
          </label>
          <p className="text-xs text-gray-400 mb-3">
            The email address used for receipts when admins log manual payments via the dashboard.
          </p>
          <input
            type="email"
            value={adminPaystackEmail}
            onChange={(e) => setAdminPaystackEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="admin@credifon.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </form>
    </div>
  );
}
