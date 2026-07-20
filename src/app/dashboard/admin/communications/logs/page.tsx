import { getSmsLogs } from '@/app/actions/communications';
import { CheckCircle2, XCircle, Search, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default async function SmsLogsPage() {
  const { data: logs, success } = await getSmsLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">SMS Delivery Logs</h1>
        <p className="text-slate-400">Track and audit all outgoing SMS communications.</p>
      </div>

      <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0B1120]/30">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search phone number..." 
              className="w-full bg-[#0B1120] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0B1120]/50 border-b border-white/10 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Recipient</th>
                <th className="px-6 py-4 font-medium">Message</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!success || !logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No SMS logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock size={14} className="text-slate-500" />
                        {format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{log.recipient_phone}</div>
                      {log.customer && (
                        <div className="text-xs text-slate-500">{log.customer.full_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-400 line-clamp-1 max-w-md" title={log.message_content}>
                        {log.message_content}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'sent' || log.status === 'delivered' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle size={12} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300 text-xs font-medium">
                      {log.sent_by ? (
                        <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Manual</span>
                      ) : (
                        <span className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Automated</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
