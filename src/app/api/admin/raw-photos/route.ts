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
export const revalidate = 0;

export interface RawPhotoSession {
  id: string;
  image_url: string;
  storage_path: string;
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
        return NextResponse.json(
          { success: true, id: requestedId, raw_photos: [] },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            },
          }
        );
      }

      const rawPhotos = files
        .filter((f) => f.name.startsWith('shot_') || (!f.name.startsWith('.') && f.name !== 'manifest.json'))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((f) => `${supabaseUrl}/storage/v1/object/public/photos/raw/${requestedId}/${f.name}`);

      return NextResponse.json(
        { success: true, id: requestedId, raw_photos: rawPhotos },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        }
      );
    }

    // 2. Fetch all photos from DB
    const { data: photos, error: dbErr } = await supabaseAdmin
      .from('photos')
      .select('id, image_url, storage_path, template_type, location_tag, created_at')
      .order('created_at', { ascending: false });

    if (dbErr) {
      console.error('[HaloLuna] Error fetching photos in raw-photos route:', dbErr);
    }

    const photoList = photos || [];

    // 3. Resolve raw files for each session
    const sessionsWithRaw: RawPhotoSession[] = await Promise.all(
      photoList.map(async (photo) => {
        let rawPhotos: string[] = [];

        try {
          const { data: files } = await supabaseAdmin.storage
            .from('photos')
            .list(`raw/${photo.id}`);

          if (files && files.length > 0) {
            rawPhotos = files
              .filter((f) => f.name.startsWith('shot_') || (!f.name.startsWith('.') && f.name !== 'manifest.json'))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
              .map((f) => `${supabaseUrl}/storage/v1/object/public/photos/raw/${photo.id}/${f.name}`);
          }
        } catch {
          // Folder doesn't exist
        }

        return {
          id: photo.id,
          image_url: photo.image_url,
          storage_path: photo.storage_path,
          template_type: photo.template_type,
          location_tag: photo.location_tag,
          created_at: photo.created_at,
          raw_photos: rawPhotos,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        photos: sessionsWithRaw,
        sessions: sessionsWithRaw,
        totalWithRaw: sessionsWithRaw.filter((s) => s.raw_photos.length > 0).length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err) {
    console.error('[HaloLuna] /api/admin/raw-photos error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }
}
