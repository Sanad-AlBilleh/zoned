'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Square, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useGazeDetection } from '@/hooks/useGazeDetection';
import { useAudioDetection } from '@/hooks/useAudioDetection';
import { useTabDetection } from '@/hooks/useTabDetection';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { CalibrationModal } from '@/components/session/CalibrationModal';
import { CameraPreview } from '@/components/session/CameraPreview';
import { FocusIndicator } from '@/components/session/FocusIndicator';
import { CoachBubble } from '@/components/session/CoachBubble';
import { DistractionOverlay } from '@/components/session/DistractionOverlay';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import type { Profile, DistractionType, NoiseType } from '@/lib/types';

type SessionState = 'idle' | 'active' | 'ended';

interface SessionStats {
  gazeAwayCount: number;
  tabSwitchCount: number;
  staticPageCount: number;
  afkCount: number;
  noiseEventCount: number;
}

const INITIAL_STATS: SessionStats = {
  gazeAwayCount: 0,
  tabSwitchCount: 0,
  staticPageCount: 0,
  afkCount: 0,
  noiseEventCount: 0,
};

const STAT_KEY_MAP: Record<DistractionType, keyof SessionStats> = {
  gaze_away: 'gazeAwayCount',
  tab_switch: 'tabSwitchCount',
  static_page: 'staticPageCount',
  afk: 'afkCount',
  noise: 'noiseEventCount',
};

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Core state ──────────────────────────────────────────────
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState(
    searchParams.get('task') || '',
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // ── Profile ─────────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null);

  // ── Media ───────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // ── Stats ───────────────────────────────────────────────────
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);

  // ── UI state ────────────────────────────────────────────────
  const [showOverlay, setShowOverlay] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const [showCoachBubble, setShowCoachBubble] = useState(false);
  const [debrief, setDebrief] = useState<string | null>(null);
  const [currentStreakSeconds, setCurrentStreakSeconds] = useState(0);

  // ── Stable refs (avoid stale closures in callbacks) ─────────
  const sessionIdRef = useRef<string | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const taskRef = useRef(taskDescription);
  const statsRef = useRef(stats);
  const isDistractedRef = useRef(false);

  const lastNudgeTimeRef = useRef(0);
  const accountabilityTriggeredRef = useRef(false);
  const gazeAwayTimestampsRef = useRef<number[]>([]);
  const distractedSinceRef = useRef<number | null>(null);
  const focusStreakStartRef = useRef<number | null>(null);
  const longestStreakRef = useRef(0);
  const focusSecondsRef = useRef(0);
  const distractionSecondsRef = useRef(0);

  // Sync state → refs
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { taskRef.current = taskDescription; }, [taskDescription]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // ── Load profile ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (data) {
          const p = data as Profile;
          setProfile(p);
          profileRef.current = p;
        }
      } catch { /* continue with defaults */ }
    })();
  }, []);

  // ── Cleanup media on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── handleDistraction (stable, uses refs) ───────────────────
  const handleDistraction = useCallback(async (type: DistractionType) => {
    if (!sessionIdRef.current) return;

    setStats(prev => ({
      ...prev,
      [STAT_KEY_MAP[type]]: prev[STAT_KEY_MAP[type]] + 1,
    }));

    if (type === 'gaze_away') {
      gazeAwayTimestampsRef.current.push(Date.now());
    }

    fetch('/api/session/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        event_type: type,
      }),
    }).catch(() => {});

    const now = Date.now();
    if (now - lastNudgeTimeRef.current < 30_000) return;
    lastNudgeTimeRef.current = now;

    try {
      const res = await fetch('/api/coach-nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distraction_type: type,
          coach_persona: profileRef.current?.coach_persona || 'friend',
          task_description: taskRef.current,
          session_stats: statsRef.current,
        }),
      });
      const data = await res.json();
      setCoachMessage(data.message || 'Stay focused!');
      setShowOverlay(true);
    } catch {
      setCoachMessage('Stay focused! Get back to work.');
      setShowOverlay(true);
    }
  }, []);

  // ── Thin wrappers for each detection hook ───────────────────
  const handleGazeDistraction = useCallback(
    (type: 'gaze_away' | 'afk') => { handleDistraction(type); },
    [handleDistraction],
  );

  const handleTabSwitch = useCallback(
    () => { handleDistraction('tab_switch'); },
    [handleDistraction],
  );

  const handleStaticPage = useCallback(
    () => { handleDistraction('static_page'); },
    [handleDistraction],
  );

  const handleNoiseEvent = useCallback(
    (detectedType: NoiseType) => {
      handleDistraction('noise');
      if (sessionIdRef.current) {
        fetch('/api/session/noise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            detected_type: detectedType,
            average_db: 0,
            duration_seconds: 30,
          }),
        }).catch(() => {});
      }
    },
    [handleDistraction],
  );

  // ── Trigger accountability (stable) ─────────────────────────
  const triggerAccountability = useCallback(async (reason: string) => {
    if (accountabilityTriggeredRef.current) return;
    if (!profileRef.current || !sessionIdRef.current) return;
    accountabilityTriggeredRef.current = true;

    try {
      await fetch('/api/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          trigger_reason: reason,
          user_name: profileRef.current.name || 'User',
          partner_name: profileRef.current.accountability_partner_name,
          partner_phone: profileRef.current.accountability_partner_phone,
          shame_tone: profileRef.current.shame_tone,
          task_description: taskRef.current,
          distraction_stats: statsRef.current,
        }),
      });
    } catch { /* ignore */ }
  }, []);

  // ── Detection hooks ─────────────────────────────────────────
  const isActive = sessionState === 'active';

  const gaze = useGazeDetection({
    videoRef,
    enabled: isActive,
    gazeThresholdSeconds: profile?.gaze_threshold_seconds ?? 20,
    phoneGracePeriodSeconds: profile?.phone_grace_period_seconds ?? 180,
    usesPhoneForWork: profile?.uses_phone_for_work ?? false,
    onDistraction: handleGazeDistraction,
  });

  const audio = useAudioDetection({
    enabled: isActive,
    stream: audioStream,
    noiseSensitivity: profile?.noise_sensitivity ?? 'medium',
    onNoiseEvent: handleNoiseEvent,
  });

  const tab = useTabDetection({
    enabled: isActive,
    onTabSwitch: handleTabSwitch,
    onStaticPage: handleStaticPage,
  });

  const timer = useSessionTimer({ isRunning: isActive });

  // ── Derived distracted state ────────────────────────────────
  const isDistracted =
    isActive && (gaze.isLookingAway || tab.isTabAway || tab.isIdle || showOverlay);

  // Sync distracted state → ref + accountability tracker
  useEffect(() => {
    isDistractedRef.current = isDistracted;
    if (isDistracted && !distractedSinceRef.current) {
      distractedSinceRef.current = Date.now();
    } else if (!isDistracted) {
      distractedSinceRef.current = null;
    }
  }, [isDistracted]);

  // ── Focus / distraction seconds ─────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      if (isDistractedRef.current) {
        distractionSecondsRef.current += 1;
      } else {
        focusSecondsRef.current += 1;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // ── Focus streak tracking ───────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    if (!isDistracted) {
      if (!focusStreakStartRef.current) {
        focusStreakStartRef.current = Date.now();
      }
    } else if (focusStreakStartRef.current) {
      const streak = Math.floor(
        (Date.now() - focusStreakStartRef.current) / 1000,
      );
      if (streak > longestStreakRef.current) longestStreakRef.current = streak;
      focusStreakStartRef.current = null;
    }
  }, [isDistracted, isActive]);

  // Current streak display counter
  useEffect(() => {
    if (!isActive || isDistracted) {
      setCurrentStreakSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setCurrentStreakSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isDistracted, isActive]);

  // ── Accountability check every 60 s ─────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      if (accountabilityTriggeredRef.current) return;
      const now = Date.now();

      if (distractedSinceRef.current) {
        const mins = (now - distractedSinceRef.current) / 60_000;
        if (mins >= 30) {
          triggerAccountability('30_min_distracted');
          return;
        }
      }

      const recent = gazeAwayTimestampsRef.current.filter(
        ts => now - ts < 3_600_000,
      );
      gazeAwayTimestampsRef.current = recent;
      if (recent.length >= 5) {
        triggerAccountability('5_gaze_away_60min');
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [isActive, triggerAccountability]);

  // ── Auto-calibrate after session starts ─────────────────────
  useEffect(() => {
    if (!isActive) return;
    const id = setTimeout(() => gaze.startCalibration(), 2000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── Start session ───────────────────────────────────────────
  async function startSession() {
    if (isStarting) return;
    setIsStarting(true);
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const audioOnly = new MediaStream(stream.getAudioTracks());
      setAudioStream(audioOnly);
      stream.getVideoTracks().forEach(t => t.stop());
      mediaStreamRef.current = audioOnly;

      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_description: taskDescription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSessionId(data.id);
      sessionIdRef.current = data.id;
      setSessionState('active');
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera and microphone access is required for focus tracking.'
          : err instanceof Error
            ? err.message
            : 'Failed to start session. Please try again.';
      setPermissionError(message);
    } finally {
      setIsStarting(false);
    }
  }

  // ── End session ─────────────────────────────────────────────
  async function endSession() {
    if (sessionState !== 'active' || !sessionId) return;

    // Finalise current focus streak
    if (focusStreakStartRef.current) {
      const streak = Math.floor(
        (Date.now() - focusStreakStartRef.current) / 1000,
      );
      if (streak > longestStreakRef.current) longestStreakRef.current = streak;
    }

    const longestMin = longestStreakRef.current / 60;
    const cur = statsRef.current;

    let focusScore =
      100 -
      cur.gazeAwayCount * 3 -
      cur.tabSwitchCount * 5 -
      cur.staticPageCount * 4 -
      cur.noiseEventCount * 2 -
      cur.afkCount * 8 +
      longestMin * 0.5;
    focusScore = Math.max(0, Math.min(100, Math.round(focusScore)));

    const capturedElapsed = timer.elapsedSeconds;
    const capturedId = sessionId;
    const capturedPersona = profile?.coach_persona || 'friend';
    const capturedTask = taskDescription;

    setSessionState('ended');
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());

    try {
      const [debriefRes] = await Promise.all([
        fetch('/api/coach-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: capturedId,
            coach_persona: capturedPersona,
            task_description: capturedTask,
            session_stats: {
              ...cur,
              focusScore,
              durationMinutes: Math.round(capturedElapsed / 60),
              longestFocusStreakMinutes:
                Math.round(longestMin * 10) / 10,
            },
          }),
        }),
        fetch('/api/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: capturedId,
            focus_score: focusScore,
            focus_seconds: focusSecondsRef.current,
            distraction_seconds: distractionSecondsRef.current,
            gaze_away_count: cur.gazeAwayCount,
            tab_switch_count: cur.tabSwitchCount,
            static_page_count: cur.staticPageCount,
            afk_count: cur.afkCount,
            noise_event_count: cur.noiseEventCount,
            longest_focus_streak_seconds: longestStreakRef.current,
          }),
        }),
      ]);

      const debriefData = await debriefRes.json();
      setDebrief(debriefData.debrief || 'Session complete. Great job!');
    } catch {
      setDebrief('Session complete. Great job staying focused!');
    }

    setTimeout(() => router.push('/dashboard'), 2000);
  }

  // ── Overlay / bubble handlers ───────────────────────────────
  const handleDismissOverlay = useCallback(() => {
    setShowOverlay(false);
    setShowCoachBubble(true);
  }, []);

  const handleDismissCoachBubble = useCallback(() => {
    setShowCoachBubble(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-foreground">
      {/* ─── IDLE ─────────────────────────────────────────── */}
      {sessionState === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-screen px-4"
        >
          <div className="max-w-lg w-full space-y-8 text-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Ready to Focus?
              </h1>
              <p className="text-muted-foreground">
                Stay in the zone. We&apos;ll track your focus and keep you
                accountable.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label
                htmlFor="task-input"
                className="text-sm text-muted-foreground"
              >
                What are you working on?
              </label>
              <textarea
                id="task-input"
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                placeholder="e.g., Writing my thesis chapter 3…"
                className={cn(
                  'w-full rounded-lg border border-border bg-card p-4 text-foreground',
                  'placeholder:text-muted-foreground/50 resize-none h-24',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                )}
              />
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>We&apos;ll use your camera to track eye movement</p>
              <p>and your microphone to detect background noise.</p>
            </div>

            {permissionError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-left"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{permissionError}</span>
              </motion.div>
            )}

            <button
              onClick={startSession}
              disabled={isStarting}
              className={cn(
                'inline-flex items-center gap-2 px-8 py-4 rounded-lg',
                'bg-primary text-primary-foreground font-semibold text-lg',
                'hover:opacity-90 transition-all',
                'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
                'hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Session
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── ACTIVE ───────────────────────────────────────── */}
      {sessionState === 'active' && (
        <div className="relative min-h-screen flex flex-col items-center pt-12 px-4">
          {/* Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-6"
          >
            <div className="font-mono text-6xl font-bold tracking-wider">
              {timer.formattedTime}
            </div>
          </motion.div>

          {/* Focus indicator */}
          <FocusIndicator
            isFocused={!isDistracted}
            streakSeconds={currentStreakSeconds}
          />

          {/* Task */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-1">Working on</p>
            <p className="text-lg font-medium">
              {taskDescription || 'Unnamed task'}
            </p>
          </div>

          {/* End session */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <button
              onClick={endSession}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-lg',
                'border border-border text-muted-foreground',
                'hover:bg-secondary hover:text-foreground transition-colors',
              )}
            >
              <Square className="w-4 h-4" />
              End Session
            </button>
          </div>
        </div>
      )}

      {/* ─── ENDED ────────────────────────────────────────── */}
      {sessionState === 'ended' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-screen px-4 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-8 h-8 text-primary" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">Session Complete</h1>

          {debrief && (
            <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
              {debrief}
            </p>
          )}

          <p className="text-sm text-muted-foreground animate-pulse">
            Redirecting to dashboard…
          </p>
        </motion.div>
      )}

      {/* ─── Persistent overlays ──────────────────────────── */}
      <CameraPreview videoRef={videoRef} isActive={isActive} />

      <CoachBubble
        message={coachMessage}
        persona={profile?.coach_persona || 'friend'}
        isVisible={showCoachBubble}
        onDismiss={handleDismissCoachBubble}
      />

      <DistractionOverlay
        isVisible={showOverlay}
        message={coachMessage}
        onDismiss={handleDismissOverlay}
      />

      <CalibrationModal
        isOpen={gaze.isCalibrating}
        progress={gaze.calibrationProgress}
      />
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SessionContent />
    </Suspense>
  );
}
