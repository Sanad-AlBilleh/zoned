'use client';

import { useState } from 'react';
import { Minimize2, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
}

export function CameraPreview({ videoRef, isActive }: CameraPreviewProps) {
  const [minimized, setMinimized] = useState(false);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-40 rounded-lg overflow-hidden',
        'transition-all duration-500 ease-in-out',
        isActive
          ? minimized
            ? 'w-10 h-10 border border-border bg-card cursor-pointer'
            : 'w-40 h-[120px] border border-border/50 bg-card shadow-lg shadow-black/40'
          : 'w-px h-px opacity-0 pointer-events-none',
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {isActive && !minimized && (
        <>
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded select-none">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <button
            onClick={() => setMinimized(true)}
            className="absolute top-1 right-1 p-1 rounded bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </>
      )}

      {isActive && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="absolute inset-0 flex items-center justify-center bg-card hover:bg-secondary transition-colors"
        >
          <Video className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <VideoOff className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
