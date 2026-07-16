'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { AuthContextValue, UserProfile } from '@/types';
import { mockRoles } from '@/lib/mock-data';

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Demo user for local dev when Supabase is not configured ───────────────────
const DEMO_USER: UserProfile = {
  id: 'demo-admin-001',
  email: 'admin@nexora.dev',
  full_name: 'Demo Admin',
  roles: mockRoles.filter((r) => r.name === 'superadmin'),
  permissions: mockRoles.find((r) => r.name === 'superadmin')?.permissions.map((p) => p.name) ?? [],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [user, setUser] = useState<UserProfile | null>(supabaseConfigured ? null : DEMO_USER);
  const [loading, setLoading] = useState(supabaseConfigured);

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
    if (!supabaseConfigured) {
      return;
    }

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
  }, [supabaseConfigured, fetchUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabaseConfigured) {
      setUser(DEMO_USER);
      return {};
    }
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, [supabaseConfigured]);

  const logout = useCallback(async () => {
    if (!supabaseConfigured) {
      setUser(null);
      router.push('/login');
      return;
    }
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  }, [supabaseConfigured, router]);

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
