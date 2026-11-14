import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Fall back to anon key if service role key not set
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabaseAdmin = getAdminClient();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const templateType = (formData.get('templateType') || formData.get('framePreset') || 'classic-strip') as string;
    const locationTag = (formData.get('locationTag') || formData.get('location') || 'Jakarta Studio') as string;

    // Birthday guest metadata (Task 2.3)
    const guestName = ((formData.get('guestName') || '') as string).trim();
    const rawGuestAge = ((formData.get('guestAge') || '') as string).replace(/\D/g, '');
    const guestAge = rawGuestAge ? parseInt(rawGuestAge, 10) : null;

    const isBirthdayFrame = templateType === 'birthday' || templateType === 'birthdayCatPink';

    const rawExistingId = (formData.get('existingId') || formData.get('id')) as string | null;
    const existingId = (rawExistingId && rawExistingId !== 'undefined' && rawExistingId !== 'null' && rawExistingId.trim() !== '') ? rawExistingId.trim() : null;

    let rawStoragePath = (formData.get('storagePath') || formData.get('existingStoragePath')) as string | null;
    let storage_path = (rawStoragePath && rawStoragePath !== 'undefined' && rawStoragePath !== 'null' && rawStoragePath.trim() !== '') ? rawStoragePath.trim() : null;

    if (!storage_path) {
      storage_path = `strip_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Upload to Supabase Storage → 'photos' bucket with upsert
    const { error: uploadError } = await supabaseAdmin.storage
      .from('photos')
      .upload(storage_path, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase Save Error: Storage upload failed:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('photos').getPublicUrl(storage_path);

    // 3. Upsert session (birthday frames only, when guest data is present)
    let sessionId: string | null = null;
    if (isBirthdayFrame && (guestName || guestAge !== null)) {
      const sessionPayload: Record<string, unknown> = {
        template_type: templateType,
        location_tag: locationTag,
        ...(guestName           ? { guest_name: guestName } : {}),
        ...(guestAge !== null   ? { guest_age:  guestAge  } : {}),
      };

      const { data: sessionRow, error: sessionErr } = await supabaseAdmin
        .from('sessions')
        .insert([sessionPayload])
        .select('id')
        .single();

      if (sessionErr) {
        // Non-fatal — sessions table may not exist yet in some envs; continue without
        console.warn('[HaloLuna] /api/upload: sessions insert warning (non-fatal):', sessionErr.message);
      } else {
        sessionId = (sessionRow as { id: string } | null)?.id ?? null;
      }
    }

    // 4. Upsert record into public.photos
    const photoPayload: Record<string, unknown> = {
      image_url: publicUrl,
      storage_path,
      template_type: templateType,
      location_tag: locationTag,
      ...(sessionId ? { session_id: sessionId } : {}),
    };

    let record: Record<string, unknown> | null = null;
    if (existingId) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('photos')
        .update(photoPayload)
        .eq('id', existingId)
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .maybeSingle();

      if (!updateError && updated) {
        record = updated as Record<string, unknown>;
      }
    }

    if (!record) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('photos')
        .insert([photoPayload])
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .single();

      if (insertError) {
        console.error('Supabase Save Error (DB Insert):', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      record = inserted as Record<string, unknown>;
    }

    // 5. Process and upload Raw Photos (Foto Mentahan Tanpa Frame)
    const rawPhotosJson = formData.get('rawPhotos') as string | null;
    const uploadedRawUrls: string[] = [];

    if (rawPhotosJson) {
      try {
        const rawPhotosList = JSON.parse(rawPhotosJson);
        if (Array.isArray(rawPhotosList) && rawPhotosList.length > 0) {
          for (let i = 0; i < rawPhotosList.length; i++) {
            const rawItem = rawPhotosList[i];
            if (!rawItem || typeof rawItem !== 'string') continue;

            let buffer: Buffer;
            let ext = 'jpg';
            let contentType = 'image/jpeg';

            if (rawItem.startsWith('data:image/')) {
              const matches = rawItem.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
              if (matches) {
                contentType = matches[1];
                ext = contentType.includes('png') ? 'png' : 'jpg';
                buffer = Buffer.from(matches[2], 'base64');
              } else {
                continue;
              }
            } else if (rawItem.startsWith('http://') || rawItem.startsWith('https://')) {
              uploadedRawUrls.push(rawItem);
              continue;
            } else {
              continue;
            }

            const rawPath = `raw/${record.id}/shot_${i + 1}.${ext}`;
            const { error: rawUploadErr } = await supabaseAdmin.storage
              .from('photos')
              .upload(rawPath, buffer, {
                contentType,
                cacheControl: '3600',
                upsert: true,
              });

            if (!rawUploadErr) {
              const { data: { publicUrl: rawPublicUrl } } = supabaseAdmin.storage
                .from('photos')
                .getPublicUrl(rawPath);
              uploadedRawUrls.push(rawPublicUrl);
            } else {
              console.warn('[HaloLuna] Raw photo upload notice:', rawUploadErr.message);
            }
          }

          // Upload manifest.json for this session's raw photos
          if (uploadedRawUrls.length > 0) {
            const manifest = {
              photo_id: record.id,
              template_type: templateType,
              location_tag: locationTag,
              created_at: new Date().toISOString(),
              raw_photos: uploadedRawUrls,
            };
            await supabaseAdmin.storage
              .from('photos')
              .upload(`raw/${record.id}/manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2)), {
                contentType: 'application/json',
                upsert: true,
              });

            // Try updating raw_photos in DB (silent ignore if column not present)
            try {
              await supabaseAdmin
                .from('photos')
                .update({ raw_photos: uploadedRawUrls } as Record<string, unknown>)
                .eq('id', record.id);
            } catch {
              // DB schema might not have raw_photos column yet; manifest.json in storage is preserved
            }
          }
        }
      } catch (rawErr) {
        console.warn('[HaloLuna] Processing raw photos notice:', rawErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: record.id,
      uuid: record.id,
      sessionId,
      publicUrl,
      storage_path,
      rawPhotos: uploadedRawUrls,
      resultUrl: `/result/${record.id}`,
    });
  } catch (err) {
    console.error('Supabase Save Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
