'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface FocusIndicatorProps {
  isFocused: boolean;
  streakSeconds: number;
}

function formatStreak(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function FocusIndicator({ isFocused, streakSeconds }: FocusIndicatorProps) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm"
    >
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          opacity: [1, 0.6, 1],
        }}
        transition={{
          duration: isFocused ? 2 : 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'w-3 h-3 rounded-full transition-colors duration-500',
          isFocused ? 'bg-emerald-400' : 'bg-red-400',
        )}
      />

      <span
        className={cn(
          'text-sm font-medium transition-colors duration-500',
          isFocused ? 'text-emerald-400' : 'text-red-400',
        )}
      >
        {isFocused ? 'Focused' : 'Distracted'}
      </span>

      {isFocused && streakSeconds > 0 && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-muted-foreground"
        >
          {formatStreak(streakSeconds)} streak
        </motion.span>
      )}
    </motion.div>
  );
}
