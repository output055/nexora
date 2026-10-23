import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function DashboardRoot() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch the roles for the current user
  const { data: userRolesData } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roles = userRolesData?.map((ur: any) => ur.roles?.name?.toLowerCase()) || [];

  if (roles.includes('superadmin') || roles.includes('admin')) {
    redirect('/dashboard/admin');
  } else if (roles.includes('field_agent') || roles.includes('shop_manager')) {
    redirect('/dashboard/agent');
  } else if (roles.includes('customer')) {
    redirect('/dashboard/customer');
  } else {
    // Default fallback
    redirect('/dashboard/customer');
  }
}
