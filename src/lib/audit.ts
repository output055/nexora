import { createServerSupabaseClient } from '@/lib/supabase';

export async function logAudit(action_description: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Attempt to get the current authenticated user's email
    const { data: { user } } = await supabase.auth.getUser();
    const actor_name = user?.email || 'System / Unauthenticated';

    const { error } = await supabase.from('audit_logs').insert({
      actor_name,
      action_description,
    });

    if (error) {
      console.error('[logAudit] Error inserting audit log:', error);
    }
  } catch (error) {
    console.error('[logAudit] Unexpected error:', error);
  }
}
