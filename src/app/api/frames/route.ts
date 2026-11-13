import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_FRAME_THEMES,
  FrameTheme,
  StandardLayoutType,
  normalizeLayoutType,
  toLegacyLayout,
  toValidUuid,
  LEGACY_SLUG_BY_UUID,
  PRESET_DEFAULT_TEXT_CONFIGS,
  FramePreset,
} from '@/lib/frames';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: class DummyWebSocket {} as any },
  });
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PRESETS_FILE = path.join(DATA_DIR, 'frame_presets.json');

function ensureDataFile(): FrameTheme[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PRESETS_FILE)) {
      const seeded = INITIAL_FRAME_THEMES.map((f) => ({
        ...f,
        id: toValidUuid(f.id),
      }));
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    const raw = fs.readFileSync(PRESETS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_FRAME_THEMES;
  } catch (err) {
    console.warn('[Frames API] Read local data file notice:', err);
    return INITIAL_FRAME_THEMES;
  }
}

function writeDataFile(frames: FrameTheme[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(frames, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Frames API] Failed to write local data file:', err);
  }
}

function mapRowToTheme(row: any): FrameTheme {
  const nameLower = (row.name || '').toLowerCase();
  const rowId = row.id || '';
  let layoutType: StandardLayoutType;
  if (rowId === '0ddf1377-236a-5690-8c68-9493ea9e3cc0' || nameLower.includes('birthdaycat') || nameLower.includes('catpink') || (nameLower.includes('birthday') && !nameLower.includes('cinema'))) {
    layoutType = 'grid-2x3';
  } else if (nameLower.includes('halloween') || nameLower.includes('summer')) {
    layoutType = 'strip-1x3';
  } else if (nameLower.includes('retro') || nameLower.includes('terracotta')) {
    layoutType = 'grid-2x2';
  } else if (nameLower.includes('alo') || nameLower.includes('minimal')) {
    layoutType = 'strip-1x4';
  } else if (row.layout_type) {
    layoutType = normalizeLayoutType(row.layout_type);
  } else if (row.layout) {
    layoutType = normalizeLayoutType(row.layout);
  } else {
    layoutType = 'strip-1x4';
  }

  const overlayUrl = row.overlay_image_url || row.frame_image_url || undefined;
  const bgColor = row.bg_color || row.paper || '#FDFBF7';
  const legacySlug = LEGACY_SLUG_BY_UUID[row.id];

  let preset: FramePreset = 'birthday';
  if (row.id === '3b309e61-9f62-5ec6-a5af-67b549a55bd8' || legacySlug === 'retro-terracotta') {
    preset = 'retroTerracotta';
  } else if (row.id === '0ddf1377-236a-5690-8c68-9493ea9e3cc0' || legacySlug === 'birthday' || nameLower.includes('birthday')) {
    preset = 'birthdayCatPink';
  } else if (row.id === '411845a3-919e-58be-89c0-a62c597fbda7' || legacySlug === 'film-35mm') {
    preset = 'film35mm';
  } else if (layoutType === 'grid-2x2') {
    preset = 'retroTerracotta';
  } else if (layoutType === 'strip-1x3') {
    preset = 'film35mm';
  }

  const defaultTextConfig =
    preset === 'retroTerracotta'
      ? PRESET_DEFAULT_TEXT_CONFIGS.retroTerracotta
      : preset === 'birthdayCatPink'
      ? PRESET_DEFAULT_TEXT_CONFIGS.birthdayCatPink
      : preset === 'film35mm'
      ? PRESET_DEFAULT_TEXT_CONFIGS.film35mm
      : undefined;

  return {
    id: row.id,
    name: row.name,
    category: row.category || 'Standard',
    layout_type: layoutType,
    overlay_image_url: overlayUrl,
    bg_color: bgColor,
    is_active: row.is_active !== false,
    enable_text: Boolean(row.enable_text),
    default_text: row.default_text ?? '',
    text_color: row.text_color ?? '#000000',
    tagline: row.name,
    description: `${row.name} photobooth frame layout.`,
    layout: toLegacyLayout(layoutType),
    preset,
    paper: bgColor,
    ink: '#1A1A1A',
    accent: '#C4B99A',
    wash: '#F5F0E8',
    frame_image_url: overlayUrl,
    created_at: row.created_at || new Date().toISOString(),
    textConfig: defaultTextConfig,
  };
}

/**
 * GET /api/frames
 * Query parameter:
 *   ?all=true -> returns all frames (active & inactive for admin)
 *   default   -> returns only active frames (is_active === true for booth)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get('all') === 'true';

  const supabase = getAdminClient();

  if (supabase) {
    try {
      let query = supabase
        .from('frame_presets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeAll) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (!error && data) {
        if (data.length > 0) {
          const frames: FrameTheme[] = data.map(mapRowToTheme);
          if (includeAll) {
            writeDataFile(frames);
          }
          return NextResponse.json(
            { success: true, frames, source: 'supabase' },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
          );
        } else {
          // Table is empty -> Initial Seed from local presets with valid UUIDs
          const seedSources = ensureDataFile();
          const seedRows = seedSources.map((f) => ({
            id: toValidUuid(f.id),
            name: f.name,
            category: f.category || 'Standard',
            layout_type: normalizeLayoutType(f.layout_type || f.layout),
            overlay_image_url: f.overlay_image_url || f.frame_image_url || null,
            bg_color: f.bg_color || f.paper || '#FDFBF7',
            is_active: f.is_active !== false,
            enable_text: Boolean(f.enable_text),
            default_text: f.default_text ?? '',
            text_color: f.text_color ?? '#000000',
          }));

          const { error: seedErr } = await supabase.from('frame_presets').upsert(seedRows);
          if (!seedErr) {
            const { data: refetched } = await query;
            if (refetched && refetched.length > 0) {
              const frames: FrameTheme[] = refetched.map(mapRowToTheme);
              writeDataFile(frames);
              return NextResponse.json(
                { success: true, frames, source: 'supabase_seeded' },
                { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
              );
            }
          }
        }
      }
    } catch (err: unknown) {
      console.warn('[Frames API] Supabase query notice (using persistent fallback):', err);
    }
  }

  // Persistent Fallback from local data file (prevents losing frames when DB is not ready)
  const stored = ensureDataFile();
  const frames = includeAll ? stored : stored.filter((f) => f.is_active !== false);

  return NextResponse.json(
    { success: true, frames, source: 'persistent_fallback' },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

/**
 * POST /api/frames
 * Create or Upsert a frame preset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frame } = body as { frame: FrameTheme };

    if (!frame || !frame.name) {
      return NextResponse.json(
        { success: false, error: 'Invalid frame payload: name is required' },
        { status: 400 }
      );
    }

    const id = toValidUuid(frame.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `frame-${Date.now()}`));
    const layoutType = normalizeLayoutType(frame.layout_type || frame.layout);
    const overlayUrl = frame.overlay_image_url || frame.frame_image_url || undefined;
    const bgColor = frame.bg_color || frame.paper || '#FDFBF7';
    const isActive = frame.is_active !== false;

    const normalizedFrame: FrameTheme = {
      ...frame,
      id,
      layout_type: layoutType,
      layout: toLegacyLayout(layoutType),
      overlay_image_url: overlayUrl,
      frame_image_url: overlayUrl,
      bg_color: bgColor,
      paper: bgColor,
      is_active: isActive,
      created_at: frame.created_at || new Date().toISOString(),
    };

    // 1. Persist strictly to Supabase frame_presets
    const supabase = getAdminClient();
    if (supabase) {
      try {
        const row = {
          id,
          name: normalizedFrame.name,
          category: normalizedFrame.category || 'Standard',
          layout_type: layoutType,
          overlay_image_url: overlayUrl || null,
          bg_color: bgColor,
          is_active: isActive,
          enable_text: Boolean(normalizedFrame.enable_text),
          default_text: normalizedFrame.default_text ?? '',
          text_color: normalizedFrame.text_color ?? '#000000',
        };

        const { error: upsertErr } = await supabase.from('frame_presets').upsert(row);
        if (upsertErr) {
          console.warn('[Frames API] Supabase upsert error:', upsertErr.message);
        }
      } catch (dbErr) {
        console.warn('[Frames API] Supabase upsert exception:', dbErr);
      }
    }

    // 2. Also update local persistent file
    const localFrames = ensureDataFile();
    const existingIndex = localFrames.findIndex((f) => f.id === id || toValidUuid(f.id) === id);
    if (existingIndex >= 0) {
      localFrames[existingIndex] = normalizedFrame;
    } else {
      localFrames.unshift(normalizedFrame);
    }
    writeDataFile(localFrames);

    return NextResponse.json({ success: true, frame: normalizedFrame });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[Frames API] POST handler error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/frames
 * Update an existing frame preset
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body as { id: string; updates: Partial<FrameTheme> };

    if (!id || !updates) {
      return NextResponse.json(
        { success: false, error: 'Missing id or updates' },
        { status: 400 }
      );
    }

    const normalizedId = toValidUuid(id);

    // Filter updates strictly to valid Supabase columns
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.layout_type !== undefined) {
      dbUpdates.layout_type = normalizeLayoutType(updates.layout_type);
    } else if (updates.layout !== undefined) {
      dbUpdates.layout_type = normalizeLayoutType(updates.layout);
    }
    if (updates.overlay_image_url !== undefined) {
      dbUpdates.overlay_image_url = updates.overlay_image_url || null;
    } else if (updates.frame_image_url !== undefined) {
      dbUpdates.overlay_image_url = updates.frame_image_url || null;
    }
    if (updates.bg_color !== undefined) {
      dbUpdates.bg_color = updates.bg_color;
    } else if (updates.paper !== undefined) {
      dbUpdates.bg_color = updates.paper;
    }
    if (updates.is_active !== undefined) {
      dbUpdates.is_active = updates.is_active;
    }
    if (updates.enable_text !== undefined) {
      dbUpdates.enable_text = Boolean(updates.enable_text);
    }
    if (updates.default_text !== undefined) {
      dbUpdates.default_text = updates.default_text ?? '';
    }
    if (updates.text_color !== undefined) {
      dbUpdates.text_color = updates.text_color ?? '#000000';
    }

    // 1. Update Supabase
    const supabase = getAdminClient();
    if (supabase && Object.keys(dbUpdates).length > 0) {
      try {
        const { error: updateErr } = await supabase
          .from('frame_presets')
          .update(dbUpdates)
          .eq('id', normalizedId);
        if (updateErr) {
          console.warn('[Frames API] Supabase update error:', updateErr.message);
        }
      } catch (dbErr) {
        console.warn('[Frames API] Supabase update exception:', dbErr);
      }
    }

    // 2. Update local persistent storage
    const localFrames = ensureDataFile();
    const index = localFrames.findIndex(
      (f) => f.id === id || f.id === normalizedId || toValidUuid(f.id) === normalizedId
    );
    if (index >= 0) {
      localFrames[index] = {
        ...localFrames[index],
        ...updates,
        id: normalizedId,
      };
      writeDataFile(localFrames);
    }

    return NextResponse.json({ success: true, id: normalizedId, updates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[Frames API] PUT handler error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/frames
 * Delete a frame preset by id
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Frame id is required' }, { status: 400 });
    }

    const normalizedId = toValidUuid(id);

    // 1. Delete from Supabase
    const supabase = getAdminClient();
    if (supabase) {
      try {
        const { error: delErr } = await supabase
          .from('frame_presets')
          .delete()
          .eq('id', normalizedId);
        if (delErr) {
          console.warn('[Frames API] Supabase delete error:', delErr.message);
        }
      } catch (dbErr) {
        console.warn('[Frames API] Supabase delete exception:', dbErr);
      }
    }

    // 2. Delete from local persistent file
    const localFrames = ensureDataFile();
    const filtered = localFrames.filter(
      (f) => f.id !== id && f.id !== normalizedId && toValidUuid(f.id) !== normalizedId
    );
    writeDataFile(filtered);

    return NextResponse.json({ success: true, id: normalizedId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[Frames API] DELETE handler error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
