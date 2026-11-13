// Face tracking for photobooth filters (MediaPipe FaceLandmarker tasks-vision).
import { mpDelegates, noteGpuFailed } from './mpDelegate';

export interface FacePoint {
  x: number;
  y: number;
}

export interface FaceSummary {
  w: number;
  roll: number;
  head: FacePoint;
  eyes: FacePoint;
  nose: FacePoint;
  mouth: FacePoint;
  chin: FacePoint;
  tracked: boolean;
}

export interface FaceTracker {
  detect: () => FaceSummary | null;
  close: () => void;
}

const LOCAL_BUNDLE = '/mediapipe/vision_bundle.mjs';
const LOCAL_WASM = '/mediapipe/wasm';
const LOCAL_MODEL = '/models/face_landmarker.task';

const FALLBACK_CDNS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
  'https://unpkg.com/@mediapipe/tasks-vision@0.10.14',
];
const FALLBACK_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const HOLD_MS = 700;
const ERR_LIMIT = 30;

let enginePromise: Promise<{ vision: any; files: any; model: Uint8Array }> | null = null;
let modelPromise: Promise<Uint8Array> | null = null;
const warmPool: any[] = [];
let warmTarget = 0;
let warmChain: Promise<any> | null = null;

function loadModel(): Promise<Uint8Array> {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    // Try local model first
    try {
      const res = await fetch(LOCAL_MODEL);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      }
    } catch {
      // Fallback below
    }

    // Try fallback remote model
    const res = await fetch(FALLBACK_MODEL);
    if (!res.ok) throw new Error(`Model fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  })().catch((err) => {
    modelPromise = null;
    throw err;
  });

  return modelPromise;
}

function loadEngine(): Promise<{ vision: any; files: any; model: Uint8Array }> {
  if (enginePromise) return enginePromise;

  enginePromise = (async () => {
    let lastErr: any = null;

    // 1. Try local bundle & wasm
    try {
      /* @vite-ignore */
      const vision = await import(/* webpackIgnore: true */ LOCAL_BUNDLE);
      const files = await vision.FilesetResolver.forVisionTasks(LOCAL_WASM);
      const model = await loadModel();
      return { vision, files, model };
    } catch (err) {
      lastErr = err;
    }

    // 2. Try CDNs
    for (const cdn of FALLBACK_CDNS) {
      try {
        /* @vite-ignore */
        const vision = await import(/* webpackIgnore: true */ `${cdn}/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${cdn}/wasm`);
        const model = await loadModel();
        return { vision, files, model };
      } catch (err) {
        lastErr = err;
      }
    }

    enginePromise = null;
    throw lastErr || new Error('MediaPipe tasks-vision unavailable');
  })();

  return enginePromise;
}

function createLandmarker({ vision, files, model }: { vision: any; files: any; model: Uint8Array }, delegate: 'GPU' | 'CPU') {
  return vision.FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetBuffer: model, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

async function primeLandmarker(lm: any) {
  if (typeof document === 'undefined') return;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 2; i++) {
    lm.detectForVideo(c, performance.now() + i + 1);
    await new Promise((r) => setTimeout(r, 30));
  }
}

async function buildLandmarker(engine: { vision: any; files: any; model: Uint8Array }) {
  for (const delegate of mpDelegates()) {
    let lm: any = null;
    try {
      lm = await createLandmarker(engine, delegate);
      await primeLandmarker(lm);
      return lm;
    } catch (err: any) {
      try { lm?.close?.(); } catch {}
      if (delegate === 'CPU') throw err;
      noteGpuFailed();
      console.warn(`[faceTrack] ${delegate} delegate unavailable, falling back to CPU:`, err?.message || err);
    }
  }
  throw new Error('no delegate');
}

export function warmFaceTracking(count = 1) {
  loadEngine().catch(() => {});
  const want = Math.min(Math.max(count, 1), 2);
  if (want <= warmTarget) return;

  const buildOne = () =>
    loadEngine()
      .then((engine) => buildLandmarker(engine))
      .then((lm) => { warmPool.push(lm); })
      .catch(() => {});

  let chain = warmChain || Promise.resolve();
  for (let i = warmTarget; i < want; i++) chain = chain.then(buildOne);
  warmTarget = want;
  warmChain = chain;
}

function staticFace(vw: number, vh: number): FaceSummary {
  const w = vw * 0.30;
  const cx = vw / 2;
  const cy = vh * 0.44;
  return {
    w,
    roll: 0,
    head: { x: cx, y: cy - w * 0.55 },
    eyes: { x: cx, y: cy - w * 0.10 },
    nose: { x: cx, y: cy + w * 0.18 },
    mouth: { x: cx, y: cy + w * 0.45 },
    chin: { x: cx, y: cy + w * 0.75 },
    tracked: false,
  };
}

const LM = {
  forehead: 10,
  chin: 152,
  noseTip: 1,
  eyeL_a: 33,
  eyeL_b: 133,
  eyeR_a: 362,
  eyeR_b: 263,
  lipTop: 13,
  lipBottom: 14,
  ovalL: 234,
  ovalR: 454,
};

function summarize(lms: Array<{ x: number; y: number; z: number }>, vw: number, vh: number): FaceSummary {
  const P = (i: number) => ({ x: vw - lms[i].x * vw, y: lms[i].y * vh });
  const mid = (a: FacePoint, b: FacePoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const eyeA = mid(P(LM.eyeL_a), P(LM.eyeL_b));
  const eyeB = mid(P(LM.eyeR_a), P(LM.eyeR_b));
  const [eL, eR] = eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA];
  const a = P(LM.ovalL);
  const b = P(LM.ovalR);

  return {
    w: Math.hypot(a.x - b.x, a.y - b.y),
    roll: Math.atan2(eR.y - eL.y, eR.x - eL.x),
    head: P(LM.forehead),
    eyes: mid(eL, eR),
    nose: P(LM.noseTip),
    mouth: mid(P(LM.lipTop), P(LM.lipBottom)),
    chin: P(LM.chin),
    tracked: true,
  };
}

export function createFaceTracker(video: HTMLVideoElement): FaceTracker {
  let landmarker: any = null;
  let failed = false;
  let closed = false;
  let last: FaceSummary | null = null;
  let lastAt = 0;
  let lastTs = -1;
  let errors = 0;
  let rebuilds = 0;
  let lastRunAt = -1e9;
  let lastVt = -1;
  let minGap = 0;

  loadEngine().catch(() => {});

  const claimWarm = () => {
    if (closed) return true;
    const lm = warmPool.shift();
    if (!lm) return false;
    warmTarget = Math.max(0, warmTarget - 1);
    landmarker = lm;
    return true;
  };

  const build = () =>
    loadEngine()
      .then((engine) => buildLandmarker(engine))
      .then((lm) => {
        if (closed) { lm?.close?.(); return; }
        landmarker = lm;
      })
      .catch((err) => {
        failed = true;
        console.warn('[faceTrack] tracking unavailable, filters fall back to static placement:', err?.message || err);
      });

  if (!claimWarm()) {
    (warmChain ? warmChain.then(() => claimWarm()) : Promise.resolve(false))
      .then((claimed) => { if (!claimed) build(); });
  }

  function recover() {
    try { landmarker?.close?.(); } catch {}
    landmarker = null;
    errors = 0;
    if (++rebuilds <= 2) build();
    else failed = true;
  }

  return {
    detect(): FaceSummary | null {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return null;

      if (landmarker) {
        const now = performance.now();
        const vt = video.currentTime;
        if (now - lastRunAt < minGap || (vt === lastVt && now - lastRunAt < 250)) {
          return last && now - lastAt < HOLD_MS ? last : null;
        }
        lastRunAt = now;
        lastVt = vt;
        const ts = Math.max(lastTs + 1, Math.round(now));
        lastTs = ts;

        try {
          const res = landmarker.detectForVideo(video, ts);
          const cost = performance.now() - now;
          minGap = cost > 8 ? Math.min(120, cost * 2) : 0;
          errors = 0;
          const lms = res?.faceLandmarks?.[0];
          if (lms) {
            last = summarize(lms, vw, vh);
            lastAt = now;
            return last;
          }
        } catch {
          if (++errors >= ERR_LIMIT) recover();
        }

        return last && now - lastAt < HOLD_MS ? last : null;
      }

      return staticFace(vw, vh);
    },

    close() {
      closed = true;
      try { landmarker?.close?.(); } catch {}
      landmarker = null;
      last = null;
    },
  };
}

