'use client';

import { X, QrCode, Copy, Check, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ShareModalProps {
  shareUrl: string | null;
  isUploading: boolean;
  onClose: () => void;
}

export default function ShareModal({ shareUrl, isUploading, onClose }: ShareModalProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareUrl || !qrCanvasRef.current) return;
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(qrCanvasRef.current, shareUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#18181B', light: '#FFFFFF' },
      });
    });
  }, [shareUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FDFBF7] border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden text-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-4 bg-white/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">
              <QrCode size={13} />
            </div>
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Share Photobooth Strip
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Scan or copy public link
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {isUploading ? (
            <div className="text-center py-8 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Saving to cloud storage...
              </p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">
                Your QR link will appear in a moment
              </p>
            </div>
          ) : shareUrl ? (
            <>
              {/* QR Code Container */}
              <div className="border border-zinc-200 p-3 bg-white rounded-xl shadow-md">
                <canvas ref={qrCanvasRef} className="rounded-lg" />
              </div>

              <div className="text-center">
                <p className="text-xs font-semibold text-zinc-800 flex items-center justify-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  Scan with your phone camera
                </p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Direct mobile download &amp; view
                </p>
              </div>

              {/* URL Display with Copy Button */}
              <div className="w-full flex items-center border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="flex-1 px-3 py-2 text-[11px] font-mono text-zinc-600 truncate bg-white">
                  {shareUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2.5 bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-500 font-medium mb-3">
                Could not generate cloud link. You can still download the PNG directly!
              </p>
              <button
                onClick={onClose}
                className="text-xs font-bold text-zinc-800 underline underline-offset-4"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
