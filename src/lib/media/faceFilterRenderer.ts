// Paints face filter stickers pinned to a tracked face.
import { FACE_FILTERS_MAP, type FaceFilterPart } from '@/lib/photobooth-shoot-data';
import type { FaceSummary } from './faceTrack';

export const FILTER_ART_BASE = '/assets/filters/';
export const filterArtSrc = (name: string) => `${FILTER_ART_BASE}${name}.webp`;

interface ImageEntry {
  img: HTMLImageElement;
  ok: boolean;
}

const images = new Map<string, ImageEntry>();

function art(name: string): ImageEntry {
  let entry = images.get(name);
  if (!entry) {
    const img = new Image();
    entry = { img, ok: false };
    img.onload = () => {
      entry!.ok = true;
    };
    img.src = filterArtSrc(name);
    images.set(name, entry);
  }
  return entry;
}

export function preloadFilter(filterId: string) {
  const filter = FACE_FILTERS_MAP[filterId];
  if (!filter?.parts?.length) return;
  for (const part of filter.parts) art(part.img);
}

export interface CoverMap {
  s: number;
  ox: number;
  oy: number;
}

export function coverMap(vw: number, vh: number, rect: { x: number; y: number; w: number; h: number }): CoverMap {
  const s = Math.max(rect.w / vw, rect.h / vh);
  return {
    s,
    ox: rect.x + (rect.w - vw * s) / 2,
    oy: rect.y + (rect.h - vh * s) / 2,
  };
}

export function paintFaceFilter(
  cx: CanvasRenderingContext2D,
  filterId: string,
  face: FaceSummary | null,
  map: CoverMap
) {
  if (!filterId || filterId === 'none' || !face) return;
  const filter = FACE_FILTERS_MAP[filterId];
  if (!filter?.parts?.length) return;

  const cos = Math.cos(face.roll);
  const sin = Math.sin(face.roll);

  for (const part of filter.parts) {
    const entry = art(part.img);
    if (!entry.ok || !entry.img.naturalWidth) continue;

    // Anchor on face (head, eyes, nose, mouth, chin)
    const anchor = (face as any)[part.anchor] || face.eyes;

    // Offset in face-width units, rotated with head roll
    const dx = (part.dx || 0) * face.w;
    const dy = (part.dy || 0) * face.w;

    const x = (anchor.x + dx * cos - dy * sin) * map.s + map.ox;
    const y = (anchor.y + dx * sin + dy * cos) * map.s + map.oy;
    const w = part.w * face.w * map.s;
    const h = w * (entry.img.naturalHeight / entry.img.naturalWidth);

    cx.save();
    cx.translate(x, y);
    cx.rotate(face.roll + ((part.rot || 0) * Math.PI) / 180);
    cx.drawImage(entry.img, -w / 2, -h / 2, w, h);
    cx.restore();
  }
}
