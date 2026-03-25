import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ShameTone } from '@/lib/types';

const TONE_DESCRIPTIONS: Record<ShameTone, string> = {
  funny: 'playful and humorous — use emojis, roast gently, keep it lighthearted',
  strict: 'formal and direct — no-nonsense, professional, firm',
  savage: 'brutal and devastating — no mercy, maximum shame, scorched earth',
};

const FALLBACK_MESSAGES: Record<ShameTone, string> = {
  funny: "🚨 Hey {{partner}}! Your buddy {{user}} is slacking off instead of working on {{task}}. Go roast them 😭",
  strict: "Notice: {{user}} has been unproductive on {{task}}. As their accountability partner, {{partner}}, please intervene.",
  savage: "{{partner}}, {{user}} completely failed at staying focused on {{task}}. Absolute disaster. Handle it.",
};

async function generateShameMessage(
  user_name: string,
  partner_name: string,
  shame_tone: ShameTone,
  task_description: string,
  distraction_stats: Record<string, unknown>,
): Promise<string> {
  const tone = shame_tone ?? 'funny';

  if (!process.env.OPENAI_API_KEY) {
    const template = FALLBACK_MESSAGES[tone] ?? FALLBACK_MESSAGES.funny;
    return template
      .replace(/\{\{user\}\}/g, user_name ?? 'Your friend')
      .replace(/\{\{partner\}\}/g, partner_name ?? 'Friend')
      .replace(/\{\{task\}\}/g, task_description ?? 'their work');
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

  return (
    completion.choices[0]?.message?.content?.trim() ??
    FALLBACK_MESSAGES[tone]
      .replace(/\{\{user\}\}/g, user_name)
      .replace(/\{\{partner\}\}/g, partner_name)
      .replace(/\{\{task\}\}/g, task_description)
  );
}

export async function POST(request: Request) {
  try {
    const {
      session_id,
      trigger_reason,
      user_name,
      partner_name,
      partner_phone,
      shame_tone,
      task_description,
      distraction_stats,
    } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shameMessage = await generateShameMessage(
      user_name,
      partner_name,
      shame_tone as ShameTone,
      task_description,
      distraction_stats ?? {},
    );

    let twilioWarning: string | null = null;

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      partner_phone
    ) {
      const twilio = (await import('twilio')).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        to: `whatsapp:${partner_phone}`,
        body: shameMessage,
      });
    } else {
      twilioWarning =
        'Twilio credentials not configured or no partner phone — message not sent via WhatsApp';
      console.warn(twilioWarning);
    }

    await supabase.from('accountability_triggers').insert({
      session_id,
      user_id: user.id,
      trigger_type: trigger_reason,
      message: shameMessage,
      sent_via: twilioWarning ? 'not_sent' : 'whatsapp',
    });

    await supabase
      .from('sessions')
      .update({ accountability_triggered: true })
      .eq('id', session_id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: shameMessage,
      ...(twilioWarning ? { warning: twilioWarning } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
