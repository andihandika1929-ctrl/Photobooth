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
} from 'lucide-react';
import { type FilterName } from './CameraViewport';
import { playPrintSound } from './AudioEngine';
import { v4 as uuidv4 } from 'uuid';
import { getKeyedSticker, getKeyedStickerSync, preloadAllStickers } from '@/utils/stickerCache';
import { savePhotoToSupabase } from '@/utils/supabasePhotoPipeline';

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
const FRAME_PRESETS: { id: FramePreset; label: string; emoji: string; desc: string }[] = [
  { id: 'birthdayCatPink', label: 'Birthday Cat Pink', emoji: '🐱', desc: 'Party cat, cake & 6-photo custom PNG' },
  { id: 'retroTerracotta', label: 'Retro Terracotta', emoji: '📎', desc: 'Scrapbook 4-cut with paperclips' },
  { id: 'birthday', label: 'Editorial Birthday', emoji: '🎂', desc: 'Clean Korean strip, name & age at the bottom' },
  { id: 'film35mm', label: '35mm Film Strip', emoji: '🎞', desc: 'Kodak sprockets & metadata' },
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
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

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
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const dstAspect = dw / dh;
  let sx: number, sy: number, sWidth: number, sHeight: number;
  if (imgAspect > dstAspect) {
    // Image is wider than destination — crop left/right
    sHeight = img.naturalHeight;
    sWidth = sHeight * dstAspect;
    sx = (img.naturalWidth - sWidth) / 2;
    sy = 0;
  } else {
    // Image is taller than destination — crop top/bottom
    sWidth = img.naturalWidth;
    sHeight = sWidth / dstAspect;
    sx = 0;
    sy = (img.naturalHeight - sHeight) / 2;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
}

function drawGradedPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
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
  const lastUploadedPresetRef = useRef<string | null>(null);

  const dragState = useRef<{
    id: string;
    startMX: number;
    startMY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'style' | 'stickers'>('style');
  const [preset, setPreset] = useState<FramePreset>(
    initialPreset ||
      (layout === 'grid2x3' ? 'birthdayCatPink' : layout === 'grid2x2' ? 'retroTerracotta' : 'birthday')
  );
  const [location, setLocation] = useState('SEOUL STUDIO');
  const [nowPlaying, setNowPlaying] = useState('NewJeans - Hype Boy');
  const [birthdayNameInput, setBirthdayNameInput] = useState('');
  const [birthdayName, setBirthdayName] = useState('');
  const [birthdayTheme, setBirthdayTheme] = useState<'cream' | 'black'>('cream');
  const [birthdayAge, setBirthdayAge] = useState('');
  const [birthdayPalette, setBirthdayPalette] = useState<BirthdayPaletteId>('ivory');
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [activeStickerID, setActiveStickerID] = useState<string | null>(null);
  const [stickerThumbnails, setStickerThumbnails] = useState<Record<string, string>>({});

  // Debounce birthday title input to keep UI snappy and prevent canvas re-render thrashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setBirthdayName(birthdayNameInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [birthdayNameInput]);

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
  const birthdayNameRef = useRef(birthdayName);
  const birthdayThemeRef = useRef(birthdayTheme);
  const birthdayAgeRef = useRef(birthdayAge);
  const birthdayPaletteRef = useRef(birthdayPalette);
  locationRef.current = location;
  nowPlayingRef.current = nowPlaying;
  birthdayNameRef.current = birthdayName;
  birthdayThemeRef.current = birthdayTheme;
  birthdayAgeRef.current = birthdayAge;
  birthdayPaletteRef.current = birthdayPalette;

  // Pre-key all sticker images & preload custom PNG frame on mount into in-memory cache
  useEffect(() => {
    let mounted = true;
    preloadAllStickers(STICKER_DEFS).then((map) => {
      if (mounted) {
        setStickerThumbnails(map);
      }
    });
    loadBirthdayCatPinkFrame().catch(() => {});
    loadRetroTerracottaFrame().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Global drag listeners for placed stickers with requestAnimationFrame throttling
  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragState.current || !previewWrapRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (animationFrameId !== null) return;

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        if (!dragState.current || !previewWrapRef.current) return;

        const rect = previewWrapRef.current.getBoundingClientRect();
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
      });
    };

    const handleUp = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      dragState.current = null;
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
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
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
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
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, cornerRadius, isExport);
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
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, cornerRadius, isExport);
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
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
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
        drawGradedPhoto(ctx, img, dx, dy, dw, dh, 0, isExport);
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
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      _s: number,
      isExport: boolean = false,
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
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
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
          drawGradedPhoto(ctx, imgs[i], fX, fy + metaH, fW2, photoH, 0, isExport);
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
    async (isExport: boolean = false): Promise<{ dataUrl: string; blob: Blob } | null> => {
      if (frames.length === 0) return null;

      try {
        const { w, h, s } = getDimensions(isExport);
        // Offscreen master — never share pixels with a concurrent preview pass
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const effectiveFrames =
          preset === 'birthdayCatPink' && allFrames && allFrames.length >= 6
            ? allFrames
            : frames;

        const imgs = await Promise.all(
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

        switch (preset) {
          case 'birthdayCatPink':
            await drawBirthdayCatPink(ctx, imgs, w, h, s, isExport);
            break;
          case 'retroTerracotta':
            await drawRetroTerracotta(ctx, imgs, w, h, s, isExport);
            break;
          case 'film35mm':
            await drawFilm(ctx, imgs, w, h, s, isExport);
            break;
          case 'birthday':
          default:
            await drawCinemaTicketBirthday(ctx, imgs, w, h, s, isExport);
            break;
        }

        if (isExport) {
          await compositePlacedStickers(ctx, w, h);
        }

        // ── Draw Name & Age natively onto canvas BEFORE export ──
        {
          const guestName = birthdayNameRef.current || '';
          const guestAge = birthdayAgeRef.current || '';

          if (guestName || guestAge) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;

            // Name line
            if (guestName) {
              ctx.font = `bold ${50 * s}px Caveat, cursive`;
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 6 * s;
              ctx.strokeText(guestName, w / 2, h - 30 * s);
              ctx.fillStyle = '#FF69B4';
              ctx.fillText(guestName, w / 2, h - 30 * s);
            }

            // Age line (e.g. "21st", "29th")
            if (guestAge) {
              const num = parseInt(guestAge, 10);
              const j = num % 10;
              const k = num % 100;
              const suffix =
                j === 1 && k !== 11 ? 'st' : j === 2 && k !== 12 ? 'nd' : j === 3 && k !== 13 ? 'rd' : 'th';
              const ageLabel = `${num}${suffix}`;
              ctx.font = `bold ${30 * s}px Caveat, cursive`;
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 4 * s;
              ctx.strokeText(ageLabel, w / 2, h - 10 * s);
              ctx.fillStyle = '#FF69B4';
              ctx.fillText(ageLabel, w / 2, h - 10 * s);
            }

            ctx.restore();
          }
        }

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

  // Quiet caption refresh: keep the existing preview on screen while we redraw
  useEffect(() => {
    if (!hasRenderedRef.current) return;
    const timer = setTimeout(() => {
      void triggerRender(true);
    }, 450);
    return () => clearTimeout(timer);
  }, [birthdayName, birthdayAge, triggerRender]);

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

  // Auto-sync to cloud when canvas visually changes (debounced)
  useEffect(() => {
    if (!previewUrl) return;

    const timer = setTimeout(async () => {
      try {
        console.log('[HaloLuna] Auto-Sync: exporting canvas blob for preset', preset);
        const blob = await exportCanvasBlob();
        if (blob && blob.size > 0) {
          if (onAutoUpload) {
            onAutoUpload(blob, preset, true); // isActionSave = true forces upsert in page.tsx
          } else {
            savePhotoToSupabase(blob, preset, locationRef.current || 'HaloLuna Studio')
              .catch((err) => console.error("ADMIN UPLOAD ERROR:", err));
          }
        } else {
          console.error("ADMIN UPLOAD ERROR: Auto-sync blob was null or empty");
        }
      } catch (err) {
        console.error("ADMIN UPLOAD ERROR: Auto-sync failed:", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [previewUrl, preset, onAutoUpload, exportCanvasBlob]);

  // Re-render when preset or frameColor changes
  const handlePresetSelect = (newPreset: FramePreset) => {
    if (newPreset === preset) return;
    setPreset(newPreset);
  };

  // Download Handler (Full High-Resolution Export + Action Save to Supabase)
  const handleDownload = async () => {
    await waitForRenderIdle();
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(45);
      const result = await renderToCanvas(true);
      setRenderProgress(95);
      await yieldToMain();
      if (!result) {
        console.error("ADMIN UPLOAD ERROR: Download render returned null");
        return;
      }

      const link = document.createElement('a');
      link.download = `haloluna-${preset}-${Date.now()}.png`;
      link.href = result.dataUrl;
      link.click();

      if (result.blob.size > 0) {
        console.log('[HaloLuna] Action Save: Updating session on download for preset', preset);
        if (onAutoUpload) {
          onAutoUpload(result.blob, preset, true);
        } else {
          savePhotoToSupabase(result.blob, preset, locationRef.current || 'HaloLuna Studio')
            .catch((err) => console.error("ADMIN UPLOAD ERROR:", err));
        }
      }
    } catch (err) {
      console.error("ADMIN UPLOAD ERROR: Download failed", err);
    } finally {
      setRenderProgress(null);
      isRenderingRef.current = false;
    }
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
        if (onAutoUpload) {
          onAutoUpload(result.blob, preset, true);
        } else {
          savePhotoToSupabase(result.blob, preset, locationRef.current || 'HaloLuna Studio')
            .catch((err) => console.error("ADMIN UPLOAD ERROR:", err));
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

          {(preset === 'birthday' || preset === 'birthdayCatPink' || preset === 'retroTerracotta' || preset === 'film35mm') && (
            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-4 bg-gradient-to-br from-amber-50/70 via-white to-pink-50/70 rounded-xl border border-amber-200/90 shadow-sm flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                    Sticker caption (burned into the file)
                  </span>
                </div>
                <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  Name + age at the bottom
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                  Name (printed at the bottom)
                </label>
                <input
                  type="text"
                  name="guest-name"
                  autoComplete="off"
                  value={birthdayNameInput}
                  onChange={(e) => setBirthdayNameInput(e.target.value)}
                  placeholder="e.g. Andi"
                  maxLength={32}
                  className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Quick:</span>
                  {['Andi', 'Hollie', 'Luna', 'Us'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setBirthdayNameInput(sug)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all ${
                        birthdayNameInput === sug
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white border-zinc-200 hover:border-zinc-400 text-zinc-600'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                  Age (printed under the name)
                </label>
                <input
                  type="text"
                  name="guest-age"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={birthdayAge}
                  onChange={(e) => setBirthdayAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="e.g. 21"
                  className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                />
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
            className="relative w-full max-w-[340px] sm:max-w-[400px] border border-zinc-300/80 rounded-lg shadow-xl overflow-hidden bg-white select-none transition-shadow hover:shadow-2xl"
            onClick={() => setActiveStickerID(null)}
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
          </div>

          <p className="text-[11px] text-zinc-500 font-mono text-center">
            {placedStickers.length > 0
              ? '💡 Tip: Click & drag stickers directly on the strip to reposition.'
              : 'Add cute stickers above to customize your strip!'}
          </p>

          {/* Dual Export Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 btn-neo-dark flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all"
              title="Download uncompressed sharp photostrip PNG"
            >
              <Download size={16} />
              <span>Download Photostrip</span>
            </button>
            <button
              onClick={handleMakeWallpaper}
              className="flex-1 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 hover:from-amber-700 hover:to-rose-800 text-white flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all border border-amber-400/30"
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
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

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
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
