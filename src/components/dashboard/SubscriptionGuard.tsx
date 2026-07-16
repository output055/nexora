'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getSystemSetting } from '@/app/actions/settings';
import { Lock, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (authLoading || !user) return;

      const isSuperadmin = user.roles.some((r) => r.name === 'superadmin');
      if (isSuperadmin) {
        setIsLoading(false);
        return; // Superadmin bypasses lockout
      }

      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (today.getDate() > 18) {
        try {
          const lastPaidMonth = await getSystemSetting('last_paid_month');
          if (lastPaidMonth !== currentMonthStr) {
            setIsLocked(true);
          }
        } catch (error) {
          console.error("Failed to check subscription status:", error);
          // Fail safe: lock if we can't verify and it's past the 18th
          setIsLocked(true); 
        }
      }
      
      setIsLoading(false);
    };

    checkSubscription();
  }, [user, authLoading, pathname]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // If locked, and we are NOT on the billing page
  if (isLocked && pathname !== '/dashboard/admin/billing') {
    const isAdmin = user?.roles.some((r) => r.name === 'admin');

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="max-w-md w-full bg-[#111827] border border-red-500/20 rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
            <Lock className="text-red-500" size={32} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Platform Suspended</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Access to the Nexora platform has been temporarily disabled due to an overdue subscription payment. 
          </p>

          {isAdmin ? (
            <Link 
              href="/dashboard/admin/billing"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
            >
              <CreditCard size={18} />
              Go to Billing Portal
              <ArrowRight size={16} />
            </Link>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
              Please contact your administrator to resolve this billing issue.
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
