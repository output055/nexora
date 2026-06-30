'use client';

import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export function SessionDebug() {
  const { user, loading } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data, error }) => {
      setSessionInfo({ session: data.session, error });
    });
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-4 rounded-xl text-xs max-w-sm overflow-auto">
      <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
      <p><strong>User:</strong> {user ? user.email : 'null'}</p>
      <p><strong>Permissions:</strong> {user?.permissions?.length || 0}</p>
      <p><strong>Roles:</strong> {user?.roles?.map((r: any) => r.name).join(', ') || 'none'}</p>
      <p><strong>Session:</strong> {sessionInfo?.session ? 'Exists' : 'Null'}</p>
      <p><strong>Session Error:</strong> {sessionInfo?.error?.message || 'none'}</p>
    </div>
  );
}
