'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ReceiptText, Plus, Trash2, Search, Filter, X, ChevronUp, ChevronDown } from 'lucide-react';
import { addExpense, deleteExpense } from '@/app/actions/expenses';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';

interface ExpenseLedgerTabProps {
  expenses: any[];
}

const CATEGORIES = [
  'Office Supplies',
  'Marketing',
  'Software & Subscriptions',
  'Salaries & Wages',
  'Hardware & Devices',
  'Travel & Transport',
  'Miscellaneous'
];

type SortKey = 'expense_date' | 'amount';
type SortDir = 'asc' | 'desc';

export function ExpenseLedgerTab({ expenses }: ExpenseLedgerTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('expense_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const lowerQuery = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || 
      (exp.description && exp.description.toLowerCase().includes(lowerQuery));
    const matchCategory = filterCategory === 'all' || exp.category === filterCategory;
    return matchSearch && matchCategory;
  }).sort((a, b) => {
    if (sortKey === 'expense_date') {
      const aDate = new Date(a.expense_date).getTime();
      const bDate = new Date(b.expense_date).getTime();
      return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
    }
    if (sortKey === 'amount') {
      return sortDir === 'asc' ? Number(a.amount) - Number(b.amount) : Number(b.amount) - Number(a.amount);
    }
    return 0;
  });

  const pagination = usePagination(filteredExpenses, 10);

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc' 
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Saving expense...', { id: 'save-expense' });

    const res = await addExpense({
      amount: Number(amount),
      category,
      description,
      expense_date: date
    });

    if (res.success) {
      toast.success('Expense recorded successfully', { id: 'save-expense' });
      setAmount('');
      setDescription('');
    } else {
      toast.error(res.error || 'Failed to record expense', { id: 'save-expense' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    toast.loading('Deleting expense...', { id: 'del-expense' });
    const res = await deleteExpense(id);
    if (res.success) {
      toast.success('Expense deleted', { id: 'del-expense' });
    } else {
      toast.error(res.error || 'Failed to delete expense', { id: 'del-expense' });
    }
  };

  const formatGHS = (val: number) => `GHS ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Add Form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Plus size={18} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Log New Expense</h3>
        </div>

        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Amount (GHS) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[80px]"
              placeholder="Optional details..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Record Expense'}
          </button>
        </form>
      </div>

      {/* Ledger */}
      <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <ReceiptText size={18} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Expense Ledger</h3>
          </div>
          
          <div className="flex-1"></div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Search description..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0B1120] border border-white/10 rounded-lg">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer w-32"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(searchQuery || filterCategory !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setFilterCategory('all'); }}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Clear filters"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th 
                  className="px-4 py-3 rounded-tl-lg cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('expense_date')}
                >
                  <div className="flex items-center gap-2">
                    Date <SortIcon field="expense_date" />
                  </div>
                </th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <SortIcon field="amount" /> Amount
                  </div>
                </th>
                <th className="px-4 py-3 rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagination.paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No expenses match your filters.
                  </td>
                </tr>
              ) : (
                pagination.paginated.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(exp.expense_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-white/10">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={exp.description}>
                      {exp.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatGHS(Number(exp.amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 size={16} />
                      </button>
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
          itemLabel="expenses"
        />
      </div>

    </div>
  );
}
