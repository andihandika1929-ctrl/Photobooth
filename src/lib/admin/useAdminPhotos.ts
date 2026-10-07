'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface PhotoRecord {
  id: string;
  image_url: string;
  storage_path: string;
  template_type: string;
  location_tag?: string | null;
  created_at: string;
}

export function useAdminPhotos() {
  const { supabase, session } = useAdminAuth();
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPhotos(data as PhotoRecord[]);
      } else {
        if (error) console.error('Supabase query error, fallback to admin API:', error);
        const res = await fetch('/api/admin/photos', { cache: 'no-store' });
        if (res.ok) {
          const apiData = await res.json();
          setPhotos(apiData.photos || []);
        }
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (session) {
      fetchPhotos();
    }
  }, [session, fetchPhotos]);

  // Delete single photo
  const deletePhoto = useCallback(
    async (photo: PhotoRecord): Promise<boolean> => {
      setDeletingId(photo.id);
      try {
        if (photo.storage_path) {
          const { error: storageErr } = await supabase.storage
            .from('photos')
            .remove([photo.storage_path]);
          if (storageErr) {
            console.error('Supabase storage delete error:', storageErr);
          }
        }

        const { error: dbErr } = await supabase
          .from('photos')
          .delete()
          .eq('id', photo.id);

        if (dbErr) {
          console.error('Supabase DB delete error, trying admin API:', dbErr);
          const res = await fetch('/api/admin/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ids: [photo.id],
              storagePaths: photo.storage_path ? [photo.storage_path] : [],
            }),
          });
          if (!res.ok) throw new Error('Delete failed');
        }

        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(photo.id);
          return next;
        });
        return true;
      } catch (err) {
        console.error('Delete error:', err);
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [supabase]
  );

  // Bulk delete selected photos
  const bulkDeletePhotos = useCallback(async (): Promise<boolean> => {
    if (selectedIds.size === 0) return false;
    setIsBulkDeleting(true);
    try {
      const selectedList = photos.filter((p) => selectedIds.has(p.id));
      const ids = selectedList.map((p) => p.id);
      const storagePaths = selectedList
        .map((p) => p.storage_path)
        .filter((sp): sp is string => Boolean(sp));

      if (storagePaths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from('photos')
          .remove(storagePaths);
        if (storageErr) console.warn('Bulk storage delete warning:', storageErr);
      }

      const { error: dbErr } = await supabase
        .from('photos')
        .delete()
        .in('id', ids);

      if (dbErr) {
        console.warn('Supabase DB delete failed, using /api/admin/delete:', dbErr);
        const res = await fetch('/api/admin/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, storagePaths }),
        });
        if (!res.ok) throw new Error('Bulk delete failed');
      }

      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      return true;
    } catch (err) {
      console.error('Bulk delete error:', err);
      return false;
    } finally {
      setIsBulkDeleting(false);
    }
  }, [photos, selectedIds, supabase]);

  // Selection handlers
  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((list: PhotoRecord[]) => {
    setSelectedIds((prev) => {
      if (prev.size === list.length && list.length > 0) {
        return new Set();
      }
      return new Set(list.map((p) => p.id));
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const presetName = p.template_type || '';
      const matchesSearch =
        searchFilter === '' ||
        p.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (p.location_tag && p.location_tag.toLowerCase().includes(searchFilter.toLowerCase())) ||
        presetName.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesPreset = selectedPreset === 'all' || presetName === selectedPreset;

      return matchesSearch && matchesPreset;
    });
  }, [photos, searchFilter, selectedPreset]);

  // Available unique presets
  const availablePresets = useMemo(() => {
    return Array.from(new Set(photos.map((p) => p.template_type || 'classic-strip')));
  }, [photos]);

  // Computed metrics
  const stats = useMemo(() => {
    const total = photos.length;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayCount = photos.filter((p) => {
      try {
        return p.created_at.startsWith(todayStr);
      } catch {
        return false;
      }
    }).length;

    const presetCounts = photos.reduce((acc, p) => {
      const key = p.template_type || 'classic-strip';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPreset = Object.entries(presetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Approximate storage: average 1.4 MB per photo
    const estimatedStorageBytes = total * 1.4 * 1024 * 1024;

    return { total, todayCount, topPreset, presetCounts, estimatedStorageBytes };
  }, [photos]);

  return {
    photos,
    filteredPhotos,
    loading,
    deletingId,
    isBulkDeleting,
    searchFilter,
    setSearchFilter,
    selectedPreset,
    setSelectedPreset,
    availablePresets,
    selectedIds,
    toggleSelectOne,
    handleSelectAll,
    clearSelection,
    fetchPhotos,
    deletePhoto,
    bulkDeletePhotos,
    stats,
  };
}
