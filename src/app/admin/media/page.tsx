'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  HardDrive,
  Search,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  AlertTriangle,
  Camera,
  CheckSquare,
  Square,
  Layers,
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

export default function MediaManagementPage() {
  const {
    photos,
    filteredPhotos,
    loading,
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
    deletingId,
    isBulkDeleting,
  } = useAdminPhotos();

  // Dialog states
  const [photoToDelete, setPhotoToDelete] = React.useState<PhotoRecord | null>(null);
  const [rawModalPhoto, setRawModalPhoto] = React.useState<PhotoRecord | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = React.useState(false);
  const [downloadingRaw, setDownloadingRaw] = React.useState(false);

  const handleDownloadAllRaw = async (sessionId: string, rawUrls: string[]) => {
    if (!rawUrls || rawUrls.length === 0) return;
    setDownloadingRaw(true);
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
        await new Promise((r) => setTimeout(r, 350));
      }
    } catch (err) {
      console.error('[HaloLuna] Download raw err:', err);
    } finally {
      setDownloadingRaw(false);
    }
  };

  const confirmSingleDelete = async () => {
    if (!photoToDelete) return;
    const ok = await deletePhoto(photoToDelete);
    if (ok) {
      setPhotoToDelete(null);
    }
  };

  const confirmBulkDelete = async () => {
    const ok = await bulkDeletePhotos();
    if (ok) {
      setShowBulkConfirm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Media Logs &amp; Cloud Storage
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Manage captured guest photo strips and Supabase storage bucket assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/raw-photos">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
              <Camera className="h-3.5 w-3.5 text-zinc-700" />
              <span>Foto Mentahan</span>
              <Badge variant="default" className="text-[9px] px-1 py-0 h-4">Raw</Badge>
            </Button>
          </Link>

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
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search by ID, location, or preset..."
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
              All ({photos.length})
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

      {/* ── Selection Control Bar ── */}
      {!loading && filteredPhotos.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <button
            onClick={() => handleSelectAll(filteredPhotos)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors select-none"
          >
            {selectedIds.size > 0 && selectedIds.size === filteredPhotos.length ? (
              <CheckSquare className="h-4 w-4 text-zinc-900" />
            ) : (
              <Square className="h-4 w-4 text-zinc-400" />
            )}
            <span>
              Select All ({filteredPhotos.length})
            </span>
          </button>

          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-zinc-600">
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 underline"
              >
                Clear
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Select multiple photos for bulk deletion
            </span>
          )}
        </div>
      )}

      {/* ── Gallery Grid ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-400 mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Querying Supabase Gallery...
          </p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
            <Camera className="h-6 w-6" />
          </div>
          <CardTitle className="text-base text-zinc-800">No Photos Found</CardTitle>
          <CardDescription className="max-w-sm mt-1 mb-4">
            {searchFilter
              ? 'No photos match the active search or preset filter.'
              : 'The photo gallery is currently empty. Run the photobooth to create your first strip.'}
          </CardDescription>
          <Link href="/booth" target="_blank">
            <Button size="sm" className="gap-2 text-xs">
              <Camera className="h-3.5 w-3.5" />
              <span>Launch Studio Booth</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPhotos.map((photo) => {
            const isSelected = selectedIds.has(photo.id);

            return (
              <div
                key={photo.id}
                className={`group relative flex flex-col rounded-xl border bg-white overflow-hidden shadow-xs hover:shadow-md transition-all ${
                  isSelected ? 'border-zinc-900 ring-2 ring-zinc-900' : 'border-zinc-200'
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-[3/4] bg-zinc-100/70 overflow-hidden flex items-center justify-center p-3 border-b border-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image_url}
                    alt={`Photo ${photo.id}`}
                    className="max-h-full max-w-full object-contain rounded shadow-2xs group-hover:scale-[1.02] transition-transform duration-200"
                    loading="lazy"
                  />

                  {/* Preset Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant="default" className="text-[9px] font-mono uppercase bg-zinc-900/85 backdrop-blur-xs">
                      {photo.template_type}
                    </Badge>
                  </div>

                  {/* Multi-Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectOne(photo.id);
                    }}
                    className={`absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border shadow-xs transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-white/90 border-zinc-300 text-transparent hover:border-zinc-700'
                    }`}
                    title="Select photo"
                  >
                    <CheckSquare className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'opacity-0 hover:opacity-40 text-zinc-900'}`} />
                  </button>
                </div>

                {/* Metadata & Actions */}
                <div className="p-3 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="truncate max-w-[100px]">#{photo.id.substring(0, 8)}</span>
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(photo.created_at)}</span>
                      </span>
                    </div>

                    {photo.location_tag && (
                      <p className="mt-1 text-[11px] text-zinc-600 flex items-center gap-1 truncate font-medium">
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span>{photo.location_tag}</span>
                      </p>
                    )}
                  </div>

                  {/* Raw Photos Quick Access */}
                  {photo.raw_photos && photo.raw_photos.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRawModalPhoto(photo)}
                      className="w-full h-8 text-[11px] gap-1.5 px-2 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800"
                    >
                      <Camera className="h-3 w-3" />
                      <span>{photo.raw_photos.length} Foto Mentahan (Tanpa Frame)</span>
                    </Button>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100">
                    <a
                      href={photo.image_url}
                      target="_blank"
                      rel="noreferrer"
                      download={`photobooth-${photo.id}.png`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-1 px-2">
                        <Download className="h-3 w-3" />
                        <span>Download Strip</span>
                      </Button>
                    </a>

                    <Link href={`/result/${photo.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="View Result Page">
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-600" />
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPhotoToDelete(photo)}
                      disabled={deletingId === photo.id}
                      className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Delete Strip"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Bulk Action Toolbar ── */}
      {selectedIds.size > 0 && (
        <aside
          aria-label="Bulk actions"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-mono font-bold">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium">
              {selectedIds.size === 1 ? '1 photo selected' : `${selectedIds.size} photos selected`}
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-700" />

          <button
            onClick={clearSelection}
            className="text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Clear
          </button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkConfirm(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Selected</span>
          </Button>
        </aside>
      )}

      {/* ── Single Delete Confirmation Dialog ── */}
      <Dialog
        open={Boolean(photoToDelete)}
        onOpenChange={(open) => !open && setPhotoToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">Delete Photo Strip?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to permanently delete photo{' '}
              <span className="font-mono font-semibold text-zinc-800">
                #{photoToDelete?.id.substring(0, 8)}
              </span>
              ? This action will remove the asset from Supabase Storage and database permanently.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhotoToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmSingleDelete}
              isLoading={deletingId === photoToDelete?.id}
            >
              Confirm Delete
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
              Delete {selectedIds.size} Photo Strips?
            </DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to permanently delete {selectedIds.size} selected photos? All files will be removed from Supabase storage and cannot be restored.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmBulkDelete}
              isLoading={isBulkDeleting}
            >
              Delete {selectedIds.size} Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Raw Photos Modal Dialog ── */}
      <Dialog
        open={Boolean(rawModalPhoto)}
        onOpenChange={(open) => !open && setRawModalPhoto(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900">
              <Camera className="h-4 w-4" />
              <span>Foto Mentahan (Tanpa Frame) — #{rawModalPhoto?.id.substring(0, 8)}</span>
            </DialogTitle>
            <DialogDescription>
              Arsip foto asli hasil kamera tanpa border dekorasi dari sesi ini ({rawModalPhoto?.raw_photos?.length || 0} foto).
            </DialogDescription>
          </DialogHeader>

          {rawModalPhoto && rawModalPhoto.raw_photos && rawModalPhoto.raw_photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
              {rawModalPhoto.raw_photos.map((rawUrl, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shadow-2xs flex flex-col">
                  <div className="relative aspect-[4/3] bg-zinc-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rawUrl}
                      alt={`Shot ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-black/75 text-white text-[9px] font-mono px-1 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                  <div className="p-2 bg-white flex items-center justify-between text-[11px] font-mono border-t border-zinc-100">
                    <span className="text-zinc-600 font-medium">Shot #{idx + 1}</span>
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={`haloluna-raw-${rawModalPhoto.id.substring(0, 8)}-shot-${idx + 1}.png`}
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
            <div className="p-8 text-center text-zinc-500 text-xs font-mono">
              Tidak ada foto mentahan yang tersimpan untuk sesi ini.
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRawModalPhoto(null)}
            >
              Tutup
            </Button>
            {rawModalPhoto && rawModalPhoto.raw_photos && rawModalPhoto.raw_photos.length > 0 && (
              <Button
                variant="default"
                size="sm"
                disabled={downloadingRaw}
                onClick={() => handleDownloadAllRaw(rawModalPhoto.id, rawModalPhoto.raw_photos || [])}
                className="gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloadingRaw ? 'Mendownload...' : `Download Semua (${rawModalPhoto.raw_photos.length} Foto)`}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
