'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Camera,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Search,
  Clock,
  MapPin,
  Lock,
  LogOut,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface PhotoRecord {
  id: string;
  image_url: string;
  storage_path: string;
  template_type: string;
  location_tag?: string | null;
  created_at: string;
}

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gallery State
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [confirmDelete, setConfirmDelete] = useState<PhotoRecord | null>(null);

  // ── Auth Lifecycle (getSession & onAuthStateChange) ──────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch photos: selects id, image_url, storage_path, template_type, location_tag, created_at ordered by created_at desc
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

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoginError(error.message || 'Invalid admin credentials. Access restricted.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setLoginError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPhotos([]);
  };

  // Handle Photo Deletion: removes from storage via storage_path and removes from DB via id
  const handleDelete = async (photo: PhotoRecord) => {
    setDeletingId(photo.id);
    try {
      // 1. Remove from storage via item.storage_path
      if (photo.storage_path) {
        const { error: storageErr } = await supabase.storage
          .from('photos')
          .remove([photo.storage_path]);
        if (storageErr) {
          console.error('Supabase storage delete error:', storageErr);
        }
      }

      // 2. Remove from DB via id
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
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Delete request failed.');
    } finally {
      setDeletingId(null);
    }
  };

  // Quick Metrics
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

    const topPreset = Object.entries(presetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, todayCount, topPreset };
  }, [photos]);

  // Filtered gallery
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

  // Unique presets
  const availablePresets = useMemo(() => {
    return Array.from(new Set(photos.map((p) => p.template_type || 'classic-strip')));
  }, [photos]);

  // ── 1. LOADING SCREEN ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center text-zinc-900 p-4">
        <div className="w-10 h-10 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Verifying Studio Security...
        </p>
      </div>
    );
  }

  // ── 2. AUTH GATE (KOREAN-MINIMALIST LOGIN CARD) ──
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF7EE] text-zinc-900 flex flex-col items-center justify-center p-4 relative">
        {/* Dot Matrix Background */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.14] z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #C4B99A 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 w-full max-w-md bg-white border border-[#E8DFCE] rounded-2xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl mx-auto flex items-center justify-center shadow-md mb-3">
              <Lock size={20} />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h1 className="font-bold text-sm tracking-widest uppercase text-zinc-900">
                Photobooth Studio
              </h1>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Korean Aesthetic Studio • Private Management Gate
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@studio.com"
                className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2.5 bg-zinc-50/50 outline-none focus:border-zinc-900 focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2.5 bg-zinc-50/50 outline-none focus:border-zinc-900 focus:bg-white transition-all shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-neo-dark flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-50 transition-all active:scale-[0.99] mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound size={13} />
                  <span>Sign In to Console</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
            <Link
              href="/"
              className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft size={12} />
              <span>Back to Photobooth</span>
            </Link>
            <span className="text-[10px] font-mono text-zinc-400">Enforced by Supabase Auth</span>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. AUTHENTICATED DASHBOARD ──
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-zinc-900 flex flex-col font-sans relative">
      {/* Background Matrix Texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.12] z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #C4B99A 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E8DFCE] px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
              title="Return to Photobooth"
            >
              <Camera size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-widest uppercase text-zinc-900 leading-none">
                  Photobooth Studio
                </h1>
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                  HQ Admin
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} />
                  <span>{session.user.email}</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                Korean Aesthetic Gallery &amp; Cloud Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchPhotos}
              disabled={loading}
              className="btn-neo text-xs py-2 px-3 flex items-center gap-1.5 rounded-lg text-zinc-700 bg-white border border-zinc-300 hover:border-zinc-900 transition-colors"
              title="Refresh database"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/"
              className="btn-neo text-xs py-2 px-3.5 flex items-center gap-1.5 rounded-lg bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-800 transition-colors"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Booth</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="btn-neo-dark text-xs py-2 px-3 flex items-center gap-1.5 rounded-lg shadow-sm bg-red-600 hover:bg-red-700 text-white border-red-700 transition-colors"
              title="Sign Out from Admin"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 flex flex-col gap-7 relative z-10">
        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E8DFCE] rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                Total Photos Taken
              </p>
              <h3 className="text-2xl font-bold font-mono text-zinc-900 mt-1">
                {stats.total}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <Camera size={20} />
            </div>
          </div>

          <div className="bg-white border border-[#E8DFCE] rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                Created Today
              </p>
              <h3 className="text-2xl font-bold font-mono text-zinc-900 mt-1">
                {stats.todayCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>

          <div className="bg-white border border-[#E8DFCE] rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                Popular Theme
              </p>
              <h3 className="text-sm font-bold uppercase text-zinc-800 mt-1 truncate max-w-[170px]">
                {stats.topPreset}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="bg-white border border-[#E8DFCE] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ID, location, or preset..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg outline-none focus:border-zinc-800 bg-zinc-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 whitespace-nowrap">
              Preset:
            </span>
            <button
              onClick={() => setSelectedPreset('all')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all whitespace-nowrap ${
                selectedPreset === 'all'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              All ({photos.length})
            </button>
            {availablePresets.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPreset(p)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold capitalize transition-all whitespace-nowrap ${
                  selectedPreset === p
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Photo Gallery Grid ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              Loading Studio Gallery...
            </p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="bg-white border border-[#E8DFCE] rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
              <Camera size={26} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-1">
              No Photos Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-5">
              {searchFilter
                ? 'No photobooth strips match your active search filter.'
                : 'Start capturing memories in the studio booth to see them appear in this dashboard!'}
            </p>
            <Link href="/" className="btn-neo-dark text-xs py-2 px-4 rounded-lg">
              Open Photobooth Studio →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPhotos.map((photo) => {
              const formattedDate = new Date(photo.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={photo.id}
                  className="bg-white border border-[#E8DFCE] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Photo Preview Container - using item.image_url */}
                  <div className="relative aspect-[3/4] bg-[#FAF7F0] overflow-hidden flex items-center justify-center p-3 border-b border-[#E8DFCE]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={`Photo ${photo.id}`}
                      className="max-h-full max-w-full object-contain rounded shadow-sm group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Preset Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-900/80 text-white px-2 py-0.5 rounded backdrop-blur-xs shadow-xs">
                        {photo.template_type}
                      </span>
                    </div>
                  </div>

                  {/* Metadata and Actions */}
                  <div className="p-3.5 flex flex-col gap-3 flex-1 justify-between bg-white">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span className="truncate max-w-[120px]">#{photo.id.substring(0, 8)}</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock size={10} />
                          {formattedDate}
                        </span>
                      </div>

                      {photo.location_tag && (
                        <p className="text-[10px] text-zinc-600 flex items-center gap-1 font-medium truncate">
                          <MapPin size={10} className="text-zinc-400 shrink-0" />
                          <span>{photo.location_tag}</span>
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100">
                      <a
                        href={photo.image_url}
                        target="_blank"
                        rel="noreferrer"
                        download={`photobooth-${photo.id}.png`}
                        className="flex-1 btn-neo text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 bg-white border border-zinc-200 hover:border-zinc-900 text-zinc-800 transition-colors"
                        title="Download High-Res"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>

                      <Link
                        href={`/result/${photo.id}`}
                        target="_blank"
                        className="w-8 h-8 rounded-lg border border-zinc-200 hover:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
                        title="View Public Page"
                      >
                        <ExternalLink size={12} />
                      </Link>

                      <button
                        onClick={() => setConfirmDelete(photo)}
                        disabled={deletingId === photo.id}
                        className="w-8 h-8 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 flex items-center justify-center transition-colors disabled:opacity-40"
                        title="Delete strip"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Confirmation Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-900 mb-1">
              Delete Photo Record?
            </h3>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              Are you sure you want to permanently delete this strip? This will remove the image from
              cloud storage and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {deletingId === confirmDelete.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-[#E8DFCE] py-5 px-4 text-center text-xs text-zinc-500 font-mono">
        <p>PHOTOBOOTH HQ MANAGEMENT • 2026 DIRECTED BY ANDI HANDIKA</p>
      </footer>
    </div>
  );
}
