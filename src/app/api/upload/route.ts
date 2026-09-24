import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Fall back to anon key if service role key not set (upload only needs anon + RLS INSERT)
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getAdminClient();

  try {
    const formData    = await request.formData();
    const file        = formData.get('file')        as File | null;
    const framePreset = (formData.get('framePreset') as string) || 'editorial';
    const layout      = (formData.get('layout')      as string) || 'strip3';
    const location    = (formData.get('location')    as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const uuid     = uuidv4();
    const fileName = `${uuid}.png`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage → 'photos' bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from('photos')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Save Error: Storage upload failed:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('photos')
      .getPublicUrl(fileName);

    const nowIso = new Date().toISOString();

    // Primary DB insert attempt (using image_url & template_type per supabase-setup.sql)
    let { error: insertError } = await supabaseAdmin
      .from('photos')
      .insert({
        id: uuid,
        image_url: publicUrl,
        storage_path: fileName,
        template_type: framePreset,
        layout,
        location,
        created_at: nowIso,
      });

    // Fallback DB insert attempt (in case table columns are named photo_url & frame_preset)
    if (insertError) {
      console.error("Supabase Save Error (attempt 1 failed, trying fallback columns):", insertError);
      const fallbackAttempt = await supabaseAdmin
        .from('photos')
        .insert({
          id: uuid,
          photo_url: publicUrl,
          storage_path: fileName,
          frame_preset: framePreset,
          layout,
          location,
          created_at: nowIso,
        });

      if (fallbackAttempt.error) {
        console.error("Supabase Save Error:", fallbackAttempt.error);
        insertError = fallbackAttempt.error;
      } else {
        insertError = null;
      }
    }

    return NextResponse.json({
      success:   true,
      uuid,
      publicUrl,
      resultUrl: `/result/${uuid}`,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
