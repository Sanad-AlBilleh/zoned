'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CoachPersona } from '@/lib/types';

interface CoachBubbleProps {
  message: string;
  persona: CoachPersona;
  isVisible: boolean;
  onDismiss: () => void;
}

const PERSONA_COLORS: Record<CoachPersona, string> = {
  drill_sergeant: 'border-red-500/40 bg-red-500/10',
  hype_coach: 'border-amber-500/40 bg-amber-500/10',
  therapist: 'border-cyan-500/40 bg-cyan-500/10',
  friend: 'border-purple-500/40 bg-purple-500/10',
};

const PERSONA_ICON_COLORS: Record<CoachPersona, string> = {
  drill_sergeant: 'text-red-400',
  hype_coach: 'text-amber-400',
  therapist: 'text-cyan-400',
  friend: 'text-purple-400',
};

export function CoachBubble({ message, persona, isVisible, onDismiss }: CoachBubbleProps) {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-sm w-full px-4"
        >
          <div
            className={cn(
              'relative rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm',
              PERSONA_COLORS[persona],
            )}
          >
            <div className="flex items-start gap-3">
              <MessageCircle
                className={cn('w-5 h-5 mt-0.5 shrink-0', PERSONA_ICON_COLORS[persona])}
              />
              <p className="text-sm text-foreground leading-relaxed">{message}</p>
            </div>

            {/* Bubble tail */}
            <div
              className={cn(
                'absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-b border-r',
                PERSONA_COLORS[persona],
              )}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
