import { getSmsLogs } from '@/app/actions/communications';
import { SmsLogsTable } from '@/components/dashboard/admin/SmsLogsTable';

export default async function SmsLogsPage() {
  const { data: logs, success } = await getSmsLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">SMS Delivery Logs</h1>
        <p className="text-slate-400">Track and audit all outgoing SMS communications.</p>
      </div>

      <SmsLogsTable logs={success && logs ? logs : []} />
    </div>
  );
}
