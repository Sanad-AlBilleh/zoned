import { NextResponse } from 'next/server';
import type { ShameTone } from '@/lib/types';

const TONE_DESCRIPTIONS: Record<ShameTone, string> = {
  funny: 'playful and humorous — use emojis, roast gently, keep it lighthearted',
  strict: 'formal and direct — no-nonsense, professional, firm',
  savage: 'brutal and devastating — no mercy, maximum shame, scorched earth',
};

const FALLBACK_MESSAGES: Record<ShameTone, string> = {
  funny: "🚨 DISTRACTION ALERT 🚨 Your buddy {{user}} is out here browsing instead of working on {{task}}. Someone come collect them 😭💀",
  strict: "This is a formal notice: {{user}} has failed to maintain focus on their task ({{task}}). {{distraction_count}} distractions logged. Please hold them accountable.",
  savage: "{{user}} said they'd be productive working on {{task}}. They LIED. {{distraction_count}} distractions. Absolute failure. Intervene immediately.",
};

export async function POST(request: Request) {
  try {
    const { user_name, partner_name, shame_tone, task_description, distraction_stats } =
      await request.json();

    const tone = (shame_tone as ShameTone) ?? 'funny';

    if (!process.env.OPENAI_API_KEY) {
      const template = FALLBACK_MESSAGES[tone] ?? FALLBACK_MESSAGES.funny;
      const message = template
        .replace(/\{\{user\}\}/g, user_name ?? 'Your friend')
        .replace(/\{\{task\}\}/g, task_description ?? 'their work')
        .replace(/\{\{distraction_count\}\}/g, String(distraction_stats?.total_distractions ?? 'many'));

      return NextResponse.json({ message });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();

    const toneDescription = TONE_DESCRIPTIONS[tone] ?? TONE_DESCRIPTIONS.funny;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: [
            `You generate accountability shame messages. Your tone is: ${toneDescription}.`,
            `The user's name is: ${user_name}.`,
            `Their accountability partner's name is: ${partner_name}.`,
            `They were supposed to be working on: ${task_description}.`,
            `Distraction stats: ${JSON.stringify(distraction_stats)}.`,
            `Write a message TO ${partner_name} ABOUT ${user_name} getting distracted.`,
            'Keep it to 2-3 sentences max. Address the partner directly.',
            'This will be sent via WhatsApp so keep formatting simple.',
          ].join('\n'),
        },
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ??
      FALLBACK_MESSAGES[tone]
        .replace(/\{\{user\}\}/g, user_name)
        .replace(/\{\{task\}\}/g, task_description)
        .replace(/\{\{distraction_count\}\}/g, String(distraction_stats?.total_distractions ?? 'many'));

    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
