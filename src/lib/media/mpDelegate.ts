// Which MediaPipe delegates to try, in order (faceTrack.ts, bgSegment.ts).
// A device whose GPU delegate failed is remembered for a week and goes straight to CPU.
const KEY = 'angie.mp.gpuFailedAt';
const TTL_MS = 7 * 24 * 3600e3;

export function mpDelegates(): ('GPU' | 'CPU')[] {
  if (typeof window === 'undefined') return ['CPU'];
  try {
    const at = Number(localStorage.getItem(KEY));
    if (at && Date.now() - at < TTL_MS) return ['CPU'];
  } catch {
    /* storage blocked: try both */
  }
  return ['GPU', 'CPU'];
}

export function noteGpuFailed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
}

