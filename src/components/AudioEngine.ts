/**
 * AudioEngine.ts — Web Audio API synthesized sounds for photobooth
 * All sounds are procedurally generated — no external audio files required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Mechanical analog camera shutter click
 * Combines a white noise burst with a sharp transient envelope
 */
export function playShutterClick(): void {
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
    gainNode.connect(ctx.destination);
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
    gainNode.connect(ctx.destination);

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
    gainNode.connect(ctx.destination);

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
  try {
    const ctx = getAudioContext();
    const duration = durationMs / 1000;

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
    gainNode.connect(ctx.destination);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

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
    getAudioContext();
  } catch (e) {
    console.warn('AudioEngine: init failed', e);
  }
}
