import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      session_id,
      focus_score,
      focus_seconds,
      distraction_seconds,
      gaze_away_count,
      tab_switch_count,
      static_page_count,
      afk_count,
      noise_event_count,
      longest_focus_streak_seconds,
    } = await request.json();

    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('started_at')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const now = new Date();
    const startedAt = new Date(session.started_at);
    const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
        focus_score,
        focus_seconds,
        distraction_seconds,
        gaze_away_count,
        tab_switch_count,
        static_page_count,
        afk_count,
        noise_event_count,
        longest_focus_streak_seconds,
      })
      .eq('id', session_id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_session_date, current_streak_days, longest_streak_days')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = profile.current_streak_days ?? 0;

    if (profile.last_session_date === todayStr) {
      // Already counted today, no change
    } else if (profile.last_session_date === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, profile.longest_streak_days ?? 0);

    const { error: streakError } = await supabase
      .from('profiles')
      .update({
        current_streak_days: newStreak,
        longest_streak_days: longestStreak,
        last_session_date: todayStr,
      })
      .eq('user_id', user.id);

    if (streakError) {
      return NextResponse.json({ error: streakError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
