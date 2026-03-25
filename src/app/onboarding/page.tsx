'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Flame,
  Heart,
  SmilePlus,
  ArrowRight,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';
import type { CoachPersona, ShameTone, NoiseSensitivity } from '@/lib/types';

const PERSONAS: {
  id: CoachPersona;
  title: string;
  description: string;
  icon: typeof Shield;
}[] = [
  {
    id: 'drill_sergeant',
    title: 'The Drill Sergeant',
    description: 'Tough love, zero excuses',
    icon: Shield,
  },
  {
    id: 'hype_coach',
    title: 'The Hype Coach',
    description: 'Always positive, you got this',
    icon: Flame,
  },
  {
    id: 'therapist',
    title: 'The Therapist',
    description: 'Calm, understanding, gentle nudges',
    icon: Heart,
  },
  {
    id: 'friend',
    title: 'The Friend',
    description: 'Casual, funny, uses slang',
    icon: SmilePlus,
  },
];

const SHAME_TONES: { value: ShameTone; label: string }[] = [
  { value: 'funny', label: 'Funny & Playful' },
  { value: 'strict', label: 'Strict & Direct' },
  { value: 'savage', label: 'Savage & Brutal' },
];

const NOISE_LABELS: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
};

const NOISE_MAP: Record<number, NoiseSensitivity> = {
  0: 'low',
  1: 'medium',
  2: 'high',
};

const REVERSE_NOISE_MAP: Record<NoiseSensitivity, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

interface OnboardingData {
  name: string;
  accountability_partner_name: string;
  accountability_partner_phone: string;
  shame_tone: ShameTone;
  coach_persona: CoachPersona;
  uses_phone_for_work: boolean;
  phone_grace_period_minutes: number;
  noise_sensitivity: NoiseSensitivity;
  gaze_threshold_seconds: number;
  task_description: string;
}

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    accountability_partner_name: '',
    accountability_partner_phone: '',
    shame_tone: 'funny',
    coach_persona: 'hype_coach',
    uses_phone_for_work: false,
    phone_grace_period_minutes: 3,
    noise_sensitivity: 'medium',
    gaze_threshold_seconds: 20,
    task_description: '',
  });

  const updateField = <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    if (step === 1) return formData.name.trim().length > 0;
    if (step === 4) return formData.task_description.trim().length > 0;
    return true;
  };

  const goNext = () => {
    if (!canProceed()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!canProceed()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setSaveError(authError?.message ?? 'Not authenticated. Please sign in again.');
        setSaving(false);
        return;
      }

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        name: formData.name,
        coach_persona: formData.coach_persona,
        shame_tone: formData.shame_tone,
        noise_sensitivity: formData.noise_sensitivity,
        gaze_threshold_seconds: formData.gaze_threshold_seconds,
        uses_phone_for_work: formData.uses_phone_for_work,
        phone_grace_period_seconds: formData.phone_grace_period_minutes * 60,
        accountability_partner_name:
          formData.accountability_partner_name || null,
        accountability_partner_phone:
          formData.accountability_partner_phone || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        setSaveError(`Failed to save profile: ${upsertError.message}`);
        setSaving(false);
        return;
      }

      router.push(
        `/session?task=${encodeURIComponent(formData.task_description)}`,
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Progress dots */}
      <div className="mb-12 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              s === step
                ? 'w-8 bg-primary shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                : s < step
                  ? 'w-2 bg-primary/60'
                  : 'w-2 bg-secondary',
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className="relative w-full max-w-lg overflow-hidden"
        style={{ minHeight: 420 }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full"
          >
            {step === 1 && (
              <StepIdentity formData={formData} updateField={updateField} />
            )}
            {step === 2 && (
              <StepPersona
                selected={formData.coach_persona}
                onSelect={(p) => updateField('coach_persona', p)}
              />
            )}
            {step === 3 && (
              <StepContext formData={formData} updateField={updateField} />
            )}
            {step === 4 && (
              <StepTask
                value={formData.task_description}
                onChange={(v) => updateField('task_description', v)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {saveError && (
        <div className="mt-4 w-full max-w-lg rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-4">
        {step > 1 && (
          <Button variant="ghost" size="lg" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {step < 4 ? (
          <Button
            size="lg"
            onClick={goNext}
            disabled={!canProceed()}
            className="min-w-[140px]"
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={!canProceed() || saving}
            className="min-w-[180px] bg-gradient-to-r from-primary to-purple-400 hover:from-primary/90 hover:to-purple-400/90"
          >
            {saving ? 'Starting...' : 'Start Focusing'}
            <Zap className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Identity                                                 */
/* ------------------------------------------------------------------ */

function StepIdentity({
  formData,
  updateField,
}: {
  formData: OnboardingData;
  updateField: <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Let&apos;s get to know you
        </h1>
        <p className="text-lg text-muted-foreground">
          First, some basics.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Your first name <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            placeholder="e.g. Alex"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="partner-name" className="text-sm font-medium">
            Accountability partner name
          </label>
          <Input
            id="partner-name"
            placeholder="e.g. Jordan"
            value={formData.accountability_partner_name}
            onChange={(e) =>
              updateField('accountability_partner_name', e.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="partner-phone" className="text-sm font-medium">
            Partner&apos;s WhatsApp number
          </label>
          <Input
            id="partner-phone"
            type="tel"
            placeholder="+1 234 567 8900"
            value={formData.accountability_partner_phone}
            onChange={(e) =>
              updateField('accountability_partner_phone', e.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="shame-tone" className="text-sm font-medium">
            Shame message tone
          </label>
          <select
            id="shame-tone"
            value={formData.shame_tone}
            onChange={(e) =>
              updateField('shame_tone', e.target.value as ShameTone)
            }
            className="flex h-11 w-full rounded-lg border border-input bg-secondary px-4 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SHAME_TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Coach Persona                                            */
/* ------------------------------------------------------------------ */

function StepPersona({
  selected,
  onSelect,
}: {
  selected: CoachPersona;
  onSelect: (p: CoachPersona) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Pick your coach
        </h1>
        <p className="text-lg text-muted-foreground">
          Who do you want in your corner?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PERSONAS.map((persona) => {
          const active = selected === persona.id;
          const Icon = persona.icon;
          return (
            <motion.button
              key={persona.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(persona.id)}
              className={cn(
                'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200',
                active
                  ? 'border-primary bg-primary/10 shadow-[0_0_24px_rgba(124,58,237,0.25)]'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
                  active
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{persona.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {persona.description}
                </p>
              </div>
              {active && (
                <motion.div
                  layoutId="persona-check"
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Working Context                                          */
/* ------------------------------------------------------------------ */

function StepContext({
  formData,
  updateField,
}: {
  formData: OnboardingData;
  updateField: <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) => void;
}) {
  const noiseValue = REVERSE_NOISE_MAP[formData.noise_sensitivity];

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Working context
        </h1>
        <p className="text-lg text-muted-foreground">
          Help us calibrate your focus session.
        </p>
      </div>

      <div className="space-y-6">
        {/* Phone for work */}
        <div className="space-y-3">
          <label className="group flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.uses_phone_for_work}
                onChange={(e) =>
                  updateField('uses_phone_for_work', e.target.checked)
                }
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-secondary transition-colors peer-checked:bg-primary" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm font-medium">
              I sometimes need my phone for work
            </span>
          </label>

          <AnimatePresence>
            {formData.uses_phone_for_work && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pl-14"
              >
                <Slider
                  label="Phone grace period"
                  min={1}
                  max={10}
                  value={formData.phone_grace_period_minutes}
                  onChange={(v) => updateField('phone_grace_period_minutes', v)}
                  valueLabel={(v) => `${v} min`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Slider
          label="Noise sensitivity"
          min={0}
          max={2}
          step={1}
          value={noiseValue}
          onChange={(v) => updateField('noise_sensitivity', NOISE_MAP[v])}
          valueLabel={NOISE_LABELS[noiseValue]}
        />

        <Slider
          label="Gaze-away threshold"
          min={5}
          max={60}
          step={5}
          value={formData.gaze_threshold_seconds}
          onChange={(v) => updateField('gaze_threshold_seconds', v)}
          valueLabel={(v) => `${v}s`}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Pre-session task                                         */
/* ------------------------------------------------------------------ */

function StepTask({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          What&apos;s the mission?
        </h1>
        <p className="text-lg text-muted-foreground">
          Tell your coach what you&apos;re working on today.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="task" className="text-sm font-medium">
          Today&apos;s task <span className="text-destructive">*</span>
        </label>
        <textarea
          id="task"
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Finish the API integration for the dashboard..."
          className="flex w-full rounded-lg border border-input bg-secondary px-4 py-3 text-sm text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ resize: 'none' }}
          autoFocus
        />
      </div>
    </div>
  );
}
