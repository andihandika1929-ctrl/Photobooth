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
  Layers,
  Smartphone,
} from 'lucide-react';
import { type FilterName } from './CameraViewport';
import { playPrintSound } from './AudioEngine';
import { v4 as uuidv4 } from 'uuid';
import { getKeyedSticker, getKeyedStickerSync, preloadAllStickers } from '@/utils/stickerCache';
import { savePhotoToSupabase } from '@/utils/supabasePhotoPipeline';

// ─── Types ───────────────────────────────────────────────
export type FramePreset =
  | 'editorial'
  | 'birthday'
  | 'birthdayBow'
  | 'birthdayCatPink'
  | 'kitty'
  | 'cyberSparkle'
  | 'coquette'
  | 'thermal'
  | 'film35mm'
  | 'y2k';

export type LayoutType = 'strip3' | 'strip4' | 'grid2x2' | 'grid2x3';

export type BirthdayPaletteId = 'burgundy' | 'espresso' | 'sage' | 'pink' | 'ivory' | 'charcoal';

type FrameColorId = 'cream' | 'black' | 'olive' | 'blue';

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
const CUTE_PRESETS: { id: FramePreset; label: string; emoji: string; desc: string }[] = [
  { id: 'birthdayCatPink', label: 'Birthday Cat Pink (6-Shot)', emoji: '🐱', desc: 'Party cat, cake & 6-photo custom PNG' },
  { id: 'birthday',     label: 'Editorial Birthday',     emoji: '🎂', desc: 'Modern Korean minimalist, bold age & typography' },
  { id: 'birthdayBow',  label: 'Coquette Pink Bow',      emoji: '🎀', desc: 'Silk vector bows, bold caps & script' },
  { id: 'kitty',        label: 'Kitty & Paws',           emoji: '🐱', desc: 'Cute ears, paws & happy cat' },
  { id: 'cyberSparkle', label: 'Y2K Cyber Sparkle',      emoji: '✨', desc: 'Chrome stars, CD discs & hearts' },
  { id: 'coquette',     label: 'Coquette Ribbon',        emoji: '🌸', desc: 'Pretty bows, cherries & lace' },
  { id: 'thermal',      label: 'Thermal Receipt',        emoji: '🧾', desc: 'Jagged edges, barcode & mascot' },
];

const CLASSIC_PRESETS: { id: FramePreset; label: string; emoji: string; desc: string }[] = [
  { id: 'editorial',    label: 'Clean Editorial',      emoji: '✦',  desc: 'Minimalist high-end studio' },
  { id: 'film35mm',     label: '35mm Film Strip',      emoji: '🎞', desc: 'Kodak sprockets & metadata' },
  { id: 'y2k',          label: 'Windows 98 UI',        emoji: '💾', desc: 'Retro desktop window & taskbar' },
];

const FRAME_COLORS: { id: FrameColorId; label: string; bg: string; text: string; accent: string; border: string }[] = [
  { id: 'cream', label: 'Matte Cream',   bg: '#FDFBF7', text: '#1A1A1A', accent: '#8A7560', border: '#E0D8CC' },
  { id: 'black', label: 'Jet Black',     bg: '#18181B', text: '#FAFAFA', accent: '#A1A1AA', border: '#27272A' },
  { id: 'olive', label: 'Vintage Olive', bg: '#3F4E4F', text: '#F0EDE5', accent: '#C4B99A', border: '#4A5C5D' },
  { id: 'blue',  label: 'Baby Blue',     bg: '#E0E7FF', text: '#1E1B4B', accent: '#6366F1', border: '#C7D2FE' },
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

// Preload cute fonts safely with fallback so canvas generator never hangs or throws
let fontsLoaded = false;
async function loadCuteBirthdayFonts(): Promise<void> {
  if (fontsLoaded) return;
  if (typeof document === 'undefined' || !document.fonts) return;

  try {
    await Promise.allSettled([
      document.fonts.load('bold 48px Caveat'),
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
  const initialSaveDoneRef = useRef(false);
  const dragState = useRef<{
    id: string;
    startMX: number;
    startMY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'style' | 'stickers'>('style');
  const [preset, setPreset] = useState<FramePreset>(
    initialPreset || (layout === 'grid2x3' ? 'birthdayCatPink' : 'birthday')
  );
  const [frameColor, setFrameColor] = useState<FrameColorId>('cream');
  const [location, setLocation] = useState('SEOUL STUDIO');
  const [nowPlaying, setNowPlaying] = useState('NewJeans - Hype Boy');
  const [birthdayNameInput, setBirthdayNameInput] = useState("SARAH'S DAY");
  const [birthdayName, setBirthdayName] = useState("SARAH'S DAY");
  const [birthdayTheme, setBirthdayTheme] = useState<'cream' | 'black'>('cream');
  const [birthdayAge, setBirthdayAge] = useState('21');
  const [birthdayPalette, setBirthdayPalette] = useState<BirthdayPaletteId>('ivory');
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [activeStickerID, setActiveStickerID] = useState<string | null>(null);
  const [stickerThumbnails, setStickerThumbnails] = useState<Record<string, string>>({});

  // Debounce birthday title input to keep UI snappy and prevent canvas re-render thrashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setBirthdayName(birthdayNameInput.trim() || "SARAH'S DAY");
    }, 300);
    return () => clearTimeout(timer);
  }, [birthdayNameInput]);

  const placedStickersRef = useRef<PlacedSticker[]>(placedStickers);
  useEffect(() => {
    placedStickersRef.current = placedStickers;
  }, [placedStickers]);

  const isRenderingRef = useRef(false);
  const hasRenderedRef = useRef(false);
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

  const COLOR = FRAME_COLORS.find((c) => c.id === frameColor)!;

  // Pre-key all sticker images & preload custom PNG frame on mount into in-memory cache
  useEffect(() => {
    let mounted = true;
    preloadAllStickers(STICKER_DEFS).then((map) => {
      if (mounted) {
        setStickerThumbnails(map);
      }
    });
    loadBirthdayCatPinkFrame().catch(() => {});
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
      if (preset === 'birthdayCatPink' || layout === 'grid2x3') {
        if (isExport) {
          // Native high-resolution 1181 × 1772 print format matching PNG asset
          return { w: 1181, h: 1772, s: 1.0 };
        } else {
          // Downscaled interactive preview canvas (1181 / 1772 ≈ 0.6665)
          return { w: 390, h: 585, s: 390 / 1181 };
        }
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
      const fg = palette.fg;
      const muted = palette.muted;
      const accentGold = palette.accent;
      const borderCol = palette.accent + '44';

      // Dimensions with clean Korean Life4Cuts aesthetic margins
      const headerH = Math.round(h * (layout === 'grid2x2' ? 0.11 : 0.12));
      const footerH = Math.round(h * (layout === 'grid2x2' ? 0.12 : 0.14));
      const pad = Math.round(w * 0.09); // 9% horizontal breathing room
      const gap = Math.round(w * 0.035); // 3.5% vertical gap between photos

      // 1. Clean, flat, modern Korean minimalist canvas background
      ctx.save();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── Header Typography (Clean & Bold Editorial) ──
      const title = birthdayNameRef.current || "SARAH'S DAY";
      const ageVal = birthdayAgeRef.current ? birthdayAgeRef.current.trim().replace(/^NO\.?\s*/i, '') : '';

      if (ageVal) {
        // Raw clean prominent Age Number (bold modern serif, NO prefix words)
        ctx.save();
        ctx.fillStyle = fg;
        ctx.font = `bold 700 ${50 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${2 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText(ageVal, w / 2, headerH * 0.46);
        ctx.restore();

        // All-caps, modern, highly legible serif Event Name with clean tracking
        ctx.save();
        ctx.fillStyle = accentGold;
        ctx.font = `bold 700 ${15 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${4 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText(title.toUpperCase(), w / 2, headerH * 0.78);
        ctx.restore();
      } else {
        // Without age: Centered all-caps modern serif headline with generous tracking
        ctx.save();
        ctx.fillStyle = fg;
        ctx.font = `bold 700 ${22 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${5 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText(title.toUpperCase(), w / 2, headerH * 0.58);
        ctx.restore();
      }

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

      // ── Clean & Elegant Footer (Generous Negative Space) ──
      const footerStartY = h - footerH;

      // Custom name / headline in clean medium size (all-caps serif with tracking)
      ctx.save();
      ctx.fillStyle = fg;
      ctx.font = `bold 700 ${13 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${3 * s}px`;
      ctx.textAlign = 'center';
      ctx.fillText(title.toUpperCase(), w / 2, footerStartY + footerH * 0.28);
      ctx.restore();

      // Simple clean date (e.g. "25.09.2026")
      ctx.save();
      ctx.fillStyle = muted;
      ctx.font = `500 ${8.5 * s}px Inter, -apple-system, sans-serif`;
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${2 * s}px`;
      ctx.textAlign = 'center';
      ctx.fillText(fmtSimpleDate(), w / 2, footerStartY + footerH * 0.48);
      ctx.restore();

      // Subtle minimalist barcode accent
      const barW = 100 * s;
      const barH = 10 * s;
      drawBarcode(ctx, w / 2 - barW / 2, footerStartY + footerH * 0.64, barW, barH, muted);

      // Clean subtle watermark at the very bottom
      drawHaloLunaWatermark(ctx, w, footerStartY + footerH * 0.86, muted, s);

      ctx.restore();
    },
    [layout]
  );

  // 2. Coquette Pink Bow Birthday 🎀
  const drawPinkBowBirthday = useCallback(
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

      // Palette-aware background
      const pal = BIRTHDAY_PALETTES[birthdayPaletteRef.current] ?? BIRTHDAY_PALETTES.pink;
      const bowBg = pal.bg;
      const bowFg = pal.fg;
      const bowAccent = pal.accent;
      const bowMuted = pal.muted;
      ctx.fillStyle = bowBg;
      ctx.fillRect(0, 0, w, h);

      // Delicate outer double lace border
      ctx.strokeStyle = '#FBCFE8';
      ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(10 * s, 10 * s, w - 20 * s, h - 20 * s);

      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 0.6 * s;
      ctx.strokeRect(14 * s, 14 * s, w - 28 * s, h - 28 * s);

      // Realistic silk vector bow renderer
      const drawSilkBow = (bx: number, by: number, size: number, angle: number = 0) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);

        // Ribbon Tails (behind loops)
        const drawTail = (dir: number) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, size * 0.2);
          ctx.bezierCurveTo(
            dir * size * 0.4,
            size * 0.8,
            dir * size * 0.6,
            size * 1.4,
            dir * size * 0.8,
            size * 1.9
          );
          ctx.lineTo(dir * size * 0.55, size * 1.75);
          ctx.lineTo(dir * size * 0.35, size * 1.9);
          ctx.bezierCurveTo(
            dir * size * 0.3,
            size * 1.2,
            dir * size * 0.15,
            size * 0.6,
            0,
            size * 0.2
          );
          ctx.fillStyle = '#F472B6';
          ctx.fill();

          // Tail highlight streak
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1 * s;
          ctx.beginPath();
          ctx.moveTo(dir * size * 0.1, size * 0.4);
          ctx.quadraticCurveTo(dir * size * 0.35, size * 1.1, dir * size * 0.5, size * 1.6);
          ctx.stroke();
          ctx.restore();
        };
        drawTail(-1);
        drawTail(1);

        // Ribbon Loops
        const drawLoop = (dir: number) => {
          ctx.save();
          // Main loop body
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(
            dir * size * 1.2,
            -size * 0.8,
            dir * size * 1.7,
            size * 0.5,
            0,
            size * 0.2
          );
          ctx.closePath();
          ctx.fillStyle = '#EC4899';
          ctx.fill();

          // Inner loop shadow
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(
            dir * size * 0.9,
            -size * 0.4,
            dir * size * 1.2,
            size * 0.3,
            0,
            size * 0.15
          );
          ctx.fillStyle = '#DB2777';
          ctx.fill();

          // Silk sheen highlight
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = 1.5 * s;
          ctx.beginPath();
          ctx.moveTo(dir * size * 0.2, -size * 0.1);
          ctx.bezierCurveTo(
            dir * size * 0.8,
            -size * 0.55,
            dir * size * 1.3,
            0,
            dir * size * 0.8,
            size * 0.25
          );
          ctx.stroke();
          ctx.restore();
        };
        drawLoop(-1);
        drawLoop(1);

        // Center knot with wraps
        ctx.fillStyle = '#BE185D';
        ctx.beginPath();
        ctx.arc(0, size * 0.1, size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.05, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Top corner silk bows
      drawSilkBow(36 * s, 36 * s, 18 * s, 0.15);
      drawSilkBow(w - 36 * s, 36 * s, 18 * s, -0.15);

      // Photo Frames with Korean Life4Cuts margins
      const headerH = Math.round(h * 0.13); // Enlarged header for bold editorial hierarchy
      const footerH = Math.round(h * 0.20);
      const pad = Math.round(w * 0.09);
      const gap = Math.round(w * 0.035);
      const topPadding = 18 * s; // Breathing room below header
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

      // Header Typography with Bold Editorial Hierarchy
      const title = birthdayNameRef.current || "SARAH'S DAY";
      const ageVal = birthdayAgeRef.current ? birthdayAgeRef.current.trim().replace(/^NO\.?\s*/i, '') : '';

      if (ageVal) {
        // Modern caps "HAPPY BIRTHDAY"
        ctx.save();
        ctx.fillStyle = bowFg;
        ctx.font = `bold 700 ${15 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${3 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText('HAPPY BIRTHDAY', w / 2, headerH * 0.28);
        ctx.restore();

        // Raw clean prominent Age Number (bold modern serif, NO prefix words)
        ctx.save();
        ctx.fillStyle = bowAccent;
        ctx.font = `bold 700 ${46 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${2 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText(ageVal, w / 2, headerH * 0.54);
        ctx.restore();

        // All-caps, modern, highly legible serif title with clean tracking
        ctx.save();
        ctx.fillStyle = bowFg;
        ctx.font = `bold 700 ${15 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${3 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText(title.toUpperCase(), w / 2, headerH * 0.74);
        ctx.restore();

        // Subtitle
        ctx.fillStyle = bowMuted;
        ctx.font = `600 ${8 * s}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✦  A BEAUTIFUL DAY TO CELEBRATE YOU  ✦', w / 2, headerH * 0.88);
      } else {
        // Modern caps "HAPPY BIRTHDAY"
        ctx.save();
        ctx.fillStyle = bowFg;
        ctx.font = `bold 700 ${17 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${3 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText('HAPPY BIRTHDAY', w / 2, headerH * 0.38);
        ctx.restore();

        // All-caps, modern, highly legible serif title with clean tracking
        ctx.save();
        ctx.fillStyle = bowAccent;
        ctx.font = `bold 700 ${22 * s}px "Bodoni Moda", "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${4 * s}px`;
        ctx.textAlign = 'center';
        ctx.fillText(title.toUpperCase(), w / 2, headerH * 0.65);
        ctx.restore();

        // Subtitle
        ctx.fillStyle = bowMuted;
        ctx.font = `600 ${8.5 * s}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✦  A BEAUTIFUL DAY TO CELEBRATE YOU  ✦', w / 2, headerH * 0.84);
      }

      if (layout === 'grid2x2') {
        const cw = (w - pad * 2 - gap) / 2;
        const ch = (h - headerH - footerH - topPadding - gap) / 2;
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
          const iy = headerH + topPadding + r * (ch + gap);
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, 6 * s, isExport);
          ctx.strokeStyle = '#FBCFE8';
          ctx.lineWidth = 1.5 * s;
          roundRect(ctx, ix, iy, cw, ch, 6 * s);
          ctx.stroke();
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - topPadding - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + topPadding + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, 6 * s, isExport);
          ctx.strokeStyle = '#FBCFE8';
          ctx.lineWidth = 1.5 * s;
          roundRect(ctx, pad, iy, iw, ih, 6 * s);
          ctx.stroke();
        }
      }

      // Bottom Silk Bows (left and right)
      drawSilkBow(40 * s, h - 52 * s, 16 * s, 0.1);
      drawSilkBow(w - 40 * s, h - 52 * s, 16 * s, -0.1);

      // Date stamp badge at bottom center
      const badgeW = 160 * s;
      const badgeH = 28 * s;
      const badgeX = w / 2 - badgeW / 2;
      const badgeY = h - 68 * s;

      ctx.fillStyle = '#FCE7F3';
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14 * s);
      ctx.fill();

      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 1 * s;
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14 * s);
      ctx.stroke();

      ctx.fillStyle = '#9D174D';
      ctx.font = `600 ${8.5 * s}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fmtSimpleDate(), w / 2, badgeY + 13 * s);

      ctx.font = `600 ${6.5 * s}px Inter, sans-serif`;
      ctx.fillStyle = '#DB2777';
      ctx.fillText('CHERISHED MEMORIES FOREVER', w / 2, badgeY + 22 * s);

      // Watermark Signature
      drawHaloLunaWatermark(ctx, w, h - 16 * s, bowMuted, s);
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

      // Base coordinates from the native 1181 × 1772 PNG frame asset
      const baseW = 1181;
      const baseH = 1772;
      const scaleX = w / baseW;
      const scaleY = h / baseH;

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
      // Soft blush pink canvas base
      ctx.save();
      ctx.fillStyle = '#FFEDF1';
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
          ctx.drawImage(frameImg, 0, 0, w, h);
        } else {
          console.warn('[HaloLuna] Frame overlay loaded with 0 width, using fallback');
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 8 * scaleX;
          ctx.strokeRect(10 * scaleX, 10 * scaleY, w - 20 * scaleX, h - 20 * scaleY);
        }
      } catch (frameErr) {
        console.warn('[HaloLuna] Frame overlay load error (drawing fallback frame):', frameErr);
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 8 * scaleX;
        ctx.strokeRect(10 * scaleX, 10 * scaleY, w - 20 * scaleX, h - 20 * scaleY);
      }

      // LAYER 3: Dynamic Custom Birthday Scrapbook Headline & Stickers
      const title = birthdayNameRef.current || "SARAH";
      let personName = title.trim();
      if (/['’]s\s*day$/i.test(personName)) {
        personName = personName.replace(/['’]s\s*day$/i, '').trim();
      } else if (/['’]s\s*birthday$/i.test(personName)) {
        personName = personName.replace(/['’]s\s*birthday$/i, '').trim();
      } else if (/birthday$/i.test(personName)) {
        personName = personName.replace(/birthday$/i, '').trim();
      } else if (/['’]s$/i.test(personName)) {
        personName = personName.replace(/['’]s$/i, '').trim();
      }
      if (!personName) personName = 'Sarah';
      // Format as Title Case for cute handwriting aesthetic (e.g. "Sarah" or "Andi")
      const displayName = personName.charAt(0).toUpperCase() + personName.slice(1);

      const rawAge = birthdayAgeRef.current ? birthdayAgeRef.current.trim().replace(/\D/g, '') : '';
      let ordinalAge = '';
      if (rawAge) {
        const num = parseInt(rawAge, 10);
        if (!isNaN(num)) {
          const j = num % 10;
          const k = num % 100;
          const suffix = (j === 1 && k !== 11) ? 'st' : (j === 2 && k !== 12) ? 'nd' : (j === 3 && k !== 13) ? 'rd' : 'th';
          ordinalAge = `${num}${suffix}`;
        }
      }

      // Cohesive birthday headline with letters and numbers sharing exact same font family & weight
      const line1 = `It's ${displayName}'s`;
      const line2 = ordinalAge ? `${ordinalAge} Birthday! 🎂` : 'Birthday Party! 🎂';

      // Scrapbook Sticker Center Position: centered horizontally at 590.5, sitting right above the cake at y ≈ 1115
      const stickerX = 590.5 * scaleX;
      const stickerY = 1115 * scaleY;
      const cuteFontFamily = '"DynaPuff", "Caveat", "Pacifico", cursive, sans-serif';

      ctx.save();
      ctx.translate(stickerX, stickerY);
      // Playful -3.2 degree scrapbook sticker tilt
      ctx.rotate(-0.055);

      let line1Size = 44 * scaleX;
      let line2Size = 54 * scaleX;

      ctx.font = `bold 700 ${line1Size}px ${cuteFontFamily}`;
      const m1 = ctx.measureText(line1).width;
      ctx.font = `bold 800 ${line2Size}px ${cuteFontFamily}`;
      const m2 = ctx.measureText(line2).width;

      // Allow natural 10-15% overlap of adjacent photo slots (~540px max width at base 1181)
      const maxStickerW = 540 * scaleX;
      const maxMeasured = Math.max(m1, m2);
      if (maxMeasured > maxStickerW) {
        const shrinkRatio = maxStickerW / maxMeasured;
        line1Size *= shrinkRatio;
        line2Size *= shrinkRatio;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const line1YOffset = -26 * scaleY;
      const line2YOffset = 30 * scaleY;

      // 1. Soft Warm Drop Shadow (gives tactile die-cut sticker depth over photos & frame)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = 12 * scaleX;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6 * scaleY;

      // 2. Thick Opaque White Sticker Border (ctx.strokeText with lineWidth = 16 * scaleX)
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 16 * scaleX;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.font = `bold 700 ${line1Size}px ${cuteFontFamily}`;
      ctx.strokeText(line1, 0, line1YOffset);
      ctx.font = `bold 800 ${line2Size}px ${cuteFontFamily}`;
      ctx.strokeText(line2, 0, line2YOffset);

      // 3. Crisp Secondary Stroke (clean white inner stroke, shadows cleared)
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 14 * scaleX;
      ctx.font = `bold 700 ${line1Size}px ${cuteFontFamily}`;
      ctx.strokeText(line1, 0, line1YOffset);
      ctx.font = `bold 800 ${line2Size}px ${cuteFontFamily}`;
      ctx.strokeText(line2, 0, line2YOffset);

      // 4. Vibrant Cherry-Rose Text Fill
      ctx.fillStyle = '#E11D48';
      ctx.font = `bold 700 ${line1Size}px ${cuteFontFamily}`;
      ctx.fillText(line1, 0, line1YOffset);
      ctx.font = `bold 800 ${line2Size}px ${cuteFontFamily}`;
      ctx.fillText(line2, 0, line2YOffset);
      ctx.restore();

      // 2. Custom Name Banner: clean and cute inside the bottom-left banner
      ctx.save();
      const bannerCenterX = 295 * scaleX;
      const footerNameY = 1746 * scaleY;
      const maxAllowedWidth = 510 * scaleX;

      let footerFontSize = 26 * scaleX;
      ctx.font = `bold 800 ${footerFontSize}px ${cuteFontFamily}`;
      const footerText = `♡ ${displayName.toUpperCase()}'S SPECIAL DAY ♡`;
      const measuredW = ctx.measureText(footerText).width;
      if (measuredW > maxAllowedWidth) {
        footerFontSize = Math.max(16 * scaleX, (maxAllowedWidth / measuredW) * footerFontSize);
        ctx.font = `bold 800 ${footerFontSize}px ${cuteFontFamily}`;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Clean white stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.lineWidth = 6 * scaleX;
      ctx.lineJoin = 'round';
      ctx.strokeText(footerText, bannerCenterX, footerNameY);

      // Deep berry pink text fill
      ctx.fillStyle = '#831843';
      ctx.fillText(footerText, bannerCenterX, footerNameY);
      ctx.restore();

      // 3. Watermark: tiny subtle watermark under bottom-right column
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

  // 3. Kitty & Paws 🐱
  const drawKitty = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
    ) => {
      // Butter cream / soft lavender
      ctx.fillStyle = '#FAF7EE';
      ctx.fillRect(0, 0, w, h);

      // Border line
      ctx.strokeStyle = '#E8DFCE';
      ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(12 * s, 12 * s, w - 24 * s, h - 24 * s);

      // Peeking Cat Ears above top frame
      const earLeftX = w / 2 - 80 * s;
      const earRightX = w / 2 + 80 * s;
      const earY = 82 * s;

      const drawEar = (ex: number, isLeft: boolean) => {
        ctx.fillStyle = '#E8DFCE';
        ctx.beginPath();
        ctx.moveTo(ex, earY);
        ctx.lineTo(ex + (isLeft ? -24 * s : 24 * s), earY - 34 * s);
        ctx.lineTo(ex + (isLeft ? 18 * s : -18 * s), earY - 6 * s);
        ctx.closePath();
        ctx.fill();

        // Inner pink ear
        ctx.fillStyle = '#FFCCD5';
        ctx.beginPath();
        ctx.moveTo(ex + (isLeft ? -4 * s : 4 * s), earY - 4 * s);
        ctx.lineTo(ex + (isLeft ? -18 * s : 18 * s), earY - 26 * s);
        ctx.lineTo(ex + (isLeft ? 10 * s : -10 * s), earY - 8 * s);
        ctx.closePath();
        ctx.fill();
      };
      drawEar(earLeftX, true);
      drawEar(earRightX, false);

      // Header Text
      ctx.fillStyle = '#3D3B36';
      ctx.font = `bold ${18 * s}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('( ˶ˆᵕˆ˶ )  meow ♡', w / 2, 70 * s);

      // Paw prints stamped along outer left & right margins
      const drawPaw = (px: number, py: number, r: number) => {
        ctx.save();
        ctx.fillStyle = '#D6CCB8';
        // Main pad
        ctx.beginPath();
        ctx.ellipse(px, py, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        // 4 Toe pads
        const toes = [
          [-0.8, -0.9],
          [-0.3, -1.2],
          [0.3, -1.2],
          [0.8, -0.9],
        ];
        toes.forEach(([tx, ty]) => {
          ctx.beginPath();
          ctx.ellipse(px + tx * r * 0.8, py + ty * r * 0.8, r * 0.4, r * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      };

      [0.2, 0.4, 0.6, 0.8].forEach((pct, idx) => {
        drawPaw(18 * s, pct * h + (idx % 2) * 15 * s, 6 * s);
        drawPaw(w - 18 * s, pct * h - (idx % 2) * 15 * s, 6 * s);
      });

      // Photos
      const pad = 30 * s;
      const gap = 12 * s;
      const headerH = 92 * s;
      const footerH = 135 * s;
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

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
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, 6 * s, isExport);
          ctx.strokeStyle = '#D6CCB8';
          ctx.lineWidth = 1 * s;
          roundRect(ctx, ix, iy, cw, ch, 6 * s);
          ctx.stroke();
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, 6 * s, isExport);
          ctx.strokeStyle = '#D6CCB8';
          ctx.lineWidth = 1 * s;
          roundRect(ctx, pad, iy, iw, ih, 6 * s);
          ctx.stroke();
        }
      }

      // Smiling Cat Doodle at Bottom Center
      const catX = w / 2;
      const catY = h - 68 * s;
      const catR = 28 * s;

      // Face
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(catX, catY, catR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D6CCB8';
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();

      // Closed Smiling Eyes (^ ^)
      ctx.strokeStyle = '#3D3B36';
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.arc(catX - 10 * s, catY - 4 * s, 5 * s, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(catX + 10 * s, catY - 4 * s, 5 * s, Math.PI, 0);
      ctx.stroke();

      // Pink Nose & Mouth
      ctx.fillStyle = '#FF85A1';
      ctx.beginPath();
      ctx.arc(catX, catY + 3 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(catX - 3.5 * s, catY + 8 * s, 3.5 * s, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(catX + 3.5 * s, catY + 8 * s, 3.5 * s, 0, Math.PI);
      ctx.stroke();

      // Rosy Pink Cheeks
      ctx.fillStyle = 'rgba(255, 133, 161, 0.4)';
      ctx.beginPath();
      ctx.arc(catX - 15 * s, catY + 5 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(catX + 15 * s, catY + 5 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();

      // Whiskers
      ctx.strokeStyle = '#A89F90';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(catX - 18 * s, catY);
      ctx.lineTo(catX - 34 * s, catY - 3 * s);
      ctx.moveTo(catX - 18 * s, catY + 4 * s);
      ctx.lineTo(catX - 33 * s, catY + 6 * s);
      ctx.moveTo(catX + 18 * s, catY);
      ctx.lineTo(catX + 34 * s, catY - 3 * s);
      ctx.moveTo(catX + 18 * s, catY + 4 * s);
      ctx.lineTo(catX + 33 * s, catY + 6 * s);
      ctx.stroke();

      // Watermark
      ctx.fillStyle = '#8A8275';
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(SIGNATURE, w / 2, h - 16 * s);
    },
    [layout]
  );

  // 3. Y2K Cyber Sparkle ✨
  const drawCyberSparkle = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
    ) => {
      // Icy Silver-Blue
      ctx.fillStyle = '#E8EEFF';
      ctx.fillRect(0, 0, w, h);

      // Star polygon helper (✦ ✧)
      const drawSparkle = (sx: number, sy: number, r: number, color: string) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 === 0 ? r : r * 0.28;
          const angle = (i * Math.PI) / 4 - Math.PI / 4;
          if (i === 0) ctx.moveTo(sx + radius * Math.cos(angle), sy + radius * Math.sin(angle));
          else ctx.lineTo(sx + radius * Math.cos(angle), sy + radius * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      // Cyber Sparkle stars
      const stars = [
        [35 * s, 35 * s, 18 * s, '#6366F1'],
        [w - 35 * s, 35 * s, 18 * s, '#818CF8'],
        [28 * s, h / 2, 14 * s, '#4F46E5'],
        [w - 28 * s, h / 2, 14 * s, '#4F46E5'],
        [w / 2, 28 * s, 12 * s, '#A5B4FC'],
        [42 * s, h - 45 * s, 16 * s, '#818CF8'],
        [w - 42 * s, h - 45 * s, 16 * s, '#6366F1'],
      ];
      stars.forEach(([sx, sy, r, col]) => drawSparkle(sx as number, sy as number, r as number, col as string));

      // Header
      ctx.fillStyle = '#312E81';
      ctx.font = `bold ${19 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('✦ PHOTOBOOTH ✦', w / 2, 62 * s);

      ctx.fillStyle = '#6366F1';
      ctx.font = `600 ${10.5 * s}px "Courier New", monospace`;
      ctx.fillText(`[ Y2K EDITION ]  ${fmtDate()}`, w / 2, 80 * s);

      // Photos
      const pad = 28 * s;
      const gap = 12 * s;
      const headerH = 100 * s;
      const footerH = 120 * s;
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

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
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, 0, isExport);
          ctx.strokeStyle = '#A5B4FC';
          ctx.lineWidth = 2 * s;
          ctx.strokeRect(ix, iy, cw, ch);
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, 0, isExport);
          ctx.strokeStyle = '#A5B4FC';
          ctx.lineWidth = 2 * s;
          ctx.strokeRect(pad, iy, iw, ih);
        }
      }

      // Mini CD / Disc Vectors at Bottom
      const drawCD = (cdX: number, cdY: number) => {
        ctx.save();
        for (let r = 8; r <= 22; r += 4) {
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.7 - r * 0.02})`;
          ctx.lineWidth = 1.5 * s;
          ctx.beginPath();
          ctx.arc(cdX, cdY, r * s, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#E8EEFF';
        ctx.beginPath();
        ctx.arc(cdX, cdY, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawCD(80 * s, h - 55 * s);
      drawCD(w - 80 * s, h - 55 * s);

      // Heart outline center
      ctx.save();
      const hx = w / 2;
      const hy = h - 60 * s;
      const hs = 8 * s;
      ctx.strokeStyle = '#818CF8';
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.moveTo(hx, hy + hs);
      ctx.bezierCurveTo(hx, hy - hs * 0.6, hx - hs * 1.8, hy - hs * 0.6, hx - hs * 1.8, hy + hs * 0.5);
      ctx.bezierCurveTo(hx - hs * 1.8, hy + hs * 1.6, hx, hy + hs * 2.5, hx, hy + hs * 3);
      ctx.bezierCurveTo(hx, hy + hs * 2.5, hx + hs * 1.8, hy + hs * 1.6, hx + hs * 1.8, hy + hs * 0.5);
      ctx.bezierCurveTo(hx + hs * 1.8, hy - hs * 0.6, hx, hy - hs * 0.6, hx, hy + hs);
      ctx.stroke();
      ctx.restore();

      // Watermark
      ctx.fillStyle = '#4F46E5';
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(SIGNATURE, w / 2, h - 16 * s);
    },
    [layout]
  );

  // 4. Coquette Ribbon 🎀
  const drawCoquette = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
    ) => {
      // Strawberry Milk Pink
      ctx.fillStyle = '#FCE7F3';
      ctx.fillRect(0, 0, w, h);

      // Delicate double lace border
      ctx.strokeStyle = '#F9A8D4';
      ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(10 * s, 10 * s, w - 20 * s, h - 20 * s);

      ctx.strokeStyle = '#FBCFE8';
      ctx.lineWidth = 0.8 * s;
      ctx.strokeRect(14 * s, 14 * s, w - 28 * s, h - 28 * s);

      // Ribbon / Bow Vector Helper
      const drawBow = (bx: number, by: number, size: number) => {
        ctx.save();
        const drawLoop = (isMirrored: boolean) => {
          ctx.fillStyle = '#F472B6';
          ctx.beginPath();
          ctx.moveTo(bx, by);
          const dir = isMirrored ? -1 : 1;
          ctx.bezierCurveTo(
            bx + dir * size * 1.4,
            by - size * 0.8,
            bx + dir * size * 1.6,
            by + size * 0.7,
            bx,
            by
          );
          ctx.fill();
        };
        drawLoop(false);
        drawLoop(true);

        // Center knot
        ctx.fillStyle = '#DB2777';
        ctx.beginPath();
        ctx.arc(bx, by, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Flowing ribbons
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(bx, by + size * 0.3);
        ctx.quadraticCurveTo(bx - size * 0.6, by + size * 1.2, bx - size * 0.8, by + size * 1.8);
        ctx.moveTo(bx, by + size * 0.3);
        ctx.quadraticCurveTo(bx + size * 0.6, by + size * 1.2, bx + size * 0.8, by + size * 1.8);
        ctx.stroke();
        ctx.restore();
      };

      drawBow(44 * s, 44 * s, 16 * s);
      drawBow(w - 44 * s, 44 * s, 16 * s);

      // Sweet Cherries helper
      const drawCherry = (cx2: number, cy2: number) => {
        ctx.save();
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.arc(cx2 - 4 * s, cy2, 4.5 * s, 0, Math.PI * 2);
        ctx.arc(cx2 + 4 * s, cy2 + 2 * s, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();
        // Stems
        ctx.strokeStyle = '#16A34A';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(cx2 - 4 * s, cy2 - 3 * s);
        ctx.quadraticCurveTo(cx2 - 1 * s, cy2 - 10 * s, cx2 + 2 * s, cy2 - 12 * s);
        ctx.moveTo(cx2 + 4 * s, cy2 - 1 * s);
        ctx.quadraticCurveTo(cx2 + 2 * s, cy2 - 10 * s, cx2 + 2 * s, cy2 - 12 * s);
        ctx.stroke();
        ctx.restore();
      };

      drawCherry(w * 0.3, 24 * s);
      drawCherry(w * 0.7, 24 * s);

      // Header Typography
      ctx.fillStyle = '#9D174D';
      ctx.font = `italic 300 ${20 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('◌ memories ◌', w / 2, 72 * s);

      ctx.fillStyle = '#DB2777';
      ctx.font = `400 ${10.5 * s}px Georgia, serif`;
      ctx.fillText('cherished forever  ♡', w / 2, 88 * s);

      // Photos
      const pad = 28 * s;
      const gap = 12 * s;
      const headerH = 104 * s;
      const footerH = 120 * s;
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

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
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, 8 * s, isExport);
          ctx.strokeStyle = '#F9A8D4';
          ctx.lineWidth = 1 * s;
          roundRect(ctx, ix, iy, cw, ch, 8 * s);
          ctx.stroke();
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, 8 * s, isExport);
          ctx.strokeStyle = '#F9A8D4';
          ctx.lineWidth = 1 * s;
          roundRect(ctx, pad, iy, iw, ih, 8 * s);
          ctx.stroke();
        }
      }

      // Bottom Bow Accent
      drawBow(w / 2, h - 55 * s, 18 * s);

      // Signature
      ctx.fillStyle = '#BE185D';
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(SIGNATURE, w / 2, h - 16 * s);
    },
    [layout]
  );

  // 5. Thermal Receipt Strip 🧾
  const drawThermal = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
    ) => {
      // Vintage Paper Off-White
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, w, h);

      const pad = 32 * s;
      let y = 0;

      // Serrated Top Jagged Edge
      ctx.fillStyle = '#F0ECE1';
      for (let x = 0; x < w; x += 14 * s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 7 * s, 10 * s);
        ctx.lineTo(x + 14 * s, 0);
        ctx.fill();
      }
      y = 48 * s;

      // Header
      ctx.fillStyle = '#1E2022';
      ctx.font = `bold ${18 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('★  MEMORY RECEIPT  ★', w / 2, y + 16 * s);
      y += 36 * s;

      ctx.font = `400 ${10.5 * s}px "Courier New", monospace`;
      ctx.fillText('─────────────────────────────', w / 2, y);
      y += 20 * s;

      // Receipt Meta Rows
      const currentLoc = locationRef.current || 'SEOUL STUDIO';
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;
      const rows: [string, string][] = [
        ['DATE', fmtDate()],
        ['TIME', fmtTime()],
        ['ORDER', `MEMORIES x ${count}`],
        ['LOCATION', currentLoc],
      ];

      rows.forEach(([k, v]) => {
        ctx.textAlign = 'left';
        ctx.fillText(k, pad, y);
        ctx.textAlign = 'right';
        ctx.fillText(v, w - pad, y);
        y += 20 * s;
      });

      ctx.textAlign = 'center';
      ctx.fillText('─────────────────────────────', w / 2, y + 4 * s);
      y += 24 * s;

      // Now Playing with Mini Soundwave
      const currentNP = nowPlayingRef.current;
      if (currentNP) {
        ctx.fillStyle = '#5A5852';
        ctx.font = `500 ${10 * s}px "Courier New", monospace`;
        ctx.fillText(`♪ ${currentNP.toUpperCase()}`, w / 2, y + 10 * s);

        const barCount = 18;
        const barW = 4 * s;
        const barGap = 3 * s;
        const totalW = barCount * (barW + barGap);
        let bx = w / 2 - totalW / 2;
        for (let i = 0; i < barCount; i++) {
          const bh = (3 + Math.sin(i * 0.7) * 10 + 6) * s;
          ctx.fillStyle = '#1E2022';
          ctx.fillRect(bx, y + 20 * s, barW, bh);
          bx += barW + barGap;
        }
        y += 46 * s;
      }

      // Photos
      const imgW = w - pad * 2;
      const imgH = Math.min(230 * s, (h - y - 180 * s) / count);

      if (layout === 'grid2x2') {
        const hW = (imgW - 8 * s) / 2;
        for (let i = 0; i < Math.min(4, imgs.length); i++) {
          const c2 = i % 2;
          const r = Math.floor(i / 2);
          drawGradedPhoto(ctx, imgs[i], pad + c2 * (hW + 8 * s), y + r * (imgH + 8 * s), hW, imgH, 0, isExport);
        }
        y += imgH * 2 + 16 * s;
      } else {
        for (let i = 0; i < Math.min(count, imgs.length); i++) {
          drawGradedPhoto(ctx, imgs[i], pad, y, imgW, imgH, 0, isExport);
          y += imgH + 12 * s;
        }
      }

      // Wavy Smiling Face Receipt Mascot Doodle
      y += 12 * s;
      ctx.font = `bold ${14 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('( ◡‿◡ ) ★ HAVE A NICE DAY', w / 2, y + 10 * s);
      y += 24 * s;

      // Barcode
      drawBarcode(ctx, pad + 12 * s, y, w - pad * 2 - 24 * s, 38 * s, '#1E2022');
      y += 48 * s;

      ctx.font = `400 ${9.5 * s}px "Courier New", monospace`;
      ctx.fillText(`*${Math.random().toString(36).substring(2, 8).toUpperCase()}-KOREA*`, w / 2, y + 6 * s);

      // Serrated Bottom Edge
      ctx.fillStyle = '#F0ECE1';
      for (let x = 0; x < w; x += 14 * s) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 7 * s, h - 10 * s);
        ctx.lineTo(x + 14 * s, h);
        ctx.fill();
      }

      // Signature Watermark
      ctx.fillStyle = '#6E6B65';
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.fillText(SIGNATURE, w / 2, h - 22 * s);
    },
    [layout]
  );

  // 6. Clean Editorial (Classic)
  const drawEditorial = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
    ) => {
      ctx.fillStyle = COLOR.bg;
      ctx.fillRect(0, 0, w, h);

      // Korean Life4Cuts aesthetic proportions
      const pad = Math.round(w * 0.09);
      const gap = Math.round(w * 0.035);
      const headerH = Math.round(h * 0.08);
      const footerH = Math.round(h * 0.20);
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

      // Header
      ctx.fillStyle = COLOR.text;
      ctx.font = `300 ${18 * s}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('HALOLUNA STUDIO', pad, headerH - 24 * s);

      ctx.font = `400 ${9.5 * s}px "Courier New", monospace`;
      ctx.fillStyle = COLOR.accent;
      ctx.textAlign = 'right';
      ctx.fillText(`${fmtDate()}  ${fmtTime()}`, w - pad, headerH - 24 * s);

      ctx.strokeStyle = COLOR.border;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(pad, headerH - 8 * s);
      ctx.lineTo(w - pad, headerH - 8 * s);
      ctx.stroke();

      // Photos
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
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, 0, isExport);
          ctx.strokeStyle = COLOR.border;
          ctx.lineWidth = 1 * s;
          ctx.strokeRect(ix, iy, cw, ch);
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, 0, isExport);
          ctx.strokeStyle = COLOR.border;
          ctx.lineWidth = 1 * s;
          ctx.strokeRect(pad, iy, iw, ih);
        }
      }

      // Footer
      const fy = h - footerH;
      ctx.strokeStyle = COLOR.border;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(pad, fy + 8 * s);
      ctx.lineTo(w - pad, fy + 8 * s);
      ctx.stroke();

      const currentLoc = locationRef.current;
      if (currentLoc) {
        ctx.fillStyle = COLOR.accent;
        ctx.font = `400 ${10.5 * s}px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`⊕ ${currentLoc.toUpperCase()}`, pad, fy + 32 * s);
      }

      drawBarcode(ctx, w - pad - 80 * s, fy + 18 * s, 80 * s, 36 * s, COLOR.text);

      drawHaloLunaWatermark(ctx, w, h - 16 * s, COLOR.accent, s);
    },
    [COLOR, layout]
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

  // 8. Y2K Windows 98 (Classic)
  const drawY2K = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      imgs: HTMLImageElement[],
      w: number,
      h: number,
      s: number,
      isExport: boolean = false,
    ) => {
      ctx.fillStyle = '#008080';
      ctx.fillRect(0, 0, w, h);
      const winPad = 18 * s;
      const titleH = 32 * s;
      const winW = w - winPad * 2;

      ctx.fillStyle = '#D4D0C8';
      ctx.fillRect(winPad, winPad, winW, h - winPad * 2);

      const grad = ctx.createLinearGradient(winPad, winPad, winPad + winW, winPad + titleH);
      grad.addColorStop(0, '#000080');
      grad.addColorStop(1, '#1084D0');
      ctx.fillStyle = grad;
      ctx.fillRect(winPad, winPad, winW, titleH);

      ctx.fillStyle = 'white';
      ctx.font = `bold ${12 * s}px "Courier New", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('📷  PHOTOBOOTH.EXE', winPad + 8 * s, winPad + 21 * s);

      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;
      const cY = winPad + titleH + 8 * s;
      const cP = 10 * s;
      const imgArea = winW - cP * 2;

      let imgY = cY + 28 * s;
      if (layout === 'grid2x2') {
        const hW = (imgArea - 8 * s) / 2;
        const hH = hW * 0.75;
        for (let i = 0; i < Math.min(4, imgs.length); i++) {
          const c2 = i % 2;
          const r = Math.floor(i / 2);
          const ix = winPad + cP + c2 * (hW + 8 * s);
          const iy = imgY + r * (hH + 8 * s);
          ctx.fillStyle = '#888';
          ctx.fillRect(ix - 2 * s, iy - 2 * s, hW + 4 * s, hH + 4 * s);
          ctx.fillStyle = '#fff';
          ctx.fillRect(ix - s, iy - s, hW + 2 * s, hH + 2 * s);
          drawGradedPhoto(ctx, imgs[i], ix, iy, hW, hH, 0, isExport);
        }
      } else {
        const iH = Math.floor((h - winPad * 2 - titleH - 75 * s - count * 6 * s) / count);
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          ctx.fillStyle = '#888';
          ctx.fillRect(winPad + cP - 2 * s, imgY - 2 * s, imgArea + 4 * s, iH + 4 * s);
          ctx.fillStyle = '#fff';
          ctx.fillRect(winPad + cP - s, imgY - s, imgArea + 2 * s, iH + 2 * s);
          drawGradedPhoto(ctx, imgs[i], winPad + cP, imgY, imgArea, iH, 0, isExport);
          imgY += iH + 6 * s;
        }
      }

      // Taskbar
      ctx.fillStyle = '#D4D0C8';
      ctx.fillRect(0, h - 30 * s, w, 30 * s);
      ctx.fillStyle = '#008000';
      ctx.fillRect(3 * s, h - 27 * s, 65 * s, 24 * s);
      ctx.fillStyle = 'white';
      ctx.font = `bold ${11 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('▶ Start', 35 * s, h - 11 * s);

      ctx.fillStyle = '#333';
      ctx.font = `400 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(SIGNATURE, w - 8 * s, h - 11 * s);
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
  const renderToCanvas = useCallback(
    async (isExport: boolean = false): Promise<string | null> => {
      const canvas = canvasRef.current;
      if (!canvas || frames.length === 0) return null;

      try {
        const { w, h, s } = getDimensions(isExport);
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // If using 6-shot birthday cat pink preset and full set of captures is available, prioritize allFrames
        const effectiveFrames =
          preset === 'birthdayCatPink' && allFrames && allFrames.length >= 6
            ? allFrames
            : frames;

        // Load all frames with safety timeout to prevent hanging
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

        // Render Chosen Preset
        switch (preset) {
          case 'birthdayCatPink':
            await drawBirthdayCatPink(ctx, imgs, w, h, s, isExport);
            break;
          case 'birthday':
            await drawCinemaTicketBirthday(ctx, imgs, w, h, s, isExport);
            break;
          case 'birthdayBow':
            await drawPinkBowBirthday(ctx, imgs, w, h, s, isExport);
            break;
          case 'kitty':
            await drawKitty(ctx, imgs, w, h, s, isExport);
            break;
          case 'cyberSparkle':
            await drawCyberSparkle(ctx, imgs, w, h, s, isExport);
            break;
          case 'coquette':
            await drawCoquette(ctx, imgs, w, h, s, isExport);
            break;
          case 'thermal':
            await drawThermal(ctx, imgs, w, h, s, isExport);
            break;
          case 'film35mm':
            await drawFilm(ctx, imgs, w, h, s, isExport);
            break;
          case 'y2k':
            await drawY2K(ctx, imgs, w, h, s, isExport);
            break;
          case 'editorial':
          default:
            await drawEditorial(ctx, imgs, w, h, s, isExport);
            break;
        }

        // Composite stickers onto canvas only for export (preview uses real-time DOM overlay)
        if (isExport) {
          await compositePlacedStickers(ctx, w, h);
        }

        return canvas.toDataURL('image/png', isExport ? 0.98 : 0.85);
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
      drawCinemaTicketBirthday,
      drawPinkBowBirthday,
      drawKitty,
      drawCyberSparkle,
      drawCoquette,
      drawThermal,
      drawFilm,
      drawY2K,
      drawEditorial,
      compositePlacedStickers,
    ]
  );

  // Trigger preview render (downscaled, non-blocking)
  const triggerRender = useCallback(async () => {
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(45);
      const dataUrl = await renderToCanvas(false);
      setRenderProgress(90);
      await yieldToMain();
      if (dataUrl) {
        setPreviewUrl(dataUrl);
        hasRenderedRef.current = true;
        playPrintSound(700);
      }
    } catch (e) {
      console.error('triggerRender error:', e);
    } finally {
      setRenderProgress(null);
      isRenderingRef.current = false;
    }
  }, [renderToCanvas]);

  // Auto-render preview once on mount or when preset, frameColor, layout, or birthday settings change
  useEffect(() => {
    if (frames.length > 0) {
      triggerRender();
    }
  }, [frames, preset, frameColor, layout, birthdayName, birthdayTheme, birthdayAge, birthdayPalette, triggerRender]);

  // Helper to extract high-resolution export canvas blob
  const exportCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    try {
      await yieldToMain();
      const highResDataUrl = await renderToCanvas(true);
      if (!highResDataUrl) {
        console.error("ADMIN UPLOAD ERROR: renderToCanvas returned null");
        return null;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("ADMIN UPLOAD ERROR: canvas element not found");
        return null;
      }
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    } catch (err) {
      console.error("ADMIN UPLOAD ERROR: exportCanvasBlob failed", err);
      return null;
    }
  }, [renderToCanvas]);

  // 1. Initial Save: trigger ONCE when preview canvas is first rendered
  useEffect(() => {
    if (!previewUrl || initialSaveDoneRef.current) return;
    initialSaveDoneRef.current = true;

    const timer = setTimeout(async () => {
      try {
        console.log('[HaloLuna] Initial Save: exporting canvas blob for preset', preset);
        const blob = await exportCanvasBlob();
        if (blob && blob.size > 0) {
          console.log('[HaloLuna] Initial Save: triggering onAutoUpload for preset', preset);
          if (onAutoUpload) {
            onAutoUpload(blob, preset, false);
          } else {
            savePhotoToSupabase(blob, preset, locationRef.current || 'HaloLuna Studio')
              .catch((err) => console.error("ADMIN UPLOAD ERROR:", err));
          }
        } else {
          console.error("ADMIN UPLOAD ERROR: Initial export blob was null or empty");
        }
      } catch (err) {
        console.error("ADMIN UPLOAD ERROR: Initial save failed:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [previewUrl, preset, onAutoUpload, exportCanvasBlob]);

  // Re-render when preset or frameColor changes
  const handlePresetSelect = (newPreset: FramePreset) => {
    if (newPreset === preset) return;
    setPreset(newPreset);
    initialSaveDoneRef.current = false;
  };

  // Download Handler (Full High-Resolution Export + Action Save to Supabase)
  const handleDownload = async () => {
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(45);
      const dataUrl = await renderToCanvas(true);
      setRenderProgress(95);
      await yieldToMain();
      if (!dataUrl) {
        console.error("ADMIN UPLOAD ERROR: Download render returned null");
        return;
      }

      const link = document.createElement('a');
      link.download = `haloluna-${preset}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      // Action Save: Read CURRENT rendered canvas and update database session
      const canvas = canvasRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob && blob.size > 0) {
          console.log('[HaloLuna] Action Save: Updating session on download for preset', preset);
          if (onAutoUpload) {
            onAutoUpload(blob, preset, true);
          } else {
            savePhotoToSupabase(blob, preset, locationRef.current || 'HaloLuna Studio')
              .catch((err) => console.error("ADMIN UPLOAD ERROR:", err));
          }
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
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(35);
      const stripDataUrl = await renderToCanvas(true);
      setRenderProgress(70);
      await yieldToMain();
      if (!stripDataUrl) return;

      const stripImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = stripDataUrl;
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

      // Action Save: Read CURRENT rendered canvas and update database session
      const canvas = canvasRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob && blob.size > 0) {
          console.log('[HaloLuna] Action Save: Updating session on wallpaper export for preset', preset);
          if (onAutoUpload) {
            onAutoUpload(blob, preset, true);
          } else {
            savePhotoToSupabase(blob, preset, locationRef.current || 'HaloLuna Studio')
              .catch((err) => console.error("ADMIN UPLOAD ERROR:", err));
          }
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
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    setRenderProgress(15);
    try {
      await yieldToMain();
      setRenderProgress(45);
      const dataUrl = await renderToCanvas(true);
      setRenderProgress(95);
      await yieldToMain();
      if (!dataUrl) return;

      const canvas = canvasRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob) {
          onShare(blob, preset);
        }
      }
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
              {CUTE_PRESETS.map((p) => (
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

          {/* Birthday Customization Panel (when Cinema Ticket, Pink Bow, or Birthday Cat Pink is selected) */}
          {(preset === 'birthday' || preset === 'birthdayBow' || preset === 'birthdayCatPink') && (
            <div className="p-4 bg-gradient-to-br from-amber-50/70 via-white to-pink-50/70 rounded-xl border border-amber-200/90 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                    {preset === 'birthdayCatPink'
                      ? 'Birthday Cat Settings'
                      : preset === 'birthday'
                      ? 'Editorial Birthday Settings'
                      : 'Pink Bow Settings'}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  {preset === 'birthdayCatPink' ? 'Custom 6-Photo PNG' : 'Korean Studio Redesign'}
                </span>
              </div>

              {/* Custom Birthday Title / Name */}
              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                  Birthday Header Title / Name
                </label>
                <input
                  type="text"
                  value={birthdayNameInput}
                  onChange={(e) => setBirthdayNameInput(e.target.value)}
                  placeholder="e.g. SARAH'S DAY"
                  maxLength={32}
                  className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Quick:</span>
                  {["SARAH'S DAY", "HAPPY BIRTHDAY ANDI", "Hollie's Birthday", "Our Special Day"].map((sug) => (
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

              {/* Birthday Age Input */}
              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                  Age Number (e.g. 21, 24)
                </label>
                <input
                  type="number"
                  value={birthdayAge}
                  onChange={(e) => setBirthdayAge(e.target.value)}
                  placeholder="e.g. 21"
                  min={1}
                  max={120}
                  className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                />
              </div>

              {/* Aesthetic Solid Color Palette Selector (hidden for custom PNG frame) */}
              {preset !== 'birthdayCatPink' && (
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
            </div>
          )}

          {/* Classic Studio Themes */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Layers size={13} className="text-zinc-500" />
              <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest">
                Classic Studio
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CLASSIC_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`p-2.5 text-center rounded-xl border transition-all ${
                    preset === p.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                      : 'bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-400 hover:bg-zinc-50/80 shadow-sm'
                  }`}
                >
                  <span className="text-lg block mb-1">{p.emoji}</span>
                  <p className="text-xs font-semibold truncate">{p.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Color Picker (Editorial Preset) */}
          {preset === 'editorial' && (
            <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                Editorial Frame Tone: {COLOR.label}
              </p>
              <div className="flex gap-2">
                {FRAME_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setFrameColor(c.id);
                      setPreviewUrl(null);
                    }}
                    title={c.label}
                    className={`flex-1 h-9 rounded-lg border-2 transition-all ${
                      frameColor === c.id
                        ? 'border-zinc-900 scale-105 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                    style={{ backgroundColor: c.bg }}
                  />
                ))}
              </div>
            </div>
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
      {renderProgress !== null && (
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
      {previewUrl && renderProgress === null && (
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
              onClick={triggerRender}
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
          onClick={triggerRender}
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
