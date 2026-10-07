'use client';

import * as React from 'react';
import {
  UploadCloud,
  X,
  Check,
  Palette,
  Grid,
  Sparkles,
  Layers,
  AlignJustify,
} from 'lucide-react';
import {
  FrameTheme,
  StandardLayoutType,
  STANDARD_LAYOUT_DEFINITIONS,
  normalizeLayoutType,
  toLegacyLayout,
} from '@/lib/frames';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface FrameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (frame: FrameTheme, isEdit: boolean) => Promise<boolean>;
  onUploadAsset: (file: File) => Promise<string>;
  initialFrame?: FrameTheme | null;
}

const STANDARD_LAYOUT_OPTIONS: {
  id: StandardLayoutType;
  label: string;
  sublabel: string;
  shots: number;
  icon: React.ReactNode;
}[] = [
  {
    id: 'strip-1x3',
    label: 'strip-1x3',
    sublabel: '3 foto vertikal (Classic Strip)',
    shots: 3,
    icon: <AlignJustify className="w-5 h-5 text-zinc-700" />,
  },
  {
    id: 'strip-1x4',
    label: 'strip-1x4',
    sublabel: '4 foto vertikal (Korean Aesthetic Strip)',
    shots: 4,
    icon: <Layers className="w-5 h-5 text-zinc-700" />,
  },
  {
    id: 'grid-2x2',
    label: 'grid-2x2',
    sublabel: '4 foto kotak 2x2 (Scrapbook)',
    shots: 4,
    icon: <Grid className="w-5 h-5 text-zinc-700" />,
  },
];

const CATEGORIES = ['Standard', 'Birthday', 'Seasonal', 'Wedding'];

const COLOR_SWATCHES = [
  '#FDFBF7', // Studio Cream
  '#FFFFFF', // Pure White
  '#18181B', // Minimal Dark
  '#C74913', // Retro Terracotta
  '#FDEEF3', // Cat Pink
  '#EFEAE0', // Film 35mm
  '#E0E7FF', // Soft Indigo
  '#FEF3C7', // Soft Amber
];

export function FrameFormModal({
  isOpen,
  onClose,
  onSave,
  onUploadAsset,
  initialFrame,
}: FrameFormModalProps) {
  const isEdit = Boolean(initialFrame);

  // Form State
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('Seasonal');
  const [layoutType, setLayoutType] = React.useState<StandardLayoutType>('strip-1x4');
  const [bgColor, setBgColor] = React.useState('#FDFBF7');
  const [overlayImageUrl, setOverlayImageUrl] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync state when initialFrame changes or dialog opens
  React.useEffect(() => {
    if (initialFrame) {
      setName(initialFrame.name || '');
      setCategory(initialFrame.category || 'Standard');
      setLayoutType(normalizeLayoutType(initialFrame.layout_type || initialFrame.layout));
      setBgColor(initialFrame.bg_color || initialFrame.paper || '#FDFBF7');
      setOverlayImageUrl(initialFrame.overlay_image_url || initialFrame.frame_image_url || '');
      setIsActive(initialFrame.is_active !== false);
    } else {
      setName('');
      setCategory('Seasonal');
      setLayoutType('strip-1x4');
      setBgColor('#FDFBF7');
      setOverlayImageUrl('');
      setIsActive(true);
    }
    setErrorMsg('');
  }, [initialFrame, isOpen]);

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File must be an image (PNG recommended with transparency).');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      const url = await onUploadAsset(file);
      setOverlayImageUrl(url);
    } catch {
      setErrorMsg('Failed to upload image file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Frame Name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const id = isEdit && initialFrame
      ? initialFrame.id
      : name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `frame-${Date.now()}`;

    const newTheme: FrameTheme = {
      id,
      name: name.trim(),
      category,
      layout_type: layoutType,
      layout: toLegacyLayout(layoutType),
      overlay_image_url: overlayImageUrl.trim() || undefined,
      frame_image_url: overlayImageUrl.trim() || undefined,
      bg_color: bgColor,
      paper: bgColor,
      is_active: isActive,
      preset: layoutType === 'grid-2x2' ? 'retroTerracotta' : layoutType === 'strip-1x3' ? 'film35mm' : 'birthday',
      tagline: name.trim(),
      description: `${name.trim()} customized photobooth frame layout.`,
      ink: '#1A1A1A',
      accent: '#C4B99A',
      wash: '#F5F0E8',
      created_at: initialFrame?.created_at || new Date().toISOString(),
    };

    const success = await onSave(newTheme, isEdit);
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMsg('Failed to save frame. Please try again.');
    }
  };

  const selectedLayoutDef = STANDARD_LAYOUT_DEFINITIONS[layoutType];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <DialogTitle>
                {isEdit ? 'Edit Frame Preset' : 'Add New Frame Preset'}
              </DialogTitle>
              <DialogDescription>
                Configure layout grid, transparent PNG overlay border, and studio display settings.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* ── 1. Basic Info ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              1. General Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Frame Name *
                </label>
                <Input
                  placeholder="e.g. Christmas Edition 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Event Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                        category === cat
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Standard Layout Preset (Required) ── */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                2. Layout Type & Photo Slots *
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">
                {selectedLayoutDef?.shots} shots required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STANDARD_LAYOUT_OPTIONS.map((opt) => {
                const isSelected = layoutType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayoutType(opt.id)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50/80 ring-2 ring-zinc-900/10 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="p-1.5 rounded-lg bg-white border border-zinc-200 shadow-2xs">
                        {opt.icon}
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 font-mono">{opt.label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{opt.sublabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. Overlay Frame Asset (PNG Transparent) ── */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              3. Overlay Frame Asset (PNG Transparan)
            </h3>
            <p className="text-xs text-zinc-500">
              Upload file PNG transparan beresolusi tinggi dengan cutout jendela foto sesuai layout yang dipilih.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />

            {overlayImageUrl ? (
              <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-lg border border-zinc-200 overflow-hidden flex items-center justify-center p-1 shrink-0"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={overlayImageUrl}
                      alt="Overlay Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 truncate">
                      Transparent Overlay Active
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate max-w-xs sm:max-w-md">
                      {overlayImageUrl.startsWith('data:') ? 'Embedded Base64 Data' : overlayImageUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOverlayImageUrl('')}
                    title="Remove asset"
                  >
                    <X className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center hover:border-zinc-400 hover:bg-zinc-50/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="p-2.5 rounded-full bg-zinc-100 text-zinc-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-800">
                    {isUploading ? 'Uploading asset...' : 'Click or drop transparent PNG frame here'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    PNG with transparency recommended (up to 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Background Color ── */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              4. Canvas Background Color (Paper)
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-9 h-9 p-0.5 rounded-lg border border-zinc-300 cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-700 uppercase">{bgColor}</span>
              </div>

              <div className="h-4 w-px bg-zinc-200" />

              <div className="flex items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setBgColor(swatch)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      bgColor.toLowerCase() === swatch.toLowerCase()
                        ? 'scale-115 ring-2 ring-zinc-900 border-white shadow-xs'
                        : 'border-zinc-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── 5. Active Status ── */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-800">Active in Booth</p>
              <p className="text-[11px] text-zinc-500">
                Immediately available to guests on /booth and CanvasEditor
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
            </label>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? 'Saving Frame...' : isEdit ? 'Update Frame' : 'Save Frame'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
