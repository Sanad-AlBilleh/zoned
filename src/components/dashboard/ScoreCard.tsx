'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ScoreCardProps {
  score: number;
  label?: string;
  delay?: number;
}

function scoreColor(s: number) {
  if (s >= 80) return { ring: '#a855f7', text: 'text-purple-400', bg: 'from-purple-500/20 to-amber-500/10' };
  if (s >= 60) return { ring: '#22c55e', text: 'text-green-400', bg: 'from-green-500/10 to-emerald-500/5' };
  if (s >= 40) return { ring: '#eab308', text: 'text-yellow-400', bg: 'from-yellow-500/10 to-orange-500/5' };
  return { ring: '#ef4444', text: 'text-red-400', bg: 'from-red-500/10 to-rose-500/5' };
}

export default function ScoreCard({ score, label = 'Focus Score', delay = 0 }: ScoreCardProps) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  const { ring, text, bg } = scoreColor(score);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * score));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score]);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (count / 100) * circumference;

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-br p-6',
        bg,
      )}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="relative flex items-center justify-center">
        <svg width={148} height={148} className="-rotate-90">
          <circle cx={74} cy={74} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={8} />
          <motion.circle
            cx={74} cy={74} r={radius} fill="none"
            stroke={ring} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay }}
          />
        </svg>
        <span className={cn('absolute text-5xl font-bold tabular-nums', text)}>
          {count}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{label}</p>
    </motion.div>
  );
}
