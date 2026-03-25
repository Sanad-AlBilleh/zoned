import { NextResponse } from 'next/server';
import type { CoachPersona } from '@/lib/types';

const PERSONA_DESCRIPTIONS: Record<CoachPersona, string> = {
  drill_sergeant: 'a drill sergeant — tough love, zero excuses, military-style',
  hype_coach: 'a hype coach — always positive, energetic, you got this energy',
  therapist: 'a therapist — calm, understanding, gentle nudges, empathetic',
  friend: 'a casual friend — funny, uses slang, keeps it real',
};

const FALLBACK_MESSAGES: Record<CoachPersona, string> = {
  drill_sergeant: 'Drop the distraction, soldier! Get back to work NOW!',
  hype_coach: "You're SO close to crushing it! Let's get back in the zone!",
  therapist: "It's okay — let's gently bring our attention back to the task.",
  friend: 'Yo, you got distracted again lol. Come on, back at it!',
};

export async function POST(request: Request) {
  try {
    const { distraction_type, coach_persona, task_description, session_stats } =
      await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        message: FALLBACK_MESSAGES[coach_persona as CoachPersona] ?? FALLBACK_MESSAGES.friend,
      });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();

    const personaDescription =
      PERSONA_DESCRIPTIONS[coach_persona as CoachPersona] ?? PERSONA_DESCRIPTIONS.friend;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: [
            `You are a focus coach with the personality of ${personaDescription}.`,
            `The user is working on: ${task_description}.`,
            `They just got distracted by: ${distraction_type}.`,
            `Stats so far: ${JSON.stringify(session_stats)}.`,
            'Respond with ONE short, punchy motivational line (max 15 words).',
            'Match your persona exactly. Be direct. No fluff.',
          ].join('\n'),
        },
      ],
      max_tokens: 60,
      temperature: 0.9,
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ??
      FALLBACK_MESSAGES[coach_persona as CoachPersona];

    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
