'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  AlertCircle,
  FlipHorizontal,
  Volume2,
  VolumeX,
  Users,
  Upload,
} from 'lucide-react';
import { playCountdownBeep, playFlashSound, initAudio } from './AudioEngine';
import { isCanvasFilterSupported } from '@/utils/canvasColorGrading';
import { mergeDualPhotos } from '@/utils/dualComposite';
import {
  STUDIO_FILTERS,
  getFilterCss,
  type FilterName,
  type CountdownDuration,
  type ShotClip,
} from './CameraViewport';
import type { Participant, RoomRole, RoomSyncAction } from '@/lib/realtime/roomTypes';
import { snapSessionManager } from '@/lib/media/snapCameraKit';
import {
  FACE_FILTERS,
  FACE_FILTERS_MAP,
  getPoseForShot,
  type FaceFilterPart,
} from '@/lib/photobooth-shoot-data';
import {
  createFaceTracker,
  warmFaceTracking,
  type FaceTracker,
  type FaceSummary,
} from '@/lib/media/faceTrack';
import {
  paintFaceFilter,
  preloadFilter,
  coverMap,
} from '@/lib/media/faceFilterRenderer';
import {
  createPersonSegmenter,
  warmBgSegmentation,
  preloadBg,
  bgImage,
  bgSourceRect,
  type PersonSegmenter,
} from '@/lib/media/bgSegment';

interface CameraViewportDuoProps {
  onCapture: (imageDataUrl: string, filter: FilterName, clip?: ShotClip) => void;
  isCapturing: boolean;
  capturedCount: number;
  totalFrames?: number;
  countdownDuration?: CountdownDuration;
  onCountdownDurationChange?: (duration: CountdownDuration) => void;
  capturedThumbnails?: string[];
  onRetakeLast?: () => void;

  // Duo / Multiplayer Props
  isDuoMode?: boolean;
  partner?: Participant | null;
  role?: RoomRole;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onSendSyncAction?: (action: RoomSyncAction) => void;
  incomingSyncAction?: RoomSyncAction | null;
  onCameraReadyChange?: (ready: boolean) => void;
  cameraError?: string | null;
  onRetryCamera?: () => void;

  // REA Get Ready & Shoot Props
  selectedBg?: string;
  selectedFaceFilter?: string;
  userName?: string;
  partnerName?: string;
  isShooting?: boolean;
  externalCountdown?: number | null;
  triggerSnap?: number;
}

export default function CameraViewportDuo({
  onCapture,
  isCapturing,
  capturedCount,
  totalFrames = 6,
  countdownDuration = 3,
  onCountdownDurationChange,
  capturedThumbnails = [],
  onRetakeLast,
  isDuoMode = false,
  partner = null,
  role = 'host',
  localStream,
  remoteStream,
  onSendSyncAction,
  incomingSyncAction,
  onCameraReadyChange,
  cameraError = null,
  onRetryCamera,
  selectedBg = 'none',
  selectedFaceFilter = 'none',
  userName = 'You',
  partnerName,
  isShooting = false,
  externalCountdown = null,
  triggerSnap = 0,
}: CameraViewportDuoProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);

  // MediaPipe Tracker & Segmenter Refs
  const localTrackerRef = useRef<FaceTracker | null>(null);
  const remoteTrackerRef = useRef<FaceTracker | null>(null);
  const localSegmenterRef = useRef<PersonSegmenter | null>(null);
  const remoteSegmenterRef = useRef<PersonSegmenter | null>(null);

  // Overlay Canvases
  const localOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const soloOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapContainerRef = useRef<HTMLDivElement | null>(null);
  const freshestLocalFaceRef = useRef<FaceSummary | null>(null);

  const [isSnapActive, setIsSnapActive] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterName>('natural');
  const [isMirrored, setIsMirrored] = useState(true);
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(true);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSnapFilterActive = Boolean(selectedFaceFilter && selectedFaceFilter !== 'none');

  // Active countdown: prefer externalCountdown from parent sequence if provided
  const countdown = externalCountdown !== null ? externalCountdown : localCountdown;

  // Pre-warm MediaPipe engines and clean up on unmount
  useEffect(() => {
    warmFaceTracking(isDuoMode ? 2 : 1);
    warmBgSegmentation(isDuoMode ? 2 : 1);
    return () => {
      localTrackerRef.current?.close();
      remoteTrackerRef.current?.close();
      localSegmenterRef.current?.close();
      remoteSegmenterRef.current?.close();
      localTrackerRef.current = null;
      remoteTrackerRef.current = null;
      localSegmenterRef.current = null;
      remoteSegmenterRef.current = null;
    };
  }, [isDuoMode]);

  useEffect(() => {
    if (selectedBg && selectedBg !== 'none') {
      preloadBg(selectedBg);
    }
  }, [selectedBg]);

  useEffect(() => {
    if (selectedFaceFilter && selectedFaceFilter !== 'none') {
      preloadFilter(selectedFaceFilter);
    }
  }, [selectedFaceFilter]);

  // Connect Snap Camera Kit with localStream & mirror preference
  useEffect(() => {
    if (localStream) {
      snapSessionManager.setSourceStream(localStream, isMirrored);
    }
  }, [localStream, isMirrored]);

  // Apply or clear Snap Lens when selectedFaceFilter changes
  useEffect(() => {
    if (!selectedFaceFilter || selectedFaceFilter === 'none') {
      snapSessionManager.clearLens();
    } else {
      snapSessionManager.applyLensById(selectedFaceFilter);
    }
  }, [selectedFaceFilter]);

  // Subscribe to active lens status
  useEffect(() => {
    const unsub = snapSessionManager.subscribe((lens) => {
      setIsSnapActive(Boolean(lens));
    });
    return unsub;
  }, []);

  // Attach Snap Camera Kit live canvas into the local viewport container
  useEffect(() => {
    if (!snapContainerRef.current) return;
    const cleanup = snapSessionManager.attachLiveCanvas(snapContainerRef.current);
    return cleanup;
  }, [isSnapActive, isSnapFilterActive, isDuoMode, role]);

  // Real-time animation loop: Segment person and track face filters per frame
  useEffect(() => {
    let animId: number;

    const renderFeed = (
      video: HTMLVideoElement | null,
      canvas: HTMLCanvasElement | null,
      trackerRef: React.MutableRefObject<FaceTracker | null>,
      segmenterRef: React.MutableRefObject<PersonSegmenter | null>,
      filterId: string,
      bgId: string,
      half: number,
      halves: number,
      isLocal: boolean
    ) => {
      if (!canvas) return;
      const cx = canvas.getContext('2d');
      if (!cx) return;

      const hasVideo =
        video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
      const bgActive = hasVideo && bgId && bgId !== 'none';
      const filterActive = hasVideo && filterId && filterId !== 'none';

      if (!bgActive && !filterActive) {
        if (canvas.dataset.dirty) {
          cx.clearRect(0, 0, canvas.width, canvas.height);
          delete canvas.dataset.dirty;
        }
        if (isLocal) freshestLocalFaceRef.current = null;
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (cw && ch && (canvas.width !== cw || canvas.height !== ch)) {
        canvas.width = cw;
        canvas.height = ch;
      }
      if (!canvas.width || !canvas.height) return;

      cx.clearRect(0, 0, canvas.width, canvas.height);

      const vw = video!.videoWidth;
      const vh = video!.videoHeight;

      // 1. Virtual Background + Person Cutout
      if (bgActive) {
        segmenterRef.current ||= createPersonSegmenter(video!);
        const cut = segmenterRef.current.cutout();
        const img = bgImage(bgId);

        cx.save();
        cx.beginPath();
        cx.rect(0, 0, canvas.width, canvas.height);
        cx.clip();

        if (img && cut) {
          // Draw virtual background cover-fit into panel
          const r = bgSourceRect(
            img.naturalWidth,
            img.naturalHeight,
            canvas.width,
            canvas.height,
            half,
            halves
          );
          cx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);

          // Draw cutout (person only) mirrored on top with identical cover geometry
          const s = Math.max(canvas.width / vw, canvas.height / vh);
          const dw = vw * s;
          const dh = vh * s;
          cx.save();
          cx.translate(canvas.width, 0);
          cx.scale(-1, 1);
          cx.drawImage(cut, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
          cx.restore();
        } else {
          // While segmenter / image is loading, draw mirrored raw feed so no black screen
          const s = Math.max(canvas.width / vw, canvas.height / vh);
          const dw = vw * s;
          const dh = vh * s;
          cx.save();
          cx.translate(canvas.width, 0);
          cx.scale(-1, 1);
          cx.drawImage(video!, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
          cx.restore();
        }
        cx.restore();
      }

      // 2. Face Filter Tracking
      if (filterActive) {
        trackerRef.current ||= createFaceTracker(video!);
        const face = trackerRef.current.detect();
        if (isLocal) freshestLocalFaceRef.current = face;
        if (face) {
          paintFaceFilter(
            cx,
            filterId,
            face,
            coverMap(vw, vh, { x: 0, y: 0, w: canvas.width, h: canvas.height })
          );
        }
      } else if (isLocal) {
        freshestLocalFaceRef.current = null;
      }

      canvas.dataset.dirty = '1';
    };

    const loop = () => {
      animId = requestAnimationFrame(loop);

      if (!isDuoMode) {
        renderFeed(
          localVideoRef.current,
          soloOverlayCanvasRef.current,
          localTrackerRef,
          localSegmenterRef,
          selectedFaceFilter,
          selectedBg,
          0,
          1,
          true
        );
      } else {
        const isHost = role === 'host';
        const leftVideo = isHost ? localVideoRef.current : remoteVideoRef.current;
        const rightVideo = isHost ? remoteVideoRef.current : localVideoRef.current;

        renderFeed(
          leftVideo,
          localOverlayCanvasRef.current,
          isHost ? localTrackerRef : remoteTrackerRef,
          isHost ? localSegmenterRef : remoteSegmenterRef,
          selectedFaceFilter,
          selectedBg,
          0,
          2,
          isHost
        );

        renderFeed(
          rightVideo,
          remoteOverlayCanvasRef.current,
          !isHost ? localTrackerRef : remoteTrackerRef,
          !isHost ? localSegmenterRef : remoteSegmenterRef,
          selectedFaceFilter,
          selectedBg,
          1,
          2,
          !isHost
        );
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDuoMode, role, selectedBg, selectedFaceFilter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          onCapture(dataUrl, selectedFilter);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Stash local & remote photos before merging per shotIndex
  const pendingPhotosRef = useRef<Map<number, { local?: string; remote?: string }>>(new Map());

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      onCameraReadyChange?.(true);
    }
  }, [localStream, onCameraReadyChange]);

  // Attach remote stream to remote video element with resilient fallback
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.onloadedmetadata = () => {
        remoteVideoRef.current?.play().then(() => {
          setRemoteVideoActive(true);
        }).catch(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.play().then(() => setRemoteVideoActive(true)).catch(console.error);
          }
        });
      };
    }
  }, [remoteStream]);

  // Trigger Flash Animation & Shutter Audio
  const triggerFlash = useCallback(() => {
    try {
      playFlashSound();
    } catch (e) {
      // Audio autoplay policy
    }
    if (flashRef.current) {
      flashRef.current.classList.remove('animate-flash');
      void flashRef.current.offsetWidth; // reflow
      flashRef.current.classList.add('animate-flash');
    }
  }, []);

  // Capture High-Res Snapshot with background & face stickers composited
  const captureLocalSnapshot = useCallback((): string | null => {
    const video = localVideoRef.current;
    if (!video || video.readyState < 2) return null;

    const origWidth = video.videoWidth || 1920;
    const origHeight = video.videoHeight || 1080;

    const maxDim = 1920;
    const scale = Math.min(1, maxDim / Math.max(origWidth, origHeight));
    const width = Math.round(origWidth * scale);
    const height = Math.round(origHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const hasBg = selectedBg && selectedBg !== 'none';
    const hasFilter = selectedFaceFilter && selectedFaceFilter !== 'none';
    const snapCanvas = snapSessionManager.getLiveCanvas();
    const hasSnapLens = Boolean(hasFilter && snapCanvas && snapCanvas.width > 0 && snapCanvas.height > 0);

    // 1. If Snap Camera Kit Lens is active, capture directly from Snap live canvas (with horizontal flip if isMirrored)
    if (hasSnapLens && snapCanvas) {
      ctx.save();
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(snapCanvas, 0, 0, width, height);
      ctx.restore();
    } else if (hasBg) {
      const img = bgImage(selectedBg);
      localSegmenterRef.current ||= createPersonSegmenter(video);
      const cut = localSegmenterRef.current.capture() || localSegmenterRef.current.cutout();

      if (img && cut) {
        const isHost = role === 'host';
        const half = isDuoMode ? (isHost ? 0 : 1) : 0;
        const halves = isDuoMode ? 2 : 1;

        const r = bgSourceRect(img.naturalWidth, img.naturalHeight, width, height, half, halves);
        ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, width, height);

        // Draw cutout mirrored on top
        ctx.save();
        if (isMirrored) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(cut, 0, 0, width, height);
        ctx.restore();
      } else {
        // Fallback to raw video
        ctx.save();
        if (isMirrored) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();
      }
    } else {
      // Raw video
      ctx.save();
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Legacy Face Filter Stickers pinned to tracked face (if not Snap Lens)
    if (hasFilter && !hasSnapLens) {
      localTrackerRef.current ||= createFaceTracker(video);
      const face = localTrackerRef.current.detect() || freshestLocalFaceRef.current;
      if (face) {
        paintFaceFilter(
          ctx,
          selectedFaceFilter,
          face,
          coverMap(width, height, { x: 0, y: 0, w: width, h: height })
        );
      }
    }

    // 3. Apply CSS Filter if active
    const cssFilter = getFilterCss(selectedFilter);
    if (cssFilter && isCanvasFilterSupported()) {
      const filteredCanvas = document.createElement('canvas');
      filteredCanvas.width = width;
      filteredCanvas.height = height;
      const fCtx = filteredCanvas.getContext('2d');
      if (fCtx) {
        fCtx.filter = cssFilter;
        fCtx.drawImage(canvas, 0, 0);
        return filteredCanvas.toDataURL('image/jpeg', 0.92);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  }, [isMirrored, selectedFilter, selectedBg, selectedFaceFilter, isDuoMode, role]);

  // Process Completed Shot (Merge if Duo, or pass directly if Solo)
  const resolveShot = useCallback(
    async (shotIndex: number, localPhoto: string, remotePhoto?: string) => {
      if (!isDuoMode || !remotePhoto) {
        onCapture(localPhoto, selectedFilter);
        return;
      }

      try {
        // Merge dual photos: Host (Pink) on Left, Guest (Blue) on Right
        const photoLeft = role === 'host' ? localPhoto : remotePhoto;
        const photoRight = role === 'host' ? remotePhoto : localPhoto;

        const mergedDataUrl = await mergeDualPhotos(photoLeft, photoRight, {
          width: 1200,
          height: 900,
          dividerWidth: 4,
          dividerColor: '#ffffff',
        });

        onCapture(mergedDataUrl, selectedFilter);
      } catch (err) {
        console.error('[Duo] Failed to merge dual photos:', err);
        onCapture(localPhoto, selectedFilter);
      }
    },
    [isDuoMode, role, onCapture, selectedFilter]
  );

  // Shutter execution
  const executeShutter = useCallback(
    (shotIndex: number) => {
      triggerFlash();
      const localDataUrl = captureLocalSnapshot();
      if (!localDataUrl) return;

      if (!isDuoMode) {
        onCapture(localDataUrl, selectedFilter);
        return;
      }

      // In Duo mode: store local shot and broadcast to partner
      const pending = pendingPhotosRef.current.get(shotIndex) || {};
      pending.local = localDataUrl;
      pendingPhotosRef.current.set(shotIndex, pending);

      onSendSyncAction?.({
        type: 'PHOTO_FRAME',
        shotIndex,
        senderId: role,
        dataUrl: localDataUrl,
      });

      // If partner's photo already arrived, merge immediately
      if (pending.remote) {
        resolveShot(shotIndex, localDataUrl, pending.remote);
      }
    },
    [triggerFlash, captureLocalSnapshot, isDuoMode, onCapture, selectedFilter, onSendSyncAction, role, resolveShot]
  );

  // Trigger snap from parent
  const prevTriggerSnapRef = useRef(triggerSnap);
  useEffect(() => {
    if (triggerSnap > 0 && triggerSnap !== prevTriggerSnapRef.current) {
      prevTriggerSnapRef.current = triggerSnap;
      executeShutter(capturedCount);
    }
  }, [triggerSnap, capturedCount, executeShutter]);

  // Handle incoming sync actions from Partner
  useEffect(() => {
    if (!incomingSyncAction) return;

    if (incomingSyncAction.type === 'COUNTDOWN_START') {
      let currentSec = incomingSyncAction.duration;
      setLocalCountdown(currentSec);
      try {
        playCountdownBeep(currentSec);
      } catch (e) {}

      const interval = setInterval(() => {
        currentSec -= 1;
        if (currentSec > 0) {
          setLocalCountdown(currentSec);
          try {
            playCountdownBeep(currentSec);
          } catch (e) {}
        } else {
          clearInterval(interval);
          setLocalCountdown(null);
          executeShutter(incomingSyncAction.shotIndex);
        }
      }, 1000);
    } else if (incomingSyncAction.type === 'PHOTO_FRAME') {
      const shotIndex = incomingSyncAction.shotIndex;
      const pending = pendingPhotosRef.current.get(shotIndex) || {};
      pending.remote = incomingSyncAction.dataUrl;
      pendingPhotosRef.current.set(shotIndex, pending);

      if (pending.local) {
        resolveShot(shotIndex, pending.local, incomingSyncAction.dataUrl);
      }
    } else if (incomingSyncAction.type === 'FILTER_SELECT') {
      setSelectedFilter(incomingSyncAction.filter as FilterName);
    }
  }, [incomingSyncAction, executeShutter, resolveShot]);

  // Start Manual Countdown Sequence
  const handleStartCountdown = useCallback(() => {
    if (isCapturing || countdown !== null) return;
    initAudio();

    const shotIndex = capturedCount;
    const runId = Math.random().toString(36).substring(2, 9);

    if (isDuoMode) {
      onSendSyncAction?.({
        type: 'COUNTDOWN_START',
        runId,
        duration: countdownDuration,
        shotIndex,
      });
    }

    let currentSec: number = countdownDuration;
    setLocalCountdown(currentSec);
    try {
      playCountdownBeep(currentSec);
    } catch (e) {}

    const interval = setInterval(() => {
      currentSec -= 1;
      if (currentSec > 0) {
        setLocalCountdown(currentSec);
        try {
          playCountdownBeep(currentSec);
        } catch (e) {}
      } else {
        clearInterval(interval);
        setLocalCountdown(null);
        executeShutter(shotIndex);
      }
    }, 1000);
  }, [isCapturing, countdown, capturedCount, isDuoMode, onSendSyncAction, countdownDuration, executeShutter]);

  const handleFilterSelect = (filterName: FilterName) => {
    setSelectedFilter(filterName);
    if (isDuoMode && onSendSyncAction) {
      onSendSyncAction({
        type: 'FILTER_SELECT',
        filter: filterName,
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* ── Main Viewport / Stage ── */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950 shadow-md border border-neutral-200">
        {/* Flash Overlay */}
        <div
          ref={flashRef}
          className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0"
        />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-xs">
            <span className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] animate-ping-once">
              {countdown}
            </span>
          </div>
        )}

        {/* Feeds Rendering */}
        {isDuoMode ? (
          /* DUO MODE: Split 50:50 Screen */
          (() => {
            const isHost = role === 'host';
            const leftStream = isHost ? localStream : remoteStream;
            const rightStream = isHost ? remoteStream : localStream;
            const isLeftLocal = isHost;
            const isRightLocal = !isHost;

            return (
              <div className="relative w-full h-full grid grid-cols-2 divide-x divide-white/20">
                {/* Left Feed (Host) */}
                <div className="relative w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center">
                  {leftStream ? (
                    <>
                      <video
                        ref={(el) => {
                          if (isLeftLocal) localVideoRef.current = el;
                          else remoteVideoRef.current = el;
                          if (el && leftStream && el.srcObject !== leftStream) {
                            el.srcObject = leftStream;
                            el.onloadedmetadata = () => {
                              el.play().then(() => {
                                if (!isLeftLocal) setRemoteVideoActive(true);
                              }).catch(() => {
                                el.muted = true;
                                el.play().then(() => {
                                  if (!isLeftLocal) setRemoteVideoActive(true);
                                }).catch(console.error);
                              });
                            };
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted={isLeftLocal ? isMirrored : isRemoteAudioMuted}
                        className={`w-full h-full object-cover relative z-[1] ${
                          isLeftLocal && isSnapFilterActive ? 'hidden' : 'block'
                        } ${isLeftLocal && isMirrored ? 'scale-x-[-1]' : ''}`}
                        style={{ filter: getFilterCss(selectedFilter) }}
                      />
                      {/* MediaPipe Segmentation & Face Filter Live Overlay */}
                      <canvas
                        ref={localOverlayCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      />

                      {/* Snap Camera Kit Live Preview Overlay for Local Camera */}
                      {isLeftLocal && (
                        <div
                          ref={snapContainerRef}
                          className={`w-full h-full relative z-[1] overflow-hidden bg-transparent ${
                            isSnapFilterActive ? 'block' : 'hidden'
                          } ${isMirrored ? 'scale-x-[-1]' : ''}`}
                          style={{ filter: getFilterCss(selectedFilter) }}
                        />
                      )}

                      {/* Name Badge */}
                      <div className="absolute bottom-3 left-3 z-20 flex items-center rounded-md bg-[#f43f5e] px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                        <span>{isHost ? userName : (partner?.name || partnerName || 'Host')}</span>
                      </div>
                    </>
                  ) : isLeftLocal && cameraError ? (
                    <div className="p-4 text-center text-neutral-300 flex flex-col items-center z-10">
                      <AlertCircle size={24} className="text-red-400 mb-2" />
                      <p className="text-[11px] font-semibold text-white mb-1">Kamera Diblokir</p>
                      <p className="text-[10px] text-neutral-400 line-clamp-3 mb-3">{cameraError}</p>
                      {onRetryCamera && (
                        <button
                          type="button"
                          onClick={onRetryCamera}
                          className="px-3 py-1 rounded-full bg-white text-neutral-900 text-[10px] font-bold"
                        >
                          Coba Lagi
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-neutral-400 flex flex-col items-center z-10">
                      <div className="mb-2 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center animate-pulse text-white">
                        <Users size={20} />
                      </div>
                      <p className="text-xs font-semibold text-neutral-200">
                        {isLeftLocal
                          ? 'Menghubungkan kamera...'
                          : partner
                          ? `Menghubungkan kamera ${partner.name}...`
                          : 'Menunggu pasangan bergabung...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Feed (Guest) */}
                <div className="relative w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center">
                  {rightStream ? (
                    <>
                      <video
                        ref={(el) => {
                          if (isRightLocal) localVideoRef.current = el;
                          else remoteVideoRef.current = el;
                          if (el && rightStream && el.srcObject !== rightStream) {
                            el.srcObject = rightStream;
                            el.onloadedmetadata = () => {
                              el.play().then(() => {
                                if (!isRightLocal) setRemoteVideoActive(true);
                              }).catch(() => {
                                el.muted = true;
                                el.play().then(() => {
                                  if (!isRightLocal) setRemoteVideoActive(true);
                                }).catch(console.error);
                              });
                            };
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted={isRightLocal ? isMirrored : isRemoteAudioMuted}
                        className={`w-full h-full object-cover relative z-[1] ${
                          isRightLocal && isSnapFilterActive ? 'hidden' : 'block'
                        } ${isRightLocal && isMirrored ? 'scale-x-[-1]' : ''}`}
                        style={{ filter: getFilterCss(selectedFilter) }}
                      />
                      {/* MediaPipe Segmentation & Face Filter Live Overlay */}
                      <canvas
                        ref={remoteOverlayCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      />

                      {/* Snap Camera Kit Live Preview Overlay for Local Camera */}
                      {isRightLocal && (
                        <div
                          ref={snapContainerRef}
                          className={`w-full h-full relative z-[1] overflow-hidden bg-transparent ${
                            isSnapFilterActive ? 'block' : 'hidden'
                          } ${isMirrored ? 'scale-x-[-1]' : ''}`}
                          style={{ filter: getFilterCss(selectedFilter) }}
                        />
                      )}

                      {/* Name Badge */}
                      <div className="absolute bottom-3 left-3 z-20 flex items-center rounded-md bg-[#f43f5e] px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                        <span>{!isHost ? userName : (partner?.name || partnerName || 'Partner')}</span>
                      </div>

                      {/* Remote Audio Toggle */}
                      {!isRightLocal && (
                        <button
                          type="button"
                          onClick={() => {
                            if (remoteVideoRef.current) {
                              remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
                              setIsRemoteAudioMuted(remoteVideoRef.current.muted);
                            }
                          }}
                          className="absolute bottom-3 right-3 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 backdrop-blur-md"
                          title={isRemoteAudioMuted ? 'Unmute partner audio' : 'Mute partner audio'}
                        >
                          {isRemoteAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      )}
                    </>
                  ) : isRightLocal && cameraError ? (
                    <div className="p-4 text-center text-neutral-300 flex flex-col items-center z-10">
                      <AlertCircle size={24} className="text-red-400 mb-2" />
                      <p className="text-[11px] font-semibold text-white mb-1">Kamera Diblokir</p>
                      <p className="text-[10px] text-neutral-400 line-clamp-3 mb-3">{cameraError}</p>
                      {onRetryCamera && (
                        <button
                          type="button"
                          onClick={onRetryCamera}
                          className="px-3 py-1 rounded-full bg-white text-neutral-900 text-[10px] font-bold"
                        >
                          Coba Lagi
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 z-10">
                      <div className="mb-2 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center animate-pulse text-white">
                        <Users size={20} />
                      </div>
                      <p className="text-xs font-semibold text-neutral-200">
                        {isRightLocal
                          ? 'Menghubungkan kamera...'
                          : partner
                          ? `Menghubungkan kamera ${partner.name}...`
                          : 'Menunggu pasangan bergabung...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          /* SOLO MODE: Single Camera Feed */
          <div className="relative w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center">
            {localStream ? (
              <>
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStream && el.srcObject !== localStream) {
                      el.srcObject = localStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover relative z-[1] ${
                    isSnapFilterActive ? 'hidden' : 'block'
                  } ${isMirrored ? 'scale-x-[-1]' : ''}`}
                  style={{ filter: getFilterCss(selectedFilter) }}
                />
                {/* MediaPipe Segmentation & Face Filter Live Overlay */}
                <canvas
                  ref={soloOverlayCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                {/* Snap Camera Kit Live Preview Overlay for Local Camera */}
                <div
                  ref={snapContainerRef}
                  className={`w-full h-full relative z-[1] overflow-hidden bg-transparent ${
                    isSnapFilterActive ? 'block' : 'hidden'
                  } ${isMirrored ? 'scale-x-[-1]' : ''}`}
                  style={{ filter: getFilterCss(selectedFilter) }}
                />

                {/* Name Badge */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center rounded-md bg-[#f43f5e] px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                  <span>{userName}</span>
                </div>
              </>
            ) : cameraError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-300 max-w-md z-10">
                <div className="mb-3 h-12 w-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">Akses Kamera Terhalang</h3>
                <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                  {cameraError}
                </p>
                <div className="flex items-center gap-2">
                  {onRetryCamera && (
                    <button
                      type="button"
                      onClick={onRetryCamera}
                      className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-md hover:bg-neutral-100 active:scale-95"
                    >
                      <RotateCcw size={13} />
                      <span>Coba Lagi</span>
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs font-bold text-white cursor-pointer active:scale-95">
                    <Upload size={13} />
                    <span>Upload Foto</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 z-10">
                <div className="mb-3 h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse text-white">
                  <Camera size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-200">
                  Menghubungkan kamera...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pose Suggestion Line (1:1 Angie REA) ── */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs sm:text-sm font-medium text-neutral-700">
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-200/90 text-neutral-500">
          try
        </span>
        <span className="transition-all duration-300">
          {getPoseForShot(capturedCount)}
        </span>
      </div>

      {/* ── 6-Slot Filmstrip Thumbnails (1:1 Angie REA) ── */}
      <div className="grid grid-cols-6 gap-2 sm:gap-2.5 mt-3.5 w-full max-w-sm sm:max-w-md mx-auto">
        {Array.from({ length: 6 }).map((_, i) => {
          const thumb = capturedThumbnails[i];
          return (
            <div
              key={i}
              className={`aspect-square rounded-xl border flex items-center justify-center overflow-hidden relative transition-all duration-300 ${
                thumb
                  ? 'border-neutral-800 shadow-sm bg-black'
                  : 'border-neutral-200 bg-white shadow-xs'
              }`}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={`Shot ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs sm:text-sm font-bold text-neutral-300 font-mono select-none">
                  {i + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom Controls (Mirror & Manual Trigger if not shooting) ── */}
      {!isShooting && (
        <div className="w-full max-w-md mt-4 flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/70 border border-neutral-200/80 shadow-xs">
          <button
            type="button"
            onClick={() => setIsMirrored((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 active:scale-95 cursor-pointer"
            title="Mirror preview"
          >
            <FlipHorizontal size={13} />
            <span>Mirror</span>
          </button>

          {capturedThumbnails.length > 0 && onRetakeLast && (
            <button
              type="button"
              onClick={onRetakeLast}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 active:scale-95 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Retake last</span>
            </button>
          )}
        </div>
      )}

      {/* Global CSS Animation for Flash & Bounce */}
      <style jsx global>{`
        @keyframes flashAnim {
          0% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
          }
        }
        .animate-flash {
          animation: flashAnim 0.35s ease-out forwards;
        }
        @keyframes pingOnce {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-ping-once {
          animation: pingOnce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
}
