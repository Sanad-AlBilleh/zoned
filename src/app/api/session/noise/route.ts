import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, detected_type, average_db, duration_seconds } =
      await request.json();

    const { error: insertError } = await supabase
      .from('noise_events')
      .insert({
        session_id,
        user_id: user.id,
        noise_type: detected_type,
        average_db,
        duration_seconds,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('noise_event_count')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (session) {
      await supabase
        .from('sessions')
        .update({ noise_event_count: (session.noise_event_count ?? 0) + 1 })
        .eq('id', session_id)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
