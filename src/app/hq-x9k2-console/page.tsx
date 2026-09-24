'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Camera, LogOut, Trash2, Download, Calendar, BarChart2,
  Grid, List, AlertCircle, RefreshCw, Lock, CheckSquare, Square,
} from 'lucide-react';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface Photo {
  id: string;
  image_url: string;
  storage_path: string;
  template_type: string;
  layout: string;
  created_at: string;
  location: string | null;
}

type AuthState = 'unauthenticated' | 'authenticating' | 'authenticated';

export default function AdminDashboard() {
  const [authState,    setAuthState]    = useState<AuthState>('unauthenticated');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [authError,    setAuthError]    = useState('');
  const [photos,       setPhotos]       = useState<Photo[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [deleteLoading,setDeleteLoading] = useState<string | null>(null);
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid');
  const [client,       setClient]       = useState(() => getClient());

  // Check existing session
  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      if (data.session) setAuthState('authenticated');
    });
  }, [client]);

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await client
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPhotos(data as Photo[]);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    if (authState === 'authenticated') fetchPhotos();
  }, [authState, fetchPhotos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthState('authenticating');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('Invalid credentials. Access denied.');
      setAuthState('unauthenticated');
    } else {
      setClient(getClient()); // Refresh client with session
      setAuthState('authenticated');
    }
  };

  const handleLogout = async () => {
    await client.auth.signOut();
    setAuthState('unauthenticated');
    setPhotos([]);
    setSelectedIds(new Set());
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm(`Delete photo ${photo.id.substring(0, 8)}? This cannot be undone.`)) return;
    setDeleteLoading(photo.id);
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [photo.id], storagePaths: [photo.storage_path] }),
    });
    if (res.ok) setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setDeleteLoading(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} photo(s)? This cannot be undone.`)) return;
    const toDelete  = photos.filter(p => selectedIds.has(p.id));
    const paths     = toDelete.map(p => p.storage_path);
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), storagePaths: paths }),
    });
    if (res.ok) {
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Stats
  const today       = new Date().toDateString();
  const todayCount  = photos.filter(p => new Date(p.created_at).toDateString() === today).length;
  const templateCounts = photos.reduce<Record<string, number>>((acc, p) => {
    acc[p.template_type] = (acc[p.template_type] || 0) + 1; return acc;
  }, {});
  const topTemplate = Object.entries(templateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  // ─── LOGIN ───────────────────────────────────────
  if (authState !== 'authenticated') {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="border border-white/10 bg-[#1A1A1A] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 border border-white/20 flex items-center justify-center">
                <Lock size={15} className="text-white/60" />
              </div>
              <div>
                <p className="text-white font-bold text-sm tracking-widest uppercase">Secure Access</p>
                <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest mt-0.5">
                  Admin Console · /hq-x9k2-console
                </p>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 mb-5 bg-red-950/50 border border-red-800/40 px-3 py-2.5 rounded-sm">
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{authError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-white/30 text-[10px] font-mono uppercase tracking-widest mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-white/30 transition-colors font-mono"
                  placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-white/30 text-[10px] font-mono uppercase tracking-widest mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-white/30 transition-colors font-mono"
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={authState === 'authenticating'}
                className="bg-white text-[#0F0F0F] font-bold py-3 text-sm mt-2 hover:bg-white/90 transition-colors disabled:opacity-50 tracking-wide">
                {authState === 'authenticating' ? 'Verifying...' : 'Enter Console'}
              </button>
            </form>
          </div>
          <p className="text-center text-white/15 text-[10px] font-mono mt-3 uppercase tracking-widest">
            Unauthorized access is logged.
          </p>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ───────────────────────────────────
  return (
    <div className="min-h-screen bg-studio relative z-10">
      <header className="border-b border-border bg-cream/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-charcoal flex items-center justify-center shadow-tactile-sm">
              <Camera size={15} className="text-cream" />
            </div>
            <div>
              <h1 className="font-bold text-[13px] tracking-widest uppercase">Photobooth</h1>
              <p className="text-[9px] text-warm font-mono uppercase tracking-widest mt-0.5">Admin Console</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-neo flex items-center gap-2 text-xs py-2 px-3">
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-7">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Photos', value: photos.length,   icon: <Camera size={17} /> },
            { label: "Today",        value: todayCount,       icon: <Calendar size={17} /> },
            { label: 'Top Template', value: topTemplate.charAt(0).toUpperCase() + topTemplate.slice(1), icon: <BarChart2 size={17} /> },
          ].map(stat => (
            <div key={stat.label} className="studio-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 border border-border flex items-center justify-center text-warm shrink-0">
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] text-warm uppercase tracking-widest font-semibold">{stat.label}</p>
                <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={fetchPhotos} disabled={isLoading}
              className="btn-neo flex items-center gap-2 text-xs py-2 px-3">
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete}
                className="btn-neo flex items-center gap-2 text-xs py-2 px-3 text-red-600 border-red-300 hover:border-red-500">
                <Trash2 size={12} /> Delete {selectedIds.size} Selected
              </button>
            )}
            {photos.length > 0 && (
              <button
                onClick={() => setSelectedIds(selectedIds.size === photos.length ? new Set() : new Set(photos.map(p => p.id)))}
                className="btn-neo flex items-center gap-2 text-xs py-2 px-3">
                {selectedIds.size === photos.length ? <CheckSquare size={12} /> : <Square size={12} />}
                {selectedIds.size === photos.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="flex border border-border">
            {(['grid', 'list'] as const).map((m, i) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-2 transition-colors ${i > 0 ? 'border-l border-border' : ''} ${
                  viewMode === m ? 'bg-charcoal text-cream' : 'bg-cream text-warm hover:text-charcoal'
                }`}>
                {m === 'grid' ? <Grid size={14} /> : <List size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery */}
        {isLoading ? (
          <div className="flex flex-col items-center py-16 text-warm">
            <RefreshCw size={22} className="animate-spin mb-3" />
            <p className="text-sm">Loading photos…</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="studio-card flex flex-col items-center justify-center py-16 text-warm">
            <Camera size={28} className="mb-3 opacity-30" />
            <p className="text-sm">No photos yet. Start shooting!</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => toggleSelect(photo.id)}
                className={`group relative cursor-pointer transition-all duration-150 ${
                  selectedIds.has(photo.id)
                    ? 'ring-2 ring-charcoal ring-offset-2'
                    : ''
                }`}
              >
                {/* Polaroid-style card */}
                <div className="bg-white border border-[#E8E0D4] p-2 pb-8 shadow-[3px_3px_6px_rgba(0,0,0,0.10)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.image_url} alt="Photo strip"
                    className="w-full aspect-square object-cover" />
                  <div className="absolute inset-2 bottom-10 flex items-center justify-center
                    bg-black/0 group-hover:bg-black/30 transition-colors rounded-sm">
                    <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1.5 items-center" onClick={e => e.stopPropagation()}>
                      <a href={photo.image_url} download target="_blank" rel="noreferrer"
                        className="bg-white text-charcoal p-2 shadow-sm hover:bg-cream transition-colors">
                        <Download size={13} />
                      </a>
                      <button onClick={() => handleDelete(photo)} disabled={deleteLoading === photo.id}
                        className="bg-red-600 text-white p-2 hover:bg-red-700 transition-colors">
                        {deleteLoading === photo.id
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                  {/* Checkbox */}
                  <div className={`absolute top-3 left-3 w-4 h-4 border flex items-center justify-center transition-all ${
                    selectedIds.has(photo.id) ? 'bg-charcoal border-charcoal' : 'bg-white/80 border-white/80'
                  }`}>
                    {selectedIds.has(photo.id) && (
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </div>
                </div>
                {/* Meta below polaroid */}
                <p className="text-[9px] font-mono text-warm mt-1.5 truncate">
                  {new Date(photo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{photo.template_type}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="studio-card overflow-hidden divide-y divide-border">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-parchment text-[10px] font-semibold text-warm uppercase tracking-widest">
              <span />
              <span>Strip</span>
              <span>Template</span>
              <span>Date</span>
              <span>Actions</span>
            </div>
            {photos.map(photo => (
              <div key={photo.id}
                onClick={() => toggleSelect(photo.id)}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 cursor-pointer transition-colors hover:bg-parchment/50 ${
                  selectedIds.has(photo.id) ? 'bg-parchment' : ''
                }`}>
                <input type="checkbox" checked={selectedIds.has(photo.id)} onChange={() => toggleSelect(photo.id)}
                  onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 accent-charcoal" />
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.image_url} alt="strip" className="w-10 h-10 object-cover border border-border shrink-0" />
                  <span className="text-xs font-mono text-warm truncate">{photo.id.substring(0, 16)}…</span>
                </div>
                <span className="text-xs capitalize text-warm font-mono">{photo.template_type}</span>
                <span className="text-xs font-mono text-warm whitespace-nowrap">
                  {new Date(photo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </span>
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <a href={photo.image_url} download target="_blank" rel="noreferrer"
                    className="p-1.5 border border-border hover:border-charcoal transition-colors">
                    <Download size={12} />
                  </a>
                  <button onClick={() => handleDelete(photo)} disabled={deleteLoading === photo.id}
                    className="p-1.5 border border-border hover:border-red-400 hover:text-red-500 transition-colors">
                    {deleteLoading === photo.id
                      ? <RefreshCw size={12} className="animate-spin" />
                      : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-8 py-4 px-4 text-center">
        <p className="text-[10px] text-warm font-mono uppercase tracking-widest">
          Photobooth Admin Console · Directed by Andi Handika
        </p>
      </footer>
    </div>
  );
}
