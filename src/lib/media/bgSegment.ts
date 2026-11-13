// Person segmentation for photobooth virtual backgrounds (MediaPipe ImageSegmenter tasks-vision).
import { mpDelegates, noteGpuFailed } from './mpDelegate';

export interface PersonSegmenter {
  cutout: () => HTMLCanvasElement | null;
  capture: () => HTMLCanvasElement | null;
  ready: () => boolean;
  failed: () => boolean;
  close: () => void;
}

const LOCAL_BUNDLE = '/mediapipe/vision_bundle.mjs';
const LOCAL_WASM = '/mediapipe/wasm';
const LOCAL_MODEL = '/models/selfie_segmenter.tflite';

const FALLBACK_CDNS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
  'https://unpkg.com/@mediapipe/tasks-vision@0.10.14',
];
const FALLBACK_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

const MASK_MS = 60;
const SEG_SIZE = 256;
const LIVE_MAX = 1280;
const VIEW_PAD = 1.08;
const LUMA_MS = 400;
const LIFT_TARGET = 0.40;
const LIFT_MAX = 3;
const EMA_BASE = 0.3;
const EMA_GAIN = 1.4;
const EDGE_LO = 0.30;
const EDGE_HI = 0.72;
const FLIP_READS = 8;
const ERR_LIMIT = 12;

let enginePromise: Promise<{ vision: any; files: any; model: Uint8Array }> | null = null;
let modelPromise: Promise<Uint8Array> | null = null;
const warmPool: any[] = [];
let warmTarget = 0;
let warmChain: Promise<any> | null = null;

function loadModel(): Promise<Uint8Array> {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    try {
      const res = await fetch(LOCAL_MODEL);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      }
    } catch {
      // Fallback below
    }

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

    // 1. Try local
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
    throw lastErr || new Error('ImageSegmenter tasks-vision unavailable');
  })();

  return enginePromise;
}

function createSegmenter({ vision, files, model }: { vision: any; files: any; model: Uint8Array }, delegate: 'GPU' | 'CPU') {
  return vision.ImageSegmenter.createFromOptions(files, {
    baseOptions: { modelAssetBuffer: model, delegate },
    runningMode: 'VIDEO',
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

async function primeSegmenter(seg: any) {
  if (typeof document === 'undefined') return;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#303030';
  g.fillRect(18, 14, 28, 44);

  let ok = false;
  for (let i = 0; i < 3; i++) {
    const res = seg.segmentForVideo(c, performance.now() + i + 1);
    if (res?.confidenceMasks?.[0]) ok = true;
    res?.close?.();
    await new Promise((r) => setTimeout(r, 30));
  }
  if (!ok) throw new Error('no mask from prime');
}

async function buildSegmenter(engine: { vision: any; files: any; model: Uint8Array }) {
  for (const delegate of mpDelegates()) {
    let seg: any = null;
    try {
      seg = await createSegmenter(engine, delegate);
      await primeSegmenter(seg);
      return { seg, delegate };
    } catch (err: any) {
      try { seg?.close?.(); } catch {}
      if (delegate === 'CPU') throw err;
      noteGpuFailed();
      console.warn(`[bgSegment] ${delegate} delegate unavailable, falling back to CPU:`, err?.message || err);
    }
  }
  throw new Error('no delegate');
}

export function warmBgSegmentation(count = 1) {
  loadEngine().catch(() => {});
  const want = Math.min(Math.max(count, 1), 2);
  if (want <= warmTarget) return;

  const buildOne = () =>
    loadEngine()
      .then((engine) => buildSegmenter(engine))
      .then(({ seg }) => { warmPool.push(seg); })
      .catch(() => {});

  let chain = warmChain || Promise.resolve();
  for (let i = warmTarget; i < want; i++) chain = chain.then(buildOne);
  warmTarget = want;
  warmChain = chain;
}

function viewRoi(vw: number, vh: number, lo: number, hi: number) {
  if (!(lo > 0 && hi > 0)) return { sx: 0, sy: 0, sw: vw, sh: vh };
  const w = Math.min(vw, vh * hi);
  const h = Math.min(vh, vw / lo);
  const side = Math.max(w, h) * VIEW_PAD;
  const sw = Math.round(Math.min(vw, side));
  const sh = Math.round(Math.min(vh, side));
  return { sx: Math.round((vw - sw) / 2), sy: Math.round((vh - sh) / 2), sw, sh };
}

function liftFor(m: number) {
  if (m >= LIFT_TARGET) return 0;
  if (m <= 0.005) return LIFT_MAX;
  const n = Math.log2(Math.log(1 - LIFT_TARGET) / Math.log(1 - m));
  return Math.min(LIFT_MAX, Math.max(0, n));
}

function frameKey() {
  if (typeof document === 'undefined') return performance.now();
  const t = (document as any).timeline?.currentTime;
  return typeof t === 'number' ? t : performance.now();
}

export interface SegmenterOptions {
  aspect?: number;
  minAspect?: number;
  maxAspect?: number;
}

export function createPersonSegmenter(video: HTMLVideoElement, options: SegmenterOptions = {}): PersonSegmenter {
  const { aspect = 0, minAspect = aspect, maxAspect = aspect } = options;
  let segmenter: any = null;
  let closed = false;
  let failed = false;
  let rebuilds = 0;
  let errors = 0;
  let lastTs = -1;
  let maskAt = 0;
  let maskRoi: { sx: number; sy: number; sw: number; sh: number } | null = null;
  let input: HTMLCanvasElement | null = null;
  let probe: HTMLCanvasElement | null = null;
  let lumaAt = -Infinity;
  let lift = -1;
  let soft: Float32Array | null = null;
  let blurRow: Float32Array | null = null;
  let maskCanvas: HTMLCanvasElement | null = null;
  let maskData: ImageData | null = null;
  let cut: HTMLCanvasElement | null = null;
  let cutKey: any = null;
  let everMasked = false;
  let polarity = 1;
  let votes = 0;

  loadEngine().catch(() => {});

  const claimWarm = () => {
    if (closed) return true;
    const seg = warmPool.shift();
    if (!seg) return false;
    warmTarget = Math.max(0, warmTarget - 1);
    segmenter = seg;
    return true;
  };

  const build = () =>
    loadEngine()
      .then((engine) => buildSegmenter(engine))
      .then(({ seg }) => {
        if (closed) { seg?.close?.(); return; }
        segmenter = seg;
      })
      .catch((err) => {
        failed = true;
        console.warn('[bgSegment] segmentation unavailable, virtual backgrounds stay off:', err?.message || err);
      });

  if (!claimWarm()) {
    (warmChain ? warmChain.then(() => claimWarm()) : Promise.resolve(false))
      .then((claimed) => { if (!claimed) build(); });
  }

  function votePolarity(conf: Float32Array, mw: number, mh: number) {
    const band = (f0: number, f1: number) => {
      const y0 = Math.floor(f0 * mh);
      const y1 = Math.max(y0 + 1, Math.floor(f1 * mh));
      let s = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < mw; x += 2) {
          s += conf[y * mw + x];
          n++;
        }
      }
      return n ? s / n : 0;
    };
    const agree = (band(0.88, 1) - band(0, 0.12)) * polarity;
    if (agree > -0.35) { votes = 0; return false; }
    if (++votes < FLIP_READS) return false;
    polarity = -polarity;
    votes = 0;
    return true;
  }

  function meanLuma() {
    try {
      if (!probe) {
        probe = document.createElement('canvas');
        probe.width = 16;
        probe.height = 12;
      }
      if (!input) return null;
      const g = probe.getContext('2d', { willReadFrequently: true });
      if (!g) return null;
      g.drawImage(input, 0, 0, 16, 12);
      const d = g.getImageData(0, 0, 16, 12).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) {
        s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      }
      return s / (d.length / 4) / 255;
    } catch {
      return null;
    }
  }

  function liftShadows(g: CanvasRenderingContext2D, now: number) {
    if (now - lumaAt >= LUMA_MS) {
      lumaAt = now;
      const m = meanLuma();
      if (m != null) {
        const want = liftFor(m);
        lift = lift < 0 ? want : lift + (want - lift) * 0.5;
      }
    }
    if (!(lift > 0.05) || !input) return;
    g.globalCompositeOperation = 'screen';
    for (let left = lift; left > 0.01; left -= 1) {
      g.globalAlpha = Math.min(1, left);
      g.drawImage(input, 0, 0);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function writeMask(conf: Float32Array, mw: number, mh: number) {
    const flipped = votePolarity(conf, mw, mh);
    const n = mw * mh;
    const fresh = flipped || !soft || !maskCanvas || maskCanvas.width !== mw || maskCanvas.height !== mh;
    if (fresh) {
      soft = new Float32Array(n);
      blurRow = new Float32Array(n);
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = mw;
      maskCanvas.height = mh;
      const g = maskCanvas.getContext('2d');
      if (g) maskData = g.createImageData(mw, mh);
    }
    if (!soft || !blurRow || !maskData || !maskCanvas) return;

    const inv = polarity < 0;
    for (let i = 0; i < n; i++) {
      const c = inv ? 1 - conf[i] : conf[i];
      if (fresh) { soft[i] = c; continue; }
      const d = c - soft[i];
      soft[i] += d * Math.min(1, EMA_BASE + Math.abs(d) * EMA_GAIN);
    }
    for (let y = 0; y < mh; y++) {
      const row = y * mw;
      for (let x = 0; x < mw; x++) {
        const l = soft[row + (x > 0 ? x - 1 : x)];
        const r = soft[row + (x < mw - 1 ? x + 1 : x)];
        blurRow[row + x] = (l + 2 * soft[row + x] + r) * 0.25;
      }
    }
    const px = maskData.data;
    const ramp = EDGE_HI - EDGE_LO;
    for (let y = 0; y < mh; y++) {
      const up = (y > 0 ? y - 1 : y) * mw;
      const dn = (y < mh - 1 ? y + 1 : y) * mw;
      const row = y * mw;
      for (let x = 0; x < mw; x++) {
        const c = (blurRow[up + x] + 2 * blurRow[row + x] + blurRow[dn + x]) * 0.25;
        const a = Math.min(1, Math.max(0, (c - EDGE_LO) / ramp));
        px[(row + x) * 4 + 3] = (a * a * (3 - 2 * a)) * 255;
      }
    }
    const g = maskCanvas.getContext('2d');
    if (g) g.putImageData(maskData, 0, 0);
  }

  function recover(err: any) {
    try { segmenter?.close?.(); } catch {}
    segmenter = null;
    maskCanvas = null;
    soft = null;
    cutKey = null;
    errors = 0;
    if (++rebuilds > 2) {
      failed = true;
      console.warn('[bgSegment] segmenter keeps failing:', err?.message || err);
      return;
    }
    build();
  }

  function refreshMask(force = false) {
    const now = performance.now();
    const roi = viewRoi(video.videoWidth, video.videoHeight, minAspect, maxAspect);
    const moved = !maskRoi || roi.sx !== maskRoi.sx || roi.sy !== maskRoi.sy
      || roi.sw !== maskRoi.sw || roi.sh !== maskRoi.sh;
    if (!force && !moved && maskCanvas && now - maskAt < MASK_MS) return;
    const s = SEG_SIZE / Math.max(roi.sw, roi.sh);
    const iw = Math.max(1, Math.round(roi.sw * s));
    const ih = Math.max(1, Math.round(roi.sh * s));
    if (!input) input = document.createElement('canvas');
    if (input.width !== iw || input.height !== ih) {
      input.width = iw;
      input.height = ih;
    }
    const g = input.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    const ts = Math.max(lastTs + 1, Math.round(now));
    lastTs = ts;
    let result: any = null;
    try {
      g.drawImage(video, roi.sx, roi.sy, roi.sw, roi.sh, 0, 0, iw, ih);
      liftShadows(g, now);
      result = segmenter.segmentForVideo(input, ts);
      const mask = result?.confidenceMasks?.[0];
      if (!mask) throw new Error('no mask');
      writeMask(mask.getAsFloat32Array(), mask.width, mask.height);
      maskRoi = roi;
      maskAt = now;
      everMasked = true;
      errors = 0;
    } catch (err) {
      if (++errors >= ERR_LIMIT) recover(err);
    } finally {
      try { result?.close?.(); } catch {}
    }
  }

  function paintCut(c: HTMLCanvasElement | null, cw: number, ch: number, s: number): HTMLCanvasElement | null {
    if (!maskRoi || !maskCanvas) return null;
    let canvas = c;
    if (!canvas || canvas.width !== cw || canvas.height !== ch) {
      canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
    }
    const cx = canvas.getContext('2d');
    if (!cx) return null;
    const { sx, sy, sw, sh } = maskRoi;
    cx.clearRect(0, 0, cw, ch);
    cx.drawImage(video, sx, sy, sw, sh, sx * s, sy * s, sw * s, sh * s);
    cx.save();
    cx.globalCompositeOperation = 'destination-in';
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(maskCanvas, sx * s, sy * s, sw * s, sh * s);
    cx.restore();
    return canvas;
  }

  return {
    cutout(): HTMLCanvasElement | null {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh || !segmenter) return null;
      const key = frameKey();
      if (cut && key === cutKey) return cut;
      refreshMask();
      if (!maskCanvas) return null;
      const s = Math.min(1, LIVE_MAX / Math.max(vw, vh));
      try {
        cut = paintCut(cut, Math.round(vw * s), Math.round(vh * s), s);
      } catch {
        return null;
      }
      cutKey = key;
      return cut;
    },

    capture(): HTMLCanvasElement | null {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh || !segmenter) return null;
      refreshMask(true);
      if (!maskCanvas) return null;
      try {
        return paintCut(null, vw, vh, 1);
      } catch {
        return null;
      }
    },

    ready(): boolean {
      return everMasked;
    },

    failed(): boolean {
      return failed;
    },

    close() {
      closed = true;
      try { segmenter?.close?.(); } catch {}
      segmenter = null;
      if (input) input.width = input.height = 0;
      if (probe) probe.width = probe.height = 0;
      if (maskCanvas) maskCanvas.width = maskCanvas.height = 0;
      if (cut) cut.width = cut.height = 0;
      input = probe = maskCanvas = cut = null;
      soft = blurRow = null;
    },
  };
}

// Background art caching
const bgCache = new Map<string, { img: HTMLImageElement; ok: boolean }>();

export function preloadBg(id: string, attempt = 0) {
  if (!id || id === 'none') return;
  const src = `/assets/backgrounds/${id}.webp`;
  const entry = bgCache.get(id);
  if (entry?.ok || (entry && attempt === 0)) return;

  const img = new Image();
  img.decoding = 'async';
  bgCache.set(id, { img, ok: false });
  img.onload = () => {
    bgCache.set(id, { img, ok: true });
  };
  img.onerror = () => {
    if (attempt < 3) {
      setTimeout(() => preloadBg(id, attempt + 1), 400 * (attempt + 1));
    }
  };
  img.src = attempt ? `${src}?r=${attempt}` : src;
}

export function bgImage(id: string): HTMLImageElement | null {
  if (!id || id === 'none') return null;
  const entry = bgCache.get(id);
  if (!entry) {
    preloadBg(id);
    return null;
  }
  return entry.ok && entry.img.naturalWidth ? entry.img : null;
}

export function bgSourceRect(
  imgW: number,
  imgH: number,
  destW: number,
  destH: number,
  half = 0,
  halves = 1
) {
  const cellW = destW * halves;
  const cellH = destH;
  const s = Math.max(cellW / imgW, cellH / imgH);
  const sw = cellW / s;
  const sh = cellH / s;
  const sx = (imgW - sw) / 2 + (sw / halves) * half;
  const sy = (imgH - sh) / 2;
  return { sx, sy, sw: sw / halves, sh };
}

