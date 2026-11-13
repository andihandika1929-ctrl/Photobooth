'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FrameTheme,
  INITIAL_FRAME_THEMES,
  getStoredFrames,
  saveStoredFrames,
  FRAMES_UPDATED_EVENT,
  normalizeLayoutType,
  toLegacyLayout,
  toValidUuid,
} from '@/lib/frames';

export function useFramePresets() {
  const [frames, setFrames] = useState<FrameTheme[]>(INITIAL_FRAME_THEMES);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Load frames with Supabase database as source of truth
  const fetchFrames = useCallback(async () => {
    const local = getStoredFrames();
    setFrames(local);
    setLoading(true);

    try {
      const res = await fetch('/api/frames?all=true', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const serverFrames: FrameTheme[] = Array.isArray(json.frames) ? json.frames : [];

        if (serverFrames.length > 0) {
          setFrames(serverFrames);
          saveStoredFrames(serverFrames);
        } else {
          setFrames(local);
        }
      }
    } catch (err) {
      console.warn('[HaloLuna] Frame sync notice (using local storage cache):', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFrames();

    // Listen for local updates and cross-tab storage changes
    const handleUpdate = () => {
      setFrames(getStoredFrames());
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'haloluna:custom-frame-presets') {
        setFrames(getStoredFrames());
      }
    };

    window.addEventListener(FRAMES_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(FRAMES_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchFrames]);

  // Toggle Active/Inactive
  const toggleActive = useCallback(
    async (id: string): Promise<boolean> => {
      const target = frames.find((f) => f.id === id);
      if (!target) return false;

      const nextStatus = target.is_active === false ? true : false;
      const updated = frames.map((f) => (f.id === id ? { ...f, is_active: nextStatus } : f));

      // 1. Instant local update
      setFrames(updated);
      saveStoredFrames(updated);

      // 2. Persist to API route
      try {
        await fetch('/api/frames', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, updates: { is_active: nextStatus } }),
        });
      } catch (err) {
        console.warn('API sync warning for toggleActive:', err);
      }

      return true;
    },
    [frames]
  );

  // Save new or edited frame
  const saveFrame = useCallback(
    async (frame: FrameTheme, isEdit: boolean): Promise<boolean> => {
      setIsSaving(true);
      try {
        const layoutType = normalizeLayoutType(frame.layout_type || frame.layout);
        const overlayUrl = frame.overlay_image_url || frame.frame_image_url || undefined;
        const bgColor = frame.bg_color || frame.paper || '#FDFBF7';
        const frameId = toValidUuid(frame.id);

        const normalizedFrame: FrameTheme = {
          ...frame,
          id: frameId,
          layout_type: layoutType,
          layout: toLegacyLayout(layoutType),
          overlay_image_url: overlayUrl,
          frame_image_url: overlayUrl,
          bg_color: bgColor,
          paper: bgColor,
          is_active: frame.is_active !== false,
          enable_text: Boolean(frame.enable_text),
          default_text: frame.default_text ?? '',
          text_color: frame.text_color ?? '#000000',
          created_at: frame.created_at || new Date().toISOString(),
        };

        // 1. Instant optimistic local update
        let updatedList: FrameTheme[];
        if (isEdit) {
          updatedList = frames.map((f) => (f.id === normalizedFrame.id || f.id === frame.id ? normalizedFrame : f));
        } else {
          updatedList = [normalizedFrame, ...frames.filter((f) => f.id !== normalizedFrame.id && f.id !== frame.id)];
        }

        setFrames(updatedList);
        saveStoredFrames(updatedList);

        // 2. Persist via API route
        const method = isEdit ? 'PUT' : 'POST';
        const body = isEdit
          ? JSON.stringify({ id: normalizedFrame.id, updates: normalizedFrame })
          : JSON.stringify({ frame: normalizedFrame });

        const res = await fetch('/api/frames', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.frame) {
            const saved: FrameTheme = resData.frame;
            setFrames((prev) => {
              const next = isEdit
                ? prev.map((f) => (f.id === saved.id ? saved : f))
                : [saved, ...prev.filter((f) => f.id !== saved.id)];
              saveStoredFrames(next);
              return next;
            });
          }
        } else {
          console.warn('API returned non-OK status during saveFrame, local fallback kept.');
        }

        return true;
      } catch (err) {
        console.error('Error during saveFrame:', err);
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [frames]
  );

  // Delete frame
  const deleteFrame = useCallback(
    async (id: string): Promise<boolean> => {
      const normalizedId = toValidUuid(id);
      const updated = frames.filter((f) => f.id !== id && f.id !== normalizedId);
      setFrames(updated);
      saveStoredFrames(updated);

      try {
        await fetch(`/api/frames?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('API sync warning for deleteFrame:', err);
      }

      return true;
    },
    [frames]
  );

  // Upload frame asset via server endpoint /api/frames/upload (handles Supabase Storage or server static public/frames/)
  const uploadFrameAsset = useCallback(async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/frames/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.url) {
          return json.url;
        }
      }
    } catch (err) {
      console.warn('Upload endpoint notice, falling back to DataURL:', err);
    }

    // Reliable DataURL fallback
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }, []);

  // Filtered frames based on search and category
  const filteredFrames = useMemo(() => {
    return frames.filter((frame) => {
      const matchesSearch =
        searchQuery === '' ||
        frame.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (frame.tagline && frame.tagline.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (frame.layout_type && frame.layout_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (frame.layout && frame.layout.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (frame.category && frame.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'All' ||
        (frame.category || 'Standard').toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [frames, searchQuery, selectedCategory]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>(['All', 'Standard', 'Birthday', 'Seasonal', 'Wedding']);
    frames.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [frames]);

  return {
    frames,
    filteredFrames,
    loading,
    isSaving,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    toggleActive,
    saveFrame,
    deleteFrame,
    uploadFrameAsset,
    fetchFrames,
  };
}
