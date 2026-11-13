'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  User,
  Copy,
  Check,
  Sparkles,
  Heart,
  Video,
  VideoOff,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react';
import type { Participant, RoomRole } from '@/lib/realtime/roomTypes';

interface RoomLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string | null;
  onSelectSolo: () => void;
  onCreateRoom: (userName: string) => void;
  onJoinRoom: (code: string, userName: string) => void;
  participants: Participant[];
  partner: Participant | null;
  localName: string;
  onUpdateName: (name: string) => void;
  role: RoomRole;
  isCameraReady: boolean;
  onStartSession: () => void;
  initialTab?: 'create' | 'join';
}

export default function RoomLobbyModal({
  isOpen,
  onClose,
  roomCode,
  onSelectSolo,
  onCreateRoom,
  onJoinRoom,
  participants,
  partner,
  localName,
  onUpdateName,
  role,
  isCameraReady,
  onStartSession,
  initialTab = 'create',
}: RoomLobbyModalProps) {
  const [tab, setTab] = useState<'create' | 'join'>(initialTab);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!roomCode || typeof window === 'undefined') return;
    const url = `${window.location.origin}/booth?room=${roomCode}&role=guest`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDuoReady = !!(partner && partner.cameraReady && isCameraReady);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#faf9f6] p-6 sm:p-8 text-neutral-800 shadow-2xl border border-neutral-200/80">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-200/70 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-500 shadow-inner">
            <Heart className="h-6 w-6 fill-pink-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-800">
            Photobooth Experience
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Foto sendiri atau ajak pasangan/teman secara online dalam 1 strip!
          </p>
        </div>

        {/* If Not in Room yet: Choose Solo or Duo */}
        {!roomCode ? (
          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
                Nama Panggilan Anda
              </label>
              <input
                type="text"
                value={localName}
                onChange={(e) => onUpdateName(e.target.value)}
                placeholder="Contoh: Andi"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 shadow-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (tab !== 'create') setTab('create');
                }}
                className={`flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                  tab === 'create'
                    ? 'border-pink-400 bg-pink-50/60 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500 text-white shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-neutral-800">Buat Room Duo</span>
                <span className="mt-0.5 text-[11px] text-neutral-500">Host (Kamera Kiri)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (tab !== 'join') setTab('join');
                }}
                className={`flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                  tab === 'join'
                    ? 'border-blue-400 bg-blue-50/60 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-neutral-800">Gabung Room</span>
                <span className="mt-0.5 text-[11px] text-neutral-500">Guest via Kode</span>
              </button>
            </div>

            {/* Action based on Tab */}
            {tab === 'create' ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => onCreateRoom(localName || 'Host')}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  Buat Room Duo & Dapatkan Kode
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Masukkan 5 Karakter Kode (Contoh: LUV24)"
                  className="w-full text-center font-mono tracking-widest text-lg uppercase rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  disabled={!joinCodeInput.trim()}
                  onClick={() => onJoinRoom(joinCodeInput.trim(), localName || 'Guest')}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 disabled:opacity-50 active:scale-[0.98]"
                >
                  <ArrowRight className="h-4 w-4" />
                  Masuk ke Room Pasangan
                </button>
              </div>
            )}

            {/* Divider to Solo option */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <span className="relative bg-[#faf9f6] px-3 text-xs uppercase tracking-wider text-neutral-400">
                Atau
              </span>
            </div>

            <button
              type="button"
              onClick={onSelectSolo}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 active:scale-[0.98]"
            >
              <User className="h-4 w-4 text-neutral-500" />
              Lanjut Foto Sendiri (Solo Mode)
            </button>
          </div>
        ) : (
          /* When in Room: Waiting for Partner or Ready */
          <div className="space-y-5">
            {/* Room Code Banner */}
            <div className="flex flex-col items-center rounded-2xl border border-pink-200 bg-pink-50/70 p-4 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">
                Kode Room Duo
              </span>
              <div className="my-1 text-3xl font-black font-mono tracking-widest text-neutral-800">
                {roomCode}
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Kirimkan kode ini atau bagikan link ke pasangan Anda
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm border border-neutral-200 transition-all hover:bg-pink-100 hover:text-pink-600"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Link Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Salin Link Invite</span>
                  </>
                )}
              </button>
            </div>

            {/* Participants Status */}
            <div className="grid grid-cols-2 gap-3">
              {/* You */}
              <div className="rounded-2xl border border-pink-200/80 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
                    Sisi Kiri (Pink)
                  </span>
                  {isCameraReady ? (
                    <Video className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="text-sm font-bold text-neutral-800 truncate">
                  {localName || 'You'} (Anda)
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Terkoneksi
                </div>
              </div>

              {/* Partner */}
              <div className="rounded-2xl border border-blue-200/80 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    Sisi Kanan (Blue)
                  </span>
                  {partner?.cameraReady ? (
                    <Video className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-neutral-400" />
                  )}
                </div>
                <div className="text-sm font-bold text-neutral-800 truncate">
                  {partner ? partner.name : 'Menunggu...'}
                </div>
                <div className="mt-1 text-[11px] font-medium">
                  {partner ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Pasangan Bergabung!
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Menunggu pasangan...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Launch / Start Session */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onStartSession}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:opacity-95 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                {partner ? 'Mulai Sesi Photobooth Bersama' : 'Mulai Sekarang (Atau Tunggu Pasangan)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

