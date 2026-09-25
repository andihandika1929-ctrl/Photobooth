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
    audioCtx = new AudioContext();
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
 * Mechanical analog camera shutter click
 * Combines a white noise burst with a sharp transient envelope
 */
export function playShutterClick(): void {
  if (getMuted()) return;
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to shape the click character
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.8;

    // Gain shaping
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1.4, ctx.currentTime + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(getBus());
    source.start();
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

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(getBus());

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + 0.02);
  } catch (e) {
    console.warn('AudioEngine: countdown beep failed', e);
  }
}

/**
 * Final shutter flash sound — a punchy "0" mark
 */
export function playFlashSound(): void {
  if (getMuted()) return;
  try {
    const ctx = getAudioContext();

    // Oscillator burst
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(getBus());

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    // Layer the shutter on top
    setTimeout(playShutterClick, 30);
  } catch (e) {
    console.warn('AudioEngine: flash sound failed', e);
  }
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
