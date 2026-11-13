'use client';

import { useEffect, useState } from 'react';
import type { CursorPosition, PlayerColor } from '@/lib/realtime/roomTypes';

interface LiveCursorsProps {
  remoteCursor: CursorPosition | null;
  partnerName: string;
  partnerColor?: PlayerColor;
  onSendCursor: (x: number, y: number) => void;
}

export default function LiveCursors({
  remoteCursor,
  partnerName,
  partnerColor = 'blue',
  onSendCursor,
}: LiveCursorsProps) {
  // Throttle sending cursor position
  useEffect(() => {
    let lastSent = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSent < 45) return; // ~22fps
      lastSent = now;

      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      onSendCursor(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onSendCursor]);

  if (!remoteCursor) return null;

  const isPink = partnerColor === 'pink';
  const strokeColor = isPink ? '#f472b6' : '#60a5fa';
  const badgeBg = isPink ? 'bg-pink-500 text-white' : 'bg-blue-500 text-white';

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75 ease-out"
      style={{
        left: `${remoteCursor.x}%`,
        top: `${remoteCursor.y}%`,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* SVG Cursor Pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={strokeColor}
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name Tag */}
      <div
        className={`ml-3 mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-sm ${badgeBg}`}
      >
        {partnerName}
      </div>
    </div>
  );
}

