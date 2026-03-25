'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type GazeDirection = 'center' | 'left' | 'right' | 'down' | 'up';

interface UseGazeDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  gazeThresholdSeconds?: number;
  phoneGracePeriodSeconds?: number;
  usesPhoneForWork?: boolean;
  onDistraction?: (type: 'gaze_away' | 'afk') => void;
}

const LEFT_IRIS = 468;
const RIGHT_IRIS = 473;
const L_OUTER = 33;
const L_INNER = 133;
const R_INNER = 362;
const R_OUTER = 263;
const L_TOP = 159;
const L_BOT = 145;
const R_TOP = 386;
const R_BOT = 374;

export function useGazeDetection({
  videoRef,
  enabled,
  gazeThresholdSeconds = 5,
  phoneGracePeriodSeconds = 15,
  usesPhoneForWork = false,
  onDistraction,
}: UseGazeDetectionProps) {
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [gazeDirection, setGazeDirection] = useState<GazeDirection>('center');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const lookawayStartRef = useRef<number | null>(null);
  const noFaceStartRef = useRef<number | null>(null);
  const onDistractionRef = useRef(onDistraction);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const calibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onDistractionRef.current = onDistraction; }, [onDistraction]);

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    let point = 0;
    calibrationIntervalRef.current = setInterval(() => {
      point++;
      setCalibrationProgress(point);
      if (point >= 9) {
        if (calibrationIntervalRef.current) clearInterval(calibrationIntervalRef.current);
        setTimeout(() => setIsCalibrating(false), 500);
      }
    }, 1500);
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    let cancelled = false;

    async function setup() {
      const { FaceMesh } = (await import('@mediapipe/face_mesh')) as any;
      const { Camera } = (await import('@mediapipe/camera_utils')) as any;

      if (cancelled) return;

      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMeshRef.current = faceMesh;

      faceMesh.onResults((results: any) => {
        if (cancelled) return;

        const faces = results.multiFaceLandmarks;

        if (!faces || faces.length === 0) {
          if (!noFaceStartRef.current) {
            noFaceStartRef.current = Date.now();
          } else if ((Date.now() - noFaceStartRef.current) / 1000 >= 3) {
            setIsLookingAway(true);
            setGazeDirection('center');
            onDistractionRef.current?.('afk');
            noFaceStartRef.current = Date.now();
          }
          return;
        }

        noFaceStartRef.current = null;
        const lm = faces[0];

        const lIris = lm[LEFT_IRIS];
        const rIris = lm[RIGHT_IRIS];
        const lOut = lm[L_OUTER];
        const lIn = lm[L_INNER];
        const rIn = lm[R_INNER];
        const rOut = lm[R_OUTER];

        const lMinX = Math.min(lOut.x, lIn.x);
        const lMaxX = Math.max(lOut.x, lIn.x);
        const lW = lMaxX - lMinX;
        const lNx = lW > 0.001 ? ((lIris.x - lMinX) / lW) * 2 - 1 : 0;

        const rMinX = Math.min(rOut.x, rIn.x);
        const rMaxX = Math.max(rOut.x, rIn.x);
        const rW = rMaxX - rMinX;
        const rNx = rW > 0.001 ? ((rIris.x - rMinX) / rW) * 2 - 1 : 0;

        const gazeX = (lNx + rNx) / 2;

        const lTop = lm[L_TOP];
        const lBot = lm[L_BOT];
        const rTop = lm[R_TOP];
        const rBot = lm[R_BOT];

        const lH = Math.abs(lBot.y - lTop.y);
        const lNy = lH > 0.001
          ? ((lIris.y - Math.min(lTop.y, lBot.y)) / lH) * 2 - 1
          : 0;

        const rH = Math.abs(rBot.y - rTop.y);
        const rNy = rH > 0.001
          ? ((rIris.y - Math.min(rTop.y, rBot.y)) / rH) * 2 - 1
          : 0;

        const gazeY = (lNy + rNy) / 2;

        let direction: GazeDirection = 'center';
        let away = false;

        if (gazeX > 0.6) {
          direction = 'right';
          away = true;
        } else if (gazeX < -0.6) {
          direction = 'left';
          away = true;
        } else if (gazeY > 0.5) {
          direction = 'down';
          away = true;
        }

        setGazeDirection(direction);

        if (away) {
          if (!lookawayStartRef.current) {
            lookawayStartRef.current = Date.now();
          } else {
            const elapsed = (Date.now() - lookawayStartRef.current) / 1000;
            const threshold =
              direction === 'down' && usesPhoneForWork
                ? phoneGracePeriodSeconds
                : gazeThresholdSeconds;

            if (elapsed >= threshold) {
              setIsLookingAway(true);
              onDistractionRef.current?.('gaze_away');
              lookawayStartRef.current = Date.now();
            }
          }
        } else {
          lookawayStartRef.current = null;
          setIsLookingAway(false);
        }
      });

      const camera = new Camera(videoRef.current!, {
        onFrame: async () => {
          if (!cancelled && videoRef.current) {
            await faceMesh.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;

      try {
        await camera.start();
      } catch {
        /* camera permission handled upstream */
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (calibrationIntervalRef.current) clearInterval(calibrationIntervalRef.current);
      try { cameraRef.current?.stop(); } catch { /* noop */ }
      try { faceMeshRef.current?.close(); } catch { /* noop */ }
    };
  }, [enabled, videoRef, gazeThresholdSeconds, phoneGracePeriodSeconds, usesPhoneForWork]);

  return {
    isLookingAway,
    gazeDirection,
    isCalibrating,
    startCalibration,
    calibrationProgress,
  };
}
