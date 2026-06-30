'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  Apple,
  Phone,
  User,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
});
type PaymentForm = z.infer<typeof paymentSchema>;

type PaymentApiResponse = {
  success: boolean;
  error?: string;
  data?: {
    customer: Customer;
    payment: {
      amount: number;
      wasCleared: boolean;
    };
    unlock: {
      attempted: boolean;
      success: boolean;
      error?: string;
    };
  };
};

export default function RetailerPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<{ amount: number; wasCleared: boolean } | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from('customers').select('*');
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) });

  const results = query.trim().length >= 2
    ? customers.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.full_name.toLowerCase().includes(q) ||
          c.phone_number.includes(q) ||
          c.device_model.toLowerCase().includes(q)
        );
      })
    : [];

  const handleSelectCustomer = (c: Customer) => {
    setSelected(c);
    setQuery('');
    setSuccessTx(null);
    reset();
  };

  const onSubmitPayment = useCallback(
    async (data: PaymentForm) => {
      if (!selected) return;
      const amount = Number(data.amount);
      setSubmitting(true);

      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: selected.id, amount }),
        });
        
        const result = await response.json() as PaymentApiResponse;
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error ?? 'Payment submission failed.');
        }

        const { customer: updatedCustomer, payment, unlock } = result.data;

        setCustomers((prev) => prev.map((c) => (c.id === selected.id ? updatedCustomer : c)));
        setSelected(updatedCustomer);
        setSuccessTx({ amount: payment.amount, wasCleared: payment.wasCleared });
        reset();

        if (payment.wasCleared && unlock.success) {
          toast.success(`Balance cleared! Device unlock command sent for ${selected.full_name}.`, { duration: 6000 });
        } else if (payment.wasCleared && unlock.attempted) {
          toast.warning(`Payment recorded but unlock failed: ${unlock.error ?? 'Please unlock manually.'}`);
        } else {
          toast.success(`GH₵${payment.amount.toLocaleString()} recorded for ${selected.full_name}.`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Payment submission failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [selected, reset]
  );

  const progressPct = selected
    ? Math.min(100, ((selected.total_owed - selected.remaining_balance) / selected.total_owed) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-5 max-w-[600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-3">
          <CreditCard size={20} className="text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Payment Entry</h1>
        <p className="text-sm text-slate-500 mt-1">Search for a customer and log a cash collection.</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
        <input
          id="retailer-search"
          type="search"
          placeholder="Search by name, phone number, or device…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSuccessTx(null); }}
          className="w-full pl-11 pr-4 py-4 rounded-2xl bg-[#111827] border border-white/8 text-white placeholder:text-slate-600 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          autoComplete="off"
        />

        {/* Dropdown results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[280px] overflow-y-auto"
            >
              {results.map((c) => (
                <button
                  key={c.id}
                  id={`result-${c.id}`}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{c.phone_number} · {c.device_model}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold ${c.payment_status === 'overdue' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {c.payment_status === 'overdue' ? '⚠ Overdue' : '✓ Current'}
                    </p>
                    <p className="text-xs text-slate-600">GH₵{c.remaining_balance.toLocaleString()} left</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
          {query.trim().length >= 2 && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-white/10 rounded-2xl p-6 text-center z-50"
            >
              <Search size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No customers found for &quot;{query}&quot;</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Selected customer card */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden"
          >
            {/* Customer info header */}
            <div className="p-5 border-b border-white/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                  {selected.os_platform === 'iOS' ? (
                    <Apple size={20} className="text-slate-300" />
                  ) : (
                    <Smartphone size={20} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white">{selected.full_name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-500">{selected.phone_number}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{selected.device_model} · {selected.os_platform}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                    ${selected.payment_status === 'overdue'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    }
                  `}>
                    {selected.payment_status === 'overdue'
                      ? <><AlertTriangle size={10} /> Overdue</>
                      : <><CheckCircle2 size={10} /> Current</>
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500">Outstanding Balance</p>
                  <p className="text-3xl font-bold text-white tabular-nums mt-0.5">
                    GH₵{selected.remaining_balance.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">of GH₵{selected.total_owed.toLocaleString()} total</p>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                    {progressPct.toFixed(0)}% paid
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                />
              </div>
            </div>

            {/* Success state */}
            <AnimatePresence>
              {successTx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`px-5 py-4 border-b border-white/5 flex items-start gap-3
                    ${successTx.wasCleared ? 'bg-emerald-500/5' : 'bg-blue-500/5'}
                  `}
                >
                  {successTx.wasCleared ? (
                    <Unlock size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${successTx.wasCleared ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {successTx.wasCleared ? 'Balance cleared — device unlock command sent!' : 'Payment recorded successfully'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      GH₵{successTx.amount.toLocaleString()} collected
                      {successTx.wasCleared && ' · MDM unlock command fired over the air'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment form */}
            {selected.remaining_balance > 0 ? (
              <form onSubmit={handleSubmit(onSubmitPayment)} className="p-5">
                <label htmlFor="payment-amount" className="block text-xs font-medium text-slate-400 mb-2">
                  Payment Amount (GH₵)
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-base">GH₵</span>
                      <input
                        id="payment-amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="0"
                        {...register('amount')}
                        className="w-full pl-8 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all tabular-nums"
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>
                    )}
                  </div>
                  <button
                    id="submit-payment"
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center gap-2 shadow-[0_4px_20px_rgba(59,130,246,0.3)] whitespace-nowrap"
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin" /> Processing…</>
                    ) : (
                      <><CreditCard size={16} /> Log Payment</>
                    )}
                  </button>
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[5000, 10000, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setValue('amount', String(Math.min(amt, selected.remaining_balance)), { shouldValidate: true })}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/8 hover:text-white text-xs font-medium transition-all border border-white/5"
                    >
                      GH₵{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setValue('amount', String(selected.remaining_balance), { shouldValidate: true })}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 text-xs font-semibold transition-all border border-emerald-500/20"
                  >
                    Full (GH₵{selected.remaining_balance.toLocaleString()})
                  </button>
                </div>

                <p className="text-xs text-slate-600 mt-3 text-center">
                  ⚡ Paying the full outstanding balance will automatically unlock the device over the air.
                </p>
              </form>
            ) : (
              <div className="p-5 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-emerald-400">Account fully paid</p>
                <p className="text-xs text-slate-500 mt-1">No outstanding balance — device is unlocked.</p>
              </div>
            )}

            <div className="px-5 pb-4 flex justify-end">
              <button
                onClick={() => { setSelected(null); setSuccessTx(null); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XCircle size={13} />
                Clear selection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state when no selection */}
      {!selected && query.trim().length < 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-slate-600"
        >
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type at least 2 characters to search for a customer.</p>
        </motion.div>
      )}
    </div>
  );
}
