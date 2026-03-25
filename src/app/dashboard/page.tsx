import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Session } from '@/lib/types';
import BrainMascot from '@/components/BrainMascot';
import ScoreCard from '@/components/dashboard/ScoreCard';
import SessionBreakdown from '@/components/dashboard/SessionBreakdown';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import StatsGrid from '@/components/dashboard/StatsGrid';
import DebriefCard from '@/components/dashboard/DebriefCard';

function brainState(avg: number) {
  if (avg >= 80) return 'thriving' as const;
  if (avg >= 60) return 'recovering' as const;
  if (avg >= 40) return 'stressed' as const;
  return 'damaged' as const;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const uid = user.id;

  const [latestRes, weeklyRes, allTimeRes, profileRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', uid)
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),

    supabase.rpc('weekly_aggregates', { uid }),

    supabase
      .from('sessions')
      .select('duration_seconds, focus_score')
      .eq('user_id', uid),

    supabase
      .from('profiles')
      .select('current_streak_days, longest_streak_days, coach_persona')
      .eq('id', uid)
      .single(),
  ]);

  const latestSession: Session | null = latestRes.data;

  /* -- weekly data -------------------------------------------------- */
  let weeklyData: Array<{ day: string; avg_score: number; total_focus_minutes: number }> = [];

  if (weeklyRes.data && Array.isArray(weeklyRes.data)) {
    weeklyData = weeklyRes.data.map((r: any) => ({
      day: r.day,
      avg_score: Number(r.avg_score) || 0,
      total_focus_minutes: Math.round((Number(r.total_focus) || 0) / 60),
    }));
  } else {
    const { data: fallback } = await supabase
      .from('sessions')
      .select('started_at, duration_seconds, focus_score')
      .eq('user_id', uid)
      .gte('started_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('started_at', { ascending: true });

    if (fallback?.length) {
      const grouped = new Map<string, { scores: number[]; seconds: number[] }>();
      for (const s of fallback) {
        const day = s.started_at.slice(0, 10);
        const g = grouped.get(day) ?? { scores: [], seconds: [] };
        g.scores.push(s.focus_score ?? 0);
        g.seconds.push(s.duration_seconds ?? 0);
        grouped.set(day, g);
      }
      weeklyData = Array.from(grouped, ([day, g]) => ({
        day,
        avg_score: g.scores.reduce((a, b) => a + b, 0) / g.scores.length,
        total_focus_minutes: Math.round(g.seconds.reduce((a, b) => a + b, 0) / 60),
      }));
    }
  }

  /* -- all-time stats ----------------------------------------------- */
  const allSessions = allTimeRes.data ?? [];
  const totalSessions = allSessions.length;
  const lifetimeSec = allSessions.reduce((s: number, r: any) => s + (r.duration_seconds ?? 0), 0);
  const avgScore =
    totalSessions > 0
      ? allSessions.reduce((s: number, r: any) => s + (r.focus_score ?? 0), 0) / totalSessions
      : 0;

  const profile = profileRes.data as any;
  const stats = {
    lifetime_focus_hours: Math.round((lifetimeSec / 3600) * 10) / 10,
    current_streak: profile?.current_streak_days ?? 0,
    best_streak: profile?.longest_streak_days ?? 0,
    avg_score: avgScore,
    total_sessions: totalSessions,
  };

  /* -- distraction events for last session -------------------------- */
  let eventCounts = { gaze_away: 0, tab_switch: 0, noise: 0, afk: 0, static_page: 0 };
  if (latestSession) {
    const { data: evts } = await supabase
      .from('distraction_events')
      .select('event_type')
      .eq('session_id', latestSession.id);

    if (evts) {
      for (const e of evts) {
        const t = (e as Record<string, unknown>).event_type as keyof typeof eventCounts;
        if (t in eventCounts) eventCounts[t]++;
      }
    }
  }

  /* -- debrief text ------------------------------------------------- */
  const persona = profile?.coach_persona ?? 'friend';
  const debriefText = latestSession?.coach_debrief_text ?? '';

  /* -- weekly average for brain state ------------------------------- */
  const weeklyAvg =
    weeklyData.length > 0
      ? weeklyData.reduce((s, d) => s + d.avg_score, 0) / weeklyData.length
      : avgScore;

  /* ================================================================= */
  /* EMPTY STATE                                                        */
  /* ================================================================= */
  if (!latestSession) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <BrainMascot state="neutral" size="lg" persistent />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">No sessions yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Start your first focus session and watch your brain come to life with real-time analytics.
          </p>
        </div>
        <Link
          href="/session"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105"
        >
          Start Your First Session
        </Link>
      </div>
    );
  }

  /* ================================================================= */
  /* DASHBOARD                                                          */
  /* ================================================================= */
  const lastScore = latestSession.focus_score ?? 0;

  return (
    <div className="space-y-10">
      {/* A — Last Session Report Card */}
      <section>
        <h2 className="mb-5 text-xl font-bold text-foreground">Last Session Report</h2>
        <div className="grid gap-5 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_280px]">
          <div className="flex flex-col items-center gap-4">
            <ScoreCard score={lastScore} delay={0} />
            <BrainMascot state={brainState(lastScore)} size="sm" persistent />
          </div>
          <SessionBreakdown session={latestSession} events={eventCounts} delay={0.1} />
          {debriefText && (
            <DebriefCard text={debriefText} persona={persona} delay={0.2} />
          )}
        </div>
      </section>

      {/* B — Weekly Chart */}
      {weeklyData.length > 0 && (
        <section>
          <WeeklyChart data={weeklyData} delay={0.25} />
        </section>
      )}

      {/* C — All-Time Stats */}
      <section>
        <StatsGrid stats={stats} delay={0.35} />
      </section>

      {/* D — Weekly Brain Mascot */}
      <section className="flex flex-col items-center gap-3 pt-4">
        <BrainMascot state={brainState(weeklyAvg)} size="lg" persistent />
        <p className="text-sm text-muted-foreground">
          Your weekly brain health &middot; {Math.round(weeklyAvg)} avg score
        </p>
      </section>
    </div>
  );
}
