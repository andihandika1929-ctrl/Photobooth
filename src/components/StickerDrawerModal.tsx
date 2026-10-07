'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Sticker, Loader2, Sparkles, AlertCircle, Check } from 'lucide-react';

export interface StickerItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface StickerDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (item: { name: string; src: string }) => void;
  placedCount: number;
}

const CATEGORIES = [
  'Trending',
  'Animals',
  'Characters',
  'Y2K',
  'Doodles',
  'Sparkles',
] as const;

type CategoryType = (typeof CATEGORIES)[number];

export const StickerDrawerModal: React.FC<StickerDrawerModalProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  placedCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('Trending');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch stickers from Next.js internal API route
  const fetchStickers = useCallback(async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const trimmed = query.trim();
      const endpoint = trimmed
        ? `/api/stickers?q=${encodeURIComponent(trimmed)}`
        : '/api/stickers';

      const res = await fetch(endpoint, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Failed to load stickers (${res.status})`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.stickers)) {
        setStickers(data.stickers);
      } else if (Array.isArray(data.data)) {
        setStickers(data.data);
      } else {
        setStickers([]);
        if (data.error) setError(data.error);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[StickerDrawer] Fetch error:', err);
      setError('Gagal memuat stiker. Pastikan koneksi internet aktif.');
      setStickers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      if (stickers.length === 0) {
        fetchStickers('');
      }
    }
  }, [isOpen, stickers.length, fetchStickers]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Category selection
  const handleSelectCategory = (cat: CategoryType) => {
    setActiveCategory(cat);
    if (cat === 'Trending') {
      setSearchQuery('');
      fetchStickers('');
    } else {
      setSearchQuery(cat);
      fetchStickers(cat);
    }
  };

  // Handle Search Input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      const trimmed = val.trim();
      if (!trimmed) {
        setActiveCategory('Trending');
        fetchStickers('');
      } else {
        const matchedCat = CATEGORIES.find(
          (c) => c.toLowerCase() === trimmed.toLowerCase()
        );
        if (matchedCat) {
          setActiveCategory(matchedCat);
        } else {
          // Custom search
          setActiveCategory('Trending');
        }
        fetchStickers(trimmed);
      }
    }, 400);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveCategory('Trending');
    fetchStickers('');
  };

  const handleStickerClick = (item: StickerItem) => {
    onSelectSticker({
      name: item.title || 'Sticker',
      src: item.url,
    });
    setJustAddedId(item.id);
    setTimeout(() => {
      setJustAddedId(null);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-xl max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200/90 animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-xs">
              <Sticker size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                  Sticker Catalog
                </h3>
                {placedCount > 0 && (
                  <span className="text-[10px] font-mono font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                    {placedCount} placed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Pilih stiker transparan untuk ditempelkan ke strip
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search Bar & Category Navigation ── */}
        <div className="p-3 sm:p-4 border-b border-zinc-100 bg-zinc-50/60 flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative flex items-center w-full">
            <Search
              size={15}
              className="absolute left-3.5 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari stiker lucu (contoh: cute, cat, heart, star)..."
              className="w-full bg-white border border-zinc-200 rounded-xl pl-9.5 pr-9 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center text-xs"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Horizontal Pills (Zero Raw Emojis) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat && (cat === 'Trending' ? !searchQuery : searchQuery.toLowerCase() === cat.toLowerCase());
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white text-zinc-600 border-zinc-200/90 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sticker Grid / Content Area ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[260px] max-h-[380px] bg-white">
          {isLoading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-zinc-100/90 animate-pulse border border-zinc-200/60 flex items-center justify-center"
                />
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-2.5 border border-red-100">
                <AlertCircle size={18} />
              </div>
              <p className="text-xs font-bold text-zinc-800">{error}</p>
              <button
                type="button"
                onClick={() => fetchStickers(searchQuery)}
                className="mt-3 text-xs font-semibold px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : stickers.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-2.5 border border-zinc-200/80">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-bold text-zinc-800">
                Tidak ada stiker ditemukan
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                Coba kata kunci lain atau pilih salah satu kategori di atas.
              </p>
            </div>
          ) : (
            /* Responsive Sticker Grid */
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {stickers.map((item) => {
                const isJustAdded = justAddedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleStickerClick(item)}
                    className="group relative aspect-square rounded-xl border border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-100/80 hover:border-zinc-400 hover:shadow-md transition-all flex flex-col items-center justify-center p-2 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    title={item.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl || item.url}
                      alt={item.title}
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain filter drop-shadow-xs group-hover:scale-110 transition-transform pointer-events-none"
                      loading="lazy"
                    />

                    {/* Added feedback check badge */}
                    {isJustAdded && (
                      <div className="absolute inset-0 bg-zinc-900/80 rounded-xl flex items-center justify-center text-white text-[10px] font-bold gap-1 animate-in fade-in duration-150">
                        <Check size={12} strokeWidth={3} />
                        <span>Added</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between text-[11px] text-zinc-400 px-4">
          <span className="font-mono">Powered by GIPHY Stickers</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-700 hover:text-zinc-900 underline"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
