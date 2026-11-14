'use client';

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CameraViewport, {
  type FilterName,
  type ShotClip,
  COUNTDOWN_OPTIONS,
  type CountdownDuration,
  STUDIO_FILTERS,
} from '@/components/CameraViewport';
import CameraViewportDuo from '@/components/CameraViewportDuo';
import RoomLobbyModal from '@/components/room/RoomLobbyModal';
import LiveCursors from '@/components/room/LiveCursors';
import FloatingReactions from '@/components/room/FloatingReactions';
import { usePhotoboothRoom } from '@/lib/realtime/usePhotoboothRoom';
import { useWebRTC } from '@/lib/realtime/useWebRTC';
import type { RoomRole, RoomSyncAction } from '@/lib/realtime/roomTypes';
import CanvasEditor, { type LayoutType } from '@/components/CanvasEditor';
import LoadingScreen from '@/components/LoadingScreen';
import ShareModal from '@/components/ShareModal';
import { initAudio, getMuted, toggleMuted, playCountdownBeep } from '@/components/AudioEngine';
import { fireCelebrationConfetti } from '@/utils/confetti';
import {
  Camera,
  Grid,
  AlignJustify,
  Layers,
  Sparkles,
  Timer,
  Check,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  RotateCcw,
  X,
  Heart,
  Volume2,
  VolumeX,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Palette,
  Clock,
  Pencil,
  Eraser,
  Trash2,
  Type,
  Download,
  Video,
  Image as ImageIcon,
  Share2,
  Loader2,
} from 'lucide-react';
import {
  ALL_THEMES,
  isFrameTheme,
  themeHoles,
  themeWindowShape,
  themeArt,
  type PhotoboothLayoutId,
} from '@/lib/photobooth-themes';
import {
  BACKGROUND_SCENES,
  BACKGROUND_TRAVEL,
  FACE_FILTERS,
  getPoseForShot,
} from '@/lib/photobooth-shoot-data';
import { loadSnapLenses, type Lens } from '@/lib/media/snapCameraKit';
import { savePhotoToSupabase } from '@/utils/supabasePhotoPipeline';

// ==========================================
// Snap Camera Kit Lens Configuration
// - IS_FACE_FILTER_ENABLED: Set ke false selama menunggu persetujuan watermark dari tim Snap.
// - ALLOWED_LENS_NAMES: Jika diisi, HANYA lensa dengan nama ini yang akan ditampilkan.
//   Jika kosong, akan menampilkan maksimal 12 lensa yang lolos saringan kata kunci non-game.
// - EXCLUDED_LENS_NAMES: Daftar nama lensa yang ingin disembunyikan secara manual.
// ==========================================
const IS_FACE_FILTER_ENABLED = false;
const ALLOWED_LENS_NAMES: string[] = [];
const EXCLUDED_LENS_NAMES: string[] = [];
import {
  getFrameTheme,
  persistFrameTheme,
  readPersistedFrameId,
  slotsForLayout,
  saveStoredFrames,
  FRAMES_UPDATED_EVENT,
  getSlotsForCanvas,
  normalizeLayoutType,
  type FrameTheme,
  type StandardLayoutType,
} from '@/lib/frames';

type AppStep = 'capture' | 'select' | 'style' | 'decorate' | 'done' | 'edit';

interface DecoStickerItem {
  cid: string;
  id: number;
  x: number;
  y: number;
  scale: number;
  rot: number;
}

interface DecoTextItem {
  cid: string;
  text: string;
  color: string;
  font: 'sans' | 'serif' | 'mono';
  x: number;
  y: number;
  scale: number;
  rot: number;
}

interface DecoStrokeItem {
  cid: string;
  mode: 'draw' | 'erase';
  color: string;
  size: number;
  pts: number[];
}

const BIRTHDAY_STICKER_IDS = [47, 48, 49, 50, 51, 52, 53, 54, 55, 56];
const WORLDCUP_STICKER_IDS = [34, 35, 36, 37, 38, 39, 40, 41];
const MEME_STICKER_IDS = [71, 57, 72, 59, 73, 60, 74, 58, 61, 75, 64, 62, 63, 76, 65, 66, 77, 67, 68, 78, 69, 70, 79];
const NAMSAN_STICKER_IDS = [80, 81, 82, 83];
const STICKER_COUNT = 83;

const CRAYON_COLORS = [
  '#FF7BA3', '#FF5D73', '#FFB454', '#FFD84D', '#7BD8A6',
  '#5FA0FF', '#B79CFF', '#8B5E3C', '#17181C', '#FFFFFF',
];

const getStickerTray = (style?: string) => {
  const lead = style === 'meme' ? MEME_STICKER_IDS : style === 'namsan' ? NAMSAN_STICKER_IDS : null;
  const allIds = [
    ...BIRTHDAY_STICKER_IDS,
    ...Array.from({ length: STICKER_COUNT }, (_, i) => i + 1).filter(
      (id) => !WORLDCUP_STICKER_IDS.includes(id) && !BIRTHDAY_STICKER_IDS.includes(id) && !MEME_STICKER_IDS.includes(id)
    ),
    ...MEME_STICKER_IDS,
  ];
  if (!lead) return allIds;
  return [...lead, ...allIds.filter((id) => !lead.includes(id))];
};

interface StyleFilterItem {
  id: string;
  cap: string;
  css: string;
  grain: number;
}

const STYLE_FILTERS: StyleFilterItem[] = [
  { id: 'none',    cap: 'Original',   css: 'none',                                                              grain: 0    },
  { id: 'mono',    cap: 'Mono',       css: 'grayscale(1) contrast(1.06)',                                       grain: 0    },
  { id: 'retro',   cap: 'Retro',      css: 'sepia(0.5) contrast(1.05) saturate(1.4) hue-rotate(-10deg)',        grain: 0.12 },
  { id: 'film',    cap: 'Film',       css: 'contrast(0.9) saturate(0.85) brightness(1.08) sepia(0.18)',         grain: 0.24 },
  { id: 'cool',    cap: 'Cool',       css: 'saturate(1.15) contrast(1.05) hue-rotate(18deg) brightness(1.03)',  grain: 0    },
  { id: 'peach',   cap: 'Peach',      css: 'saturate(1.25) contrast(0.98) brightness(1.07) sepia(0.28) hue-rotate(-12deg)', grain: 0 },
  { id: 'automat', cap: 'Automat',    css: 'grayscale(0.5) sepia(0.45) contrast(1.14) brightness(1.02) saturate(0.9)', grain: 0.32 },
  { id: 'namsan',  cap: 'Tower Glow', css: 'saturate(1.12) contrast(1.04) brightness(1.04) sepia(0.14) hue-rotate(-8deg)', grain: 0.06 },
];

const SVG_GRAIN_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

interface CapturedFrame {
  dataUrl: string;
  filter: FilterName;
  clip?: ShotClip;
}

function toPhotoboothLayout(l: string): PhotoboothLayoutId {
  if (l === 'grid2x2' || l === 'grid' || l === 'grid2x3') return 'grid';
  if (l === 'strip2' || l === 'duo') return 'duo';
  if (l === 'polaroid') return 'polaroid';
  return 'vertical';
}

const STUDIO_SHOT_COUNT = 6;

function getOptimalVideoMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'video/mp4';
  }
  const mimeTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  for (const t of mimeTypes) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

const LAYOUTS: { id: LayoutType; label: string; icon: React.ReactNode; frames: number }[] = [
  { id: 'strip4',  label: '4-Frame Strip', icon: <Layers size={14} />,       frames: 4 },
  { id: 'strip3',  label: '3-Frame Strip', icon: <AlignJustify size={14} />, frames: 3 },
  { id: 'grid2x2', label: '2×2 Grid',      icon: <Grid size={14} />,         frames: 4 },
  { id: 'grid2x3', label: '6-Shot (2×3)',  icon: <Grid size={14} />,         frames: 6 },
];

function CaptureRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [frameTheme, setFrameTheme] = useState<FrameTheme>(() => getFrameTheme(searchParams.get('frame')));

  const [appLoaded, setAppLoaded] = useState(false);
  const [step, setStep] = useState<AppStep>('capture');
  const [layout, setLayout] = useState<LayoutType>(() => {
    const paramLayout = searchParams.get('layout');
    if (paramLayout === 'grid2x2' || paramLayout === 'strip4' || paramLayout === 'strip3' || paramLayout === 'grid2x3') {
      return paramLayout as LayoutType;
    }
    return getFrameTheme(searchParams.get('frame')).layout;
  });
  const targetCount =
    layout === 'polaroid'
      ? 1
      : layout === 'strip2' || (layout as string) === 'duo'
      ? 2
      : layout === 'strip3'
      ? 3
      : layout === 'grid2x3'
      ? 6
      : 4;
  const [countdownDuration, setCountdownDuration] = useState<CountdownDuration>(() => {
    const timerParam = searchParams.get('timer');
    if (timerParam === '5' || timerParam === '10' || timerParam === '15') {
      return Number(timerParam) as CountdownDuration;
    }
    if (searchParams.get('mode') === 'friends') return 5;
    return 3;
  });
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [shotClips, setShotClips] = useState<ShotClip[]>([]);
  const shotClipsRef = useRef<ShotClip[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    Array.from({ length: targetCount }, (_, i) => i)
  );
  const [stripSlots, setStripSlots] = useState<(number | null)[]>(() =>
    Array.from({ length: targetCount }, (_, i) => i)
  );
  const [sessionSeconds, setSessionSeconds] = useState(287);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const hasUploadedRef = useRef(false);
  const lastUploadedTemplateRef = useRef<string | null>(null);
  const sessionPhotoIdRef = useRef<string | null>(null);
  const sessionStoragePathRef = useRef<string | null>(null);

  // Realtime Duo Online Photobooth State
  const initialRoom = searchParams.get('room');
  const initialAction = searchParams.get('action');
  const initialRoleParam = searchParams.get('role');

  const isSolo = initialRoleParam === 'solo';
  const determinedRole: RoomRole =
    initialRoleParam === 'guest'
      ? 'guest'
      : initialRoleParam === 'host' || initialAction === 'create' || (!initialAction && !initialRoom)
      ? 'host'
      : 'guest';

  const [roomCode, setRoomCode] = useState<string | null>(isSolo ? null : initialRoom);
  const [role, setRole] = useState<RoomRole>(determinedRole);
  const [isDuoActive, setIsDuoActive] = useState<boolean>(!isSolo && (!!initialRoom || !!initialAction));
  const [showLobbyModal, setShowLobbyModal] = useState<boolean>(!isSolo && (!!initialRoom || !!initialAction));
  const [modalInitialTab, setModalInitialTab] = useState<'create' | 'join'>(
    initialAction === 'join' ? 'join' : 'create'
  );
  const [userName, setUserName] = useState<string>(() => searchParams.get('name') || 'You');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [incomingSyncAction, setIncomingSyncAction] = useState<RoomSyncAction | null>(null);

  // Angie REA Shoot & Get Ready States
  const [selectedBg, setSelectedBg] = useState<string>('none');
  const [selectedFaceFilter, setSelectedFaceFilter] = useState<string>('none');
  const [snapLenses, setSnapLenses] = useState<Lens[]>([]);
  const [isLoadingLenses, setIsLoadingLenses] = useState(false);
  const [lensError, setLensError] = useState<string | null>(null);
  const isBootstrappingRef = useRef(false);
  const [activeTrayTab, setActiveTrayTab] = useState<'background' | 'filter'>('background');
  const [isMyReady, setIsMyReady] = useState(false);
  const [isPartnerReady, setIsPartnerReady] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(1);
  const isShootingRef = useRef(false);
  const hasCompletedShootRef = useRef(false);
  const abortShootRef = useRef(false);
  const callInitiatedPartnerIdRef = useRef<string | null>(null);
  const [shootCountdown, setShootCountdown] = useState<number | null>(null);
  const [triggerSnap, setTriggerSnap] = useState(0);

  // Angie REA Decorate Scene States
  const [decoTab, setDecoTab] = useState<'stickers' | 'draw' | 'text'>('stickers');
  const [decoStickers, setDecoStickers] = useState<DecoStickerItem[]>([]);
  const [selectedDecoCid, setSelectedDecoCid] = useState<string | null>(null);
  const [decoStickerPage, setDecoStickerPage] = useState<number>(0);
  const [decoStrokes, setDecoStrokes] = useState<DecoStrokeItem[]>([]);
  const [activeCrayonColor, setActiveCrayonColor] = useState<string>('#FF7BA3');
  const [activeCrayonSize, setActiveCrayonSize] = useState<number>(0.012);
  const [isCrayonEraser, setIsCrayonEraser] = useState<boolean>(false);
  const [decoTexts, setDecoTexts] = useState<DecoTextItem[]>([]);
  const [decoTextInput, setDecoTextInput] = useState<string>('');
  const [activeTextColor, setActiveTextColor] = useState<string>('#FFFFFF');
  const [activeTextFont, setActiveTextFont] = useState<'sans' | 'serif' | 'mono'>('sans');

  const decoStageRef = useRef<HTMLDivElement | null>(null);
  const decoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DecoStrokeItem | null>(null);
  const stickerDragRef = useRef<{
    cid: string;
    mode: 'drag' | 'transform';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
    initialRot: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Initialize Local Media Stream (Camera first, then mic)
  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera.');
      return;
    }

    try {
      // 1. Request video stream in Full HD (1080p ideal) for pristine snapshot capture
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      setLocalStream(stream);

      // 2. Optionally request microphone track for Duo talk
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }
      } catch (micErr) {
        console.warn('Microphone permission ignored/skipped:', micErr);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError') {
        setCameraError(
          'Izin kamera diblokir oleh Windows atau Chrome. Silakan izinkan akses kamera di Windows Settings > Privacy & security > Camera, lalu aktifkan toggle Chrome dan refresh halaman.'
        );
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat webcam/kamera tidak terdeteksi pada komputer Anda.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError(
          'Kamera sedang digunakan oleh aplikasi lain (Zoom, Teams, atau tab browser lain). Silakan tutup aplikasi tersebut dan coba lagi.'
        );
      } else {
        setCameraError(`Gagal mengakses kamera: ${error.message || 'Unknown error'}`);
      }
    }
  }, []);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    startCamera();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  // Load Snap Camera Kit Lenses with StrictMode guard & try-catch-finally
  const fetchSnapLenses = useCallback(async (force = false) => {
    if (isBootstrappingRef.current && !force) return;
    isBootstrappingRef.current = true;

    setIsLoadingLenses(true);
    setLensError(null);
    try {
      const lenses = await loadSnapLenses(ALLOWED_LENS_NAMES, EXCLUDED_LENS_NAMES);
      setSnapLenses(lenses);
      if (lenses.length === 0) {
        setLensError('Tidak ada filter yang ditemukan di grup ini.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error?.message || 'Gagal memuat Snap Camera Kit filter.';
      console.error('[Snap Camera Kit] Error saat memuat lenses:', error);
      setLensError(msg);
    } finally {
      setIsLoadingLenses(false);
      isBootstrappingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchSnapLenses();
  }, [fetchSnapLenses]);

  useEffect(() => {
    if (activeTrayTab === 'filter' && snapLenses.length === 0 && !isLoadingLenses && !lensError) {
      fetchSnapLenses();
    }
  }, [activeTrayTab, snapLenses.length, isLoadingLenses, lensError, fetchSnapLenses]);

  // Supabase Realtime Channel
  const {
    participantId,
    playerColor,
    participants,
    partner,
    channelStatus,
    remoteCursor,
    reactions,
    sendSignal,
    sendSync,
    sendCursor,
    sendReaction,
    updateCameraReady,
    setOnSignalReceived,
    setOnSyncReceived,
  } = usePhotoboothRoom({
    roomCode: isDuoActive ? roomCode : null,
    userName,
    role,
    enabled: isDuoActive,
  });

  // WebRTC Peer Connection
  const { remoteStream, startCall, requestOffer, handleSignal } = useWebRTC({
    localStream,
    isInitiator: role === 'host',
    onSendSignal: sendSignal,
    senderId: participantId,
    enabled: isDuoActive,
  });

  // Connect WebRTC signal reception
  useEffect(() => {
    setOnSignalReceived((signal) => {
      handleSignal(signal);
    });
  }, [setOnSignalReceived, handleSignal]);

  // Handle incoming room state sync actions
  useEffect(() => {
    setOnSyncReceived((action) => {
      setIncomingSyncAction(action);
      if (action.type === 'LAYOUT_SELECT') {
        setLayout(action.layout as LayoutType);
      } else if (action.type === 'THEME_SELECT') {
        const theme = getFrameTheme(action.frameId);
        setFrameTheme(theme);
        setLayout(theme.layout);
        persistFrameTheme(action.frameId);
      } else if (action.type === 'SCENE_CHANGE') {
        if (action.scene === 'EDIT') setStep('select');
        if (action.scene === 'FILTER') setStep('style');
        if (action.scene === 'DECORATE') setStep('decorate');
        if (action.scene === 'DOWNLOAD') setStep('done');
        if (action.scene === 'BOOTH') {
          setCapturedFrames([]);
          setSelectedIndices([]);
          setStripSlots(Array.from({ length: targetCount }, () => null));
          setStep('capture');
        }
      } else if (action.type === 'SELECT_INDICES') {
        setSelectedIndices(action.indices);
      } else if (action.type === 'STRIP_UPDATE') {
        setStripSlots(action.strip);
      } else if (action.type === 'BG_CHANGE') {
        setSelectedBg(action.bg);
      } else if (action.type === 'FILTER_SELECT') {
        setSelectedFaceFilter(action.filter);
        setSelectedStyleFilter(action.filter);
      } else if (action.type === 'BOOTH_READY') {
        setIsPartnerReady(true);
      } else if (action.type === 'DECO_ADD_STICKER') {
        setDecoStickers((prev) => [
          ...prev.filter((s) => s.cid !== action.cid),
          {
            cid: action.cid,
            id: action.id,
            x: action.x,
            y: action.y,
            scale: action.scale,
            rot: action.rot,
          },
        ]);
      } else if (action.type === 'DECO_MOVE_STICKER') {
        setDecoStickers((prev) =>
          prev.map((s) =>
            s.cid === action.cid
              ? { ...s, x: action.x, y: action.y, scale: action.scale, rot: action.rot }
              : s
          )
        );
      } else if (action.type === 'DECO_REMOVE_STICKER') {
        setDecoStickers((prev) => prev.filter((s) => s.cid !== action.cid));
      } else if (action.type === 'DECO_ADD_STROKE') {
        setDecoStrokes((prev) => [...prev, action.stroke]);
      } else if (action.type === 'DECO_CLEAR_STROKES') {
        setDecoStrokes([]);
      } else if (action.type === 'DECO_ADD_TEXT') {
        setDecoTexts((prev) => [
          ...prev.filter((t) => t.cid !== action.cid),
          {
            cid: action.cid,
            text: action.text,
            color: action.color,
            font: action.font as any,
            x: action.x,
            y: action.y,
            scale: action.scale,
            rot: action.rot,
          },
        ]);
      } else if (action.type === 'DECO_REMOVE_TEXT') {
        setDecoTexts((prev) => prev.filter((t) => t.cid !== action.cid));
      }
    });
  }, [setOnSyncReceived, targetCount]);

  // When partner joins room, host automatically syncs the selected frame theme
  useEffect(() => {
    if (isDuoActive && role === 'host' && partner && frameTheme?.id) {
      sendSync({ type: 'THEME_SELECT', frameId: frameTheme.id });
    }
  }, [isDuoActive, role, partner, frameTheme?.id, sendSync]);

  // Synchronized automatic 6-shot shooting sequence with 1.8s post-shutter BTS buffer
  const startAutomaticShoot = useCallback(async () => {
    if (isShootingRef.current || hasCompletedShootRef.current || capturedFrames.length >= STUDIO_SHOT_COUNT) return;
    abortShootRef.current = false;
    isShootingRef.current = true;
    setIsShooting(true);

    const stream = localStream;
    const optimalMime = getOptimalVideoMimeType();

    for (let shot = 0; shot < STUDIO_SHOT_COUNT; shot++) {
      if (abortShootRef.current) {
        setIsShooting(false);
        isShootingRef.current = false;
        setShootCountdown(null);
        return;
      }

      setCurrentShotIndex(shot + 1);
      let recorder: MediaRecorder | null = null;
      const chunks: Blob[] = [];

      // 1. Initialize and start recorder for this pose prior to countdown
      if (stream && typeof MediaRecorder !== 'undefined' && optimalMime) {
        try {
          recorder = new MediaRecorder(stream, {
            mimeType: optimalMime,
            videoBitsPerSecond: 2_500_000,
          });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          recorder.start(100);
        } catch (e) {
          console.warn('[HaloLuna BTS] MediaRecorder init error:', e);
        }
      }

      // 2. 3-second countdown with beeps
      for (let sec = 3; sec >= 1; sec--) {
        if (abortShootRef.current) {
          try { if (recorder && recorder.state === 'recording') recorder.stop(); } catch (e) {}
          setIsShooting(false);
          isShootingRef.current = false;
          setShootCountdown(null);
          return;
        }
        setShootCountdown(sec);
        try {
          playCountdownBeep(sec);
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 1000));
      }
      setShootCountdown(null);

      if (abortShootRef.current) {
        try { if (recorder && recorder.state === 'recording') recorder.stop(); } catch (e) {}
        setIsShooting(false);
        isShootingRef.current = false;
        return;
      }

      // 3. Trigger shutter snapshot
      setTriggerSnap((n) => n + 1);

      // 4. CRITICAL TOLERANCE BUFFER: Wait 1.8s AFTER shutter snapshot!
      // Captures post-snap user motion/smiles and ensures camera stream buffer writes completely.
      await new Promise((r) => setTimeout(r, 1800));

      if (abortShootRef.current) {
        try { if (recorder && recorder.state === 'recording') recorder.stop(); } catch (e) {}
        setIsShooting(false);
        isShootingRef.current = false;
        return;
      }

      // 5. Cleanly stop recorder and collect full video blob
      if (recorder && recorder.state === 'recording') {
        const shotBlobPromise = new Promise<Blob>((resolve) => {
          recorder!.onstop = () => {
            resolve(new Blob(chunks, { type: recorder!.mimeType || optimalMime || 'video/mp4' }));
          };
        });
        try {
          recorder.stop();
        } catch (e) {}
        const clipBlob = await shotBlobPromise;
        if (clipBlob && clipBlob.size > 0) {
          const clipObj: ShotClip = {
            blob: clipBlob,
            mirrored: true,
            durationMs: 4800,
          };
          shotClipsRef.current[shot] = clipObj;
          setShotClips((prev) => {
            const next = [...prev];
            next[shot] = clipObj;
            return next;
          });
          setCapturedFrames((prev) => {
            const next = [...prev];
            if (next[shot]) {
              next[shot] = {
                ...next[shot],
                clip: clipObj,
              };
            }
            return next;
          });
        }
      }

      // Interval before next shot's countdown
      if (shot < STUDIO_SHOT_COUNT - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Sequence fully completed!
    hasCompletedShootRef.current = true;
    fireCelebrationConfetti();
    const initialSlots = Array.from({ length: targetCount }, (_, i) => i);
    setStripSlots(initialSlots);
    setSelectedIndices(initialSlots);
    if (isDuoActive) {
      sendSync({ type: 'STRIP_UPDATE', strip: initialSlots });
      sendSync({ type: 'SCENE_CHANGE', scene: 'EDIT' });
    }
    setStep('select');
    setIsShooting(false);
    isShootingRef.current = false;
  }, [capturedFrames.length, localStream, targetCount, isDuoActive, sendSync]);

  const isBothReady = isDuoActive ? (isMyReady && isPartnerReady) : isMyReady;

  useEffect(() => {
    if (
      isBothReady &&
      !isShooting &&
      !hasCompletedShootRef.current &&
      capturedFrames.length < STUDIO_SHOT_COUNT &&
      step === 'capture'
    ) {
      startAutomaticShoot();
    }
  }, [isBothReady, isShooting, step, capturedFrames.length, startAutomaticShoot]);

  // When partner joins AND local camera is ready:
  useEffect(() => {
    if (!isDuoActive || !partner || !localStream) {
      if (!partner) callInitiatedPartnerIdRef.current = null;
      return;
    }

    // Only initiate once per partner connection session
    if (callInitiatedPartnerIdRef.current === partner.id) return;
    callInitiatedPartnerIdRef.current = partner.id;

    if (role === 'host') {
      console.log('[HaloLuna Duo] Host initiating WebRTC call to partner:', partner.name);
      startCall();
    } else {
      console.log('[HaloLuna Duo] Guest requesting WebRTC offer from host');
      requestOffer();
    }
  }, [role, partner, isDuoActive, localStream, startCall, requestOffer]);

  // Secret admin access via Ctrl+Shift+A / Cmd+Shift+A shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        router.push('/admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Read the persisted mute preference after mount so SSR markup stays stable
  useEffect(() => {
    setSoundMuted(getMuted());
  }, []);

  // Restore a remembered frame if the URL is missing one (after a refresh)
  useEffect(() => {
    const fromUrl = searchParams.get('frame') || searchParams.get('theme');
    if (!fromUrl) {
      const saved = readPersistedFrameId();
      if (saved) {
        router.replace(`/booth?frame=${saved}`);
        return;
      }
    } else {
      persistFrameTheme(fromUrl);
    }
    const currentTheme = getFrameTheme(fromUrl);
    setFrameTheme(currentTheme);
    setLayout(currentTheme.layout);
  }, [searchParams, router]);

  // Synchronize frames from API route & respond to Admin updates in real-time
  useEffect(() => {
    const syncFramesWithApi = async () => {
      try {
        const res = await fetch('/api/frames');
        if (res.ok) {
          const raw = await res.json();
          const list: FrameTheme[] = Array.isArray(raw) ? raw : (raw.frames || []);
          if (list.length > 0) {
            saveStoredFrames(list);
            const current = getFrameTheme(searchParams.get('frame'));
            setFrameTheme(current);
            setLayout(current.layout);
          }
        }
      } catch (err) {
        console.warn('Could not sync frames in booth:', err);
      }
    };

    syncFramesWithApi();

    const handleFramesUpdate = () => {
      const current = getFrameTheme(searchParams.get('frame'));
      setFrameTheme(current);
      setLayout(current.layout);
    };

    window.addEventListener(FRAMES_UPDATED_EVENT, handleFramesUpdate);
    window.addEventListener('storage', handleFramesUpdate);

    return () => {
      window.removeEventListener(FRAMES_UPDATED_EVENT, handleFramesUpdate);
      window.removeEventListener('storage', handleFramesUpdate);
    };
  }, [searchParams]);

  // Active Theme & Layout properties for 1:1 Angie Frame rendering
  const boothStyle = searchParams.get('theme') || 'classic';
  const isVintage = boothStyle === 'vintage';
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>(() => (isVintage ? 'automat' : 'none'));
  const activeStyleLook = useMemo(() => {
    return STYLE_FILTERS.find((f) => f.id === selectedStyleFilter) || STYLE_FILTERS[0];
  }, [selectedStyleFilter]);
  const frameParam =
    searchParams.get('frame') ||
    (boothStyle !== 'classic' && boothStyle !== 'vintage' && boothStyle !== 'birthday' && boothStyle !== 'meme'
      ? boothStyle
      : 'classic');
  const activeThemeId = frameParam;
  const pbLayout = toPhotoboothLayout(layout);
  const isFrame = isFrameTheme(activeThemeId);
  const holes = themeHoles(activeThemeId, pbLayout);
  const windowShape = themeWindowShape(activeThemeId);
  const artUrl = themeArt(activeThemeId, pbLayout);
  const currentThemeObj =
    ALL_THEMES.find(
      (t) =>
        t.id.toLowerCase() === activeThemeId.toLowerCase() ||
        t.label.toLowerCase() === activeThemeId.toLowerCase()
    ) ||
    ALL_THEMES.find((t) => t.id === 'white') ||
    ALL_THEMES[0];

  // 1:1 REA pool cell aspect ratio (matches Angie cellAspect)
  const poolItemAspect = useMemo(() => {
    // If holes exist for this layout, compute exact hole aspect ratio
    if (holes && holes.length > 0 && holes[0]) {
      const h0 = holes[0];
      const stripAspect = pbLayout === 'grid' ? 1.5 : 1 / 3; // 3:2 or 1:3
      const holeAspect = h0.w / (h0.h / stripAspect);
      if (holeAspect > 0.4 && holeAspect < 2.5) {
        return isDuoActive ? holeAspect / 2 : holeAspect;
      }
    }
    // Fallback based on layout and duo mode
    if (pbLayout === 'duo') return 0.7;
    if (pbLayout === 'polaroid') return 1.0;
    if (pbLayout === 'grid') return 1.3333;
    // vertical
    return isDuoActive ? 0.7 : 1.3333;
  }, [holes, pbLayout, isDuoActive]);

  // Keep stripSlots length in sync with targetCount
  useEffect(() => {
    setStripSlots((prev) => {
      if (prev.length === targetCount) return prev;
      return Array.from({ length: targetCount }, (_, i) => (i < prev.length ? prev[i] : null));
    });
  }, [targetCount]);

  // Handle capture of each shot in the sequence
  const handleCapture = useCallback(
    (dataUrl: string, filter: FilterName, clip?: ShotClip) => {
      initAudio();
      setCapturedFrames((prev) => {
        if (prev.length >= STUDIO_SHOT_COUNT) return prev;
        const next = [...prev, { dataUrl, filter, clip }];
        if (next.length >= STUDIO_SHOT_COUNT) {
          hasCompletedShootRef.current = true;
          fireCelebrationConfetti();
          const initialSlots = Array.from({ length: targetCount }, (_, i) => i);
          setStripSlots(initialSlots);
          setSelectedIndices(initialSlots);
          if (isDuoActive) {
            sendSync({ type: 'STRIP_UPDATE', strip: initialSlots });
            sendSync({ type: 'SCENE_CHANGE', scene: 'EDIT' });
          }
          setTimeout(() => setStep('select'), 300);
        }
        return next;
      });
    },
    [targetCount, isDuoActive, sendSync]
  );

  // Desktop Drag-to-Slide & Horizontal Scroll Controls for Photo Pool (1:1 Angie REA)
  const poolRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const updateScrollButtons = useCallback(() => {
    const el = poolRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(maxScroll - el.scrollLeft > 6);
  }, []);

  const handlePoolMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = poolRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  }, []);

  const handlePoolMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current) return;
    const el = poolRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    updateScrollButtons();
  }, [updateScrollButtons]);

  const handlePoolMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
  }, []);

  const handlePoolWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = poolRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      updateScrollButtons();
    }
  }, [updateScrollButtons]);

  const scrollPoolBy = useCallback((offset: number) => {
    poolRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 250);
  }, [updateScrollButtons]);

  useEffect(() => {
    if (step !== 'select') return;
    const el = poolRef.current;
    if (!el) return;
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [step, updateScrollButtons, capturedFrames.length]);

  // 1:1 Angie REA Pool & Strip slot interactions
  const togglePoolPhoto = useCallback(
    (photoIndex: number) => {
      if (hasDraggedRef.current) return;
      setStripSlots((prev) => {
        let next = [...prev];
        const at = next.indexOf(photoIndex);
        if (at >= 0) {
          // Already in strip -> remove it from strip
          next[at] = null;
        } else {
          // Not in strip -> place into first empty slot
          const empty = next.indexOf(null);
          if (empty >= 0) {
            next[empty] = photoIndex;
          } else {
            // If all slots are full, swap into the last slot
            next[next.length - 1] = photoIndex;
          }
        }
        setSelectedIndices(next.filter((s): s is number => s !== null));
        if (isDuoActive) {
          sendSync({ type: 'STRIP_UPDATE', strip: next });
        }
        return next;
      });
    },
    [isDuoActive, sendSync]
  );

  const clearStripSlot = useCallback(
    (slotIndex: number) => {
      setStripSlots((prev) => {
        if (prev[slotIndex] == null) return prev;
        const next = [...prev];
        next[slotIndex] = null;
        setSelectedIndices(next.filter((s): s is number => s !== null));
        if (isDuoActive) {
          sendSync({ type: 'STRIP_UPDATE', strip: next });
        }
        return next;
      });
    },
    [isDuoActive, sendSync]
  );

  // Toggle selection of photo thumbnail in "Pick 4 out of 6"
  const toggleSelectPhoto = useCallback(
    (photoIndex: number) => {
      setSelectedIndices((prev) => {
        let next: number[];
        if (prev.includes(photoIndex)) {
          // Deselect
          next = prev.filter((i) => i !== photoIndex);
        } else {
          // If already reached max, replace the last slot
          if (prev.length >= targetCount) {
            next = [...prev.slice(0, targetCount - 1), photoIndex];
          } else {
            next = [...prev, photoIndex];
          }
        }
        if (isDuoActive) {
          sendSync({ type: 'SELECT_INDICES', indices: next });
        }
        return next;
      });
    },
    [targetCount, isDuoActive, sendSync]
  );

  // Reordering slots in photostrip preview
  const moveSlotUp = useCallback((slotIndex: number) => {
    if (slotIndex <= 0) return;
    setSelectedIndices((prev) => {
      const next = [...prev];
      const temp = next[slotIndex];
      next[slotIndex] = next[slotIndex - 1];
      next[slotIndex - 1] = temp;
      if (isDuoActive) {
        sendSync({ type: 'SELECT_INDICES', indices: next });
      }
      return next;
    });
  }, [isDuoActive, sendSync]);

  const moveSlotDown = useCallback((slotIndex: number) => {
    setSelectedIndices((prev) => {
      if (slotIndex >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[slotIndex];
      next[slotIndex] = next[slotIndex + 1];
      next[slotIndex + 1] = temp;
      if (isDuoActive) {
        sendSync({ type: 'SELECT_INDICES', indices: next });
      }
      return next;
    });
  }, [isDuoActive, sendSync]);

  const removeSlot = useCallback((slotIndex: number) => {
    setSelectedIndices((prev) => {
      const next = prev.filter((_, i) => i !== slotIndex);
      if (isDuoActive) {
        sendSync({ type: 'SELECT_INDICES', indices: next });
      }
      return next;
    });
  }, [isDuoActive, sendSync]);

  const handleRetakeSingle = useCallback((index: number) => {
    hasUploadedRef.current = false;
    lastUploadedTemplateRef.current = null;
    sessionPhotoIdRef.current = null;
    sessionStoragePathRef.current = null;
    hasCompletedShootRef.current = false;
    isShootingRef.current = false;
    setIsShooting(false);
    setCapturedFrames((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) => prev.filter((i) => i !== index));
    setStep('capture');
  }, []);

  const handleReset = useCallback(() => {
    // 1. Immediately abort and lock any auto-shoot sequence
    abortShootRef.current = true;
    hasCompletedShootRef.current = true;
    isShootingRef.current = false;
    setIsShooting(false);
    setIsMyReady(false);
    setIsPartnerReady(false);
    setShootCountdown(null);

    // 2. Clear upload and session references
    hasUploadedRef.current = false;
    lastUploadedTemplateRef.current = null;
    sessionPhotoIdRef.current = null;
    sessionStoragePathRef.current = null;

    // 3. Clear captured photos
    setCurrentShotIndex(1);
    setCapturedFrames([]);
    setSelectedIndices([]);
    setShareUrl(null);
    setShowShareModal(false);

    // 4. Stop hardware camera and mic streams completely
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      setLocalStream(null);
    }

    if (isDuoActive) {
      sendSync({ type: 'SCENE_CHANGE', scene: 'BOOTH' });
    }
  }, [isDuoActive, sendSync]);

  // Automatic 2-way upload trigger: Initial save on render + Action save on download/wallpaper
  const handleAutoUpload = useCallback(
    async (blob: Blob, templateType: string, isActionSave: boolean = false) => {
      console.log("[HaloLuna] Starting upload for frame:", templateType, "isActionSave:", isActionSave, "size:", blob?.size);

      // If initial save already succeeded for this template and this is not an action save, skip redundant re-upload
      if (!isActionSave && lastUploadedTemplateRef.current === templateType && hasUploadedRef.current) {
        console.log("Already uploaded initial template", templateType, "in this session, skipping duplicate");
        return;
      }

      hasUploadedRef.current = true;
      lastUploadedTemplateRef.current = templateType;
      setIsUploading(true);
      setUploadError(null);

      try {
        const result = await savePhotoToSupabase(
          blob,
          templateType,
          'HaloLuna Studio',
          sessionPhotoIdRef.current || undefined,
          sessionStoragePathRef.current || undefined
        );
        console.log("[HaloLuna] Upload result:", result);
        if (result.success && result.id) {
          sessionPhotoIdRef.current = result.id;
          if (result.storage_path) {
            sessionStoragePathRef.current = result.storage_path;
          }
          setShareUrl(`${window.location.origin}/result/${result.id}`);
          if (isActionSave) {
            setUploadToast('Photostrip synced to cloud!');
            setTimeout(() => setUploadToast(null), 3000);
          }
        } else {
          const errMsg = result.error || 'Upload returned unsuccessful';
          console.error("ADMIN UPLOAD ERROR:", errMsg);
          setUploadError('Cloud sync issue. Your local export is complete.');
          if (!sessionPhotoIdRef.current) {
            hasUploadedRef.current = false;
            lastUploadedTemplateRef.current = null;
          }
        }
      } catch (err) {
        console.error("ADMIN UPLOAD ERROR:", err);
        setUploadError('Cloud sync issue. Your local export is complete.');
        if (!sessionPhotoIdRef.current) {
          hasUploadedRef.current = false;
          lastUploadedTemplateRef.current = null;
        }
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  // Manual share button trigger: uploads to Supabase (or reuses existing session)
  const handleShare = useCallback(
    async (blob: Blob, templateType: string) => {
      setShowShareModal(true);

      // If already uploaded and share link exists, reuse it without duplicate upload
      if (shareUrl && sessionPhotoIdRef.current) return;

      if (!isUploading) {
        hasUploadedRef.current = true;
        setIsUploading(true);
        try {
          const result = await savePhotoToSupabase(
            blob,
            templateType,
            'HaloLuna Studio',
            sessionPhotoIdRef.current || undefined,
            sessionStoragePathRef.current || undefined
          );
          if (result.success && result.id) {
            sessionPhotoIdRef.current = result.id;
            if (result.storage_path) {
              sessionStoragePathRef.current = result.storage_path;
            }
            setShareUrl(`${window.location.origin}/result/${result.id}`);
          } else {
            if (!sessionPhotoIdRef.current) {
              hasUploadedRef.current = false;
            }
          }
        } catch (err) {
          if (!sessionPhotoIdRef.current) {
            hasUploadedRef.current = false;
          }
          console.error("Supabase Save Error:", err);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [shareUrl, isUploading]
  );

  const handleAppComplete = useCallback(() => {
    setAppLoaded(true);
  }, []);

  const handleBack = () => {
    if (step === 'done' || step === 'edit') {
      setStep('decorate');
      if (isDuoActive) {
        sendSync({ type: 'SCENE_CHANGE', scene: 'DECORATE' });
      }
    } else if (step === 'decorate') {
      setStep('style');
    } else if (step === 'style') {
      setStep('select');
    } else if (step === 'select') {
      setStep('capture');
    } else {
      router.push('/');
    }
  };

  const stickerTrayList = useMemo(() => getStickerTray(isVintage ? 'vintage' : 'classic'), [isVintage]);
  const totalStickerPages = Math.max(1, Math.ceil(stickerTrayList.length / 25));
  const currentStickersPageItems = useMemo(() => {
    return stickerTrayList.slice(decoStickerPage * 25, (decoStickerPage + 1) * 25);
  }, [stickerTrayList, decoStickerPage]);

  // Crayon drawing synchronization and canvas rendering
  const redrawCanvasStrokes = useCallback(() => {
    const canvas = decoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of decoStrokes) {
      if (!stroke.pts || stroke.pts.length < 2) continue;
      ctx.save();
      if (stroke.mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      ctx.lineWidth = Math.max(2, stroke.size * canvas.width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.pts[0] * canvas.width, stroke.pts[1] * canvas.height);
      for (let i = 2; i < stroke.pts.length; i += 2) {
        ctx.lineTo(stroke.pts[i] * canvas.width, stroke.pts[i + 1] * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [decoStrokes]);

  useEffect(() => {
    redrawCanvasStrokes();
  }, [redrawCanvasStrokes]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (decoTab !== 'draw') return;
    const canvas = decoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const stroke: DecoStrokeItem = {
      cid: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      mode: isCrayonEraser ? 'erase' : 'draw',
      color: activeCrayonColor,
      size: activeCrayonSize,
      pts: [x, y],
    };
    currentStrokeRef.current = stroke;
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = decoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    const stroke = currentStrokeRef.current;
    stroke.pts.push(x, y);

    const ctx = canvas.getContext('2d');
    if (ctx && stroke.pts.length >= 4) {
      ctx.save();
      if (stroke.mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      ctx.lineWidth = Math.max(2, stroke.size * canvas.width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const len = stroke.pts.length;
      ctx.moveTo(stroke.pts[len - 4] * canvas.width, stroke.pts[len - 3] * canvas.height);
      ctx.lineTo(x * canvas.width, y * canvas.height);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    setDecoStrokes((prev) => [...prev, stroke]);
    if (isDuoActive) {
      sendSync({ type: 'DECO_ADD_STROKE', stroke });
    }
  };

  const handleUndoStroke = () => {
    setDecoStrokes((prev) => prev.slice(0, -1));
    if (isDuoActive) {
      sendSync({ type: 'DECO_CLEAR_STROKES' });
    }
  };

  const handleClearStrokes = () => {
    setDecoStrokes([]);
    if (isDuoActive) {
      sendSync({ type: 'DECO_CLEAR_STROKES' });
    }
  };

  // Sticker actions
  const handleAddSticker = (id: number) => {
    const cid = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSticker: DecoStickerItem = {
      cid,
      id,
      x: 0.5,
      y: 0.5,
      scale: 0.22,
      rot: 0,
    };
    setDecoStickers((prev) => [...prev, newSticker]);
    setSelectedDecoCid(cid);
    if (isDuoActive) {
      sendSync({
        type: 'DECO_ADD_STICKER',
        cid,
        id,
        x: newSticker.x,
        y: newSticker.y,
        scale: newSticker.scale,
        rot: newSticker.rot,
      });
    }
  };

  const handleRemoveSticker = (cid: string) => {
    setDecoStickers((prev) => prev.filter((s) => s.cid !== cid));
    if (selectedDecoCid === cid) setSelectedDecoCid(null);
    if (isDuoActive) {
      sendSync({ type: 'DECO_REMOVE_STICKER', cid });
    }
  };

  const handleStickerPointerDown = (e: React.PointerEvent, cid: string) => {
    if (decoTab === 'draw') return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedDecoCid(cid);
    const sticker = decoStickers.find((s) => s.cid === cid);
    if (!sticker || !decoStageRef.current) return;

    const stageRect = decoStageRef.current.getBoundingClientRect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    stickerDragRef.current = {
      cid,
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      initialX: sticker.x,
      initialY: sticker.y,
      initialScale: sticker.scale,
      initialRot: sticker.rot,
      centerX: stageRect.left + sticker.x * stageRect.width,
      centerY: stageRect.top + sticker.y * stageRect.height,
    };
  };

  const handleTransformPointerDown = (e: React.PointerEvent, cid: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedDecoCid(cid);
    const sticker = decoStickers.find((s) => s.cid === cid);
    if (!sticker || !decoStageRef.current) return;

    const stageRect = decoStageRef.current.getBoundingClientRect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    stickerDragRef.current = {
      cid,
      mode: 'transform',
      startX: e.clientX,
      startY: e.clientY,
      initialX: sticker.x,
      initialY: sticker.y,
      initialScale: sticker.scale,
      initialRot: sticker.rot,
      centerX: stageRect.left + sticker.x * stageRect.width,
      centerY: stageRect.top + sticker.y * stageRect.height,
    };
  };

  const handleStickerPointerMove = (e: React.PointerEvent) => {
    const drag = stickerDragRef.current;
    if (!drag || !decoStageRef.current) return;

    const stageRect = decoStageRef.current.getBoundingClientRect();
    if (drag.mode === 'drag') {
      const dx = (e.clientX - drag.startX) / stageRect.width;
      const dy = (e.clientY - drag.startY) / stageRect.height;
      const nx = Math.min(1, Math.max(0, drag.initialX + dx));
      const ny = Math.min(1, Math.max(0, drag.initialY + dy));

      setDecoStickers((prev) =>
        prev.map((s) => (s.cid === drag.cid ? { ...s, x: nx, y: ny } : s))
      );
    } else if (drag.mode === 'transform') {
      const d0 = Math.max(10, Math.hypot(drag.startX - drag.centerX, drag.startY - drag.centerY));
      const d1 = Math.max(10, Math.hypot(e.clientX - drag.centerX, e.clientY - drag.centerY));
      const a0 = Math.atan2(drag.startY - drag.centerY, drag.startX - drag.centerX);
      const a1 = Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX);

      const nScale = Math.min(0.6, Math.max(0.08, drag.initialScale * (d1 / d0)));
      const nRot = drag.initialRot + (a1 - a0);

      setDecoStickers((prev) =>
        prev.map((s) => (s.cid === drag.cid ? { ...s, scale: nScale, rot: nRot } : s))
      );
    }
  };

  const handleStickerPointerUp = (e: React.PointerEvent) => {
    const drag = stickerDragRef.current;
    if (!drag) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const updated = decoStickers.find((s) => s.cid === drag.cid);
    if (updated && isDuoActive) {
      sendSync({
        type: 'DECO_MOVE_STICKER',
        cid: updated.cid,
        x: updated.x,
        y: updated.y,
        scale: updated.scale,
        rot: updated.rot,
      });
    }
    stickerDragRef.current = null;
  };

  // Text Tool actions
  const handleAddText = () => {
    const trimmed = decoTextInput.trim();
    if (!trimmed) return;
    const cid = `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newText: DecoTextItem = {
      cid,
      text: trimmed,
      color: activeTextColor,
      font: activeTextFont,
      x: 0.5,
      y: 0.5,
      scale: 0.18,
      rot: 0,
    };
    setDecoTexts((prev) => [...prev, newText]);
    setDecoTextInput('');
    setSelectedDecoCid(cid);
    if (isDuoActive) {
      sendSync({
        type: 'DECO_ADD_TEXT',
        cid,
        text: newText.text,
        color: newText.color,
        font: newText.font,
        x: newText.x,
        y: newText.y,
        scale: newText.scale,
        rot: newText.rot,
      });
    }
  };

  const handleAddPresetCaption = (caption: string) => {
    const cid = `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newText: DecoTextItem = {
      cid,
      text: caption,
      color: '#FFFFFF',
      font: 'sans',
      x: 0.5,
      y: decoTexts.length % 2 === 0 ? 0.08 : 0.92,
      scale: 0.18,
      rot: 0,
    };
    setDecoTexts((prev) => [...prev, newText]);
    setSelectedDecoCid(cid);
    if (isDuoActive) {
      sendSync({
        type: 'DECO_ADD_TEXT',
        cid,
        text: newText.text,
        color: newText.color,
        font: newText.font,
        x: newText.x,
        y: newText.y,
        scale: newText.scale,
        rot: newText.rot,
      });
    }
  };

  const handleRemoveText = (cid: string) => {
    setDecoTexts((prev) => prev.filter((t) => t.cid !== cid));
    if (selectedDecoCid === cid) setSelectedDecoCid(null);
    if (isDuoActive) {
      sendSync({ type: 'DECO_REMOVE_TEXT', cid });
    }
  };

  // Convert decoStickers into PlacedSticker format for CanvasEditor
  const editorStickers = useMemo(() => {
    return decoStickers.map((s) => ({
      id: s.cid,
      name: `Sticker ${s.id}`,
      src: `/client/stickers/${s.id}.webp`,
      xPct: s.x,
      yPct: s.y,
      scale: s.scale * 4.5,
      rotation: (s.rot * 180) / Math.PI,
    }));
  }, [decoStickers]);

  // Filtered frames based on stripSlots in exact placement order for the final CanvasEditor
  const activeEditorFrames = useMemo(() => {
    return stripSlots
      .map((slotIdx) => (slotIdx != null && capturedFrames[slotIdx] ? capturedFrames[slotIdx] : null))
      .filter((f): f is CapturedFrame => Boolean(f && f.dataUrl))
      .map((f) => ({
        ...f,
        filter: (selectedStyleFilter !== 'none' ? selectedStyleFilter : f.filter || 'none') as FilterName,
      }));
  }, [stripSlots, capturedFrames, selectedStyleFilter]);

  // Export & Download States for Step 5 (Done)
  const [isExportingHd, setIsExportingHd] = useState(false);
  const [isExportingStandard, setIsExportingStandard] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [isExportingStory, setIsExportingStory] = useState(false);
  const isExporting = isExportingHd || isExportingStandard || isExportingVideo || isExportingStory;
  const doneCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw doodle strokes onto Done scene preview canvas
  useEffect(() => {
    if (step === 'done' || step === 'edit') {
      const canvas = doneCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const stroke of decoStrokes) {
        if (!stroke.pts || stroke.pts.length < 2) continue;
        ctx.save();
        if (stroke.mode === 'erase') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = stroke.color;
        }
        ctx.lineWidth = Math.max(2, stroke.size * canvas.width);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.pts[0] * canvas.width, stroke.pts[1] * canvas.height);
        for (let i = 2; i < stroke.pts.length; i += 2) {
          ctx.lineTo(stroke.pts[i] * canvas.width, stroke.pts[i + 1] * canvas.height);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [step, decoStrokes]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }, []);

  const renderFullStripCanvas = useCallback(
    async (multiplier: number = 3): Promise<HTMLCanvasElement> => {
      const baseW = pbLayout === 'grid' ? 600 : pbLayout === 'polaroid' ? 400 : pbLayout === 'duo' ? 400 : 400;
      const baseH = pbLayout === 'grid' ? 400 : pbLayout === 'polaroid' ? 488 : pbLayout === 'duo' ? 600 : 1200;
      const w = Math.round(baseW * multiplier);
      const h = Math.round(baseH * multiplier);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      // 1. Theme Background
      ctx.fillStyle = currentThemeObj?.bg || '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      if (!isFrame && artUrl) {
        try {
          const bgImg = await loadImage(artUrl);
          ctx.drawImage(bgImg, 0, 0, w, h);
        } catch {
          // fallback to bg color
        }
      }

      // 2. Photos (Guaranteed fallback so slot 4 is never blank or missing)
      for (let slotIdx = 0; slotIdx < targetCount; slotIdx++) {
        const rawShot = stripSlots[slotIdx];
        const shot =
          rawShot != null && capturedFrames[rawShot]
            ? rawShot
            : slotIdx < capturedFrames.length
            ? slotIdx
            : capturedFrames.length > 0
            ? 0
            : null;
        if (shot == null || !capturedFrames[shot]) continue;

        const hole = isFrame && holes ? holes[slotIdx] : null;
        let rx = 0, ry = 0, rw = 0, rh = 0;

        if (hole) {
          rx = hole.x * w;
          ry = hole.y * h;
          rw = hole.w * w;
          rh = hole.h * h;
        } else if (pbLayout === 'grid') {
          const col = slotIdx % 2;
          const row = Math.floor(slotIdx / 2);
          const padX = w * 0.04;
          const padY = h * 0.05;
          const gap = w * 0.03;
          rw = (w - padX * 2 - gap) / 2;
          rh = (h - padY * 2 - gap) / 2;
          rx = padX + col * (rw + gap);
          ry = padY + row * (rh + gap);
        } else {
          const padX = w * 0.05;
          const padTop = h * 0.04;
          const gap = h * 0.02;
          rw = w - padX * 2;
          rh = (h * 0.88 - gap * (targetCount - 1)) / targetCount;
          rx = padX;
          ry = padTop + slotIdx * (rh + gap);
        }

        try {
          const photoImg = await loadImage(capturedFrames[shot].dataUrl);
          ctx.save();
          ctx.beginPath();
          if (windowShape === 'circle') {
            ctx.arc(rx + rw / 2, ry + rh / 2, Math.min(rw, rh) / 2, 0, Math.PI * 2);
          } else {
            const rad = Math.round(4 * multiplier);
            ctx.roundRect(rx, ry, rw, rh, rad);
          }
          ctx.clip();

          if (activeStyleLook.css && activeStyleLook.css !== 'none') {
            ctx.filter = activeStyleLook.css;
          }

          const srcW = photoImg.naturalWidth;
          const srcH = photoImg.naturalHeight;
          const srcRatio = srcW / srcH;
          const targetRatio = rw / rh;

          let sx = 0, sy = 0, sw = srcW, sh = srcH;
          if (srcRatio > targetRatio) {
            sw = srcH * targetRatio;
            sx = (srcW - sw) / 2;
          } else {
            sh = srcW / targetRatio;
            sy = (srcH - sh) * 0.2;
          }

          ctx.drawImage(photoImg, sx, sy, sw, sh, rx, ry, rw, rh);
          ctx.restore();
        } catch (e) {
          console.warn('Failed to draw photo slot:', slotIdx, e);
        }
      }

      // 3. Frame Overlay Art
      if (isFrame && artUrl) {
        try {
          const artImg = await loadImage(artUrl);
          ctx.drawImage(artImg, 0, 0, w, h);
        } catch {
          // proceed without overlay
        }
      }

      // 4. Date & Branding Footer
      if (!currentThemeObj?.noFooter) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const brandStr = 'gethaloluna.com';

        ctx.fillStyle = currentThemeObj?.fg || '#1A2234';
        ctx.font = `600 ${Math.round(11 * multiplier)}px monospace`;
        ctx.fillText(dateStr, w / 2, h - Math.round(28 * multiplier));

        ctx.fillStyle = currentThemeObj?.sub || currentThemeObj?.fg || 'rgba(26, 34, 52, 0.65)';
        ctx.font = `500 ${Math.round(9 * multiplier)}px sans-serif`;
        ctx.fillText(brandStr, w / 2, h - Math.round(14 * multiplier));
        ctx.restore();
      }

      // 5. Drawing Strokes
      if (decoStrokes && decoStrokes.length > 0) {
        for (const stroke of decoStrokes) {
          if (!stroke.pts || stroke.pts.length < 2) continue;
          ctx.save();
          if (stroke.mode === 'erase') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
          }
          ctx.lineWidth = Math.max(2, stroke.size * w);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(stroke.pts[0] * w, stroke.pts[1] * h);
          for (let i = 2; i < stroke.pts.length; i += 2) {
            ctx.lineTo(stroke.pts[i] * w, stroke.pts[i + 1] * h);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Placed Stickers
      for (const stk of decoStickers) {
        try {
          const stkImg = await loadImage(`/client/stickers/${stk.id}.webp`);
          ctx.save();
          const cx = stk.x * w;
          const cy = stk.y * h;
          const sw = stk.scale * w;
          const sh = sw * (stkImg.naturalHeight / stkImg.naturalWidth);

          ctx.translate(cx, cy);
          ctx.rotate(stk.rot);
          ctx.shadowColor = 'rgba(23, 24, 28, 0.22)';
          ctx.shadowBlur = 4 * multiplier;
          ctx.shadowOffsetY = 2 * multiplier;
          ctx.drawImage(stkImg, -sw / 2, -sh / 2, sw, sh);
          ctx.restore();
        } catch (e) {
          console.warn('Failed to draw sticker on export:', stk.id, e);
        }
      }

      // 7. Placed Texts
      for (const txt of decoTexts) {
        ctx.save();
        const cx = txt.x * w;
        const cy = txt.y * h;
        const fontSize = Math.round(txt.scale * 130 * (w / 400));

        ctx.translate(cx, cy);
        ctx.rotate(txt.rot);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px ${txt.font === 'serif' ? 'serif' : txt.font === 'mono' ? 'monospace' : 'sans-serif'}`;

        ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
        ctx.strokeStyle = '#000000';
        ctx.strokeText(txt.text, 0, 0);

        ctx.fillStyle = txt.color;
        ctx.fillText(txt.text, 0, 0);
        ctx.restore();
      }

      return canvas;
    },
    [
      pbLayout,
      currentThemeObj,
      isFrame,
      artUrl,
      targetCount,
      stripSlots,
      capturedFrames,
      holes,
      windowShape,
      activeStyleLook,
      decoStrokes,
      decoStickers,
      decoTexts,
      loadImage,
    ]
  );

  // Auto-sync photostrip to Supabase Cloud upon entering 'done' screen
  useEffect(() => {
    if (step !== 'done' && step !== 'edit') return;
    if (hasUploadedRef.current) return;

    let isMounted = true;
    const runCloudSync = async () => {
      try {
        const canvas = await renderFullStripCanvas(2.2);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob && isMounted && !hasUploadedRef.current) {
          const templateName = currentThemeObj?.id || activeThemeId || 'classic-strip';
          await handleAutoUpload(blob, templateName, false);
        }
      } catch (err) {
        console.warn('[HaloLuna] Initial cloud auto-upload warning:', err);
      }
    };

    const timer = setTimeout(runCloudSync, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [step, renderFullStripCanvas, currentThemeObj, activeThemeId, handleAutoUpload]);

  const handleDownloadHd = useCallback(async () => {
    if (isExporting) return;
    setIsExportingHd(true);
    try {
      const canvas = await renderFullStripCanvas(3.5);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Failed to create PNG blob');

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `haloluna-hd-${currentThemeObj?.id || 'strip'}-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);

      fireCelebrationConfetti();
      setUploadToast('HD Photostrip (300 DPI) downloaded!');
      setTimeout(() => setUploadToast(null), 3500);

      // Cloud sync to Supabase (action save)
      const templateName = currentThemeObj?.id || activeThemeId || 'classic-strip';
      handleAutoUpload(blob, templateName, true).catch((e) => console.warn('Cloud sync error:', e));
    } catch (err) {
      console.error('HD download failed:', err);
      setUploadError('Failed to download HD. Please try again.');
    } finally {
      setIsExportingHd(false);
    }
  }, [isExporting, renderFullStripCanvas, currentThemeObj, activeThemeId, handleAutoUpload]);

  const handleDownloadStandard = useCallback(async () => {
    if (isExporting) return;
    setIsExportingStandard(true);
    try {
      const canvas = await renderFullStripCanvas(1.8);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Failed to create PNG blob');

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `haloluna-standard-${currentThemeObj?.id || 'strip'}-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);

      setUploadToast('Standard quality photostrip saved!');
      setTimeout(() => setUploadToast(null), 3500);

      // Cloud sync to Supabase (action save)
      const templateName = currentThemeObj?.id || activeThemeId || 'classic-strip';
      handleAutoUpload(blob, templateName, true).catch((e) => console.warn('Cloud sync error:', e));
    } catch (err) {
      console.error('Standard download failed:', err);
      setUploadError('Failed to save. Please try again.');
    } finally {
      setIsExportingStandard(false);
    }
  }, [isExporting, renderFullStripCanvas, currentThemeObj, activeThemeId, handleAutoUpload]);

  const handleDownloadVideo = useCallback(async () => {
    if (isExporting) return;
    setIsExportingVideo(true);
    const objectUrls: string[] = [];
    const videoElements: HTMLVideoElement[] = [];

    try {
      // 1. Prepare 720 x 1280 Canvas (standard 9:16 vertical video for Reels/TikTok/Stories)
      const cw = 720;
      const ch = 1280;
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = cw;
      videoCanvas.height = ch;
      const vCtx = videoCanvas.getContext('2d');
      if (!vCtx) throw new Error('Video context error');

      // 2. Pre-render the full photostrip canvas for the outro
      const stripCanvas = await renderFullStripCanvas(2.5);

      // 3. Load BTS video clips or stills for each selected slot (guaranteed all targetCount slots)
      const totalSlots = holes && holes.length > 0 ? holes.length : targetCount;
      const loadedSlots: Array<{
        video: HTMLVideoElement | null;
        still: HTMLImageElement | null;
        mirrored: boolean;
        filterCss?: string;
        slotNumber: number;
      }> = [];

      for (let idx = 0; idx < totalSlots; idx++) {
        const rawShot = stripSlots[idx];
        const shotIdx =
          rawShot != null && capturedFrames[rawShot]
            ? rawShot
            : idx < capturedFrames.length
            ? idx
            : capturedFrames.length > 0
            ? 0
            : null;

        if (shotIdx == null || !capturedFrames[shotIdx]) continue;
        const f = capturedFrames[shotIdx];

        let video: HTMLVideoElement | null = null;
        if (f.clip && f.clip.blob && f.clip.blob.size > 0) {
          const url = URL.createObjectURL(f.clip.blob);
          objectUrls.push(url);
          const v = document.createElement('video');
          v.src = url;
          v.muted = true;
          v.playsInline = true;
          v.setAttribute('playsinline', '');
          v.preload = 'auto';
          v.loop = true; // Looping / Boomerang so video never ends or goes black mid-sequence

          const ready = await new Promise<boolean>((res) => {
            const t = setTimeout(() => res(false), 3500);
            v.onloadeddata = () => {
              clearTimeout(t);
              res(true);
            };
            v.onerror = () => {
              clearTimeout(t);
              res(false);
            };
          });
          if (ready) {
            video = v;
            videoElements.push(v);
          }
        }

        const still = await loadImage(f.dataUrl).catch(() => null);
        loadedSlots.push({
          video,
          still,
          mirrored: Boolean(f.clip?.mirrored),
          filterCss: activeStyleLook.css !== 'none' ? activeStyleLook.css : undefined,
          slotNumber: idx + 1,
        });
      }

      if (loadedSlots.length === 0) {
        throw new Error('No photos or BTS clips available');
      }

      const FPS = 30;
      const FRAME_DURATION = 1000 / FPS;
      const FRAMES_PER_SLOT = Math.round(FPS * 1.8); // 1.8s per slot
      const FLASH_FRAMES = 4;
      const ENDING_FRAMES = 75; // 2.5s outro

      // 4. Setup MP4 Encoder: Prioritize mp4-muxer (via WebCodecs H.264) for 100% iPhone & Android gallery compatibility
      const supportsWebCodecs =
        typeof window !== 'undefined' &&
        typeof (window as any).VideoEncoder === 'function' &&
        typeof (window as any).VideoFrame === 'function';

      let muxer: any = null;
      let videoEncoder: any = null;
      let mediaRecorder: MediaRecorder | null = null;
      let mediaRecorderPromise: Promise<Blob> | null = null;
      let canvasStream: any = null;
      let recordingMimeType = '';

      if (supportsWebCodecs) {
        try {
          const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
          muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
              codec: 'avc',
              width: cw,
              height: ch,
            },
            fastStart: 'in-memory',
            firstTimestampBehavior: 'strict',
          });

          let selectedCodec = 'avc1.42001f';
          if (typeof (window as any).VideoEncoder.isConfigSupported === 'function') {
            const check = await (window as any).VideoEncoder.isConfigSupported({
              codec: selectedCodec,
              width: cw,
              height: ch,
              bitrate: 4_000_000,
              framerate: FPS,
            });
            if (!check.supported) selectedCodec = 'avc1.4d002a';
          }

          videoEncoder = new (window as any).VideoEncoder({
            output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
            error: (e: any) => console.error('[HaloLuna VideoEncoder error]', e),
          });
          videoEncoder.configure({
            codec: selectedCodec,
            width: cw,
            height: ch,
            bitrate: 4_000_000,
            framerate: FPS,
          });
        } catch (encErr) {
          console.warn('[HaloLuna WebCodecs init failed, fallback to MediaRecorder]', encErr);
          muxer = null;
          videoEncoder = null;
        }
      }

      if (!muxer || !videoEncoder) {
        // Fallback to MediaRecorder with prioritized MP4 MIME types
        recordingMimeType = getOptimalVideoMimeType();
        canvasStream = (videoCanvas as any).captureStream(FPS);
        mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType: recordingMimeType || undefined,
          videoBitsPerSecond: 4_000_000,
        });
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorderPromise = new Promise<Blob>((resolve) => {
          mediaRecorder!.onstop = () =>
            resolve(new Blob(chunks, { type: mediaRecorder!.mimeType || recordingMimeType || 'video/mp4' }));
        });
        mediaRecorder.start(200);
      }

      let currentFrameIndex = 0;
      const pushFrame = () => {
        if (videoEncoder && (videoEncoder as any).state === 'configured') {
          const frameUs = Math.round((currentFrameIndex * 1_000_000) / FPS);
          const vFrame = new (window as any).VideoFrame(videoCanvas, {
            timestamp: frameUs,
            duration: Math.round(1_000_000 / FPS),
          });
          videoEncoder.encode(vFrame, { keyFrame: currentFrameIndex % 30 === 0 });
          vFrame.close();
        }
        currentFrameIndex++;
      };

      // 5. Sequence: Render each slot's real BTS video with balanced golden-ratio eye-level framing (Detik 0-8)
      for (let i = 0; i < loadedSlots.length; i++) {
        const slot = loadedSlots[i];
        if (slot.video) {
          slot.video.currentTime = 0;
          await slot.video.play().catch(() => {});
        }

        for (let f = 0; f < FRAMES_PER_SLOT; f++) {
          const tickStart = performance.now();

          // Background
          vCtx.fillStyle = '#0F0F12';
          vCtx.fillRect(0, 0, cw, ch);

          let drawn = false;

          // Draw Live Video if ready and active with balanced center-crop
          if (slot.video && slot.video.readyState >= 2 && slot.video.videoWidth > 0 && !slot.video.ended) {
            const vw = slot.video.videoWidth;
            const vh = slot.video.videoHeight;
            const vRatio = vw / vh;
            const cRatio = cw / ch;

            let sx = 0, sy = 0, sw = vw, sh = vh;
            if (vRatio > cRatio) {
              sw = Math.round(vh * cRatio);
              sx = Math.round((vw - sw) / 2);
              sh = vh;
              sy = 0;
            } else {
              sh = Math.round(vw / cRatio);
              sw = vw;
              sx = 0;
              sy = Math.max(0, Math.round((vh - sh) * 0.20)); // Anchor 20% from top so head/hair isn't clipped
            }

            // Balanced vertical framing: -7% lift removes excessive ceiling and lifts user face to natural eye level
            const yLift = Math.round(ch * 0.07);
            const destY = -yLift;
            const destH = ch + yLift * 2;

            vCtx.save();
            if (slot.mirrored) {
              vCtx.translate(cw, 0);
              vCtx.scale(-1, 1);
            }
            if (slot.filterCss) {
              vCtx.filter = slot.filterCss;
            }
            try {
              vCtx.drawImage(slot.video, sx, sy, sw, sh, 0, destY, cw, destH);
              drawn = true;
            } catch (err) {
              drawn = false;
            }
            vCtx.restore();
          }

          // Guaranteed Fallback if video failed or not ready: Draw crisp still photo with balanced eye-level framing
          if (!drawn && slot.still) {
            const sw = slot.still.naturalWidth || cw;
            const sh = slot.still.naturalHeight || ch;
            const sRatio = sw / sh;
            const cRatio = cw / ch;

            let sx = 0, sy = 0, dw = sw, dh = sh;
            if (sRatio > cRatio) {
              dw = Math.round(sh * cRatio);
              sx = Math.round((sw - dw) / 2);
              dh = sh;
              sy = 0;
            } else {
              dh = Math.round(sw / cRatio);
              dw = sw;
              sx = 0;
              sy = Math.max(0, Math.round((sh - dh) * 0.20));
            }

            const yLift = Math.round(ch * 0.07);
            const destY = -yLift;
            const destH = ch + yLift * 2;

            const zoom = 1 + (f / FRAMES_PER_SLOT) * 0.04;
            vCtx.save();
            vCtx.translate(cw / 2, ch / 2);
            vCtx.scale(zoom, zoom);
            if (slot.filterCss) vCtx.filter = slot.filterCss;
            vCtx.drawImage(slot.still, sx, sy, dw, dh, -cw / 2, destY, cw, destH);
            vCtx.restore();
            drawn = true;
          }

          // Overlay: Aesthetic Photoism/Life4Cuts BTS Watermark & Badge
          vCtx.save();
          // Top REC pill
          vCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          vCtx.beginPath();
          vCtx.roundRect(32, 40, 150, 36, 18);
          vCtx.fill();

          // Red blinking dot
          const isBlink = Math.floor(f / 15) % 2 === 0;
          vCtx.fillStyle = isBlink ? '#FF2E79' : '#666666';
          vCtx.beginPath();
          vCtx.arc(52, 58, 6, 0, Math.PI * 2);
          vCtx.fill();

          vCtx.fillStyle = '#FFFFFF';
          vCtx.font = '700 13px sans-serif';
          vCtx.textBaseline = 'middle';
          vCtx.fillText('BTS REC', 68, 59);

          // Frame number badge: bottom left
          vCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          vCtx.beginPath();
          vCtx.roundRect(32, ch - 80, 160, 40, 20);
          vCtx.fill();

          vCtx.fillStyle = '#FFFFFF';
          vCtx.font = 'bold 14px monospace';
          vCtx.fillText(`SHOT ${slot.slotNumber} / ${loadedSlots.length}`, 50, ch - 60);

          // Studio Branding top right
          vCtx.textAlign = 'right';
          vCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          vCtx.font = '600 12px monospace';
          vCtx.letterSpacing = '2px';
          vCtx.fillText('HALOLUNA STUDIO', cw - 32, 60);

          vCtx.restore();

          pushFrame();

          if (!videoEncoder) {
            const spent = performance.now() - tickStart;
            await new Promise((r) => setTimeout(r, Math.max(0, FRAME_DURATION - spent)));
          } else if (f % 10 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        if (slot.video) {
          slot.video.pause();
        }
      }

      // 6. Camera Shutter Flash (4 frames = ~130ms)
      for (let f = 0; f < FLASH_FRAMES; f++) {
        vCtx.fillStyle = `rgba(255, 255, 255, ${1 - f * 0.22})`;
        vCtx.fillRect(0, 0, cw, ch);
        pushFrame();
        if (!videoEncoder) {
          await new Promise((r) => setTimeout(r, FRAME_DURATION));
        }
      }

      // 7. Dynamic Moving Outro Photostrip (Detik 8-10, 75 frames = 2.5s)
      // Plays shotClips in a loop inside each slot with activeFrame overlay PNG on top!
      const activeLayoutType: StandardLayoutType = normalizeLayoutType(frameTheme?.layout_type || layout);

      let stripW = 350;
      let stripH = 1050;
      if (activeLayoutType === 'grid-2x2') {
        stripW = 540;
        stripH = 540;
      } else if (activeLayoutType === 'strip-1x3') {
        stripW = 360;
        stripH = 1080;
      } else if (activeLayoutType === 'grid-2x3') {
        stripW = 540;
        stripH = 810;
      }

      // Slot coordinates matching CanvasEditor
      let slotRects: Array<{ x: number; y: number; w: number; h: number; radius?: number }> = [];
      if (holes && holes.length > 0) {
        slotRects = holes.map((h) => ({
          x: Math.round(h.x * stripW),
          y: Math.round(h.y * stripH),
          w: Math.round(h.w * stripW),
          h: Math.round(h.h * stripH),
          radius: windowShape === 'circle' ? Math.round(Math.min(h.w * stripW, h.h * stripH) / 2) : 3,
        }));
      } else {
        slotRects = getSlotsForCanvas(activeLayoutType, stripW, stripH);
      }

      // Active Frame Overlay Image
      const overlayUrl = frameTheme?.overlay_image_url || artUrl;
      let overlayImg: HTMLImageElement | null = null;
      if (overlayUrl) {
        try {
          overlayImg = await loadImage(overlayUrl);
        } catch {}
      }

      // Start all slot videos simultaneously in a loop for the living outro
      loadedSlots.forEach((s) => {
        if (s.video) {
          s.video.loop = true;
          s.video.currentTime = 0;
          s.video.play().catch(() => {});
        }
      });

      for (let f = 0; f < ENDING_FRAMES; f++) {
        const tickStart = performance.now();

        // 1. Studio backdrop
        if (boothStyle === 'birthday') {
          vCtx.fillStyle = '#FFF2F6';
        } else {
          vCtx.fillStyle = '#FAF7F0';
        }
        vCtx.fillRect(0, 0, cw, ch);

        if (boothStyle === 'birthday') {
          try {
            const wallImg = await loadImage('/client/rooms/birthday/wall.webp');
            vCtx.save();
            vCtx.globalAlpha = 0.45;
            vCtx.drawImage(wallImg, 0, 0, cw, ch);
            vCtx.restore();
          } catch {}
        }

        // 2. Smooth settle animation
        const progress = Math.min(1, f / 18);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const scale = 0.95 + easeProgress * 0.05;
        const alpha = Math.min(1, easeProgress * 1.5);

        vCtx.save();
        vCtx.globalAlpha = alpha;
        vCtx.translate(cw / 2, ch / 2);
        vCtx.scale(scale, scale);

        // Strip card shadow
        vCtx.shadowColor = 'rgba(23, 24, 28, 0.28)';
        vCtx.shadowBlur = 32;
        vCtx.shadowOffsetY = 16;

        // Base paper
        vCtx.fillStyle = currentThemeObj?.bg || '#FFFFFF';
        vCtx.fillRect(-stripW / 2, -stripH / 2, stripW, stripH);
        vCtx.shadowColor = 'transparent';

        // 3. Render each slot: Live Looping shotClips[index]
        for (let sIdx = 0; sIdx < slotRects.length; sIdx++) {
          const sr = slotRects[sIdx];
          const slotItem = loadedSlots[sIdx] || loadedSlots[0];
          if (!slotItem) continue;

          const sx = -stripW / 2 + sr.x;
          const sy = -stripH / 2 + sr.y;
          const sw = sr.w;
          const sh = sr.h;

          vCtx.save();
          vCtx.beginPath();
          if (windowShape === 'circle') {
            vCtx.arc(sx + sw / 2, sy + sh / 2, Math.min(sw, sh) / 2, 0, Math.PI * 2);
          } else {
            vCtx.roundRect(sx, sy, sw, sh, sr.radius || 3);
          }
          vCtx.clip();

          if (slotItem.filterCss) {
            vCtx.filter = slotItem.filterCss;
          }

          let slotDrawn = false;
          if (slotItem.video && slotItem.video.readyState >= 2 && !slotItem.video.ended && slotItem.video.videoWidth > 0) {
            const vw = slotItem.video.videoWidth;
            const vh = slotItem.video.videoHeight;
            const vRatio = vw / vh;
            const sRatio = sw / sh;
            let vx = 0, vy = 0, vCropW = vw, vCropH = vh;
            if (vRatio > sRatio) {
              vCropW = Math.round(vh * sRatio);
              vx = Math.round((vw - vCropW) / 2);
            } else {
              vCropH = Math.round(vw / sRatio);
              vy = Math.max(0, Math.round((vh - vCropH) * 0.20));
            }

            vCtx.save();
            if (slotItem.mirrored) {
              vCtx.translate(sx + sw, sy);
              vCtx.scale(-1, 1);
              vCtx.drawImage(slotItem.video, vx, vy, vCropW, vCropH, 0, 0, sw, sh);
            } else {
              vCtx.drawImage(slotItem.video, vx, vy, vCropW, vCropH, sx, sy, sw, sh);
            }
            vCtx.restore();
            slotDrawn = true;
          }

          if (!slotDrawn && slotItem.still) {
            const imgW = slotItem.still.naturalWidth || sw;
            const imgH = slotItem.still.naturalHeight || sh;
            const iRatio = imgW / imgH;
            const sRatio = sw / sh;
            let ix = 0, iy = 0, iCropW = imgW, iCropH = imgH;
            if (iRatio > sRatio) {
              iCropW = Math.round(imgH * sRatio);
              ix = Math.round((imgW - iCropW) / 2);
            } else {
              iCropH = Math.round(imgW / sRatio);
              iy = Math.max(0, Math.round((imgH - iCropH) * 0.20));
            }
            vCtx.drawImage(slotItem.still, ix, iy, iCropW, iCropH, sx, sy, sw, sh);
          }

          vCtx.restore();
        }

        // 4. TOP LAYER: Active Frame Overlay PNG covering entire strip
        if (overlayImg) {
          vCtx.save();
          vCtx.drawImage(overlayImg, -stripW / 2, -stripH / 2, stripW, stripH);
          vCtx.restore();
        }

        // 5. Interactive Doodles / Freehand Drawing Canvas (if user drew anything)
        if (decoCanvasRef.current) {
          vCtx.save();
          vCtx.drawImage(decoCanvasRef.current, -stripW / 2, -stripH / 2, stripW, stripH);
          vCtx.restore();
        }

        // 6. Date & Branding Footer
        if (!currentThemeObj?.noFooter) {
          vCtx.save();
          vCtx.textAlign = 'center';
          vCtx.fillStyle = currentThemeObj?.fg || '#1A2234';
          vCtx.font = '600 10px monospace';
          vCtx.fillText(new Date().toISOString().slice(0, 10).replace(/-/g, '.'), 0, stripH / 2 - 16);
          vCtx.font = '500 8px monospace';
          vCtx.fillStyle = currentThemeObj?.sub || 'rgba(26, 34, 52, 0.65)';
          vCtx.fillText('gethaloluna.com', 0, stripH / 2 - 6);
          vCtx.restore();
        }

        vCtx.restore(); // restore strip translate/scale

        // Studio Branding bottom title
        vCtx.save();
        vCtx.textAlign = 'center';
        vCtx.fillStyle = '#18181B';
        vCtx.font = '700 13px monospace';
        vCtx.letterSpacing = '3px';
        vCtx.fillText('HALOLUNA STUDIO', cw / 2, ch - 36);
        vCtx.restore();

        pushFrame();

        if (!videoEncoder) {
          const spent = performance.now() - tickStart;
          await new Promise((r) => setTimeout(r, Math.max(0, FRAME_DURATION - spent)));
        } else if (f % 10 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // 8. Finalize Recorder & Download genuine MP4
      let finalVideoBlob: Blob;
      if (videoEncoder && muxer) {
        await videoEncoder.flush();
        videoEncoder.close();
        muxer.finalize();
        finalVideoBlob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
      } else if (mediaRecorder && mediaRecorderPromise) {
        mediaRecorder.stop();
        finalVideoBlob = await mediaRecorderPromise;
        if (canvasStream) {
          canvasStream.getTracks().forEach((t: any) => t.stop());
        }
      } else {
        throw new Error('No recorder available');
      }

      // Always download with .mp4 extension for iPhone Camera Roll and Android gallery
      const link = document.createElement('a');
      link.href = URL.createObjectURL(finalVideoBlob);
      link.download = `haloluna-bts-${Date.now()}.mp4`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 15000);

      fireCelebrationConfetti();
      setUploadToast('BTS Photobooth video (.mp4) downloaded!');
      setTimeout(() => setUploadToast(null), 3500);
    } catch (err) {
      console.error('BTS video generation failed:', err);
      setUploadError('Failed to generate BTS video. Try downloading HD image.');
    } finally {
      videoElements.forEach((v) => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      setIsExportingVideo(false);
    }
  }, [
    isExporting,
    renderFullStripCanvas,
    stripSlots,
    capturedFrames,
    activeStyleLook,
    boothStyle,
    targetCount,
    holes,
    pbLayout,
    loadImage,
  ]);

  const handleShareInstagram = useCallback(async () => {
    if (isExporting) return;
    setIsExportingStory(true);
    try {
      const stripCanvas = await renderFullStripCanvas(2.5);

      const storyCanvas = document.createElement('canvas');
      storyCanvas.width = 1080;
      storyCanvas.height = 1920;
      const sCtx = storyCanvas.getContext('2d');
      if (!sCtx) throw new Error('Story context error');

      if (boothStyle === 'birthday') {
        try {
          const wallImg = await loadImage('/client/rooms/birthday/wall.webp');
          sCtx.drawImage(wallImg, 0, 0, 1080, 1920);
          sCtx.fillStyle = 'rgba(255, 240, 245, 0.35)';
          sCtx.fillRect(0, 0, 1080, 1920);
        } catch {
          const grad = sCtx.createLinearGradient(0, 0, 0, 1920);
          grad.addColorStop(0, '#FFF5F8');
          grad.addColorStop(0.5, '#FFE6EE');
          grad.addColorStop(1, '#FFDCE6');
          sCtx.fillStyle = grad;
          sCtx.fillRect(0, 0, 1080, 1920);
        }
      } else {
        const grad = sCtx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, '#FAF7F0');
        grad.addColorStop(1, '#EFEAE1');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 1080, 1920);
      }

      const stripTargetW = pbLayout === 'grid' ? 820 : pbLayout === 'polaroid' ? 680 : 500;
      const stripTargetH = (stripTargetW * stripCanvas.height) / stripCanvas.width;
      const posX = (1080 - stripTargetW) / 2;
      const posY = (1920 - stripTargetH) / 2;

      sCtx.save();
      sCtx.shadowColor = 'rgba(23, 24, 28, 0.25)';
      sCtx.shadowBlur = 40;
      sCtx.shadowOffsetY = 20;
      sCtx.drawImage(stripCanvas, posX, posY, stripTargetW, stripTargetH);
      sCtx.restore();

      sCtx.save();
      sCtx.fillStyle = '#18181B';
      sCtx.textAlign = 'center';
      sCtx.font = '700 24px monospace';
      sCtx.letterSpacing = '3px';
      sCtx.fillText('HALOLUNA PHOTOBOOTH', 540, posY - 40);
      sCtx.restore();

      const storyBlob = await new Promise<Blob | null>((res) => storyCanvas.toBlob(res, 'image/png'));
      if (!storyBlob) throw new Error('Could not create story blob');

      const storyFile = new File([storyBlob], `haloluna-story-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        await navigator.share({
          title: 'HaloLuna Photostrip',
          text: 'Our photostrip from HaloLuna Studio',
          files: [storyFile],
        });
        setUploadToast('Shared to Instagram!');
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(storyBlob);
        link.download = `haloluna-instagram-story-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(link.href);

        fireCelebrationConfetti();
        setUploadToast('9:16 Instagram Story saved! Ready to post.');
      }
      setTimeout(() => setUploadToast(null), 3500);

      // Cloud sync strip to Supabase (action save)
      const templateName = currentThemeObj?.id || activeThemeId || 'classic-strip';
      stripCanvas.toBlob((blob) => {
        if (blob) {
          handleAutoUpload(blob, templateName, true).catch((e) => console.warn('Cloud sync error:', e));
        }
      }, 'image/png');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share to Instagram failed:', err);
        setUploadError('Failed to share to Instagram.');
      }
    } finally {
      setIsExportingStory(false);
    }
  }, [isExporting, renderFullStripCanvas, boothStyle, pbLayout, loadImage, currentThemeObj, activeThemeId, handleAutoUpload]);

  if (!appLoaded) {
    return <LoadingScreen onComplete={handleAppComplete} />;
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between text-zinc-900 relative transition-colors"
      style={{
        backgroundColor: '#FDFBF7',
        backgroundImage:
          boothStyle === 'birthday'
            ? 'url("/client/rooms/birthday/wall.webp")'
            : boothStyle === 'vintage'
            ? 'url("/assets/rooms/wall.webp")'
            : undefined,
        backgroundPosition: 'center top',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Subtle Dot-Matrix Texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.14] z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #C4B99A 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Angie Photobooth Stepper Header (1:1 REA) ── */}
      <header className="w-full border-b border-[#E8DFCE] bg-[#FAF9F5]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group cursor-pointer"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>

          {/* Stepper with session countdown timer pill */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 px-3 py-0.5 bg-white border border-neutral-200/80 rounded-full text-xs font-semibold text-neutral-700 shadow-2xs mb-1.5">
              <Clock size={12} className="text-neutral-500" />
              <span>{formatSessionTime(sessionSeconds)}</span>
            </div>

            {/* 5-Step Stepper: Frame -> Shoot -> Pick -> Style -> Done */}
            <div className="flex items-center gap-2 sm:gap-4">
              {[
                { id: 'frame', label: 'Frame' },
                { id: 'shoot', label: 'Shoot' },
                { id: 'pick', label: 'Pick' },
                { id: 'style', label: 'Style' },
                { id: 'done', label: 'Done' },
              ].map((s, idx, arr) => {
                const isCompleted =
                  s.id === 'frame' ||
                  (s.id === 'shoot' && step !== 'capture') ||
                  (s.id === 'pick' && (step === 'style' || step === 'decorate' || step === 'done' || step === 'edit')) ||
                  (s.id === 'style' && (step === 'done' || step === 'edit'));
                const isActive =
                  (s.id === 'shoot' && step === 'capture') ||
                  (s.id === 'pick' && step === 'select') ||
                  (s.id === 'style' && (step === 'style' || step === 'decorate')) ||
                  (s.id === 'done' && (step === 'done' || step === 'edit'));

                return (
                  <div key={s.id} className="flex items-center gap-2 sm:gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-pink-500 text-white'
                            : isActive
                            ? 'border-2 border-pink-400 bg-white ring-2 ring-pink-100'
                            : 'border border-neutral-300 bg-neutral-100'
                        }`}
                      >
                        {isCompleted ? (
                          <Check size={11} strokeWidth={3} className="text-white" />
                        ) : isActive ? (
                          <span className="w-2 h-2 rounded-full bg-pink-500" />
                        ) : null}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                          isActive || isCompleted ? 'text-neutral-900' : 'text-neutral-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="flex items-center text-neutral-300 -mt-3.5 text-[10px] tracking-widest select-none">
                        ····
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-12 flex justify-end">
            <button
              type="button"
              onClick={() => setSoundMuted(toggleMuted())}
              aria-pressed={soundMuted}
              aria-label={soundMuted ? 'Unmute booth sounds' : 'Mute booth sounds'}
              title={soundMuted ? 'Sound off' : 'Sound on'}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
                soundMuted
                  ? 'bg-neutral-100 border-neutral-200 text-neutral-400'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400 shadow-2xs'
              }`}
            >
              {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 relative z-10 flex-1 flex flex-col">
        {/* Title & Subtitle */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            {step === 'capture'
              ? isShooting
                ? `Shot ${Math.min(currentShotIndex, STUDIO_SHOT_COUNT)} of ${STUDIO_SHOT_COUNT}`
                : 'Get ready'
              : step === 'select'
              ? (targetCount === 1 ? 'Pick your photo' : `Pick your ${targetCount}`)
              : step === 'style'
              ? 'Pick a filter'
              : step === 'decorate'
              ? 'Decorate'
              : 'Your strip is ready'}
          </h1>
          {step !== 'done' && step !== 'edit' && (
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {step === 'capture'
                ? isShooting
                  ? 'Smile for the camera!'
                  : 'Backgrounds and face filters are optional.'
                : step === 'select'
                ? isDuoActive
                  ? 'Tap a photo to swap it in or out. You both edit the same strip.'
                  : 'Tap a photo to swap it in or out.'
                : step === 'style'
                ? isDuoActive
                  ? 'It changes the whole strip, for both of you.'
                  : 'It changes the whole strip.'
                : 'Stickers and doodles. Or skip it.'}
            </p>
          )}
        </div>

        {/* ── STEP 1: CAPTURE & GET READY (1:1 ANGIE REA) ── */}
        {step === 'capture' && (
          <div
            className={`w-full max-w-5xl mx-auto grid transition-all duration-300 items-start gap-8 ${
              isShooting
                ? 'grid-cols-1 max-w-xl mx-auto'
                : 'grid-cols-1 lg:grid-cols-[1fr_340px]'
            }`}
          >
            {/* Left Column: Live Camera Viewport (Duo / Solo) */}
            <div className="flex flex-col items-center w-full">
              <CameraViewportDuo
                onCapture={handleCapture}
                isCapturing={capturedFrames.length < STUDIO_SHOT_COUNT}
                capturedCount={capturedFrames.length}
                totalFrames={STUDIO_SHOT_COUNT}
                countdownDuration={countdownDuration}
                onCountdownDurationChange={setCountdownDuration}
                capturedThumbnails={capturedFrames.map((f) => f.dataUrl)}
                onRetakeLast={() => setCapturedFrames((prev) => prev.slice(0, -1))}
                isDuoMode={isDuoActive}
                partner={partner}
                role={role}
                localStream={localStream}
                remoteStream={remoteStream}
                onSendSyncAction={sendSync}
                incomingSyncAction={incomingSyncAction}
                onCameraReadyChange={updateCameraReady}
                cameraError={cameraError}
                onRetryCamera={startCamera}
                selectedBg={selectedBg}
                selectedFaceFilter={selectedFaceFilter}
                userName={userName}
                partnerName={partner?.name}
                isShooting={isShooting}
                externalCountdown={shootCountdown}
                triggerSnap={triggerSnap}
              />
            </div>

            {/* Right Column: .pb-booth-side Controls (Backgrounds & Face Filters) */}
            {!isShooting && (
              <div className="flex flex-col w-full max-w-sm mx-auto lg:max-w-none">
                {/* Segmented Tabs: Background / Face Filter */}
                <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTrayTab('background')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTrayTab === 'background'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Palette size={14} />
                    <span>Background</span>
                    {selectedBg !== 'none' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                    )}
                  </button>

                  {IS_FACE_FILTER_ENABLED ? (
                    <button
                      type="button"
                      onClick={() => setActiveTrayTab('filter')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTrayTab === 'filter'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>Face filter</span>
                      {selectedFaceFilter !== 'none' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold text-neutral-400 cursor-not-allowed select-none opacity-70 transition-all"
                      title="Coming soon - Menunggu persetujuan pengajuan Snap Camera Kit"
                    >
                      <Sparkles size={14} className="text-neutral-400 shrink-0" />
                      <span>Face filter</span>
                      <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-pink-50 text-pink-500 rounded-full border border-pink-200/80 shrink-0">
                        Coming soon
                      </span>
                    </button>
                  )}
                </div>

                {/* Tray Content Card (Scrollable 4-column circles) */}
                <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 max-h-[460px] overflow-y-auto shadow-xs">
                  {activeTrayTab === 'background' || !IS_FACE_FILTER_ENABLED ? (
                    <div className="flex flex-col gap-4">
                      {/* Scenes Group */}
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2.5">
                          SCENES
                        </span>
                        <div className="grid grid-cols-4 gap-2.5">
                          {BACKGROUND_SCENES.map((bg) => {
                            const isActive = selectedBg === bg.id;
                            return (
                              <button
                                key={bg.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBg(bg.id);
                                  if (isDuoActive) sendSync({ type: 'BG_CHANGE', bg: bg.id });
                                }}
                                title={bg.label}
                                className={`aspect-square w-full rounded-full flex items-center justify-center overflow-hidden border-2 transition-all cursor-pointer ${
                                  isActive
                                    ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2'
                                    : 'border-neutral-200 hover:border-neutral-400'
                                }`}
                              >
                                {bg.id === 'none' ? (
                                  <X size={20} className="text-neutral-400" />
                                ) : (
                                  <img
                                    src={bg.thumb}
                                    alt={bg.label}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Travel Group */}
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2.5">
                          TRAVEL
                        </span>
                        <div className="grid grid-cols-4 gap-2.5">
                          {BACKGROUND_TRAVEL.map((bg) => {
                            const isActive = selectedBg === bg.id;
                            return (
                              <button
                                key={bg.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBg(bg.id);
                                  if (isDuoActive) sendSync({ type: 'BG_CHANGE', bg: bg.id });
                                }}
                                title={bg.label}
                                className={`aspect-square w-full rounded-full flex items-center justify-center overflow-hidden border-2 transition-all cursor-pointer ${
                                  isActive
                                    ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2'
                                    : 'border-neutral-200 hover:border-neutral-400'
                                }`}
                              >
                                <img
                                  src={bg.thumb}
                                  alt={bg.label}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                          FACE FILTERS
                        </span>
                        {isLoadingLenses && (
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin text-pink-500" />
                            <span>Memuat...</span>
                          </span>
                        )}
                      </div>
                      {/* Scrollable Grid Container */}
                      <div className="max-h-56 overflow-y-auto pr-1">
                        <div className="grid grid-cols-4 gap-2.5">
                          {/* Slot 1: Matikan Filter (None) */}
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFaceFilter('none');
                                if (isDuoActive) sendSync({ type: 'FILTER_SELECT', filter: 'none' });
                              }}
                              title="Matikan filter"
                              className={`aspect-square w-full rounded-full flex items-center justify-center overflow-hidden border-2 p-1.5 transition-all cursor-pointer ${
                                selectedFaceFilter === 'none'
                                  ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2 bg-neutral-50'
                                  : 'border-neutral-200 hover:border-neutral-400 bg-white'
                              }`}
                            >
                              <X size={20} className="text-neutral-400" />
                            </button>
                            <span className="text-[10px] text-neutral-500 truncate w-full text-center font-medium">
                              Off
                            </span>
                          </div>

                          {/* Loading Skeletons while fetching */}
                          {isLoadingLenses && snapLenses.length === 0 && (
                            <>
                              {Array.from({ length: 7 }).map((_, i) => (
                                <div key={`skel-${i}`} className="flex flex-col items-center gap-1">
                                  <div className="aspect-square w-full rounded-full border-2 border-dashed border-neutral-200 bg-neutral-100/70 animate-pulse flex items-center justify-center">
                                    <Sparkles size={16} className="text-neutral-300" />
                                  </div>
                                  <div className="h-2 w-8 bg-neutral-200 rounded animate-pulse" />
                                </div>
                              ))}
                            </>
                          )}

                          {/* Snap Camera Kit Lenses with Name below */}
                          {snapLenses.map((lens) => {
                            const isActive = selectedFaceFilter === lens.id;
                            return (
                              <div key={lens.id} className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFaceFilter(lens.id);
                                    if (isDuoActive) sendSync({ type: 'FILTER_SELECT', filter: lens.id });
                                  }}
                                  title={lens.name}
                                  className={`aspect-square w-full rounded-full flex items-center justify-center overflow-hidden border-2 p-1.5 transition-all cursor-pointer ${
                                    isActive
                                      ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2 bg-neutral-50'
                                      : 'border-neutral-200 hover:border-neutral-400 bg-white'
                                  }`}
                                >
                                  {lens.iconUrl ? (
                                    <img
                                      src={lens.iconUrl}
                                      alt={lens.name}
                                      className="w-full h-full object-cover rounded-full select-none"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Sparkles size={20} className="text-neutral-400" />
                                  )}
                                </button>
                                <span
                                  className={`text-[10px] truncate w-full text-center ${
                                    isActive ? 'font-bold text-neutral-900' : 'text-neutral-500'
                                  }`}
                                  title={lens.name}
                                >
                                  {lens.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Error & Retry Button jika gagal memuat */}
                      {!isLoadingLenses && snapLenses.length === 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                          <p className="text-[11px] text-neutral-600 font-medium mb-1">
                            {lensError || 'Filter belum termuat'}
                          </p>
                          <p className="text-[10px] text-neutral-400 mb-2">
                            Periksa koneksi internet Anda atau klik tombol di bawah untuk coba lagi.
                          </p>
                          <button
                            type="button"
                            onClick={() => fetchSnapLenses(true)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <RotateCcw size={12} />
                            <span>Muat Ulang Filter</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ready Button & Status */}
                <div className="mt-3.5 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isMyReady}
                    onClick={() => {
                      setIsMyReady(true);
                      if (isDuoActive) {
                        sendSync({ type: 'BOOTH_READY', senderId: role });
                      }
                    }}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isMyReady
                        ? 'bg-neutral-800 text-white opacity-90 cursor-default'
                        : 'bg-[#18181B] hover:bg-neutral-800 text-white cursor-pointer'
                    }`}
                  >
                    {isMyReady ? (
                      <>
                        <Check size={16} strokeWidth={2.5} className="text-emerald-400" />
                        <span>Ready</span>
                      </>
                    ) : (
                      <span>I&apos;m ready</span>
                    )}
                  </button>

                  {/* Ready Status Text */}
                  {isDuoActive && (
                    <p className="text-xs text-center text-neutral-500 min-h-[18px]">
                      {isMyReady && !isPartnerReady
                        ? `Waiting for ${partner?.name || 'partner'}...`
                        : !isMyReady && isPartnerReady
                        ? `${partner?.name || 'Partner'} is ready!`
                        : isMyReady && isPartnerReady
                        ? 'Here we go!'
                        : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: "PICK YOUR 4" (1:1 ANGIE REA SCENE) ── */}
        {step === 'select' && (
          <div className="flex flex-col items-center w-full flex-1 justify-between gap-6 max-w-5xl mx-auto py-2">
            {/* Embedded styles for 1:1 Angie Vintage Machine & Animation */}
            <style jsx>{`
              @keyframes vin-feed {
                0%, 10% { transform: translateY(-100%); clip-path: inset(100% -64px -96px -64px); animation-timing-function: cubic-bezier(0.3, 0.1, 0.25, 1); }
                24%, 31% { transform: translateY(-74%); clip-path: inset(74% -64px -96px -64px); animation-timing-function: cubic-bezier(0.3, 0.1, 0.25, 1); }
                45%, 52% { transform: translateY(-49%); clip-path: inset(49% -64px -96px -64px); animation-timing-function: cubic-bezier(0.3, 0.1, 0.25, 1); }
                66%, 72% { transform: translateY(-24%); clip-path: inset(24% -64px -96px -64px); animation-timing-function: cubic-bezier(0.3, 0.1, 0.25, 1); }
                85% { transform: translateY(0); clip-path: inset(0 -64px -96px -64px); animation-timing-function: ease-out; }
                91% { transform: translateY(0) rotate(0.9deg); clip-path: inset(0 -64px -96px -64px); animation-timing-function: ease-in-out; }
                96% { transform: translateY(0) rotate(-0.4deg); clip-path: inset(0 -64px -96px -64px); animation-timing-function: ease-in-out; }
                100% { transform: none; clip-path: inset(0 -64px -96px -64px); }
              }
              .animate-vin-feed {
                transform-origin: 50% 0;
                animation: vin-feed 2200ms linear both;
              }
              .edit-pool::-webkit-scrollbar {
                display: none;
              }
              .edit-pool > :first-child {
                margin-left: auto;
              }
              .edit-pool > :last-child {
                margin-right: auto;
              }
            `}</style>

            {/* Grid / Flex Layout: Left = Pool of 6 shots in a row, Right = Real-time Strip Preview */}
            <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 flex-1">
              {/* Left Column: Pool of Captured Photos in ONE ROW (1:1 Angie REA) */}
              <div className="w-full max-w-[760px] flex flex-col items-center">
                <div className="relative w-full flex items-center">
                  {/* Left Scroll Button (Desktop) */}
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={() => scrollPoolBy(-200)}
                      aria-label="Scroll left"
                      className="absolute -left-3 sm:-left-4 z-20 w-8 h-8 rounded-full bg-white/95 border border-neutral-200 shadow-md flex items-center justify-center text-neutral-800 hover:bg-white hover:scale-105 transition-all cursor-pointer select-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  {/* Horizontal Scroll / Slide Container */}
                  <div
                    ref={poolRef}
                    onMouseDown={handlePoolMouseDown}
                    onMouseMove={handlePoolMouseMove}
                    onMouseUp={handlePoolMouseUp}
                    onMouseLeave={handlePoolMouseUp}
                    onWheel={handlePoolWheel}
                    className="edit-pool w-full flex flex-row flex-nowrap items-center gap-2.5 sm:gap-3.5 overflow-x-auto py-2 px-1 cursor-grab active:cursor-grabbing select-none scroll-smooth"
                  >
                    {capturedFrames.map((frame, index) => {
                      const slotIdx = stripSlots.indexOf(index);
                      const isPlaced = slotIdx >= 0;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => togglePoolPhoto(index)}
                          title={isPlaced ? `Remove Shot ${index + 1} from slot ${slotIdx + 1}` : `Place Shot ${index + 1}`}
                          style={{ aspectRatio: String(poolItemAspect) }}
                          className={`edit-pool-item relative overflow-hidden rounded-[4px] border-[1.5px] transition-all cursor-pointer select-none group flex-[1_1_0] min-w-[96px] sm:min-w-[108px] md:min-w-[118px] max-w-[160px] md:max-w-[180px] bg-[#faf8f5] shadow-xs ${
                            isPlaced
                              ? 'border-neutral-900'
                              : 'border-neutral-200 hover:border-neutral-800 hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Thumbnail Image (object-[center_20%] prevents face/forehead clipping) */}
                          <img
                            src={frame.dataUrl}
                            alt={`Shot ${index + 1}`}
                            draggable={false}
                            className={`w-full h-full object-cover object-[center_20%] pointer-events-none transition-opacity ${
                              isPlaced ? 'opacity-55 group-hover:opacity-35' : 'opacity-100'
                            }`}
                          />

                          {/* Slot Number Badge in Top-Left (.pb-num) */}
                          {isPlaced && (
                            <span className="pb-num absolute top-1.5 left-1.5 min-w-[24px] h-[24px] px-1 rounded-full bg-[#18181b] text-white font-extrabold text-[12px] flex items-center justify-center shadow-xs select-none pointer-events-none">
                              {slotIdx + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Scroll Button (Desktop) */}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={() => scrollPoolBy(200)}
                      aria-label="Scroll right"
                      className="absolute -right-3 sm:-right-4 z-20 w-8 h-8 rounded-full bg-white/95 border border-neutral-200 shadow-md flex items-center justify-center text-neutral-800 hover:bg-white hover:scale-105 transition-all cursor-pointer select-none"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Themed Photostrip Preview with Holes / Slots & Dispenser */}
              <div className="flex flex-col items-center relative shrink-0">
                {/* 1:1 Angie Vintage Dispenser Plate (if vintage booth) */}
                {isVintage && (
                  <div
                    className="relative pointer-events-none select-none z-10 transition-all"
                    style={{
                      width: pbLayout === 'grid' ? 'min(96vw, 440px)' : '318px',
                      aspectRatio: '760 / 320',
                      backgroundImage: 'url("/assets/rooms/dispenser.webp")',
                      backgroundPosition: 'center bottom',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      marginBottom: pbLayout === 'grid' ? '-56px' : '-43px',
                      filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))',
                    }}
                  />
                )}

                {/* The Strip */}
                <div
                  className={`relative overflow-hidden transition-all rounded-xs z-1 ${
                    isVintage ? 'animate-vin-feed' : ''
                  } ${isFrame && holes ? 'p-0' : 'p-3'}`}
                  style={{
                    backgroundColor: currentThemeObj?.bg || '#FFFFFF',
                    width: pbLayout === 'grid' ? 'min(92vw, 380px)' : 'min(84vw, 184px)',
                    aspectRatio: pbLayout === 'grid' ? '3 / 2' : '1 / 3',
                    boxShadow: isVintage
                      ? 'inset 0 0 0 1px rgba(46, 34, 20, 0.25), 0 14px 34px rgba(0, 0, 0, 0.5)'
                      : 'inset 0 0 0 1px rgba(23, 24, 28, 0.08), 0 16px 36px -4px rgba(0, 0, 0, 0.16)',
                    ...(isFrame && holes
                      ? {}
                      : artUrl
                      ? {
                          backgroundImage: `url(${artUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}),
                  }}
                >
                  {/* Top machine shadow inside the slot for vintage */}
                  {isVintage && (
                    <div
                      className="absolute top-0 left-0 right-0 h-4 pointer-events-none z-20"
                      style={{
                        background: 'linear-gradient(180deg, rgba(10, 6, 2, 0.5), transparent)',
                      }}
                    />
                  )}

                  {isFrame && holes ? (
                    /* Frame Theme with Cutout Holes (e.g. loveletter, boba, cozy, etc.) */
                    <>
                      {Array.from({ length: targetCount }).map((_, slotIdx) => {
                        const shot = stripSlots[slotIdx];
                        const hole = holes[slotIdx];
                        if (!hole) return null;

                        return (
                          <button
                            key={slotIdx}
                            type="button"
                            onClick={() => clearStripSlot(slotIdx)}
                            aria-label={`Slot ${slotIdx + 1}`}
                            title={shot != null ? `Tap to remove photo from slot ${slotIdx + 1}` : undefined}
                            style={{
                              position: 'absolute',
                              left: `${hole.x * 100}%`,
                              top: `${hole.y * 100}%`,
                              width: `${hole.w * 100}%`,
                              height: `${hole.h * 100}%`,
                              borderRadius: windowShape === 'circle' ? '50%' : '2px',
                              overflow: 'hidden',
                              zIndex: 1,
                            }}
                            className={`transition-all select-none flex items-center justify-center p-0 border-0 ${
                              shot == null
                                ? 'bg-[rgba(127,127,127,0.14)] hover:bg-[rgba(127,127,127,0.22)]'
                                : 'cursor-pointer group'
                            }`}
                          >
                            {shot != null && capturedFrames[shot] ? (
                              <img
                                src={capturedFrames[shot].dataUrl}
                                alt={`Slot ${slotIdx + 1}`}
                                className="w-full h-full object-cover object-[center_20%] pointer-events-none group-hover:opacity-90 transition-opacity"
                              />
                            ) : (
                              <span className="text-xl text-neutral-400 font-light select-none">+</span>
                            )}
                          </button>
                        );
                      })}

                      {/* Frame Art Overlay (above photos, pointer-events none) */}
                      {artUrl && (
                        <div
                          className="absolute inset-0 pointer-events-none z-15 select-none"
                          style={{
                            backgroundImage: `url(${artUrl})`,
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      )}
                    </>
                  ) : (
                    /* Non-Frame Theme (Simple/Pattern Grid or Vertical) */
                    <div
                      className={`w-full h-full grid gap-2 ${
                        pbLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      {Array.from({ length: targetCount }).map((_, slotIdx) => {
                        const shot = stripSlots[slotIdx];
                        return (
                          <button
                            key={slotIdx}
                            type="button"
                            onClick={() => clearStripSlot(slotIdx)}
                            aria-label={`Slot ${slotIdx + 1}`}
                            title={shot != null ? `Tap to remove photo from slot ${slotIdx + 1}` : undefined}
                            className={`relative w-full aspect-[3/2] rounded-xs overflow-hidden transition-all flex items-center justify-center border-0 p-0 ${
                              shot == null
                                ? 'bg-[rgba(127,127,127,0.14)] hover:bg-[rgba(127,127,127,0.22)]'
                                : 'cursor-pointer group'
                            }`}
                          >
                            {shot != null && capturedFrames[shot] ? (
                              <img
                                src={capturedFrames[shot].dataUrl}
                                alt={`Slot ${slotIdx + 1}`}
                                className="w-full h-full object-cover object-[center_20%] pointer-events-none group-hover:opacity-90 transition-opacity"
                              />
                            ) : (
                              <span className="text-xl text-neutral-400 font-light select-none">+</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: Large Black Pill "Next" Button */}
            <div className="flex flex-col items-center gap-1.5 mt-2 pb-4">
              {(() => {
                const missingCount = stripSlots.filter((s) => s == null).length;
                const isComplete = missingCount === 0;

                return (
                  <>
                    <button
                      type="button"
                      disabled={!isComplete}
                      onClick={() => {
                        if (isComplete) {
                          fireCelebrationConfetti();
                          setStep('style');
                          if (isDuoActive) {
                            sendSync({ type: 'SCENE_CHANGE', scene: 'FILTER' });
                          }
                        }
                      }}
                      className={`px-16 py-3.5 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                        isComplete
                          ? 'bg-[#18181B] hover:bg-neutral-800 text-white cursor-pointer'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>Next</span>
                    </button>

                    {missingCount > 0 && (
                      <p className="text-xs text-neutral-500 font-medium">
                        Pick {missingCount} more shot{missingCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── STEP 3: "PICK A FILTER" (1:1 ANGIE REA SCENE) ── */}
        {step === 'style' && (
          <div className="flex flex-col items-center w-full flex-1 justify-between gap-6 max-w-5xl mx-auto py-2">
            <style jsx>{`
              .filter-sample.has-grain::after,
              .filter-strip.has-grain::after {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: calc(var(--grain, 0) * 1.1);
                mix-blend-mode: overlay;
                background-image: url("${SVG_GRAIN_URL}");
              }
            `}</style>

            {/* Grid Layout: Left = Live Strip with Selected Filter, Right = 8 Filter Cards */}
            <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 flex-1">
              {/* Left Column: Live Filtered Photostrip Preview (The true render with active filter & grain) */}
              <div className="flex flex-col items-center relative shrink-0">
                {/* Vintage Dispenser Plate (if vintage booth) */}
                {isVintage && (
                  <div
                    className="relative pointer-events-none select-none z-10 transition-all"
                    style={{
                      width: pbLayout === 'grid' ? 'min(96vw, 440px)' : '318px',
                      aspectRatio: '760 / 320',
                      backgroundImage: 'url("/assets/rooms/dispenser.webp")',
                      backgroundPosition: 'center bottom',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      marginBottom: pbLayout === 'grid' ? '-56px' : '-43px',
                      filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))',
                    }}
                  />
                )}

                {/* The Strip */}
                <div
                  className={`filter-strip relative overflow-hidden transition-all rounded-xs z-1 ${
                    activeStyleLook.grain > 0 ? 'has-grain' : ''
                  } ${isFrame && holes ? 'p-0' : 'p-3'}`}
                  style={{
                    backgroundColor: currentThemeObj?.bg || '#FFFFFF',
                    width:
                      pbLayout === 'grid'
                        ? 'min(92vw, 380px)'
                        : pbLayout === 'polaroid'
                        ? 'min(84vw, 240px)'
                        : pbLayout === 'duo'
                        ? 'min(84vw, 220px)'
                        : 'min(84vw, 184px)',
                    aspectRatio:
                      pbLayout === 'grid'
                        ? '3 / 2'
                        : pbLayout === 'polaroid'
                        ? '0.82'
                        : pbLayout === 'duo'
                        ? '2 / 3'
                        : '1 / 3',
                    boxShadow: isVintage
                      ? 'inset 0 0 0 1px rgba(46, 34, 20, 0.25), 0 14px 34px rgba(0, 0, 0, 0.5)'
                      : 'inset 0 0 0 1px rgba(23, 24, 28, 0.08), 0 16px 36px -4px rgba(0, 0, 0, 0.16)',
                    ...(isFrame && holes
                      ? {}
                      : artUrl
                      ? {
                          backgroundImage: `url(${artUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}),
                    ['--grain' as any]: String(activeStyleLook.grain),
                  }}
                >
                  {isFrame && holes ? (
                    <>
                      {Array.from({ length: targetCount }).map((_, slotIdx) => {
                        const shot = stripSlots[slotIdx];
                        const hole = holes[slotIdx];
                        if (!hole) return null;

                        return (
                          <div
                            key={slotIdx}
                            style={{
                              position: 'absolute',
                              left: `${hole.x * 100}%`,
                              top: `${hole.y * 100}%`,
                              width: `${hole.w * 100}%`,
                              height: `${hole.h * 100}%`,
                              borderRadius: windowShape === 'circle' ? '50%' : '2px',
                              overflow: 'hidden',
                              zIndex: 1,
                            }}
                            className="flex items-center justify-center p-0 border-0"
                          >
                            {shot != null && capturedFrames[shot] ? (
                              <img
                                src={capturedFrames[shot].dataUrl}
                                alt={`Slot ${slotIdx + 1}`}
                                draggable={false}
                                className="w-full h-full object-cover object-[center_20%] pointer-events-none transition-all duration-300"
                                style={{
                                  filter:
                                    activeStyleLook.css !== 'none'
                                      ? activeStyleLook.css
                                      : undefined,
                                }}
                              />
                            ) : null}
                          </div>
                        );
                      })}

                      {/* Frame Art Overlay */}
                      {artUrl && (
                        <div
                          className="absolute inset-0 pointer-events-none z-15 select-none"
                          style={{
                            backgroundImage: `url(${artUrl})`,
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      )}
                    </>
                  ) : (
                    /* Non-Frame Theme (Simple/Pattern) */
                    <div
                      className={`w-full h-full grid gap-2 ${
                        pbLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      {Array.from({ length: targetCount }).map((_, slotIdx) => {
                        const shot = stripSlots[slotIdx];
                        return (
                          <div
                            key={slotIdx}
                            className="relative w-full aspect-[3/2] rounded-xs overflow-hidden flex items-center justify-center border-0 p-0"
                          >
                            {shot != null && capturedFrames[shot] ? (
                              <img
                                src={capturedFrames[shot].dataUrl}
                                alt={`Slot ${slotIdx + 1}`}
                                draggable={false}
                                className="w-full h-full object-cover object-[center_20%] pointer-events-none transition-all duration-300"
                                style={{
                                  filter:
                                    activeStyleLook.css !== 'none'
                                      ? activeStyleLook.css
                                      : undefined,
                                }}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Date & Branding Footer at bottom (1:1 Angie REA) */}
                  {!currentThemeObj?.noFooter && (
                    <div
                      className="absolute bottom-2.5 inset-x-0 flex flex-col items-center pointer-events-none z-16 select-none"
                      style={{ color: currentThemeObj?.fg || '#1A2234' }}
                    >
                      <span className="text-[10px] font-mono font-medium tracking-wider">
                        {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
                      </span>
                      <span
                        className="text-[9px] font-mono tracking-widest"
                        style={{ color: currentThemeObj?.sub || 'rgba(26, 34, 52, 0.65)' }}
                      >
                        getangie.com
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 8 Filter Cards (2 rows of 4, 1:1 Angie REA) */}
              <div className="flex flex-col items-center w-full max-w-[560px]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
                  {STYLE_FILTERS.map((f) => {
                    const isCurrent = f.id === selectedStyleFilter;
                    const sampleUrl =
                      stripSlots.map((s) => (s != null ? capturedFrames[s]?.dataUrl : null)).find(Boolean) ||
                      capturedFrames[0]?.dataUrl ||
                      '';

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedStyleFilter(f.id);
                          if (isDuoActive) {
                            sendSync({ type: 'FILTER_SELECT', filter: f.id });
                          }
                        }}
                        className={`filter-card flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer select-none bg-white hover:-translate-y-0.5 active:scale-95 ${
                          isCurrent
                            ? 'border-neutral-900 shadow-sm ring-1 ring-neutral-900'
                            : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        {/* Filter Sample Swatch */}
                        <div
                          className={`filter-sample relative w-18 h-18 sm:w-22 sm:h-22 rounded-lg overflow-hidden bg-neutral-100 shadow-2xs aspect-square ${
                            f.grain > 0 ? 'has-grain' : ''
                          }`}
                          style={{ ['--grain' as any]: String(f.grain) }}
                        >
                          <img
                            src={sampleUrl}
                            alt={f.cap}
                            draggable={false}
                            className="w-full h-full object-cover object-[center_20%] pointer-events-none"
                            style={{ filter: f.css !== 'none' ? f.css : undefined }}
                          />
                        </div>

                        {/* Filter Name */}
                        <span
                          className={`filter-cap text-xs sm:text-[13px] tracking-tight ${
                            isCurrent
                              ? 'font-bold text-neutral-900'
                              : 'font-medium text-neutral-600'
                          }`}
                        >
                          {f.cap}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Bar: Large Black Pill "Next" Button */}
            <div className="flex flex-col items-center gap-1.5 mt-2 pb-4">
              <button
                type="button"
                onClick={() => {
                  setStep('decorate');
                  if (isDuoActive) {
                    sendSync({ type: 'SCENE_CHANGE', scene: 'DECORATE' });
                  }
                }}
                className="px-16 py-3.5 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 bg-[#18181B] hover:bg-neutral-800 text-white cursor-pointer active:scale-[0.98]"
              >
                <span>Next</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: "DECORATE" (1:1 ANGIE REA SCENE) ── */}
        {step === 'decorate' && (
          <div className="flex flex-col items-center w-full flex-1 justify-between gap-6 max-w-5xl mx-auto py-2">
            <style jsx>{`
              .filter-strip.has-grain::after {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: calc(var(--grain, 0) * 1.1);
                mix-blend-mode: overlay;
                z-index: 4;
                background-image: url("${SVG_GRAIN_URL}");
              }
              .deco-sticker {
                position: absolute;
                cursor: grab;
                touch-action: none;
                user-select: none;
              }
              .deco-sticker:active {
                cursor: grabbing;
              }
              .deco-sticker.is-selected {
                outline: 2px dashed #17181C;
                outline-offset: 3px;
              }
            `}</style>

            {/* Main Center Layout: Left = Photostrip with Interactive Deco Layers, Right = Tool Dock */}
            <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 flex-1">
              {/* Left Column: Interactive Deco Photostrip */}
              <div className="flex flex-col items-center relative shrink-0">
                {/* Vintage Dispenser Plate (if vintage booth) */}
                {isVintage && (
                  <div
                    className="relative pointer-events-none select-none z-10 transition-all"
                    style={{
                      width: pbLayout === 'grid' ? 'min(96vw, 440px)' : '318px',
                      aspectRatio: '760 / 320',
                      backgroundImage: 'url("/assets/rooms/dispenser.webp")',
                      backgroundPosition: 'center bottom',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      marginBottom: pbLayout === 'grid' ? '-56px' : '-43px',
                      filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))',
                    }}
                  />
                )}

                {/* The Strip Container (Stage) */}
                <div
                  ref={decoStageRef}
                  onPointerDown={(e) => {
                    if (e.target === decoStageRef.current) setSelectedDecoCid(null);
                  }}
                  className={`filter-strip relative transition-all rounded-xs select-none ${
                    activeStyleLook.grain > 0 ? 'has-grain' : ''
                  }`}
                  style={{
                    backgroundColor: currentThemeObj?.bg || '#FFFFFF',
                    width:
                      pbLayout === 'grid'
                        ? 'min(92vw, 380px)'
                        : pbLayout === 'polaroid'
                        ? 'min(84vw, 240px)'
                        : pbLayout === 'duo'
                        ? 'min(84vw, 220px)'
                        : 'min(84vw, 184px)',
                    aspectRatio:
                      pbLayout === 'grid'
                        ? '3 / 2'
                        : pbLayout === 'polaroid'
                        ? '0.82'
                        : pbLayout === 'duo'
                        ? '2 / 3'
                        : '1 / 3',
                    boxShadow: isVintage
                      ? 'inset 0 0 0 1px rgba(46, 34, 20, 0.25), 0 14px 34px rgba(0, 0, 0, 0.5)'
                      : 'inset 0 0 0 1px rgba(23, 24, 28, 0.08), 0 16px 36px -4px rgba(0, 0, 0, 0.16)',
                    ...(isFrame && holes
                      ? {}
                      : artUrl
                      ? {
                          backgroundImage: `url(${artUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}),
                    ['--grain' as any]: String(activeStyleLook.grain),
                  }}
                >
                  {/* ── LAYER 1: BASE PHOTOS & FRAME ARTWORK (strictly z-[1], clipped to strip boundary) ── */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-xs overflow-hidden z-[1] pointer-events-none ${
                      isFrame && holes ? 'p-0' : 'p-3'
                    }`}
                  >
                    {isFrame && holes ? (
                      <>
                        {Array.from({ length: targetCount }).map((_, slotIdx) => {
                          const rawShot = stripSlots[slotIdx];
                          const shot =
                            rawShot != null && capturedFrames[rawShot]
                              ? rawShot
                              : slotIdx < capturedFrames.length
                              ? slotIdx
                              : capturedFrames.length > 0
                              ? 0
                              : null;
                          const hole = holes[slotIdx];
                          if (!hole) return null;

                          return (
                            <div
                              key={slotIdx}
                              style={{
                                position: 'absolute',
                                left: `${hole.x * 100}%`,
                                top: `${hole.y * 100}%`,
                                width: `${hole.w * 100}%`,
                                height: `${hole.h * 100}%`,
                                borderRadius: windowShape === 'circle' ? '50%' : '2px',
                                overflow: 'hidden',
                                zIndex: 1,
                              }}
                              className="flex items-center justify-center p-0 border-0"
                            >
                              {shot != null && capturedFrames[shot] ? (
                                <img
                                  src={capturedFrames[shot].dataUrl}
                                  alt={`Slot ${slotIdx + 1}`}
                                  draggable={false}
                                  className="w-full h-full object-cover object-[center_20%] pointer-events-none transition-all duration-300"
                                  style={{
                                    filter:
                                      activeStyleLook.css !== 'none'
                                        ? activeStyleLook.css
                                        : undefined,
                                  }}
                                />
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Frame Art Overlay */}
                        {artUrl && (
                          <div
                            className="absolute inset-0 pointer-events-none z-[2] select-none"
                            style={{
                              backgroundImage: `url(${artUrl})`,
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat',
                            }}
                          />
                        )}
                      </>
                    ) : (
                      /* Non-Frame Theme (Simple/Pattern) */
                      <div
                        className={`w-full h-full grid gap-2 ${
                          pbLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
                        }`}
                      >
                        {Array.from({ length: targetCount }).map((_, slotIdx) => {
                          const rawShot = stripSlots[slotIdx];
                          const shot =
                            rawShot != null && capturedFrames[rawShot]
                              ? rawShot
                              : slotIdx < capturedFrames.length
                              ? slotIdx
                              : capturedFrames.length > 0
                              ? 0
                              : null;
                          return (
                            <div
                              key={slotIdx}
                              className="relative w-full aspect-[3/2] rounded-xs overflow-hidden flex items-center justify-center border-0 p-0"
                            >
                              {shot != null && capturedFrames[shot] ? (
                                <img
                                  src={capturedFrames[shot].dataUrl}
                                  alt={`Slot ${slotIdx + 1}`}
                                  draggable={false}
                                  className="w-full h-full object-cover object-[center_20%] pointer-events-none transition-all duration-300"
                                  style={{
                                    filter:
                                      activeStyleLook.css !== 'none'
                                        ? activeStyleLook.css
                                        : undefined,
                                  }}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Date & Branding Footer */}
                    {!currentThemeObj?.noFooter && (
                      <div
                        className="absolute bottom-2.5 inset-x-0 flex flex-col items-center pointer-events-none z-[3] select-none"
                        style={{ color: currentThemeObj?.fg || '#1A2234' }}
                      >
                        <span className="text-[10px] font-mono font-medium tracking-wider">
                          {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
                        </span>
                        <span
                          className="text-[9px] font-mono tracking-widest"
                          style={{ color: currentThemeObj?.sub || 'rgba(26, 34, 52, 0.65)' }}
                        >
                          getangie.com
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── LAYER 2: FREEHAND CRAYON DRAWING CANVAS (strictly z-[10], on top of base photos/frame) ── */}
                  <canvas
                    ref={decoCanvasRef}
                    width={400}
                    height={pbLayout === 'grid' ? 266 : 1200}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerCancel={handleCanvasPointerUp}
                    className={`absolute inset-0 w-full h-full rounded-xs z-[10] ${
                      decoTab === 'draw' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
                    }`}
                    style={{ touchAction: 'none' }}
                  />

                  {/* ── LAYER 3: PLACED STICKERS & WORDS (strictly z-[30], on top of photos, frame art, and doodles) ── */}
                  <div
                    className="absolute inset-0 w-full h-full z-[30] pointer-events-none"
                    onPointerDown={(e) => {
                      if (e.target === e.currentTarget) setSelectedDecoCid(null);
                    }}
                    onPointerMove={handleStickerPointerMove}
                    onPointerUp={handleStickerPointerUp}
                  >
                    {/* Stickers */}
                    {decoStickers.map((stk) => {
                      const isSelected = selectedDecoCid === stk.cid;
                      return (
                        <div
                          key={stk.cid}
                          className={`deco-sticker ${isSelected ? 'is-selected' : ''}`}
                          style={{
                            left: `${stk.x * 100}%`,
                            top: `${stk.y * 100}%`,
                            width: `${stk.scale * 100}%`,
                            transform: `translate(-50%, -50%) rotate(${stk.rot}rad)`,
                            zIndex: isSelected ? 40 : 31,
                            pointerEvents: decoTab !== 'draw' ? 'auto' : 'none',
                          }}
                        >
                          <img
                            src={`/client/stickers/${stk.id}.webp`}
                            alt={`Sticker ${stk.id}`}
                            draggable={false}
                            onPointerDown={(e) => handleStickerPointerDown(e, stk.cid)}
                            className="w-full h-auto object-contain select-none pointer-events-auto block"
                            style={{
                              filter: 'drop-shadow(0 1px 2px rgba(23, 24, 28, 0.22))',
                            }}
                          />

                          {/* Delete Handle */}
                          {isSelected && (
                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRemoveSticker(stk.cid);
                              }}
                              className="absolute -top-[11px] -left-[11px] w-[22px] h-[22px] rounded-full bg-[#FF2E79] text-white flex items-center justify-center border-2 border-white shadow-[0_1px_4px_rgba(23,24,28,0.28)] cursor-pointer z-50 hover:scale-110 active:scale-95 transition-all"
                              title="Delete"
                            >
                              <X size={12} strokeWidth={3} className="pointer-events-none" />
                            </button>
                          )}

                          {/* Scale / Rotate Handle */}
                          {isSelected && (
                            <button
                              type="button"
                              onPointerDown={(e) => handleTransformPointerDown(e, stk.cid)}
                              className="absolute -bottom-[11px] -right-[11px] w-[22px] h-[22px] rounded-full bg-[#3B82F6] text-white flex items-center justify-center border-2 border-white shadow-[0_1px_4px_rgba(23,24,28,0.28)] cursor-nwse-resize z-50 hover:scale-110 active:scale-95 transition-all"
                              title="Resize & Rotate"
                            >
                              <RotateCcw size={11} strokeWidth={2.5} className="pointer-events-none" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Texts */}
                    {decoTexts.map((txt) => {
                      const isSelected = selectedDecoCid === txt.cid;
                      return (
                        <div
                          key={txt.cid}
                          className={`deco-sticker ${isSelected ? 'is-selected' : ''}`}
                          style={{
                            left: `${txt.x * 100}%`,
                            top: `${txt.y * 100}%`,
                            transform: `translate(-50%, -50%) rotate(${txt.rot}rad)`,
                            zIndex: isSelected ? 40 : 31,
                            pointerEvents: decoTab !== 'draw' ? 'auto' : 'none',
                          }}
                        >
                          <span
                            onPointerDown={(e) => handleStickerPointerDown(e, txt.cid)}
                            className="inline-block font-extrabold px-1 tracking-tight select-none pointer-events-auto whitespace-nowrap"
                            style={{
                              color: txt.color,
                              fontSize: `${Math.round(txt.scale * 130)}px`,
                              fontFamily:
                                txt.font === 'serif'
                                  ? 'serif'
                                  : txt.font === 'mono'
                                  ? 'monospace'
                                  : 'sans-serif',
                              textShadow:
                                '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.5)',
                            }}
                          >
                            {txt.text}
                          </span>

                          {/* Delete Handle */}
                          {isSelected && (
                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRemoveText(txt.cid);
                              }}
                              className="absolute -top-[11px] -left-[11px] w-[22px] h-[22px] rounded-full bg-[#FF2E79] text-white flex items-center justify-center border-2 border-white shadow-[0_1px_4px_rgba(23,24,28,0.28)] cursor-pointer z-50 hover:scale-110 active:scale-95 transition-all"
                              title="Delete"
                            >
                              <X size={12} strokeWidth={3} className="pointer-events-none" />
                            </button>
                          )}

                          {/* Scale / Rotate Handle */}
                          {isSelected && (
                            <button
                              type="button"
                              onPointerDown={(e) => handleTransformPointerDown(e, txt.cid)}
                              className="absolute -bottom-[11px] -right-[11px] w-[22px] h-[22px] rounded-full bg-[#3B82F6] text-white flex items-center justify-center border-2 border-white shadow-[0_1px_4px_rgba(23,24,28,0.28)] cursor-nwse-resize z-50 hover:scale-110 active:scale-95 transition-all"
                              title="Resize & Rotate"
                            >
                              <RotateCcw size={11} strokeWidth={2.5} className="pointer-events-none" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: 1:1 Angie Decorate Tool Dock (Tabs + 5x5 Stickers Grid + Pager / Draw / Text) */}
              <div className="flex flex-col items-center w-full max-w-[420px]">
                {/* 3 Segmented Pill Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-full mb-4 border border-neutral-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDecoTab('stickers');
                      setSelectedDecoCid(null);
                    }}
                    className={`px-4 sm:px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                      decoTab === 'stickers'
                        ? 'bg-[#18181B] text-white shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Sparkles size={15} />
                    <span>Stickers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDecoTab('draw');
                      setSelectedDecoCid(null);
                    }}
                    className={`px-4 sm:px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                      decoTab === 'draw'
                        ? 'bg-[#18181B] text-white shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Pencil size={15} />
                    <span>Draw</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDecoTab('text');
                      setSelectedDecoCid(null);
                    }}
                    className={`px-4 sm:px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                      decoTab === 'text'
                        ? 'bg-[#18181B] text-white shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Type size={15} />
                    <span>Text</span>
                  </button>
                </div>

                {/* TAB 1: STICKERS (5x5 Grid with 25 Items Per Page + Pager) */}
                {decoTab === 'stickers' && (
                  <div className="flex flex-col items-center w-full">
                    <div className="grid grid-cols-5 gap-2 sm:gap-2.5 w-full justify-items-center p-1">
                      {currentStickersPageItems.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleAddSticker(id)}
                          className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-1.5 rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50 hover:border-neutral-400 hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        >
                          <img
                            src={`/client/stickers/${id}.webp`}
                            alt={`Sticker ${id}`}
                            draggable={false}
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />
                        </button>
                      ))}
                    </div>

                    {/* Pagination Controls (< 1 / 3 >) */}
                    <div className="flex items-center justify-center gap-5 mt-4">
                      <button
                        type="button"
                        disabled={decoStickerPage === 0}
                        onClick={() => setDecoStickerPage((p) => Math.max(0, p - 1))}
                        className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center bg-white text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed hover:border-neutral-800 transition-all cursor-pointer shadow-2xs"
                        aria-label="Previous sticker page"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <span className="font-mono text-sm font-bold text-neutral-700 min-w-16 text-center tabular-nums">
                        {decoStickerPage + 1} / {totalStickerPages}
                      </span>

                      <button
                        type="button"
                        disabled={decoStickerPage >= totalStickerPages - 1}
                        onClick={() => setDecoStickerPage((p) => Math.min(totalStickerPages - 1, p + 1))}
                        className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center bg-white text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed hover:border-neutral-800 transition-all cursor-pointer shadow-2xs"
                        aria-label="Next sticker page"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: DRAW (Crayon Palette + Nib Sizes + Eraser + Undo + Clear) */}
                {decoTab === 'draw' && (
                  <div className="flex flex-col items-center gap-4 w-full p-2">
                    {/* 10 Crayon Color Swatches */}
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-[340px]">
                      {CRAYON_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setActiveCrayonColor(c);
                            setIsCrayonEraser(false);
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all cursor-pointer ${
                            !isCrayonEraser && activeCrayonColor === c
                              ? 'ring-2 ring-neutral-900 border-white scale-110 shadow-sm'
                              : 'border-black/15 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {/* Bar: 3 Nib Sizes | Divider | Eraser | Undo | Clear */}
                    <div className="flex items-center gap-2.5 sm:gap-3 bg-white px-4 py-2 rounded-2xl border border-neutral-200 shadow-xs">
                      {/* Nib Sizes */}
                      {[0.012, 0.02, 0.032].map((s, idx) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setActiveCrayonSize(s)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            activeCrayonSize === s ? 'bg-neutral-100 ring-1 ring-neutral-900' : 'hover:bg-neutral-50'
                          }`}
                          title={`Nib size ${idx + 1}`}
                        >
                          <span
                            className="rounded-full"
                            style={{
                              width: `${6 + idx * 6}px`,
                              height: `${6 + idx * 6}px`,
                              backgroundColor: isCrayonEraser ? 'transparent' : activeCrayonColor,
                              border: isCrayonEraser ? '1.5px dashed #888' : 'none',
                            }}
                          />
                        </button>
                      ))}

                      <span className="w-px h-6 bg-neutral-200 mx-1" />

                      {/* Eraser */}
                      <button
                        type="button"
                        onClick={() => setIsCrayonEraser((e) => !e)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isCrayonEraser
                            ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-400'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                        title="Eraser"
                      >
                        <Eraser size={18} />
                      </button>

                      {/* Undo */}
                      <button
                        type="button"
                        onClick={handleUndoStroke}
                        className="p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
                        title="Undo"
                      >
                        <RotateCcw size={18} />
                      </button>

                      {/* Clear */}
                      <button
                        type="button"
                        onClick={handleClearStrokes}
                        className="p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
                        title="Clear Drawing"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: TEXT (Input + Colors + Font Family + Quick Meme Captions) */}
                {decoTab === 'text' && (
                  <div className="flex flex-col items-center gap-3 w-full p-2">
                    {/* Input + Add */}
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        maxLength={40}
                        value={decoTextInput}
                        onChange={(e) => setDecoTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddText();
                        }}
                        placeholder="Type text..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddText}
                        className="px-5 py-2.5 rounded-xl bg-[#18181B] text-white font-bold text-xs hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {CRAYON_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setActiveTextColor(c)}
                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                            activeTextColor === c ? 'ring-2 ring-neutral-900 scale-110 shadow-sm' : 'border-black/10'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {/* Font Selector */}
                    <div className="flex items-center gap-2">
                      {(['sans', 'serif', 'mono'] as const).map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setActiveTextFont(font)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer capitalize ${
                            activeTextFont === font
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
                          }`}
                          style={{
                            fontFamily: font === 'serif' ? 'serif' : font === 'mono' ? 'monospace' : 'sans-serif',
                          }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>

                    {/* Quick Caption Chips */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[340px] mt-2">
                      {['BESTIES', 'LUV U', 'HAPPY DAY', 'MEMORIES', 'XOXO', 'SO CUTE', 'DATE NIGHT', 'TOGETHER'].map((cap) => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => handleAddPresetCaption(cap)}
                          className="px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50 transition-all cursor-pointer shadow-2xs"
                        >
                          {cap}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar: Large Black Pill "Finish" Button */}
            <div className="flex flex-col items-center gap-1.5 mt-2 pb-4">
              <button
                type="button"
                onClick={() => {
                  fireCelebrationConfetti();
                  setStep('done');
                  if (isDuoActive) {
                    sendSync({ type: 'SCENE_CHANGE', scene: 'DOWNLOAD' });
                  }
                }}
                className="px-16 py-3.5 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 bg-[#18181B] hover:bg-neutral-800 text-white cursor-pointer active:scale-[0.98]"
              >
                <span>Finish</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: "DONE" SCENE (1:1 GETANGIE REA - YOUR STRIP IS READY) ── */}
        {(step === 'done' || step === 'edit') && (
          <div className="w-full flex-1 flex flex-col items-center justify-center py-2 sm:py-6">
            <style jsx>{`
              .filter-strip.has-grain::after {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: calc(var(--grain, 0) * 1.1);
                mix-blend-mode: overlay;
                z-index: 4;
                background-image: url("${SVG_GRAIN_URL}");
              }
            `}</style>

            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_420px] gap-8 md:gap-14 items-center justify-items-center">
              {/* Left Column: Completed Photostrip Preview */}
              <div className="flex flex-col items-center relative shrink-0">
                {/* Vintage Dispenser Plate (if vintage booth) */}
                {isVintage && (
                  <div
                    className="relative pointer-events-none select-none z-10 transition-all"
                    style={{
                      width: pbLayout === 'grid' ? 'min(96vw, 440px)' : '318px',
                      aspectRatio: '760 / 320',
                      backgroundImage: 'url("/assets/rooms/dispenser.webp")',
                      backgroundPosition: 'center bottom',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      marginBottom: pbLayout === 'grid' ? '-56px' : '-43px',
                      filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))',
                    }}
                  />
                )}

                {/* The Strip Container (Stage) */}
                <div
                  className={`filter-strip relative transition-all rounded-xs select-none ${
                    activeStyleLook.grain > 0 ? 'has-grain' : ''
                  }`}
                  style={{
                    backgroundColor: currentThemeObj?.bg || '#FFFFFF',
                    width:
                      pbLayout === 'grid'
                        ? 'min(92vw, 380px)'
                        : pbLayout === 'polaroid'
                        ? 'min(84vw, 240px)'
                        : pbLayout === 'duo'
                        ? 'min(84vw, 220px)'
                        : 'min(84vw, 184px)',
                    aspectRatio:
                      pbLayout === 'grid'
                        ? '3 / 2'
                        : pbLayout === 'polaroid'
                        ? '0.82'
                        : pbLayout === 'duo'
                        ? '2 / 3'
                        : '1 / 3',
                    boxShadow: isVintage
                      ? 'inset 0 0 0 1px rgba(46, 34, 20, 0.25), 0 14px 34px rgba(0, 0, 0, 0.5)'
                      : 'inset 0 0 0 1px rgba(23, 24, 28, 0.08), 0 16px 36px -4px rgba(0, 0, 0, 0.16)',
                    ...(isFrame && holes
                      ? {}
                      : artUrl
                      ? {
                          backgroundImage: `url(${artUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}),
                    ['--grain' as any]: String(activeStyleLook.grain),
                  }}
                >
                  {/* Layer 1: Base Photos & Frame Overlay */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-xs overflow-hidden z-[1] pointer-events-none ${
                      isFrame && holes ? 'p-0' : 'p-3'
                    }`}
                  >
                    {isFrame && holes ? (
                      <>
                        {Array.from({ length: targetCount }).map((_, slotIdx) => {
                          const rawShot = stripSlots[slotIdx];
                          const shot =
                            rawShot != null && capturedFrames[rawShot]
                              ? rawShot
                              : slotIdx < capturedFrames.length
                              ? slotIdx
                              : capturedFrames.length > 0
                              ? 0
                              : null;
                          const hole = holes[slotIdx];
                          if (!hole) return null;

                          return (
                            <div
                              key={slotIdx}
                              style={{
                                position: 'absolute',
                                left: `${hole.x * 100}%`,
                                top: `${hole.y * 100}%`,
                                width: `${hole.w * 100}%`,
                                height: `${hole.h * 100}%`,
                                borderRadius: windowShape === 'circle' ? '50%' : '2px',
                                overflow: 'hidden',
                                zIndex: 1,
                              }}
                              className="flex items-center justify-center p-0 border-0"
                            >
                              {shot != null && capturedFrames[shot] ? (
                                <img
                                  src={capturedFrames[shot].dataUrl}
                                  alt={`Slot ${slotIdx + 1}`}
                                  draggable={false}
                                  className="w-full h-full object-cover object-[center_20%] pointer-events-none transition-all duration-300"
                                  style={{
                                    filter:
                                      activeStyleLook.css !== 'none'
                                        ? activeStyleLook.css
                                        : undefined,
                                  }}
                                />
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Frame Art Overlay */}
                        {artUrl && (
                          <div
                            className="absolute inset-0 pointer-events-none z-[2] select-none"
                            style={{
                              backgroundImage: `url(${artUrl})`,
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat',
                            }}
                          />
                        )}
                      </>
                    ) : (
                      /* Non-Frame Theme (Simple/Pattern) */
                      <div
                        className={`w-full h-full grid gap-2 ${
                          pbLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
                        }`}
                      >
                        {Array.from({ length: targetCount }).map((_, slotIdx) => {
                          const rawShot = stripSlots[slotIdx];
                          const shot =
                            rawShot != null && capturedFrames[rawShot]
                              ? rawShot
                              : slotIdx < capturedFrames.length
                              ? slotIdx
                              : capturedFrames.length > 0
                              ? 0
                              : null;
                          return (
                            <div
                              key={slotIdx}
                              className="relative w-full aspect-[3/2] rounded-xs overflow-hidden flex items-center justify-center border-0 p-0"
                            >
                              {shot != null && capturedFrames[shot] ? (
                                <img
                                  src={capturedFrames[shot].dataUrl}
                                  alt={`Slot ${slotIdx + 1}`}
                                  draggable={false}
                                  className="w-full h-full object-cover object-[center_20%] pointer-events-none transition-all duration-300"
                                  style={{
                                    filter:
                                      activeStyleLook.css !== 'none'
                                        ? activeStyleLook.css
                                        : undefined,
                                  }}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Date & Branding Footer */}
                    {!currentThemeObj?.noFooter && (
                      <div
                        className="absolute bottom-2.5 inset-x-0 flex flex-col items-center pointer-events-none z-[3] select-none"
                      >
                        <span
                          className="text-[10px] font-mono font-medium tracking-wider"
                          style={{ color: currentThemeObj?.fg || '#1A2234' }}
                        >
                          {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
                        </span>
                        <span
                          className="text-[8px] font-medium tracking-tight"
                          style={{ color: currentThemeObj?.sub || currentThemeObj?.fg || 'rgba(26, 34, 52, 0.65)' }}
                        >
                          gethaloluna.com
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Layer 2: Drawing Canvas (doodles) */}
                  <canvas
                    ref={doneCanvasRef}
                    width={400}
                    height={pbLayout === 'grid' ? 266 : pbLayout === 'polaroid' ? 488 : pbLayout === 'duo' ? 600 : 1200}
                    className="absolute inset-0 w-full h-full pointer-events-none z-[10]"
                  />

                  {/* Layer 3: Placed Stickers (Display only, clean) */}
                  {decoStickers.map((stk) => (
                    <div
                      key={stk.cid}
                      style={{
                        position: 'absolute',
                        left: `${stk.x * 100}%`,
                        top: `${stk.y * 100}%`,
                        width: `${stk.scale * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${stk.rot}rad)`,
                        zIndex: 31,
                        pointerEvents: 'none',
                      }}
                    >
                      <img
                        src={`/client/stickers/${stk.id}.webp`}
                        alt=""
                        draggable={false}
                        className="w-full h-auto object-contain select-none block"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(23, 24, 28, 0.22))',
                        }}
                      />
                    </div>
                  ))}

                  {/* Layer 3: Placed Texts (Display only, clean) */}
                  {decoTexts.map((txt) => (
                    <div
                      key={txt.cid}
                      style={{
                        position: 'absolute',
                        left: `${txt.x * 100}%`,
                        top: `${txt.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${txt.rot}rad)`,
                        zIndex: 31,
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        className="inline-block font-extrabold px-1 tracking-tight select-none whitespace-nowrap"
                        style={{
                          color: txt.color,
                          fontSize: `${Math.round(txt.scale * 130)}px`,
                          fontFamily:
                            txt.font === 'serif'
                              ? 'serif'
                              : txt.font === 'mono'
                              ? 'monospace'
                              : 'sans-serif',
                          textShadow:
                            '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.5)',
                        }}
                      >
                        {txt.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Download & Action Buttons (1:1 GetAngie) */}
              <div className="w-full max-w-[420px] flex flex-col gap-3 px-2">
                {/* 1. Download HD Button (Black Primary, 100% Free) */}
                <button
                  type="button"
                  onClick={handleDownloadHd}
                  disabled={isExporting}
                  className="w-full py-3.5 px-6 rounded-full font-bold text-sm bg-[#18181B] hover:bg-neutral-800 text-white shadow-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isExportingHd ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Generating HD (300 DPI)...</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Download HD</span>
                    </>
                  )}
                </button>

                {/* 2. Download Video Button (Disabled + Coming Soon Badge) */}
                <div className="relative w-full">
                  <button
                    type="button"
                    disabled={true}
                    aria-disabled="true"
                    className="w-full py-3.5 px-6 rounded-full font-semibold text-sm bg-neutral-100/80 text-neutral-400 border border-neutral-200 shadow-2xs flex items-center justify-center gap-2 cursor-not-allowed select-none transition-all"
                    title="Fitur video BTS sedang disempurnakan dan akan segera hadir!"
                  >
                    <Video size={18} className="text-neutral-400" />
                    <span>Download video</span>
                    <span className="ml-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-pink-50 text-pink-500 rounded-full border border-pink-200/80">
                      Coming soon
                    </span>
                  </button>
                </div>

                {/* 3. Save Standard Quality Button (Ghost Pill) */}
                <button
                  type="button"
                  onClick={handleDownloadStandard}
                  disabled={isExporting}
                  className="w-full py-3.5 px-6 rounded-full font-semibold text-sm bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isExportingStandard ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={18} />
                      <span>Save standard quality</span>
                    </>
                  )}
                </button>

                {/* 4. Share to Instagram Button (Warm/Pink Gradient Border) */}
                <button
                  type="button"
                  onClick={handleShareInstagram}
                  disabled={isExporting}
                  className="w-full py-3.5 px-6 rounded-full font-semibold text-sm bg-white hover:bg-pink-50/20 text-neutral-800 border border-pink-200 shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isExportingStory ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-pink-500" />
                      <span>Preparing Story...</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={18} className="text-pink-500" />
                      <span>Share to Instagram</span>
                    </>
                  )}
                </button>

                {/* Retake / Start Over -> Return to Home */}
                <div className="flex flex-col items-center justify-center mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      window.location.href = '/';
                    }}
                    className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 underline underline-offset-4 cursor-pointer transition-colors py-2"
                  >
                    Start over
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── HaloLuna Studio Footer ── */}
      <footer className="w-full border-t border-[#E8DFCE] py-5 px-4 bg-[#FDFBF7]/90 text-center relative z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-zinc-500">
            © 2026 HALOLUNA • GETHALOLUNA.COM • KOREAN AESTHETIC STUDIO
          </p>
          <p className="text-[11px] text-zinc-600">
            Crafted with precision for{' '}
            <a
              href="https://www.instagram.com/andihandikaaaa"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-900 font-semibold underline underline-offset-4 hover:text-zinc-700 transition-colors"
            >
              HaloLuna
            </a>
          </p>
        </div>
      </footer>

      {/* Share / QR Modal */}
      {showShareModal && (
        <ShareModal
          shareUrl={shareUrl}
          isUploading={isUploading}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Visual Feedback Toasts for Cloud Sync */}
      {uploadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{uploadToast}</span>
        </div>
      )}

      {uploadError && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900/90 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-red-500/30 flex items-center gap-2.5">
          <AlertCircle size={15} className="text-red-300 shrink-0" />
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="text-white/60 hover:text-white p-0.5 ml-1 transition-colors"
            title="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Realtime Live Cursors */}
      {isDuoActive && partner && (
        <LiveCursors
          remoteCursor={remoteCursor}
          partnerName={partner.name}
          partnerColor={partner.color}
          onSendCursor={sendCursor}
        />
      )}

      {/* Floating Reactions */}
      {isDuoActive && (
        <FloatingReactions
          reactions={reactions}
          onSendReaction={sendReaction}
        />
      )}

      {/* Duo Room Lobby Modal */}
      <RoomLobbyModal
        isOpen={showLobbyModal}
        onClose={() => setShowLobbyModal(false)}
        initialTab={modalInitialTab}
        roomCode={roomCode}
        frameId={frameTheme?.id}
        onSelectSolo={() => {
          setIsDuoActive(false);
          setShowLobbyModal(false);
        }}
        onCreateRoom={(name) => {
          const code = Math.random().toString(36).substring(2, 7).toUpperCase();
          setRoomCode(code);
          setRole('host');
          setUserName(name);
          setIsDuoActive(true);
          const currentFrame = frameTheme?.id || 'classic';
          router.replace(`/booth?room=${code}&frame=${encodeURIComponent(currentFrame)}`);
        }}
        onJoinRoom={(code, name) => {
          const currentFrame = searchParams.get('frame') || searchParams.get('theme') || frameTheme?.id;
          const frameParam = currentFrame ? `&frame=${encodeURIComponent(currentFrame)}` : '';
          setRoomCode(code);
          setRole('guest');
          setUserName(name);
          setIsDuoActive(true);
          router.replace(`/booth?room=${code}${frameParam}`);
        }}
        participants={participants}
        partner={partner}
        localName={userName}
        onUpdateName={setUserName}
        role={role}
        isCameraReady={!!localStream}
        onStartSession={() => setShowLobbyModal(false)}
      />
    </div>
  );
}

export default function BoothPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#FDFBF7]" />}>
      <CaptureRoom />
    </Suspense>
  );
}
