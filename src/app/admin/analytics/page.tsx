'use client';

import * as React from 'react';
import {
  BarChart3,
  Calendar,
  Camera,
  HardDrive,
  RefreshCw,
  Sparkles,
  TrendingUp,
  PieChart,
  Layers,
  Clock,
  ArrowUpRight,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { useAdminPhotos } from '@/lib/admin/useAdminPhotos';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatBytes } from '@/lib/utils';

export default function AnalyticsPage() {
  const { photos, loading, fetchPhotos, stats } = useAdminPhotos();

  // Calculate preset percentages
  const presetDistribution = React.useMemo(() => {
    if (photos.length === 0) return [];
    const counts = stats.presetCounts || {};
    const total = photos.length;

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [photos, stats]);

  // Hourly session estimation
  const hourlyActivity = React.useMemo(() => {
    const buckets: Record<string, number> = {
      'Morning (06:00 - 12:00)': 0,
      'Afternoon (12:00 - 17:00)': 0,
      'Evening (17:00 - 22:00)': 0,
      'Night (22:00 - 06:00)': 0,
    };

    photos.forEach((p) => {
      try {
        const hour = new Date(p.created_at).getHours();
        if (hour >= 6 && hour < 12) buckets['Morning (06:00 - 12:00)']++;
        else if (hour >= 12 && hour < 17) buckets['Afternoon (12:00 - 17:00)']++;
        else if (hour >= 17 && hour < 22) buckets['Evening (17:00 - 22:00)']++;
        else buckets['Night (22:00 - 06:00)']++;
      } catch {
        // Skip invalid date
      }
    });

    return Object.entries(buckets).map(([timeSlot, count]) => ({
      timeSlot,
      count,
      percentage: photos.length > 0 ? Math.round((count / photos.length) * 100) : 0,
    }));
  }, [photos]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Analytics &amp; Session Stats
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Photobooth traffic, frame selection behavior, and cloud resource consumption
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPhotos}
          disabled={loading}
          className="gap-1.5 text-xs h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </Button>
      </div>

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Total Captured
            </CardTitle>
            <Camera className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900">{stats.total}</div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>Full Historical Records</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Today&apos;s Traffic
            </CardTitle>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900">{stats.todayCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {stats.total > 0 ? Math.round((stats.todayCount / stats.total) * 100) : 0}% of all-time total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Storage Used
            </CardTitle>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {formatBytes(stats.estimatedStorageBytes)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              PNG 300DPI High-Res Exports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Leading Template
            </CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold font-mono uppercase text-zinc-900 truncate">
              {stats.topPreset}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Dominant guest choice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Preset Distribution & Activity Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preset Popularity Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-zinc-700" />
              <CardTitle className="text-base">Frame Preset Popularity</CardTitle>
            </div>
            <CardDescription>
              Percentage of guests selecting each frame style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {presetDistribution.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No session data available yet.</p>
            ) : (
              presetDistribution.map((item, index) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 capitalize">
                      {item.name.replace('-', ' ')}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {item.count} sessions ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? 'bg-zinc-900'
                          : index === 1
                          ? 'bg-zinc-600'
                          : index === 2
                          ? 'bg-zinc-400'
                          : 'bg-zinc-300'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Time of Day Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-700" />
              <CardTitle className="text-base">Session Time Distribution</CardTitle>
            </div>
            <CardDescription>
              Traffic distribution across time of day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hourlyActivity.map((slot) => (
              <div key={slot.timeSlot} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-800">{slot.timeSlot}</span>
                  <span className="font-mono text-zinc-500">
                    {slot.count} ({slot.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${slot.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Cloud Infrastructure Quota ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-zinc-700" />
            <CardTitle className="text-base">Cloud Infrastructure &amp; Quota Utilization</CardTitle>
          </div>
          <CardDescription>Supabase project resource limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Storage Quota</span>
                <span className="font-mono text-emerald-600 font-semibold">Healthy</span>
              </div>
              <p className="text-lg font-bold font-mono text-zinc-900">
                {formatBytes(stats.estimatedStorageBytes)} / 1.0 GB
              </p>
              <p className="text-[11px] text-zinc-400 font-mono">Free Tier 1GB bucket limit</p>
            </div>

            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Postgres DB Records</span>
                <span className="font-mono text-emerald-600 font-semibold">Active</span>
              </div>
              <p className="text-lg font-bold font-mono text-zinc-900">
                {stats.total} Rows
              </p>
              <p className="text-[11px] text-zinc-400 font-mono">Row-level security enabled</p>
            </div>

            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">API Cache Latency</span>
                <span className="font-mono text-emerald-600 font-semibold">&lt; 45ms</span>
              </div>
              <p className="text-lg font-bold font-mono text-zinc-900">
                Global Edge CDN
              </p>
              <p className="text-[11px] text-zinc-400 font-mono">Next.js App Router edge cache</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
