'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CameraViewport, { type FilterName } from '@/components/CameraViewport';
import CanvasEditor, { type LayoutType } from '@/components/CanvasEditor';
import LoadingScreen from '@/components/LoadingScreen';
import ShareModal from '@/components/ShareModal';
import { initAudio } from '@/components/AudioEngine';
import { Camera, Grid, AlignJustify, Layers, Sparkles } from 'lucide-react';
import { savePhotoToSupabase } from '@/utils/supabasePhotoPipeline';

type AppStep = 'capture' | 'edit';

interface CapturedFrame {
  dataUrl: string;
  filter: FilterName;
}

const LAYOUTS: { id: LayoutType; label: string; icon: React.ReactNode; frames: number }[] = [
  { id: 'strip3',  label: '3-Frame Strip', icon: <AlignJustify size={14} />, frames: 3 },
  { id: 'strip4',  label: '4-Frame Strip', icon: <Layers size={14} />,       frames: 4 },
  { id: 'grid2x2', label: '2×2 Grid',      icon: <Grid size={14} />,         frames: 4 },
];

export default function HomePage() {
  const router = useRouter();
  const [appLoaded, setAppLoaded] = useState(false);
  const [step, setStep] = useState<AppStep>('capture');
  const [layout, setLayout] = useState<LayoutType>('strip3');
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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

  const totalFrames = LAYOUTS.find((l) => l.id === layout)?.frames ?? 3;
  const isCapturing = capturedFrames.length < totalFrames;

  const handleCapture = useCallback(
    (dataUrl: string, filter: FilterName) => {
      initAudio();
      setCapturedFrames((prev) => {
        const next = [...prev, { dataUrl, filter }];
        if (next.length >= totalFrames) {
          setTimeout(() => setStep('edit'), 400);
        }
        return next;
      });
    },
    [totalFrames]
  );

  const handleRetake = useCallback((index: number) => {
    setCapturedFrames((prev) => prev.filter((_, i) => i !== index));
    setStep('capture');
  }, []);

  // Background high-res Supabase upload triggered immediately when preview/render is ready
  const handlePreviewReady = useCallback(
    async (blob: Blob, templateType: string) => {
      try {
        setIsUploading(true);
        const result = await savePhotoToSupabase(blob, templateType, 'Jakarta Studio');
        if (result.success && result.id) {
          setShareUrl(`${window.location.origin}/result/${result.id}`);
        }
      } catch (err) {
        console.error("Supabase Save Error:", err);
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  // Manual share button trigger
  const handleShare = useCallback(
    async (blob: Blob, templateType: string) => {
      setShowShareModal(true);

      if (!shareUrl && !isUploading) {
        setIsUploading(true);
        try {
          const result = await savePhotoToSupabase(blob, templateType, 'Jakarta Studio');
          if (result.success && result.id) {
            setShareUrl(`${window.location.origin}/result/${result.id}`);
          }
        } catch (err) {
          console.error("Supabase Save Error:", err);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [shareUrl, isUploading]
  );

  const handleReset = useCallback(() => {
    setCapturedFrames([]);
    setStep('capture');
    setShareUrl(null);
    setShowShareModal(false);
  }, []);

  const handleAppComplete = useCallback(() => {
    setAppLoaded(true);
  }, []);

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

      {/* ── Studio Header ── */}
      <header className="w-full border-b border-[#E8DFCE] bg-[#FDFBF7]/90 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Camera size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm tracking-widest uppercase text-zinc-900 leading-none">
                  Photobooth
                </h1>
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Studio
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                Korean Aesthetic Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
              <Sparkles size={12} className="text-amber-500" />
              <span>DIRECTED BY ANDI HANDIKA</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="w-full max-w-5xl mx-auto px-4 py-8 relative z-10 flex-1 flex flex-col">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E8DFCE]/80">
          <div className="flex items-center gap-3">
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
              <span>CAPTURE STUDIO</span>
            </button>

            <span className="text-zinc-300 font-bold">→</span>

            <button
              onClick={() => {
                if (capturedFrames.length > 0) setStep('edit');
              }}
              disabled={capturedFrames.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                step === 'edit'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                2
              </span>
              <span>STYLE & STICKERS</span>
            </button>
          </div>

          {/* Frame Counter Dots */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 mr-1">
              {capturedFrames.length}/{totalFrames}
            </span>
            {Array.from({ length: totalFrames }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < capturedFrames.length
                    ? 'bg-zinc-900 scale-110 shadow-xs'
                    : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Studio Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start flex-1">
          {/* ── Left Column: Live Booth or Canvas Editor ── */}
          <div className="flex flex-col gap-5 w-full">
            {step === 'capture' && (
              <div>
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-2.5">
                  Choose Strip Layout
                </p>
                <div className="flex gap-2">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setLayout(l.id);
                        setCapturedFrames([]);
                      }}
                      className={`pill-tab flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        layout === l.id
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 shadow-xs'
                      }`}
                    >
                      {l.icon}
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'capture' ? (
              <CameraViewport
                onCapture={handleCapture}
                isCapturing={isCapturing}
                capturedCount={capturedFrames.length}
                totalFrames={totalFrames}
              />
            ) : (
              <div className="bg-[#FAF7F0] border border-[#E8DFCE] rounded-2xl p-5 sm:p-6 shadow-sm">
                <CanvasEditor
                  frames={capturedFrames}
                  layout={layout}
                  onShare={handleShare}
                  onPreviewReady={handlePreviewReady}
                  onReset={handleReset}
                />
              </div>
            )}
          </div>

          {/* ── Right Column: Aesthetic Polaroid Film Reel ── */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest">
                Polaroid Film Reel
              </p>
              <span className="text-[11px] font-mono text-zinc-500">
                {capturedFrames.length === totalFrames ? '✓ Complete' : 'Waiting for shots'}
              </span>
            </div>

            {/* Reel Slots */}
            <div className="flex flex-col gap-3.5">
              {Array.from({ length: totalFrames }).map((_, i) => {
                const frame = capturedFrames[i];
                return (
                  <div key={i} className="transition-all duration-300">
                    {frame ? (
                      /* Filled Polaroid Frame */
                      <div className="polaroid group relative rounded-lg bg-white p-2 pb-6 border border-[#E8DFCE] shadow-md hover:shadow-lg transition-all">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frame.dataUrl}
                          alt={`Frame ${i + 1}`}
                          className="w-full aspect-square object-cover rounded-sm"
                        />
                        {/* Hover Overlay with Retake */}
                        <div className="absolute inset-2 bottom-7 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-sm">
                          <button
                            onClick={() => handleRetake(i)}
                            className="bg-white text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-md shadow-md border border-zinc-200 active:scale-95"
                          >
                            Retake Shot
                          </button>
                        </div>
                        {/* Polaroid Label */}
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9.5px] font-mono text-zinc-500">
                          <span>SHOT #{i + 1}</span>
                          <span className="uppercase font-semibold text-zinc-700">
                            {frame.filter}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Empty Polaroid Slot */
                      <div className="rounded-lg bg-white/70 p-2 pb-6 border border-dashed border-[#DCD3C2] shadow-xs">
                        <div className="aspect-square bg-[#F7F3EA] rounded-sm flex flex-col items-center justify-center text-zinc-400">
                          <Camera size={20} className="opacity-40 mb-1" />
                          <span className="text-[10px] font-mono font-medium">
                            FRAME {i + 1}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Transition CTA when all frames ready */}
            {capturedFrames.length === totalFrames && step === 'capture' && (
              <button
                onClick={() => setStep('edit')}
                className="w-full btn-neo-dark flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest rounded-xl shadow-md mt-2 transition-transform active:scale-[0.98]"
              >
                <Sparkles size={14} />
                Continue to Style &amp; Stickers →
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ── Studio Footer ── */}
      <footer className="w-full border-t border-[#E8DFCE] py-5 px-4 bg-[#FDFBF7]/90 text-center relative z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-zinc-500">
            © 2026 PHOTOBOOTH STUDIO • SEOUL EDITION
          </p>
          <p className="text-[11px] text-zinc-600">
            Crafted &amp; Directed by{' '}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-900 font-semibold underline underline-offset-4 hover:text-zinc-700 transition-colors"
            >
              Andi Handika
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
