import { notFound } from 'next/navigation';
import { Camera, MapPin, Clock, Download } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface ResultPageProps { params: { uuid: string }; }

export default async function ResultPage({ params }: ResultPageProps) {
  const supabase = createClient();

  const { data: photo, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', params.uuid)
    .single();

  if (error || !photo) notFound();

  const createdAt = new Date(photo.created_at).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      <header className="border-b border-border bg-cream/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-charcoal flex items-center justify-center shadow-tactile-sm">
            <Camera size={15} className="text-cream" />
          </div>
          <div>
            <h1 className="font-bold text-[13px] tracking-widest uppercase">Photobooth</h1>
            <p className="text-[9px] text-warm font-mono uppercase tracking-widest mt-0.5">Photo Strip Viewer</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col items-center gap-7">
        {/* Meta card */}
        <div className="w-full studio-card p-5">
          <div className="flex flex-wrap gap-4 text-xs text-warm font-mono">
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> {createdAt}
            </span>
            {(photo.location_tag || photo.location) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} /> {photo.location_tag || photo.location}
              </span>
            )}
            <span className="ml-auto uppercase">
              {photo.template_type}
              {photo.layout ? ` · ${photo.layout}` : ''}
            </span>
          </div>
        </div>

        {/* Photo strip — polaroid container */}
        <div className="w-full bg-white border border-[#E8E0D4] p-4 pb-12
          shadow-[6px_6px_18px_rgba(0,0,0,0.12)]">
          <Image
            src={photo.image_url}
            alt="Photo strip"
            width={600}
            height={900}
            className="w-full"
            unoptimized
          />
        </div>

        {/* Download */}
        <a href={photo.image_url} download target="_blank" rel="noreferrer"
          className="btn-neo-dark flex items-center gap-2 px-8 py-3 no-underline font-semibold">
          <Download size={15} /> Download Original
        </a>

        {/* CTA */}
        <div className="text-center border-t border-border pt-8 w-full">
          <p className="text-sm text-warm mb-3 font-mono">Create your own strip</p>
          <a href="/" className="btn-neo px-6 py-2.5 no-underline text-sm font-semibold">
            → Open Photobooth
          </a>
        </div>
      </main>

      <footer className="border-t border-border py-5 px-4 text-center bg-cream/60">
        <p className="text-[11px] text-warm">
          Crafted &amp; Directed by{' '}
          <span className="text-charcoal font-semibold">Andi Handika</span>
        </p>
      </footer>
    </div>
  );
}
