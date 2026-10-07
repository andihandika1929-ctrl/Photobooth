'use client';

import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  Download,
  QrCode,
  RefreshCw,
  MapPin,
  Music,
  Palette,
  Sticker,
  Plus,
  Minus,
  X,
  Sparkles,
  Smartphone,
  Video,
  Type,
  RotateCcw,
  Check,
  Move,
  Contrast,
  RotateCw,
} from 'lucide-react';
import {
  type FilterName,
  type ShotClip,
  getFilterCss,
  getOptimalVideoMimeType,
} from './CameraViewport';
import { isCanvasFilterSupported, applyPixelFilter } from '@/utils/canvasColorGrading';
import { playPrintSound } from './AudioEngine';
import { v4 as uuidv4 } from 'uuid';
import { getKeyedSticker, getKeyedStickerSync, preloadAllStickers } from '@/utils/stickerCache';
import { savePhotoToSupabase } from '@/utils/supabasePhotoPipeline';
import {
  CURATED_FONTS,
  getCuratedFont,
  ensureFontLoaded,
  preloadAllCuratedFonts,
} from '@/lib/fonts';
import {
  type TextConfig,
  getPresetTextConfig,
  PRESET_DEFAULT_TEXT_CONFIGS,
} from '@/lib/frames';

// ─── Types ───────────────────────────────────────────────
export type FramePreset =
  | 'birthday'
  | 'birthdayCatPink'
  | 'film35mm'
  | 'retroTerracotta';

export type LayoutType = 'strip3' | 'strip4' | 'grid2x2' | 'grid2x3';

export type BirthdayPaletteId = 'burgundy' | 'espresso' | 'sage' | 'pink' | 'ivory' | 'charcoal';

export interface PlacedSticker {
  id: string;
  name: string;
  src: string;
  xPct: number; // 0–1 of container width
  yPct: number; // 0–1 of container height
  scale: number;
}

interface CapturedFrame {
  dataUrl: string;
  filter: FilterName;
  clip?: ShotClip;
}

interface CanvasEditorProps {
  frames: CapturedFrame[];
  allFrames?: CapturedFrame[];
  layout: LayoutType;
  initialPreset?: FramePreset;
  onAutoUpload?: (blob: Blob, templateType: string, isSyncUpdate?: boolean) => void;
  onShare: (blob: Blob, templateType: string) => void;
  onReset: () => void;
}

// ─── Constants ────────────────────────────────────────────
const FRAME_PRESETS: { id: FramePreset; label: string; emoji: string; desc: string; textConfig: TextConfig }[] = [
  { id: 'birthdayCatPink', label: 'Birthday Cat Pink', emoji: '🐱', desc: 'Party cat, cake & 6-photo custom PNG', textConfig: PRESET_DEFAULT_TEXT_CONFIGS.birthdayCatPink },
  { id: 'retroTerracotta', label: 'Retro Terracotta', emoji: '📎', desc: 'Scrapbook 4-cut with paperclips', textConfig: PRESET_DEFAULT_TEXT_CONFIGS.retroTerracotta },
  { id: 'birthday', label: 'Editorial Birthday', emoji: '🎂', desc: 'Clean Korean strip, name & age at the bottom', textConfig: PRESET_DEFAULT_TEXT_CONFIGS.birthday },
  { id: 'film35mm', label: '35mm Film Strip', emoji: '🎞', desc: 'Kodak sprockets & metadata', textConfig: PRESET_DEFAULT_TEXT_CONFIGS.film35mm },
];

export type PhotoFilterId = 'normal' | 'bw' | 'warm' | 'vintage' | 'cool';

export interface PhotoFilterPreset {
  id: PhotoFilterId;
  label: string;
  tag: string;
  desc: string;
  css: string;
  previewBg: string;
}

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  {
    id: 'normal',
    label: 'Normal',
    tag: 'Original',
    desc: 'True-to-life studio tone',
    css: 'none',
    previewBg: 'linear-gradient(135deg, #f8fafc, #cbd5e1)',
  },
  {
    id: 'bw',
    label: 'B&W',
    tag: 'Monochrome',
    desc: 'Studio grayscale & skin glow',
    css: 'grayscale(1) contrast(1.22) brightness(1.04)',
    previewBg: 'linear-gradient(135deg, #18181b, #71717a)',
  },
  {
    id: 'warm',
    label: 'Warm',
    tag: 'Golden Hour',
    desc: 'Golden warmth & soft sepia',
    css: 'sepia(0.28) saturate(1.18) brightness(1.04) contrast(1.02)',
    previewBg: 'linear-gradient(135deg, #fef3c7, #f59e0b)',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    tag: 'Film Tone',
    desc: '90s disposable high-contrast film',
    css: 'contrast(1.22) brightness(0.96) saturate(0.85) sepia(0.18)',
    previewBg: 'linear-gradient(135deg, #fed7aa, #9a3412)',
  },
  {
    id: 'cool',
    label: 'Cool',
    tag: 'Clean Korean',
    desc: 'Crisp Korean studio cyan-blue tone',
    css: 'brightness(1.05) contrast(1.03) saturate(1.08) hue-rotate(8deg)',
    previewBg: 'linear-gradient(135deg, #e0f2fe, #0284c7)',
  },
];

const STICKER_DEFS = [
  { name: 'Couple', src: '/sticker/Couple.png' },
  { name: 'Angry',  src: '/sticker/Angry.png'  },
  { name: 'Happy',  src: '/sticker/Happy.png'  },
  { name: 'Sad',    src: '/sticker/Sad.png'    },
  { name: 'Smile',  src: '/sticker/Smile.png'  },
];

export const BIRTHDAY_PALETTES: Record<string, { label: string; bg: string; fg: string; accent: string; muted: string }> = {
  burgundy: { label: 'Burgundy',      bg: '#6B1D2F', fg: '#F5E6E8', accent: '#E8B4B8', muted: '#C4888E' },
  espresso: { label: 'Warm Espresso', bg: '#4A3528', fg: '#F0E8DF', accent: '#C9A882', muted: '#A68562' },
  mocca:    { label: 'Warm Espresso', bg: '#4A3528', fg: '#F0E8DF', accent: '#C9A882', muted: '#A68562' },
  sage:     { label: 'Sage Green',    bg: '#7C8B6A', fg: '#F3F5EE', accent: '#D4DBC4', muted: '#B0BA9A' },
  pink:     { label: 'Baby Pink',     bg: '#E8B4B8', fg: '#4A1522', accent: '#BE185D', muted: '#9E1452' },
  ivory:    { label: 'Cream / Ivory', bg: '#F7F4EB', fg: '#2A2826', accent: '#8A7560', muted: '#7D776D' },
  charcoal: { label: 'Deep Charcoal', bg: '#1C1C1E', fg: '#E8DFCE', accent: '#E2B874', muted: '#9E968B' },
};

const SIGNATURE = 'haloluna • gethaloluna.com';

function drawHaloLunaWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  color: string,
  s: number = 1
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `500 ${8 * s}px Inter, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('haloluna • gethaloluna.com', w / 2, y);
  ctx.restore();
}

// ─── Utilities ────────────────────────────────────────────
function formatSubText(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  if (/^\d{1,3}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    const j = num % 10;
    const k = num % 100;
    const suffix =
      j === 1 && k !== 11 ? 'st' : j === 2 && k !== 12 ? 'nd' : j === 3 && k !== 13 ? 'rd' : 'th';
    return `${num}${suffix}`;
  }
  return trimmed;
}

const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac but has a touch screen
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/**
 * Web Share API (files) — on iOS/Android this opens the native sheet with
 * "Save Image / Save Video" so the file lands in the photo gallery.
 *  - 'shared' / 'cancelled' : sheet was shown (nothing more to do)
 *  - 'blocked'              : browser refused (user-gesture window expired)
 *  - 'unsupported'          : desktop or no file-share support → use anchor fallback
 */
async function tryNativeShare(
  blob: Blob,
  filename: string,
): Promise<'shared' | 'cancelled' | 'blocked' | 'unsupported'> {
  if (
    !isMobileDevice() ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return 'unsupported';
  }
  try {
    const baseType = (blob.type || '').split(';')[0] || undefined;
    const file = new File([blob], filename, { type: baseType });
    if (!navigator.canShare({ files: [file] })) return 'unsupported';
    await navigator.share({ files: [file], title: 'HaloLuna' });
    return 'shared';
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'AbortError') return 'cancelled';
    if (name === 'NotAllowedError') return 'blocked';
    console.warn('[HaloLuna] Web Share failed, using anchor fallback:', err);
    return 'unsupported';
  }
}

function anchorDownloadBlob(blob: Blob, filename: string) {
  try {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    console.error('[HaloLuna] Anchor download failed:', err);
  }
}

function fmtDate() {
  return new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}
function fmtTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
function fmtCinemaDate() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `• ${day}.${month}.${year} •`;
}
function fmtSimpleDate() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bw: number,
  bh: number,
  color: string,
) {
  const bars = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 2, 1, 3];
  const total = bars.reduce((a, b) => a + b, 0) + bars.length * 0.4;
  const unit = bw / total;
  let cx = x;
  ctx.fillStyle = color;
  bars.forEach((bw2, i) => {
    if (i % 2 === 0) ctx.fillRect(cx, y, bw2 * unit, bh);
    cx += bw2 * unit + unit * 0.4;
  });
}

// Cached Small (64x64) Noise Tile Canvas for Lightweight High-Res Export Film Grain
let cachedNoiseCanvas: HTMLCanvasElement | null = null;
function getNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (typeof document === 'undefined') return null;
  if (!cachedNoiseCanvas) {
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 64;
    noiseCanvas.height = 64;
    const nCtx = noiseCanvas.getContext('2d');
    if (nCtx) {
      const imgData = nCtx.createImageData(64, 64);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = Math.floor(Math.random() * 255);
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
        d[i + 3] = 16; // subtle, gentle grain
      }
      nCtx.putImageData(imgData, 0, 0);
      cachedNoiseCanvas = noiseCanvas;
    }
  }
  if (!cachedNoiseCanvas) return null;
  return ctx.createPattern(cachedNoiseCanvas, 'repeat');
}

// ─── Birthday Cat Pink geometry ───────────────────────────
// The PNG asset is 1181 × 1772. Its last few rows fade into a soft edge, so we
// crop them and extend the artwork's own blush (#FFE1EA) into a caption band
// that holds the guest's name and age.
const CAT_PINK_BASE_W = 1181;
const CAT_PINK_FRAME_H = 1772;
const CAT_PINK_EDGE_BLEED = 3;
const CAT_PINK_CAPTION_H = 168;
const CAT_PINK_ART_H = CAT_PINK_FRAME_H - CAT_PINK_EDGE_BLEED;
const CAT_PINK_BASE_H = CAT_PINK_ART_H + CAT_PINK_CAPTION_H;
const CAT_PINK_BLUSH = '#FFE1EA';

// Retro Terracotta Scrapbook — native PNG is 1333 × 2000 with 4 transparent cutouts
const RETRO_BASE_W = 1333;
const RETRO_BASE_H = 2000;
const RETRO_SLOTS = [
  { x: 92, y: 220, w: 496, h: 704 },
  { x: 746, y: 220, w: 496, h: 704 },
  { x: 92, y: 996, w: 496, h: 700 },
  { x: 746, y: 996, w: 496, h: 700 },
];
const RETRO_CAPTION_Y = 1848;

// Cached transparent PNG frame image for instant rendering
let cachedBirthdayCatPinkImg: HTMLImageElement | null = null;
let birthdayCatPinkLoadingPromise: Promise<HTMLImageElement> | null = null;

function loadBirthdayCatPinkFrame(): Promise<HTMLImageElement> {
  if (
    cachedBirthdayCatPinkImg &&
    cachedBirthdayCatPinkImg.complete &&
    cachedBirthdayCatPinkImg.naturalWidth > 0
  ) {
    return Promise.resolve(cachedBirthdayCatPinkImg);
  }
  if (birthdayCatPinkLoadingPromise) {
    return birthdayCatPinkLoadingPromise;
  }

  birthdayCatPinkLoadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch {
        // ignore decode failure fallback
      }
      if (img.naturalWidth > 0) {
        cachedBirthdayCatPinkImg = img;
        birthdayCatPinkLoadingPromise = null;
        resolve(img);
      } else {
        birthdayCatPinkLoadingPromise = null;
        reject(new Error('Loaded /frames/birthday-cat-pink.png with 0 width'));
      }
    };
    img.onerror = (err) => {
      birthdayCatPinkLoadingPromise = null;
      console.error('[HaloLuna] Failed to load /frames/birthday-cat-pink.png overlay asset:', err);
      reject(new Error('Failed to load /frames/birthday-cat-pink.png'));
    };
    img.src = '/frames/birthday-cat-pink.png';
  });

  return birthdayCatPinkLoadingPromise;
}

let cachedRetroImg: HTMLImageElement | null = null;
let retroLoadingPromise: Promise<HTMLImageElement> | null = null;

function loadRetroTerracottaFrame(): Promise<HTMLImageElement> {
  if (cachedRetroImg && cachedRetroImg.complete && cachedRetroImg.naturalWidth > 0) {
    return Promise.resolve(cachedRetroImg);
  }
  if (retroLoadingPromise) return retroLoadingPromise;

  retroLoadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if ('decode' in img) await img.decode();
      } catch {
        // decode is best-effort
      }
      if (img.naturalWidth > 0) {
        cachedRetroImg = img;
        retroLoadingPromise = null;
        resolve(img);
      } else {
        retroLoadingPromise = null;
        reject(new Error('Loaded /frames/retro-orange-4shot.png with 0 width'));
      }
    };
    img.onerror = (err) => {
      retroLoadingPromise = null;
      console.error('[HaloLuna] Failed to load /frames/retro-orange-4shot.png:', err);
      reject(new Error('Failed to load /frames/retro-orange-4shot.png'));
    };
    img.src = '/frames/retro-orange-4shot.png';
  });

  return retroLoadingPromise;
}

// Preload cute fonts safely with fallback so canvas generator never hangs or throws
let fontsLoaded = false;
async function loadCuteBirthdayFonts(): Promise<void> {
  if (fontsLoaded) return;
  if (typeof document === 'undefined' || !document.fonts) return;

  try {
    await Promise.allSettled([
      document.fonts.load('700 48px Caveat'),
      document.fonts.load('700 96px Caveat'),
      document.fonts.load('700 48px DynaPuff'),
      document.fonts.load('48px Pacifico'),
      document.fonts.load('bold 48px "Playfair Display"'),
      document.fonts.load('bold 48px "Bodoni Moda"'),
    ]);
    await document.fonts.ready;
    fontsLoaded = true;
  } catch (e) {
    console.warn("Font loading fallback:", e);
  }
}

function stickerHandFont(size: number) {
  return `700 ${size}px Caveat, "DynaPuff", "Pacifico", cursive`;
}

/** Guest name only — strips leftover marketing suffixes, never invents a default. */
function parseGuestName(raw: string): string {
  let name = (raw || '').trim();
  if (!name) return '';
  if (/^it's\s+/i.test(name)) name = name.replace(/^it's\s+/i, '').trim();
  if (/['’]s\s*day$/i.test(name)) name = name.replace(/['’]s\s*day$/i, '').trim();
  else if (/['’]s\s*birthday$/i.test(name)) name = name.replace(/['’]s\s*birthday$/i, '').trim();
  else if (/^happy\s+birthday\s+/i.test(name)) name = name.replace(/^happy\s+birthday\s+/i, '').trim();
  else if (/\s+birthday$/i.test(name)) name = name.replace(/\s+birthday$/i, '').trim();
  else if (/['’]s$/i.test(name)) name = name.replace(/['’]s$/i, '').trim();
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

function parseOrdinalAge(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (Number.isNaN(num) || num <= 0) return '';
  const j = num % 10;
  const k = num % 100;
  const suffix =
    j === 1 && k !== 11 ? 'st' : j === 2 && k !== 12 ? 'nd' : j === 3 && k !== 13 ? 'rd' : 'th';
  return `${num}${suffix}`;
}

function strokeStickerWord(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  outline: number,
) {
  ctx.font = stickerHandFont(size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;
  // Thick white outline first so the handwriting pops on any paper color
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/**
 * Korean-sticker caption: Caveat + thick white outline, seated at the BOTTOM
 * of the strip. Draws only the guest's name and age — no promotional copy.
 */
function drawKoreanStickerCaption(
  ctx: CanvasRenderingContext2D,
  rawName: string,
  rawAge: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  scale: number,
  nameFill = '#FF69B4',
  ageFill = '#FF69B4',
  nameSize = 44 * scale,
  ageSize = 26 * scale,
) {
  const name = parseGuestName(rawName);
  const age = parseOrdinalAge(rawAge);
  if (!name && !age) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let sizedName = nameSize;
  if (name) {
    ctx.font = stickerHandFont(sizedName);
    const measured = ctx.measureText(name).width;
    if (measured > maxWidth) sizedName *= maxWidth / measured;
  }

  const nameY = centerY - (name && age ? 16 * scale : 0);
  if (name) {
    ctx.save();
    ctx.translate(centerX, nameY);
    strokeStickerWord(ctx, name, 0, 0, sizedName, nameFill, Math.max(12, sizedName * 0.22));
    ctx.restore();
  }
  if (age) {
    strokeStickerWord(
      ctx,
      age,
      centerX,
      centerY + (name ? 22 * scale : 0),
      ageSize,
      ageFill,
      Math.max(10, ageSize * 0.24),
    );
  }
  ctx.restore();
}

// Hardware-accelerated Korean studio & film preset rendering (grain applied only on export)
// Object-fit: cover center-crop helper — preserves aspect ratio, no face distortion
// SlotImage: a still photo, or a per-slot canvas that is refreshed every frame
// while the animated BTS strip video is being recorded.
type SlotImage = HTMLImageElement | HTMLCanvasElement;

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: SlotImage,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const natW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const natH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const imgAspect = natW / natH;
  const dstAspect = dw / dh;
  let sx: number, sy: number, sWidth: number, sHeight: number;
  if (imgAspect > dstAspect) {
    // Image is wider than destination — crop left/right
    sHeight = natH;
    sWidth = sHeight * dstAspect;
    sx = (natW - sWidth) / 2;
    sy = 0;
  } else {
    // Image is taller than destination — crop top/bottom
    sWidth = natW;
    sHeight = sWidth / dstAspect;
    sx = 0;
    sy = (natH - sHeight) / 2;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
}

function drawGradedPhoto(
  ctx: CanvasRenderingContext2D,
  img: SlotImage,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  borderRadius = 0,
  applyGrain = false,
  explicitFilterCss?: string,
) {
  ctx.save();
  if (borderRadius > 0) {
    roundRect(ctx, dx, dy, dw, dh, borderRadius);
    ctx.clip();
  }

  // The snapshot data URL already contains the true baked filter pixels.
  // If an explicit override filter is passed, apply it; otherwise keep ctx.filter as 'none'.
  if (explicitFilterCss && explicitFilterCss !== 'none') {
    ctx.filter = explicitFilterCss;
  } else {
    ctx.filter = 'none';
  }
  drawImageCover(ctx, img, dx, dy, dw, dh);
  ctx.filter = 'none';

  // Apply procedural film grain only when requested (export mode)
  if (applyGrain) {
    const pattern = getNoisePattern(ctx);
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillRect(dx, dy, dw, dh);
    }
  }

  ctx.restore();
}

// ─── Main Component ───────────────────────────────────────
export default function CanvasEditor({
  frames,
  allFrames,
  layout,
  initialPreset,
  onAutoUpload,
  onShare,
  onReset,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  // Phase 3: animated BTS strip video state
  const [btsProgress, setBtsProgress] = useState<number | null>(null);
  const [btsNeedsTap, setBtsNeedsTap] = useState(false);
  const [btsError, setBtsError] = useState<string | null>(null);
  const btsBusyRef = useRef(false);
  const btsCacheRef = useRef<{ key: string; blob: Blob } | null>(null);
  const hasBtsClips = frames.some((f) => !!f.clip);


  const dragState = useRef<{
    id: string;
    startMX: number;
    startMY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const textDragState = useRef<{
    layer: 'main' | 'sub';
    startMX: number;
    startMY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'style' | 'stickers'>('style');
  const initialActivePreset: FramePreset =
    initialPreset ||
    (layout === 'grid2x3' ? 'birthdayCatPink' : layout === 'grid2x2' ? 'retroTerracotta' : 'birthday');
  const initialConfig = getPresetTextConfig(initialActivePreset);

  const [preset, setPreset] = useState<FramePreset>(initialActivePreset);
  const activeTextConfig = getPresetTextConfig(preset);
  const [location, setLocation] = useState('SEOUL STUDIO');
  const [nowPlaying, setNowPlaying] = useState('NewJeans - Hype Boy');

  // Multi-layer Independent Text Engine (Phase 5)
  const [selectedTextLayer, setSelectedTextLayer] = useState<'main' | 'sub'>('main');
  const [customTextInput, setCustomTextInput] = useState(initialConfig.defaultText);
  const [customText, setCustomText] = useState(initialConfig.defaultText);
  const [subTextInput, setSubTextInput] = useState(initialConfig.defaultSubText ?? '21');
  const [subText, setSubText] = useState(initialConfig.defaultSubText ?? '21');
  const [customFont, setCustomFont] = useState(initialConfig.fontFamily);
  const [customColor, setCustomColor] = useState(initialConfig.color);

  // Main Caption coordinates, scale & rotation
  const [textXPct, setTextXPct] = useState<number>(
    initialConfig.hasCustomText ? initialConfig.xPercent : 50
  );
  const [textYPct, setTextYPct] = useState<number>(
    initialConfig.hasCustomText ? initialConfig.yPercent : 90
  );
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [mainRotation, setMainRotation] = useState<number>(0);

  // Sub-text / Age coordinates, scale & rotation
  const [subTextXPct, setSubTextXPct] = useState<number>(
    initialConfig.hasCustomText ? initialConfig.xPercent : 50
  );
  const [subTextYPct, setSubTextYPct] = useState<number>(
    initialConfig.hasCustomText
      ? (initialConfig.subYPercent ?? Math.min(97, Number((initialConfig.yPercent + 3.2).toFixed(1))))
      : 94.5
  );
  const [subFontScale, setSubFontScale] = useState<number>(1.0);
  const [subRotation, setSubRotation] = useState<number>(0);

  const [photoFilter, setPhotoFilter] = useState<PhotoFilterId>('normal');
  const [isTextActive, setIsTextActive] = useState<'main' | 'sub' | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number>(0);
  const [birthdayTheme, setBirthdayTheme] = useState<'cream' | 'black'>('cream');
  const [birthdayPalette, setBirthdayPalette] = useState<BirthdayPaletteId>('ivory');
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [activeStickerID, setActiveStickerID] = useState<string | null>(null);
  const [stickerThumbnails, setStickerThumbnails] = useState<Record<string, string>>({});

  // Debounce text inputs to keep UI snappy and prevent canvas re-render thrashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomText(customTextInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [customTextInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSubText(subTextInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [subTextInput]);

  const placedStickersRef = useRef<PlacedSticker[]>(placedStickers);
  useEffect(() => {
    placedStickersRef.current = placedStickers;
  }, [placedStickers]);

  const isRenderingRef = useRef(false);
  const exportLockRef = useRef(false);
  const hasRenderedRef = useRef(false);
  const lastExportBlobRef = useRef<Blob | null>(null);
  const locationRef = useRef(location);
  const nowPlayingRef = useRef(nowPlaying);
  const customTextRef = useRef(customText);
  const subTextRef = useRef(subText);
  const customFontRef = useRef(customFont);
  const customColorRef = useRef(customColor);
  const textXPctRef = useRef(textXPct);
  const textYPctRef = useRef(textYPct);
  const fontScaleRef = useRef(fontScale);
  const mainRotationRef = useRef(mainRotation);
  const subTextXPctRef = useRef(subTextXPct);
  const subTextYPctRef = useRef(subTextYPct);
  const subFontScaleRef = useRef(subFontScale);
  const subRotationRef = useRef(subRotation);
  const photoFilterRef = useRef<PhotoFilterId>(photoFilter);
  const birthdayNameRef = useRef(customText);
  const birthdayThemeRef = useRef(birthdayTheme);
  const birthdayAgeRef = useRef(subText);
  const birthdayPaletteRef = useRef(birthdayPalette);

  locationRef.current = location;
  nowPlayingRef.current = nowPlaying;
  customTextRef.current = customText;
  subTextRef.current = subText;
  customFontRef.current = customFont;
  customColorRef.current = customColor;
  textXPctRef.current = textXPct;
  textYPctRef.current = textYPct;
  fontScaleRef.current = fontScale;
  mainRotationRef.current = mainRotation;
  subTextXPctRef.current = subTextXPct;
  subTextYPctRef.current = subTextYPct;
  subFontScaleRef.current = subFontScale;
  subRotationRef.current = subRotation;
  photoFilterRef.current = photoFilter;
  birthdayNameRef.current = customText;
  birthdayThemeRef.current = birthdayTheme;
  birthdayAgeRef.current = subText;
  birthdayPaletteRef.current = birthdayPalette;

  // Dynamically observe preview container height to maintain pixel-perfect font scaling
  useEffect(() => {
    if (!previewWrapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setPreviewHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(previewWrapRef.current);
    return () => observer.disconnect();
  }, [previewUrl]);

  // Pre-key all sticker images & preload custom PNG frame and curated fonts on mount
  useEffect(() => {
    let mounted = true;
    preloadAllStickers(STICKER_DEFS).then((map) => {
      if (mounted) {
        setStickerThumbnails(map);
      }
    });
    preloadAllCuratedFonts();
    loadBirthdayCatPinkFrame().catch(() => {});
    loadRetroTerracottaFrame().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Global drag listeners for placed stickers & draggable text layer with requestAnimationFrame throttling
  useEffect(() => {
    let animationFrameId: number | null = null;
    const wrapEl = previewWrapRef.current;

    // Dedicated non-passive touchmove on the preview container to safely prevent browser scroll during drag
    const handleContainerTouchMove = (e: TouchEvent) => {
      if ((dragState.current || textDragState.current) && e.cancelable) {
        e.preventDefault();
      }
    };

    if (wrapEl) {
      wrapEl.addEventListener('touchmove', handleContainerTouchMove, { passive: false });
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if ((!dragState.current && !textDragState.current) || !previewWrapRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (animationFrameId !== null) return;

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        if (!previewWrapRef.current) return;

        const rect = previewWrapRef.current.getBoundingClientRect();

        // 1. Sticker drag
        if (dragState.current) {
          const dx = (clientX - dragState.current.startMX) / rect.width;
          const dy = (clientY - dragState.current.startMY) / rect.height;

          setPlacedStickers((prev) =>
            prev.map((s) =>
              s.id === dragState.current!.id
                ? {
                    ...s,
                    xPct: Math.max(0.05, Math.min(0.95, dragState.current!.startXPct + dx)),
                    yPct: Math.max(0.05, Math.min(0.95, dragState.current!.startYPct + dy)),
                  }
                : s
            )
          );
        }

        // 2. Draggable Text Layer drag with clamping (5% - 95%)
        if (textDragState.current) {
          const dxPct = ((clientX - textDragState.current.startMX) / rect.width) * 100;
          const dyPct = ((clientY - textDragState.current.startMY) / rect.height) * 100;

          const clampedX = Math.max(
            5,
            Math.min(95, Number((textDragState.current.startXPct + dxPct).toFixed(1)))
          );
          const clampedY = Math.max(
            5,
            Math.min(95, Number((textDragState.current.startYPct + dyPct).toFixed(1)))
          );

          if (textDragState.current.layer === 'main') {
            setTextXPct(clampedX);
            setTextYPct(clampedY);
          } else {
            setSubTextXPct(clampedX);
            setSubTextYPct(clampedY);
          }
        }
      });
    };

    const handleUp = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      dragState.current = null;
      textDragState.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (wrapEl) {
        wrapEl.removeEventListener('touchmove', handleContainerTouchMove);
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  // Proportional Dimensions: Downscaled for preview, 2x Retina for export
  const getDimensions = useCallback(
    (isExport: boolean = false) => {
      if (preset === 'birthdayCatPink') {
        if (isExport) {
          return { w: CAT_PINK_BASE_W, h: CAT_PINK_BASE_H, s: 1.0 };
        }
        const previewW = 390;
        return {
          w: previewW,
          h: Math.round((previewW / CAT_PINK_BASE_W) * CAT_PINK_BASE_H),
          s: previewW / CAT_PINK_BASE_W,
        };
      }
      if (preset === 'retroTerracotta') {
        if (isExport) {
          return { w: RETRO_BASE_W, h: RETRO_BASE_H, s: 1.0 };
        }
        const previewW = 390;
        return {
          w: previewW,
          h: Math.round((previewW / RETRO_BASE_W) * RETRO_BASE_H),
          s: previewW / RETRO_BASE_W,
        };
      }
      if (layout === 'grid2x3') {
        // Other presets on the 6-shot layout keep the plain 1181 × 1772 canvas
        if (isExport) return { w: CAT_PINK_BASE_W, h: CAT_PINK_FRAME_H, s: 1.0 };
        return { w: 390, h: 585, s: 390 / CAT_PINK_BASE_W };
      }
      if (isExport) {
        // High-DPI print-ready 300 DPI base: 1200×3600 strip4 (1:3), 1200×2800 strip3, 1200×1200 grid
        if (layout === 'grid2x2') return { w: 1200, h: 1200, s: 1.2 };
        if (layout === 'strip4') return { w: 1200, h: 3600, s: 2.31 };
        return { w: 1200, h: 2800, s: 2.31 }; // strip3
      } else {
        // Downscaled interactive preview canvas — exactly 1:1 proportional with export
        if (layout === 'grid2x2') return { w: 400, h: 400, s: 0.4 };
        if (layout === 'strip4') return { w: 390, h: 1170, s: 0.75 };
        return { w: 390, h: 910, s: 0.75 }; // strip3
      }
    },
    [layout, preset]
  );

  // ═══════════════════════════════════════════════════════
  //  PRESET RENDERERS (PROCEDURAL ACCENTS)
  // ═══════════════════════════════════════════════════════

  // 1. Retro Cinema Ticket Birthday (OURstudio Korean Aesthetic) 🎟️
  const drawCinemaTicketBirthday = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: SlotImage[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
      filterCss?: string,
    ) => {
      try {
        await loadCuteBirthdayFonts();
      } catch (e) {
        console.warn('Font loading fallback:', e);
      }

      const palette = BIRTHDAY_PALETTES[birthdayPaletteRef.current] ?? BIRTHDAY_PALETTES.ivory;
      const bg = palette.bg;
      const muted = palette.muted;
      const borderCol = palette.accent + '44';

      // Slim top margin — name & age live in the footer only
      const headerH = Math.round(h * (layout === 'grid2x2' ? 0.06 : 0.055));
      const footerH = Math.round(h * (layout === 'grid2x2' ? 0.18 : 0.20));
      const pad = Math.round(w * 0.09);
      const gap = Math.round(w * 0.035);

      ctx.save();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── Crisp Photo Frames ──
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;
      const cornerRadius = 4 * s;

      if (layout === 'grid2x2') {
        const cw = (w - pad * 2 - gap) / 2;
        const ch = (h - headerH - footerH - gap) / 2;
        const pos = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ];
        for (let i = 0; i < 4; i++) {
          if (!imgs[i]) continue;
          const [c2, r] = pos[i];
          const ix = pad + c2 * (cw + gap);
          const iy = headerH + r * (ch + gap);
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, cornerRadius, isExport, filterCss);
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 1 * s;
          roundRect(ctx, ix, iy, cw, ch, cornerRadius);
          ctx.stroke();
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, cornerRadius, isExport, filterCss);
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 1 * s;
          roundRect(ctx, pad, iy, iw, ih, cornerRadius);
          ctx.stroke();
        }
      }

      // ── Footer: guest name + age as Korean sticker type, then date ──
      const footerStartY = h - footerH;

      ctx.save();
      ctx.fillStyle = muted;
      ctx.font = `500 ${8.5 * s}px Inter, -apple-system, sans-serif`;
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${2 * s}px`;
      ctx.textAlign = 'center';
      ctx.fillText(fmtSimpleDate(), w / 2, footerStartY + footerH * 0.62);
      ctx.restore();

      // Subtle minimalist barcode accent
      const barW = 100 * s;
      const barH = 10 * s;
      drawBarcode(ctx, w / 2 - barW / 2, footerStartY + footerH * 0.72, barW, barH, muted);

      // Clean subtle watermark at the very bottom
      drawHaloLunaWatermark(ctx, w, footerStartY + footerH * 0.86, muted, s);

      ctx.restore();
    },
    [layout]
  );

  // 3. Birthday Cat Pink 6-Shot Custom PNG Frame Template 🐱🎂
  const drawBirthdayCatPink = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: SlotImage[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
      filterCss?: string,
    ) => {
      try {
        await loadCuteBirthdayFonts();
      } catch (e) {
        console.warn('Font loading fallback:', e);
      }

      // Slot coordinates are expressed in the native PNG's pixel space; the
      // canvas is taller than the artwork to make room for the caption band.
      const baseW = CAT_PINK_BASE_W;
      const scaleX = w / baseW;
      const scaleY = h / CAT_PINK_BASE_H;
      const artH = CAT_PINK_ART_H * scaleY;

      // 6 photo cutout slots (2 columns × 3 rows) with slight bleed under frame borders
      const SLOTS_6 = [
        // Left Column (top to bottom)
        { x: 30,  y: 38,   w: 536, h: 460 },
        { x: 30,  y: 530,  w: 536, h: 464 },
        { x: 30,  y: 1026, w: 536, h: 460 },
        // Right Column (top to bottom - staggered vertically)
        { x: 622, y: 290,  w: 540, h: 460 },
        { x: 622, y: 782,  w: 540, h: 460 },
        { x: 622, y: 1274, w: 540, h: 464 },
      ];

      // LAYER 1: Photos (drawn into cutout slots behind the frame)
      // Blush base matches the artwork exactly so the caption band is seamless
      ctx.save();
      ctx.fillStyle = CAT_PINK_BLUSH;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 6; i++) {
        const img = imgs[i] || imgs[i % imgs.length];
        if (!img) continue;

        const slot = SLOTS_6[i];
        const dx = Math.round(slot.x * scaleX);
        const dy = Math.round(slot.y * scaleY);
        const dw = Math.round(slot.w * scaleX);
        const dh = Math.round(slot.h * scaleY);

        // Anti-distortion center-crop
        drawGradedPhoto(ctx, img, dx, dy, dw, dh, 0, isExport, filterCss);
      }
      ctx.restore();

      // LAYER 2: Transparent PNG Frame Overlay (Guaranteed safe fallback)
      try {
        const frameImg = await loadBirthdayCatPinkFrame();
        if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
          // Crop the artwork's faded bottom rows so it meets the band cleanly
          const srcH = Math.round(frameImg.naturalHeight * (CAT_PINK_ART_H / CAT_PINK_FRAME_H));
          ctx.drawImage(frameImg, 0, 0, frameImg.naturalWidth, srcH, 0, 0, w, artH);
        } else {
          console.warn('[HaloLuna] Frame overlay loaded with 0 width, using fallback');
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 8 * scaleX;
          ctx.strokeRect(10 * scaleX, 10 * scaleY, w - 20 * scaleX, artH - 20 * scaleY);
        }
      } catch (frameErr) {
        console.warn('[HaloLuna] Frame overlay load error (drawing fallback frame):', frameErr);
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 8 * scaleX;
        ctx.strokeRect(10 * scaleX, 10 * scaleY, w - 20 * scaleX, artH - 20 * scaleY);
      }

      // Guest name/age is burned in renderToCanvas AFTER this preset so export
      // and preview share the exact same pixels.

      // Tiny watermark tucked into the bottom-right of the band
      ctx.save();
      const wmx = w - 36 * scaleX;
      const wmy = h - 8 * scaleY;
      ctx.fillStyle = 'rgba(159, 18, 57, 0.45)';
      ctx.font = `500 ${7.5 * scaleX}px Inter, -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('haloluna • gethaloluna.com', wmx, wmy);
      ctx.restore();
    },
    []
  );

  const drawRetroTerracotta = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: SlotImage[],
      w: number,
      h: number,
      _s: number,
      isExport: boolean = false,
      filterCss?: string,
    ) => {
      const scaleX = w / RETRO_BASE_W;
      const scaleY = h / RETRO_BASE_H;

      ctx.fillStyle = '#C74913';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < RETRO_SLOTS.length; i++) {
        const img = imgs[i] || imgs[i % Math.max(imgs.length, 1)];
        if (!img) continue;
        const slot = RETRO_SLOTS[i];
        drawGradedPhoto(
          ctx,
          img,
          Math.round(slot.x * scaleX),
          Math.round(slot.y * scaleY),
          Math.round(slot.w * scaleX),
          Math.round(slot.h * scaleY),
          0,
          isExport,
          filterCss,
        );
      }

      try {
        const frameImg = await loadRetroTerracottaFrame();
        if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
          ctx.drawImage(frameImg, 0, 0, w, h);
        }
      } catch (err) {
        console.warn('[HaloLuna] Retro terracotta overlay failed:', err);
      }
    },
    []
  );

  // 7. 35mm Film Strip (Classic)
  const drawFilm = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: SlotImage[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
      filterCss?: string,
    ) => {
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(0, 0, w, h);
      const spW = 40 * s;
      const sH = 24 * s;
      const sGap = 28 * s;
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

      ['left', 'right'].forEach((side) => {
        let sy = 28 * s;
        while (sy < h - sH) {
          const sx = side === 'left' ? 10 * s : w - spW + 4 * s;
          roundRect(ctx, sx, sy, spW - 14 * s, sH, 3 * s);
          ctx.fillStyle = '#060606';
          ctx.fill();
          ctx.strokeStyle = '#2A2A2A';
          ctx.lineWidth = 1 * s;
          ctx.stroke();
          sy += sH + sGap;
        }
      });

      const fX = spW + 6 * s;
      const fW2 = w - spW * 2 - 12 * s;
      const metaH = 30 * s;
      const frameH = (h - 16 * s) / count;

      for (let i = 0; i < count; i++) {
        const fy = 8 * s + i * frameH;
        const photoH = frameH - metaH - 4 * s;

        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(fX, fy, fW2, metaH);
        ctx.fillStyle = '#E8890A';
        ctx.font = `bold ${10 * s}px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`FRAME ${String(i + 1).padStart(2, '0')}A`, fX + 8 * s, fy + 13 * s);
        ctx.fillStyle = '#888888';
        ctx.font = `400 ${8.5 * s}px "Courier New", monospace`;
        ctx.fillText('ISO 400 • 35mm', fX + 8 * s, fy + 24 * s);

        if (imgs[i]) {
          drawGradedPhoto(ctx, imgs[i], fX, fy + metaH, fW2, photoH, 0, isExport, filterCss);
          ctx.save();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = '#FF6B00';
          ctx.fillRect(fX, fy + metaH, fW2, photoH);
          ctx.restore();
        }
      }

      ctx.fillStyle = 'rgba(232, 137, 10, 0.6)';
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(SIGNATURE, w / 2, h - 14 * s);
    },
    [layout]
  );

  // ═══════════════════════════════════════════════════════
  //  STICKER COMPOSITING ON HIGH-DPI CANVAS (EXPORT ONLY)
  // ═══════════════════════════════════════════════════════
  const compositePlacedStickers = useCallback(
    async (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const stickers = placedStickersRef.current;
      if (stickers.length === 0) return;

      for (const st of stickers) {
        const keyed = getKeyedStickerSync(st.src) || (await getKeyedSticker(st.src, st.name));
        if (!keyed) continue;

        const sW = st.scale * w * 0.22;
        const sH = (sW / keyed.width) * keyed.height;
        const sx = st.xPct * w - sW / 2;
        const sy = st.yPct * h - sH / 2;

        ctx.drawImage(keyed.canvas, sx, sy, sW, sH);
      }
    },
    []
  );

  // ═══════════════════════════════════════════════════════
  //  NON-BLOCKING RENDER PIPELINE
  // ═══════════════════════════════════════════════════════
  const burnGuestCaption = useCallback(
    async (ctx: CanvasRenderingContext2D, w: number, h: number, s: number) => {
      await loadCuteBirthdayFonts();
      const name = birthdayNameRef.current;
      const age = birthdayAgeRef.current;
      if (!name && !age) return;

      let centerY = h - Math.round(h * 0.075);
      let scale = s;
      let nameSize = 44 * s;
      let ageSize = 26 * s;
      let maxWidth = w * 0.84;

      if (preset === 'birthdayCatPink') {
        const scaleX = w / CAT_PINK_BASE_W;
        const artH = CAT_PINK_ART_H * (h / CAT_PINK_BASE_H);
        centerY = artH + (h - artH) / 2;
        scale = scaleX;
        nameSize = 96 * scaleX;
        ageSize = 46 * scaleX;
      } else if (preset === 'retroTerracotta') {
        const scaleX = w / RETRO_BASE_W;
        centerY = RETRO_CAPTION_Y * (h / RETRO_BASE_H);
        scale = scaleX;
        nameSize = 78 * scaleX;
        ageSize = 40 * scaleX;
        maxWidth = w * 0.88;
      }

      drawKoreanStickerCaption(
        ctx,
        name,
        age,
        w / 2,
        centerY,
        maxWidth,
        scale,
        '#FF69B4',
        '#FF69B4',
        nameSize,
        ageSize,
      );
    },
    [preset]
  );

  const renderToCanvas = useCallback(
    async (
      isExport: boolean = false,
      liveOpts?: { canvas: HTMLCanvasElement; w: number; h: number; s: number; slots: SlotImage[] },
    ): Promise<{ dataUrl: string; blob: Blob } | null> => {
      if (frames.length === 0) return null;

      try {
        const { w, h, s } = liveOpts ?? getDimensions(isExport);
        // Offscreen master — never share pixels with a concurrent preview pass
        const canvas = liveOpts ? liveOpts.canvas : document.createElement('canvas');
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const effectiveFrames =
          preset === 'birthdayCatPink' && allFrames && allFrames.length >= 6
            ? allFrames
            : frames;

        const imgs: SlotImage[] = liveOpts ? liveOpts.slots : await Promise.all(
          effectiveFrames.map(
            (f) =>
              new Promise<HTMLImageElement>((resolve) => {
                const img = new Image();
                const timer = setTimeout(() => {
                  const fb = new Image();
                  fb.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                  resolve(fb);
                }, 3000);
                img.onload = () => {
                  clearTimeout(timer);
                  resolve(img);
                };
                img.onerror = () => {
                  clearTimeout(timer);
                  const fb = new Image();
                  fb.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                  resolve(fb);
                };
                img.src = f.dataUrl;
              })
          )
        );

        const activeFilterPreset =
          PHOTO_FILTER_PRESETS.find((p) => p.id === photoFilterRef.current) ?? PHOTO_FILTER_PRESETS[0];
        const activeFilterCss = activeFilterPreset.css;

        switch (preset) {
          case 'birthdayCatPink':
            await drawBirthdayCatPink(ctx, imgs, w, h, s, isExport, activeFilterCss);
            break;
          case 'retroTerracotta':
            await drawRetroTerracotta(ctx, imgs, w, h, s, isExport, activeFilterCss);
            break;
          case 'film35mm':
            await drawFilm(ctx, imgs, w, h, s, isExport, activeFilterCss);
            break;
          case 'birthday':
          default:
            await drawCinemaTicketBirthday(ctx, imgs, w, h, s, isExport, activeFilterCss);
            break;
        }

        if (isExport || liveOpts) {
          await compositePlacedStickers(ctx, w, h);

          // ── PRD v2 Phase 5: Multi-Layer Independent Draggable Text & Rotation Engine ──
          const activeTextConfig = getPresetTextConfig(preset);
          if (activeTextConfig.hasCustomText) {
            const mainText = (customTextRef.current || '').trim();
            const subRaw = (subTextRef.current || '').trim();
            const subTextToDraw = formatSubText(subRaw);

            if (mainText || subTextToDraw) {
              const activeFont = customFontRef.current || activeTextConfig.fontFamily;
              const activeColor = customColorRef.current || activeTextConfig.color;
              const fontObj = getCuratedFont(activeFont);

              // Pre-flight font glyph rasterization to prevent font flash or coordinate shifting
              await ensureFontLoaded(fontObj.googleFontFamily);

              const isHeavy = fontObj.category === 'bubble' || fontObj.category === 'chunky';
              const isWhiteText = activeColor.toUpperCase() === '#FFFFFF';
              const strokeColor = isWhiteText ? 'rgba(0, 0, 0, 0.4)' : '#FFFFFF';

              // 1. Render Main Caption Layer (Independent Position & Rotation)
              if (mainText) {
                ctx.save();
                const mainX = (textXPctRef.current / 100) * w;
                const mainY = (textYPctRef.current / 100) * h;
                const mainScale = fontScaleRef.current || 1.0;
                const mainFontSize = Math.max(10, Math.round(activeTextConfig.fontSizeRatio * h * mainScale));
                const mainStrokeWidth = Math.max(2, mainFontSize * 0.14);
                const mainAngleRad = ((mainRotationRef.current || 0) * Math.PI) / 180;

                ctx.translate(mainX, mainY);
                if (mainAngleRad !== 0) {
                  ctx.rotate(mainAngleRad);
                }
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;

                ctx.font = `${isHeavy ? '900' : '700'} ${mainFontSize}px ${fontObj.fontFamily}`;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = mainStrokeWidth;
                ctx.strokeText(mainText, 0, 0);

                ctx.fillStyle = activeColor;
                ctx.fillText(mainText, 0, 0);
                ctx.restore();
              }

              // 2. Render Sub-text / Age Layer (Independent Position & Rotation)
              if (subTextToDraw) {
                ctx.save();
                const subX = (subTextXPctRef.current / 100) * w;
                const subY = (subTextYPctRef.current / 100) * h;
                const subScale = subFontScaleRef.current || 1.0;
                const baseSubRatio = activeTextConfig.fontSizeRatio * 0.65;
                const subFontSize = Math.max(10, Math.round(baseSubRatio * h * subScale));
                const subStrokeWidth = Math.max(1.5, subFontSize * 0.12);
                const subAngleRad = ((subRotationRef.current || 0) * Math.PI) / 180;

                ctx.translate(subX, subY);
                if (subAngleRad !== 0) {
                  ctx.rotate(subAngleRad);
                }
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;

                ctx.font = `${isHeavy ? '900' : '700'} ${subFontSize}px ${fontObj.fontFamily}`;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = subStrokeWidth;
                ctx.strokeText(subTextToDraw, 0, 0);

                ctx.fillStyle = activeColor;
                ctx.fillText(subTextToDraw, 0, 0);
                ctx.restore();
              }
            }
          }
        }

        if (liveOpts) return { dataUrl: '', blob: new Blob() };

        const dataUrl = canvas.toDataURL('image/png');
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (!blob) return null;
        lastExportBlobRef.current = isExport ? blob : lastExportBlobRef.current;

        return { dataUrl, blob };
      } catch (err) {
        console.error('Non-blocking canvas render error:', err);
        return null;
      }
    },
    [
      frames,
      allFrames,
      preset,
      getDimensions,
      drawBirthdayCatPink,
      drawRetroTerracotta,
      drawCinemaTicketBirthday,
      drawFilm,
      compositePlacedStickers,
    ]
  );

  const triggerRender = useCallback(async (silent = false) => {
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    if (!silent) setRenderProgress(15);
    try {
      await yieldToMain();
      if (!silent) setRenderProgress(45);
      const result = await renderToCanvas(false);
      if (!silent) setRenderProgress(90);
      await yieldToMain();
      if (result?.dataUrl) {
        setPreviewUrl(result.dataUrl);
        if (!hasRenderedRef.current) {
          playPrintSound(700);
        }
        hasRenderedRef.current = true;
      }
    } catch (e) {
      console.error('triggerRender error:', e);
    } finally {
      if (!silent) setRenderProgress(null);
      isRenderingRef.current = false;
    }
  }, [renderToCanvas]);

  // Full preview only when the strip itself changes — never on each caption keystroke
  useEffect(() => {
    if (frames.length > 0) {
      triggerRender(false);
    }
  }, [frames, preset, layout, birthdayPalette, triggerRender]);

  // Quiet caption & text layer refresh: keep the existing preview on screen while we redraw
  useEffect(() => {
    if (!hasRenderedRef.current) return;
    const timer = setTimeout(() => {
      void triggerRender(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [
    customText,
    subText,
    customFont,
    customColor,
    mainRotation,
    subRotation,
    fontScale,
    subFontScale,
    triggerRender,
  ]);

  // Real-time photo filter refresh: update preview quietly and immediately
  useEffect(() => {
    if (!hasRenderedRef.current) return;
    void triggerRender(true);
  }, [photoFilter, triggerRender]);

  const waitForRenderIdle = async () => {
    let spins = 0;
    while ((isRenderingRef.current || exportLockRef.current) && spins < 80) {
      await new Promise((r) => setTimeout(r, 40));
      spins += 1;
    }
  };

  const exportCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    try {
      await waitForRenderIdle();
      exportLockRef.current = true;
      const result = await renderToCanvas(true);
      if (!result?.blob) {
        console.error("ADMIN UPLOAD ERROR: renderToCanvas returned null");
        return null;
      }
      lastExportBlobRef.current = result.blob;
      return result.blob;
    } catch (err) {
      console.error("ADMIN UPLOAD ERROR: exportCanvasBlob failed", err);
      return null;
    } finally {
      exportLockRef.current = false;
    }
  }, [renderToCanvas]);

  // ─── Task 2.2: Debounced Background Sync ─────────────────────────────────
  // Rules:
  //   • 700 ms quiet period after the last preset / previewUrl change before upload.
  //   • Rapid frame switches cancel the previous debounce timer (clearTimeout).
  //   • Each new upload attempt increments syncGenRef; stale closures detect they
  //     are outdated (gen !== syncGenRef.current) and silently bail out without
  //     triggering any error UI.
  //   • All failures are console.warn only — ZERO blocking toasts.
  //   • Download button is completely independent (Phase 0 — untouched).
  const syncGenRef = useRef(0);

  useEffect(() => {
    if (!previewUrl) return; // nothing rendered yet — skip

    // Increment generation; any closure captured before this will self-abort.
    const gen = ++syncGenRef.current;

    const timer = setTimeout(async () => {
      // Stale check: another change arrived before the debounce fired.
      if (gen !== syncGenRef.current) return;

      try {
        await waitForRenderIdle();

        // Second stale check after render idle wait
        if (gen !== syncGenRef.current) return;

        const blob = await exportCanvasBlob();
        if (!blob || blob.size === 0) {
          console.warn('[HaloLuna] Background sync: empty blob for preset', preset, '— skipping');
          return;
        }

        // Final stale check before network I/O
        if (gen !== syncGenRef.current) return;

        const isBirthday = preset === 'birthday' || preset === 'birthdayCatPink';
        const uploadOptions = {
          templateType: preset,
          locationTag:  locationRef.current || 'HaloLuna Studio',
          guestName:    customTextRef.current || '',
          guestAge:     birthdayAgeRef.current || '',
        };

        if (onAutoUpload) {
          onAutoUpload(blob, preset, true);
        } else {
          // Fire-and-forget — result is logged but never surfaces to the user
          savePhotoToSupabase(blob, uploadOptions).then((res) => {
            if (res.success) {
              console.log('[HaloLuna] Background sync ✓ preset:', preset,
                '| photoId:', res.id,
                '| sessionId:', res.sessionId ?? '—');
            } else {
              console.warn('[HaloLuna] Background sync soft-failed (non-fatal):', res.error);
            }
          });
        }
      } catch (err) {
        // Silently swallow — cloud failure must never surface to the user
        console.warn('[HaloLuna] Background sync error (non-fatal):', err);
      }
    }, 700); // 700 ms debounce — rapid preset flipping cancels previous timer

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, previewUrl]); // intentionally minimal deps — refs are always current

  // Re-render when preset changes
  const handlePresetSelect = (newPreset: FramePreset) => {
    if (newPreset === preset) return;
    const newConfig = getPresetTextConfig(newPreset);
    if (!newConfig.hasCustomText) {
      setCustomTextInput('');
      setCustomText('');
      setSubTextInput('');
      setSubText('');
      setFontScale(1.0);
      setSubFontScale(1.0);
      setMainRotation(0);
      setSubRotation(0);
      setIsTextActive(null);
    } else {
      const defaultSubY =
        newConfig.subYPercent ?? Math.min(97, Number((newConfig.yPercent + 3.2).toFixed(1)));
      setTextXPct(newConfig.xPercent);
      setTextYPct(newConfig.yPercent);
      setFontScale(1.0);
      setMainRotation(0);

      setSubTextXPct(newConfig.xPercent);
      setSubTextYPct(defaultSubY);
      setSubFontScale(1.0);
      setSubRotation(0);

      setCustomFont(newConfig.fontFamily);
      setCustomColor(newConfig.color);
      setCustomTextInput(newConfig.defaultText);
      setCustomText(newConfig.defaultText);
      setSubTextInput(newConfig.defaultSubText ?? '');
      setSubText(newConfig.defaultSubText ?? '');
      setIsTextActive(null);
    }
    setPreset(newPreset);
  };

  // ─── Phase 0 Fix: Decoupled Local Download Handler ───────────────────────
  // The local download NEVER awaits Supabase. Cloud sync is fire-and-forget
  // in a fully isolated void block. Any cloud failure is silently logged and
  // NEVER blocks, delays, or errors the native file download.
  const handleDownload = async () => {
    // ── Step 1: Render the high-resolution export canvas ──────────────────
    setRenderProgress(10);
    let result: { dataUrl: string; blob: Blob } | null = null;
    try {
      await yieldToMain();
      setRenderProgress(40);
      result = await renderToCanvas(true);
      setRenderProgress(90);
      await yieldToMain();
    } catch (renderErr) {
      console.error('[HaloLuna] Download render error:', renderErr);
      setRenderProgress(null);
      return; // canvas failed entirely — nothing to download
    }

    setRenderProgress(null);

    if (!result || !result.dataUrl) {
      console.error('[HaloLuna] Download aborted: renderToCanvas returned no data.');
      return;
    }

    // ── Step 2: Mobile/iOS → native share sheet (Save Image); else anchor download — NO Supabase here ───
    const stripFileName = `haloluna-${preset}-${Date.now()}.png`;
    const shareOutcome = await tryNativeShare(result.blob, stripFileName);
    if (shareOutcome === 'unsupported' || shareOutcome === 'blocked') {
      try {
        const link = document.createElement('a');
        link.download = `haloluna-${preset}-${Date.now()}.png`;
        link.href = result.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (downloadErr) {
        console.error('[HaloLuna] Native download trigger failed:', downloadErr);
        // Attempt URL.createObjectURL fallback
        try {
          const objectUrl = URL.createObjectURL(result.blob);
          const fallbackLink = document.createElement('a');
          fallbackLink.download = `haloluna-${preset}-${Date.now()}.png`;
          fallbackLink.href = objectUrl;
          document.body.appendChild(fallbackLink);
          fallbackLink.click();
          document.body.removeChild(fallbackLink);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (fallbackErr) {
          console.error('[HaloLuna] Fallback download also failed:', fallbackErr);
        }
      }
    }

    // ── Step 3: Fire-and-forget cloud sync (NEVER blocks the download) ─────
    // Captured in a void IIFE so it runs independently. Any error here is
    // silently logged and has zero effect on the user's downloaded file.
    void (async () => {
      try {
        if (!result || result.blob.size === 0) return;
        const isBirthday = preset === 'birthday' || preset === 'birthdayCatPink';
        if (onAutoUpload) {
          onAutoUpload(result.blob, preset, true);
        } else {
          await savePhotoToSupabase(result.blob, {
            templateType: preset,
            locationTag:  locationRef.current || 'HaloLuna Studio',
            guestName:    customTextRef.current || '',
            guestAge:     birthdayAgeRef.current || '',
          });
        }
      } catch (syncErr) {
        // Cloud sync failure is intentionally swallowed — local download already succeeded.
        console.warn('[HaloLuna] Cloud sync after download failed (non-fatal):', syncErr);
      }
    })();
  };

  // ── Phase 3: Animated photostrip BTS video ──
  // Every pose clip loops inside its frame slot while the real frame artwork,
  // stickers and caption text are redrawn around it each tick. That canvas is
  // recorded with captureStream() + MediaRecorder, so the output is the whole
  // framed strip in motion (not the raw camera feed).
  const buildBtsKey = () =>
    JSON.stringify([
      preset,
      layout,
      photoFilterRef.current,
      customTextRef.current,
      subTextRef.current,
      customFontRef.current,
      customColorRef.current,
      birthdayPaletteRef.current,
      locationRef.current,
      nowPlayingRef.current,
      textXPctRef.current,
      textYPctRef.current,
      fontScaleRef.current,
      mainRotationRef.current,
      subTextXPctRef.current,
      subTextYPctRef.current,
      subFontScaleRef.current,
      subRotationRef.current,
      placedStickersRef.current.map((st) => [st.id, st.xPct, st.yPct, st.scale]),
      frames.map((f) => f.dataUrl.length),
    ]);

  const generateBtsVideo = async (): Promise<Blob | null> => {
    const effectiveFrames =
      preset === 'birthdayCatPink' && allFrames && allFrames.length >= 6 ? allFrames : frames;

    const probe = document.createElement('canvas') as HTMLCanvasElement & {
      captureStream?: (fps?: number) => MediaStream;
    };
    if (typeof probe.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return null;
    }

    // Output size: export proportions, capped at 540px wide (even dimensions for H.264)
    const exp = getDimensions(true);
    const k = Math.min(1, 540 / exp.w);
    const w = Math.max(2, Math.round((exp.w * k) / 2) * 2);
    const h = Math.max(2, Math.round((exp.h * k) / 2) * 2);
    const s = exp.s * k;

    const SLOT_PX = 360;
    const hasNativeFilter = isCanvasFilterSupported();
    const objectUrls: string[] = [];

    type LiveSlot = {
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      video: HTMLVideoElement | null;
      frame: CapturedFrame;
    };

    const loadStill = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve(null), 3000);
        img.onload = () => {
          clearTimeout(timer);
          resolve(img);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        img.src = src;
      });

    const slots: LiveSlot[] = await Promise.all(
      effectiveFrames.map(async (f) => {
        const canvas = document.createElement('canvas');
        canvas.width = SLOT_PX;
        canvas.height = SLOT_PX;
        const sctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        // Always seed with the still so photos without a clip (uploads) still render
        const still = await loadStill(f.dataUrl);
        if (still) drawImageCover(sctx, still, 0, 0, SLOT_PX, SLOT_PX);

        let video: HTMLVideoElement | null = null;
        if (f.clip && f.clip.blob.size > 0) {
          const url = URL.createObjectURL(f.clip.blob);
          objectUrls.push(url);
          const v = document.createElement('video');
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.setAttribute('playsinline', '');
          v.src = url;
          const ready = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(false), 4000);
            v.onloadeddata = () => {
              clearTimeout(timer);
              resolve(true);
            };
            v.onerror = () => {
              clearTimeout(timer);
              resolve(false);
            };
          });
          if (ready) video = v;
        }
        return { canvas, ctx: sctx, video, frame: f };
      })
    );

    const paintSlot = (slot: LiveSlot) => {
      const v = slot.video;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const size = Math.min(v.videoWidth, v.videoHeight);
      const ox = (v.videoWidth - size) / 2;
      const oy = (v.videoHeight - size) / 2;
      const c = slot.ctx;
      c.save();
      if (slot.frame.clip?.mirrored) {
        c.translate(SLOT_PX, 0);
        c.scale(-1, 1);
      }
      c.filter = hasNativeFilter ? getFilterCss(slot.frame.filter) : 'none';
      c.drawImage(v, ox, oy, size, size, 0, 0, SLOT_PX, SLOT_PX);
      c.restore();
      c.filter = 'none';
      if (!hasNativeFilter) applyPixelFilter(c, slot.frame.filter, SLOT_PX, SLOT_PX);
    };

    const out = document.createElement('canvas');
    const liveOpts = { canvas: out, w, h, s, slots: slots.map((sl) => sl.canvas) as SlotImage[] };

    const cleanup = () => {
      slots.forEach((sl) => {
        if (sl.video) {
          sl.video.pause();
          sl.video.removeAttribute('src');
          sl.video.load();
        }
      });
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };

    try {
      const maxClipMs = Math.max(0, ...effectiveFrames.map((f) => f.clip?.durationMs ?? 0));
      const durationMs = Math.min(12000, Math.max(3000, maxClipMs));

      await Promise.all(slots.map((sl) => sl.video?.play().catch(() => undefined)));
      slots.forEach(paintSlot);
      // Draw one full frame BEFORE recording starts so the first video frame is never blank
      await renderToCanvas(false, liveOpts);

      const stream = (out as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
      const mime = getOptimalVideoMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          ...(mime ? { mimeType: mime } : {}),
          videoBitsPerSecond: 4_000_000,
        });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start(250);

      const t0 = performance.now();
      const FRAME_MS = 1000 / 24;
      while (performance.now() - t0 < durationMs) {
        const tickStart = performance.now();
        slots.forEach(paintSlot);
        await renderToCanvas(false, liveOpts);
        setBtsProgress(Math.min(99, Math.round(((tickStart - t0) / durationMs) * 100)));
        const spent = performance.now() - tickStart;
        await new Promise<void>((r) => setTimeout(r, Math.max(0, FRAME_MS - spent)));
      }

      recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());

      const type = recorder.mimeType || mime || 'video/webm';
      const blob = new Blob(chunks, { type });
      return blob.size > 0 ? blob : null;
    } finally {
      cleanup();
    }
  };

  const handleDownloadBts = async () => {
    if (btsBusyRef.current || !hasBtsClips) return;
    setBtsError(null);

    const key = buildBtsKey();
    let blob = btsCacheRef.current?.key === key ? btsCacheRef.current.blob : null;

    if (!blob) {
      btsBusyRef.current = true;
      setBtsProgress(0);
      try {
        blob = await generateBtsVideo();
      } catch (err) {
        console.error('[HaloLuna] BTS strip video render failed:', err);
        blob = null;
      } finally {
        btsBusyRef.current = false;
        setBtsProgress(null);
      }
      if (!blob) {
        setBtsError('Could not render the BTS video on this browser.');
        return;
      }
      btsCacheRef.current = { key, blob };
    }

    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `HaloLuna-BTS-${Date.now()}.${ext}`;
    const outcome = await tryNativeShare(blob, fileName);
    if (outcome === 'shared' || outcome === 'cancelled') {
      setBtsNeedsTap(false);
      return;
    }
    if (outcome === 'blocked') {
      // Rendering took longer than the browser's tap window: the video is cached,
      // so the next tap shares instantly with a fresh user gesture.
      setBtsNeedsTap(true);
      return;
    }
    setBtsNeedsTap(false);
    anchorDownloadBlob(blob, fileName);
  };

  // 9:16 Mobile Lockscreen Wallpaper Generator
  const handleMakeWallpaper = async () => {
    await waitForRenderIdle();
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(35);
      const result = await renderToCanvas(true);
      setRenderProgress(70);
      await yieldToMain();
      if (!result) return;

      const stripImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = result.dataUrl;
      });

      // Target Mobile Screen (9:16 ratio) - Standard high-res 1080 x 1920 px
      const wallW = 1080;
      const wallH = 1920;
      const wallCanvas = document.createElement('canvas');
      wallCanvas.width = wallW;
      wallCanvas.height = wallH;
      const wCtx = wallCanvas.getContext('2d');
      if (!wCtx) return;

      // Fill background with selected palette color (or sweet blush pink for Birthday Cat Pink)
      const isCatPink = preset === 'birthdayCatPink';
      const palette = BIRTHDAY_PALETTES[birthdayPaletteRef.current] ?? BIRTHDAY_PALETTES.ivory;
      const wallBg = isCatPink ? '#FFF0F5' : palette.bg;
      const wallFg = isCatPink ? '#831843' : palette.fg;
      wCtx.fillStyle = wallBg;
      wCtx.fillRect(0, 0, wallW, wallH);

      // Subtle atmospheric radial gradient
      const grad = wCtx.createRadialGradient(
        wallW / 2,
        wallH * 0.45,
        wallW * 0.05,
        wallW / 2,
        wallH * 0.45,
        wallW * 0.9
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
      wCtx.fillStyle = grad;
      wCtx.fillRect(0, 0, wallW, wallH);

      // Scale photostrip to fit comfortably on screen (~75% of height)
      const targetH = Math.round(wallH * 0.75);
      const targetW = Math.round((stripImg.width / stripImg.height) * targetH);
      const posX = Math.round((wallW - targetW) / 2);
      const posY = Math.round((wallH - targetH) / 2 + 25);

      // Deep realistic drop shadow
      wCtx.save();
      wCtx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      wCtx.shadowBlur = 48;
      wCtx.shadowOffsetX = 0;
      wCtx.shadowOffsetY = 22;

      wCtx.drawImage(stripImg, posX, posY, targetW, targetH);
      wCtx.restore();

      // Top lockscreen branding
      wCtx.save();
      wCtx.fillStyle = wallFg;
      wCtx.globalAlpha = 0.55;
      wCtx.font = '600 20px Inter, sans-serif';
      wCtx.textAlign = 'center';
      wCtx.fillText('✦  HALOLUNA STUDIO  ✦', wallW / 2, posY - 36);

      // Bottom lockscreen details
      wCtx.globalAlpha = 0.5;
      wCtx.font = '400 17px Inter, sans-serif';
      wCtx.fillText('gethaloluna.com • 9:16 lockscreen', wallW / 2, wallH - 46);
      wCtx.restore();

      setRenderProgress(95);
      await yieldToMain();

      const wallpaperUrl = wallCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `haloluna-wallpaper-${Date.now()}.png`;
      link.href = wallpaperUrl;
      link.click();

      if (result.blob.size > 0) {
        console.log('[HaloLuna] Action Save: Updating session on wallpaper export for preset', preset);
        const isBirthdayWall = preset === 'birthday' || preset === 'birthdayCatPink';
        if (onAutoUpload) {
          onAutoUpload(result.blob, preset, true);
        } else {
          savePhotoToSupabase(result.blob, {
            templateType: preset,
            locationTag:  locationRef.current || 'HaloLuna Studio',
            guestName:    customTextRef.current || '',
            guestAge:     birthdayAgeRef.current || '',
          }).catch((err) => console.warn('[HaloLuna] Wallpaper sync failed (non-fatal):', err));
        }
      }
    } catch (err) {
      console.error('Wallpaper export failed:', err);
    } finally {
      setRenderProgress(null);
      isRenderingRef.current = false;
    }
  };

  // Share Handler (Full High-Resolution Export)
  const handleShareClick = async () => {
    await waitForRenderIdle();
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(45);
      const result = await renderToCanvas(true);
      setRenderProgress(95);
      await yieldToMain();
      if (!result) return;
      onShare(result.blob, preset);
    } catch (err) {
      console.error('Share export failed:', err);
    } finally {
      setRenderProgress(null);
      isRenderingRef.current = false;
    }
  };

  // ── Sticker Operations ──────────────────────────────────
  const addSticker = (def: (typeof STICKER_DEFS)[0]) => {
    const newSticker: PlacedSticker = {
      id: uuidv4(),
      name: def.name,
      src: def.src,
      xPct: 0.5,
      yPct: 0.5,
      scale: 1.0,
    };
    setPlacedStickers((prev) => [...prev, newSticker]);
    setActiveStickerID(newSticker.id);
  };

  const removeSticker = (id: string) => {
    setPlacedStickers((prev) => prev.filter((s) => s.id !== id));
    if (activeStickerID === id) setActiveStickerID(null);
  };

  const scaleSticker = (id: string, delta: number) => {
    setPlacedStickers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, scale: Math.max(0.4, Math.min(2.5, Number((s.scale + delta).toFixed(2)))) }
          : s
      )
    );
  };

  const handleStickerPointerDown = (
    e: React.MouseEvent | React.TouchEvent,
    id: string,
  ) => {
    e.stopPropagation();
    setIsTextActive(null);
    setActiveStickerID(id);
    const st = placedStickers.find((s) => s.id === id);
    if (!st) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragState.current = {
      id,
      startMX: clientX,
      startMY: clientY,
      startXPct: st.xPct,
      startYPct: st.yPct,
    };
  };

  const handleTextPointerDown = (
    e: React.MouseEvent | React.TouchEvent,
    layer: 'main' | 'sub' = 'main'
  ) => {
    e.stopPropagation();
    setActiveStickerID(null);
    setIsTextActive(layer);
    setSelectedTextLayer(layer);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    textDragState.current = {
      layer,
      startMX: clientX,
      startMY: clientY,
      startXPct: layer === 'main' ? textXPctRef.current : subTextXPctRef.current,
      startYPct: layer === 'main' ? textYPctRef.current : subTextYPctRef.current,
    };
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Tab Switcher: Frame Style vs Sticker Drawer */}
      <div className="flex border-b border-zinc-200 bg-white rounded-t-xl overflow-hidden p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'style'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Palette size={14} />
          Frame Themes
        </button>
        <button
          onClick={() => setActiveTab('stickers')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'stickers'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Sticker size={14} />
          Sticker Drawer {placedStickers.length > 0 && `(${placedStickers.length})`}
        </button>
      </div>

      {/* ── STYLE TAB ── */}
      {activeTab === 'style' && (
        <div className="flex flex-col gap-5">
          {/* Cute Themes Picker */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles size={13} className="text-amber-500" />
              <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest">
                Cute Aesthetic Themes
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FRAME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`p-3 text-left rounded-xl border transition-all flex items-center gap-3 ${
                    preset === p.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]'
                      : 'bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-400 hover:bg-zinc-50/80 shadow-sm'
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <p className="text-xs font-bold leading-tight">{p.label}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${
                        preset === p.id ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {p.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Photo Filters & Tone Presets (Phase 5 Task 5.4) ── */}
          <div className="p-3.5 bg-white rounded-xl border border-zinc-200/90 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Contrast size={14} className="text-zinc-700" />
                <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                  Photo Filters & Tone
                </p>
              </div>
              <span className="text-[9.5px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                {PHOTO_FILTER_PRESETS.find((f) => f.id === photoFilter)?.tag}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {PHOTO_FILTER_PRESETS.map((f) => {
                const isSelected = photoFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPhotoFilter(f.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center relative group ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm scale-[1.02]'
                        : 'bg-zinc-50/70 hover:bg-zinc-100/90 text-zinc-700 border-zinc-200/80 hover:border-zinc-300'
                    }`}
                    title={`${f.label} (${f.tag}): ${f.desc}`}
                  >
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black/15 shadow-xs mb-1.5 flex items-center justify-center shrink-0"
                      style={{ background: f.previewBg }}
                    >
                      {isSelected && (
                        <Check
                          size={11}
                          className={f.id === 'bw' || f.id === 'vintage' ? 'text-white' : 'text-zinc-900'}
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    <span className="text-[10.5px] sm:text-xs font-bold leading-tight truncate w-full">
                      {f.label}
                    </span>
                    <span
                      className={`text-[8.5px] sm:text-[9.5px] leading-tight truncate w-full mt-0.5 ${
                        isSelected ? 'text-zinc-300' : 'text-zinc-400'
                      }`}
                    >
                      {f.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── PRD v2 Phase 5: Percentage-Based Text Config & Curated Font Layer ── */}
          {activeTextConfig.hasCustomText && (
            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-4 bg-gradient-to-br from-amber-50/70 via-white to-pink-50/70 rounded-xl border border-amber-200/90 shadow-sm flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Type size={14} className="text-amber-600" />
                  <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                    Text Engine (Multi-Layer)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                    {getCuratedFont(customFont).badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultSubY =
                        activeTextConfig.subYPercent ?? Math.min(97, Number((activeTextConfig.yPercent + 3.2).toFixed(1)));
                      setCustomTextInput(activeTextConfig.defaultText);
                      setCustomText(activeTextConfig.defaultText);
                      setSubTextInput(activeTextConfig.defaultSubText ?? '');
                      setSubText(activeTextConfig.defaultSubText ?? '');
                      setCustomFont(activeTextConfig.fontFamily);
                      setCustomColor(activeTextConfig.color);
                      setTextXPct(activeTextConfig.xPercent);
                      setTextYPct(activeTextConfig.yPercent);
                      setFontScale(1.0);
                      setMainRotation(0);
                      setSubTextXPct(activeTextConfig.xPercent);
                      setSubTextYPct(defaultSubY);
                      setSubFontScale(1.0);
                      setSubRotation(0);
                      setIsTextActive(null);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
                    title="Reset semua layer teks ke pengaturan bawaan preset"
                  >
                    <RotateCcw size={10} />
                    <span>Reset Semua</span>
                  </button>
                </div>
              </div>

              {/* Layer Selector Switcher: Caption Utama vs Sub-text/Usia */}
              <div className="flex rounded-lg bg-zinc-100/90 p-0.5 border border-zinc-200/90">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTextLayer('main');
                    setIsTextActive('main');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    selectedTextLayer === 'main'
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Type size={12} className={selectedTextLayer === 'main' ? 'text-amber-600' : 'text-zinc-400'} />
                  <span>Caption Utama</span>
                  {customTextInput.trim() && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTextLayer('sub');
                    setIsTextActive('sub');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    selectedTextLayer === 'sub'
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Sparkles size={12} className={selectedTextLayer === 'sub' ? 'text-amber-600' : 'text-zinc-400'} />
                  <span>Sub-text / Usia</span>
                  {subTextInput.trim() && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </button>
              </div>

              {/* ── LAYER 1: Caption Utama Controls ── */}
              {selectedTextLayer === 'main' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                      Teks Caption Utama
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="guest-caption"
                        autoComplete="off"
                        value={customTextInput}
                        onChange={(e) => setCustomTextInput(e.target.value)}
                        onFocus={() => setIsTextActive('main')}
                        placeholder={activeTextConfig.defaultText || 'Type your caption...'}
                        maxLength={40}
                        className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 pr-8 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                      />
                      {customTextInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTextInput('');
                            setCustomText('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                          title="Clear caption"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-zinc-400 font-mono">Quick:</span>
                      {[activeTextConfig.defaultText, 'Andi', 'Hollie', 'Luna', 'Forever', 'Smile']
                        .filter((item, idx, arr) => item && arr.indexOf(item) === idx)
                        .map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => {
                              setCustomTextInput(sug);
                              setCustomText(sug);
                            }}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all ${
                              customTextInput === sug
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white border-zinc-200 hover:border-zinc-400 text-zinc-600'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Position & Drag Coordinates with Reset Posisi Button */}
                  <div className="flex items-center justify-between bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/80 text-[10.5px]">
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <Move size={12} className="text-amber-700" />
                      <span>
                        Posisi: <strong>X: {textXPct}%</strong>, <strong>Y: {textYPct}%</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTextXPct(activeTextConfig.xPercent);
                        setTextYPct(activeTextConfig.yPercent);
                        setFontScale(1.0);
                        setMainRotation(0);
                      }}
                      disabled={
                        textXPct === activeTextConfig.xPercent &&
                        textYPct === activeTextConfig.yPercent &&
                        fontScale === 1.0 &&
                        mainRotation === 0
                      }
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
                      title="Kembalikan posisi, ukuran, dan rotasi caption ke bawaan preset"
                    >
                      <RotateCcw size={10} />
                      <span>Reset Posisi</span>
                    </button>
                  </div>

                  {/* Font Size Control Slider */}
                  <div className="flex flex-col gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Type size={12} className="text-amber-700" />
                        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                          Font Size (Caption)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                          {fontScale.toFixed(2)}x ({Math.round(fontScale * 100)}%)
                        </span>
                        {fontScale !== 1.0 && (
                          <button
                            type="button"
                            onClick={() => setFontScale(1.0)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 transition-colors hover:underline"
                            title="Reset font size to 1.0x"
                          >
                            <RotateCcw size={9} />
                            <span>1.0x</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFontScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                        disabled={fontScale <= 0.5}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Perkecil font"
                      >
                        <Minus size={11} />
                      </button>

                      <input
                        type="range"
                        min={0.5}
                        max={2.5}
                        step={0.05}
                        value={fontScale}
                        onChange={(e) => setFontScale(parseFloat(e.target.value))}
                        className="flex-1 accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                      />

                      <button
                        type="button"
                        onClick={() => setFontScale((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
                        disabled={fontScale >= 2.5}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Perbesar font"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setFontScale(sc)}
                          className={`flex-1 py-0.5 text-[9.5px] font-mono rounded border transition-all ${
                            Math.abs(fontScale - sc) < 0.02
                              ? 'bg-zinc-900 text-white border-zinc-900 font-bold shadow-2xs'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                          }`}
                        >
                          {sc === 1.0 ? 'Normal (1x)' : `${sc}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rotation Slider Control */}
                  <div className="flex flex-col gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RotateCw size={12} className="text-amber-700" />
                        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                          Rotasi Sudut (Angle)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                          {mainRotation > 0 ? `+${mainRotation}°` : `${mainRotation}°`}
                        </span>
                        {mainRotation !== 0 && (
                          <button
                            type="button"
                            onClick={() => setMainRotation(0)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 transition-colors hover:underline"
                            title="Reset rotasi ke 0°"
                          >
                            <RotateCcw size={9} />
                            <span>0°</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setMainRotation((prev) => Math.max(-180, prev - 5))}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
                        title="Putar ke kiri (-5°)"
                      >
                        <Minus size={11} />
                      </button>

                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={mainRotation}
                        onChange={(e) => setMainRotation(parseInt(e.target.value, 10))}
                        className="flex-1 accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                      />

                      <button
                        type="button"
                        onClick={() => setMainRotation((prev) => Math.min(180, prev + 5))}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
                        title="Putar ke kanan (+5°)"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      {[-90, -15, 0, 15, 90].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setMainRotation(deg)}
                          className={`flex-1 py-0.5 text-[9.5px] font-mono rounded border transition-all ${
                            mainRotation === deg
                              ? 'bg-zinc-900 text-white border-zinc-900 font-bold shadow-2xs'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                          }`}
                        >
                          {deg === 0 ? '0° (Tegak)' : `${deg > 0 ? '+' : ''}${deg}°`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── LAYER 2: Sub-text / Usia Controls ── */}
              {selectedTextLayer === 'sub' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                      Teks Usia / Sub-text
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="guest-subtext"
                        autoComplete="off"
                        value={subTextInput}
                        onChange={(e) => setSubTextInput(e.target.value)}
                        onFocus={() => setIsTextActive('sub')}
                        placeholder="e.g. 21, Sweet 17, Forever Young, 2026.10.07"
                        maxLength={30}
                        className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 pr-8 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                      />
                      {subTextInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubTextInput('');
                            setSubText('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                          title="Clear sub-text"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-zinc-400 font-mono">Quick:</span>
                      {['21', '17', '20', '25', 'Forever', 'Besties', 'Sweet 17', 'Love']
                        .map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => {
                              setSubTextInput(sug);
                              setSubText(sug);
                            }}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all ${
                              subTextInput === sug
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white border-zinc-200 hover:border-zinc-400 text-zinc-600'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Position & Drag Coordinates with Reset Posisi Button */}
                  <div className="flex items-center justify-between bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/80 text-[10.5px]">
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <Move size={12} className="text-amber-700" />
                      <span>
                        Posisi: <strong>X: {subTextXPct}%</strong>, <strong>Y: {subTextYPct}%</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultSubY =
                          activeTextConfig.subYPercent ?? Math.min(97, Number((activeTextConfig.yPercent + 3.2).toFixed(1)));
                        setSubTextXPct(activeTextConfig.xPercent);
                        setSubTextYPct(defaultSubY);
                        setSubFontScale(1.0);
                        setSubRotation(0);
                      }}
                      disabled={
                        subTextXPct === activeTextConfig.xPercent &&
                        subTextYPct === (activeTextConfig.subYPercent ?? Math.min(97, Number((activeTextConfig.yPercent + 3.2).toFixed(1)))) &&
                        subFontScale === 1.0 &&
                        subRotation === 0
                      }
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
                      title="Kembalikan posisi, ukuran, dan rotasi sub-text ke bawaan preset"
                    >
                      <RotateCcw size={10} />
                      <span>Reset Posisi</span>
                    </button>
                  </div>

                  {/* Font Size Control Slider */}
                  <div className="flex flex-col gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Type size={12} className="text-amber-700" />
                        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                          Font Size (Sub-text)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                          {subFontScale.toFixed(2)}x ({Math.round(subFontScale * 100)}%)
                        </span>
                        {subFontScale !== 1.0 && (
                          <button
                            type="button"
                            onClick={() => setSubFontScale(1.0)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 transition-colors hover:underline"
                            title="Reset font size to 1.0x"
                          >
                            <RotateCcw size={9} />
                            <span>1.0x</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSubFontScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                        disabled={subFontScale <= 0.5}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Perkecil font"
                      >
                        <Minus size={11} />
                      </button>

                      <input
                        type="range"
                        min={0.5}
                        max={2.5}
                        step={0.05}
                        value={subFontScale}
                        onChange={(e) => setSubFontScale(parseFloat(e.target.value))}
                        className="flex-1 accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                      />

                      <button
                        type="button"
                        onClick={() => setSubFontScale((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
                        disabled={subFontScale >= 2.5}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Perbesar font"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setSubFontScale(sc)}
                          className={`flex-1 py-0.5 text-[9.5px] font-mono rounded border transition-all ${
                            Math.abs(subFontScale - sc) < 0.02
                              ? 'bg-zinc-900 text-white border-zinc-900 font-bold shadow-2xs'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                          }`}
                        >
                          {sc === 1.0 ? 'Normal (1x)' : `${sc}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rotation Slider Control */}
                  <div className="flex flex-col gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RotateCw size={12} className="text-amber-700" />
                        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                          Rotasi Sudut (Angle)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                          {subRotation > 0 ? `+${subRotation}°` : `${subRotation}°`}
                        </span>
                        {subRotation !== 0 && (
                          <button
                            type="button"
                            onClick={() => setSubRotation(0)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 transition-colors hover:underline"
                            title="Reset rotasi ke 0°"
                          >
                            <RotateCcw size={9} />
                            <span>0°</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSubRotation((prev) => Math.max(-180, prev - 5))}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
                        title="Putar ke kiri (-5°)"
                      >
                        <Minus size={11} />
                      </button>

                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={subRotation}
                        onChange={(e) => setSubRotation(parseInt(e.target.value, 10))}
                        className="flex-1 accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                      />

                      <button
                        type="button"
                        onClick={() => setSubRotation((prev) => Math.min(180, prev + 5))}
                        className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
                        title="Putar ke kanan (+5°)"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      {[-90, -15, 0, 15, 90].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setSubRotation(deg)}
                          className={`flex-1 py-0.5 text-[9.5px] font-mono rounded border transition-all ${
                            subRotation === deg
                              ? 'bg-zinc-900 text-white border-zinc-900 font-bold shadow-2xs'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                          }`}
                        >
                          {deg === 0 ? '0° (Tegak)' : `${deg > 0 ? '+' : ''}${deg}°`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Curated Font Catalog Selector */}
              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                  Curated Font Catalog
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {CURATED_FONTS.map((font) => {
                    const isSelected =
                      customFont === font.googleFontFamily ||
                      customFont.toLowerCase() === font.id.toLowerCase();
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setCustomFont(font.googleFontFamily)}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 ring-2 ring-zinc-900/20 shadow-xs'
                            : 'bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-400 hover:bg-zinc-50'
                        }`}
                      >
                        <span
                          className="text-xs truncate block font-bold leading-tight"
                          style={{ fontFamily: font.fontFamily }}
                        >
                          {font.name}
                        </span>
                        <span
                          className={`text-[9px] mt-1 truncate block ${
                            isSelected ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          {font.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Color Swatches & Custom Color Picker */}
              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                  Text Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Hot Pink', value: '#FF69B4' },
                    { label: 'Coral Rose', value: '#FF5E7E' },
                    { label: 'Pure White', value: '#FFFFFF' },
                    { label: 'Noir Black', value: '#1C1C1E' },
                    { label: 'Warm Amber', value: '#F59E0B' },
                    { label: 'Sage Green', value: '#7C8B6A' },
                    { label: 'Burgundy', value: '#6B1D2F' },
                    { label: 'Cobalt Blue', value: '#3B82F6' },
                  ].map((colorItem) => {
                    const isSelected =
                      customColor.toUpperCase() === colorItem.value.toUpperCase();
                    return (
                      <button
                        key={colorItem.value}
                        type="button"
                        onClick={() => setCustomColor(colorItem.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center shadow-xs ${
                          isSelected
                            ? 'ring-2 ring-zinc-900 scale-110 border-white'
                            : 'border-zinc-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: colorItem.value }}
                        title={colorItem.label}
                      >
                        {isSelected && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            className={
                              colorItem.value === '#FFFFFF'
                                ? 'text-zinc-900'
                                : 'text-white'
                            }
                          />
                        )}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer border border-zinc-300 overflow-hidden"
                      title="Custom HEX Color Picker"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {customColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aesthetic Solid Color Palette Selector (hidden for custom PNG frame) */}
              {preset === 'birthday' && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                    Aesthetic Color Palette
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'burgundy', label: 'Burgundy',      color: '#6B1D2F', text: '#F5E6E8' },
                      { id: 'espresso', label: 'Warm Espresso', color: '#4A3528', text: '#F0E8DF' },
                      { id: 'sage',     label: 'Sage Green',    color: '#7C8B6A', text: '#F3F5EE' },
                      { id: 'pink',     label: 'Baby Pink',     color: '#E8B4B8', text: '#4A1522' },
                      { id: 'ivory',    label: 'Cream / Ivory', color: '#F7F4EB', text: '#2A2826' },
                      { id: 'charcoal', label: 'Deep Charcoal', color: '#1C1C1E', text: '#E8DFCE' },
                    ] as const).map((pal) => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setBirthdayPalette(pal.id)}
                        className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all shadow-xs ${
                          birthdayPalette === pal.id
                            ? 'border-zinc-900 ring-2 ring-zinc-900/30 shadow-md scale-[1.04]'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                        style={{ backgroundColor: pal.color, color: pal.text }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: pal.color }} />
                        <span className="truncate w-full text-center">{pal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Editable Custom Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Custom Location Stamp"
                className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-2.5 py-2 bg-zinc-50/50 outline-none focus:border-zinc-800 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Music size={13} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={nowPlaying}
                onChange={(e) => setNowPlaying(e.target.value)}
                placeholder="Now Playing: Song Title"
                className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-2.5 py-2 bg-zinc-50/50 outline-none focus:border-zinc-800 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STICKERS TAB ── */}
      {activeTab === 'stickers' && (
        <div className="flex flex-col gap-4">
          <div className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                Select Sticker to Add
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">
                Auto-Keyed (Transparent)
              </span>
            </div>

            {/* Sticker Tray */}
            <div className="grid grid-cols-5 gap-2.5">
              {STICKER_DEFS.map((def) => {
                const thumb = stickerThumbnails[def.name] || def.src;
                return (
                  <button
                    key={def.name}
                    onClick={() => addSticker(def)}
                    className="group relative aspect-square rounded-xl border border-zinc-200 bg-[#FBF9F5] hover:border-zinc-900 hover:shadow-md transition-all flex flex-col items-center justify-center p-2 active:scale-95"
                    title={`Add ${def.name} Sticker`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt={def.name}
                      className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[9px] font-semibold text-zinc-600 mt-1 capitalize">
                      {def.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Placed Stickers Controls */}
          {placedStickers.length > 0 && (
            <div className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  Placed Stickers ({placedStickers.length})
                </p>
                <button
                  onClick={() => setPlacedStickers([])}
                  className="text-[10px] text-red-500 font-medium hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {placedStickers.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveStickerID(s.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      activeStickerID === s.id
                        ? 'border-zinc-900 bg-zinc-100 font-bold'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">#{idx + 1}</span>
                      <span>{s.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => scaleSticker(s.id, -0.15)}
                        className="w-6 h-6 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-700"
                        title="Shrink sticker"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-[10px] font-mono w-9 text-center text-zinc-600">
                        {Math.round(s.scale * 100)}%
                      </span>
                      <button
                        onClick={() => scaleSticker(s.id, 0.15)}
                        className="w-6 h-6 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-700"
                        title="Enlarge sticker"
                      >
                        <Plus size={11} />
                      </button>
                      <button
                        onClick={() => removeSticker(s.id)}
                        className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center ml-1"
                        title="Remove sticker"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS & DEVELOPING INDICATOR ── */}
      {renderProgress !== null && !previewUrl && (
        <div className="w-full bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-800">
            Developing your memories... {renderProgress}%
          </p>
          <div className="w-64 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-3 border border-zinc-200">
            <div
              className="h-full bg-zinc-900 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-zinc-400 mt-2">
            Non-blocking canvas composite
          </p>
        </div>
      )}

      {/* ── PHOTO STRIP PREVIEW WITH DRAGGABLE STICKERS ── */}
      {previewUrl && (
        <div className="flex flex-col gap-4 items-center w-full">
          <div
            ref={previewWrapRef}
            className="relative w-full max-w-[340px] sm:max-w-[400px] border border-zinc-300/80 rounded-lg shadow-xl overflow-hidden bg-white select-none transition-shadow hover:shadow-2xl touch-none"
            style={{ touchAction: 'none' }}
            onClick={() => {
              setActiveStickerID(null);
              setIsTextActive(null);
            }}
          >
            {/* Rendered Base Photo Strip */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Generated photobooth strip"
              className="w-full block pointer-events-none"
              draggable={false}
            />

            {/* Lightweight CSS Blend Film Grain Overlay for Real-time Preview */}
            <div
              className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-25 z-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23noise)' opacity='0.35'/%3E%3C/svg%3E")`,
                backgroundSize: '120px 120px',
              }}
            />

            {/* Draggable Keyed Transparent Sticker Overlays */}
            {placedStickers.map((st) => {
              const thumb = stickerThumbnails[st.name] || st.src;
              const isActive = activeStickerID === st.id;
              return (
                <div
                  key={st.id}
                  onMouseDown={(e) => handleStickerPointerDown(e, st.id)}
                  onTouchStart={(e) => handleStickerPointerDown(e, st.id)}
                  className={`absolute cursor-grab active:cursor-grabbing select-none touch-none ${
                    isActive ? 'z-30' : 'z-20'
                  }`}
                  style={{
                    left: `${st.xPct * 100}%`,
                    top: `${st.yPct * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${st.scale * 22}%`,
                    touchAction: 'none',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={st.name}
                    className="w-full h-auto pointer-events-none drop-shadow-md"
                    draggable={false}
                  />

                  {/* Active Controls Ring */}
                  {isActive && (
                    <div className="absolute -inset-1 border-2 border-dashed border-zinc-900 rounded-lg pointer-events-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSticker(st.id);
                        }}
                        className="pointer-events-auto absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] shadow hover:bg-red-700 active:scale-95"
                        title="Delete sticker"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 1. Draggable & Rotatable Main Caption Layer */}
            {activeTextConfig.hasCustomText &&
              (customTextInput.trim() || customText.trim()) && (() => {
                const textStr = customTextInput.trim() || customText.trim();
                const curFont = getCuratedFont(customFont || activeTextConfig.fontFamily);
                const isHeavy = curFont.category === 'bubble' || curFont.category === 'chunky';
                const activeScale = fontScale || 1.0;
                const baseH = previewHeight > 0 ? previewHeight : layout === 'grid2x2' ? 380 : 850;
                const previewFontSize = Math.max(
                  10,
                  Math.round(baseH * activeTextConfig.fontSizeRatio * activeScale)
                );
                const isWhite =
                  (customColor || activeTextConfig.color).toUpperCase() === '#FFFFFF';
                const strokeColor = isWhite ? 'rgba(0, 0, 0, 0.45)' : '#FFFFFF';
                const strokeWidth = Math.max(1.5, Math.round(previewFontSize * 0.12));
                const isSelected = isTextActive === 'main';

                return (
                  <div
                    onMouseDown={(e) => handleTextPointerDown(e, 'main')}
                    onTouchStart={(e) => handleTextPointerDown(e, 'main')}
                    className={`absolute cursor-grab active:cursor-grabbing select-none touch-none text-center ${
                      isSelected ? 'z-30' : 'z-20'
                    }`}
                    style={{
                      left: `${textXPct}%`,
                      top: `${textYPct}%`,
                      transform: `translate(-50%, -50%) rotate(${mainRotation}deg)`,
                      transformOrigin: 'center center',
                      maxWidth: '92%',
                      touchAction: 'none',
                    }}
                  >
                    {/* Visual dashed bounding box indicator (rotates along with text angle) */}
                    {isSelected && (
                      <div className="absolute -inset-2 border-2 border-dashed border-amber-500 rounded-lg pointer-events-none shadow-xs">
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow pointer-events-none whitespace-nowrap">
                          <Move size={8} />
                          <span>Caption{mainRotation !== 0 ? ` (${mainRotation}°)` : ''}</span>
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        fontFamily: curFont.fontFamily,
                        fontWeight: isHeavy ? 900 : 700,
                        color: customColor || activeTextConfig.color,
                        fontSize: `${previewFontSize}px`,
                        lineHeight: 1.15,
                        WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
                        paintOrder: 'stroke fill',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {textStr}
                    </div>
                  </div>
                );
              })()}

            {/* 2. Draggable & Rotatable Sub-text / Age Layer */}
            {activeTextConfig.hasCustomText &&
              (subTextInput.trim() || subText.trim()) && (() => {
                const subRaw = subTextInput.trim() || subText.trim();
                const subStr = formatSubText(subRaw);
                const curFont = getCuratedFont(customFont || activeTextConfig.fontFamily);
                const isHeavy = curFont.category === 'bubble' || curFont.category === 'chunky';
                const activeScale = subFontScale || 1.0;
                const baseH = previewHeight > 0 ? previewHeight : layout === 'grid2x2' ? 380 : 850;
                const baseSubRatio = activeTextConfig.fontSizeRatio * 0.65;
                const previewFontSize = Math.max(
                  10,
                  Math.round(baseH * baseSubRatio * activeScale)
                );
                const isWhite =
                  (customColor || activeTextConfig.color).toUpperCase() === '#FFFFFF';
                const strokeColor = isWhite ? 'rgba(0, 0, 0, 0.45)' : '#FFFFFF';
                const strokeWidth = Math.max(1.2, Math.round(previewFontSize * 0.12));
                const isSelected = isTextActive === 'sub';

                return (
                  <div
                    onMouseDown={(e) => handleTextPointerDown(e, 'sub')}
                    onTouchStart={(e) => handleTextPointerDown(e, 'sub')}
                    className={`absolute cursor-grab active:cursor-grabbing select-none touch-none text-center ${
                      isSelected ? 'z-30' : 'z-20'
                    }`}
                    style={{
                      left: `${subTextXPct}%`,
                      top: `${subTextYPct}%`,
                      transform: `translate(-50%, -50%) rotate(${subRotation}deg)`,
                      transformOrigin: 'center center',
                      maxWidth: '92%',
                      touchAction: 'none',
                    }}
                  >
                    {/* Visual dashed bounding box indicator (rotates along with text angle) */}
                    {isSelected && (
                      <div className="absolute -inset-2 border-2 border-dashed border-amber-500 rounded-lg pointer-events-none shadow-xs">
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow pointer-events-none whitespace-nowrap">
                          <Move size={8} />
                          <span>Sub-text{subRotation !== 0 ? ` (${subRotation}°)` : ''}</span>
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        fontFamily: curFont.fontFamily,
                        fontWeight: isHeavy ? 900 : 700,
                        color: customColor || activeTextConfig.color,
                        fontSize: `${previewFontSize}px`,
                        lineHeight: 1.15,
                        WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
                        paintOrder: 'stroke fill',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subStr}
                    </div>
                  </div>
                );
              })()}
          </div>

          <p className="text-[11px] text-zinc-500 font-mono text-center">
            {activeTextConfig.hasCustomText || placedStickers.length > 0
              ? '💡 Tip: Click & drag text caption or stickers directly on the strip to reposition.'
              : 'Add cute stickers above to customize your strip!'}
          </p>

          {/* Export Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            <button
              onClick={handleDownload}
              className="btn-neo-dark flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all"
              title="Download uncompressed sharp photostrip PNG"
            >
              <Download size={16} />
              <span>Download Photostrip</span>
            </button>
            <button
              onClick={handleDownloadBts}
              disabled={!hasBtsClips || btsProgress !== null}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all border ${
                hasBtsClips
                  ? 'bg-zinc-800 hover:bg-zinc-900 text-amber-200 border-amber-500/30 disabled:opacity-70'
                  : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
              }`}
              title={
                hasBtsClips
                  ? 'Animated photostrip video (frame + stickers + text)'
                  : 'BTS video is available when capturing photos via live camera'
              }
            >
              <Video size={16} />
              <span>
                {btsProgress !== null
                  ? `Rendering BTS… ${btsProgress}%`
                  : btsNeedsTap
                  ? 'Tap to Save BTS Video'
                  : 'Download BTS Video'}
              </span>
            </button>
            <button
              onClick={handleMakeWallpaper}
              className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 hover:from-amber-700 hover:to-rose-800 text-white flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all border border-amber-400/30"
              title="Make 9:16 phone lockscreen wallpaper"
            >
              <Smartphone size={16} />
              <span>Make Wallpaper (9:16)</span>
            </button>
            <button
              onClick={handleShareClick}
              className="btn-neo flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all"
              title="Share / QR Code"
            >
              <QrCode size={16} />
              <span>Share</span>
            </button>
          </div>
          {btsError && (
            <p className="text-[11px] text-red-600 font-mono text-center">{btsError}</p>
          )}

          <div className="flex items-center justify-between w-full pt-2">
            <button
              onClick={() => triggerRender()}
              className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-4 transition-colors"
            >
              Re-render with changes
            </button>
            <button
              onClick={onReset}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={11} /> Start Over
            </button>
          </div>
        </div>
      )}

      {/* Render Strip Button when preview not yet rendered */}
      {!previewUrl && renderProgress === null && (
        <button
          onClick={() => triggerRender()}
          disabled={frames.length === 0}
          className="w-full btn-neo-dark flex items-center justify-center gap-2 py-4 text-sm font-bold rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} />
          Render & Style Memories
        </button>
      )}

      {/* Hidden Master Canvas */}
      <canvas ref={canvasRef} className="hidden touch-none" style={{ touchAction: 'none' }} />
    </div>
  );
}
