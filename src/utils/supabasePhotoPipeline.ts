import { createClient } from '@/utils/supabase/client';

export interface SavePhotoResult {
  success: boolean;
  id?: string;
  sessionId?: string;
  publicUrl?: string;
  storage_path?: string;
  rawPhotos?: string[];
  error?: unknown;
}

export interface SavePhotoOptions {
  /** e.g. 'birthday', 'birthdayCatPink', 'film35mm' */
  templateType?: string;
  /** Human-readable studio tag, e.g. 'SEOUL STUDIO' */
  locationTag?: string;
  /** Raw birthday name from the input field (only for birthday presets) */
  guestName?: string;
  /** Raw birthday age digits (only for birthday presets) */
  guestAge?: string;
  /** Re-use an existing photos row (for updates) */
  existingPhotoId?: string;
  /** Re-use the same storage path (skip generating a new one) */
  existingStoragePath?: string;
  /** Array of raw un-framed photo data URLs or blobs */
  rawPhotos?: string[];
}

/**
 * Phase 2 (Task 2.2 / 2.3) background sync pipeline.
 *
 * 1. Uploads the blob to Supabase Storage bucket 'photos'.
 * 2. Upserts a row in `public.sessions` with guest_name / guest_age.
 * 3. Inserts / updates a row in `public.photos` linked via session_id.
 * 4. If the Supabase JS client is blocked by RLS, silently falls back to
 *    the server-side /api/upload route (which uses the service role key).
 *
 * This function NEVER throws — all errors are captured and returned as
 * { success: false, error }. Callers should treat failures as advisory.
 */
export async function savePhotoToSupabase(
  blob: Blob,
  templateTypeOrOptions: string | SavePhotoOptions = 'classic-strip',
  locationTagArg: string = 'Jakarta Studio',
  existingIdArg?: string,
  existingStoragePathArg?: string,
): Promise<SavePhotoResult> {
  // ── Normalise overloaded signature ──────────────────────────────────────
  let opts: SavePhotoOptions;
  if (typeof templateTypeOrOptions === 'string') {
    opts = {
      templateType: templateTypeOrOptions,
      locationTag: locationTagArg,
      existingPhotoId: existingIdArg,
      existingStoragePath: existingStoragePathArg,
    };
  } else {
    opts = templateTypeOrOptions;
  }

  const selectedFrame   = opts.templateType      || 'classic-strip';
  const locationTag     = opts.locationTag        || 'Jakarta Studio';
  const guestName       = (opts.guestName  || '').trim();
  const guestAge        = (opts.guestAge   || '').replace(/\D/g, '');
  const isBirthdayFrame = selectedFrame === 'birthday' || selectedFrame === 'birthdayCatPink';

  const cleanExistingId   = sanitiseId(opts.existingPhotoId);
  const cleanStoragePath  = sanitiseId(opts.existingStoragePath);

  const storagePath = cleanStoragePath
    || `strip_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

  console.log('[HaloLuna] savePhotoToSupabase → frame:', selectedFrame,
    '| guest:', guestName || '—',
    '| age:', guestAge || '—',
    '| rawPhotos:', opts.rawPhotos?.length || 0,
    '| size:', blob?.size);

  // If raw photos are included, use the server-side pipeline which has full
  // service-role storage permissions to write to raw/ and create manifests.
  if (opts.rawPhotos && opts.rawPhotos.length > 0) {
    return _serverFallback({
      blob,
      storagePath,
      selectedFrame,
      locationTag,
      guestName: isBirthdayFrame ? guestName : '',
      guestAge:  isBirthdayFrame ? guestAge  : '',
      cleanExistingId,
      rawPhotos: opts.rawPhotos,
    });
  }

  // ── Attempt client-side pipeline ─────────────────────────────────────────
  try {
    const supabase = createClient();

    // 1. Storage upload
    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(storagePath, blob, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      console.warn('[HaloLuna] Storage upload blocked by RLS, will fall back:', uploadErr.message);
      throw uploadErr;
    }

    // 2. Public URL
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(storagePath);

    // 3. Session upsert (only for birthday presets that carry guest data)
    let sessionId: string | undefined;
    if (isBirthdayFrame && (guestName || guestAge)) {
      const sessionPayload: Record<string, unknown> = {
        template_type: selectedFrame,
        location_tag:  locationTag,
        ...(guestName ? { guest_name: guestName } : {}),
        ...(guestAge  ? { guest_age:  parseInt(guestAge, 10) } : {}),
      };

      const { data: sessionRow, error: sessionErr } = await supabase
        .from('sessions')
        .insert([sessionPayload])
        .select('id')
        .single();

      if (sessionErr) {
        // Non-fatal: log and continue without session linkage
        console.warn('[HaloLuna] sessions insert warning (non-fatal):', sessionErr.message);
      } else {
        sessionId = sessionRow?.id as string | undefined;
      }
    }

    // 4. Photos upsert / insert
    let recordId = cleanExistingId;
    const photoPayload: Record<string, unknown> = {
      image_url:     publicUrl,
      storage_path:  storagePath,
      template_type: selectedFrame,
      location_tag:  locationTag,
      ...(sessionId ? { session_id: sessionId } : {}),
    };

    if (cleanExistingId) {
      const { data: updated, error: updateErr } = await supabase
        .from('photos')
        .update(photoPayload)
        .eq('id', cleanExistingId)
        .select('id')
        .maybeSingle();

      if (updateErr) {
        console.warn('[HaloLuna] photos update warning:', updateErr.message);
        throw updateErr;
      }
      if (updated) {
        recordId = (updated as { id: string }).id;
      } else {
        // RLS prevents anon update, force fallback to /api/upload with service role
        throw new Error('Client-side update returned null (RLS restricted)');
      }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('photos')
        .insert([photoPayload])
        .select('id')
        .single();

      if (insertErr) {
        console.warn('[HaloLuna] photos insert warning:', insertErr.message);
        throw insertErr;
      }
      recordId = (inserted as { id: string } | null)?.id;
    }

    const result: SavePhotoResult = {
      success: true,
      id: recordId,
      sessionId,
      publicUrl,
      storage_path: storagePath,
    };
    console.log('[HaloLuna] savePhotoToSupabase ✓ client-side', result);
    return result;

  } catch (clientErr) {
    // ── Server-side fallback via /api/upload (service role key) ────────────
    console.warn('[HaloLuna] Client pipeline failed — falling back to /api/upload:', clientErr);
    return _serverFallback({
      blob,
      storagePath,
      selectedFrame,
      locationTag,
      guestName: isBirthdayFrame ? guestName : '',
      guestAge:  isBirthdayFrame ? guestAge  : '',
      cleanExistingId,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitiseId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  return (t && t !== 'undefined' && t !== 'null') ? t : undefined;
}

async function _serverFallback(params: {
  blob: Blob;
  storagePath: string;
  selectedFrame: string;
  locationTag: string;
  guestName: string;
  guestAge: string;
  cleanExistingId: string | undefined;
  rawPhotos?: string[];
}): Promise<SavePhotoResult> {
  const { blob, storagePath, selectedFrame, locationTag, guestName, guestAge, cleanExistingId, rawPhotos } = params;
  try {
    const fd = new FormData();
    fd.append('file', blob, storagePath);
    fd.append('templateType', selectedFrame);
    fd.append('locationTag', locationTag);
    if (guestName) fd.append('guestName', guestName);
    if (guestAge)  fd.append('guestAge',  guestAge);
    if (cleanExistingId) fd.append('existingId', cleanExistingId);
    fd.append('storagePath', storagePath);
    if (rawPhotos && rawPhotos.length > 0) {
      fd.append('rawPhotos', JSON.stringify(rawPhotos));
    }

    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.error('[HaloLuna] /api/upload fallback failed:', errJson);
      return { success: false, error: errJson.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    const result: SavePhotoResult = {
      success: true,
      id:            data.id || data.uuid,
      sessionId:     data.sessionId,
      publicUrl:     data.publicUrl,
      storage_path:  data.storage_path || storagePath,
      rawPhotos:     data.rawPhotos || [],
    };
    console.log('[HaloLuna] savePhotoToSupabase ✓ server fallback', result);
    return result;
  } catch (fallbackErr) {
    console.error('[HaloLuna] All upload pipelines failed:', fallbackErr);
    return { success: false, error: fallbackErr };
  }
}
