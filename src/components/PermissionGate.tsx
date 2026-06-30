'use client';

import { useAuth } from '@/contexts/auth-context';

interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Client-side permission gate component.
 * Renders children only if the authenticated user has the required permission.
 * Renders fallback (or nothing) otherwise.
 */
export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { hasPermission, loading } = useAuth();

  if (loading) return null;
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
