/**
 * stickerCache.ts — High-Performance In-Memory Sticker Asset & Alpha-Keying Cache
 * 
 * Pre-processes black-background stickers (r < 25 && g < 25 && b < 25 -> alpha = 0)
 * exactly once on load. Stores keyed HTMLCanvasElement and PNG dataURLs in memory
 * so drag frames and re-renders never scan raw pixel data repeatedly.
 */

export interface KeyedSticker {
  name: string;
  src: string;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

const memoryCache = new Map<string, KeyedSticker>();
const pendingLoads = new Map<string, Promise<KeyedSticker | null>>();

/**
 * Cleanly remove near-black background pixels on a canvas
 */
function keyBlackPixels(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const len = d.length;

  for (let i = 0; i < len; i += 4) {
    if (d[i] < 25 && d[i + 1] < 25 && d[i + 2] < 25) {
      d[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Get a processed transparent sticker synchronously if already in memory
 */
export function getKeyedStickerSync(src: string): KeyedSticker | null {
  return memoryCache.get(src) || null;
}

/**
 * Load, process and cache a transparent sticker in memory
 */
export async function getKeyedSticker(src: string, name: string = ''): Promise<KeyedSticker | null> {
  if (typeof window === 'undefined') return null;

  const existing = memoryCache.get(src);
  if (existing) return existing;

  const pending = pendingLoads.get(src);
  if (pending) return pending;

  const loadPromise = new Promise<KeyedSticker | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeoutId = setTimeout(() => {
      console.warn(`[StickerCache] Timeout loading sticker: ${src}`);
      pendingLoads.delete(src);
      resolve(null);
    }, 4000);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 200;
        canvas.height = img.height || 200;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          pendingLoads.delete(src);
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        keyBlackPixels(ctx, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/png');
        const entry: KeyedSticker = {
          name,
          src,
          canvas,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        };

        memoryCache.set(src, entry);
        pendingLoads.delete(src);
        resolve(entry);
      } catch (err) {
        console.error(`[StickerCache] Failed to process sticker ${src}:`, err);
        pendingLoads.delete(src);
        resolve(null);
      }
    };

    img.onerror = (err) => {
      clearTimeout(timeoutId);
      console.error(`[StickerCache] Failed to load image asset ${src}:`, err);
      pendingLoads.delete(src);
      resolve(null);
    };

    img.src = src;
  });

  pendingLoads.set(src, loadPromise);
  return loadPromise;
}

/**
 * Preload all photobooth stickers concurrently on mount
 */
export async function preloadAllStickers(
  stickers: { name: string; src: string }[]
): Promise<Record<string, string>> {
  const results = await Promise.all(
    stickers.map(async (def) => {
      const keyed = await getKeyedSticker(def.src, def.name);
      return { name: def.name, dataUrl: keyed?.dataUrl || def.src };
    })
  );

  const map: Record<string, string> = {};
  results.forEach((r) => {
    map[r.name] = r.dataUrl;
  });
  return map;
}
