'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const performLogout = async () => {
      try {
        // Clear cookies manually just in case
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        await logout();
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) {
          window.location.href = '/login';
        }
      }
    };

    performLogout();

    // Absolute fallback: redirect after 2 seconds no matter what
    const timer = setTimeout(() => {
      if (mounted) window.location.href = '/login';
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1E] text-slate-400">
      <p>Signing out...</p>
    </div>
  );
}
