'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Camera,
  HardDrive,
  BarChart3,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Activity,
  Calendar,
  Layers,
  Clock,
  Sliders,
} from 'lucide-react';
import { useAdminPhotos } from '@/lib/admin/useAdminPhotos';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatBytes, formatDate } from '@/lib/utils';

export default function AdminOverviewPage() {
  const { photos, loading, fetchPhotos, stats } = useAdminPhotos();

  const recentPhotos = React.useMemo(() => {
    return photos.slice(0, 4);
  }, [photos]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Studio Overview
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Real-time performance metrics &amp; photobooth operational status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPhotos}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </Button>

          <Link href="/booth" target="_blank">
            <Button size="sm" className="gap-1.5 text-xs h-9">
              <Camera className="h-3.5 w-3.5" />
              <span>Open Studio Booth</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Metric KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Photos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Total Captures
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
              <Camera className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {loading ? '...' : stats.total}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Recorded in Supabase DB
            </p>
          </CardContent>
        </Card>

        {/* Created Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Today&apos;s Sessions
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-700">
              {loading ? '...' : stats.todayCount}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Active guest captures today
            </p>
          </CardContent>
        </Card>

        {/* Top Preset */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Popular Frame
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold font-mono uppercase text-zinc-900 truncate">
              {loading ? '...' : stats.topPreset}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Most chosen guest layout
            </p>
          </CardContent>
        </Card>

        {/* Storage Volume */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Storage Usage
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <HardDrive className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {loading ? '...' : formatBytes(stats.estimatedStorageBytes)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Supabase &apos;photos&apos; bucket
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Navigation & Module Gateways ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Foto Mentahan & Media Storage Gateway */}
        <Card className="hover:border-zinc-300 transition-all group">
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Camera className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="text-[10px]">{photos.length} Sesi Tersimpan</Badge>
            </div>
            <CardTitle className="text-base text-zinc-900">Foto Mentahan &amp; Media</CardTitle>
            <CardDescription>
              Akses photostrip, unduh foto mentahan tanpa frame resolusi asli kamera, dan hapus foto gagal untuk menghemat Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/raw-photos">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <span>Buka Galeri Foto Mentahan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Analytics & Stats Gateway */}
        <Card className="hover:border-zinc-300 transition-all group">
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <BarChart3 className="h-4 w-4" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Real-time
              </Badge>
            </div>
            <CardTitle className="text-base text-zinc-900">Analytics &amp; Session Stats</CardTitle>
            <CardDescription>
              Pantau total sesi hari ini, jam sibuk photobooth, status integrasi hardware, dan analitik penggunaan studio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/analytics">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <span>Buka Analytics &amp; Stats</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── System Status & Recent Media ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware & Infrastructure Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm">Hardware &amp; Engine Status</CardTitle>
            </div>
            <CardDescription>
              Active health of hardware pipeline &amp; cloud services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs">
                <Camera className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800">Webcam Pipeline</span>
              </div>
              <Badge variant="success" className="text-[10px]">1080p Ready</Badge>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs">
                <HardDrive className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800">Supabase Storage</span>
              </div>
              <Badge variant="success" className="text-[10px]">Operational</Badge>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800">Auth &amp; RLS Policies</span>
              </div>
              <Badge variant="success" className="text-[10px]">Enforced</Badge>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800">Canvas 2D Renderer</span>
              </div>
              <Badge variant="success" className="text-[10px]">60 FPS</Badge>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs">
                <Sliders className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800">Default Strip Layout</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-600 uppercase font-semibold">
                Korean 4-Cut
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Media Preview Strip */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Guest Strips</CardTitle>
              <CardDescription>Latest photo strips generated in photobooth</CardDescription>
            </div>
            <Link href="/admin/raw-photos">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <span>View All ({photos.length})</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-44 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : recentPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Camera className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-xs font-medium text-zinc-600">No photos captured yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Photos captured in the booth will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-lg border border-zinc-200 overflow-hidden bg-zinc-100 flex flex-col"
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-zinc-200 flex items-center justify-center p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.image_url}
                        alt={`Photo ${photo.id}`}
                        className="max-h-full max-w-full object-contain rounded transition-transform group-hover:scale-105 duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2 bg-white flex flex-col justify-between flex-1 border-t border-zinc-100">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                          <span className="truncate max-w-[70px]">#{photo.id.substring(0, 6)}</span>
                          <span className="capitalize">{photo.template_type?.split('-')[0]}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="truncate">{formatDate(photo.created_at)}</span>
                        </p>
                      </div>

                      <div className="mt-2 pt-1 border-t border-zinc-100 flex items-center justify-between">
                        <Link
                          href={`/result/${photo.id}`}
                          target="_blank"
                          className="text-[10px] font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1"
                        >
                          <span>Result</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
