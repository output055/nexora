'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Loader2, DollarSign } from 'lucide-react';
import { logPayment } from '@/app/actions/payments';
import { toast } from 'sonner';
import { usePaystackPayment } from 'react-paystack';

interface RecordPaymentButtonProps {
  customerId: string;
  deviceId?: string;
  isDownPayment?: boolean;
  defaultAmount?: number;
  adminEmail?: string;
}

export function RecordPaymentButton({ customerId, deviceId, isDownPayment, defaultAmount = 0, adminEmail = 'admin@credifon.com' }: RecordPaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'paystack_momo' | 'bank_transfer'>(isDownPayment ? 'paystack_momo' : 'cash');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paystack config for admin account
  const config = {
    reference: (new Date()).getTime().toString(),
    email: adminEmail,
    amount: Number(amount) * 100, // Paystack amount is in kobo/pesewas
    publicKey: process.env.NEXT_PUBLIC_ADMIN_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (referenceObj: any) => {
    try {
      const result = await logPayment({
        customerId,
        deviceId,
        amount: Number(amount),
        paymentMethod: 'paystack_momo',
        transactionReference: referenceObj.reference,
        isDownPayment
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Payment recorded successfully via Paystack');
      setIsOpen(false);
      setAmount(defaultAmount ? defaultAmount.toString() : '');
      setReference('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onClosePaystack = () => {
    setIsSubmitting(false);
    toast.error('Paystack transaction was cancelled');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);

    if (paymentMethod === 'paystack_momo') {
      if (!process.env.NEXT_PUBLIC_ADMIN_PAYSTACK_PUBLIC_KEY) {
        toast.error('Admin Paystack Public Key is missing.');
        setIsSubmitting(false);
        return;
      }
      
      // Trigger Paystack popup
      initializePayment({
        onSuccess,
        onClose: onClosePaystack
      });
      return; // Let onSuccess handle the rest
    }

    try {
      const result = await logPayment({
        customerId,
        deviceId,
        amount: Number(amount),
        paymentMethod,
        transactionReference: reference,
        isDownPayment
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Payment recorded successfully');
      setIsOpen(false);
      setAmount(defaultAmount ? defaultAmount.toString() : '');
      setReference('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500"
      >
        <DollarSign size={16} />
        {isDownPayment ? 'Record Down Payment' : 'Record Payment'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-[#111827] border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-400" />
                  {isDownPayment ? 'Record Initial Down Payment' : 'Record Payment'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount (GH₵)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-white/10 bg-[#0D1526] px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0D1526] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="paystack_momo">Mobile Money</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Transaction Reference (Optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. MOMO-123456"
                    className="w-full rounded-xl border border-white/10 bg-[#0D1526] px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                    Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
