'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentPerformanceTab } from './AgentPerformanceTab';
import { FinancialAgingTab } from './FinancialAgingTab';
import { ProfitLossTab } from './ProfitLossTab';
import { ExpenseLedgerTab } from './ExpenseLedgerTab';
import { Users, AlertTriangle, TrendingUp, ReceiptText } from 'lucide-react';

interface ReportsTabsProps {
  users: any[];
  payments: any[];
  devices: any[];
  expenses: any[];
}

type TabId = 'agent_performance' | 'financial_aging' | 'profit_loss' | 'expenses';

export function ReportsTabs({ users, payments, devices, expenses }: ReportsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profit_loss');

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'profit_loss', label: 'Financial Performance', icon: TrendingUp },
    { id: 'expenses', label: 'Expense Ledger', icon: ReceiptText },
    { id: 'financial_aging', label: 'Financial Aging & Delinquency', icon: AlertTriangle },
    { id: 'agent_performance', label: 'Field Agent Performance', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-sidebar-border overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="reportsTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'agent_performance' && (
            <motion.div
              key="agent_performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AgentPerformanceTab users={users} payments={payments} />
            </motion.div>
          )}

          {activeTab === 'financial_aging' && (
            <motion.div
              key="financial_aging"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FinancialAgingTab devices={devices} />
            </motion.div>
          )}

          {activeTab === 'profit_loss' && (
            <motion.div
              key="profit_loss"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfitLossTab payments={payments} expenses={expenses} devices={devices} />
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ExpenseLedgerTab expenses={expenses} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
