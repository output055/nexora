'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/auth-context';
import { getCalculatedPaymentStatus, formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, Device } from '@/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

type CustomerWithDevice = Customer & {
  device: Device | null;
  paymentStatus: 'current' | 'overdue' | 'completed';
  overdueCycles: number;
};

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
});

type PaymentForm = z.infer<typeof paymentSchema>;

const calculateOverdueCycles = (paymentCycle?: string, nextPaymentDate?: string | null): number => {
  if (!nextPaymentDate || !paymentCycle) return 1;
  const nextDate = new Date(nextPaymentDate);
  const now = new Date();
  if (nextDate >= now) return 1;

  const diffTime = now.getTime() - nextDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let cycleDays = 1;
  if (paymentCycle === 'weekly') cycleDays = 7;
  else if (paymentCycle === 'bi_weekly') cycleDays = 14;

  return Math.max(1, Math.floor(diffDays / cycleDays) + 1);
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState<CustomerWithDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<{ amount: number; wasCleared: boolean } | null>(null);

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema)
  });

  useEffect(() => {
    const fetchMyData = async () => {
      if (!user) return;
      
      const supabase = createBrowserSupabaseClient();
      
      // Fetch customer linked to this auth user
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (customerError || !customerData) {
        setLoading(false);
        return;
      }

      // Fetch active device for this customer
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (deviceError || !deviceData) {
        setCustomerData({
          ...(customerData as Customer),
          device: null,
          paymentStatus: 'completed',
          overdueCycles: 0
        });
        setLoading(false);
        return;
      }

      const status = getCalculatedPaymentStatus(
        deviceData.payment_status, 
        deviceData.remaining_balance, 
        deviceData.next_payment_date
      );
      
      const overdueCycles = calculateOverdueCycles(customerData.payment_cycle, deviceData.next_payment_date);

      setCustomerData({
        ...(customerData as Customer),
        device: deviceData as Device,
        paymentStatus: status,
        overdueCycles
      });
      setLoading(false);
    };

    fetchMyData();
  }, [user]);

  const paystackConfig = {
    reference: `NEX-${new Date().getTime()}`,
    email: user?.email || 'customer@credifon.app',
    amount: 0, // Will be overridden in onSubmitPayment
    publicKey: process.env.NEXT_PUBLIC_ADMIN_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const onSubmitPayment = async (data: PaymentForm) => {
    if (!customerData?.device) return;
    
    setSubmitting(true);
    const amountNum = Number(data.amount);
    
    initializePayment({
      config: {
        ...paystackConfig,
        amount: amountNum * 100, // Paystack expects kobo/pesewas
        metadata: {
          custom_fields: [
            { display_name: 'Customer ID', variable_name: 'customer_id', value: customerData.id },
            { display_name: 'Device ID', variable_name: 'device_id', value: customerData.device.id }
          ]
        }
      },
      onSuccess: async (reference) => {
        // Optimistic UI update
        const wasCleared = amountNum >= customerData.device!.remaining_balance;
        setSuccessTx({ amount: amountNum, wasCleared });
        toast.success(`Payment of GH₵${amountNum.toLocaleString()} successful!`);
        
        // Refresh data to reflect backend webhook updates after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 4000);
        
        reset();
        setSubmitting(false);
      },
      onClose: () => {
        toast.error("Payment cancelled.");
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!customerData || !customerData.device) {
    return (
      <div className="p-6 md:p-10 text-center">
        <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4 opacity-80" />
        <h2 className="text-xl font-bold text-white mb-2">No Device Found</h2>
        <p className="text-slate-400">We couldn't find an active device contract linked to your account.</p>
      </div>
    );
  }

  const { device, paymentStatus, overdueCycles } = customerData;
  const isLocked = paymentStatus === 'overdue';
  
  const isInitialPayment = device.remaining_balance === device.total_owed && (device.down_payment || 0) > 0;
  
  const installmentAmount = isInitialPayment
    ? Math.min((device.down_payment || 0), device.remaining_balance)
    : Math.min((device.payment_cycle_amount || 0) * overdueCycles, device.remaining_balance);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome back, {customerData.full_name.split(' ')[0]}
          </h1>
          <p className="text-slate-400">Manage your device and track your payments.</p>
        </div>
        
        {/* Device Status Badge */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isLocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <div className={`p-2 rounded-xl ${isLocked ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
            {isLocked ? <Lock size={20} /> : <Smartphone size={20} />}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Device Status</p>
            <p className="font-bold">{isLocked ? 'Locked (Payment Required)' : 'Active & Unlocked'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <CreditCard size={100} />
              </div>
              <p className="text-slate-400 text-sm font-medium mb-2">Remaining Balance</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight truncate" title={`GH₵${device.remaining_balance.toLocaleString()}`}>
                <span className="text-xl sm:text-2xl text-slate-500 mr-1">GH₵</span>
                {device.remaining_balance.toLocaleString()}
              </h2>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/5 inline-flex px-3 py-1.5 rounded-xl">
                <History size={14} />
                Total Financed: GH₵{device.total_owed.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <CalendarDays size={100} />
              </div>
              <p className="text-slate-400 text-sm font-medium mb-2">Next Payment Due</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight mb-1 truncate">
                {device.next_payment_date ? formatDate(device.next_payment_date) : 'N/A'}
              </h2>
              <p className="text-blue-400 font-semibold mb-4">
                GH₵{(device.payment_cycle_amount || 0).toLocaleString()} / {customerData.payment_cycle?.replace('_', ' ')}
              </p>
              
              {isLocked && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 inline-flex px-3 py-1.5 rounded-xl">
                  <AlertTriangle size={14} />
                  {overdueCycles} cycle(s) overdue
                </div>
              )}
            </div>
          </div>

          {/* Device Details Card */}
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-400" />
              Device Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-500 mb-1">Model</p>
                <p className="font-semibold text-white">{device.device_model}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">OS Platform</p>
                <p className="font-semibold text-white capitalize">{device.os_platform}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">IMEI</p>
                <p className="font-semibold text-white font-mono text-sm break-all">{device.imei || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Contract Duration</p>
                <p className="font-semibold text-white">{device.contract_duration_months} Months</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Panel */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-blue-400" />
              Make a Payment
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Payments are securely processed via Paystack.
            </p>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {successTx ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-6 rounded-2xl border flex flex-col items-center text-center ${
                    successTx.wasCleared ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/20'
                  }`}
                >
                  {successTx.wasCleared ? (
                    <Unlock size={32} className="text-emerald-400 mb-3" />
                  ) : (
                    <CheckCircle2 size={32} className="text-blue-400 mb-3" />
                  )}
                  <h4 className={`font-bold mb-1 ${successTx.wasCleared ? 'text-emerald-400' : 'text-blue-400'}`}>
                    Payment Successful
                  </h4>
                  <p className="text-sm text-slate-400 mb-4">
                    GH₵{successTx.amount.toLocaleString()} was successfully paid via Paystack.
                  </p>
                  {successTx.wasCleared && (
                    <div className="px-3 py-2 bg-emerald-500/10 rounded-lg text-emerald-400 text-xs font-medium w-full flex items-center justify-center gap-2">
                      <Smartphone size={14} />
                      Unlock command sent!
                    </div>
                  )}
                </motion.div>
              ) : device.remaining_balance > 0 ? (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit(onSubmitPayment)}
                >
                  <label htmlFor="payment-amount" className="block text-xs font-medium text-slate-400 mb-2">
                    Amount to Pay (GH₵)
                  </label>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-base">GH₵</span>
                    <input
                      id="payment-amount"
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="0.00"
                      {...register('amount')}
                      className="w-full pl-14 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all tabular-nums"
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-red-400 mb-4">{errors.amount.message}</p>
                  )}

                  <div className="flex gap-2 mb-6 flex-wrap">
                    {installmentAmount > 0 && installmentAmount < device.remaining_balance && (
                      <button
                        type="button"
                        onClick={() => setValue('amount', String(installmentAmount), { shouldValidate: true })}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-medium transition-all border border-white/5 whitespace-nowrap"
                      >
                        Installment (GH₵{installmentAmount.toLocaleString()})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setValue('amount', String(device.remaining_balance), { shouldValidate: true })}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-all border border-emerald-500/20 whitespace-nowrap"
                    >
                      Full Payoff (GH₵{device.remaining_balance.toLocaleString()})
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing via Paystack...
                      </div>
                    ) : (
                      'Pay Now'
                    )}
                  </button>
                  
                  {isLocked && (
                    <div className="mt-4 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                      <Info size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-200/70 leading-relaxed">
                        Paying your full outstanding installment of <strong>GH₵{installmentAmount.toLocaleString()}</strong> will automatically unlock your device over the air.
                      </p>
                    </div>
                  )}
                </motion.form>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Device Fully Paid</h4>
                  <p className="text-sm text-slate-400">
                    Congratulations! Your device is fully paid off and permanently unlocked.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
