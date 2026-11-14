'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Camera,
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  Eye,
  Check,
  Layers,
  Film,
  X,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAdminPhotos, PhotoRecord } from '@/lib/admin/useAdminPhotos';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { formatDate } from '@/lib/utils';

export default function RawPhotosPage() {
  const {
    photos,
    loading,
    fetchPhotos,
    deletePhoto,
    bulkDeletePhotos,
    deletingId,
    isBulkDeleting,
    selectedIds,
    toggleSelectOne,
    handleSelectAll,
    clearSelection,
  } = useAdminPhotos();

  const [searchFilter, setSearchFilter] = React.useState('');
  const [selectedPreset, setSelectedPreset] = React.useState<string>('all');
  const [previewPhoto, setPreviewPhoto] = React.useState<{ url: string; title: string } | null>(null);
  const [downloadingSessionId, setDownloadingSessionId] = React.useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = React.useState<PhotoRecord | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = React.useState(false);
  const [deleteToast, setDeleteToast] = React.useState<string | null>(null);

  // Filter photos
  const filteredSessions = React.useMemo(() => {
    return photos.filter((p) => {
      const matchSearch =
        searchFilter.trim() === '' ||
        p.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (p.template_type && p.template_type.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (p.location_tag && p.location_tag.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchPreset =
        selectedPreset === 'all' || p.template_type?.toLowerCase() === selectedPreset.toLowerCase();

      return matchSearch && matchPreset;
    });
  }, [photos, searchFilter, selectedPreset]);

  // Unique presets
  const availablePresets = React.useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => {
      if (p.template_type) set.add(p.template_type);
    });
    return Array.from(set);
  }, [photos]);

  const totalRawCount = React.useMemo(() => {
    return photos.reduce((acc, p) => acc + (p.raw_photos?.length || 0), 0);
  }, [photos]);

  // Sequential download handler for all raw photos in a session
  const handleDownloadAllRaw = async (sessionId: string, rawUrls: string[]) => {
    if (!rawUrls || rawUrls.length === 0) return;
    setDownloadingSessionId(sessionId);

    try {
      for (let i = 0; i < rawUrls.length; i++) {
        const url = rawUrls[i];
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `haloluna-raw-${sessionId.substring(0, 8)}-shot-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } catch (err) {
      console.error('[HaloLuna] Download raw photos error:', err);
    } finally {
      setDownloadingSessionId(null);
    }
  };

  // Confirm single session deletion (removes strip and all raw unframed photos)
  const confirmSingleDelete = async () => {
    if (!sessionToDelete) return;
    const ok = await deletePhoto(sessionToDelete);
    if (ok) {
      setDeleteToast(`Sesi #${sessionToDelete.id.substring(0, 8)} dan foto mentahan berhasil dihapus dari Supabase!`);
      setTimeout(() => setDeleteToast(null), 3500);
      setSessionToDelete(null);
    }
  };

  // Confirm bulk deletion
  const confirmBulkDelete = async () => {
    const count = selectedIds.size;
    const ok = await bulkDeletePhotos();
    if (ok) {
      setDeleteToast(`${count} sesi foto berhasil dihapus permanen dari Supabase!`);
      setTimeout(() => setDeleteToast(null), 3500);
      setShowBulkConfirm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Foto Mentahan (Raw Photos)
            </h1>
            <Badge variant="default" className="text-[10px] uppercase font-mono px-2 py-0.5">
              Tanpa Frame
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Kelola, unduh, dan hapus foto asli kamera tanpa overlay frame agar storage Supabase tetap hemat
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPhotos}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Storage</span>
          </Button>

          <Link href="/booth" target="_blank">
            <Button size="sm" className="gap-1.5 text-xs h-9">
              <Camera className="h-3.5 w-3.5" />
              <span>Launch Booth</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Delete Success Toast ── */}
      {deleteToast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Metric Summary Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase text-zinc-400 font-semibold">Total Sesi Foto</p>
            <p className="text-xl font-bold font-mono text-zinc-900">{photos.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
            <Layers className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase text-emerald-600 font-semibold">Total Foto Mentahan</p>
            <p className="text-xl font-bold font-mono text-emerald-700">{totalRawCount} Foto</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Film className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase text-zinc-400 font-semibold">Status Auto-Sync</p>
            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Aktif di Tahap &quot;Pick your 4&quot;</span>
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
            <Sparkles className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Cari berdasarkan ID atau preset..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mr-1 shrink-0">
              Filter:
            </span>
            <Button
              variant={selectedPreset === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPreset('all')}
              className="h-8 text-xs shrink-0"
            >
              Semua ({photos.length})
            </Button>
            {availablePresets.map((preset) => (
              <Button
                key={preset}
                variant={selectedPreset === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPreset(preset)}
                className="h-8 text-xs capitalize shrink-0"
              >
                {preset}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Selection & Bulk Delete Control Bar ── */}
      {!loading && filteredSessions.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <button
            onClick={() => handleSelectAll(filteredSessions)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors select-none"
          >
            {selectedIds.size > 0 && selectedIds.size === filteredSessions.length ? (
              <CheckSquare className="h-4 w-4 text-zinc-900" />
            ) : (
              <Square className="h-4 w-4 text-zinc-400" />
            )}
            <span>
              Pilih Semua ({filteredSessions.length} sesi)
            </span>
          </button>

          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-zinc-600">
                {selectedIds.size} dipilih
              </span>
              <button
                onClick={clearSelection}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 underline"
              >
                Batal
              </button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkConfirm(true)}
                className="h-8 text-xs gap-1.5 px-3 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus {selectedIds.size} Sesi Terpilih</span>
              </Button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Pilih sesi foto untuk menghapus foto yang gagal atau tidak terpakai
            </span>
          )}
        </div>
      )}

      {/* ── Sessions List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-400 mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Memuat Galeri Foto Mentahan Supabase...
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
            <Camera className="h-6 w-6" />
          </div>
          <CardTitle className="text-base text-zinc-800">Tidak Ada Foto Ditemukan</CardTitle>
          <CardDescription className="max-w-sm mt-1 mb-4">
            {searchFilter
              ? 'Tidak ada foto yang cocok dengan pencarian.'
              : 'Belum ada foto yang tersimpan. Lakukan sesi foto di booth untuk menyimpan foto mentahan.'}
          </CardDescription>
          <Link href="/booth" target="_blank">
            <Button size="sm" className="gap-2 text-xs">
              <Camera className="h-3.5 w-3.5" />
              <span>Buka Photobooth</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredSessions.map((session) => {
            const rawList = session.raw_photos || [];
            const hasRaw = rawList.length > 0;
            const isDownloading = downloadingSessionId === session.id;
            const isSelected = selectedIds.has(session.id);
            const isDeleting = deletingId === session.id;

            return (
              <Card
                key={session.id}
                className={`overflow-hidden transition-all shadow-xs ${
                  isSelected ? 'border-zinc-900 ring-2 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Session Card Header */}
                <div className="bg-zinc-50/80 px-4 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Checkbox for selection */}
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(session.id)}
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-white border-zinc-300 text-transparent hover:border-zinc-700'
                      }`}
                      title="Pilih sesi ini"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>

                    <span className="font-mono text-xs font-bold text-zinc-900">
                      #{session.id.substring(0, 8)}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase bg-white">
                      {session.template_type || 'strip'}
                    </Badge>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {formatDate(session.created_at)}
                    </span>
                    {session.location_tag && (
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium hidden sm:flex">
                        <MapPin className="h-3 w-3 text-zinc-400" />
                        {session.location_tag}
                      </span>
                    )}
                  </div>

                  {/* Header Actions: Download, Strip Final, Hapus Sesi */}
                  <div className="flex items-center gap-2">
                    {hasRaw && (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={isDownloading}
                        onClick={() => handleDownloadAllRaw(session.id, rawList)}
                        className="h-8 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white"
                      >
                        {isDownloading ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Mendownload ({rawList.length})...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            <span>Download Semua Mentahan ({rawList.length})</span>
                          </>
                        )}
                      </Button>
                    )}

                    <a
                      href={session.image_url}
                      target="_blank"
                      rel="noreferrer"
                      download={`photostrip-${session.id}.png`}
                    >
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span>Strip Final</span>
                      </Button>
                    </a>

                    {/* Tombol Hapus Sesi Foto (Membersihkan Supabase Storage & DB) */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isDeleting}
                      onClick={() => setSessionToDelete(session)}
                      className="h-8 text-xs gap-1 px-2.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      title="Hapus sesi ini dan seluruh foto mentahan dari Supabase"
                    >
                      {isDeleting ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Hapus Sesi</span>
                    </Button>
                  </div>
                </div>

                {/* Session Card Content: Photostrip + Unframed Raw Photos Grid */}
                <div className="p-4 flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Final Photostrip Preview */}
                  <div className="w-full lg:w-44 shrink-0 flex flex-col items-center">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold mb-2">
                      Photostrip Final
                    </span>
                    <div className="relative w-36 aspect-[1/3] max-h-72 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 shadow-2xs group flex items-center justify-center p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={session.image_url}
                        alt={`Strip ${session.id}`}
                        className="max-h-full max-w-full object-contain rounded"
                        loading="lazy"
                      />
                      <button
                        onClick={() => setPreviewPhoto({ url: session.image_url, title: `Photostrip #${session.id.substring(0, 8)}` })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Lihat ukuran penuh"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Raw Photos (Foto Mentahan Tanpa Frame) */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">
                        Foto Mentahan Asli (Tanpa Frame) — {hasRaw ? `${rawList.length} Foto` : 'Belum Tersedia'}
                      </span>
                      {hasRaw && (
                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Resolusi Asli Kamera
                        </span>
                      )}
                    </div>

                    {hasRaw ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {rawList.map((rawUrl, idx) => (
                          <div
                            key={idx}
                            className="group relative rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden shadow-2xs hover:shadow-md hover:border-zinc-400 transition-all flex flex-col"
                          >
                            {/* Raw Photo Preview */}
                            <div className="relative aspect-[4/3] bg-zinc-900/5 overflow-hidden flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={rawUrl}
                                alt={`Shot ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />

                              {/* Shot Number Badge */}
                              <div className="absolute top-2 left-2">
                                <span className="bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                              </div>

                              {/* Hover Quick Actions */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto({ url: rawUrl, title: `Foto Mentahan #${idx + 1} - Sesi #${session.id.substring(0, 8)}` })}
                                  className="h-8 w-8 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                                  title="Lihat Resolusi Penuh"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <a
                                  href={rawUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={`haloluna-raw-${session.id.substring(0, 8)}-shot-${idx + 1}.png`}
                                  className="h-8 w-8 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                                  title="Download Foto Mentahan Ini"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>

                            {/* Card Footer for single raw shot */}
                            <div className="p-2 bg-white flex items-center justify-between text-[11px] font-mono border-t border-zinc-100">
                              <span className="text-zinc-600 font-medium">Shot #{idx + 1}</span>
                              <a
                                href={rawUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={`haloluna-raw-${session.id.substring(0, 8)}-shot-${idx + 1}.png`}
                                className="text-zinc-500 hover:text-zinc-900 flex items-center gap-0.5"
                              >
                                <Download className="h-3 w-3" />
                                <span className="text-[10px]">Unduh</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center">
                        <Camera className="h-6 w-6 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs font-medium text-zinc-600">
                          Foto mentahan tidak tersimpan untuk sesi ini
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Sesi ini diambil sebelum fitur auto-save foto mentahan aktif. Sesi baru otomatis menyimpan foto mentahan saat tamu selesai memilih foto.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Single Delete Confirmation Dialog ── */}
      <Dialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">
              Hapus Sesi #{sessionToDelete?.id.substring(0, 8)}?
            </DialogTitle>
            <DialogDescription className="text-center">
              Sesi ini beserta gambar photostrip dan seluruh {sessionToDelete?.raw_photos?.length || 0} foto mentahan akan dihapus secara permanen dari Supabase Storage dan database. Ruang penyimpanan Supabase Anda akan langsung dibebaskan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionToDelete(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmSingleDelete}
              isLoading={deletingId === sessionToDelete?.id}
            >
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Confirmation Dialog ── */}
      <Dialog
        open={showBulkConfirm}
        onOpenChange={(open) => !open && setShowBulkConfirm(false)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">
              Hapus {selectedIds.size} Sesi Terpilih Sekaligus?
            </DialogTitle>
            <DialogDescription className="text-center">
              Seluruh foto photostrip dan foto mentahan dari {selectedIds.size} sesi yang dipilih akan dihapus permanen dari Supabase Storage dan database.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkConfirm(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmBulkDelete}
              isLoading={isBulkDeleting}
            >
              Hapus {selectedIds.size} Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fullscreen Preview Modal ── */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between text-white">
              <span className="font-mono text-xs font-semibold">{previewPhoto.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  download="haloluna-raw-full.png"
                >
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-zinc-700 text-white hover:bg-zinc-800">
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </Button>
                </a>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto bg-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
