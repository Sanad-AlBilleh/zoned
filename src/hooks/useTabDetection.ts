'use client';

import { useEffect, useRef, useState } from 'react';

interface UseTabDetectionProps {
  enabled: boolean;
  onTabSwitch: (durationSeconds: number) => void;
  onStaticPage: () => void;
}

export function useTabDetection({ enabled, onTabSwitch, onStaticPage }: UseTabDetectionProps) {
  const [isTabAway, setIsTabAway] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [tabAwayDuration, setTabAwayDuration] = useState(0);
  const [idleDuration, setIdleDuration] = useState(0);

  const tabAwayStartRef = useRef<number | null>(null);
  const tabAwayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabAwayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInteractionRef = useRef(Date.now());
  const idleFiredRef = useRef(false);

  const onTabSwitchRef = useRef(onTabSwitch);
  const onStaticPageRef = useRef(onStaticPage);

  useEffect(() => { onTabSwitchRef.current = onTabSwitch; }, [onTabSwitch]);
  useEffect(() => { onStaticPageRef.current = onStaticPage; }, [onStaticPage]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const now = Date.now();
        tabAwayStartRef.current = now;
        setIsTabAway(true);

        tabAwayIntervalRef.current = setInterval(() => {
          if (tabAwayStartRef.current) {
            setTabAwayDuration(Math.floor((Date.now() - tabAwayStartRef.current) / 1000));
          }
        }, 1000);

        tabAwayTimeoutRef.current = setTimeout(() => {
          if (tabAwayStartRef.current) {
            const dur = Math.floor((Date.now() - tabAwayStartRef.current) / 1000);
            onTabSwitchRef.current(dur);
          }
        }, 10_000);
      } else {
        if (tabAwayTimeoutRef.current) {
          clearTimeout(tabAwayTimeoutRef.current);
          tabAwayTimeoutRef.current = null;
        }
        if (tabAwayIntervalRef.current) {
          clearInterval(tabAwayIntervalRef.current);
          tabAwayIntervalRef.current = null;
        }
        tabAwayStartRef.current = null;
        setIsTabAway(false);
        setTabAwayDuration(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const resetInteraction = () => {
      lastInteractionRef.current = Date.now();
      if (idleFiredRef.current) {
        idleFiredRef.current = false;
        setIsIdle(false);
        setIdleDuration(0);
      }
    };

    const interactionEvents = ['mousemove', 'scroll', 'keydown', 'click'] as const;
    interactionEvents.forEach(evt =>
      document.addEventListener(evt, resetInteraction, { passive: true }),
    );

    const idleCheckInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastInteractionRef.current) / 1000);
      if (elapsed >= 90 && !idleFiredRef.current) {
        idleFiredRef.current = true;
        setIsIdle(true);
        onStaticPageRef.current();
      }
      if (idleFiredRef.current) {
        setIdleDuration(elapsed);
      }
    }, 10_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      interactionEvents.forEach(evt =>
        document.removeEventListener(evt, resetInteraction),
      );
      clearInterval(idleCheckInterval);
      if (tabAwayTimeoutRef.current) clearTimeout(tabAwayTimeoutRef.current);
      if (tabAwayIntervalRef.current) clearInterval(tabAwayIntervalRef.current);
    };
  }, [enabled]);

  return { isTabAway, isIdle, tabAwayDuration, idleDuration };
}
