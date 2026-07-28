'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { logAuthEventAction } from '@/app/actions/auth';
import type { AuthContextValue, UserProfile } from '@/types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(
    async (userId: string, email: string): Promise<UserProfile> => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase
          .from('user_roles')
          .select(`role:roles(id, name, description, created_at, role_permissions(permission:permissions(id, name, description, created_at)))`)
          .eq('user_id', userId);

        const roles = (data ?? []).map((ur: { role: unknown }) => ur.role).filter(Boolean) as UserProfile['roles'];
        const permissions = [
          ...new Set(
            roles.flatMap((r) =>
              (r as { role_permissions?: { permission?: { name?: string } }[] }).role_permissions?.map((rp) => rp.permission?.name ?? '') ?? []
            )
          ),
        ].filter(Boolean);

        return { id: userId, email, full_name: email, roles, permissions };
      } catch {
        return { id: userId, email, full_name: email, roles: [], permissions: [] };
      }
    },
    []
  );

  useEffect(() => {

    const supabase = createBrowserSupabaseClient();
    let mounted = true;
    let profileRequestId = 0;
    let initialLoadPending = true;

    const resolveSession = async (
      session: Session | null,
      options: { finishInitialLoad?: boolean; clearMissingUser?: boolean } = {},
      requestId = ++profileRequestId
    ) => {
      try {
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id, session.user.email ?? '');
          if (mounted && requestId === profileRequestId) {
            setUser(profile);
          }
        } else if (options.clearMissingUser && mounted && requestId === profileRequestId) {
          setUser(null);
        }
      } finally {
        if ((options.finishInitialLoad || initialLoadPending) && mounted && requestId === profileRequestId) {
          initialLoadPending = false;
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('onAuthStateChange:', event, session?.user?.email);

      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        profileRequestId += 1;
        initialLoadPending = false;
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        void resolveSession(session);
      }
    });

    const initialSessionRequestId = ++profileRequestId;

    void supabase.auth
      .getSession()
      .then(({ data }) =>
        resolveSession(
          data.session,
          { finishInitialLoad: true, clearMissingUser: true },
          initialSessionRequestId
        )
      )
      .catch(() => {
        if (mounted) {
          initialLoadPending = false;
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error) {
      logAuthEventAction('login', email).catch(console.error);
    }
    
    return error ? { error: error.message } : {};
  }, []);

  const logout = useCallback(async () => {
    if (user?.email) {
      logAuthEventAction('logout', user.email).catch(console.error);
    }
    
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  }, [router, user]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
