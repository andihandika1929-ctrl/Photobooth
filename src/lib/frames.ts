import type { FramePreset, LayoutType } from '@/components/CanvasEditor';

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

/**
 * A frame theme is the single choice a guest makes on the landing page.
 * It decides the strip layout used in the capture room and the frame
 * artwork the canvas editor opens with.
 */
export interface FrameTheme {
  id: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  badge?: string;
  layout: LayoutType;
  preset: FramePreset;
  paper: string;
  ink: string;
  accent: string;
  wash: string;
  textConfig?: TextConfig;
}

export const FRAME_THEMES: FrameTheme[] = [
  {
    id: 'retro-terracotta',
    name: 'Retro Terracotta Scrapbook',
    tagline: 'Smile came from inside',
    description: 'Four cutouts on warm terracotta paper, paperclips and a handwritten caption band.',
    emoji: '📎',
    badge: 'New',
    layout: 'grid2x2',
    preset: 'retroTerracotta',
    paper: '#C74913',
    ink: '#FFF8F0',
    accent: '#F4C7A8',
    wash: '#F8E4D6',
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.retroTerracotta,
  },
  {
    id: 'birthday',
    name: 'Birthday Edition',
    tagline: 'Party cat, cake & confetti',
    description: 'A playful six-shot grid wrapped in a pink birthday frame made for group chaos.',
    emoji: '🎂',
    badge: '6 shots',
    layout: 'grid2x3',
    preset: 'birthdayCatPink',
    paper: '#FDEEF3',
    ink: '#7A2E48',
    accent: '#F2A7C3',
    wash: '#FBE6EE',
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.birthdayCatPink,
  },
  {
    id: 'film-35mm',
    name: '35mm Film Strip',
    tagline: 'Sprockets & grain',
    description: 'Three wide frames on analogue film stock, complete with sprocket holes.',
    emoji: '🎞',
    layout: 'strip3',
    preset: 'film35mm',
    paper: '#EFEAE0',
    ink: '#2B2A26',
    accent: '#A8A08C',
    wash: '#EDE8DC',
    textConfig: PRESET_DEFAULT_TEXT_CONFIGS.film35mm,
  },
];

export const DEFAULT_FRAME_ID = FRAME_THEMES[0].id;
const FRAME_STORAGE_KEY = 'haloluna:selected-frame';

/** Photos that end up on the finished strip for a given layout. */
export function slotsForLayout(layout: LayoutType): number {
  if (layout === 'strip3') return 3;
  if (layout === 'grid2x3') return 6;
  return 4;
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

/** Resolves a frame id from the URL, falling back to the default theme. */
export function getFrameTheme(id?: string | null): FrameTheme {
  return FRAME_THEMES.find((theme) => theme.id === id) ?? FRAME_THEMES[0];
}
