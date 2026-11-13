'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Palette,
  Type,
  ExternalLink,
  Camera,
  Grid,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FrameTheme, slotsForLayout, formatLayoutLabel } from '@/lib/frames';
import { useFramePresets } from '@/lib/admin/useFramePresets';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
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
import { FrameFormModal } from '@/components/admin/FrameFormModal';

export default function FramePresetsPage() {
  const {
    frames,
    filteredFrames,
    loading,
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
  } = useFramePresets();

  // Modal states
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingFrame, setEditingFrame] = React.useState<FrameTheme | null>(null);
  const [frameToDelete, setFrameToDelete] = React.useState<FrameTheme | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Active count
  const activeCount = React.useMemo(() => {
    return frames.filter((f) => f.is_active !== false).length;
  }, [frames]);

  const handleOpenAdd = () => {
    setEditingFrame(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (frame: FrameTheme) => {
    setEditingFrame(frame);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!frameToDelete) return;
    setIsDeleting(true);
    await deleteFrame(frameToDelete.id);
    setIsDeleting(false);
    setFrameToDelete(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Frame Presets Management
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Create, edit, and toggle seasonal photobooth frames available to studio guests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFrames}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>

          {/* Primary "+ Add New Frame" button */}
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="gap-1.5 text-xs h-9 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Frame</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <p className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">Total Frames</p>
          <p className="text-xl font-bold font-mono text-zinc-900 mt-0.5">{frames.length}</p>
        </Card>

        <Card className="p-3.5 border-emerald-200/80 bg-emerald-50/20">
          <p className="text-[10px] font-mono uppercase text-emerald-700 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Active in Booth</span>
          </p>
          <p className="text-xl font-bold font-mono text-emerald-800 mt-0.5">{activeCount}</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">Inactive / Hidden</p>
          <p className="text-xl font-bold font-mono text-zinc-600 mt-0.5">{frames.length - activeCount}</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">Categories</p>
          <p className="text-xl font-bold font-mono text-zinc-900 mt-0.5">{categories.length - 1}</p>
        </Card>
      </div>

      {/* ── Search & Category Filter Toolbar ── */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search by name, layout, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mr-1 shrink-0">
              Category:
            </span>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="h-8 text-xs shrink-0"
              >
                {cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Frame Preset Cards Grid ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-400 mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Loading Studio Frame Presets...
          </p>
        </div>
      ) : filteredFrames.length === 0 ? (
        <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
            <ImageIcon className="h-6 w-6" />
          </div>
          <CardTitle className="text-base text-zinc-800">No Frame Presets Found</CardTitle>
          <CardDescription className="max-w-sm mt-1 mb-4">
            {searchQuery
              ? 'No frame preset matches your search query or filter.'
              : 'There are no custom frame presets configured yet. Add your first frame!'}
          </CardDescription>
          <Button size="sm" onClick={handleOpenAdd} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            <span>Add First Frame</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFrames.map((theme) => {
            const slots = slotsForLayout(theme.layout_type || theme.layout);
            const isActive = theme.is_active !== false;

            return (
              <Card
                key={theme.id}
                className={`flex flex-col justify-between transition-all overflow-hidden ${
                  isActive
                    ? 'border-zinc-200 hover:border-zinc-300 shadow-xs'
                    : 'border-zinc-200 bg-zinc-50/70 opacity-75'
                }`}
              >
                {/* Header & Status Control */}
                <CardHeader className="pb-3 border-b border-zinc-100 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={isActive ? 'default' : 'outline'} className="text-[10px] font-mono">
                        {theme.category || 'Standard'}
                      </Badge>
                      <span className="text-[10px] font-mono text-zinc-500 font-semibold flex items-center gap-1">
                        <Grid className="h-3 w-3" />
                        <span>{formatLayoutLabel(theme.layout_type || theme.layout)}</span>
                      </span>
                    </div>

                    {/* Switch Toggle: Active / Inactive */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => toggleActive(theme.id)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                      }`}
                      title={isActive ? 'Click to hide from booth' : 'Click to enable in booth'}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                        }`}
                      />
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  <CardTitle className="text-base text-zinc-900">{theme.name}</CardTitle>
                  <CardDescription className="text-xs text-zinc-500 font-mono truncate mt-0.5">
                    &ldquo;{theme.tagline}&rdquo;
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Visual Asset or Mini-Canvas Mockup */}
                  <div
                    className="relative aspect-[16/9] rounded-xl overflow-hidden flex items-center justify-center p-3 border shadow-2xs"
                    style={{
                      backgroundColor: theme.bg_color || theme.paper || '#FDFBF7',
                      borderColor: theme.accent || '#E8DFCE',
                    }}
                  >
                    {(theme.overlay_image_url || theme.frame_image_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={theme.overlay_image_url || theme.frame_image_url}
                        alt={theme.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2">
                        <div
                          className="h-7 w-20 rounded border flex items-center justify-center text-[10px] font-bold font-mono shadow-2xs mb-1"
                          style={{
                            backgroundColor: theme.wash,
                            color: theme.ink,
                            borderColor: theme.accent,
                          }}
                        >
                          {slots} Shots
                        </div>
                        <span
                          className="text-[9px] font-mono tracking-wider uppercase font-semibold"
                          style={{ color: theme.ink }}
                        >
                          {theme.textConfig?.defaultText || 'HaloLuna Studio'}
                        </span>
                      </div>
                    )}

                    {!isActive && (
                      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <EyeOff className="h-4 w-4" />
                        <span>Hidden in Booth</span>
                      </div>
                    )}
                  </div>

                  {/* Palette Specifications */}
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 space-y-1.5">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <Palette className="h-3 w-3" />
                      <span>Palette</span>
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="space-y-0.5 text-center">
                        <div
                          className="h-5 w-full rounded border border-zinc-300"
                          style={{ backgroundColor: theme.paper }}
                          title={`Paper: ${theme.paper}`}
                        />
                        <span className="text-[8px] font-mono text-zinc-500">Paper</span>
                      </div>
                      <div className="space-y-0.5 text-center">
                        <div
                          className="h-5 w-full rounded border border-zinc-300"
                          style={{ backgroundColor: theme.ink }}
                          title={`Ink: ${theme.ink}`}
                        />
                        <span className="text-[8px] font-mono text-zinc-500">Ink</span>
                      </div>
                      <div className="space-y-0.5 text-center">
                        <div
                          className="h-5 w-full rounded border border-zinc-300"
                          style={{ backgroundColor: theme.accent }}
                          title={`Accent: ${theme.accent}`}
                        />
                        <span className="text-[8px] font-mono text-zinc-500">Accent</span>
                      </div>
                      <div className="space-y-0.5 text-center">
                        <div
                          className="h-5 w-full rounded border border-zinc-300"
                          style={{ backgroundColor: theme.wash }}
                          title={`Wash: ${theme.wash}`}
                        />
                        <span className="text-[8px] font-mono text-zinc-500">Wash</span>
                      </div>
                    </div>
                  </div>

                  {/* Typography / Canvas Text Spec */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-100 pt-2.5">
                    <span className="flex items-center gap-1">
                      <Type className="h-3 w-3 text-zinc-400" />
                      <span>Teks di Kanvas:</span>
                    </span>
                    {theme.enable_text ? (
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-zinc-300 shrink-0"
                          style={{ backgroundColor: theme.text_color || '#000000' }}
                          title={`Warna: ${theme.text_color || '#000000'}`}
                        />
                        <span className="truncate text-zinc-800 font-semibold" title={theme.default_text || '(Default teks kosong)'}>
                          {theme.default_text ? `"${theme.default_text}"` : 'Aktif (Kosong)'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 font-medium">Nonaktif</span>
                    )}
                  </div>
                </CardContent>

                {/* Footer Controls: Edit, Delete, Test in Booth */}
                <CardFooter className="pt-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(theme)}
                      className="h-8 text-xs gap-1.5 px-2.5"
                      title="Edit frame preset"
                    >
                      <Pencil className="h-3.5 w-3.5 text-zinc-600" />
                      <span>Edit</span>
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFrameToDelete(theme)}
                      className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Delete frame preset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Test in Booth */}
                  <Link
                    href={`/booth?frame=${theme.id}`}
                    target="_blank"
                  >
                    <Button
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      className="h-8 text-xs gap-1 px-2.5"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Test</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Frame Form Modal ── */}
      <FrameFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingFrame(null);
        }}
        onSave={saveFrame}
        onUploadAsset={uploadFrameAsset}
        initialFrame={editingFrame}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={Boolean(frameToDelete)}
        onOpenChange={(open) => !open && setFrameToDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">Delete Frame Preset?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to permanently delete frame{' '}
              <span className="font-semibold text-zinc-900">
                &ldquo;{frameToDelete?.name}&rdquo;
              </span>
              ? Guests will no longer be able to select this layout in the booth.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFrameToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              Delete Frame
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
