'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

type BrainState = 'neutral' | 'cracking' | 'stressed' | 'damaged' | 'recovering' | 'thriving';
type BrainSize = 'sm' | 'md' | 'lg';

interface BrainMascotProps {
  state: BrainState;
  size?: BrainSize;
  persistent?: boolean;
}

const sizePx: Record<BrainSize, number> = { sm: 64, md: 120, lg: 180 };

const palette: Record<BrainState, { fill: string; glow: string; fold: string }> = {
  neutral:    { fill: '#f472b6', glow: 'transparent',   fold: '#ec4899' },
  cracking:   { fill: '#fbbf24', glow: 'transparent',   fold: '#d97706' },
  stressed:   { fill: '#f87171', glow: 'transparent',   fold: '#dc2626' },
  damaged:    { fill: '#6b7280', glow: 'transparent',   fold: '#4b5563' },
  recovering: { fill: '#34d399', glow: '#34d39955',     fold: '#059669' },
  thriving:   { fill: '#fbbf24', glow: '#fbbf2455',     fold: '#b45309' },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const bodyAnim: Record<BrainState, any> = {
  neutral:    { y: [0, -4, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
  cracking:   { rotate: [-1, 1, -1], transition: { repeat: Infinity, duration: 0.6, ease: 'easeInOut' } },
  stressed:   { x: [-3, 3, -3, 3, 0], transition: { repeat: Infinity, duration: 0.35 } },
  damaged:    { scale: 0.92, opacity: 0.7, transition: { duration: 0.6 } },
  recovering: { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } },
  thriving:   { y: [0, -10, 0], scale: [1, 1.07, 1], transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' } },
};

function Eyes({ state }: { state: BrainState }) {
  if (state === 'damaged') {
    return (
      <g stroke="#374151" strokeWidth={2.2} strokeLinecap="round">
        <line x1={33} y1={46} x2={41} y2={54} />
        <line x1={41} y1={46} x2={33} y2={54} />
        <line x1={59} y1={46} x2={67} y2={54} />
        <line x1={67} y1={46} x2={59} y2={54} />
      </g>
    );
  }
  if (state === 'recovering' || state === 'thriving') {
    return (
      <g stroke={state === 'thriving' ? '#92400e' : '#065f46'} strokeWidth={2.5} fill="none" strokeLinecap="round">
        <path d="M32,52 Q37,46 42,52" />
        <path d="M58,52 Q63,46 68,52" />
      </g>
    );
  }
  const r = state === 'stressed' ? 5 : 4;
  return (
    <>
      <circle cx={37} cy={50} r={r} fill="#1e1e2e" />
      <circle cx={63} cy={50} r={r} fill="#1e1e2e" />
      <circle cx={38.5} cy={48.5} r={1.3} fill="#fff" />
      <circle cx={64.5} cy={48.5} r={1.3} fill="#fff" />
      {(state === 'stressed' || state === 'cracking') && (
        <g stroke="#1e1e2e" strokeWidth={2} strokeLinecap="round">
          <line
            x1={state === 'stressed' ? 30 : 32} y1={state === 'stressed' ? 40 : 42}
            x2={44} y2={state === 'stressed' ? 42 : 44}
          />
          <line
            x1={state === 'stressed' ? 70 : 68} y1={state === 'stressed' ? 40 : 42}
            x2={56} y2={state === 'stressed' ? 42 : 44}
          />
        </g>
      )}
    </>
  );
}

function Mouth({ state }: { state: BrainState }) {
  const paths: Record<BrainState, string> = {
    neutral:    'M40,68 Q50,75 60,68',
    cracking:   'M40,70 Q50,66 60,70',
    stressed:   'M42,64 Q50,74 58,64',
    damaged:    'M40,72 Q50,67 60,72',
    recovering: 'M38,66 Q50,76 62,66',
    thriving:   'M35,64 Q50,80 65,64',
  };
  return (
    <path
      d={paths[state]}
      stroke="#1e1e2e"
      strokeWidth={2.5}
      fill={state === 'stressed' ? '#1e1e2e' : state === 'thriving' ? '#1e1e2e' : 'none'}
      strokeLinecap="round"
    />
  );
}

function CrackOverlay() {
  return (
    <g>
      <motion.path
        d="M44,18 L40,32 L46,40 L42,52"
        stroke="#78350f" strokeWidth={1.8} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      <motion.path
        d="M64,22 L67,36 L61,46"
        stroke="#78350f" strokeWidth={1.5} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
    </g>
  );
}

function SweatDrops() {
  return (
    <>
      {[{ cx: 22, cy: 34, d: 0 }, { cx: 80, cy: 30, d: 0.5 }].map((s, i) => (
        <motion.ellipse
          key={i} cx={s.cx} cy={s.cy} rx={2.2} ry={3}
          fill="#60a5fa"
          animate={{ cy: [s.cy, s.cy + 18], opacity: [0.9, 0] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: s.d }}
        />
      ))}
    </>
  );
}

function Particles() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.circle
            key={i} cx={50} cy={50} r={2.5}
            fill="#fbbf24"
            animate={{
              cx: 50 + Math.cos(angle) * 56,
              cy: 50 + Math.sin(angle) * 56,
              opacity: [1, 0],
              r: [2.5, 0.5],
            }}
            transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.28 }}
          />
        );
      })}
    </>
  );
}

function ScienceModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ type: 'spring', damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-foreground">The Science Behind Your Brain</h2>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Your <span className="text-primary font-medium">prefrontal cortex</span> (PFC) is the brain&apos;s CEO &mdash; responsible for attention, impulse control, and working memory. In people with ADHD, the PFC has lower baseline dopamine and norepinephrine activity, making it harder to sustain focus on tasks that aren&apos;t intrinsically rewarding.
          </p>
          <p>
            When you lose focus, your brain isn&apos;t broken &mdash; it&apos;s seeking stimulation. The default mode network (DMN) takes over, pulling you toward daydreaming, phone-checking, or tab-switching. This is <span className="text-primary font-medium">neurological</span>, not a character flaw.
          </p>
          <p>
            Zoned works <em>with</em> your brain chemistry. Short, structured focus sessions build dopamine momentum. External accountability triggers (nudges, shame messages) provide the stimulation your PFC craves. Over time, you&apos;re training your brain to associate focused work with reward &mdash; literally reshaping neural pathways through <span className="text-primary font-medium">neuroplasticity</span>.
          </p>
          <p>
            The brain mascot reflects your real-time focus health. A thriving brain means your PFC is firing efficiently. A stressed brain? That&apos;s your cue to take a breath, reset, and try again. No judgment &mdash; just data.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BrainMascot({ state, size = 'md', persistent = false }: BrainMascotProps) {
  const [visible, setVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const px = sizePx[size];
  const { fill, glow, fold } = palette[state];

  useEffect(() => {
    if (persistent) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [persistent]);

  const handleClick = useCallback(() => setShowModal(true), []);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="cursor-pointer select-none"
            style={{ width: px, height: px }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            onClick={handleClick}
            title="Click to learn the science"
          >
            <motion.svg
              viewBox="0 0 100 110"
              width={px}
              height={px}
              animate={bodyAnim[state]}
              style={{ filter: state === 'damaged' ? 'grayscale(40%) brightness(0.7)' : undefined }}
            >
              {/* glow */}
              {glow !== 'transparent' && (
                <ellipse cx={50} cy={55} rx={44} ry={48} fill="none" stroke={glow} strokeWidth={6} opacity={0.5} />
              )}

              {/* brain body */}
              <path
                d={`M50,12 C44,12 36,7 28,14 C20,21 15,33 14,44
                     C13,55 15,69 23,79 C29,87 39,93 48,94
                     L52,94 C61,93 71,87 77,79
                     C85,69 87,55 86,44 C85,33 80,21 72,14
                     C64,7 56,12 50,12 Z`}
                fill={fill}
              />

              {/* folds */}
              <g stroke={fold} strokeWidth={1.6} fill="none" opacity={0.5} strokeLinecap="round">
                <path d="M50,16 C49,40 51,62 50,90" />
                <path d="M22,40 Q34,47 46,40" />
                <path d="M20,58 Q34,65 46,58" />
                <path d="M26,74 Q36,80 46,74" />
                <path d="M54,40 Q66,47 78,40" />
                <path d="M54,58 Q66,65 80,58" />
                <path d="M54,74 Q64,80 76,74" />
              </g>

              {/* brain stem */}
              <path d="M46,94 Q48,103 50,106 Q52,103 54,94" fill={fill} stroke={fold} strokeWidth={1.2} />

              {/* state overlays */}
              {state === 'cracking' && <CrackOverlay />}
              {state === 'stressed' && <SweatDrops />}
              {state === 'thriving' && <Particles />}

              {/* face */}
              <Eyes state={state} />
              <Mouth state={state} />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <ScienceModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
