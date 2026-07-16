'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

type MockPayment = {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
};

const MOCK_PAYMENTS: MockPayment[] = [
  {
    id: 'pay_1',
    amount: 30.33,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    method: 'Mobile Money (MTN)',
    status: 'completed',
    reference: 'REF-839201',
  },
  {
    id: 'pay_2',
    amount: 30.33,
    date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    method: 'Mobile Money (Telecel)',
    status: 'completed',
    reference: 'REF-728192',
  },
  {
    id: 'pay_3',
    amount: 30.33,
    date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    method: 'Visa Card ****4242',
    status: 'completed',
    reference: 'REF-617283',
  },
  {
    id: 'pay_4',
    amount: 30.33,
    date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
    method: 'Mobile Money (MTN)',
    status: 'failed',
    reference: 'REF-506374',
  }
];

export default function CustomerPaymentHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<MockPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulate fetching payment history
    const fetchPayments = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setPayments(MOCK_PAYMENTS);
      setLoading(false);
    };
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter(p => 
    p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="bg-[#111827] border border-white/5 rounded-3xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-white/[0.02]">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by reference or method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-2 rounded-xl border border-white/10 shrink-0">
            <Calendar size={16} />
            <span>Last 30 Days</span>
          </div>
        </div>

        {/* Table / List */}
        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <p className="text-sm text-slate-500">Loading history...</p>
            </div>
          ) : filteredPayments.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-4 md:px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date & Time</th>
                  <th className="p-4 md:px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reference</th>
                  <th className="p-4 md:px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="p-4 md:px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="p-4 md:px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 md:px-6"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={payment.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-4 md:px-6 whitespace-nowrap">
                      <p className="text-sm font-medium text-white">{formatDate(payment.date)}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(payment.date).split(', ')[1]}</p>
                    </td>
                    <td className="p-4 md:px-6 whitespace-nowrap">
                      <span className="text-sm font-mono text-slate-300">{payment.reference}</span>
                    </td>
                    <td className="p-4 md:px-6 whitespace-nowrap">
                      <span className="text-sm text-slate-400">{payment.method}</span>
                    </td>
                    <td className="p-4 md:px-6 whitespace-nowrap">
                      <span className="text-sm font-bold text-white tabular-nums">
                        GH₵{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-4 md:px-6 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${getStatusClass(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </div>
                    </td>
                    <td className="p-4 md:px-6 whitespace-nowrap text-right">
                      <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <ArrowRight size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-slate-500">
                <Search size={24} />
              </div>
              <p className="text-white font-medium mb-1">No payments found</p>
              <p className="text-sm text-slate-500">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
