'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        const hasAdminAccess = user.roles.some((r) => 
          ['superadmin', 'admin', 'field_agent'].includes(r.name)
        );
        
        if (!hasAdminAccess) {
          router.replace('/dashboard/customer');
        }
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">Verifying access...</p>
      </div>
    );
  }

  // Prevent flash of content if user doesn't have access
  const hasAdminAccess = user.roles.some((r) => 
    ['superadmin', 'admin', 'field_agent'].includes(r.name)
  );
  
  if (!hasAdminAccess) return null;

  return <>{children}</>;
}
