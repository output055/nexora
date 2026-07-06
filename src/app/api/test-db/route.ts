import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceRoleSupabaseClient();
  const { data: c, error: cErr } = await supabase.from('customers').select('*');
  const { data: d, error: dErr } = await supabase.from('devices').select('*');

  return NextResponse.json({
    customers: c?.length,
    customers_error: cErr?.message,
    devices: d?.length,
    devices_error: dErr?.message,
  });
}
