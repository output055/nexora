'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Search, Clock, X, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';

type SmsLog = {
  id: string;
  sent_at: string;
  recipient_phone: string;
  message_content: string;
  status: string;
  sent_by: string | null;
  customer?: {
    full_name: string;
  } | null;
};

interface SmsLogsTableProps {
  logs: SmsLog[];
}

type SortKey = 'sent_at' | 'recipient_phone';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'delivered' | 'sent' | 'failed';

export function SmsLogsTable({ logs }: SmsLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('sent_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedLog, setSelectedLog] = useState<SmsLog | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        log.recipient_phone.includes(lowerQuery) ||
        log.customer?.full_name?.toLowerCase().includes(lowerQuery) ||
        log.message_content.toLowerCase().includes(lowerQuery);
      
      const matchStatus = filterStatus === 'all' || 
        (filterStatus === 'failed' && log.status !== 'delivered' && log.status !== 'sent') || 
        log.status === filterStatus;

      return matchSearch && matchStatus;
    }).sort((a, b) => {
      if (sortKey === 'sent_at') {
        const aDate = new Date(a.sent_at).getTime();
        const bDate = new Date(b.sent_at).getTime();
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
      }
      if (sortKey === 'recipient_phone') {
        return sortDir === 'asc' 
          ? a.recipient_phone.localeCompare(b.recipient_phone)
          : b.recipient_phone.localeCompare(a.recipient_phone);
      }
      return 0;
    });
  }, [logs, searchQuery, filterStatus, sortKey, sortDir]);

  const pagination = usePagination(filteredLogs, 10);

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc' 
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
  };

  return (
    <>
      <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3 bg-[#0B1120]/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by phone, name, or message..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B1120] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0B1120] border border-white/10 rounded-lg">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            {(searchQuery || filterStatus !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Clear filters"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0B1120]/50 border-b border-white/10 text-slate-400">
              <tr>
                <th 
                  className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort('sent_at')}
                >
                  <div className="flex items-center gap-2">
                    Date & Time <SortIcon field="sent_at" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort('recipient_phone')}
                >
                  <div className="flex items-center gap-2">
                    Recipient <SortIcon field="recipient_phone" />
                  </div>
                </th>
                <th className="px-6 py-4 font-medium">Message Snippet</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagination.paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No SMS logs found.
                  </td>
                </tr>
              ) : (
                pagination.paginated.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock size={14} className="text-slate-500" />
                        {format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{log.recipient_phone}</div>
                      {log.customer && (
                        <div className="text-xs text-slate-500">{log.customer.full_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-400 line-clamp-1 max-w-md group-hover:text-slate-300 transition-colors">
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
        
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="logs"
        />
      </div>

      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#1E293B] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#0B1120]/30">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Message Details</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock size={14} />
                    {format(new Date(selectedLog.sent_at), 'MMM d, yyyy HH:mm:ss')}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0B1120]/50 p-4 rounded-xl border border-white/5">
                    <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Recipient</div>
                    <div className="text-white font-medium">{selectedLog.recipient_phone}</div>
                    {selectedLog.customer && (
                      <div className="text-sm text-slate-400 mt-0.5">{selectedLog.customer.full_name}</div>
                    )}
                  </div>
                  <div className="bg-[#0B1120]/50 p-4 rounded-xl border border-white/5">
                    <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Status</div>
                    <div>
                      {selectedLog.status === 'sent' || selectedLog.status === 'delivered' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 size={16} /> Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-400">
                          <XCircle size={16} /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Message Content</div>
                  <div className="bg-[#0B1120]/50 p-5 rounded-xl border border-white/5 text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {selectedLog.message_content}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
