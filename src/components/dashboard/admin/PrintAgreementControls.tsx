'use client';

import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function PrintAgreementControls({ customerId }: { customerId: string }) {
  const router = useRouter();

  return (
    <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 border border-slate-700 shadow-2xl px-6 py-4 rounded-2xl">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
      >
        <Printer size={18} />
        Print Agreement
      </button>

      <button
        onClick={() => router.push(`/dashboard/admin/customers/${customerId}`)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl font-medium transition-colors"
      >
        Continue to Profile
        <ArrowLeft size={18} className="rotate-180" />
      </button>
    </div>
  );
}
