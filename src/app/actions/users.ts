'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { requireAuth } from '@/lib/auth-guard';

type ActionError = {
  message: string;
};

type JoinedRole = {
  id: string;
  name: string;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
  roles: JoinedRole | JoinedRole[] | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as any).message);
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

const getJoinedRole = (role: UserRoleRow['roles']) =>
  Array.isArray(role) ? role[0] ?? null : role;

// Helper to get an admin client for auth management
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase Service Role Key');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

async function checkUserManagementAuth() {
  const authCtx = await requireAuth();
  if (authCtx.isSuperAdmin) return authCtx;

  const hasAccess = authCtx.permissions.includes('manage_roles') || authCtx.permissions.includes('manage_users') || authCtx.isAdmin;
  if (!hasAccess) {
    throw new Error('Permission denied: Requires manage_roles or manage_users permission.');
  }
  return authCtx;
}

export async function fetchUsers() {
  try {
    const authCtx = await checkUserManagementAuth();
    const supabase = getAdminClient();
    
    // 1. Fetch auth users via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // 2. Fetch user roles mapping
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role_id, roles(id, name)');
    if (rolesError) throw rolesError;

    // 3. Merge
    const typedUserRoles = (userRoles ?? []) as UserRoleRow[];
    let users = authData.users.map(u => {
      const ur = typedUserRoles.find(r => r.user_id === u.id);
      const role = getJoinedRole(ur?.roles ?? null);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role: role ? { id: role.id, name: role.name } : null,
      };
    });

    // 4. Filter out superadmin accounts if caller is not superadmin
    if (!authCtx.isSuperAdmin) {
      users = users.filter(u => u.role?.name?.toLowerCase() !== 'superadmin');
    }

    return { success: true, users };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error as ActionError) };
  }
}

export async function createUser(email: string, password: string, roleId: string) {
  try {
    const authCtx = await checkUserManagementAuth();
    const supabase = getAdminClient();

    // Verify if the requested role is superadmin
    const { data: targetRole, error: fetchRoleErr } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .single();
    if (fetchRoleErr || !targetRole) throw new Error('Invalid role specified');

    if (targetRole.name.toLowerCase() === 'superadmin' && !authCtx.isSuperAdmin) {
      throw new Error('Forbidden. Only a Superadmin can create another Superadmin account.');
    }
    
    // 1. Create User in Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    // 2. Assign Role
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: data.user.id,
      role_id: roleId,
    });
    
    if (roleError) {
      // Cleanup if role assignment fails
      await supabase.auth.admin.deleteUser(data.user.id);
      throw roleError;
    }

    revalidatePath('/dashboard/admin/users');
    await logAudit(`Created new admin user: ${email} with role: ${targetRole.name} by ${authCtx.user.email}`);
    return { success: true, user: data.user };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateUser(userId: string, updates: { password?: string }) {
  try {
    const authCtx = await checkUserManagementAuth();
    const supabase = getAdminClient();

    // Check target user's role: only superadmin can modify another superadmin's credentials
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .maybeSingle();

    const targetIsSuperadmin = (userRole?.roles as any)?.name?.toLowerCase() === 'superadmin';
    if (targetIsSuperadmin && !authCtx.isSuperAdmin) {
      throw new Error('Forbidden. Only a Superadmin can modify a Superadmin account.');
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, updates);
    if (error) throw error;
    
    await logAudit(`Updated user credentials for: ${userId} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateUserRole(userId: string, roleId: string) {
  try {
    const authCtx = await checkUserManagementAuth();
    const supabase = getAdminClient();

    // Target user's current role
    const { data: currentRoleData } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .maybeSingle();

    const currentRoleName = (currentRoleData?.roles as any)?.name?.toLowerCase();
    if (currentRoleName === 'superadmin' && !authCtx.isSuperAdmin) {
      throw new Error('Forbidden. Only a Superadmin can modify a Superadmin user role.');
    }

    // Role being assigned
    if (roleId) {
      const { data: newRole } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single();
      if (newRole?.name?.toLowerCase() === 'superadmin' && !authCtx.isSuperAdmin) {
        throw new Error('Forbidden. Only a Superadmin can assign the Superadmin role.');
      }
    }
    
    // Delete any existing roles for this user
    const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    // If a valid roleId is provided, insert the new role
    if (roleId) {
      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId });
      if (insertError) throw insertError;
    }

    revalidatePath('/dashboard/admin/users');
    await logAudit(`Updated role for user: ${userId} to roleId: ${roleId} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteUser(userId: string) {
  try {
    const authCtx = await checkUserManagementAuth();

    if (authCtx.user.id === userId) {
      throw new Error('Cannot delete your own active administrator account.');
    }

    const supabase = getAdminClient();

    // Check if target is a superadmin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .maybeSingle();

    const targetIsSuperadmin = (userRole?.roles as any)?.name?.toLowerCase() === 'superadmin';
    if (targetIsSuperadmin && !authCtx.isSuperAdmin) {
      throw new Error('Forbidden. Only a Superadmin can delete a Superadmin account.');
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    revalidatePath('/dashboard/admin/users');
    await logAudit(`Deleted user: ${userId} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
