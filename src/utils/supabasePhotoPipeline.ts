import { createClient } from '@/utils/supabase/client';

export interface SavePhotoResult {
  success: boolean;
  id?: string;
  publicUrl?: string;
  storage_path?: string;
  error?: unknown;
}

/**
 * Uploads a photo strip to Supabase Storage ('photos' bucket)
 * and inserts a record into 'public.photos' matching the exact schema:
 * - id (UUID, auto-generated)
 * - image_url (TEXT NOT NULL)
 * - storage_path (TEXT NOT NULL)
 * - template_type (TEXT NOT NULL)
 * - location_tag (TEXT, optional)
 * - created_at (TIMESTAMP)
 */
export async function savePhotoToSupabase(
  blob: Blob,
  currentTemplate: string = 'classic-strip',
  locationTag: string = 'Jakarta Studio',
  existingId?: string,
  existingStoragePath?: string
): Promise<SavePhotoResult> {
  const selectedFrame = currentTemplate || 'classic-strip';
  console.log("Starting upload for frame:", selectedFrame, "existingId:", existingId);
  console.log("Upload payload size:", blob?.size);

  const supabase = createClient();
  const storage_path = existingStoragePath || `strip_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

  try {
    // 1. Upload to Supabase Storage: bucket 'photos' with upsert
    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(storage_path, blob, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      console.error('Supabase Save Error (Storage Upload):', uploadErr);
      throw uploadErr;
    }

    // 2. Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('photos').getPublicUrl(storage_path);

    // 3. Upsert or Update DB record
    let recordId = existingId;
    if (existingId) {
      const { data: updated, error: updateErr } = await supabase
        .from('photos')
        .update({
          image_url: publicUrl,
          storage_path: storage_path,
          template_type: selectedFrame,
          location_tag: locationTag || 'Jakarta Studio',
        })
        .eq('id', existingId)
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .maybeSingle();

      if (updateErr) {
        console.error('Supabase Save Error (DB Update):', updateErr);
        throw updateErr;
      }
      if (updated) {
        recordId = updated.id;
      }
    } else {
      const { data: inserted, error: dbErr } = await supabase
        .from('photos')
        .insert([
          {
            image_url: publicUrl,
            storage_path: storage_path,
            template_type: selectedFrame,
            location_tag: locationTag || 'Jakarta Studio',
          },
        ])
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .single();

      if (dbErr) {
        console.error('Supabase Save Error (DB Insert):', dbErr);
        throw dbErr;
      }
      recordId = inserted?.id;
    }

    const res: SavePhotoResult = {
      success: true,
      id: recordId,
      publicUrl,
      storage_path,
    };
    console.log("Upload result:", res);
    return res;
  } catch (clientErr) {
    console.warn('Supabase direct client upload failed or constrained, attempting server route /api/upload fallback...', clientErr);

    // Fallback to server route /api/upload with service role fallback
    try {
      const fd = new FormData();
      fd.append('file', blob, storage_path);
      fd.append('templateType', selectedFrame);
      fd.append('locationTag', locationTag || 'Jakarta Studio');
      if (existingId) {
        fd.append('existingId', existingId);
      }
      if (storage_path) {
        fd.append('storagePath', storage_path);
      }

      const serverRes = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!serverRes.ok) {
        const errJson = await serverRes.json().catch(() => ({}));
        console.error('Supabase Save Error (server route fallback failed):', errJson);
        const res: SavePhotoResult = {
          success: false,
          error: errJson.error || `Server route returned ${serverRes.status}`,
        };
        console.log("Upload result:", res);
        return res;
      }

      const resData = await serverRes.json();
      const res: SavePhotoResult = {
        success: true,
        id: resData.id || resData.uuid,
        publicUrl: resData.publicUrl,
        storage_path: resData.storage_path || storage_path,
      };
      console.log("Upload result:", res);
      return res;
    } catch (fallbackErr) {
      console.error('Supabase Save Error (all upload pipelines failed):', fallbackErr);
      const res: SavePhotoResult = { success: false, error: fallbackErr };
      console.log("Upload result:", res);
      return res;
    }
  }
}
