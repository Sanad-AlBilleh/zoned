'use client';

import { motion } from 'framer-motion';
import { Clock, Flame, Trophy, Target, Hash } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Stats {
  lifetime_focus_hours: number;
  current_streak: number;
  best_streak: number;
  avg_score: number;
  total_sessions: number;
}

interface StatsGridProps {
  stats: Stats;
  delay?: number;
}

const cards: Array<{
  key: keyof Stats;
  label: string;
  icon: typeof Clock;
  color: string;
  format: (v: number, stats: Stats) => string;
}> = [
  {
    key: 'lifetime_focus_hours',
    label: 'Total Focus Hours',
    icon: Clock,
    color: 'text-purple-400',
    format: (v) => v.toFixed(1),
  },
  {
    key: 'current_streak',
    label: 'Current Streak',
    icon: Flame,
    color: 'text-orange-400',
    format: (v, s) => `${v}d${s.current_streak > 3 ? ' 🔥' : ''}`,
  },
  {
    key: 'best_streak',
    label: 'Best Streak',
    icon: Trophy,
    color: 'text-yellow-400',
    format: (v) => `${v}d`,
  },
  {
    key: 'avg_score',
    label: 'Avg Focus Score',
    icon: Target,
    color: 'text-green-400',
    format: (v) => Math.round(v).toString(),
  },
  {
    key: 'total_sessions',
    label: 'Total Sessions',
    icon: Hash,
    color: 'text-blue-400',
    format: (v) => v.toString(),
  },
];

export default function StatsGrid({ stats, delay = 0 }: StatsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <h3 className="mb-4 text-lg font-semibold text-foreground">All-Time Stats</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ key, label, icon: Icon, color, format }, i) => (
          <motion.div
            key={key}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: delay + i * 0.07 }}
          >
            <Icon size={22} className={cn(color)} />
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {format(stats[key], stats)}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
