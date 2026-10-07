'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Check, Sparkles, Timer, Wand2 } from 'lucide-react';
import {
  FRAME_THEMES,
  getActiveFrames,
  saveStoredFrames,
  FRAMES_UPDATED_EVENT,
  persistFrameTheme,
  slotsForLayout,
  type FrameTheme,
} from '@/lib/frames';

const STEPS = [
  { icon: <Sparkles size={13} />, label: 'Pick your frame' },
  { icon: <Camera size={13} />, label: 'Strike six poses' },
  { icon: <Wand2 size={13} />, label: 'Style & share' },
];

/** Miniature paper strip that previews how the chosen frame will print. */
function FramePreview({ theme }: { theme: FrameTheme }) {
  const layoutStr = theme.layout_type || theme.layout || 'strip4';
  const slots = slotsForLayout(layoutStr);
  const isGrid = layoutStr.includes('grid');
  const overlayUrl = theme.overlay_image_url || theme.frame_image_url;

  return (
    <div
      className="relative w-[104px] rounded-2xl p-2.5 pb-7 shadow-[0_10px_24px_rgba(26,26,26,0.10)] transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:scale-[1.06] overflow-hidden"
      style={{ backgroundColor: theme.paper || theme.bg_color || '#FDFBF7' }}
    >
      <div className={isGrid ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-1'}>
        {Array.from({ length: slots }).map((_, i) => (
          <div
            key={i}
            className="rounded-[3px]"
            style={{
              aspectRatio: isGrid ? '1 / 1' : '4 / 3',
              backgroundImage: `linear-gradient(140deg, ${theme.accent || '#D4C5A9'}, ${theme.wash || '#F5F0E8'})`,
              opacity: 0.55 + i * 0.09,
            }}
          />
        ))}
      </div>

      {overlayUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlayUrl}
          alt={theme.name}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      <span
        className="absolute inset-x-0 bottom-2 text-center font-['Caveat'] font-bold leading-none z-10"
        style={{ color: theme.ink || '#1A1A1A', fontSize: 12 }}
      >
        HaloLuna
      </span>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<FrameTheme[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Direct fetch from database on mount without relying on CanvasEditor cache
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    fetch('/api/frames', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && Array.isArray(data.frames) && data.frames.length > 0) {
          setThemes(data.frames);
          saveStoredFrames(data.frames);
        } else {
          setThemes(getActiveFrames());
        }
      })
      .catch((err) => {
        console.warn('[HaloLuna Homepage] Direct frame fetch fallback:', err);
        if (mounted) {
          setThemes(getActiveFrames());
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const handleUpdate = () => {
      if (mounted) {
        setThemes(getActiveFrames());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'haloluna:custom-frame-presets' && mounted) {
        setThemes(getActiveFrames());
      }
    };

    window.addEventListener(FRAMES_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener(FRAMES_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const selectedTheme = themes.find((theme) => theme.id === selectedId) ?? null;

  useEffect(() => {
    themes.forEach((theme) => router.prefetch(`/booth?frame=${theme.id}`));
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, [router, themes]);

  const chooseFrame = useCallback((themeId: string) => {
    setSelectedId(themeId);
    persistFrameTheme(themeId);
  }, []);

  const enterBooth = useCallback(
    (themeId: string) => {
      chooseFrame(themeId);
      setIsEntering(true);
      enterTimerRef.current = setTimeout(() => {
        router.push(`/booth?frame=${themeId}`);
      }, 280);
    },
    [chooseFrame, router]
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FDFBF7] text-zinc-900 relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#FBE6EE] blur-[110px] opacity-60" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-[#E6EEFB] blur-[120px] opacity-55" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[#F4EEDF] blur-[110px] opacity-70" />
      </div>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.12] z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #C4B99A 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      <header className="w-full border-b border-[#E8DFCE]/80 bg-[#FDFBF7]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-sm">
              <Camera size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-widest uppercase text-zinc-900 leading-none">
                  HaloLuna
                </h1>
                <span className="hidden sm:inline text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  gethaloluna.com
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                Korean Aesthetic Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
            <Timer size={12} className="text-amber-500" />
            <span className="hidden sm:inline font-semibold">2 MIN SESSION</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 relative z-10 flex-1 pb-36 sm:pb-32">
        <section className="pt-10 sm:pt-16 pb-8 sm:pb-12 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#E8DFCE] text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600 shadow-xs">
            <Sparkles size={11} className="text-amber-500" />
            Step 1 of 3 — Choose a frame
          </span>

          <h2 className="font-['Playfair_Display'] text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight mt-5 leading-[1.05]">
            HaloLuna
            <span className="block italic text-zinc-500">Studio</span>
          </h2>
          <p className="mt-3 font-['Caveat'] text-2xl sm:text-3xl font-bold text-rose-400 -rotate-1">
            pose pretty, print forever
          </p>

          <p className="mt-4 max-w-lg text-sm sm:text-base text-zinc-600 leading-relaxed px-2">
            Six shots, four keepers, one strip you&apos;ll actually print. Choose the frame
            you want to pose for and we&apos;ll set the studio up for you.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className="flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-white/70 border border-[#E8DFCE] text-[11px] font-semibold text-zinc-700 shadow-xs backdrop-blur-xs"
              >
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                  {step.icon}
                </span>
                <span>{step.label}</span>
                {i < STEPS.length - 1 && (
                  <span className="hidden sm:inline text-zinc-300 -mr-1.5">→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-5 pb-3 border-b border-[#E8DFCE]/80">
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">Today&apos;s frames</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tap a frame, then enter the booth. You can still restyle everything later.
              </p>
            </div>
            <span className="hidden sm:block text-[11px] font-mono text-zinc-400 shrink-0">
              {isLoading ? 'SYNCING FRAMES…' : `${themes.length} AVAILABLE`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto items-stretch">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="relative flex flex-col h-full w-full text-left rounded-3xl border border-[#E8DFCE] bg-white/70 backdrop-blur-xs p-5 overflow-hidden animate-pulse shadow-xs"
                >
                  <div className="w-20 h-4 bg-zinc-200/80 rounded-full mb-3" />

                  <div className="flex justify-center items-center h-[220px] sm:h-[240px] py-6">
                    <div className="w-[104px] h-[190px] rounded-2xl bg-zinc-200/60 p-2.5 pb-7 flex flex-col gap-1.5 shadow-inner">
                      <div className="w-full h-8 bg-zinc-300/70 rounded-[3px]" />
                      <div className="w-full h-8 bg-zinc-300/70 rounded-[3px]" />
                      <div className="w-full h-8 bg-zinc-300/70 rounded-[3px]" />
                      <div className="w-full h-8 bg-zinc-300/70 rounded-[3px]" />
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col min-h-[148px]">
                    <div className="w-36 h-5 bg-zinc-200/90 rounded-md mb-2" />
                    <div className="w-24 h-3 bg-zinc-200/70 rounded-md mb-3" />
                    <div className="w-full h-3 bg-zinc-200/60 rounded-md mb-1.5" />
                    <div className="w-4/5 h-3 bg-zinc-200/60 rounded-md mb-4" />

                    <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-[#E8DFCE]/80">
                      <div className="w-14 h-3.5 bg-zinc-200/80 rounded" />
                      <div className="w-16 h-3.5 bg-zinc-200/80 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              themes.map((theme) => {
                const isSelected = selectedId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => chooseFrame(theme.id)}
                    onDoubleClick={() => enterBooth(theme.id)}
                    aria-pressed={isSelected}
                    className={`group relative flex flex-col h-full w-full text-left rounded-3xl border bg-white/80 backdrop-blur-xs p-5 overflow-hidden transition-all duration-300 ease-out cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 shadow-[0_16px_38px_rgba(26,26,26,0.15)] -translate-y-1 ring-2 ring-zinc-900/10'
                        : 'border-[#E8DFCE] shadow-xs hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_14px_32px_rgba(26,26,26,0.10)]'
                    }`}
                  >
                    <div
                      className="absolute -top-16 -right-12 w-44 h-44 rounded-full blur-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ backgroundColor: theme.wash || '#F5F0E8' }}
                    />

                    {theme.badge && (
                      <span className="absolute top-4 left-4 z-10 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {theme.badge}
                      </span>
                    )}

                    <span
                      className={`absolute top-4 right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? 'bg-zinc-900 text-white scale-100 shadow-md'
                          : 'bg-white/90 text-zinc-300 border border-zinc-200 scale-90 group-hover:text-zinc-500'
                      }`}
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>

                    <div className="relative z-[1] flex justify-center items-center h-[220px] sm:h-[240px] py-6">
                      <FramePreview theme={theme} />
                    </div>

                    <div className="relative z-[1] mt-auto flex flex-col min-h-[148px]">
                      <div className="flex items-center gap-2">
                        {theme.emoji ? (
                          <span className="text-base leading-none">{theme.emoji}</span>
                        ) : (
                          <Sparkles size={15} className="text-amber-500 shrink-0" />
                        )}
                        <h4 className="font-bold tracking-tight text-[15px]">{theme.name}</h4>
                      </div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mt-1">
                        {theme.tagline || theme.category || 'Custom Frame'}
                      </p>
                      <p className="text-xs text-zinc-600 leading-relaxed mt-2.5 min-h-[2.5rem]">
                        {theme.description || `${theme.name} frame preset ready for your photo strip.`}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#E8DFCE]/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          {slotsForLayout(theme.layout_type || theme.layout || 'strip4')} cuts
                        </span>
                        <span
                          className={`flex items-center gap-1 text-[11px] font-bold transition-all duration-300 ${
                            isSelected
                              ? 'text-zinc-900'
                              : 'text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Choose'}
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-[#E8DFCE] py-5 px-4 bg-[#FDFBF7]/90 text-center relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
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

      <div
        className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 transition-all duration-500 ease-out ${
          selectedTheme
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3 rounded-3xl border border-[#E8DFCE] bg-white/90 backdrop-blur-lg shadow-[0_-4px_32px_rgba(26,26,26,0.12)] p-3 pl-4">
          <span
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: selectedTheme?.wash ?? '#F3EEE4' }}
          >
            {selectedTheme?.emoji ? (
              selectedTheme.emoji
            ) : (
              <Camera size={18} className="text-zinc-800" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Your frame
            </p>
            <p className="text-sm font-bold tracking-tight truncate">{selectedTheme?.name}</p>
          </div>
          <button
            type="button"
            onClick={() => selectedTheme && enterBooth(selectedTheme.id)}
            disabled={!selectedTheme || isEntering}
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 text-white px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-widest shadow-md transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60 shrink-0"
          >
            <Camera size={14} />
            <span>{isEntering ? 'Opening…' : 'Enter booth'}</span>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 bg-[#FDFBF7] flex items-center justify-center transition-opacity duration-300 ${
          isEntering ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Camera size={22} className="text-zinc-900 animate-pulse" />
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-500">
            Warming up the studio
          </p>
        </div>
      </div>
    </div>
  );
}
