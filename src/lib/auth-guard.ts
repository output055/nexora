import { createServerSupabaseClient } from './supabase';
import { getUserPermissions, getUserRoles } from './permissions';
import type { User } from '@supabase/supabase-js';

export interface AuthContext {
  user: User;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

/**
 * Ensures caller is logged in. Throws an error if unauthenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required. Please log in.');
  }

  const [roles, permissions] = await Promise.all([
    getUserRoles(user.id),
    getUserPermissions(user.id),
  ]);

  const isSuperAdmin = roles.includes('superadmin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const isStaff = isAdmin || roles.includes('shop_manager') || roles.includes('field_agent');

  return {
    user,
    roles,
    permissions,
    isSuperAdmin,
    isAdmin,
    isStaff,
  };
}

/**
 * Requires a specific permission slug (superadmin always bypasses).
 */
export async function requirePermission(permission: string): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (ctx.isSuperAdmin) {
    return ctx;
  }

  if (!ctx.permissions.includes(permission)) {
    throw new Error(`Forbidden. You lack the '${permission}' permission.`);
  }

  return ctx;
}

/**
 * Requires the user to have at least one of the specified roles (superadmin always passes).
 */
export async function requireRole(allowedRoles: string | string[]): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (ctx.isSuperAdmin) {
    return ctx;
  }

  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) => r.toLowerCase());
  const hasAllowedRole = ctx.roles.some((r) => allowed.includes(r.toLowerCase()));

  if (!hasAllowedRole) {
    throw new Error(`Forbidden. Requires one of roles: [${allowed.join(', ')}].`);
  }

  return ctx;
}

/**
 * Requires admin or superadmin privileges.
 */
export async function requireAdmin(): Promise<AuthContext> {
  return requireRole(['superadmin', 'admin']);
}

/**
 * Requires strictly superadmin privileges.
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.isSuperAdmin) {
    throw new Error('Forbidden. Superadmin privileges required.');
  }
  return ctx;
}
