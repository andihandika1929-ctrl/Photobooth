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
  locationTag: string = 'Jakarta Studio'
): Promise<SavePhotoResult> {
  const supabase = createClient();
  const storage_path = `strip_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

  try {
    // 1. Upload to Supabase Storage: bucket 'photos'
    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(storage_path, blob, { contentType: 'image/png' });

    if (uploadErr) {
      console.error('Supabase Save Error (Storage Upload):', uploadErr);
      throw uploadErr;
    }

    // 2. Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('photos').getPublicUrl(storage_path);

    // 3. Insert to DB with exact column names:
    const { data: inserted, error: dbErr } = await supabase
      .from('photos')
      .insert([
        {
          image_url: publicUrl,
          storage_path: storage_path,
          template_type: currentTemplate || 'classic-strip',
          location_tag: locationTag || 'Jakarta Studio',
        },
      ])
      .select('id, image_url, storage_path, template_type, location_tag, created_at')
      .single();

    if (dbErr) {
      console.error('Supabase Save Error (DB Insert):', dbErr);
      throw dbErr;
    }

    return {
      success: true,
      id: inserted?.id,
      publicUrl,
      storage_path,
    };
  } catch (clientErr) {
    console.error('Supabase Save Error (client attempt):', clientErr);

    // Fallback to server route /api/upload with service role fallback
    try {
      const fd = new FormData();
      fd.append('file', blob, storage_path);
      fd.append('templateType', currentTemplate);
      fd.append('locationTag', locationTag);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('Supabase Save Error (server route fallback):', errJson);
        throw new Error(errJson.error || 'Server upload failed');
      }

      const resData = await res.json();
      return {
        success: true,
        id: resData.id || resData.uuid,
        publicUrl: resData.publicUrl,
        storage_path: resData.storage_path || storage_path,
      };
    } catch (fallbackErr) {
      console.error('Supabase Save Error (all attempts failed):', fallbackErr);
      return { success: false, error: fallbackErr };
    }
  }
}
