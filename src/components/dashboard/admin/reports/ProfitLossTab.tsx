'use client';

import { useState, useMemo } from 'react';
import { Printer, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, parseISO, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProfitLossTabProps {
  payments: any[];
  expenses: any[];
  devices?: any[];
}

type FilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year';

export function ProfitLossTab({ payments, expenses, devices = [] }: ProfitLossTabProps) {
  const [filter, setFilter] = useState<FilterType>('month');

  // Filter data
  const filteredData = useMemo(() => {
    const filterFn = (dateStr: string) => {
      if (filter === 'all') return true;
      const d = new Date(dateStr);
      switch (filter) {
        case 'today': return isToday(d);
        case 'yesterday': return isYesterday(d);
        case 'week': return isThisWeek(d);
        case 'month': return isThisMonth(d);
        case 'year': return isThisYear(d);
        default: return true;
      }
    };

    const filteredPayments = payments.filter(p => filterFn(p.created_at));
    const filteredExpenses = expenses.filter(e => filterFn(e.expense_date));
    const filteredDevices = devices.filter(d => filterFn(d.created_at));

    // Aggregate values
    const totalIncome = filteredPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
    const operatingExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const deviceCosts = filteredDevices.reduce((acc, d) => acc + Number(d.base_price || 0), 0);
    const totalExpenses = operatingExpenses + deviceCosts;
    
    const netProfit = totalIncome - totalExpenses;
    
    const estimatedIncome = filteredDevices.reduce((acc, d) => acc + Number(d.total_owed || 0), 0);
    const estimatedProfit = estimatedIncome - totalExpenses;

    // Build chart data (group by day or month)
    const chartMap: Record<string, { date: string; income: number; expenses: number }> = {};
    
    // Determine format string based on filter
    const fmtString = filter === 'year' || filter === 'all' ? 'MMM yyyy' : 'MMM dd';

    filteredPayments.forEach(p => {
      const key = format(new Date(p.created_at), fmtString);
      if (!chartMap[key]) chartMap[key] = { date: key, income: 0, expenses: 0 };
      chartMap[key].income += Number(p.amount_paid || 0);
    });

    filteredExpenses.forEach(e => {
      const key = format(new Date(e.expense_date), fmtString);
      if (!chartMap[key]) chartMap[key] = { date: key, income: 0, expenses: 0 };
      chartMap[key].expenses += Number(e.amount || 0);
    });

    filteredDevices.forEach(d => {
      const key = format(new Date(d.created_at), fmtString);
      if (!chartMap[key]) chartMap[key] = { date: key, income: 0, expenses: 0 };
      chartMap[key].expenses += Number(d.base_price || 0);
    });

    // Sort chart data chronologically
    const chartData = Object.values(chartMap).sort((a, b) => {
      // Very naive sort by string if it's MMM dd, better to parse but this is simple for UI
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return { totalIncome, totalExpenses, netProfit, estimatedProfit, chartData };
  }, [payments, expenses, devices, filter]);

  const { totalIncome, totalExpenses, netProfit, estimatedProfit, chartData } = filteredData;

  const formatGHS = (val: number) => `GHS ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const reportTitle = {
    all: 'All-Time',
    today: 'Daily',
    yesterday: "Yesterday's",
    week: 'Weekly',
    month: 'Monthly',
    year: 'Annual'
  }[filter] || 'Monthly';

  const handlePrint = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`Credifon ${reportTitle} Financial Report`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Company Info right aligned
    doc.setFontSize(10);
    doc.text("Credifon Financial Systems", pageWidth - 14, 22, { align: "right" });
    doc.text("Accra, Ghana", pageWidth - 14, 28, { align: "right" });
    
    // Line separator
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(14, 35, pageWidth - 14, 35);
    
    // Summary Data
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Financial Breakdown", 14, 45);
    
    autoTable(doc, {
      startY: 50,
      theme: 'plain',
      styles: { fontSize: 12, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      body: [
        ['Total Income (Payments Received)', formatGHS(totalIncome)],
        ['Total Operating Expenses', formatGHS(totalExpenses)],
        ['Estimated Profit (Expected Revenue - Expenses)', formatGHS(estimatedProfit)],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Net profit background
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(14, finalY, pageWidth - 28, 14, 'F');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("Net Profit", 18, finalY + 9);
    doc.text(formatGHS(netProfit), pageWidth - 18, finalY + 9, { align: "right" });
    
    // Chart Data Table
    if (chartData.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Trend Data", 14, finalY + 30);
      
      const tableData = chartData.map(d => [d.date, formatGHS(d.income), formatGHS(d.expenses)]);
      
      autoTable(doc, {
        startY: finalY + 35,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        head: [['Period', 'Income', 'Expenses']],
        body: tableData,
      });
    }
    
    // Signature Area
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.line(14, pageHeight - 30, pageWidth - 14, pageHeight - 30);
    doc.text("AUTHORIZED SIGNATURE: _______________________", 14, pageHeight - 20);
    doc.text("DATE: _______________________", pageWidth - 14, pageHeight - 20, { align: "right" });
    
    doc.save(`Credifon_${reportTitle}_Financial_Report.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="bg-transparent text-white text-sm focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Printer size={16} />
          Generate Report
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-emerald-400" />
            <p className="text-sm font-medium text-slate-400">Total Income (Payments)</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatGHS(totalIncome)}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={20} className="text-red-400" />
            <p className="text-sm font-medium text-slate-400">Total Expenses</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatGHS(totalExpenses)}</p>
        </div>

        <div className={`border rounded-2xl p-6 ${netProfit >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} className={netProfit >= 0 ? 'text-blue-400' : 'text-red-400'} />
            <p className="text-sm font-medium text-slate-400">Realized Profit</p>
          </div>
          <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {formatGHS(netProfit)}
          </p>
        </div>

        <div className={`border rounded-2xl p-6 ${estimatedProfit >= 0 ? 'bg-purple-500/10 border-purple-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} className={estimatedProfit >= 0 ? 'text-purple-400' : 'text-orange-400'} />
            <p className="text-sm font-medium text-slate-400">Estimated Profit</p>
          </div>
          <p className={`text-3xl font-bold ${estimatedProfit >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
            {formatGHS(estimatedProfit)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-semibold text-white mb-6">Income vs Expenses Trend</h3>
        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `GH₵${val}`}
                />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Income"
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Expenses"
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              No financial data available for this period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
