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

    return NextResponse.json({ photos: data ?? [] });
  } catch (err) {
    console.error('Admin photos API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
