'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth-guard';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as any).message);
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

export async function addExpense(payload: { amount: number; category: string; description?: string; expense_date: string }) {
  try {
    const authCtx = await requireAdmin();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('expenses').insert({
      amount: payload.amount,
      category: payload.category,
      description: payload.description || null,
      expense_date: payload.expense_date,
      created_by: authCtx.user.id
    });

    if (error) throw error;

    revalidatePath('/dashboard/admin/reports');
    await logAudit(`Added business expense: GH₵${payload.amount} for ${payload.category} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteExpense(id: string) {
  try {
    const authCtx = await requireAdmin();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/admin/reports');
    await logAudit(`Deleted business expense ID: ${id} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
