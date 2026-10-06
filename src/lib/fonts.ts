/**
 * Curated Font Catalog for HaloLuna Canvas Engine (PRD v2 Phase 5 - Task 5.2)
 *
 * Provides aesthetics-first typography loaded via Google Fonts / FontFace API,
 * with deterministic pre-flight loading so canvas renders & exports never suffer from
 * font flash, fallback substitution, or coordinate layout shift.
 */

export interface CuratedFont {
  id: string;
  name: string;
  category: 'handwriting' | 'bubble' | 'editorial' | 'chunky' | 'clean';
  fontFamily: string;       // CSS font-family string (e.g. "'Caveat', cursive")
  googleFontFamily: string; // Exact font name for document.fonts.load()
  badge: string;            // Short UI category badge
  description: string;
  previewText?: string;
  isDefault?: boolean;
}

export const CURATED_FONTS: CuratedFont[] = [
  {
    id: 'caveat',
    name: 'Caveat',
    category: 'handwriting',
    fontFamily: "'Caveat', cursive",
    googleFontFamily: 'Caveat',
    badge: 'Handwriting',
    description: 'Playful cute handwriting with warm natural ink strokes',
    previewText: 'Cute Moments',
    isDefault: true,
  },
  {
    id: 'cherry-bomb-one',
    name: 'Cherry Bomb One',
    category: 'bubble',
    fontFamily: "'Cherry Bomb One', cursive",
    googleFontFamily: 'Cherry Bomb One',
    badge: 'Y2K Bubble',
    description: 'Ultra-chubby 2000s Harajuku bubble pop aesthetic',
    previewText: 'Y2K LUNA',
  },
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    category: 'editorial',
    fontFamily: "'Playfair Display', serif",
    googleFontFamily: 'Playfair Display',
    badge: 'Retro Editorial',
    description: 'High-contrast editorial serif for timeless luxury strips',
    previewText: 'Studio Memoir',
  },
  {
    id: 'shrikhand',
    name: 'Shrikhand',
    category: 'chunky',
    fontFamily: "'Shrikhand', cursive",
    googleFontFamily: 'Shrikhand',
    badge: 'Chunky Display',
    description: 'Bold expressive retro curves with punchy presence',
    previewText: 'SUPER STAR',
  },
  {
    id: 'inter',
    name: 'Inter',
    category: 'clean',
    fontFamily: "'Inter', sans-serif",
    googleFontFamily: 'Inter',
    badge: 'Clean Minimalist',
    description: 'Modern Swiss-inspired sans-serif for sharp, clean labels',
    previewText: 'SEOUL • 2026',
  },
  {
    id: 'kalam',
    name: 'Kalam',
    category: 'handwriting',
    fontFamily: "'Kalam', cursive",
    googleFontFamily: 'Kalam',
    badge: 'Ballpoint',
    description: 'Organic handwritten diary feel with relaxed proportions',
    previewText: 'Sweet Memories',
  },
  {
    id: 'dynapuff',
    name: 'DynaPuff',
    category: 'bubble',
    fontFamily: "'DynaPuff', cursive",
    googleFontFamily: 'DynaPuff',
    badge: 'Bouncy Bubble',
    description: 'Inflated marshmallow lettering full of cheerful energy',
    previewText: 'PARTY TIME',
  },
  {
    id: 'bodoni-moda',
    name: 'Bodoni Moda',
    category: 'editorial',
    fontFamily: "'Bodoni Moda', serif",
    googleFontFamily: 'Bodoni Moda',
    badge: 'High Fashion',
    description: 'Dramatic Italian runway fashion serif with razor hair-lines',
    previewText: 'VOGUE EDITION',
  },
  {
    id: 'pacifico',
    name: 'Pacifico',
    category: 'handwriting',
    fontFamily: "'Pacifico', cursive",
    googleFontFamily: 'Pacifico',
    badge: 'Vintage Script',
    description: 'Classic 1950s Californian brush script with warm nostalgia',
    previewText: 'Summer Romance',
  },
  {
    id: 'pinyon-script',
    name: 'Pinyon Script',
    category: 'editorial',
    fontFamily: "'Pinyon Script', cursive",
    googleFontFamily: 'Pinyon Script',
    badge: 'Royal Cursive',
    description: 'Romantic aristocratic calligraphy with graceful flourishes',
    previewText: 'Mon Cheri',
  },
];

export const DEFAULT_CURATED_FONT = CURATED_FONTS[0];

/**
 * Resolves a font definition by ID, name, or CSS font family string.
 */
export function getCuratedFont(fontFamilyOrId?: string): CuratedFont {
  if (!fontFamilyOrId) return DEFAULT_CURATED_FONT;
  const normalized = fontFamilyOrId.toLowerCase().replace(/['"]/g, '').trim();
  const match = CURATED_FONTS.find(
    (f) =>
      f.id.toLowerCase() === normalized ||
      f.name.toLowerCase() === normalized ||
      f.googleFontFamily.toLowerCase() === normalized ||
      f.fontFamily.toLowerCase().replace(/['"]/g, '').includes(normalized)
  );
  return match ?? DEFAULT_CURATED_FONT;
}

/**
 * Normalises any font input into a safe CSS font-family string.
 */
export function getFontFamilyCss(fontFamilyOrId?: string): string {
  return getCuratedFont(fontFamilyOrId).fontFamily;
}

const loadedFontsCache = new Set<string>();

/**
 * Ensures a specific font is fully downloaded and parsed by the browser
 * before canvas drawing or export execution begins.
 */
export async function ensureFontLoaded(
  fontFamilyOrId?: string,
  sampleSize: number = 48
): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return true;
  const font = getCuratedFont(fontFamilyOrId);
  const cacheKey = `${font.googleFontFamily}-${sampleSize}`;
  if (loadedFontsCache.has(cacheKey)) return true;

  try {
    await Promise.allSettled([
      document.fonts.load(`${sampleSize}px "${font.googleFontFamily}"`),
      document.fonts.load(`bold ${sampleSize}px "${font.googleFontFamily}"`),
      document.fonts.load(`700 ${sampleSize}px "${font.googleFontFamily}"`),
      document.fonts.load(`900 ${sampleSize}px "${font.googleFontFamily}"`),
    ]);
    await document.fonts.ready;
    loadedFontsCache.add(cacheKey);
    return true;
  } catch (err) {
    console.warn(`[HaloLuna] Font load fallback for ${font.name}:`, err);
    return false;
  }
}

let allFontsPreloaded = false;

/**
 * Pre-warms all curated font assets in background during idle moments.
 */
export async function preloadAllCuratedFonts(): Promise<void> {
  if (allFontsPreloaded) return;
  if (typeof document === 'undefined' || !document.fonts) return;

  try {
    await Promise.allSettled(
      CURATED_FONTS.map(async (font) => {
        await document.fonts.load(`48px "${font.googleFontFamily}"`);
        loadedFontsCache.add(`${font.googleFontFamily}-48`);
      })
    );
    await document.fonts.ready;
    allFontsPreloaded = true;
  } catch (err) {
    console.warn('[HaloLuna] Preload fonts fallback:', err);
  }
}
