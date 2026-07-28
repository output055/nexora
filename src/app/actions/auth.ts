'use server';

import { logAudit } from '@/lib/audit';

export async function logAuthEventAction(event: 'login' | 'logout', email: string) {
  try {
    await logAudit(`User ${event}: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to log auth event:', error);
    return { success: false };
  }
}
