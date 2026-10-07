import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `upload-${Date.now()}-${cleanName}`;

    // 1. Try Supabase Storage first
    const supabase = getAdminClient();
    if (supabase) {
      try {
        const uploadPath = `frames/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(uploadPath, buffer, {
            contentType: file.type || 'image/png',
            upsert: true,
          });

        if (!uploadError) {
          const { data } = supabase.storage.from('photos').getPublicUrl(uploadPath);
          if (data?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: data.publicUrl,
              source: 'supabase_storage',
            });
          }
        } else {
          console.warn('[Upload API] Supabase storage upload notice:', uploadError.message);
        }
      } catch (err) {
        console.warn('[Upload API] Supabase storage exception:', err);
      }
    }

    // 2. Fallback: Save directly to public/frames/ on server
    const publicFramesDir = path.join(process.cwd(), 'public', 'frames');
    if (!fs.existsSync(publicFramesDir)) {
      fs.mkdirSync(publicFramesDir, { recursive: true });
    }

    const localFilePath = path.join(publicFramesDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const localUrl = `/frames/${fileName}`;
    return NextResponse.json({
      success: true,
      url: localUrl,
      source: 'local_public_storage',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('[Upload API] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
