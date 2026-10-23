import { createServiceRoleSupabaseClient } from './supabase';

/**
 * Fetch all permission slugs for a given user by joining:
 * user_roles → role_permissions → permissions
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const supabase = createServiceRoleSupabaseClient();

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role:roles (
          role_permissions (
            permission:permissions ( name )
          )
        )
      `)
      .eq('user_id', userId);

    if (error || !data) return [];

    const permissionSet = new Set<string>();
    for (const userRole of data) {
      const role = userRole.role as unknown as {
        role_permissions: { permission: { name: string } }[];
      } | null;
      if (!role) continue;
      for (const rp of role.role_permissions) {
        if (rp.permission?.name) permissionSet.add(rp.permission.name);
      }
    }

    return Array.from(permissionSet);
  } catch {
    return [];
  }
}

export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data
      .map((ur: any) => ur.role?.name?.toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Boolean guard — checks if a user has a specific permission slug.
 * Use in API route handlers before executing privileged operations.
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * Boolean guard — checks if a user has any of the specified roles.
 */
export async function hasRole(
  userId: string,
  roleNames: string | string[]
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  const targetRoles = (Array.isArray(roleNames) ? roleNames : [roleNames]).map(r => r.toLowerCase());
  return roles.some(r => targetRoles.includes(r));
}
