import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAdmin = getAdminClient();
  try {
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('id, image_url, storage_path, template_type, location_tag, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch photos error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const { data: rawFolders } = await supabaseAdmin.storage
      .from('photos')
      .list('raw', { limit: 200 });

    const rawFolderNames = new Set(
      (rawFolders || [])
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => f.name)
    );

    const photosWithRaw = await Promise.all(
      (data ?? []).map(async (p) => {
        let raw_photos: string[] = [];
        if (rawFolderNames.has(p.id)) {
          const { data: files } = await supabaseAdmin.storage
            .from('photos')
            .list(`raw/${p.id}`);
          if (files && files.length > 0) {
            raw_photos = files
              .filter((f) => f.name.startsWith('shot_'))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
              .map((f) => `${supabaseUrl}/storage/v1/object/public/photos/raw/${p.id}/${f.name}`);
          }
        }
        return {
          ...p,
          raw_photos,
        };
      })
    );

    return NextResponse.json({ photos: photosWithRaw });
  } catch (err) {
    console.error('Admin photos API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
