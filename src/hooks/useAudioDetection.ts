'use client';

import { useEffect, useRef, useState } from 'react';
import type { NoiseSensitivity, NoiseType } from '@/lib/types';

interface UseAudioDetectionProps {
  enabled: boolean;
  stream: MediaStream | null;
  noiseSensitivity: NoiseSensitivity;
  onNoiseEvent: (noiseType: NoiseType) => void;
}

const THRESHOLDS: Record<NoiseSensitivity, number> = {
  low: 180,
  medium: 140,
  high: 100,
};

function classifyNoise(data: Uint8Array): NoiseType {
  const voiceBand = data.slice(14, 140);
  const voiceAvg = voiceBand.reduce((a, b) => a + b, 0) / (voiceBand.length || 1);
  const fullAvg = data.reduce((a, b) => a + b, 0) / (data.length || 1);
  const voiceRatio = fullAvg > 0 ? voiceAvg / fullAvg : 0;

  if (voiceRatio > 2.0) {
    return Math.random() > 0.5 ? 'crowd' : 'tv';
  }

  const bassBand = data.slice(0, 14);
  const bassAvg = bassBand.reduce((a, b) => a + b, 0) / (bassBand.length || 1);
  if (bassAvg > voiceAvg * 1.5) {
    return 'music';
  }

  return 'general_noise';
}

export function useAudioDetection({
  enabled,
  stream,
  noiseSensitivity,
  onNoiseEvent,
}: UseAudioDetectionProps) {
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isNoisy, setIsNoisy] = useState(false);
  const [noiseType, setNoiseType] = useState<NoiseType | null>(null);

  const onNoiseEventRef = useRef(onNoiseEvent);
  const sensitivityRef = useRef(noiseSensitivity);
  const consecutiveNoisyRef = useRef(0);

  useEffect(() => { onNoiseEventRef.current = onNoiseEvent; }, [onNoiseEvent]);
  useEffect(() => { sensitivityRef.current = noiseSensitivity; }, [noiseSensitivity]);

  useEffect(() => {
    if (!enabled || !stream) return;

    let audioCtx: AudioContext;
    let intervalId: ReturnType<typeof setInterval>;

    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalId = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / (dataArray.length || 1);
        setCurrentVolume(Math.round(avg));

        const threshold = THRESHOLDS[sensitivityRef.current];

        if (avg > threshold) {
          consecutiveNoisyRef.current++;
          setIsNoisy(true);

          if (consecutiveNoisyRef.current >= 3) {
            const detected = classifyNoise(dataArray);
            setNoiseType(detected);
            onNoiseEventRef.current(detected);
            consecutiveNoisyRef.current = 0;
          }
        } else {
          consecutiveNoisyRef.current = 0;
          setIsNoisy(false);
          setNoiseType(null);
        }
      }, 10_000);
    } catch {
      return;
    }

    return () => {
      clearInterval(intervalId);
      audioCtx?.close().catch(() => {});
    };
  }, [enabled, stream]);

  return { currentVolume, isNoisy, noiseType };
}
