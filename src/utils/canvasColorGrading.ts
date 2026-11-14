/**
 * canvasColorGrading.ts
 * Cross-browser pixel-manipulation engine for Korean studio & 35mm film presets.
 * Provides fallback color grading on mobile WebKit / iOS Safari where ctx.filter is unsupported.
 */

import { type FilterName } from '@/components/CameraViewport';

let _canvasFilterSupported: boolean | null = null;

/**
 * Accurately detects if CanvasRenderingContext2D.filter actually alters rendered pixels.
 * In many mobile Safari / iOS WebKit versions, typeof ctx.filter === 'string', but
 * assigning to it is completely ignored during ctx.drawImage().
 */
export function isCanvasFilterSupported(): boolean {
  if (_canvasFilterSupported !== null) return _canvasFilterSupported;
  if (typeof window === 'undefined') return false;

  try {
    const c1 = document.createElement('canvas');
    c1.width = 2;
    c1.height = 2;
    const ctx1 = c1.getContext('2d');
    if (!ctx1 || typeof ctx1.filter !== 'string') {
      _canvasFilterSupported = false;
      return false;
    }

    ctx1.fillStyle = 'rgb(100, 100, 100)';
    ctx1.fillRect(0, 0, 2, 2);

    const c2 = document.createElement('canvas');
    c2.width = 2;
    c2.height = 2;
    const ctx2 = c2.getContext('2d');
    if (!ctx2) {
      _canvasFilterSupported = false;
      return false;
    }

    ctx2.filter = 'brightness(200%)';
    ctx2.drawImage(c1, 0, 0);

    const pixel = ctx2.getImageData(0, 0, 1, 1).data;
    // If brightness(200%) actually functioned, the channel will be ~200 instead of 100
    _canvasFilterSupported = pixel[0] > 140;
    return _canvasFilterSupported;
  } catch {
    _canvasFilterSupported = false;
    return false;
  }
}

/**
 * Fast integer clamp to [0, 255]
 */
function clamp(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : (val | 0);
}

/**
 * Apply mobile-safe color grading fallback directly to canvas pixel buffer.
 * Runs in ~2-4ms synchronously on modern mobile CPUs.
 */
export function applyPixelFilter(
  ctx: CanvasRenderingContext2D,
  filterId: FilterName | string,
  width: number,
  height: number,
): void {
  if (!filterId || filterId === 'none') return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = data.length;

  switch (filterId) {
    case 'mono':
    case 'leica-noir':
    case 'bw': {
      // Mono / Leica Noir: Grayscale luminosity + contrast + brightness
      const contrast = 1.12;
      const brightness = 1.04;
      for (let i = 0; i < len; i += 4) {
        const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * brightness;
        const c = clamp(((lum - 128) * contrast) + 128);
        data[i] = c;
        data[i + 1] = c;
        data[i + 2] = c;
      }
      break;
    }

    case 'retro': {
      // Retro: Sepia (0.5) + contrast (1.05) + saturate (1.4)
      const c = 1.05;
      const s = 1.35;
      for (let i = 0; i < len; i += 4) {
        let r = ((data[i] - 128) * c) + 128;
        let g = ((data[i + 1] - 128) * c) + 128;
        let bl = ((data[i + 2] - 128) * c) + 128;
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;
        const sr = (r * 0.393) + (g * 0.769) + (bl * 0.189);
        const sg = (r * 0.349) + (g * 0.686) + (bl * 0.168);
        const sb = (r * 0.272) + (g * 0.534) + (bl * 0.131);
        data[i] = clamp(r * 0.5 + sr * 0.5);
        data[i + 1] = clamp(g * 0.5 + sg * 0.5);
        data[i + 2] = clamp(bl * 0.5 + sb * 0.5);
      }
      break;
    }

    case 'film': {
      // Film: Contrast (0.92) + saturate (0.85) + brightness (1.08) + sepia (0.18)
      const b = 1.08;
      const c = 0.92;
      const s = 0.85;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];
        if (r < 50) r += (50 - r) * 0.15;
        if (g < 50) g += (50 - g) * 0.15;
        if (bl < 50) bl += (50 - bl) * 0.15;
        r = ((r * b - 128) * c) + 128;
        g = ((g * b - 128) * c) + 128;
        bl = ((bl * b - 128) * c) + 128;
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;
        const sr = (r * 0.393) + (g * 0.769) + (bl * 0.189);
        const sg = (r * 0.349) + (g * 0.686) + (bl * 0.168);
        const sb = (r * 0.272) + (g * 0.534) + (bl * 0.131);
        data[i] = clamp(r * 0.82 + sr * 0.18);
        data[i + 1] = clamp(g * 0.82 + sg * 0.18);
        data[i + 2] = clamp(bl * 0.82 + sb * 0.18);
      }
      break;
    }

    case 'cool': {
      // Cool: Saturate (1.15) + contrast (1.05) + brightness (1.03) + cyan/cool tone
      const b = 1.03;
      const c = 1.05;
      const s = 1.15;
      for (let i = 0; i < len; i += 4) {
        let r = ((data[i] * b - 128) * c) + 128;
        let g = ((data[i + 1] * b - 128) * c) + 128;
        let bl = ((data[i + 2] * b - 128) * c) + 128;
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;
        r = r * 0.95;
        g = g * 1.02 + 2;
        bl = bl * 1.08 + 6;
        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'peach':
    case 'haru-glow': {
      // Peach / Haru Glow: Soft idol skin smoothing tone, warm peachy glow
      const b = 1.07;
      const c = 0.98;
      const s = 1.20;
      for (let i = 0; i < len; i += 4) {
        let r = ((data[i] * b - 128) * c) + 128;
        let g = ((data[i + 1] * b - 128) * c) + 128;
        let bl = ((data[i + 2] * b - 128) * c) + 128;
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;
        r = r * 1.05 + 7;
        g = g * 1.01 + 2;
        bl = bl * 0.95 - 2;
        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'automat': {
      // Automat: Grayscale (0.5) + sepia (0.45) + contrast (1.14) + brightness (1.02)
      const b = 1.02;
      const c = 1.14;
      const s = 0.90;
      for (let i = 0; i < len; i += 4) {
        let r = ((data[i] * b - 128) * c) + 128;
        let g = ((data[i + 1] * b - 128) * c) + 128;
        let bl = ((data[i + 2] * b - 128) * c) + 128;
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;
        const gray = lum;
        const sr = (gray * 0.393) + (gray * 0.769) + (gray * 0.189);
        const sg = (gray * 0.349) + (gray * 0.686) + (gray * 0.168);
        const sb = (gray * 0.272) + (gray * 0.534) + (gray * 0.131);
        data[i] = clamp(r * 0.5 + sr * 0.5);
        data[i + 1] = clamp(g * 0.5 + sg * 0.5);
        data[i + 2] = clamp(bl * 0.5 + sb * 0.5);
      }
      break;
    }

    case 'namsan': {
      // Namsan Tower Glow: Warmth + contrast + subtle sepia glow
      const b = 1.04;
      const c = 1.04;
      const s = 1.12;
      for (let i = 0; i < len; i += 4) {
        let r = ((data[i] * b - 128) * c) + 128;
        let g = ((data[i + 1] * b - 128) * c) + 128;
        let bl = ((data[i + 2] * b - 128) * c) + 128;
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;
        r = r * 1.03 + 4;
        g = g * 1.01 + 2;
        bl = bl * 0.97 - 2;
        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'portra-400':
    case 'vintage': {
      // Kodak Portra 400: Creamy golden warmth, lifted matte shadows, analog 35mm
      // brightness: 1.03, contrast: 1.04, saturate: 0.92, warm golden tint
      const b = 1.03;
      const c = 1.04;
      const s = 0.92;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        // Lift low-end shadows (matte film look)
        if (r < 50) r += (50 - r) * 0.18;
        if (g < 50) g += (50 - g) * 0.18;
        if (bl < 50) bl += (50 - bl) * 0.18;

        // Brightness & contrast
        r = ((r * b - 128) * c) + 128;
        g = ((g * b - 128) * c) + 128;
        bl = ((bl * b - 128) * c) + 128;

        // Saturation
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;

        // Golden warm film grade
        r = r * 1.04 + 6;
        g = g * 1.02 + 3;
        bl = bl * 0.93 - 4;

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'fuji-astia':
    case 'cyber': {
      // Fuji Astia: Cool pastel clean, slight cyan undertone, vivid colors
      // brightness: 1.05, contrast: 1.02, saturate: 1.10, cool hue
      const b = 1.05;
      const c = 1.02;
      const s = 1.10;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        // Brightness & contrast
        r = ((r * b - 128) * c) + 128;
        g = ((g * b - 128) * c) + 128;
        bl = ((bl * b - 128) * c) + 128;

        // Saturation
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;

        // Cool pastel cyan undertone
        g = g * 1.02 + 2;
        bl = bl * 1.05 + 4;

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'y2k-flash': {
      // Y2K Flash Digicam: Sharp direct-flash, punchy highlights & contrast
      // brightness: 1.12, contrast: 1.18, saturate: 1.08
      const b = 1.12;
      const c = 1.18;
      const s = 1.08;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        // Brightness & contrast
        r = ((r * b - 128) * c) + 128;
        g = ((g * b - 128) * c) + 128;
        bl = ((bl * b - 128) * c) + 128;

        // Saturation
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'muted-mocha': {
      // Muted Mocha: Cinematic low-contrast earth tone with lifted matte shadows
      // brightness: 1.02, contrast: 0.92, saturate: 0.85, sepia earth tone
      const b = 1.02;
      const c = 0.92;
      const s = 0.85;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        // Lift shadows
        if (r < 60) r += (60 - r) * 0.22;
        if (g < 60) g += (60 - g) * 0.22;
        if (bl < 60) bl += (60 - bl) * 0.22;

        // Brightness & contrast
        r = ((r * b - 128) * c) + 128;
        g = ((g * b - 128) * c) + 128;
        bl = ((bl * b - 128) * c) + 128;

        // Saturation
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;

        // Earthy mocha warm tint
        r = r * 1.04 + 6;
        g = g * 1.01 + 3;
        bl = bl * 0.91 - 3;

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }

    case 'natural':
    default: {
      // Studio Natural: Clean, bright, true-to-life studio flash
      // brightness: 1.03, contrast: 1.02, saturate: 1.03
      const b = 1.03;
      const c = 1.02;
      const s = 1.03;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        r = ((r * b - 128) * c) + 128;
        g = ((g * b - 128) * c) + 128;
        bl = ((bl * b - 128) * c) + 128;

        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = lum + (r - lum) * s;
        g = lum + (g - lum) * s;
        bl = lum + (bl - lum) * s;

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(bl);
      }
      break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
