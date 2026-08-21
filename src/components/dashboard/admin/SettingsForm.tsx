'use client';

import { useState } from 'react';
import { updateSystemSettings } from '@/app/actions/settings';
import { useAuth } from '@/contexts/auth-context';

interface SettingsFormProps {
  initialSettings: Record<string, string>;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { user } = useAuth();
  const isPaystackReviewer = user?.roles.some(r => r.name === 'paystack_reviewer');

  const [lockCommand, setLockCommand] = useState(
    initialSettings['mdm_overdue_lock_command'] || 'LostMode'
  );
  const [lostModeMessage, setLostModeMessage] = useState(
    initialSettings['mdm_lost_mode_message'] || 'This device has been locked due to an overdue payment.'
  );
  const [lostModePhone, setLostModePhone] = useState(
    initialSettings['mdm_lost_mode_phone'] || '+233000000000'
  );
  const [kioskPin, setKioskPin] = useState(
    initialSettings['mdm_kiosk_pin'] || '1234'
  );
  
  // Financial Settings
  const [interestRate, setInterestRate] = useState(
    initialSettings['payment_interest_rate'] || '30'
  );
  const [downPaymentRate, setDownPaymentRate] = useState(
    initialSettings['payment_down_payment_rate'] || '40'
  );

  // SMS Settings
  const [smsApiKey, setSmsApiKey] = useState(
    initialSettings['sms_api_key'] || ''
  );
  const [smsSenderId, setSmsSenderId] = useState(
    initialSettings['sms_sender_id'] || 'CREDIFON'
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateSystemSettings({
      'mdm_overdue_lock_command': lockCommand,
      'mdm_lost_mode_message': lostModeMessage,
      'mdm_lost_mode_phone': lostModePhone,
      'mdm_kiosk_pin': kioskPin,
      'payment_interest_rate': interestRate,
      'payment_down_payment_rate': downPaymentRate,
      'sms_api_key': smsApiKey,
      'sms_sender_id': smsSenderId,
    });
    
    if (result.success) {
      setMessage({ text: 'Settings updated successfully.', type: 'success' });
    } else {
      setMessage({ text: `Failed to update: ${result.error}`, type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Financial Settings Section */}
        {!isPaystackReviewer && (
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-white mb-2">Financial Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Interest / Installation Fee (%)
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  The percentage added to the base device price.
                </p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Down Payment (%)
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  The percentage of the total contract value required upfront.
                </p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={downPaymentRate}
                  onChange={(e) => setDownPaymentRate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="40"
                />
              </div>
            </div>
          </div>
        )}

        {/* SMS Gateway Settings Section */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-semibold text-white mb-2">SMS Integration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Arkesel API Key
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Your API key from Arkesel (v2 API).
              </p>
              <input
                type="password"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="sk_..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sender ID
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Your registered Sender ID (max 11 chars).
              </p>
              <input
                type="text"
                maxLength={11}
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="CREDIFON"
              />
            </div>
          </div>
        </div>

        {/* MDM Settings Section */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-semibold text-white mb-2">MDM Device Rules</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
            Overdue Lock Command
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Select the action to trigger in ManageEngine when a device misses its payment cycle.
          </p>
          <select
            value={lockCommand}
            onChange={(e) => setLockCommand(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
          >
            <option value="LostMode" className="bg-gray-900">Secure Device</option>
            <option value="DeviceLock" className="bg-gray-900">Lock</option>
            <option value="KioskMode" className="bg-gray-900">Enable Kiosk Mode with PIN</option>
          </select>
        </div>

        {lockCommand === 'LostMode' && (
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Secure Device Message
              </label>
              <textarea
                value={lostModeMessage}
                onChange={(e) => setLostModeMessage(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Message to display on the locked screen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={lostModePhone}
                onChange={(e) => setLostModePhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="+233XXXXXXXXX"
              />
            </div>
          </div>
        )}

        {lockCommand === 'KioskMode' && (
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Kiosk Mode PIN
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Enter the PIN required to exit Kiosk Mode on the device.
              </p>
              <input
                type="text"
                value={kioskPin}
                onChange={(e) => setKioskPin(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="1234"
              />
            </div>
          </div>
        )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg"
        >
          {loading ? 'Saving Settings...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
