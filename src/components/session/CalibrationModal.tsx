'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

interface CalibrationModalProps {
  isOpen: boolean;
  progress: number;
}

const DOT_POSITIONS = [
  { x: 10, y: 10 },
  { x: 50, y: 10 },
  { x: 90, y: 10 },
  { x: 10, y: 50 },
  { x: 50, y: 50 },
  { x: 90, y: 50 },
  { x: 10, y: 90 },
  { x: 50, y: 90 },
  { x: 90, y: 90 },
];

export function CalibrationModal({ isOpen, progress }: CalibrationModalProps) {
  const activeIndex = Math.min(progress, 8);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
        >
          <div className="absolute inset-0">
            {DOT_POSITIONS.map((pos, i) => {
              const isActive = i === activeIndex;
              const isDone = i < progress;

              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  {isActive ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{
                        scale: [1, 1.6, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(168, 85, 247, 0.7)',
                          '0 0 30px 10px rgba(168, 85, 247, 0.3)',
                          '0 0 0 0 rgba(168, 85, 247, 0.7)',
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-6 h-6 rounded-full bg-purple-500"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full transition-colors duration-300',
                        isDone ? 'bg-purple-500/60' : 'bg-white/10',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative z-10 text-center space-y-4">
            <motion.p
              key={activeIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white/80 text-lg font-medium"
            >
              Look at the dot
            </motion.p>
            <p className="text-white/40 text-sm">
              Point {Math.min(progress + 1, 9)} of 9
            </p>
            <div className="w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
              <motion.div
                className="h-full bg-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(progress / 9) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
