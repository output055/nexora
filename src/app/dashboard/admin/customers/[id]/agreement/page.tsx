import { createServerSupabaseClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';
import { PrintAgreementControls } from '@/components/dashboard/admin/PrintAgreementControls';
import { Shield } from 'lucide-react';

export default async function PrintableAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .select(`*, devices(*)`)
    .eq('id', id)
    .single();

  if (error || !customer) {
    notFound();
  }

  const primaryDevice = customer.devices?.[0];
  if (!primaryDevice) {
    return <div className="p-10 text-white">No device found for this customer to generate an agreement.</div>;
  }

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white text-black font-sans print:bg-white print:p-0">
      
      <PrintAgreementControls customerId={customer.id} />

      <main className="max-w-4xl mx-auto p-12 print:p-8 bg-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <Shield className="text-slate-900 w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ABIDAT MICRO CREDIT</h1>
              <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Device Financing</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800">INSTALLMENT PURCHASE AGREEMENT</h2>
            <p className="text-sm text-slate-500 mt-1">Date: {currentDate}</p>
            <p className="text-sm text-slate-500 font-mono">Ref: {customer.id.split('-')[0].toUpperCase()}-{primaryDevice.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-slate-800 leading-relaxed">
          
          <p>
            This Installment Purchase Agreement (the "Agreement") is entered into on <strong>{currentDate}</strong>, by and between <strong>Abidat Micro Credit Financing</strong> ("Company") and the customer identified below ("Customer").
          </p>

          <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 border border-slate-200 rounded-lg">
            <div>
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-3">Customer Details</h3>
              <p><strong>Name:</strong> {customer.full_name}</p>
              <p><strong>ID Number:</strong> {customer.ghana_card_id || 'N/A'}</p>
              <p><strong>Phone:</strong> {customer.phone_number}</p>
              <p><strong>Address:</strong> {customer.digital_address || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-3">Device Details</h3>
              <p><strong>Make / Model:</strong> {getHumanReadableDeviceName(primaryDevice.device_model) || primaryDevice.device_model}</p>
              <p><strong>Platform:</strong> {primaryDevice.os_platform}</p>
              <p><strong>IMEI:</strong> {primaryDevice.imei || 'N/A'}</p>
              <p><strong>Serial Number:</strong> {primaryDevice.serial_number || 'N/A'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 uppercase text-sm mb-2 border-b border-slate-200 pb-1">1. Financial Terms</h3>
            <table className="w-full text-left border-collapse border border-slate-300">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium bg-slate-50 w-1/2">Total Financed Amount</td>
                  <td className="border border-slate-300 p-2 font-bold text-lg">GH₵ {Number(primaryDevice.total_owed).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium bg-slate-50">Down Payment Made</td>
                  <td className="border border-slate-300 p-2">GH₵ {Number(primaryDevice.down_payment).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium bg-slate-50">Remaining Balance</td>
                  <td className="border border-slate-300 p-2 text-red-600 font-bold">GH₵ {Number(primaryDevice.remaining_balance).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium bg-slate-50">Repayment Cycle</td>
                  <td className="border border-slate-300 p-2 capitalize">{customer.payment_cycle}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium bg-slate-50">Installment Amount</td>
                  <td className="border border-slate-300 p-2 font-bold text-emerald-600">GH₵ {Number(primaryDevice.payment_cycle_amount).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium bg-slate-50">Contract Duration</td>
                  <td className="border border-slate-300 p-2">{primaryDevice.contract_duration_months} Months</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="hidden print:block" style={{ pageBreakBefore: 'always' }} />
          
          <div className="space-y-4 print:pt-8">
            <h3 className="font-bold text-slate-900 uppercase text-sm mb-2 border-b border-slate-200 pb-1 mt-6">2. Terms & Conditions</h3>
            <p>
              <strong>2.1 Payment Obligation:</strong> The Customer agrees to pay the Installment Amount according to the Repayment Cycle until the Remaining Balance is paid in full. Payments must be made on or before the due date.
            </p>
            <p>
              <strong>2.2 Device Ownership:</strong> The Device remains the sole property of the Company until the Total Financed Amount is fully paid. Upon final payment, ownership will automatically transfer to the Customer.
            </p>
            <p>
              <strong>2.3 Remote Device Lock (MDM):</strong> The Customer acknowledges that the Device is enrolled in a Mobile Device Management (MDM) system. <strong>In the event of a missed payment, the Company reserves the immediate right to remotely restrict or lock the Device</strong> until the outstanding balance is cleared.
            </p>
            <p>
              <strong>2.4 Loss or Damage:</strong> The Customer assumes all risk of loss, theft, or damage to the Device from the time of handover. Loss or damage does not relieve the Customer of their obligation to pay the Remaining Balance in full.
            </p>
            <p>
              <strong>2.5 Default:</strong> If the Customer defaults on any payment for a period exceeding 14 days, the Company may declare the entire Remaining Balance immediately due and payable, and may take legal action or repossess the Device.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-16">
            <div>
              <div className="h-20 border-b border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900">Customer Signature</p>
              <p className="text-slate-500 mt-1">{customer.full_name}</p>
              <p className="text-slate-500 mt-1 flex items-center gap-2">Date: <span className="inline-block w-32 border-b border-slate-400 border-dotted"></span></p>
            </div>
            <div>
              <div className="h-20 border-b border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900">Company Representative</p>
              <p className="text-slate-500 mt-1">For Abidat Micro Credit Financing</p>
              <p className="text-slate-500 mt-1 flex items-center gap-2">Date: <span className="inline-block w-32 border-b border-slate-400 border-dotted"></span></p>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 mt-12 print:mt-16 pt-8 border-t border-slate-100">
            This document is a legally binding agreement. Generated by the Abidat Micro Credit Device Financing System.
          </div>

        </div>
      </main>
    </div>
  );
}
