import type { FramePreset, LayoutType } from '@/components/CanvasEditor';

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
