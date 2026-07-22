'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase';

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

export async function fetchUsers() {
  try {
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

    // 4. Filter superadmin if current user is not a superadmin
    try {
      const clientSupabase = await createServerSupabaseClient();
      const { data: { user } } = await clientSupabase.auth.getUser();
      if (user) {
        const currentUserRole = typedUserRoles.find(r => r.user_id === user.id);
        const roleName = getJoinedRole(currentUserRole?.roles ?? null)?.name?.toLowerCase();
        
        if (roleName !== 'superadmin') {
          users = users.filter(u => u.role?.name?.toLowerCase() !== 'superadmin');
        }
      }
    } catch (e) {
      // If error fetching current user, default to hiding superadmins for safety
      users = users.filter(u => u.role?.name?.toLowerCase() !== 'superadmin');
    }

    return { success: true, users };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error as ActionError) };
  }
}

export async function createUser(email: string, password: string, roleId: string) {
  try {
    const supabase = getAdminClient();
    
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
    return { success: true, user: data.user };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateUser(userId: string, updates: { password?: string }) {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, updates);
    if (error) throw error;
    
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateUserRole(userId: string, roleId: string) {
  try {
    const supabase = getAdminClient();
    
    // Delete any existing roles for this user
    const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    // If a valid roleId is provided, insert the new role
    if (roleId) {
      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId });
      if (insertError) throw insertError;
    }

    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
