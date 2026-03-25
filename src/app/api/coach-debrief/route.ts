import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CoachPersona } from '@/lib/types';

const PERSONA_DESCRIPTIONS: Record<CoachPersona, string> = {
  drill_sergeant: 'a drill sergeant — tough love, zero excuses, military-style',
  hype_coach: 'a hype coach — always positive, energetic, you got this energy',
  therapist: 'a therapist — calm, understanding, gentle nudges, empathetic',
  friend: 'a casual friend — funny, uses slang, keeps it real',
};

const FALLBACK_DEBRIEFS: Record<CoachPersona, string> = {
  drill_sergeant:
    'Session complete, soldier. You showed up and that counts. Review your distraction count — we need that number lower next time. No excuses tomorrow. Dismissed.',
  hype_coach:
    "You DID it! Another session in the books! Every minute of focus is a WIN. Keep that momentum going — you're building something amazing here!",
  therapist:
    "Thank you for showing up today. Every session is a step forward, regardless of the numbers. Notice what distracted you without judgment — that awareness itself is progress.",
  friend:
    "Ay good stuff, you actually sat down and did the thing. Some distractions here and there but honestly who doesn't? See you next session, let's keep it going.",
};

export async function POST(request: Request) {
  try {
    const { session_id, coach_persona, task_description, session_stats } =
      await request.json();

    const persona = (coach_persona as CoachPersona) ?? 'friend';

    if (!process.env.OPENAI_API_KEY) {
      const fallback = FALLBACK_DEBRIEFS[persona] ?? FALLBACK_DEBRIEFS.friend;

      if (session_id) {
        const supabase = await createClient();
        await supabase
          .from('sessions')
          .update({ coach_debrief_text: fallback })
          .eq('id', session_id);
      }

      return NextResponse.json({ debrief: fallback });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();

    const personaDescription =
      PERSONA_DESCRIPTIONS[persona] ?? PERSONA_DESCRIPTIONS.friend;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: [
            `You are a focus coach with the personality of ${personaDescription}.`,
            `The user just finished a focus session working on: ${task_description}.`,
            `Session stats: ${JSON.stringify(session_stats)}.`,
            'Give a personalized 3-5 sentence debrief of their session.',
            'Reference specific stats. Match your persona exactly.',
            'End with a forward-looking statement about their next session.',
          ].join('\n'),
        },
      ],
      max_tokens: 250,
      temperature: 0.8,
    });

    const debrief =
      completion.choices[0]?.message?.content?.trim() ??
      FALLBACK_DEBRIEFS[persona];

    if (session_id) {
      const supabase = await createClient();
      await supabase
        .from('sessions')
        .update({ coach_debrief_text: debrief })
        .eq('id', session_id);
    }

    return NextResponse.json({ debrief });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
