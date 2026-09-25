'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CameraViewport, {
  type FilterName,
  COUNTDOWN_OPTIONS,
  type CountdownDuration,
  STUDIO_FILTERS,
} from '@/components/CameraViewport';
import CanvasEditor, { type LayoutType } from '@/components/CanvasEditor';
import LoadingScreen from '@/components/LoadingScreen';
import ShareModal from '@/components/ShareModal';
import { initAudio } from '@/components/AudioEngine';
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
  RotateCcw,
  X,
  Heart,
} from 'lucide-react';
import { savePhotoToSupabase } from '@/utils/supabasePhotoPipeline';

type AppStep = 'capture' | 'select' | 'edit';

interface CapturedFrame {
  dataUrl: string;
  filter: FilterName;
}

const STUDIO_SHOT_COUNT = 6;
const TARGET_SELECTION_COUNT = 4;

const LAYOUTS: { id: LayoutType; label: string; icon: React.ReactNode; frames: number }[] = [
  { id: 'strip4',  label: '4-Frame Strip', icon: <Layers size={14} />,       frames: 4 },
  { id: 'strip3',  label: '3-Frame Strip', icon: <AlignJustify size={14} />, frames: 3 },
  { id: 'grid2x2', label: '2×2 Grid',      icon: <Grid size={14} />,         frames: 4 },
  { id: 'grid2x3', label: '6-Shot (2×3)',  icon: <Grid size={14} />,         frames: 6 },
];

export default function HomePage() {
  const router = useRouter();
  const [appLoaded, setAppLoaded] = useState(false);
  const [step, setStep] = useState<AppStep>('capture');
  const [layout, setLayout] = useState<LayoutType>('strip4');
  const [countdownDuration, setCountdownDuration] = useState<CountdownDuration>(3);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0, 1, 2, 3]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const hasUploadedRef = useRef(false);
  const lastUploadedTemplateRef = useRef<string | null>(null);

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

  // Target count of photos to select based on layout
  const targetCount = layout === 'strip3' ? 3 : layout === 'grid2x3' ? 6 : TARGET_SELECTION_COUNT;

  // Handle capture of each shot in the 6-shot sequence
  const handleCapture = useCallback(
    (dataUrl: string, filter: FilterName) => {
      initAudio();
      setCapturedFrames((prev) => {
        const next = [...prev, { dataUrl, filter }];
        if (next.length >= STUDIO_SHOT_COUNT) {
          // All 6 photos captured! Pre-select up to targetCount and transition to Selection screen
          setSelectedIndices([0, 1, 2, 3, 4, 5].slice(0, targetCount));
          setTimeout(() => setStep('select'), 350);
        }
        return next;
      });
    },
    [targetCount]
  );

  // Toggle selection of photo thumbnail in "Pick 4 out of 6"
  const toggleSelectPhoto = useCallback(
    (photoIndex: number) => {
      setSelectedIndices((prev) => {
        if (prev.includes(photoIndex)) {
          // Deselect
          return prev.filter((i) => i !== photoIndex);
        } else {
          // If already reached max, replace the last slot
          if (prev.length >= targetCount) {
            return [...prev.slice(0, targetCount - 1), photoIndex];
          }
          // Otherwise append
          return [...prev, photoIndex];
        }
      });
    },
    [targetCount]
  );

  // Reordering slots in photostrip preview
  const moveSlotUp = useCallback((slotIndex: number) => {
    if (slotIndex <= 0) return;
    setSelectedIndices((prev) => {
      const next = [...prev];
      const temp = next[slotIndex];
      next[slotIndex] = next[slotIndex - 1];
      next[slotIndex - 1] = temp;
      return next;
    });
  }, []);

  const moveSlotDown = useCallback((slotIndex: number) => {
    setSelectedIndices((prev) => {
      if (slotIndex >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[slotIndex];
      next[slotIndex] = next[slotIndex + 1];
      next[slotIndex + 1] = temp;
      return next;
    });
  }, []);

  const removeSlot = useCallback((slotIndex: number) => {
    setSelectedIndices((prev) => prev.filter((_, i) => i !== slotIndex));
  }, []);

  const handleRetakeSingle = useCallback((index: number) => {
    hasUploadedRef.current = false;
    lastUploadedTemplateRef.current = null;
    setCapturedFrames((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) => prev.filter((i) => i !== index));
    setStep('capture');
  }, []);

  const handleReset = useCallback(() => {
    hasUploadedRef.current = false;
    lastUploadedTemplateRef.current = null;
    setCapturedFrames([]);
    setSelectedIndices([]);
    setStep('capture');
    setShareUrl(null);
    setShowShareModal(false);
  }, []);

  // Automatic single-save upload trigger: uploads to Supabase (guarded per template / session)
  const handleAutoUpload = useCallback(
    async (blob: Blob, templateType: string) => {
      console.log("Starting upload for frame:", templateType);
      console.log("Upload payload size:", blob?.size);

      if (lastUploadedTemplateRef.current === templateType && hasUploadedRef.current) {
        console.log("Already uploaded template", templateType, "in this session, skipping duplicate");
        return;
      }

      hasUploadedRef.current = true;
      lastUploadedTemplateRef.current = templateType;
      setIsUploading(true);

      try {
        const result = await savePhotoToSupabase(blob, templateType, 'HaloLuna Studio');
        console.log("Upload result:", result);
        if (result.success && result.id) {
          setShareUrl(`${window.location.origin}/result/${result.id}`);
        } else {
          // If upload failed, allow retry
          hasUploadedRef.current = false;
          lastUploadedTemplateRef.current = null;
        }
      } catch (err) {
        hasUploadedRef.current = false;
        lastUploadedTemplateRef.current = null;
        console.error('Supabase Auto-Upload Error:', err);
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  // Manual share button trigger: uploads to Supabase EXACTLY ONCE per session
  const handleShare = useCallback(
    async (blob: Blob, templateType: string) => {
      setShowShareModal(true);

      // If already uploaded and share link exists, reuse it without duplicate upload
      if (shareUrl) return;

      if (!isUploading && !hasUploadedRef.current) {
        hasUploadedRef.current = true;
        setIsUploading(true);
        try {
          const result = await savePhotoToSupabase(blob, templateType, 'HaloLuna Studio');
          if (result.success && result.id) {
            setShareUrl(`${window.location.origin}/result/${result.id}`);
          } else {
            hasUploadedRef.current = false;
          }
        } catch (err) {
          hasUploadedRef.current = false;
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

  // Filtered frames based on selected indices for the final CanvasEditor
  const activeEditorFrames = selectedIndices
    .map((idx) => capturedFrames[idx])
    .filter(Boolean);

  if (!appLoaded) {
    return <LoadingScreen onComplete={handleAppComplete} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#FDFBF7] text-zinc-900 relative">
      {/* Subtle Dot-Matrix Texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.14] z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #C4B99A 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── HaloLuna Studio Header ── */}
      <header className="w-full border-b border-[#E8DFCE] bg-[#FDFBF7]/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Camera size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-widest uppercase text-zinc-900 leading-none">
                  HaloLuna
                </h1>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                  gethaloluna.com
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                Korean Aesthetic Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <Sparkles size={12} className="text-amber-500" />
              <span className="hidden sm:inline font-semibold">HALOLUNA KOREAN STRIP</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="w-full max-w-5xl mx-auto px-4 py-6 relative z-10 flex-1 flex flex-col">
        {/* Step Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E8DFCE]/80">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStep('capture')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                step === 'capture'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                1
              </span>
              <span>CAPTURE 6 SHOTS</span>
            </button>

            <span className="text-zinc-300 font-bold">→</span>

            <button
              onClick={() => {
                if (capturedFrames.length > 0) setStep('select');
              }}
              disabled={capturedFrames.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                step === 'select'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                2
              </span>
              <span>PICK YOUR BEST {targetCount}</span>
            </button>

            <span className="text-zinc-300 font-bold">→</span>

            <button
              onClick={() => {
                if (selectedIndices.length === targetCount) setStep('edit');
              }}
              disabled={selectedIndices.length !== targetCount}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                step === 'edit'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                3
              </span>
              <span>STYLE &amp; EXPORT</span>
            </button>
          </div>

          {/* Frame Progress Count */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 mr-1">
              {step === 'capture'
                ? `Shot ${capturedFrames.length}/${STUDIO_SHOT_COUNT}`
                : `${selectedIndices.length}/${targetCount} selected`}
            </span>
            {Array.from({ length: step === 'capture' ? STUDIO_SHOT_COUNT : targetCount }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  step === 'capture'
                    ? i < capturedFrames.length
                      ? 'bg-zinc-900 scale-110 shadow-xs'
                      : 'bg-zinc-200'
                    : i < selectedIndices.length
                    ? 'bg-amber-500 scale-110 shadow-xs'
                    : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── STEP 1: CAPTURE 6 SHOTS (GUIDED GETANGIE STYLE) ── */}
        {step === 'capture' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start flex-1">
            <div className="flex flex-col gap-5 w-full">
              {/* Settings Card: Strip Layout & Countdown Timer */}
              <div className="bg-white/80 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-[#E8DFCE] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    Target Photostrip Layout
                  </p>
                  <div className="flex gap-2">
                    {LAYOUTS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLayout(l.id)}
                        className={`pill-tab flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          layout === l.id
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                            : 'bg-[#FAF7F0] text-zinc-700 border-[#E8DFCE] hover:border-zinc-400 hover:bg-zinc-50 shadow-xs'
                        }`}
                      >
                        {l.icon}
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Timer size={13} className="text-zinc-500" />
                    <span>Countdown Timer</span>
                  </p>
                  <div className="flex items-center gap-1.5 bg-[#FAF7F0] p-1 rounded-xl border border-[#E8DFCE]">
                    {COUNTDOWN_OPTIONS.map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setCountdownDuration(sec)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          countdownDuration === sec
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/80'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Camera Viewport */}
              <CameraViewport
                onCapture={handleCapture}
                isCapturing={capturedFrames.length < STUDIO_SHOT_COUNT}
                capturedCount={capturedFrames.length}
                totalFrames={STUDIO_SHOT_COUNT}
                countdownDuration={countdownDuration}
                onCountdownDurationChange={setCountdownDuration}
                capturedThumbnails={capturedFrames.map((f) => f.dataUrl)}
                onRetakeLast={() => setCapturedFrames((prev) => prev.slice(0, -1))}
              />
            </div>

            {/* Right Column: Studio Reel of 6 Snaps */}
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest flex items-center gap-1.5">
                  <span>6 Studio Shots</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                    GetAngie Flow
                  </span>
                </p>
                <span className="text-[11px] font-mono text-zinc-500">
                  {capturedFrames.length === STUDIO_SHOT_COUNT ? '✓ All 6 Snapped' : `${capturedFrames.length}/${STUDIO_SHOT_COUNT}`}
                </span>
              </div>

              {/* 6 Film Reel Slots */}
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: STUDIO_SHOT_COUNT }).map((_, i) => {
                  const frame = capturedFrames[i];
                  return (
                    <div key={i} className="transition-all duration-300">
                      {frame ? (
                        <div className="group relative rounded-lg bg-white p-1.5 pb-4 border border-[#E8DFCE] shadow-sm hover:shadow-md transition-all">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={frame.dataUrl}
                            alt={`Shot ${i + 1}`}
                            className="w-full aspect-square object-cover rounded-sm"
                          />
                          <div className="absolute inset-1.5 bottom-5 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-sm">
                            <button
                              onClick={() => handleRetakeSingle(i)}
                              className="bg-white text-zinc-900 text-[10px] font-bold px-2 py-1 rounded shadow border active:scale-95"
                            >
                              Retake
                            </button>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1">
                            <span>#{i + 1}</span>
                            <span className="truncate max-w-[80px]">
                              {STUDIO_FILTERS.find((f) => f.id === frame.filter)?.label || frame.filter}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-white/70 p-1.5 pb-4 border border-dashed border-[#DCD3C2] shadow-xs">
                          <div className="aspect-square bg-[#F7F3EA] rounded-sm flex flex-col items-center justify-center text-zinc-400">
                            <Camera size={16} className="opacity-40 mb-1" />
                            <span className="text-[9px] font-mono font-medium">
                              SHOT {i + 1}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Transition CTA when all 6 frames ready */}
              {capturedFrames.length === STUDIO_SHOT_COUNT && (
                <button
                  onClick={() => setStep('select')}
                  className="w-full btn-neo-dark flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest rounded-xl shadow-md mt-2 transition-transform active:scale-[0.98]"
                >
                  <Check size={14} />
                  Proceed to Pick Your Best {targetCount} →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: "PICK YOUR BEST 4" SELECTION SCREEN ── */}
        {step === 'select' && (
          <div className="flex flex-col gap-6 w-full flex-1">
            {/* Guidance Banner */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFCE] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-zinc-900">
                    Select Your {targetCount} Best Shots
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {selectedIndices.length}/{targetCount} Selected
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-1">
                  Choose your {targetCount} favorite photos from your studio session. Tap thumbnails to select, or reorder slots on the right.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setStep('capture')}
                  className="btn-neo text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl"
                >
                  <RotateCcw size={12} />
                  <span>Retake Studio Shots</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedIndices.length === targetCount) setStep('edit');
                  }}
                  disabled={selectedIndices.length !== targetCount}
                  className="btn-neo-dark text-xs py-2 px-4 flex items-center gap-1.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <span>Continue to Style &amp; Export</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Selection Grid & Photostrip Assembly Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
              {/* 6 Studio Photo Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {capturedFrames.map((frame, index) => {
                  const isSelected = selectedIndices.includes(index);
                  const orderIndex = selectedIndices.indexOf(index);
                  return (
                    <div
                      key={index}
                      onClick={() => toggleSelectPhoto(index)}
                      className={`group relative rounded-2xl bg-white p-2 border-2 transition-all cursor-pointer select-none overflow-hidden ${
                        isSelected
                          ? 'border-zinc-900 shadow-lg ring-2 ring-zinc-900/10 scale-[1.02]'
                          : 'border-zinc-200 hover:border-zinc-400 hover:shadow-md'
                      }`}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frame.dataUrl}
                          alt={`Studio Shot ${index + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Order Badge or Add Circle */}
                        <div className="absolute top-2 right-2 z-10">
                          {isSelected ? (
                            <span className="w-7 h-7 rounded-full bg-zinc-900 text-white font-extrabold text-xs flex items-center justify-center shadow-lg border border-white">
                              {orderIndex + 1}
                            </span>
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-white/90 text-zinc-600 font-bold text-xs flex items-center justify-center shadow border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                              +
                            </span>
                          )}
                        </div>

                        {/* Shot number tag */}
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-mono px-2 py-0.5 rounded-md">
                          Shot #{index + 1}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-zinc-700">
                          {isSelected ? `Slot ${orderIndex + 1} of ${targetCount}` : 'Tap to select'}
                        </span>
                        <span className="text-[9.5px] font-mono text-zinc-400 uppercase">
                          {STUDIO_FILTERS.find((f) => f.id === frame.filter)?.label || frame.filter}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Photostrip Assembly Preview & Slot Reordering */}
              <div className="bg-[#FAF7F0] border border-[#E8DFCE] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DFCE]">
                  <p className="text-xs font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers size={13} className="text-zinc-600" />
                    <span>Strip Order ({selectedIndices.length}/{targetCount})</span>
                  </p>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {layout === 'grid2x2' ? '2×2 Grid' : `${targetCount}-Cut Strip`}
                  </span>
                </div>

                {/* 4 Ordered Slots */}
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: targetCount }).map((_, slotIdx) => {
                    const chosenFrameIndex = selectedIndices[slotIdx];
                    const frame = chosenFrameIndex !== undefined ? capturedFrames[chosenFrameIndex] : null;

                    return (
                      <div
                        key={slotIdx}
                        className={`rounded-xl p-2.5 border transition-all ${
                          frame
                            ? 'bg-white border-zinc-300 shadow-xs flex items-center gap-3'
                            : 'bg-white/50 border-dashed border-zinc-300 flex items-center justify-center py-4'
                        }`}
                      >
                        {frame ? (
                          <>
                            {/* Number badge */}
                            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                              {slotIdx + 1}
                            </span>

                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={frame.dataUrl}
                                alt={`Slot ${slotIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-800 leading-tight">
                                Shot #{chosenFrameIndex + 1}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-400 truncate">
                                {STUDIO_FILTERS.find((f) => f.id === frame.filter)?.label || frame.filter}
                              </p>
                            </div>

                            {/* Reordering / Swap Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => moveSlotUp(slotIdx)}
                                disabled={slotIdx === 0}
                                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-zinc-100 text-zinc-700 flex items-center justify-center transition-colors"
                                title="Move Slot Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => moveSlotDown(slotIdx)}
                                disabled={slotIdx === selectedIndices.length - 1}
                                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-zinc-100 text-zinc-700 flex items-center justify-center transition-colors"
                                title="Move Slot Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                onClick={() => removeSlot(slotIdx)}
                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors ml-0.5"
                                title="Remove from Photostrip"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-[11px] font-mono text-zinc-400">
                            + Tap an unselected shot to fill Slot {slotIdx + 1}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Primary CTA */}
                <button
                  onClick={() => {
                    if (selectedIndices.length === targetCount) setStep('edit');
                  }}
                  disabled={selectedIndices.length !== targetCount}
                  className="w-full btn-neo-dark flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  <Sparkles size={14} />
                  <span>
                    {selectedIndices.length === targetCount
                      ? 'Continue to Style & Stickers →'
                      : `Pick ${targetCount - selectedIndices.length} More Shot${targetCount - selectedIndices.length > 1 ? 's' : ''}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: STYLE & EXPORT (CANVAS ENGINE) ── */}
        {step === 'edit' && (
          <div className="bg-[#FAF7F0] border border-[#E8DFCE] rounded-2xl p-5 sm:p-6 shadow-sm w-full">
            <CanvasEditor
              frames={activeEditorFrames}
              allFrames={capturedFrames}
              layout={layout}
              initialPreset={layout === 'grid2x3' ? 'birthdayCatPink' : undefined}
              onAutoUpload={handleAutoUpload}
              onShare={handleShare}
              onReset={handleReset}
            />
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
              href="https://gethaloluna.com"
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
    </div>
  );
}
