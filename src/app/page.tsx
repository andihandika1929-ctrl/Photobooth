'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  Camera,
  Users,
  LayoutGrid,
  ArrowRight,
  Copy,
  Share2,
  Check,
  CheckCircle2,
  Palette,
  Sparkles,
  Heart,
  HeartHandshake,
  BookOpen,
  Plane,
  Utensils,
  Leaf,
  Snowflake,
  Coffee,
  Lock,
  Cake,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  THEME_CATEGORIES,
  ALL_THEMES,
  getThemesForCategory,
  getCategoriesForLayout,
  type PhotoboothLayoutId,
  type FrameTheme as PBFrameTheme,
} from '@/lib/photobooth-themes';

interface BoothTheme {
  id: string;
  name: string;
  subtitle: string;
  swatchClass?: string;
  swatchStyle?: React.CSSProperties;
  stripClass: string;
  frameFilter?: string;
  frames: readonly string[];
}

// 5 Booth Themes for HaloLuna Photobooth
const BOOTH_THEMES: readonly BoothTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    subtitle: 'clean & bright',
    swatchClass: 'bg-[#fbfaf8]',
    swatchStyle: {
      backgroundImage: `radial-gradient(90% 70% at 15% 10%, #ffe3ec 0%, transparent 70%),
                        radial-gradient(90% 70% at 90% 95%, #dceaff 0%, transparent 70%)`,
    },
    stripClass: 'bg-white shadow-md -rotate-6',
    frames: [
      '/assets/photos/catA_1.jpg',
      '/assets/photos/catA_2.jpg',
      '/assets/photos/catA_3.jpg',
      '/assets/photos/catA_4.jpg',
    ],
  },
  {
    id: 'birthday',
    name: 'Birthday',
    subtitle: 'party booth',
    swatchClass: 'bg-cover bg-center',
    swatchStyle: {
      backgroundImage: `url('/assets/rooms/wall.webp')`,
      backgroundColor: '#ffe3ec',
    },
    stripClass: 'bg-[#ffe1ec] shadow-md rotate-6',
    frames: [
      '/assets/photos/catA_1.jpg',
      '/assets/photos/catA_2.jpg',
      '/assets/photos/catA_3.jpg',
      '/assets/photos/catA_4.jpg',
    ],
  },
  {
    id: 'vintage',
    name: 'Vintage',
    subtitle: '1930s photo automat',
    swatchClass: 'bg-cover bg-center',
    swatchStyle: {
      backgroundImage: `url('/assets/rooms/curtain.webp')`,
      backgroundColor: '#6b4a3a',
    },
    stripClass: 'bg-[#efe3c4] shadow-lg rotate-6',
    frameFilter: 'sepia(0.6) contrast(1.1)',
    frames: [
      '/assets/photos/catA_1.jpg',
      '/assets/photos/catA_2.jpg',
      '/assets/photos/catA_3.jpg',
      '/assets/photos/catA_4.jpg',
    ],
  },
  {
    id: 'meme',
    name: 'Meme',
    subtitle: 'recreate the classics',
    swatchClass: '',
    swatchStyle: {
      backgroundImage: `radial-gradient(rgba(255, 176, 50, 0.35) 1.5px, transparent 1.6px),
                        linear-gradient(160deg, #fff6d6, #ffe3ec)`,
      backgroundSize: '14px 14px, 100% 100%',
    },
    stripClass: 'bg-white shadow-md -rotate-3',
    frames: [
      '/assets/meme/spiderman.webp',
      '/assets/meme/distracted.webp',
      '/assets/meme/handshake.webp',
      '/assets/meme/buzz-woody.webp',
    ],
  },
  {
    id: 'namsan',
    name: 'Namsan',
    subtitle: 'dinner at the tower',
    swatchClass: 'bg-cover bg-center',
    swatchStyle: {
      backgroundImage: `linear-gradient(180deg, rgba(20, 26, 52, 0.2), rgba(20, 26, 52, 0.45)), url('/assets/rooms/night.webp')`,
      backgroundColor: '#1c2546',
    },
    stripClass: 'bg-[#1c2546] shadow-xl rotate-4',
    frames: [
      '/assets/photos/catA_1.jpg',
      '/assets/photos/catA_2.jpg',
      '/assets/photos/catA_3.jpg',
      '/assets/photos/catA_4.jpg',
    ],
  },
];

// 4 Photo Size Layouts extracted directly from Angie "Pick a size"
const LAYOUT_SIZES = [
  {
    id: 'strip4',
    label: '4 cut',
    desc: 'the classic strip',
  },
  {
    id: 'grid2x2',
    label: '2 × 2',
    desc: 'four, on a card',
  },
  {
    id: 'strip2',
    label: '2 cut',
    desc: 'two big photos',
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    desc: 'one shot',
  },
] as const;

const getLayoutId = (layout: string): PhotoboothLayoutId => {
  if (layout === '2 × 2') return 'grid';
  if (layout === '2 cut') return 'duo';
  if (layout === 'Polaroid') return 'polaroid';
  return 'vertical';
};

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Palette':
      return Palette;
    case 'Sparkles':
      return Sparkles;
    case 'Heart':
      return Heart;
    case 'Coffee':
      return Coffee;
    case 'BookOpen':
      return BookOpen;
    case 'LayoutGrid':
      return LayoutGrid;
    case 'Plane':
      return Plane;
    case 'Utensils':
      return Utensils;
    case 'Leaf':
      return Leaf;
    case 'Snowflake':
      return Snowflake;
    case 'Lock':
      return Lock;
    case 'Cake':
      return Cake;
    default:
      return Sparkles;
  }
};

function AngiePhotoboothContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation steps: 'home' | 'pick-booth' | 'share-code' | 'name' | 'pick-size' | 'pick-frame' | 'join'
  const [step, setStep] = useState<
    'home' | 'pick-booth' | 'share-code' | 'name' | 'pick-size' | 'pick-frame' | 'join'
  >('home');

  const [selectedBooth, setSelectedBooth] = useState<string>('classic');
  const [selectedLayout, setSelectedLayout] = useState<string>('4 cut');
  const [selectedCategory, setSelectedCategory] = useState<string>('simple');
  const [selectedFrame, setSelectedFrame] = useState<string>('black');
  const [roomCode, setRoomCode] = useState<string>('HCDGG');
  const [isSolo, setIsSolo] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [partnerJoined, setPartnerJoined] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('');

  // Join code input (5 separate characters)
  const [joinCodeDigits, setJoinCodeDigits] = useState<string[]>(['', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check URL query parameters (e.g. ?room=CODE or ?join=CODE)
  useEffect(() => {
    const paramRoom =
      searchParams.get('room') || searchParams.get('code') || searchParams.get('join');
    if (paramRoom) {
      const clean = paramRoom.toUpperCase().trim().slice(0, 5);
      setRoomCode(clean);
      setIsSolo(false);
      setStep('name');
    }
  }, [searchParams]);

  // Generate unique 5-letter code on mount if not provided via URL
  useEffect(() => {
    const paramRoom =
      searchParams.get('room') || searchParams.get('code') || searchParams.get('join');
    if (!paramRoom) {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
      }
      setRoomCode(code);
    }
  }, [searchParams]);

  // Synchronize category and frame when layout changes
  useEffect(() => {
    const layoutId = getLayoutId(selectedLayout);
    const validThemes = getThemesForCategory(selectedCategory, layoutId);
    if (validThemes.length === 0) {
      setSelectedCategory('simple');
      setSelectedFrame('black');
    } else if (!validThemes.some((t) => t.id === selectedFrame)) {
      setSelectedFrame(validThemes[0].id);
    }
  }, [selectedLayout, selectedCategory, selectedFrame]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Realtime Supabase Presence & Signal Listener for Multiplayer Room Sync
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode || isSolo || !supabase) return;
    const cleanCode = roomCode.toUpperCase().trim();
    if (cleanCode.length !== 5) return;

    const myId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('pb_participant_id') ||
          (() => {
            const id = 'host_' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem('pb_participant_id', id);
            return id;
          })()
        : 'host';

    const channelName = `photobooth:room:${cleanCode}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: myId },
      },
    });

    const triggerPartnerJoined = (name?: string) => {
      setPartnerJoined(true);
      if (name) setPartnerName(name);

      // Automatically advance from share-code screen when partner joins
      setStep((currentStep) => {
        if (currentStep === 'share-code') {
          setTimeout(() => {
            setStep((s) => (s === 'share-code' ? 'name' : s));
          }, 800);
        }
        return currentStep;
      });
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ id: string; name?: string; role?: string }>();
        const all: { id: string; name?: string; role?: string }[] = [];
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p && p.id && p.id !== myId) all.push(p);
          });
        });
        if (all.length > 0) {
          triggerPartnerJoined(all[0].name);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const joined = (newPresences as unknown as { id: string; name?: string }[]).find((p) => p.id !== myId);
        if (joined) {
          triggerPartnerJoined(joined.name);
        }
      })
      .on('broadcast', { event: 'signal' }, (payload) => {
        // Any incoming signal confirms partner presence
        if (payload?.payload?.type) {
          triggerPartnerJoined();
        }
      })
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (payload?.payload?.action?.type === 'LAYOUT_CHANGE') {
          setSelectedLayout(payload.payload.action.layout);
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: myId,
          name: userName.trim() || 'Host',
          role: 'host',
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [roomCode, isSolo, userName]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/booth?room=${roomCode}&role=guest`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/booth?room=${roomCode}&role=guest`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HaloLuna Photobooth',
          text: `Join my photobooth room with code ${roomCode}!`,
          url,
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  const handleNextToBooth = () => {
    let layoutParam = 'strip4';
    if (selectedLayout === '2 × 2') layoutParam = 'grid2x2';
    else if (selectedLayout === '2 cut') layoutParam = 'strip2';
    else if (selectedLayout === 'Polaroid') layoutParam = 'polaroid';

    const roleParam = isSolo ? 'solo' : 'host';
    router.push(
      `/booth?room=${roomCode}&theme=${selectedBooth}&frame=${selectedFrame}&layout=${layoutParam}&name=${encodeURIComponent(
        userName.trim() || (isSolo ? 'Player' : 'Host')
      )}&role=${roleParam}`
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PICK A BOOTH (Step 2)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'pick-booth') {
    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col px-4 sm:px-8 py-8 sm:py-12">
        <header className="max-w-6xl mx-auto w-full mb-6">
          <button
            type="button"
            onClick={() => setStep('home')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </header>

        <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900 mb-2.5">
              Pick a booth
            </h1>
            <p className="text-sm sm:text-base text-neutral-500 max-w-lg mx-auto">
              Every booth has its own look. Your partner gets the same one.
            </p>
          </div>

          {/* 5 Booth Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4.5 w-full max-w-5xl">
            {BOOTH_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setSelectedBooth(theme.id);
                  if (isSolo) {
                    setStep('name');
                  } else {
                    setStep('share-code');
                  }
                }}
                className="group relative flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-2 text-left shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-pink-500"
              >
                {/* Poster Swatch with vertical photostrip preview */}
                <div
                  className={`w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden relative ${theme.swatchClass}`}
                  style={theme.swatchStyle}
                >
                  {/* Miniature Photostrip */}
                  <div
                    className={`w-[36%] h-[84%] flex flex-col gap-1 p-1 pb-2.5 rounded-[2px] transition-transform duration-300 group-hover:scale-105 ${theme.stripClass}`}
                  >
                    {theme.frames.map((src, i) => (
                      <div
                        key={i}
                        className="flex-1 min-h-0 w-full rounded-[1px] bg-neutral-200 overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: theme.frameFilter || 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Caption Text & Go Arrow */}
                <div className="pt-3 pb-1 px-1 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold text-sm sm:text-base text-neutral-900 tracking-tight truncate">
                      {theme.name}
                    </p>
                    <p className="text-[11px] sm:text-xs text-neutral-500 truncate mt-0.5">
                      {theme.subtitle}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#18181B] text-white flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform shadow-xs">
                    <ArrowRight size={13} strokeWidth={2.5} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SEND THIS CODE TO YOUR PARTNER (Step 3)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'share-code') {
    const codeChars = roomCode.padEnd(5, ' ').split('').slice(0, 5);

    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col px-4 sm:px-8 py-8 sm:py-12">
        <header className="max-w-4xl mx-auto w-full mb-6">
          <button
            type="button"
            onClick={() => setStep('pick-booth')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </header>

        <main className="max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-2">
            Send this code to your partner
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            They type it in, or open your link.
          </p>

          {/* White Card Container */}
          <div className="w-full bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-10 shadow-xs flex flex-col items-center">
            {/* 5 Separate Black Code Boxes */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
              {codeChars.map((char, i) => (
                <div
                  key={i}
                  className="w-13 h-16 sm:w-16 sm:h-20 rounded-2xl bg-[#18181B] text-white flex items-center justify-center font-mono text-3xl sm:text-4xl font-black tracking-wider shadow-sm select-all"
                >
                  {char}
                </div>
              ))}
            </div>

            {/* Action Buttons: Copy link & Share */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-bold text-neutral-800 shadow-xs active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-neutral-500" />
                    <span>Copy link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-bold text-neutral-800 shadow-xs active:scale-95 transition-all"
              >
                <Share2 size={14} className="text-neutral-500" />
                <span>Share</span>
              </button>
            </div>

            {/* Waiting or Partner Joined Status */}
            {partnerJoined ? (
              <div className="flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 animate-pulse shadow-xs">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Partner {partnerName ? `(${partnerName}) ` : ''}joined! Moving to next step...</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('name')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Enter your name</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextToBooth}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Jump directly to Booth</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-pink-500 shrink-0 inline-block animate-pulse" />
                <span>Waiting for your partner...</span>
              </div>
            )}
          </div>

          {/* Fallback: Take photos alone instead */}
          <button
            type="button"
            onClick={() => {
              setIsSolo(true);
              setStep('name');
            }}
            className="mt-7 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Take photos alone instead
          </button>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. WHAT'S YOUR NAME? (Step 4)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'name') {
    const isReady = userName.trim().length > 0;

    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col justify-between px-4 sm:px-8 py-8 sm:py-12 relative">
        <header className="max-w-4xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setStep(isSolo ? 'pick-booth' : 'share-code')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </header>

        <main className="max-w-md mx-auto w-full flex-1 flex flex-col items-center justify-center text-center my-auto">
          {partnerJoined && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-4 shadow-xs">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Partner {partnerName ? `(${partnerName}) ` : ''}is in the room!</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900 mb-2">
            What&apos;s your name?
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            It goes on your cursor.
          </p>

          {/* Large Name Input Box */}
          <div className="w-full">
            <input
              type="text"
              autoFocus
              maxLength={20}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isReady) {
                  setStep('pick-size');
                }
              }}
              placeholder="Your name"
              className="w-full rounded-2xl border border-neutral-200/90 bg-white px-6 py-4 text-center text-xl sm:text-2xl font-bold text-neutral-900 shadow-sm focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-100 placeholder:text-neutral-300 transition-all"
            />
          </div>
        </main>

        {/* Floating Bottom Bar: Type your name first on left, Ready on right */}
        <footer className="w-full flex items-center justify-center pb-4 sm:pb-6">
          <div className="inline-flex items-center gap-4 bg-white/95 backdrop-blur-sm border border-neutral-200/80 rounded-2xl p-1.5 pl-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-400">
              {!isReady ? 'Type your name first' : `Hi, ${userName}!`}
            </span>

            <button
              type="button"
              disabled={!isReady}
              onClick={() => setStep('pick-size')}
              className={`rounded-xl px-7 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                isReady
                  ? 'bg-[#18181B] hover:bg-neutral-800 text-white cursor-pointer shadow-sm'
                  : 'bg-[#8E8E93] text-white cursor-not-allowed opacity-75'
              }`}
            >
              Ready
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PICK A SIZE (Step 5 - Grid & Layout Selection)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'pick-size') {
    const handleNextToBooth = () => {
      // Map layout ID to booth layout parameter
      let layoutParam = 'strip4';
      if (selectedLayout === '2 × 2') layoutParam = 'grid2x2';
      else if (selectedLayout === '2 cut') layoutParam = 'strip2';
      else if (selectedLayout === 'Polaroid') layoutParam = 'polaroid';

      const roleParam = isSolo ? 'solo' : 'host';
      router.push(
        `/booth?room=${roomCode}&theme=${selectedBooth}&layout=${layoutParam}&name=${encodeURIComponent(
          userName
        )}&role=${roleParam}`
      );
    };

    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col justify-between px-4 sm:px-8 py-8 sm:py-12">
        <header className="max-w-5xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setStep('name')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group mb-6"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>

          {/* Dotted Step Progress Bar: Frame -> Shoot -> Pick -> Style -> Done */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-5 py-2">
            {[
              { id: 'frame', label: 'Frame', active: true },
              { id: 'shoot', label: 'Shoot', active: false },
              { id: 'pick', label: 'Pick', active: false },
              { id: 'style', label: 'Style', active: false },
              { id: 'done', label: 'Done', active: false },
            ].map((s, idx, arr) => (
              <div key={s.id} className="flex items-center gap-2.5 sm:gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      s.active
                        ? 'border-2 border-pink-400 bg-white ring-2 ring-pink-100'
                        : 'border border-neutral-300 bg-neutral-100'
                    }`}
                  >
                    {s.active && <span className="w-2 h-2 rounded-full bg-pink-500" />}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                      s.active ? 'text-neutral-900' : 'text-neutral-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex items-center text-neutral-300 -mt-4 text-[10px] tracking-widest select-none">
                    <span>››››</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </header>

        <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center my-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900 mb-2">
              Pick a size
            </h1>
            <p className="text-sm text-neutral-500">
              Tap one. Either of you can choose.
            </p>
          </div>

          {/* 4 Layout Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {LAYOUT_SIZES.map((item) => {
              const isSelected = selectedLayout === item.label;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedLayout(item.label)}
                  className={`relative flex flex-col items-center justify-between rounded-2xl p-6 sm:p-8 text-center bg-white transition-all duration-200 cursor-pointer min-h-[300px] ${
                    isSelected
                      ? 'border-2 border-pink-400 shadow-md ring-2 ring-pink-100'
                      : 'border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  {/* Visual Layout Motifs matching Angie screenshot */}
                  <div className="flex-1 w-full flex items-center justify-center my-auto py-2">
                    {item.id === 'strip4' && (
                      <div className="w-[84px] bg-[#17181C] p-[10px] rounded-[4px] grid grid-cols-1 gap-[8px] shadow-xs">
                        <div className="w-full aspect-square bg-white rounded-[2px]" />
                        <div className="w-full aspect-square bg-white rounded-[2px]" />
                        <div className="w-full aspect-square bg-white rounded-[2px]" />
                        <div className="w-full aspect-square bg-white rounded-[2px]" />
                      </div>
                    )}

                    {item.id === 'grid2x2' && (
                      <div className="w-[184px] max-w-[92%] bg-[#17181C] p-[10px] rounded-[4px] grid grid-cols-2 gap-[8px] shadow-xs">
                        <div className="w-full aspect-[1.85/1] bg-white rounded-[2px]" />
                        <div className="w-full aspect-[1.85/1] bg-white rounded-[2px]" />
                        <div className="w-full aspect-[1.85/1] bg-white rounded-[2px]" />
                        <div className="w-full aspect-[1.85/1] bg-white rounded-[2px]" />
                      </div>
                    )}

                    {item.id === 'strip2' && (
                      <div className="w-[128px] max-w-[92%] bg-[#17181C] p-[10px] rounded-[4px] grid grid-cols-1 gap-[8px] shadow-xs">
                        <div className="w-full aspect-[1.5/1] bg-white rounded-[2px]" />
                        <div className="w-full aspect-[1.5/1] bg-white rounded-[2px]" />
                      </div>
                    )}

                    {item.id === 'polaroid' && (
                      <div className="w-[116px] max-w-[92%] bg-[#17181C] p-[10px] pb-[34px] rounded-[4px] grid grid-cols-1 shadow-xs">
                        <div className="w-full aspect-square bg-white rounded-[2px]" />
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="mt-4">
                    <p className="font-extrabold text-base text-neutral-900 tracking-tight">
                      {item.label}
                    </p>
                    <p
                      className={`text-xs mt-1 transition-colors ${
                        isSelected ? 'text-pink-600 font-semibold' : 'text-neutral-500'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {/* Bottom Bar: Next Button */}
        <footer className="max-w-md mx-auto w-full flex items-center justify-center pt-6">
          <button
            type="button"
            onClick={() => setStep('pick-frame')}
            className="w-full max-w-xs rounded-full bg-[#18181B] hover:bg-neutral-800 text-white font-bold py-3.5 px-16 text-base shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Next
          </button>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PICK A FRAME (Step 5b - Frame Theme & Dynamic Grid Adaptation)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'pick-frame') {
    const layoutId = getLayoutId(selectedLayout);
    const availableCategories = getCategoriesForLayout(layoutId);
    const activeCategory = availableCategories.some((c) => c.id === selectedCategory)
      ? selectedCategory
      : availableCategories[0]?.id || 'simple';
    const framesToShow = getThemesForCategory(activeCategory, layoutId);

    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col justify-between px-4 sm:px-8 py-8 sm:py-12">
        <header className="max-w-6xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setStep('pick-size')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group mb-6 cursor-pointer"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-5 py-2">
            {[
              { id: 'frame', label: 'Frame', active: true },
              { id: 'shoot', label: 'Shoot', active: false },
              { id: 'pick', label: 'Pick', active: false },
              { id: 'style', label: 'Style', active: false },
              { id: 'done', label: 'Done', active: false },
            ].map((s, idx, arr) => (
              <div key={s.id} className="flex items-center gap-2.5 sm:gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      s.active
                        ? 'border-2 border-pink-400 bg-white ring-2 ring-pink-100'
                        : 'border border-neutral-300 bg-neutral-100'
                    }`}
                  >
                    {s.active && <span className="w-2 h-2 rounded-full bg-pink-500" />}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                      s.active ? 'text-neutral-900' : 'text-neutral-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex items-center text-neutral-300 -mt-4 text-[10px] tracking-widest select-none">
                    <span>››››</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </header>

        <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col items-center my-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900 mb-2">
              Pick a frame
            </h1>
            <p className="text-sm text-neutral-500">
              Your photos go in the white boxes.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="w-full max-w-4xl flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mb-8">
            {availableCategories.map((cat) => {
              const IconComp = getCategoryIcon(cat.iconName);
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    const catThemes = getThemesForCategory(cat.id, layoutId);
                    if (catThemes.length > 0 && !catThemes.some((t) => t.id === selectedFrame)) {
                      setSelectedFrame(catThemes[0].id);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isActive
                      ? 'bg-[#18181B] text-white shadow-sm'
                      : cat.isCozy
                      ? 'bg-white border border-pink-300 text-neutral-800 hover:border-pink-400'
                      : 'bg-white border border-neutral-200/80 hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <IconComp size={13} className={isActive ? 'text-white' : 'text-neutral-500'} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] ml-0.5 ${
                      isActive ? 'text-neutral-300' : 'text-neutral-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                  {cat.isNew && (
                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-pink-100 text-pink-600 ml-0.5">
                      NEW
                    </span>
                  )}
                  {cat.isCozy && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Dynamic Frame Cards Gallery (Adapts to selectedLayout!) */}
          <div
            className={`w-full grid gap-3 sm:gap-4 ${
              layoutId === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-4xl'
                : layoutId === 'duo' || layoutId === 'polaroid'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-5xl'
                : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7 max-w-6xl'
            }`}
          >
            {framesToShow.map((frame) => {
              const isSelected = selectedFrame === frame.id;
              const hasArt = !!frame.img && !!frame.img[layoutId];
              const artUrl = hasArt ? frame.img![layoutId] : undefined;

              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => setSelectedFrame(frame.id)}
                  className={`group relative flex flex-col items-center justify-between rounded-xl p-3 sm:p-4 text-center bg-white transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-pink-500 shadow-md ring-2 ring-pink-100'
                      : 'border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  {/* Container for Frame Strip Graphic */}
                  <div className="h-52 sm:h-56 w-full flex items-center justify-center mb-3">
                    {/* 1. If vertical (4 cut) */}
                    {layoutId === 'vertical' && (
                      <div
                        className="w-16 sm:w-18 aspect-[1/3] rounded-[3px] p-[6%] pb-[8%] flex flex-col gap-[5%] shadow-xs transition-transform duration-200 group-hover:scale-105"
                        style={{
                          backgroundColor: frame.bg,
                          backgroundImage: artUrl ? `url('${artUrl}')` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: frame.border ? '1px solid #e4e4e7' : undefined,
                        }}
                      >
                        {!hasArt && (
                          <>
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="flex-1 w-full rounded-[1px]"
                                style={{ backgroundColor: frame.slot }}
                              />
                            ))}
                            <div
                              className="w-full h-[4%] min-h-[2px]"
                              style={{ backgroundColor: frame.sub || 'rgba(0,0,0,0.1)' }}
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* 2. If grid (2 × 2) */}
                    {layoutId === 'grid' && (
                      <div
                        className="w-28 sm:w-32 aspect-[3/2] rounded-[3px] p-[6%] pb-[7%] grid grid-cols-2 gap-[5%] shadow-xs transition-transform duration-200 group-hover:scale-105"
                        style={{
                          backgroundColor: frame.bg,
                          backgroundImage: artUrl ? `url('${artUrl}')` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: frame.border ? '1px solid #e4e4e7' : undefined,
                        }}
                      >
                        {!hasArt && (
                          <>
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="w-full aspect-[1.85/1] rounded-[1px]"
                                style={{ backgroundColor: frame.slot }}
                              />
                            ))}
                            <div
                              className="col-span-2 w-full h-[4%] min-h-[2px]"
                              style={{ backgroundColor: frame.sub || 'rgba(0,0,0,0.1)' }}
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* 3. If duo (2 cut) */}
                    {layoutId === 'duo' && (
                      <div
                        className="w-20 sm:w-22 aspect-[2/3] rounded-[3px] p-[6%] pb-[8%] flex flex-col gap-[6%] shadow-xs transition-transform duration-200 group-hover:scale-105"
                        style={{
                          backgroundColor: frame.bg,
                          backgroundImage: artUrl ? `url('${artUrl}')` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: frame.border ? '1px solid #e4e4e7' : undefined,
                        }}
                      >
                        {!hasArt && (
                          <>
                            {[0, 1].map((i) => (
                              <div
                                key={i}
                                className="flex-1 w-full rounded-[1px]"
                                style={{ backgroundColor: frame.slot }}
                              />
                            ))}
                            <div
                              className="w-full h-[4%] min-h-[2px]"
                              style={{ backgroundColor: frame.sub || 'rgba(0,0,0,0.1)' }}
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* 4. If polaroid */}
                    {layoutId === 'polaroid' && (
                      <div
                        className="w-22 sm:w-26 aspect-[3.5/4.25] rounded-[3px] p-[6%_6%_22%] flex flex-col shadow-xs transition-transform duration-200 group-hover:scale-105"
                        style={{
                          backgroundColor: frame.bg,
                          backgroundImage: artUrl ? `url('${artUrl}')` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: frame.border ? '1px solid #e4e4e7' : undefined,
                        }}
                      >
                        {!hasArt && (
                          <div
                            className="w-full aspect-square rounded-[1px]"
                            style={{ backgroundColor: frame.slot }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <p className="font-extrabold text-xs text-neutral-800 tracking-tight capitalize">
                    {frame.label}
                  </p>
                </button>
              );
            })}
          </div>
        </main>

        {/* Bottom Bar: Next Button */}
        <footer className="max-w-md mx-auto w-full flex items-center justify-center pt-6">
          <button
            type="button"
            onClick={handleNextToBooth}
            className="w-full max-w-xs rounded-full bg-[#18181B] hover:bg-neutral-800 text-white font-bold py-3.5 px-16 text-base shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Next
          </button>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. JOIN WITH 5-DIGIT CODE (Step: Join)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'join') {
    const handleDigitChange = (index: number, val: string) => {
      const char = val.toUpperCase().slice(-1);
      const nextDigits = [...joinCodeDigits];
      nextDigits[index] = char;
      setJoinCodeDigits(nextDigits);

      if (char && index < 4) {
        digitInputRefs.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !joinCodeDigits[index] && index > 0) {
        digitInputRefs.current[index - 1]?.focus();
      }
    };

    const enteredCode = joinCodeDigits.join('');
    const isJoinReady = enteredCode.length === 5;

    const handleProceedJoin = () => {
      setRoomCode(enteredCode);
      setIsSolo(false);
      setStep('name');
    };

    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col px-4 sm:px-8 py-8 sm:py-12">
        <header className="max-w-4xl mx-auto w-full mb-6">
          <button
            type="button"
            onClick={() => setStep('home')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f43f5e] hover:text-rose-600 transition-colors group"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </header>

        <main className="max-w-md mx-auto w-full flex-1 flex flex-col items-center justify-center text-center my-auto">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-2">
            Enter room code
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Type the 5-character code from your partner.
          </p>

          {/* 5 Digit Input Boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
            {joinCodeDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  digitInputRefs.current[i] = el;
                }}
                type="text"
                autoFocus={i === 0}
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-13 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 border-neutral-300 focus:border-pink-500 bg-white text-center font-mono text-3xl sm:text-4xl font-black text-neutral-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-100 transition-all uppercase"
              />
            ))}
          </div>

          <button
            type="button"
            disabled={!isJoinReady}
            onClick={handleProceedJoin}
            className={`w-full max-w-xs rounded-full py-3.5 px-8 text-sm font-bold shadow-md transition-all active:scale-95 ${
              isJoinReady
                ? 'bg-[#18181B] hover:bg-neutral-800 text-white cursor-pointer'
                : 'bg-neutral-300 text-white cursor-not-allowed opacity-70'
            }`}
          >
            Join room
          </button>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 0. HOME SCREEN (Angie Photobooth Front Page)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#FAF9F5] text-neutral-900 flex flex-col justify-center items-center px-4 sm:px-8 py-10 lg:py-16 selection:bg-pink-100 selection:text-pink-600">
      <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* LEFT COLUMN: Hero, Actions, & Game Modes */}
        <section className="lg:col-span-7 flex flex-col items-start max-w-xl mx-auto lg:mx-0 w-full">
          {/* Step / Category Indicator */}
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold tracking-widest text-neutral-500 uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Step 1 of 3 — Choose a frame</span>
          </div>

          {/* Large Hero Title: HaloLuna Studio */}
          <h1 className="text-5xl sm:text-6xl tracking-tight text-neutral-900 leading-[1.05] mb-2 font-serif font-bold">
            <span className="block">HaloLuna</span>
            <span className="block italic font-normal text-neutral-600 font-serif">Studio</span>
          </h1>

          {/* Cursive Subtitle */}
          <p className="font-['Caveat',cursive] text-2xl sm:text-3xl text-[#f43f5e] font-bold tracking-wide mb-3 -rotate-1">
            pose pretty, print forever
          </p>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base text-neutral-600 font-normal leading-relaxed max-w-md mb-5">
            Six shots, four keepers, one strip you&apos;ll actually print. Choose the frame you want to pose for and we&apos;ll set the studio up for you.
          </p>

          {/* 3 Aesthetic Micro-Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-neutral-200/90 text-neutral-700 text-xs font-medium shadow-2xs">
              <Sparkles size={12} className="text-neutral-500" />
              <span>Pick your frame</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-neutral-200/90 text-neutral-700 text-xs font-medium shadow-2xs">
              <Camera size={12} className="text-neutral-500" />
              <span>Strike six poses</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-neutral-200/90 text-neutral-700 text-xs font-medium shadow-2xs">
              <Palette size={12} className="text-neutral-500" />
              <span>Style & share</span>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="w-full max-w-md space-y-3">
            {/* Primary: Start a room */}
            <button
              type="button"
              onClick={() => {
                setIsSolo(false);
                setStep('pick-booth');
              }}
              className="w-full bg-[#18181B] hover:bg-neutral-800 text-white rounded-2xl p-4 sm:p-4.5 px-6 flex items-center justify-between shadow-md transition-all duration-200 group cursor-pointer active:scale-[0.99]"
            >
              <span className="font-bold text-base text-white flex items-center gap-2">
                Start a room
              </span>
              <span className="text-xs sm:text-sm text-neutral-400 font-medium group-hover:text-neutral-300 transition-colors">
                with your partner
              </span>
            </button>

            {/* Secondary: Join a room */}
            <button
              type="button"
              onClick={() => {
                setStep('join');
              }}
              className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-900 rounded-2xl p-4 sm:p-4.5 px-6 flex items-center justify-between shadow-xs transition-all duration-200 group cursor-pointer active:scale-[0.99]"
            >
              <span className="font-bold text-base text-neutral-900 flex items-center gap-2">
                Join a room
              </span>
              <span className="text-xs sm:text-sm text-neutral-400 font-medium group-hover:text-neutral-600 transition-colors">
                with a code
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-full max-w-md my-8 flex items-center justify-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              — Other ways to play —
            </span>
          </div>

          {/* 3 Pastel Cards (Other ways to play) - Using Lucide React Icons Exclusively */}
          <div className="w-full max-w-md grid grid-cols-3 gap-3.5">
            {/* Card 1: Just me */}
            <button
              type="button"
              onClick={() => {
                setIsSolo(true);
                setStep('pick-booth');
              }}
              className="bg-[#FDF2F4] hover:bg-[#FCE7EC] border border-[#FCD9E2] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square group shadow-xs hover:-translate-y-1 hover:shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                <Camera size={22} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-bold text-neutral-800 tracking-tight">
                Just me
              </span>
            </button>

            {/* Card 2: Friends, one camera */}
            <button
              type="button"
              onClick={() => {
                setIsSolo(true);
                setSelectedBooth('meme');
                setStep('pick-booth');
              }}
              className="bg-[#F0F7FF] hover:bg-[#E4F0FF] border border-[#D3E5FD] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square group shadow-xs hover:-translate-y-1 hover:shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-500 mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                <Users size={22} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-neutral-800 leading-tight tracking-tight">
                Friends, one camera
              </span>
            </button>

            {/* Card 3: Group of 4 */}
            <button
              type="button"
              onClick={() => {
                setIsSolo(false);
                setSelectedLayout('2 × 2');
                setStep('pick-booth');
              }}
              className="bg-[#F5F2FD] hover:bg-[#EDE8FB] border border-[#E0D7F8] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square group shadow-xs hover:-translate-y-1 hover:shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500 mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                <LayoutGrid size={22} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-bold text-neutral-800 tracking-tight">
                Group of 4
              </span>
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: Angie Dispenser Lip & Vertical Life4Cuts Couple Photostrip */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center relative">
          {/* Photobooth Printer Dispenser Top Lip */}
          <div className="w-60 sm:w-68 h-5 sm:h-5.5 rounded-full bg-[#18181B] shadow-[0_8px_20px_rgba(0,0,0,0.35)] relative z-20 mx-auto border-t border-neutral-700/40" />

          {/* Emerging Vertical Photostrip */}
          <div
            className="relative z-10 -mt-2.5 w-52 sm:w-60 bg-[#18181B] rounded-sm p-3 pb-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.38)] rotate-[2deg] hover:rotate-0 transition-transform duration-500 ease-out origin-top border border-neutral-800"
            title="HaloLuna Duo Photostrip"
          >
            {/* 4 Life4Cuts Photo Slots */}
            <div className="flex flex-col gap-2 w-full">
              {[
                {
                  partnerA: '/assets/photos/catA_1.jpg',
                  partnerB: '/assets/photos/catB_1.jpg',
                  pose: 'Sweet Smile',
                },
                {
                  partnerA: '/assets/photos/catA_2.jpg',
                  partnerB: '/assets/photos/catB_2.jpg',
                  pose: 'Peace Sign',
                },
                {
                  partnerA: '/assets/photos/catA_3.jpg',
                  partnerB: '/assets/photos/catB_3.jpg',
                  pose: 'Cheek Heart',
                },
                {
                  partnerA: '/assets/photos/catA_4.jpg',
                  partnerB: '/assets/photos/catB_4.jpg',
                  pose: 'Candid Laugh',
                },
              ].map((frame, index) => (
                <div
                  key={index}
                  className="relative w-full aspect-[4/3] bg-neutral-900 rounded-[2px] overflow-hidden grid grid-cols-2 gap-[1px] border border-neutral-950/80 shadow-inner group/slot"
                >
                  <div className="relative w-full h-full overflow-hidden bg-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.partnerA}
                      alt={`Partner A pose ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative w-full h-full overflow-hidden bg-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.partnerB}
                      alt={`Partner B pose ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Photostrip Bottom Watermark */}
            <div className="mt-3 text-center">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-400 select-none">
                gethaloluna.com
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AngiePhotoboothPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#FAF9F5]" />}>
      <AngiePhotoboothContent />
    </Suspense>
  );
}
