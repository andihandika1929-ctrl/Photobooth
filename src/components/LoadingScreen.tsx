'use client';

import { useEffect, useState } from 'react';
import { Aperture } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
  message?: string;
}

export default function LoadingScreen({
  onComplete,
  message = 'Developing your memories...',
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      // Smooth increment guaranteeing arrival at 100% in ~1.2s
      const step = current < 60 ? 4 : current < 90 ? 3 : 2;
      current += step;

      if (current >= 100) {
        current = 100;
        setProgress(100);
        clearInterval(interval);
        setPhase('ready');
        setTimeout(() => {
          onComplete();
        }, 350);
      } else {
        setProgress(current);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDFBF7] text-zinc-900 p-4">
      {/* Subtle dot-matrix pattern */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #C4B99A 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Shutter Icon with Animated Glow */}
        <div className="relative mb-6">
          <div
            className={`w-20 h-20 rounded-full border border-zinc-300 bg-white shadow-md flex items-center justify-center transition-transform duration-700 ${
              phase === 'loading' ? 'animate-spin-slow' : 'scale-105'
            }`}
          >
            <Aperture size={36} className="text-zinc-800" />
          </div>

          {/* Developing pulse rings */}
          {phase === 'loading' && (
            <>
              <div className="absolute -inset-3 rounded-full border border-zinc-400/20 animate-ping pointer-events-none" />
              <div className="absolute -inset-6 rounded-full border border-zinc-400/10 pointer-events-none" />
            </>
          )}
        </div>

        {/* Status Text */}
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-zinc-800 mb-1">
          {phase === 'loading' ? message : 'Memories Ready!'}
        </h2>
        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-6">
          HaloLuna • gethaloluna.com
        </p>

        {/* Sleek Progress Bar */}
        <div className="w-56 h-2 bg-zinc-200 rounded-full overflow-hidden p-0.5 border border-zinc-300/80 shadow-inner">
          <div
            className="h-full bg-zinc-900 rounded-full transition-all duration-75 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Numeric percentage */}
        <p className="text-xs font-mono font-bold text-zinc-700 mt-2.5">
          {progress}%
        </p>
      </div>
    </div>
  );
}
