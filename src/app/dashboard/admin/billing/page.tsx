'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Activity, Calendar } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { getDevicesAction } from '@/app/actions/devices';
import { updateSystemSetting } from '@/app/actions/settings';

const UNIT_PRICE_USD = 4.5; // $4.5 per device
const MIN_DEVICES = 15;

export default function AdminBillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deviceCount, setDeviceCount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState<number>(15.5); // Fallback rate
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch devices
        const res = await getDevicesAction();
        if (res.success && res.data?.devices) {
          setDeviceCount(res.data.devices.length);
        } else {
          setDeviceCount(0);
        }
        
        // Fetch live exchange rate
        const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
        const rateData = await rateRes.json();
        if (rateData && rateData.rates && rateData.rates.GHS) {
          setExchangeRate(rateData.rates.GHS);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const billedDevices = Math.max(MIN_DEVICES, deviceCount);
  const totalCostUSD = billedDevices * UNIT_PRICE_USD;

  // Paystack config
  // Paystack standard accounts in Ghana only process GHS unless USD is explicitly activated.
  // We'll convert the USD cost to GHS using the live exchange rate.
  const totalCostGHS = totalCostUSD * exchangeRate;

  const config = {
    reference: (new Date()).getTime().toString() + '-' + Math.floor(Math.random() * 1000000),
    email: user?.email || 'admin@nexora.com',
    amount: Math.round(totalCostGHS * 100), // convert to pesewas
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    currency: 'GHS',
    channels: ['card', 'mobile_money'],
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setIsProcessing(false);
    toast.success(`Payment successful! Reference: ${reference.reference}`);
    
    try {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      const res = await updateSystemSetting('last_paid_month', currentMonthStr);
      
      if (res.success) {
        toast.success("System unlocked successfully. Thank you for your payment.");
        // We reload the window so the SubscriptionGuard re-evaluates
        window.location.href = '/dashboard/admin';
      } else {
        toast.error("Payment received, but failed to unlock system. Contact support.");
      }
    } catch (err) {
      toast.error("An error occurred while updating the system.");
    }
  };

  const onClose = () => {
    setIsProcessing(false);
    toast.error("Payment window closed.");
  };

  const handlePayment = () => {
    if (!config.publicKey || config.publicKey.includes('xxxxxxxx')) {
      toast.error('Paystack Public Key is missing! Please configure NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in your .env.local file.');
      return;
    }
    
    setIsProcessing(true);
    initializePayment({ onSuccess, onClose });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const isUnderMinimum = deviceCount < MIN_DEVICES;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="text-blue-500" />
          Billing & Subscription
        </h2>
        <p className="text-slate-400 text-sm mt-1">Manage your Nexora platform subscription and view your current device usage.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Activity size={120} />
            </div>
            
            <h3 className="text-lg font-medium text-white mb-6">Current Usage</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-400">Enrolled Devices</p>
                  <Smartphone size={18} className="text-blue-400" />
                </div>
                <h2 className="text-4xl font-bold text-white tabular-nums">{deviceCount}</h2>
                <p className="text-xs text-slate-500 mt-2">Active devices managed via MDM</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-400">Billed Devices</p>
                  <ShieldCheck size={18} className="text-emerald-400" />
                </div>
                <h2 className="text-4xl font-bold text-white tabular-nums">{billedDevices}</h2>
                {isUnderMinimum ? (
                  <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Minimum tier enforced ({MIN_DEVICES} devices)
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Above minimum tier
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">Subscription Features</h3>
            <ul className="space-y-3">
              {[
                'Full access to Mobile Device Management (MDM)',
                'Automated payment cycle lock/unlock enforcement',
                'Unlimited customer and retailer accounts',
                'Advanced analytics and audit logs',
                'Premium 24/7 technical support'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Checkout Panel */}
        <div className="bg-gradient-to-b from-blue-900/20 to-[#111827] border border-blue-500/20 rounded-3xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
          
          <h3 className="text-lg font-bold text-white mb-2">Monthly Subscription</h3>
          <p className="text-sm text-slate-400 mb-6 border-b border-white/5 pb-6">
            Your billing cycle renews on the 1st of every month.
          </p>

          <div className="flex-1 space-y-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Rate per device</span>
              <span className="text-white font-medium">${UNIT_PRICE_USD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Billed devices</span>
              <span className="text-white font-medium">x {billedDevices}</span>
            </div>
            
            {isUnderMinimum && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mt-4">
                <p className="text-xs text-yellow-200/80 leading-relaxed">
                  You are currently managing <strong>{deviceCount}</strong> devices. As per the platform agreement, the minimum billing threshold is <strong>{MIN_DEVICES}</strong> devices.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 mb-6">
            <div className="flex justify-between items-end">
              <span className="text-slate-300 font-medium">Total Due</span>
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate" title={`$${totalCostUSD.toFixed(2)}`}>${totalCostUSD.toFixed(2)}</span>
            </div>
            <p className="text-right text-xs text-slate-500 mt-1">Processed securely via Paystack</p>
          </div>

          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-70 disabled:active:scale-100"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing...
              </div>
            ) : (
              <>
                Pay Subscription
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
