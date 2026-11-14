'use client';

import type {
  CameraKit,
  CameraKitSession,
  Lens,
} from '@snap/camera-kit';

const DEFAULT_SNAP_API_TOKEN =
  'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzk0NTg1MzU2LCJzdWIiOiIzNGQzODI3Yy03ZDc3LTRmYzAtYmQ1ZC1kMWRhZGIzMjBhZTN-U1RBR0lOR345MGMwMTg5OS0yNDg4LTQ5MWEtOGVkNC1iYTg2NmY0YmY4MTQifQ.0GHortLulapLVmgJ6lPZq_fgYlja-J9jd9KF0zzd04I';

const DEFAULT_SNAP_LENS_GROUP_ID = '3fafbf06-d574-4da4-93ef-adbc23aa1bba';

function getCleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function getSnapApiToken(): string {
  return getCleanEnv(process.env.NEXT_PUBLIC_SNAP_API_TOKEN) || DEFAULT_SNAP_API_TOKEN;
}

export function getSnapLensGroupId(): string {
  return getCleanEnv(process.env.NEXT_PUBLIC_SNAP_LENS_GROUP_ID) || DEFAULT_SNAP_LENS_GROUP_ID;
}

let cameraKitPromise: Promise<CameraKit | null> | null = null;
let cachedLenses: Lens[] | null = null;

export async function getSnapCameraKit(): Promise<CameraKit | null> {
  if (typeof window === 'undefined') return null;

  if (cameraKitPromise) {
    return cameraKitPromise;
  }

  const apiToken = getSnapApiToken();
  if (!apiToken) {
    throw new Error('NEXT_PUBLIC_SNAP_API_TOKEN tidak ditemukan.');
  }

  console.log('[Snap Camera Kit] Menginisialisasi CameraKit dengan API Token Staging...');
  cameraKitPromise = import('@snap/camera-kit')
    .then(({ bootstrapCameraKit }) => bootstrapCameraKit({ apiToken }))
    .then((kit) => {
      console.log('[Snap Camera Kit] CameraKit berhasil diinisialisasi.');
      return kit;
    })
    .catch((err) => {
      console.error('[Snap Camera Kit] Gagal inisialisasi bootstrapCameraKit:', err);
      cameraKitPromise = null;
      throw err;
    });

  return cameraKitPromise;
}

export const GAME_KEYWORDS = [
  'game',
  'play',
  'typing',
  'quiz',
  'test',
  'score',
  'tap',
  'challenge',
  'catch',
  'dodge',
  'puzzle',
  'jump',
  'run',
  'bird',
];

export function filterSnapLenses(
  lenses: Lens[],
  allowedNames: string[] = [],
  excludedNames: string[] = []
): Lens[] {
  // 1. Buang setiap lensa yang lens.name mengandung kata kunci game/tes (case-insensitive)
  const nonGameLenses = lenses.filter((lens) => {
    const lowerName = (lens.name || '').toLowerCase();
    return !GAME_KEYWORDS.some((kw) => lowerName.includes(kw));
  });

  // 2. Buang yang ada di excludedNames
  let filtered = nonGameLenses.filter((lens) => !excludedNames.includes(lens.name));

  // 3. Whitelist check: jika allowedNames diisi, hanya tampilkan lensa tersebut
  if (allowedNames && allowedNames.length > 0) {
    filtered = filtered.filter((lens) => allowedNames.includes(lens.name));
  } else {
    // Jika kosong, tampilkan maksimal 12 lensa yang lolos saringan
    filtered = filtered.slice(0, 12);
  }

  return filtered;
}

export async function loadSnapLenses(
  allowedNames: string[] = [],
  excludedNames: string[] = []
): Promise<Lens[]> {
  if (cachedLenses && cachedLenses.length > 0) {
    return filterSnapLenses(cachedLenses, allowedNames, excludedNames);
  }

  const kit = await getSnapCameraKit();
  if (!kit) {
    throw new Error('Snap Camera Kit gagal diinisialisasi. Periksa koneksi internet Anda.');
  }

  const groupId = getSnapLensGroupId();
  if (!groupId) {
    throw new Error('Lens Group ID tidak ditemukan di konfigurasi.');
  }

  console.log('[Snap Camera Kit] Memuat lenses dari Group ID:', groupId);
  try {
    const response = await kit.lensRepository.loadLensGroups([groupId]);
    console.log('[Snap Camera Kit] Hasil loadLensGroups:', response);
    const { lenses, errors } = response;
    if (errors && errors.length > 0) {
      const errMsg = errors.map((e) => e.message || String(e)).join('; ');
      console.warn('[Snap Camera Kit] Peringatan saat memuat Lens groups:', errMsg);
      if (!lenses || lenses.length === 0) {
        throw new Error(errMsg || 'Gagal mengambil filter dari grup Snap.');
      }
    }
    cachedLenses = lenses || [];
    console.log(`[Snap Camera Kit] Berhasil memuat ${cachedLenses.length} lenses:`, cachedLenses.map((l) => l.name));
    return filterSnapLenses(cachedLenses, allowedNames, excludedNames);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Snap Camera Kit] Gagal memuat Lens group:', error);
    throw error;
  }
}

class SnapSessionManager {
  private session: CameraKitSession | null = null;
  private sessionPromise: Promise<CameraKitSession | null> | null = null;
  private currentStream: MediaStream | null = null;
  private currentLens: Lens | null = null;
  private isPlaying = false;
  private isMirrored = true;
  private listeners: Set<(lens: Lens | null) => void> = new Set();
  private canvasListeners: Set<(canvas: HTMLCanvasElement) => void> = new Set();
  private attachedContainer: HTMLElement | null = null;

  async getSession(): Promise<CameraKitSession | null> {
    if (this.session) return this.session;
    if (this.sessionPromise) return this.sessionPromise;

    const kit = await getSnapCameraKit();
    if (!kit) return null;

    this.sessionPromise = kit
      .createSession()
      .then((session) => {
        this.session = session;
        session.events.addEventListener('error', (event) => {
          console.warn('[Snap Camera Kit] Session error:', event.detail.error);
        });
        const liveCanvas = session.output?.live;
        if (liveCanvas) {
          liveCanvas.className = 'w-full h-full object-cover bg-transparent';
          liveCanvas.style.background = 'transparent';
          liveCanvas.style.backgroundColor = 'transparent';
          this.notifyCanvasReady(liveCanvas);
        }
        return session;
      })
      .catch((err) => {
        console.error('[Snap Camera Kit] Gagal membuat session CameraKit:', err);
        this.sessionPromise = null;
        return null;
      });

    return this.sessionPromise;
  }

  async setSourceStream(stream: MediaStream | null, mirrored = true): Promise<void> {
    if (!stream) {
      this.currentStream = null;
      return;
    }
    this.currentStream = stream;
    this.isMirrored = mirrored;

    const session = await this.getSession();
    if (!session) return;

    try {
      const { createMediaStreamSource } = await import('@snap/camera-kit');
      const source = createMediaStreamSource(stream, {
        cameraType: 'user',
      });
      await session.setSource(source);

      // Determine dimensions from video track
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.();
      const width = settings?.width || 1280;
      const height = settings?.height || 720;

      // Jalankan await session.play()
      await session.play('live');
      this.isPlaying = true;

      // Atur ukuran via setRenderSize
      if (typeof (source as any).setRenderSize === 'function') {
        try {
          await (source as any).setRenderSize(width, height);
        } catch (e) {
          // ignore
        }
      }
      if (typeof (session as any).setRenderSize === 'function') {
        try {
          await (session as any).setRenderSize(width, height);
        } catch (e) {
          // ignore
        }
      }

      // Pastikan background transparent pada live canvas
      const liveCanvas = session.output?.live;
      if (liveCanvas) {
        liveCanvas.className = 'w-full h-full object-cover bg-transparent';
        liveCanvas.style.background = 'transparent';
        liveCanvas.style.backgroundColor = 'transparent';
        this.notifyCanvasReady(liveCanvas);
      }
    } catch (err) {
      console.error('[Snap Camera Kit] Gagal menghubungkan source MediaStream:', err);
    }
  }

  async applyLens(lens: Lens): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;

    try {
      this.currentLens = lens;
      if (this.currentStream && !this.isPlaying) {
        await session.play('live');
        this.isPlaying = true;
      }
      await session.applyLens(lens);
      this.notifyListeners();
      return true;
    } catch (err) {
      console.error('[Snap Camera Kit] Gagal menerapkan lens:', lens.name, err);
      return false;
    }
  }

  async applyLensById(lensId: string, groupLenses?: Lens[]): Promise<boolean> {
    if (lensId === 'none' || !lensId) {
      await this.clearLens();
      return true;
    }

    let lenses = groupLenses;
    if (!lenses || lenses.length === 0) {
      lenses = await loadSnapLenses();
    }

    const targetLens = lenses.find((l) => l.id === lensId);
    if (!targetLens) {
      console.warn('[Snap Camera Kit] Lens tidak ditemukan dengan ID:', lensId);
      return false;
    }

    return this.applyLens(targetLens);
  }

  async clearLens(): Promise<void> {
    this.currentLens = null;
    this.notifyListeners();
    if (!this.session) return;
    try {
      await this.session.removeLens();
    } catch (err) {
      console.error('[Snap Camera Kit] Gagal mencopot lens:', err);
    }
  }

  getLiveCanvas(): HTMLCanvasElement | null {
    return this.session?.output?.live || null;
  }

  getCurrentLens(): Lens | null {
    return this.currentLens;
  }

  subscribe(listener: (lens: Lens | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentLens);
    return () => {
      this.listeners.delete(listener);
    };
  }

  attachLiveCanvas(container: HTMLElement | null): () => void {
    if (!container) return () => {};
    this.attachedContainer = container;

    const setupCanvas = (canvas: HTMLCanvasElement) => {
      canvas.className = 'w-full h-full object-cover bg-transparent';
      canvas.style.background = 'transparent';
      canvas.style.backgroundColor = 'transparent';
      canvas.style.display = 'block';
      if (!container.contains(canvas)) {
        container.innerHTML = '';
        container.appendChild(canvas);
      }
    };

    const canvas = this.getLiveCanvas();
    if (canvas) {
      setupCanvas(canvas);
    }

    const listener = (newCanvas: HTMLCanvasElement) => {
      if (this.attachedContainer === container && newCanvas) {
        setupCanvas(newCanvas);
      }
    };

    this.canvasListeners.add(listener);
    return () => {
      this.canvasListeners.delete(listener);
      if (this.attachedContainer === container) {
        this.attachedContainer = null;
      }
    };
  }

  private notifyCanvasReady(canvas: HTMLCanvasElement): void {
    if (this.attachedContainer && !this.attachedContainer.contains(canvas)) {
      this.attachedContainer.innerHTML = '';
      this.attachedContainer.appendChild(canvas);
    }
    this.canvasListeners.forEach((listener) => {
      try {
        listener(canvas);
      } catch (e) {
        console.error(e);
      }
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentLens);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const snapSessionManager = new SnapSessionManager();
export type { Lens };
