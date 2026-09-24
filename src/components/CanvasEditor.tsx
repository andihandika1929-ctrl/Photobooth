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
  | 'kitty'
  | 'cyberSparkle'
  | 'coquette'
  | 'thermal'
  | 'film35mm'
  | 'y2k';

export type LayoutType = 'strip3' | 'strip4' | 'grid2x2';

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
  layout: LayoutType;
  onShare: (blob: Blob, templateType: string) => void;
  onPreviewReady?: (blob: Blob, templateType: string) => void;
  onReset: () => void;
}

// ─── Constants ────────────────────────────────────────────
const CUTE_PRESETS: { id: FramePreset; label: string; emoji: string; desc: string }[] = [
  { id: 'birthday',     label: 'Cinema Ticket Birthday', emoji: '🎟️', desc: 'OURstudio scalloped ticket & vintage stamp' },
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

const SIGNATURE = 'DIRECTED BY ANDI HANDIKA • 2026';

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

// Hardware-accelerated warm skin-tone rendering (grain applied only on export; preview uses CSS overlay)
function drawGradedPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  borderRadius = 0,
  applyGrain = false,
) {
  ctx.save();
  if (borderRadius > 0) {
    roundRect(ctx, dx, dy, dw, dh, borderRadius);
    ctx.clip();
  }

  // Warm post-processing grade via canvas filter
  ctx.filter = 'contrast(106%) brightness(102%) saturate(105%) sepia(8%)';
  ctx.drawImage(img, dx, dy, dw, dh);
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
  layout,
  onShare,
  onPreviewReady,
  onReset,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    startMX: number;
    startMY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'style' | 'stickers'>('style');
  const [preset, setPreset] = useState<FramePreset>('birthday');
  const [frameColor, setFrameColor] = useState<FrameColorId>('cream');
  const [location, setLocation] = useState('SEOUL STUDIO');
  const [nowPlaying, setNowPlaying] = useState('NewJeans - Hype Boy');
  const [birthdayNameInput, setBirthdayNameInput] = useState("Hollie's Birthday");
  const [birthdayName, setBirthdayName] = useState("Hollie's Birthday");
  const [birthdayTheme, setBirthdayTheme] = useState<'cream' | 'black'>('cream');
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [activeStickerID, setActiveStickerID] = useState<string | null>(null);
  const [stickerThumbnails, setStickerThumbnails] = useState<Record<string, string>>({});

  // Debounce birthday title input to keep UI snappy and prevent canvas re-render thrashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setBirthdayName(birthdayNameInput.trim() || "Hollie's Birthday");
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
  locationRef.current = location;
  nowPlayingRef.current = nowPlaying;
  birthdayNameRef.current = birthdayName;
  birthdayThemeRef.current = birthdayTheme;

  const COLOR = FRAME_COLORS.find((c) => c.id === frameColor)!;

  // Pre-key all sticker images on mount into in-memory cache for transparent drawer thumbnails
  useEffect(() => {
    let mounted = true;
    preloadAllStickers(STICKER_DEFS).then((map) => {
      if (mounted) {
        setStickerThumbnails(map);
      }
    });
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
      if (isExport) {
        const s = 2; // 2x high-resolution canvas export
        if (layout === 'grid2x2') return { w: 1000 * s, h: 1000 * s, s };
        if (layout === 'strip4') return { w: 520 * s, h: 1900 * s, s };
        return { w: 520 * s, h: 1540 * s, s }; // strip3
      } else {
        // Downscaled interactive preview canvas
        if (layout === 'grid2x2') return { w: 400, h: 400, s: 0.4 };
        if (layout === 'strip4') return { w: 390, h: 1425, s: 0.75 };
        return { w: 390, h: 1155, s: 0.75 }; // strip3
      }
    },
    [layout]
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
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading fallback
        }
      }

      const isBlack = birthdayThemeRef.current === 'black';
      const bg = isBlack ? '#141416' : '#FAF7EE';
      const fg = isBlack ? '#E8DFCE' : '#2A2826';
      const muted = isBlack ? '#9E968B' : '#7D776D';
      const borderCol = isBlack ? '#2E2D2A' : '#E8DFCE';
      const accentGold = isBlack ? '#E2B874' : '#B85D3B';

      // Dimensions & ticket notch setup
      const headerH = 155 * s;
      const footerH = 135 * s;
      const notchY = headerH;
      const notchR = 12 * s;

      // Draw Cinema Ticket Base Shape with Scalloped Left/Right Cutouts
      ctx.save();
      ctx.fillStyle = bg;
      ctx.beginPath();
      // Start top-left
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      // Right edge down to notch
      ctx.lineTo(w, notchY - notchR);
      // Right notch (semicircle curved inward)
      ctx.arc(w, notchY, notchR, -Math.PI / 2, Math.PI / 2, true);
      // Right edge to bottom
      ctx.lineTo(w, h);
      // Bottom edge
      ctx.lineTo(0, h);
      // Left edge up to notch
      ctx.lineTo(0, notchY + notchR);
      // Left notch (semicircle curved inward)
      ctx.arc(0, notchY, notchR, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Delicate outer inset frame
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.2 * s;
      ctx.strokeRect(10 * s, 10 * s, w - 20 * s, h - 20 * s);

      // Clean horizontal row of circular negative cutouts / perforated dots dividing header & frames
      const dotR = 2.2 * s;
      const dotGap = 12 * s;
      ctx.fillStyle = isBlack ? '#282725' : '#E2D9C5';
      for (let px = notchR + 14 * s; px < w - notchR - 14 * s; px += dotGap) {
        ctx.beginPath();
        ctx.arc(px, notchY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Header Box ──
      // Top ticket meta
      ctx.fillStyle = muted;
      ctx.font = `600 ${7.5 * s}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('ADMIT ONE  •  NO. BDAY-2026', 22 * s, 34 * s);
      ctx.textAlign = 'right';
      ctx.fillText('KOREAN STUDIO STRIP', w - 22 * s, 34 * s);

      // Thin separator under top meta
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(22 * s, 42 * s);
      ctx.lineTo(w - 22 * s, 42 * s);
      ctx.stroke();

      // Cursive script header: [Name]'s Birthday
      const title = birthdayNameRef.current || "Hollie's Birthday";
      ctx.fillStyle = fg;
      ctx.font = `italic 400 ${32 * s}px "Pinyon Script", "Playfair Display", Georgia, cursive`;
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, 88 * s);

      // Minimalist date stamp underneath (e.g. • 24.09.2026 •)
      ctx.fillStyle = muted;
      ctx.font = `600 ${9.5 * s}px Inter, sans-serif`;
      ctx.fillText(fmtCinemaDate(), w / 2, 112 * s);

      ctx.font = `600 ${7 * s}px Inter, sans-serif`;
      ctx.fillStyle = isBlack ? '#B5ABA0' : '#8A847A';
      ctx.fillText('✦  CELEBRATING SPECIAL MOMENTS  ✦', w / 2, 128 * s);

      // ── Crisp Photo Frames ──
      const pad = 24 * s;
      const gap = 12 * s;
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
          const iy = headerH + 16 * s + r * (ch + gap);
          drawGradedPhoto(ctx, imgs[i], ix, iy, cw, ch, 5 * s, isExport);
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 1.2 * s;
          roundRect(ctx, ix, iy, cw, ch, 5 * s);
          ctx.stroke();
        }
      } else {
        const iw = w - pad * 2;
        const ih = (h - headerH - footerH - 18 * s - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          if (!imgs[i]) continue;
          const iy = headerH + 18 * s + i * (ih + gap);
          drawGradedPhoto(ctx, imgs[i], pad, iy, iw, ih, 5 * s, isExport);
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 1.2 * s;
          roundRect(ctx, pad, iy, iw, ih, 5 * s);
          ctx.stroke();

          // Subtle photo index marker
          ctx.fillStyle = muted;
          ctx.font = `600 ${6.5 * s}px "Courier New", monospace`;
          ctx.textAlign = 'right';
          ctx.fillText(`0${i + 1} / 0${count}`, w - pad - 6 * s, iy + ih - 6 * s);
        }
      }

      // ── Vintage Celebratory Stamp Badge ──
      const stampX = w / 2;
      const stampY = h - 72 * s;
      const stampR = 32 * s;

      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(-0.06); // authentic vintage stamp tilt

      // Outer dashed circle
      ctx.strokeStyle = accentGold;
      ctx.lineWidth = 1.2 * s;
      ctx.setLineDash([3 * s, 3 * s]);
      ctx.beginPath();
      ctx.arc(0, 0, stampR, 0, Math.PI * 2);
      ctx.stroke();

      // Inner solid circle
      ctx.setLineDash([]);
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.arc(0, 0, stampR - 4 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Stamp typography & stars
      ctx.fillStyle = accentGold;
      ctx.textAlign = 'center';
      ctx.font = `bold ${6.5 * s}px Inter, sans-serif`;
      ctx.fillText('✦ SPECIAL DAY ✦', 0, -14 * s);

      ctx.font = `bold ${9 * s}px "Playfair Display", Georgia, serif`;
      ctx.fillText("LET'S CELEBRATE", 0, -1 * s);

      ctx.font = `italic 400 ${7.5 * s}px "Pinyon Script", cursive`;
      ctx.fillText("It's your special day", 0, 11 * s);

      ctx.font = `600 ${5.5 * s}px Inter, sans-serif`;
      ctx.fillText('• OUR STUDIO 2026 •', 0, 20 * s);

      ctx.restore();

      // ── Cinema Ticket Barcode & Serial Footer ──
      const barW = 140 * s;
      const barH = 14 * s;
      drawBarcode(ctx, w / 2 - barW / 2, h - 35 * s, barW, barH, isBlack ? '#5A564F' : '#B0A798');

      ctx.fillStyle = muted;
      ctx.font = `600 ${7.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`* ${fmtDate().replace(/\//g, '')}-BDAY-OURSTUDIO *`, w / 2, h - 16 * s);

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
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading fallback
        }
      }

      // Soft ballet cream background
      ctx.fillStyle = '#FFF6F8';
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

      // Header Typography
      // Bold modern caps "HAPPY BIRTHDAY"
      ctx.fillStyle = '#831843';
      ctx.font = `700 ${19 * s}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('HAPPY BIRTHDAY', w / 2, 54 * s);

      // Paired with romantic cursive script accent
      const title = birthdayNameRef.current || "Hollie's Birthday";
      ctx.fillStyle = '#BE185D';
      ctx.font = `italic 400 ${29 * s}px "Pinyon Script", "Playfair Display", cursive`;
      ctx.fillText(`♡ ${title} ♡`, w / 2, 85 * s);

      // Subtitle
      ctx.fillStyle = '#DB2777';
      ctx.font = `600 ${8 * s}px Inter, sans-serif`;
      ctx.fillText('✦  A BEAUTIFUL DAY TO CELEBRATE YOU  ✦', w / 2, 102 * s);

      // Photo Frames
      const pad = 26 * s;
      const gap = 12 * s;
      const headerH = 118 * s;
      const footerH = 125 * s;
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
          ctx.strokeStyle = '#FBCFE8';
          ctx.lineWidth = 1.5 * s;
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
      ctx.fillText(`• ${fmtCinemaDate()} •`, w / 2, badgeY + 13 * s);

      ctx.font = `600 ${6.5 * s}px Inter, sans-serif`;
      ctx.fillStyle = '#DB2777';
      ctx.fillText('CHERISHED MEMORIES FOREVER', w / 2, badgeY + 22 * s);

      // Watermark Signature
      ctx.fillStyle = '#BE185D';
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(SIGNATURE, w / 2, h - 16 * s);
    },
    [layout]
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

      const pad = 28 * s;
      const gap = 12 * s;
      const headerH = 80 * s;
      const footerH = 100 * s;
      const count = layout === 'strip4' ? 4 : layout === 'strip3' ? 3 : 4;

      // Header
      ctx.fillStyle = COLOR.text;
      ctx.font = `300 ${20 * s}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('PHOTOBOOTH', pad, headerH - 26 * s);

      ctx.font = `400 ${10.5 * s}px "Courier New", monospace`;
      ctx.fillStyle = COLOR.accent;
      ctx.textAlign = 'right';
      ctx.fillText(`${fmtDate()}  ${fmtTime()}`, w - pad, headerH - 26 * s);

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

      ctx.fillStyle = COLOR.accent;
      ctx.font = `600 ${8.5 * s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(SIGNATURE, w / 2, h - 16 * s);
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

        // Load all frames with safety timeout to prevent hanging
        const imgs = await Promise.all(
          frames.map(
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
      preset,
      getDimensions,
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

        // Non-blocking background upload to Supabase storage with full high-res rendering
        if (onPreviewReady) {
          setTimeout(async () => {
            try {
              await renderToCanvas(true);
              const canvas = canvasRef.current;
              if (canvas) {
                const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
                if (blob) {
                  onPreviewReady(blob, preset);
                }
              }
            } catch (err) {
              console.error("Supabase Save Error: high-res canvas conversion failed:", err);
            }
          }, 120);
        }
      }
    } catch (e) {
      console.error('triggerRender error:', e);
    } finally {
      setRenderProgress(null);
      isRenderingRef.current = false;
    }
  }, [renderToCanvas, onPreviewReady, preset]);

  // Auto-render preview once on mount or when preset, frameColor, layout, or birthday settings change
  useEffect(() => {
    if (frames.length > 0) {
      triggerRender();
    }
  }, [frames, preset, frameColor, layout, birthdayName, birthdayTheme, triggerRender]);

  // Re-render when preset or frameColor changes
  const handlePresetSelect = (newPreset: FramePreset) => {
    if (newPreset === preset) return;
    setPreset(newPreset);
  };

  // Download Handler (Full High-Resolution Export + Supabase DB sync)
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
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.download = `photobooth-${preset}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      // Convert canvas to Blob & save to Supabase using exact database schema
      const canvas = canvasRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob) {
          savePhotoToSupabase(blob, preset, location || 'Jakarta Studio')
            .catch((err) => console.error("Supabase Save Error:", err));
        }
      }
    } catch (err) {
      console.error('Download export failed:', err);
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

          {/* Birthday Customization Panel (when Cinema Ticket or Pink Bow is selected) */}
          {(preset === 'birthday' || preset === 'birthdayBow') && (
            <div className="p-4 bg-gradient-to-br from-amber-50/70 via-white to-pink-50/70 rounded-xl border border-amber-200/90 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                    {preset === 'birthday' ? 'Cinema Ticket Settings' : 'Pink Bow Settings'}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  Korean Studio Redesign
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
                  placeholder="e.g. Hollie's Birthday"
                  maxLength={32}
                  className="w-full text-xs font-semibold border border-zinc-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all shadow-xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Quick:</span>
                  {["Hollie's Birthday", "Andi's Birthday", "Happy Birthday ♡", "Our Special Day"].map((sug) => (
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

              {/* Dual Color Themes (Cinema Ticket only) */}
              {preset === 'birthday' && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">
                    Ticket Color Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBirthdayTheme('cream')}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 text-xs font-semibold transition-all ${
                        birthdayTheme === 'cream'
                          ? 'border-zinc-900 bg-white shadow-sm ring-1 ring-zinc-900 font-bold'
                          : 'border-zinc-200 bg-[#FAF7EE] text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-[#FAF7EE] border border-zinc-300 shadow-xs shrink-0" />
                      <div className="text-left">
                        <p className="leading-tight">Warm Soft Cream</p>
                        <p className="text-[9.5px] font-normal text-zinc-500">Charcoal text & accents</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBirthdayTheme('black')}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 text-xs font-semibold transition-all ${
                        birthdayTheme === 'black'
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-900 font-bold'
                          : 'border-zinc-200 bg-[#141416] text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-[#141416] border border-zinc-600 shadow-xs shrink-0" />
                      <div className="text-left">
                        <p className="leading-tight">Dark Jet-Black</p>
                        <p className="text-[9.5px] font-normal text-zinc-400">Cream gold script</p>
                      </div>
                    </button>
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

          {/* Action Buttons */}
          <div className="flex gap-2.5 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 btn-neo-dark flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all"
            >
              <Download size={15} />
              Download PNG
            </button>
            <button
              onClick={handleShareClick}
              className="flex-1 btn-neo flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all"
            >
              <QrCode size={15} />
              Share / QR Code
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
