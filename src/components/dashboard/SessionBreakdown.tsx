'use client';

import { motion } from 'framer-motion';
import { Eye, AppWindow, Volume2, Moon, MonitorOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Session } from '@/lib/types';

interface EventCounts {
  gaze_away: number;
  tab_switch: number;
  noise: number;
  afk: number;
  static_page: number;
}

interface SessionBreakdownProps {
  session: Session;
  events?: EventCounts;
  delay?: number;
}

const rows = [
  { key: 'gaze_away'    as const, label: 'Gaze Away',       icon: Eye,        color: 'text-yellow-400' },
  { key: 'tab_switch'   as const, label: 'Tab Switches',    icon: AppWindow,   color: 'text-orange-400' },
  { key: 'noise'        as const, label: 'Noise Events',    icon: Volume2,    color: 'text-red-400' },
  { key: 'afk'          as const, label: 'AFK Periods',     icon: Moon,       color: 'text-blue-400' },
  { key: 'static_page'  as const, label: 'Static Page',     icon: MonitorOff, color: 'text-zinc-400' },
];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function severity(count: number) {
  if (count === 0) return 'bg-green-500/20 text-green-400';
  if (count <= 3) return 'bg-yellow-500/20 text-yellow-400';
  if (count <= 8) return 'bg-orange-500/20 text-orange-400';
  return 'bg-red-500/20 text-red-400';
}

export default function SessionBreakdown({ session, events, delay = 0 }: SessionBreakdownProps) {
  const total = session.duration_seconds ?? 0;
  const score = session.focus_score ?? 0;
  const focusSec = Math.round(total * (score / 100));
  const distractSec = total - focusSec;
  const focusPct = total > 0 ? (focusSec / total) * 100 : 0;

  const evts: EventCounts = events ?? { gaze_away: 0, tab_switch: 0, noise: 0, afk: 0, static_page: 0 };

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <h3 className="mb-4 text-lg font-semibold text-foreground">Session Breakdown</h3>

      {/* time bar */}
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Focus: {fmt(focusSec)}</span>
        <span>Distracted: {fmt(distractSec)}</span>
      </div>
      <div className="mb-5 flex h-4 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="rounded-l-full bg-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${focusPct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
        />
        <div className="flex-1 bg-red-500/60" />
      </div>

      {/* event table */}
      <div className="space-y-2">
        {rows.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <div className="flex items-center gap-2.5">
              <Icon size={16} className={color} />
              <span className="text-sm text-foreground">{label}</span>
            </div>
            <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums', severity(evts[key]))}>
              {evts[key]}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Total duration: {fmt(total)} &middot; Started{' '}
        {new Date(session.started_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })}
      </p>
    </motion.div>
  );
}
