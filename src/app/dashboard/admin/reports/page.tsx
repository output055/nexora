import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { ReportsTabs } from '@/components/dashboard/admin/reports/ReportsTabs';

export const metadata = {
  title: 'Reports & Analytics | Credifon Admin',
  description: 'Smart analytics for agent performance and financial aging',
};

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();
  const adminClient = createServiceRoleSupabaseClient();

  // Parallel fetch: users, payments, devices, and expenses
  const [
    { data: authUsers },
    { data: payments },
    { data: devices },
    { data: expenses },
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase.from('devices').select('*, customers!inner(full_name, phone_number)'),
    supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
  ]);

  // Fallback safe arrays
  const usersList = authUsers?.users || [];
  const paymentsList = payments || [];
  const devicesList = devices || [];
  const expensesList = expenses || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
          Reports & Analytics
        </h1>
        <p className="text-slate-400">
          Deep dive into team performance and financial delinquency.
        </p>
      </div>

      <ReportsTabs 
        users={usersList} 
        payments={paymentsList} 
        devices={devicesList} 
        expenses={expensesList}
      />
    </div>
  );
}
