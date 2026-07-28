import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Requires a cron job service (e.g. Vercel Cron or custom cron) to hit this endpoint
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Service Role since we are running as a background job
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    const { data, error, count } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('timestamp', cutoffDate);

    if (error) {
      console.error('Error cleaning up audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${count || 0} old audit logs.`,
      cutoffDate
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
