'use client';

import { useState } from 'react';
import { logPayment } from '@/app/actions/payments';
import { CreditCard, Banknote, Loader2 } from 'lucide-react';

interface LogPaymentFormProps {
  customerId: string;
  deviceId?: string;
  remainingBalance: number;
  customerEmail?: string;
}

export default function LogPaymentForm({ customerId, deviceId, remainingBalance, customerEmail }: LogPaymentFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'paystack_momo'>('cash');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setLoading(true);
    setMessage(null);

    try {
      if (paymentMethod === 'cash') {
        const result = await logPayment({
          customerId,
          deviceId,
          amount: Number(amount),
          paymentMethod: 'cash',
        });

        if (result.success) {
          setMessage({ text: 'Cash payment logged successfully.', type: 'success' });
          setAmount('');
        } else {
          setMessage({ text: `Failed to log payment: ${result.error}`, type: 'error' });
        }
      } else {
        // Initialize Paystack
        const response = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerEmail || 'customer@nexora.test',
            amount: Number(amount),
            metadata: { customerId, deviceId },
          }),
        });
        
        const data = await response.json();
        
        if (data.status && data.data?.authorization_url) {
          // Redirect to Paystack checkout
          window.location.href = data.data.authorization_url;
        } else {
          setMessage({ text: `Paystack Error: ${data.error || 'Failed to initialize'}`, type: 'error' });
        }
      }
    } catch (error: any) {
      setMessage({ text: `An error occurred: ${error.message}`, type: 'error' });
    }
    
    setLoading(false);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl max-w-md w-full">
      <h3 className="text-lg font-semibold text-white mb-2">Make a Payment</h3>
      <p className="text-sm text-gray-400 mb-6">Remaining Balance: GHS {remainingBalance.toFixed(2)}</p>

      {message && (
        <div className={`p-4 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Amount (GHS)</label>
          <input
            type="number"
            step="0.01"
            max={remainingBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
              paymentMethod === 'cash' 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Cash
          </button>
          
          <button
            type="button"
            onClick={() => setPaymentMethod('paystack_momo')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
              paymentMethod === 'paystack_momo' 
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Paystack
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !amount || Number(amount) <= 0}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {paymentMethod === 'cash' ? 'Log Cash Payment' : 'Pay via Paystack'}
        </button>
      </form>
    </div>
  );
}
