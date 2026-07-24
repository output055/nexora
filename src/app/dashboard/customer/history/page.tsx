'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Filter,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from '@/components/dashboard/admin/PaginationBar';

import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type PaymentRecord = {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
};

type SortKey = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

export default function CustomerPaymentHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;
      const supabase = createBrowserSupabaseClient();
      
      const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).single();
      if (customer) {
        const { data: dbPayments } = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
          
        if (dbPayments) {
          setPayments(dbPayments.map(p => ({
            id: p.id,
            amount: p.amount_paid,
            date: p.created_at,
            method: p.payment_method === 'cash' ? 'Cash Collection' : 'Paystack',
            status: 'completed',
            reference: p.transaction_reference || 'MANUAL-CASH'
          })));
        }
      }
      setLoading(false);
    };
    fetchPayments();
  }, [user]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        p.reference.toLowerCase().includes(lowerQuery) ||
        p.method.toLowerCase().includes(lowerQuery);
      
      const matchMethod = filterMethod === 'all' || 
        (filterMethod === 'cash' && p.method === 'Cash Collection') ||
        (filterMethod === 'paystack' && p.method === 'Paystack');

      return matchSearch && matchMethod;
    }).sort((a, b) => {
      if (sortKey === 'date') {
        const aDate = new Date(a.date).getTime();
        const bDate = new Date(b.date).getTime();
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
      }
      if (sortKey === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
  }, [payments, searchQuery, filterMethod, sortKey, sortDir]);

  const pagination = usePagination(filteredPayments, 10);

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc' 
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'pending': return <Clock size={16} className="text-yellow-400" />;
      case 'failed': return <AlertTriangle size={16} className="text-red-400" />;
      default: return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <FileText className="text-blue-400" />
            Payment History
          </h1>
          <p className="text-slate-400 text-sm">Review your past transactions and receipts.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors border border-white/10">
          <Download size={16} />
          Export Statement
        </button>
      </div>

      <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-white/10 flex flex-col sm:flex-row gap-4 bg-[#0B1120]/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by reference..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B1120] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0B1120] border border-white/10 rounded-lg">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash Collection</option>
                <option value="paystack">Paystack</option>
              </select>
            </div>
            {(searchQuery || filterMethod !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setFilterMethod('all'); }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Clear filters"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <p className="text-sm text-slate-500">Loading history...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#0B1120]/50 text-slate-400 text-sm border-b border-white/10">
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Date <SortIcon field="date" />
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium">Reference ID</th>
                  <th className="px-6 py-4 font-medium">Payment Method</th>
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center gap-2">
                      Amount <SortIcon field="amount" />
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pagination.paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No payments match your filters.
                    </td>
                  </tr>
                ) : (
                  pagination.paginated.map((payment, i) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={payment.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{formatDate(payment.date)}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(payment.date).split(', ')[1]}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-300">{payment.reference}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{payment.method}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">
                        GH₵{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${getStatusClass(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                          <ArrowRight size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
