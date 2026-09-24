import { Camera } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8">
        <Camera size={40} className="mx-auto mb-4 opacity-20" />
        <h1 className="font-mono text-7xl font-bold text-charcoal/10 mb-2">404</h1>
        <h2 className="font-bold text-xl mb-2">Strip not found</h2>
        <p className="text-muted text-sm max-w-xs mx-auto">
          This photo strip doesn&apos;t exist or may have been deleted.
        </p>
      </div>
      <Link href="/" className="btn-neo-filled px-6 py-2.5 text-sm no-underline">
        Back to Photobooth
      </Link>
      <p className="mt-12 text-[11px] text-muted font-mono">
        DIRECTED BY ANDI HANDIKA • 2026
      </p>
    </div>
  );
}
