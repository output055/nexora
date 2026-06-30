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
