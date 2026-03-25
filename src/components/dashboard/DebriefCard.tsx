'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DebriefCardProps {
  text: string;
  persona: string;
  delay?: number;
}

const personaLabel: Record<string, string> = {
  drill_sergeant: 'Drill Sergeant',
  hype_coach: 'Hype Coach',
  therapist: 'Therapist',
  friend: 'Friend',
};

const personaColor: Record<string, string> = {
  drill_sergeant: 'border-red-500/40 bg-red-500/5',
  hype_coach: 'border-yellow-500/40 bg-yellow-500/5',
  therapist: 'border-blue-500/40 bg-blue-500/5',
  friend: 'border-green-500/40 bg-green-500/5',
};

const personaIcon: Record<string, string> = {
  drill_sergeant: '🫡',
  hype_coach: '🔥',
  therapist: '🧠',
  friend: '💬',
};

export default function DebriefCard({ text, persona, delay = 0 }: DebriefCardProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl border-l-4 p-5',
        personaColor[persona] ?? 'border-primary/40 bg-primary/5',
      )}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{personaIcon[persona] ?? '🤖'}</span>
        <span className="text-sm font-semibold text-foreground">
          {personaLabel[persona] ?? 'Coach'}
        </span>
        <MessageCircle size={14} className="ml-auto text-muted-foreground" />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
    </motion.div>
  );
}
