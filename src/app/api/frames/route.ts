import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_FRAME_THEMES,
  FrameTheme,
  normalizeLayoutType,
  toLegacyLayout,
} from '@/lib/frames';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
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
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(INITIAL_FRAME_THEMES, null, 2), 'utf-8');
      return INITIAL_FRAME_THEMES;
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
  const layoutType = normalizeLayoutType(row.layout_type || row.layout);
  const overlayUrl = row.overlay_image_url || row.frame_image_url || undefined;
  const bgColor = row.bg_color || row.paper || '#FDFBF7';

  return {
    id: row.id,
    name: row.name,
    category: row.category || 'Standard',
    layout_type: layoutType,
    overlay_image_url: overlayUrl,
    bg_color: bgColor,
    is_active: row.is_active !== false,
    tagline: row.tagline || row.name,
    description: row.description || '',
    badge: row.badge || undefined,
    layout: toLegacyLayout(layoutType),
    preset: row.preset || 'retroTerracotta',
    paper: bgColor,
    ink: row.ink || '#1A1A1A',
    accent: row.accent || '#C4B99A',
    wash: row.wash || '#F5F0E8',
    frame_image_url: overlayUrl,
    created_at: row.created_at || new Date().toISOString(),
    textConfig: row.text_config || undefined,
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
      let query = supabase.from('frame_presets').select('*').order('created_at', { ascending: false });

      if (!includeAll) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const frames: FrameTheme[] = data.map(mapRowToTheme);
        // Sync local persistent file in background
        if (includeAll) {
          writeDataFile(frames);
        }
        return NextResponse.json(
          { success: true, frames, source: 'supabase' },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
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

    if (!frame || !frame.id || !frame.name) {
      return NextResponse.json(
        { success: false, error: 'Invalid frame payload: id and name are required' },
        { status: 400 }
      );
    }

    const layoutType = normalizeLayoutType(frame.layout_type || frame.layout);
    const overlayUrl = frame.overlay_image_url || frame.frame_image_url || undefined;
    const bgColor = frame.bg_color || frame.paper || '#FDFBF7';

    const normalizedFrame: FrameTheme = {
      ...frame,
      layout_type: layoutType,
      layout: toLegacyLayout(layoutType),
      overlay_image_url: overlayUrl,
      frame_image_url: overlayUrl,
      bg_color: bgColor,
      paper: bgColor,
      is_active: frame.is_active !== false,
      created_at: frame.created_at || new Date().toISOString(),
    };

    // 1. Always update local persistent file so data is never lost on refresh
    const localFrames = ensureDataFile();
    const existingIndex = localFrames.findIndex((f) => f.id === normalizedFrame.id);
    if (existingIndex >= 0) {
      localFrames[existingIndex] = normalizedFrame;
    } else {
      localFrames.unshift(normalizedFrame);
    }
    writeDataFile(localFrames);

    // 2. Also try Supabase table if configured
    const supabase = getAdminClient();
    if (supabase) {
      try {
        const row = {
          id: normalizedFrame.id,
          name: normalizedFrame.name,
          category: normalizedFrame.category || 'Standard',
          layout_type: layoutType,
          overlay_image_url: overlayUrl || null,
          bg_color: bgColor,
          is_active: normalizedFrame.is_active !== false,
          layout: normalizedFrame.layout,
          preset: normalizedFrame.preset || 'retroTerracotta',
          paper: bgColor,
          ink: normalizedFrame.ink || '#1A1A1A',
          accent: normalizedFrame.accent || '#C4B99A',
          wash: normalizedFrame.wash || '#F5F0E8',
          frame_image_url: overlayUrl || null,
          tagline: normalizedFrame.tagline || normalizedFrame.name,
          description: normalizedFrame.description || '',
          badge: normalizedFrame.badge || null,
          text_config: normalizedFrame.textConfig || null,
          created_at: normalizedFrame.created_at,
        };

        const { error: upsertErr } = await supabase.from('frame_presets').upsert(row);
        if (upsertErr) {
          console.warn('[Frames API] Supabase upsert notice:', upsertErr.message);
        }
      } catch (dbErr) {
        console.warn('[Frames API] Supabase upsert exception:', dbErr);
      }
    }

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

    // 1. Update local persistent storage
    const localFrames = ensureDataFile();
    const index = localFrames.findIndex((f) => f.id === id);
    if (index >= 0) {
      localFrames[index] = { ...localFrames[index], ...updates };
      writeDataFile(localFrames);
    }

    // 2. Update Supabase if configured
    const supabase = getAdminClient();
    if (supabase) {
      try {
        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.layout_type !== undefined) {
          dbUpdates.layout_type = updates.layout_type;
          dbUpdates.layout = toLegacyLayout(updates.layout_type);
        }
        if (updates.overlay_image_url !== undefined) {
          dbUpdates.overlay_image_url = updates.overlay_image_url;
          dbUpdates.frame_image_url = updates.overlay_image_url;
        }
        if (updates.bg_color !== undefined) {
          dbUpdates.bg_color = updates.bg_color;
          dbUpdates.paper = updates.bg_color;
        }
        if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

        await supabase.from('frame_presets').update(dbUpdates).eq('id', id);
      } catch (dbErr) {
        console.warn('[Frames API] Supabase update notice:', dbErr);
      }
    }

    return NextResponse.json({ success: true, id, updates });
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

    // 1. Delete from local persistent file
    const localFrames = ensureDataFile();
    const filtered = localFrames.filter((f) => f.id !== id);
    writeDataFile(filtered);

    // 2. Delete from Supabase if configured
    const supabase = getAdminClient();
    if (supabase) {
      try {
        await supabase.from('frame_presets').delete().eq('id', id);
      } catch (dbErr) {
        console.warn('[Frames API] Supabase delete notice:', dbErr);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[Frames API] DELETE handler error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
