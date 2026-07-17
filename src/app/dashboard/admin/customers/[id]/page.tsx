import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Smartphone, CreditCard, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCalculatedPaymentStatus } from '@/lib/utils';
import { RecordPaymentButton } from '@/components/dashboard/admin/RecordPaymentButton';
import { getSystemSetting } from '@/app/actions/settings';

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      devices(*),
      payments(*)
    `)
    .eq('id', id)
    .single();

  if (error || !customer) {
    notFound();
  }

  const primaryDevice = customer.devices?.[0];
  const payments = customer.payments?.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) || [];

  const adminClient = createServiceRoleSupabaseClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const usersMap = new Map(usersData?.users.map((u) => [u.id, u.user_metadata?.full_name || u.email]) || []);

  const adminEmail = await getSystemSetting('admin_paystack_email') || 'admin@nexora.com';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/admin/customers"
          className="p-2 -ml-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            {customer.full_name}
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <User size={14} /> Customer Profile & Payment History
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Customer & Device Info */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Customer Card */}
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Info</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Primary Phone</p>
                <p className="text-slate-200">{customer.phone_number}</p>
              </div>
              {customer.whatsapp_number && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">WhatsApp</p>
                  <p className="text-slate-200">{customer.whatsapp_number}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 font-medium">Ghana Card</p>
                <p className="text-slate-200 font-mono text-sm">{customer.ghana_card_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Address</p>
                <p className="text-slate-200">{customer.digital_address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Active Device Card */}
          {primaryDevice && (
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Smartphone size={18} className="text-blue-400" />
                Active Device Plan
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Model</p>
                  <p className="text-slate-200 text-sm font-semibold">{primaryDevice.device_model}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  {(() => {
                    const status = getCalculatedPaymentStatus(primaryDevice.payment_status, primaryDevice.remaining_balance, primaryDevice.next_payment_date);
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        status === 'overdue'
                          ? 'bg-red-500/15 text-red-400'
                          : status === 'completed' 
                            ? 'bg-amber-500/15 text-amber-400' 
                            : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {status === 'overdue' ? 'Overdue' : status === 'completed' ? 'Completed' : 'Current'}
                      </span>
                    );
                  })()}
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 font-medium mb-1">Outstanding Balance</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums truncate" title={`GH₵ ${Number(primaryDevice.remaining_balance).toLocaleString()}`}>
                    GH₵{Number(primaryDevice.remaining_balance).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    of GH₵{Number(primaryDevice.total_owed).toLocaleString()} total
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Next Payment</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-400">
                      {new Date(primaryDevice.next_payment_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      GH₵{Number(primaryDevice.payment_cycle_amount).toLocaleString()} / {customer.payment_cycle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <RecordPaymentButton 
                  customerId={customer.id} 
                  deviceId={primaryDevice.id} 
                  isDownPayment={payments.length === 0 && Number(primaryDevice.remaining_balance) >= Number(primaryDevice.total_owed) * 0.9} 
                  defaultAmount={
                    (payments.length === 0 && Number(primaryDevice.remaining_balance) >= Number(primaryDevice.total_owed) * 0.9)
                      ? (primaryDevice.down_payment ? Number(primaryDevice.down_payment) : 0)
                      : (primaryDevice.payment_cycle_amount ? Number(primaryDevice.payment_cycle_amount) : 0)
                  }
                  adminEmail={adminEmail}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Payment History */}
        <div className="lg:col-span-2">
          <div className="bg-[#111827] border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0D1526]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" />
                Payment History
              </h2>
              <div className="text-sm text-slate-400">
                {payments.length} total payments
              </div>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Recorded By</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Method</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Calendar size={14} className="text-slate-500" />
                            {new Date(p.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-emerald-400 tabular-nums">
                            + GH₵{Number(p.amount_paid).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                              <User size={12} className="text-slate-400" />
                            </div>
                            <span className="text-sm text-slate-300">
                              {usersMap.get(p.collector_id) || 'Unknown User'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-slate-300 capitalize border border-white/10">
                            {p.payment_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-500">
                            {p.transaction_reference || '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
