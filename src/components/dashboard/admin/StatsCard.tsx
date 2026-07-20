'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
}

export function StatsCard({
  label,
  value,
  isCurrency = false,
  isPercentage = false,
  trend,
  trendLabel,
  icon,
  iconBg,
  delay = 0,
}: StatsCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(value, 'GHS').replace('GHS', 'GH₵')
    : isPercentage
    ? `${value.toFixed(1)}%`
    : value.toLocaleString();

  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="bg-[#111827] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', iconBg)}>
        {icon}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-white tabular-nums truncate" title={displayValue}>{displayValue}</p>
        <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
        {trend && trendLabel && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-semibold', trendColors[trend])}>
            <TrendIcon size={12} />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
