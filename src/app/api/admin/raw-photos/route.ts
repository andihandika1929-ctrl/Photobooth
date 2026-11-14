import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const dynamic = 'force-dynamic';

export interface RawPhotoSession {
  id: string;
  image_url: string;
  template_type: string;
  location_tag?: string | null;
  created_at: string;
  raw_photos: string[];
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = getAdminClient();
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get('id');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // 1. Single session lookup
    if (requestedId) {
      const { data: files, error: filesErr } = await supabaseAdmin.storage
        .from('photos')
        .list(`raw/${requestedId}`);

      if (filesErr || !files || files.length === 0) {
        return NextResponse.json({ success: true, id: requestedId, raw_photos: [] });
      }

      const rawPhotos = files
        .filter((f) => f.name.startsWith('shot_'))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((f) => `${supabaseUrl}/storage/v1/object/public/photos/raw/${requestedId}/${f.name}`);

      return NextResponse.json({ success: true, id: requestedId, raw_photos: rawPhotos });
    }

    // 2. Fetch all raw photo folders
    const { data: rawFolders } = await supabaseAdmin.storage
      .from('photos')
      .list('raw', { limit: 200 });

    const rawFolderNames = new Set(
      (rawFolders || [])
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => f.name)
    );

    // 3. Fetch all photos from DB
    const { data: photos, error: dbErr } = await supabaseAdmin
      .from('photos')
      .select('id, image_url, template_type, location_tag, created_at')
      .order('created_at', { ascending: false });

    if (dbErr) {
      console.error('[HaloLuna] Error fetching photos in raw-photos route:', dbErr);
    }

    const photoList = photos || [];

    // 4. Resolve raw files for sessions that have raw folders
    const sessionsWithRaw: RawPhotoSession[] = await Promise.all(
      photoList.map(async (photo) => {
        let rawPhotos: string[] = [];

        if (rawFolderNames.has(photo.id)) {
          const { data: files } = await supabaseAdmin.storage
            .from('photos')
            .list(`raw/${photo.id}`);

          if (files && files.length > 0) {
            rawPhotos = files
              .filter((f) => f.name.startsWith('shot_'))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
              .map((f) => `${supabaseUrl}/storage/v1/object/public/photos/raw/${photo.id}/${f.name}`);
          }
        }

        return {
          id: photo.id,
          image_url: photo.image_url,
          template_type: photo.template_type,
          location_tag: photo.location_tag,
          created_at: photo.created_at,
          raw_photos: rawPhotos,
        };
      })
    );

    return NextResponse.json({
      success: true,
      sessions: sessionsWithRaw,
      totalWithRaw: sessionsWithRaw.filter((s) => s.raw_photos.length > 0).length,
    });
  } catch (err) {
    console.error('[HaloLuna] /api/admin/raw-photos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
