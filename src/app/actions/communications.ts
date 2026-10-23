'use server';

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { requireAuth, requireRole } from '@/lib/auth-guard';

// Log an SMS directly
export async function logSms(data: {
  recipient_phone: string;
  customer_id?: string | null;
  message_content: string;
  status?: string;
  provider_response?: any;
  cost?: number;
}) {
  try {
    const authCtx = await requireRole(['superadmin', 'admin', 'field_agent', 'shop_manager']);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('sms_logs')
      .insert({
        ...data,
        sent_by: authCtx.user.id,
      });

    if (error) {
      console.error('Failed to log SMS:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Fetch SMS logs
export async function getSmsLogs() {
  try {
    await requireRole(['superadmin', 'admin']);
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
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Create a Notification
export async function createNotification(data: {
  user_id?: string | null; // Null means broadcast to all
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
}) {
  try {
    await requireRole(['superadmin', 'admin']);
    const supabase = createServiceRoleSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .insert(data);

    if (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Mark a notification as read
export async function markNotificationRead(id: string) {
  try {
    const authCtx = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .or(`user_id.eq.${authCtx.user.id},user_id.is.null`);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Mark all notifications as read for current user
export async function markAllNotificationsRead() {
  try {
    const authCtx = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${authCtx.user.id},user_id.is.null`)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
