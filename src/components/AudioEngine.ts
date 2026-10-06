/**
 * AudioEngine.ts — Web Audio API synthesized sounds for photobooth
 * Effects are procedurally generated. The optional ambient bed is the only
 * external file, and nothing ever starts without a user gesture.
 *
 * Every voice is routed through a master bus, so one toggle silences the booth
 * and the overall level stays gentle rather than startling.
 */

/** Master level for the procedural effects. Deliberately soft. */
const SFX_VOLUME = 0.32;
/** Background bed, if a file is added later, stays barely audible. */
const AMBIENT_VOLUME = 0.1;
/** Ambient never auto-plays — guests found it disruptive. */
const AMBIENT_AUTOPLAY = false;
/** Placeholder path. Absent files fail silently. */
const AMBIENT_SRC = '/audio/chill.mp3';
const MUTE_KEY = 'haloluna:muted';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted: boolean | null = null;
let ambient: HTMLAudioElement | null = null;
let ambientAvailable = true;

export function getMuted(): boolean {
  if (muted === null) {
    muted = false;
    if (typeof window !== 'undefined') {
      try {
        muted = window.localStorage.getItem(MUTE_KEY) === '1';
      } catch {
        // Storage blocked (private mode) — fall back to audible
      }
    }
  }
  return muted;
}

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioCtxClass =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : AudioContext;
    audioCtx = new AudioCtxClass();
    masterGain = null;
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Shared output bus — connect every voice here, never to ctx.destination. */
function getBus(): GainNode {
  const ctx = getAudioContext();
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
  }
  masterGain.gain.value = getMuted() ? 0 : SFX_VOLUME;
  return masterGain;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {
      // Ignore storage failures — the in-memory flag still applies
    }
  }
  if (masterGain) {
    masterGain.gain.value = next ? 0 : SFX_VOLUME;
  }
  if (next) {
    stopAmbient();
  }
}

/** Flips mute and returns the new state. Safe to call from a click handler. */
export function toggleMuted(): boolean {
  const next = !getMuted();
  setMuted(next);
  return next;
}

/**
 * Start the low background bed. No-ops when muted, when the browser still
 * wants a gesture, or when no audio file has been added to /public/audio.
 */
export function startAmbient(): void {
  if (!AMBIENT_AUTOPLAY) return;
  if (typeof window === 'undefined' || !ambientAvailable || getMuted()) return;
  try {
    if (!ambient) {
      ambient = new Audio(AMBIENT_SRC);
      ambient.loop = true;
      ambient.addEventListener(
        'error',
        () => {
          ambientAvailable = false;
          ambient = null;
        },
        { once: true }
      );
    }
    ambient.volume = AMBIENT_VOLUME;
    void ambient.play().catch(() => {
      // Autoplay refused or file missing — stay silent rather than retrying
    });
  } catch {
    ambientAvailable = false;
  }
}

export function stopAmbient(): void {
  if (!ambient) return;
  try {
    ambient.pause();
    ambient.currentTime = 0;
  } catch {
    // Nothing to do if the element was never ready
  }
}

/**
 * Procedural mechanical camera shutter click ("cekrek")
 * Two-stage mechanical action synthesized entirely with Web Audio API:
 * - Stage 1 ("cek"): Front curtain latch release & crisp metallic transient (t = 0)
 * - Stage 2 ("rek"): Rear curtain snap & body resonance thud (t = ~45ms)
 */
export function playShutterClick(): void {
  if (getMuted()) return;
  try {
    const ctx = getAudioContext();
    const bus = getBus();
    const t0 = ctx.currentTime;

    // Helper: generate a shaped white-noise transient burst
    const playNoiseBurst = (
      startTime: number,
      duration: number,
      centerFreq: number,
      q: number,
      peakGain: number
    ) => {
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      if (bufferSize <= 0) return;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Natural exponential decay curve baked into noise
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(centerFreq, startTime);
      filter.Q.setValueAtTime(q, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      gain.gain.linearRampToValueAtTime(0, startTime + duration + 0.005);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(bus);

      noiseSource.start(startTime);
      noiseSource.stop(startTime + duration + 0.01);
    };

    // Helper: generate a mechanical body thud (pitched transient)
    const playThump = (
      startTime: number,
      duration: number,
      startFreq: number,
      endFreq: number,
      peakGain: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      gain.gain.linearRampToValueAtTime(0, startTime + duration + 0.005);

      osc.connect(gain);
      gain.connect(bus);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    };

    // Stage 1: "Cek" (Front curtain latch & crisp metallic transient at t0)
    playNoiseBurst(t0, 0.032, 3800, 1.4, 1.3);
    playThump(t0, 0.024, 200, 80, 0.35);

    // Stage 2: "Rek" (Rear curtain snap & body thud at t0 + 46ms)
    const tRek = t0 + 0.046;
    playNoiseBurst(tRek, 0.055, 2300, 1.0, 1.45);
    playThump(tRek, 0.045, 115, 45, 0.42);
  } catch (e) {
    console.warn('AudioEngine: shutter click failed', e);
  }
}

/**
 * Countdown beep — pitch varies per count
 * High = 1, Mid = 2, Low = 3, gentle tick for counts > 3
 */
export function playCountdownBeep(count: number): void {
  if (getMuted()) return;
  try {
    const ctx = getAudioContext();
    const frequencies: Record<number, number> = { 3: 660, 2: 770, 1: 940 };
    const freq = frequencies[count] ?? 520;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = count === 1 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

    const volume = count === 1 ? 0.45 : count <= 3 ? 0.32 : 0.22;
    const duration = count === 1 ? 0.22 : count <= 3 ? 0.16 : 0.12;

    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration + 0.01);

    oscillator.connect(gainNode);
    gainNode.connect(getBus());

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + 0.02);
  } catch (e) {
    console.warn('AudioEngine: countdown beep failed', e);
  }
}

/**
 * Final shutter flash sound — authentic camera shutter ("cekrek")
 */
export function playFlashSound(): void {
  playShutterClick();
}

/**
 * Thermal paper print / dispensing sound
 * Simulates the mechanical whirr of a receipt printer
 */
export function playPrintSound(durationMs: number = 1200): void {
  if (getMuted()) return;
  try {
    const ctx = getAudioContext();
    const duration = durationMs / 1000;
    const bus = getBus();

    // Motor hum oscillator
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime + duration - 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    // Paper friction noise
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.04;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1500;
    noiseFilter.Q.value = 2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, ctx.currentTime);

    osc.connect(gainNode);
    gainNode.connect(bus);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(bus);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    noiseSource.start(ctx.currentTime);
    noiseSource.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('AudioEngine: print sound failed', e);
  }
}

/**
 * Warm up the AudioContext on first user gesture
 */
export function initAudio(): void {
  try {
    getBus();
  } catch (e) {
    console.warn('AudioEngine: init failed', e);
  }
}
