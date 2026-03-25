'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Flame,
  Heart,
  SmilePlus,
  Save,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface SettingsData {
  name: string;
  accountability_partner_name: string;
  accountability_partner_phone: string;
  shame_tone: ShameTone;
  coach_persona: CoachPersona;
  uses_phone_for_work: boolean;
  phone_grace_period_minutes: number;
  noise_sensitivity: NoiseSensitivity;
  gaze_threshold_seconds: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formData, setFormData] = useState<SettingsData>({
    name: '',
    accountability_partner_name: '',
    accountability_partner_phone: '',
    shame_tone: 'funny',
    coach_persona: 'hype_coach',
    uses_phone_for_work: false,
    phone_grace_period_minutes: 3,
    noise_sensitivity: 'medium',
    gaze_threshold_seconds: 20,
  });

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        const p = profile as Record<string, unknown>;
        setFormData({
          name: (p.name as string) ?? '',
          accountability_partner_name:
            (p.accountability_partner_name as string) ?? '',
          accountability_partner_phone:
            (p.accountability_partner_phone as string) ?? '',
          shame_tone: (p.shame_tone as ShameTone) ?? 'funny',
          coach_persona: (p.coach_persona as CoachPersona) ?? 'hype_coach',
          uses_phone_for_work: (p.uses_phone_for_work as boolean) ?? false,
          phone_grace_period_minutes: Math.round(((p.phone_grace_period_seconds as number) ?? 180) / 60),
          noise_sensitivity: (p.noise_sensitivity as NoiseSensitivity) ?? 'medium',
          gaze_threshold_seconds: (p.gaze_threshold_seconds as number) ?? 20,
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const updateField = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('profiles').upsert({
        id: user.id,
        name: formData.name || '',
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
        updated_at: new Date().toISOString(),
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const noiseValue = REVERSE_NOISE_MAP[formData.noise_sensitivity];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Success toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white shadow-lg shadow-primary/20"
          >
            <CheckCircle className="h-4 w-4" />
            Settings saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus Calibration */}
      <Card>
        <CardHeader>
          <CardTitle>Focus Calibration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Slider
            label="Gaze-away threshold"
            min={5}
            max={60}
            step={5}
            value={formData.gaze_threshold_seconds}
            onChange={(v) => updateField('gaze_threshold_seconds', v)}
            valueLabel={(v) => `${v}s`}
          />

          <Slider
            label="Noise sensitivity"
            min={0}
            max={2}
            step={1}
            value={noiseValue}
            onChange={(v) => updateField('noise_sensitivity', NOISE_MAP[v])}
            valueLabel={NOISE_LABELS[noiseValue]}
          />

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
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
        </CardContent>
      </Card>

      {/* Accountability */}
      <Card>
        <CardHeader>
          <CardTitle>Accountability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="s-partner-name" className="text-sm font-medium">
              Partner name
            </label>
            <Input
              id="s-partner-name"
              value={formData.accountability_partner_name}
              onChange={(e) =>
                updateField('accountability_partner_name', e.target.value)
              }
              placeholder="e.g. Jordan"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="s-partner-phone" className="text-sm font-medium">
              Partner WhatsApp number
            </label>
            <Input
              id="s-partner-phone"
              type="tel"
              value={formData.accountability_partner_phone}
              onChange={(e) =>
                updateField('accountability_partner_phone', e.target.value)
              }
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="s-shame-tone" className="text-sm font-medium">
              Shame message tone
            </label>
            <select
              id="s-shame-tone"
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
        </CardContent>
      </Card>

      {/* Coach Persona */}
      <Card>
        <CardHeader>
          <CardTitle>Coach Persona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {PERSONAS.map((persona) => {
              const active = formData.coach_persona === persona.id;
              const Icon = persona.icon;
              return (
                <motion.button
                  key={persona.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => updateField('coach_persona', persona.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all duration-200',
                    active
                      ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                      : 'border-border bg-card hover:border-primary/40',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
                      active
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{persona.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {persona.description}
                    </p>
                  </div>
                  {active && (
                    <motion.div
                      layoutId="settings-persona-check"
                      className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary"
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
