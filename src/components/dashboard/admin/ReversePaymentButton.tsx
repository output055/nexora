'use client';

import { useState } from 'react';
import { RotateCcw, Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { reversePayment } from '@/app/actions/payments';

interface ReversePaymentButtonProps {
  paymentId: string;
}

export function ReversePaymentButton({ paymentId }: ReversePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleReverse = async () => {
    setLoading(true);
    try {
      const result = await reversePayment(paymentId);
      if (result.success) {
        toast.success('Payment successfully reversed.');
        setShowModal(false);
      } else {
        toast.error(`Failed to reverse payment: ${result.error}`);
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred while reversing the payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        title="Reverse Payment"
        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
      >
        <RotateCcw size={14} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Reverse Payment?
              </h3>
              
              <p className="text-slate-400 text-center text-sm mb-6">
                Are you sure you want to reverse this payment? This action will permanently delete the payment record, recalculate the customer's balance, and revert their next payment date. This action cannot be undone.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReverse}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Reversing...
                    </>
                  ) : (
                    'Yes, Reverse It'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
