import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Smartphone, CreditCard, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCalculatedPaymentStatus } from '@/lib/utils';
import { RecordPaymentButton } from '@/components/dashboard/admin/RecordPaymentButton';
import { ReversePaymentButton } from '@/components/dashboard/admin/ReversePaymentButton';
import { PaymentHistoryTable } from '@/components/dashboard/admin/PaymentHistoryTable';
import { getSystemSetting } from '@/app/actions/settings';
import { hasPermission } from '@/lib/permissions';

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const canLogPayment = await hasPermission(user.id, 'log_payment');
  const canReversePayment = await hasPermission(user.id, 'reverse_payment');

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

  let signedUrl = null;
  if (customer.ghana_card_scan_path) {
    const { data } = await adminClient.storage
      .from('ghana-card-scans')
      .createSignedUrl(customer.ghana_card_scan_path, 60 * 60);
    signedUrl = data?.signedUrl;
  }

  const adminEmail = await getSystemSetting('admin_paystack_email') || 'admin@credifon.com';

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
            <h2 className="text-lg font-semibold text-white mb-4">Customer Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Primary Phone</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.phone_number}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Alternative Phone</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.alternative_phone_number || 'N/A'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">WhatsApp</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.whatsapp_number || 'N/A'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Email</p>
                <p className="text-slate-200 text-sm mt-0.5 truncate" title={customer.email || ''}>{customer.email || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-medium">Digital Address</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.digital_address || 'N/A'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Landmarks</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.location_landmarks || 'N/A'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Residential Status</p>
                <p className="text-slate-200 text-sm mt-0.5 capitalize">{customer.residential_status?.replace('_', ' ') || 'N/A'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Occupation</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.occupation || 'N/A'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-medium">Place of Work</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.place_of_work || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-medium">Landlord Contact</p>
                <p className="text-slate-200 text-sm mt-0.5">{customer.landlord_contact || 'N/A'}</p>
              </div>
              
              <div className="col-span-2 mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-slate-500 font-medium mb-3">Identity Verification</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Ghana Card ID</p>
                    <p className="text-slate-200 font-mono text-sm bg-white/5 px-3 py-1.5 rounded-lg inline-block">{customer.ghana_card_id || 'N/A'}</p>
                  </div>
                  {signedUrl && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">ID Scan / Photo</p>
                      <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-colors group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={signedUrl} 
                          alt="Ghana Card Scan" 
                          className="w-full h-32 object-cover bg-black/40 group-hover:scale-105 transition-transform duration-500"
                        />
                      </a>
                    </div>
                  )}
                </div>
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
                  <p className="text-slate-200 text-sm font-semibold">{getHumanReadableDeviceName(primaryDevice.device_model) || primaryDevice.device_model}</p>
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

              {canLogPayment ? (
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
              ) : (
                <div className="mt-4 bg-[#111827] border border-white/5 rounded-2xl p-4 text-center text-slate-500 text-sm">
                  You do not have permission to log payments.
                </div>
              )}
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
              <PaymentHistoryTable 
                payments={payments} 
                usersMap={Object.fromEntries(usersMap)} 
                canReversePayment={canReversePayment} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
