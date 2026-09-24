'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Upload, RotateCcw, Zap, AlertCircle, FlipHorizontal } from 'lucide-react';
import { playCountdownBeep, playFlashSound, initAudio } from './AudioEngine';

export type FilterName = 'natural' | 'bw' | 'vintage' | 'cyber';

const FILTERS: { id: FilterName; label: string; css: string }[] = [
  { id: 'natural', label: 'Natural',  css: '' },
  { id: 'bw',      label: 'B&W',      css: 'grayscale(100%) contrast(125%) brightness(92%)' },
  { id: 'vintage', label: 'Vintage',  css: 'sepia(45%) contrast(108%) brightness(106%) saturate(75%)' },
  { id: 'cyber',   label: 'Cyber',    css: 'hue-rotate(170deg) saturate(180%) contrast(115%)' },
];

interface CameraViewportProps {
  onCapture: (imageDataUrl: string, filter: FilterName) => void;
  isCapturing: boolean;
  capturedCount: number;
  totalFrames: number;
}

export default function CameraViewport({
  onCapture,
  isCapturing,
  capturedCount,
  totalFrames,
}: CameraViewportProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const flashRef    = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [hasCamera,    setHasCamera]    = useState(false);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterName>('natural');
  const [countdown,    setCountdown]    = useState<number | null>(null);
  const [isMirrored,   setIsMirrored]   = useState(true);
  const [isLoading,    setIsLoading]    = useState(true);
  const [countKey,     setCountKey]     = useState(0); // forces re-render for animation reset

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCamera(true);
    } catch (err: unknown) {
      const error = err as Error;
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and refresh.'
          : 'Camera unavailable. Upload photos instead.'
      );
      setHasCamera(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCamera]);

  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    // Use square crop for Korean booth feel
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 480);
    const offsetX = ((video.videoWidth || 640) - size) / 2;
    const offsetY = ((video.videoHeight || 480) - size) / 2;

    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isMirrored) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    const filterObj = FILTERS.find(f => f.id === activeFilter);
    if (filterObj?.css) ctx.filter = filterObj.css;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';

    onCapture(canvas.toDataURL('image/jpeg', 0.96), activeFilter);
  }, [activeFilter, isMirrored, onCapture]);

  const startCountdown = useCallback(() => {
    if (countdown !== null || !isCapturing) return;
    initAudio();
    let count = 3;
    setCountdown(count);
    setCountKey(k => k + 1);
    playCountdownBeep(3);

    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        setCountKey(k => k + 1);
        playCountdownBeep(count as 1 | 2 | 3);
      } else {
        setCountdown(null);
        clearInterval(countdownRef.current!);
        if (flashRef.current) {
          flashRef.current.classList.add('active');
          setTimeout(() => flashRef.current?.classList.remove('active'), 300);
        }
        playFlashSound();
        setTimeout(captureFrame, 80);
      }
    }, 1000);
  }, [countdown, isCapturing, captureFrame]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCapture(ev.target?.result as string, activeFilter);
    reader.readAsDataURL(file);
  }, [activeFilter, onCapture]);

  const filterStyle = FILTERS.find(f => f.id === activeFilter)?.css ?? '';

  return (
    <div className="flex flex-col gap-4">
      {/* Flash overlay */}
      <div ref={flashRef} className="flash-overlay" />

      {/* Monitor container */}
      <div className="relative">
        {/* Monitor bezel */}
        <div className="rounded-2xl overflow-hidden monitor-glow bg-[#1A1A1A] p-3 pb-4">
          {/* Top bar with REC indicator */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B3B] rec-blink inline-block" />
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                {isCapturing
                  ? `REC  ${capturedCount}/${totalFrames}`
                  : countdown !== null
                  ? `SHOOT`
                  : `LIVE`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMirrored(m => !m)}
                className="text-white/40 hover:text-white/80 transition-colors"
                title="Flip mirror"
              >
                <FlipHorizontal size={13} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-white/40 hover:text-white/80 transition-colors"
                title="Upload photo"
              >
                <Upload size={13} />
              </button>
            </div>
          </div>

          {/* Camera viewport */}
          <div className="relative overflow-hidden rounded-xl bg-black aspect-square">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
                <Camera className="text-white/30 animate-pulse mb-2" size={28} />
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  Initializing lens...
                </p>
              </div>
            )}

            {cameraError && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/90 p-5">
                <AlertCircle className="text-amber-400 mb-2" size={24} />
                <p className="text-white/70 text-xs font-mono text-center mb-4 leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex gap-2">
                  <button onClick={startCamera} className="btn-neo text-xs py-1.5 px-3">
                    Retry
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="btn-neo text-xs py-1.5 px-3">
                    Upload
                  </button>
                </div>
              </div>
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-black/20">
                <span
                  key={countKey}
                  className="count-pop text-white font-black drop-shadow-2xl select-none"
                  style={{ fontSize: '9rem', lineHeight: 1, textShadow: '0 4px 32px rgba(0,0,0,0.7)' }}
                >
                  {countdown}
                </span>
              </div>
            )}

            {/* Scan-line overlay for that retro feel */}
            <div
              className="absolute inset-0 z-10 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)',
              }}
            />

            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                filter: filterStyle,
                transform: isMirrored ? 'scaleX(-1)' : 'none',
                display: hasCamera ? 'block' : 'none',
              }}
            />

            {!hasCamera && !isLoading && !cameraError && (
              <div
                className="w-full h-full flex items-center justify-center cursor-pointer bg-neutral-900"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center text-white/30">
                  <Upload className="mx-auto mb-2" size={32} />
                  <p className="text-[11px] font-mono uppercase tracking-wider">Click to upload</p>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Bottom controls bar */}
          <div className="mt-3 flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`pill-tab text-[10px] px-3 py-1 ${
                    activeFilter === f.id ? 'pill-tab-active' : 'bg-white/10 text-white/50 border-white/20 hover:text-white/80 hover:border-white/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stand */}
        <div className="mx-auto h-2 w-24 bg-[#C4B99A] rounded-b-sm mt-0" />
        <div className="mx-auto h-1.5 w-32 bg-[#B0A890] rounded-b-sm" />
      </div>

      {/* Shutter button */}
      <button
        onClick={startCountdown}
        disabled={!isCapturing || countdown !== null}
        className="w-full btn-neo-dark flex items-center justify-center gap-2.5 py-3.5 text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_#8A7560]"
      >
        <Zap size={16} />
        {countdown !== null
          ? `Capturing in ${countdown}...`
          : isCapturing
          ? `Take Shot  (${capturedCount}/${totalFrames})`
          : 'All frames captured!'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
