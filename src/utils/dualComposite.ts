'use client';

/**
 * Loads an image from a data URL or blob URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Helper to draw an image covering a target rectangle (object-fit: cover).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = w / h;

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgAspect > targetAspect) {
    // Image is wider than target -> crop sides
    sw = img.naturalHeight * targetAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Image is taller than target -> crop top/bottom
    sh = img.naturalWidth / targetAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export interface MergeDualPhotosOptions {
  width?: number;
  height?: number;
  dividerWidth?: number;
  dividerColor?: string;
}

/**
 * Merges two partner photos into a single side-by-side composite photo.
 * Partner A is placed on the left half, Partner B is placed on the right half.
 *
 * @param photoADataUrl Data URL of Partner A's captured photo (Pink / Left)
 * @param photoBDataUrl Data URL of Partner B's captured photo (Blue / Right)
 * @param options Output dimensions and styling
 * @returns Data URL of the merged composite photo
 */
export async function mergeDualPhotos(
  photoADataUrl: string,
  photoBDataUrl: string,
  options: MergeDualPhotosOptions = {}
): Promise<string> {
  const width = options.width || 1200;
  const height = options.height || 900;
  const dividerWidth = options.dividerWidth ?? 3;
  const dividerColor = options.dividerColor ?? 'rgba(255, 255, 255, 0.6)';

  const [imgA, imgB] = await Promise.all([
    loadImage(photoADataUrl),
    loadImage(photoBDataUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const halfWidth = width / 2;

  // 1. Draw Partner A on the left half
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, halfWidth, height);
  ctx.clip();
  drawImageCover(ctx, imgA, 0, 0, halfWidth, height);
  ctx.restore();

  // 2. Draw Partner B on the right half
  ctx.save();
  ctx.beginPath();
  ctx.rect(halfWidth, 0, halfWidth, height);
  ctx.clip();
  drawImageCover(ctx, imgB, halfWidth, 0, halfWidth, height);
  ctx.restore();

  // 3. Draw soft subtle divider line down the middle
  if (dividerWidth > 0) {
    ctx.save();
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = dividerWidth;
    ctx.beginPath();
    ctx.moveTo(halfWidth, 0);
    ctx.lineTo(halfWidth, height);
    ctx.stroke();
    ctx.restore();
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

