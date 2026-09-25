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

    // 3. Upsert record into public.photos
    let record: any = null;
    if (existingId) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('photos')
        .update({
          image_url: publicUrl,
          storage_path: storage_path,
          template_type: templateType,
          location_tag: locationTag,
        })
        .eq('id', existingId)
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .maybeSingle();

      if (!updateError && updated) {
        record = updated;
      }
    }

    if (!record) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('photos')
        .insert([
          {
            image_url: publicUrl,
            storage_path: storage_path,
            template_type: templateType,
            location_tag: locationTag,
          },
        ])
        .select('id, image_url, storage_path, template_type, location_tag, created_at')
        .single();

      if (insertError) {
        console.error('Supabase Save Error (DB Insert):', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      record = inserted;
    }

    return NextResponse.json({
      success: true,
      id: record.id,
      uuid: record.id,
      publicUrl,
      storage_path,
      resultUrl: `/result/${record.id}`,
    });
  } catch (err) {
    console.error('Supabase Save Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
