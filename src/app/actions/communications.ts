'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

// Log an SMS directly
export async function logSms(data: {
  recipient_phone: string;
  customer_id?: string | null;
  message_content: string;
  status?: string;
  provider_response?: any;
  cost?: number;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('sms_logs')
    .insert({
      ...data,
      sent_by: user?.id || null,
    });

  if (error) {
    console.error('Failed to log SMS:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Fetch SMS logs
export async function getSmsLogs() {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('sms_logs')
    .select('*, customer:customers(full_name)')
    .order('sent_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Failed to get SMS logs:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

// Create a Notification
export async function createNotification(data: {
  user_id?: string | null; // Null means broadcast to all
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
}) {
  // We use service role to bypass RLS for creating system notifications if it's not the user creating it
  const { createServiceRoleSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServiceRoleSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .insert(data);

  if (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Mark a notification as read
export async function markNotificationRead(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Mark all notifications as read for current user
export async function markAllNotificationsRead() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Update logic needs to handle `user_id IS NULL` for global notifications
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
