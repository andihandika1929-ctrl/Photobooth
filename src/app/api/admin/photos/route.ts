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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch photos error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize fields so both image_url / photo_url and template_type / frame_preset work seamlessly
    const photos = (data ?? []).map((row: any) => ({
      id: row.id,
      image_url: row.image_url || row.photo_url || '',
      photo_url: row.photo_url || row.image_url || '',
      storage_path: row.storage_path || '',
      template_type: row.template_type || row.frame_preset || 'editorial',
      frame_preset: row.frame_preset || row.template_type || 'editorial',
      layout: row.layout || 'strip3',
      location: row.location || null,
      created_at: row.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({ photos });
  } catch (err) {
    console.error('Admin photos API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
