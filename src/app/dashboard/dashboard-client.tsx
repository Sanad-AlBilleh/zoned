'use client';

import { motion } from 'framer-motion';
import type { Session } from '@/lib/types';
import BrainMascot from '@/components/BrainMascot';
import ScoreCard from '@/components/dashboard/ScoreCard';
import SessionBreakdown from '@/components/dashboard/SessionBreakdown';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import StatsGrid from '@/components/dashboard/StatsGrid';
import DebriefCard from '@/components/dashboard/DebriefCard';

interface DashboardClientProps {
  latestSession: Session;
  distractionCounts: {
    gaze_away: number;
    tab_switch: number;
    noise: number;
    afk: number;
    static_page: number;
  };
  weeklyData: Array<{
    day: string;
    avg_score: number;
    total_focus_minutes: number;
  }>;
  stats: {
    lifetime_focus_hours: number;
    current_streak: number;
    best_streak: number;
    avg_score: number;
    total_sessions: number;
  };
  debriefText: string | null;
  coachPersona: string;
}

function getBrainState(avgScore: number) {
  if (avgScore >= 80) return 'thriving' as const;
  if (avgScore >= 60) return 'recovering' as const;
  if (avgScore >= 40) return 'stressed' as const;
  return 'damaged' as const;
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function DashboardClient({
  latestSession,
  distractionCounts,
  weeklyData,
  stats,
  debriefText,
  coachPersona,
}: DashboardClientProps) {
  const latestScore = latestSession.focus_score ?? 0;
  const brainState = getBrainState(stats.avg_score);

  return (
    <motion.div
      className="space-y-8"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Section A: Last Session Report Card */}
      <motion.section variants={fadeUp}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Last Session</h2>

        <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr]">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
            <ScoreCard score={latestScore} label="Focus Score" />

            <div className="flex items-center justify-center md:self-center">
              <BrainMascot
                state={latestScore >= 80 ? 'thriving' : latestScore >= 60 ? 'recovering' : latestScore >= 40 ? 'cracking' : latestScore >= 20 ? 'stressed' : 'damaged'}
                size="lg"
              />
            </div>
          </div>

          <SessionBreakdown
            session={latestSession}
            events={distractionCounts}
          />

          {debriefText && (
            <DebriefCard text={debriefText} persona={coachPersona} />
          )}
        </div>
      </motion.section>

      {/* Section B: Weekly Chart */}
      <motion.section variants={fadeUp}>
        <WeeklyChart data={weeklyData} />
      </motion.section>

      {/* Section C: All-Time Stats */}
      <motion.section variants={fadeUp}>
        <StatsGrid stats={stats} />
      </motion.section>

      {/* Section D: Overall Brain State */}
      <motion.section variants={fadeUp} className="flex flex-col items-center rounded-xl border border-border bg-card p-8">
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          Your 7-Day Brain Health
        </p>
        <BrainMascot state={brainState} size="lg" />
        <p className="mt-4 text-sm text-muted-foreground capitalize">{brainState}</p>
      </motion.section>
    </motion.div>
  );
}
