import confetti from 'canvas-confetti';

/**
 * Studio celebration confetti effect
 * Fires multi-cannon bursts from left, right, and center for high-energy visual feedback
 */
export function fireCelebrationConfetti(): void {
  if (typeof window === 'undefined') return;
  try {
    // Cannon from bottom-left
    confetti({
      particleCount: 55,
      angle: 60,
      spread: 60,
      origin: { x: 0.15, y: 0.7 },
      colors: ['#FF6B8B', '#FFD166', '#06D6A0', '#118AB2', '#9D4EDD'],
      disableForReducedMotion: true,
    });

    // Cannon from bottom-right
    confetti({
      particleCount: 55,
      angle: 120,
      spread: 60,
      origin: { x: 0.85, y: 0.7 },
      colors: ['#FF6B8B', '#FFD166', '#06D6A0', '#118AB2', '#9D4EDD'],
      disableForReducedMotion: true,
    });

    // Central starburst explosion shortly after
    setTimeout(() => {
      confetti({
        particleCount: 75,
        spread: 100,
        origin: { x: 0.5, y: 0.55 },
        colors: ['#FFD700', '#FF69B4', '#00CED1', '#FFA500', '#FF3B30'],
        disableForReducedMotion: true,
      });
    }, 220);
  } catch (err) {
    console.warn('[HaloLuna] Confetti error:', err);
  }
}
