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

export async function GET(request: NextRequest) {
  const supabaseAdmin = getAdminClient();
  const { searchParams } = new URL(request.url);
  // Optional cache buster reading
  const _t = searchParams.get('t') || Date.now().toString();

  try {
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('id, image_url, storage_path, template_type, location_tag, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch photos error:', error);
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'CDN-Cache-Control': 'no-store',
            'Vercel-CDN-Cache-Control': 'no-store',
          },
        }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const photoList = data ?? [];

    // Directly query raw storage for each session in parallel
    const photosWithRaw = await Promise.all(
      photoList.map(async (p) => {
        let raw_photos: string[] = [];
        try {
          const { data: files } = await supabaseAdmin.storage
            .from('photos')
            .list(`raw/${p.id}`);

          if (files && files.length > 0) {
            raw_photos = files
              .filter((f) => f.name.startsWith('shot_') || (!f.name.startsWith('.') && f.name !== 'manifest.json'))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
              .map((f) => `${supabaseUrl}/storage/v1/object/public/photos/raw/${p.id}/${f.name}`);
          }
        } catch {
          // Folder doesn't exist for older sessions - continue
        }

        return {
          id: p.id,
          image_url: p.image_url,
          storage_path: p.storage_path,
          template_type: p.template_type,
          location_tag: p.location_tag,
          created_at: p.created_at,
          raw_photos,
        };
      })
    );

    return NextResponse.json(
      {
        photos: photosWithRaw,
        total: photosWithRaw.length,
        totalRaw: photosWithRaw.reduce((acc, p) => acc + p.raw_photos.length, 0),
        timestamp: _t,
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
    console.error('Admin photos API error:', err);
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
