import type { FramePreset, LayoutType } from '@/components/CanvasEditor';
export type { FramePreset, LayoutType };

/**
 * Relative percentage-based text configuration according to PRD v2 Phase 5 (Task 5.1).
 * Coordinates and font size are normalized relative to canvas dimensions to ensure
 * pixel-perfect rendering across downscaled previews and high-res export canvases.
 */
export interface TextConfig {
  hasCustomText: boolean;
  defaultText: string;
  defaultSubText?: string;
  fontFamily: string;     // Value from Curated Font Catalog (e.g. 'Caveat', 'Cherry Bomb One')
  color: string;          // Hex code, e.g. '#FF5E7E'
  xPercent: number;       // 0 - 100, e.g. 50 (horizontal center)
  yPercent: number;       // 0 - 100, e.g. 88 (bottom area)
  fontSizeRatio: number;  // Ratio relative to canvas height, e.g. 0.045
  subYPercent?: number;   // 0 - 100, default position for sub-text
}

export const PRESET_DEFAULT_TEXT_CONFIGS: Record<FramePreset, TextConfig> = {
  birthdayCatPink: {
    hasCustomText: true,
    defaultText: 'Happy Birthday',
    defaultSubText: '21',
    fontFamily: 'Caveat',
    color: '#FF69B4',
    xPercent: 50,
    yPercent: 94.6,
    fontSizeRatio: 0.032,
    subYPercent: 97.2,
  },
  retroTerracotta: {
    hasCustomText: true,
    defaultText: 'Smile came from inside',
    defaultSubText: 'Forever',
    fontFamily: 'Caveat',
    color: '#FFFFFF',
    xPercent: 50,
    yPercent: 92.4,
    fontSizeRatio: 0.039,
    subYPercent: 95.6,
  },
  birthday: {
    hasCustomText: true,
    defaultText: 'Happy Birthday',
    defaultSubText: '21',
    fontFamily: 'Caveat',
    color: '#FF69B4',
    xPercent: 50,
    yPercent: 91,
    fontSizeRatio: 0.035,
    subYPercent: 94.2,
  },
  film35mm: {
    hasCustomText: false,
    defaultText: '',
    defaultSubText: '',
    fontFamily: 'Inter',
    color: '#E8890A',
    xPercent: 50,
    yPercent: 98,
    fontSizeRatio: 0.02,
    subYPercent: 98,
  },
};

export function getPresetTextConfig(preset: FramePreset): TextConfig {
  return (
    PRESET_DEFAULT_TEXT_CONFIGS[preset] ?? {
      hasCustomText: false,
      defaultText: '',
      fontFamily: 'Inter',
      color: '#000000',
      xPercent: 50,
      yPercent: 90,
      fontSizeRatio: 0.03,
    }
  );
}

export type StandardLayoutType = 'strip-1x3' | 'strip-1x4' | 'grid-2x2';

export interface SlotCoord {
  xPct: number; // 0..1 relative to canvas width
  yPct: number; // 0..1 relative to canvas height
  wPct: number; // 0..1 relative to canvas width
  hPct: number; // 0..1 relative to canvas height
  radiusPct?: number; // relative to canvas width
}

export interface StandardLayoutDefinition {
  id: StandardLayoutType;
  name: string;
  description: string;
  shots: number;
  exportWidth: number;
  exportHeight: number;
  previewWidth: number;
  previewHeight: number;
  slots: SlotCoord[];
}

export const STANDARD_LAYOUT_DEFINITIONS: Record<StandardLayoutType, StandardLayoutDefinition> = {
  'strip-1x3': {
    id: 'strip-1x3',
    name: '1x3 Strip',
    description: '3 vertical photos classic photostrip format',
    shots: 3,
    exportWidth: 1200,
    exportHeight: 2800,
    previewWidth: 390,
    previewHeight: 910,
    slots: [
      { xPct: 0.08, yPct: 0.05, wPct: 0.84, hPct: 0.24, radiusPct: 0.01 },
      { xPct: 0.08, yPct: 0.315, wPct: 0.84, hPct: 0.24, radiusPct: 0.01 },
      { xPct: 0.08, yPct: 0.58, wPct: 0.84, hPct: 0.24, radiusPct: 0.01 },
    ],
  },
  'strip-1x4': {
    id: 'strip-1x4',
    name: '1x4 Strip',
    description: '4 vertical photos Korean aesthetic photostrip',
    shots: 4,
    exportWidth: 1200,
    exportHeight: 3600,
    previewWidth: 390,
    previewHeight: 1170,
    slots: [
      { xPct: 0.08, yPct: 0.045, wPct: 0.84, hPct: 0.186, radiusPct: 0.01 },
      { xPct: 0.08, yPct: 0.251, wPct: 0.84, hPct: 0.186, radiusPct: 0.01 },
      { xPct: 0.08, yPct: 0.457, wPct: 0.84, hPct: 0.186, radiusPct: 0.01 },
      { xPct: 0.08, yPct: 0.663, wPct: 0.84, hPct: 0.186, radiusPct: 0.01 },
    ],
  },
  'grid-2x2': {
    id: 'grid-2x2',
    name: '2x2 Grid',
    description: '4 photos in a 2x2 scrapbook square grid',
    shots: 4,
    exportWidth: 1200,
    exportHeight: 1200,
    previewWidth: 400,
    previewHeight: 400,
    slots: [
      { xPct: 0.065, yPct: 0.06, wPct: 0.42, hPct: 0.385, radiusPct: 0.01 },
      { xPct: 0.515, yPct: 0.06, wPct: 0.42, hPct: 0.385, radiusPct: 0.01 },
      { xPct: 0.065, yPct: 0.475, wPct: 0.42, hPct: 0.385, radiusPct: 0.01 },
      { xPct: 0.515, yPct: 0.475, wPct: 0.42, hPct: 0.385, radiusPct: 0.01 },
    ],
  },
};

/** Normalize any incoming layout string to standard layout type */
export function normalizeLayoutType(raw?: string | null): StandardLayoutType {
  if (!raw) return 'strip-1x4';
  if (raw === 'strip-1x3' || raw === 'strip3' || raw === '1x3') return 'strip-1x3';
  if (raw === 'grid-2x2' || raw === 'grid2x2' || raw === '2x2') return 'grid-2x2';
  return 'strip-1x4';
}

/** Convert standard layout type to internal legacy layout type */
export function toLegacyLayout(standard?: string | null): LayoutType {
  const norm = normalizeLayoutType(standard);
  if (norm === 'strip-1x3') return 'strip3';
  if (norm === 'grid-2x2') return 'grid2x2';
  return 'strip4';
}

/**
 * Calculates exact pixel coordinates for photo slots on a canvas of width `w` and height `h`.
 */
export function getSlotsForCanvas(layoutType: string | undefined, canvasWidth: number, canvasHeight: number) {
  const norm = normalizeLayoutType(layoutType);
  const def = STANDARD_LAYOUT_DEFINITIONS[norm] ?? STANDARD_LAYOUT_DEFINITIONS['strip-1x4'];
  return def.slots.map((s) => ({
    x: Math.round(s.xPct * canvasWidth),
    y: Math.round(s.yPct * canvasHeight),
    w: Math.round(s.wPct * canvasWidth),
    h: Math.round(s.hPct * canvasHeight),
    radius: Math.round((s.radiusPct ?? 0.01) * canvasWidth),
  }));
}

/**
 * A frame theme decides the strip layout used in the capture room
 * and the frame artwork the canvas editor opens with.
 */
export interface FrameTheme {
  id: string;
  name: string;
  category?: 'Standard' | 'Birthday' | 'Seasonal' | 'Wedding' | string;
  layout_type?: StandardLayoutType;
  overlay_image_url?: string;
  bg_color?: string;
  is_active?: boolean;
  // Legacy & extended compatibility fields:
  tagline?: string;
  description?: string;
  emoji?: string;
  badge?: string;
  layout: LayoutType;
  preset: FramePreset;
  paper: string;
  ink: string;
  accent: string;
  wash: string;
  textConfig?: TextConfig;
  frame_image_url?: string;
  created_at?: string;
}

/** Built-in Studio Presets that have custom procedural renderers and exact native dimensions */
export const BUILTIN_THEME_IDS = new Set<string>([
  'retro-terracotta',
  'birthday',
  'film-35mm',
  'minimal-warm',
  // Direct preset aliases:
  'birthdayCatPink',
  'retroTerracotta',
  'film35mm',
]);

export function isBuiltinTheme(themeOrId?: FrameTheme | string | null): boolean {
  if (!themeOrId) return true;
  const id = typeof themeOrId === 'string' ? themeOrId : themeOrId.id;
  return BUILTIN_THEME_IDS.has(id);
}

export const INITIAL_FRAME_THEMES: FrameTheme[] = [
  {
    id: 'retro-terracotta',
    name: 'Retro Terracotta Scrapbook',
    tagline: 'Smile came from inside',
    description: 'Four cutouts on warm terracotta paper, paperclips and a handwritten caption band.',
    badge: 'Popular',
    category: 'Standard',
    layout: 'grid2x2',
    preset: 'retroTerracotta',
    paper: '#C74913',
    bg_color: '#C74913',
    ink: '#FFF8F0',
    accent: '#F4C7A8',
    wash: '#F8E4D6',
    overlay_image_url: '/frames/retro-orange-4shot.png',
    frame_image_url: '/frames/retro-orange-4shot.png',
    is_active: true,
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.retroTerracotta,
  },
  {
    id: 'birthday',
    name: 'Birthday Edition',
    tagline: 'Party cat, cake & confetti',
    description: 'A playful six-shot grid wrapped in a pink birthday frame made for group chaos.',
    badge: '6 shots',
    category: 'Birthday',
    layout: 'grid2x3',
    preset: 'birthdayCatPink',
    paper: '#FDEEF3',
    bg_color: '#FDEEF3',
    ink: '#7A2E48',
    accent: '#F2A7C3',
    wash: '#FBE6EE',
    overlay_image_url: '/frames/birthday-cat-pink.png',
    frame_image_url: '/frames/birthday-cat-pink.png',
    is_active: true,
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.birthdayCatPink,
  },
  {
    id: 'film-35mm',
    name: '35mm Film Strip',
    tagline: 'Sprockets & grain',
    description: 'Three wide frames on analogue film stock, complete with sprocket holes.',
    badge: 'Analogue',
    category: 'Seasonal',
    layout: 'strip3',
    preset: 'film35mm',
    paper: '#EFEAE0',
    bg_color: '#EFEAE0',
    ink: '#2B2A26',
    accent: '#A8A08C',
    wash: '#EDE8DC',
    is_active: true,
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.film35mm,
  },
  {
    id: 'minimal-warm',
    name: 'Minimal Warm 4-Strip',
    tagline: 'Clean studio aesthetic',
    description: 'Classic 4-photo vertical photostrip with warm paper borders.',
    badge: 'Classic',
    category: 'Standard',
    layout: 'strip4',
    preset: 'birthday',
    paper: '#FDFBF7',
    bg_color: '#FDFBF7',
    ink: '#1A1A1A',
    accent: '#E8DFCE',
    wash: '#FAF7F0',
    is_active: true,
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.birthday,
  },
];

export const FRAME_THEMES: FrameTheme[] = INITIAL_FRAME_THEMES;
export const DEFAULT_FRAME_ID = INITIAL_FRAME_THEMES[0].id;
export const FRAME_STORAGE_KEY = 'haloluna:selected-frame';
export const FRAMES_STORAGE_KEY = 'haloluna:custom-frame-presets';
export const FRAMES_UPDATED_EVENT = 'haloluna:frames-updated';

/** Photos that end up on the finished strip for a given layout. */
export function slotsForLayout(layout: LayoutType | StandardLayoutType | string): number {
  if (layout === 'strip3' || layout === 'strip-1x3') return 3;
  if (layout === 'grid2x3') return 6;
  return 4;
}

/** Layout label formatter */
export function formatLayoutLabel(layout: LayoutType | StandardLayoutType | string): string {
  switch (layout) {
    case 'grid-2x2':
    case 'grid2x2':
      return '2x2 Grid (4 Shots)';
    case 'grid2x3':
      return '2x3 Grid (6 Shots)';
    case 'strip-1x3':
    case 'strip3':
      return '1x3 Strip (3 Shots)';
    case 'strip-1x4':
    case 'strip4':
      return '1x4 Strip (4 Shots)';
    default:
      return layout;
  }
}

/** Get all stored frames (including custom created & initial defaults) */
export function getStoredFrames(): FrameTheme[] {
  if (typeof window === 'undefined') return INITIAL_FRAME_THEMES;
  try {
    const raw = window.localStorage.getItem(FRAMES_STORAGE_KEY);
    if (!raw) return INITIAL_FRAME_THEMES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_FRAME_THEMES;
  } catch {
    return INITIAL_FRAME_THEMES;
  }
}

/** Persist frames to localStorage and notify active listeners */
export function saveStoredFrames(frames: FrameTheme[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FRAMES_STORAGE_KEY, JSON.stringify(frames));
    window.dispatchEvent(new Event(FRAMES_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

/** Get only active frames (filtered by is_active !== false) for booth and landing page */
export function getActiveFrames(): FrameTheme[] {
  const all = getStoredFrames();
  const active = all.filter((f) => f.is_active !== false);
  return active.length > 0 ? active : INITIAL_FRAME_THEMES;
}

/** Remember the guest's frame so a refresh in the booth keeps the same layout. */
export function persistFrameTheme(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FRAME_STORAGE_KEY, id);
  } catch {
    // Private mode / blocked storage — URL param is still enough
  }
}

export function readPersistedFrameId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(FRAME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Resolves a frame id from the URL, falling back to the first active theme. */
export function getFrameTheme(id?: string | null): FrameTheme {
  const activeFrames = getActiveFrames();
  const allFrames = getStoredFrames();

  if (id) {
    const matched = allFrames.find((t) => t.id === id);
    if (matched) {
      // If the matched frame is active, return it. If inactive, fall back to first active
      if (matched.is_active !== false) return matched;
      return activeFrames[0] ?? matched;
    }
  }

  return activeFrames[0] ?? INITIAL_FRAME_THEMES[0];
}
