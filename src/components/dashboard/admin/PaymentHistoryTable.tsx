'use client';

import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from '@/components/dashboard/admin/PaginationBar';
import { ReversePaymentButton } from '@/components/dashboard/admin/ReversePaymentButton';

interface PaymentHistoryTableProps {
  payments: any[];
  usersMap: Record<string, string>;
  canReversePayment: boolean;
}

export function PaymentHistoryTable({ payments, usersMap, canReversePayment }: PaymentHistoryTableProps) {
  const pagination = usePagination(payments, 10);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Amount</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Recorded By</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Method</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Ref</th>
              <th className="text-right text-xs font-semibold text-slate-500 px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              pagination.paginated.map((p: any) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-emerald-400">GH₵{p.amount_paid}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">
                      {p.recorded_by ? usersMap[p.recorded_by] || 'Unknown User' : 'System'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      p.payment_method === 'cash' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {p.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-mono text-slate-400 max-w-[120px] truncate" title={p.transaction_reference || 'N/A'}>
                      {p.transaction_reference || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canReversePayment && (
                      <ReversePaymentButton paymentId={p.id} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/5 bg-[#0D1526]">
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="payments"
        />
      </div>
    </div>
  );
}
