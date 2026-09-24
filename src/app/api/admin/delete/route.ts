import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getAdminClient();
  try {
    const body = await request.json();
    const { ids, storagePaths } = body as { ids: string[]; storagePaths: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    if (storagePaths?.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('photos')
        .remove(storagePaths);
      if (storageError) console.error('Storage delete error:', storageError);
    }

    const { error: dbError } = await supabaseAdmin
      .from('photos')
      .delete()
      .in('id', ids);

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error('Admin delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
