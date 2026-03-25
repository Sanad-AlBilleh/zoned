import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DistractionType } from '@/lib/types';

const EVENT_TYPE_TO_COLUMN: Record<DistractionType, string> = {
  gaze_away: 'gaze_away_count',
  tab_switch: 'tab_switch_count',
  static_page: 'static_page_count',
  afk: 'afk_count',
  noise: 'noise_event_count',
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, event_type, duration_seconds, coach_message, metadata } =
      await request.json();

    const { error: insertError } = await supabase
      .from('distraction_events')
      .insert({
        session_id,
        user_id: user.id,
        event_type,
        duration_seconds,
        coach_message,
        metadata,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const column = EVENT_TYPE_TO_COLUMN[event_type as DistractionType];
    if (column) {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single();

      if (session) {
        const record = session as Record<string, unknown>;
        const currentCount = (typeof record[column] === 'number' ? record[column] : 0) as number;
        await supabase
          .from('sessions')
          .update({ [column]: currentCount + 1 })
          .eq('id', session_id)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
