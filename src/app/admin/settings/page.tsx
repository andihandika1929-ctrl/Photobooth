'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Settings,
  Palette,
  Sliders,
  Sun,
  Moon,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  Camera,
  Monitor,
  ExternalLink,
  SlidersHorizontal,
  Volume2,
  Clock,
  Layers,
  Save,
} from 'lucide-react';
import { useStudioTheme } from '@/lib/admin/StudioThemeContext';
import { STUDIO_THEME_PRESETS } from '@/lib/admin/themeTokens';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function StudioSettingsPage() {
  const { activePresetId, tokens, setPreset, updateToken, resetToPreset, presets } = useStudioTheme();
  const [copied, setCopied] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Operational studio settings state
  const [studioName, setStudioName] = React.useState('HaloLuna Studio');
  const [countdownDuration, setCountdownDuration] = React.useState('3');
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [mirrorCamera, setMirrorCamera] = React.useState(true);

  const handleCopyCSS = () => {
    const cssVars = `/* HaloLuna Studio Theme Tokens (${tokens.name}) */
:root {
  --studio-bg-primary: ${tokens.bgPrimary};
  --studio-bg-secondary: ${tokens.bgSecondary};
  --studio-card-bg: ${tokens.cardBg};
  --studio-text-primary: ${tokens.textPrimary};
  --studio-text-muted: ${tokens.textMuted};
  --studio-accent: ${tokens.accentColor};
  --studio-border: ${tokens.borderColor};
}`;

    navigator.clipboard.writeText(cssVars);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePreferences = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Studio &amp; Visual Theme Tokens
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Configure ambient photobooth background themes, color tokens, and studio hardware presets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCSS}
            className="gap-1.5 text-xs h-9"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>CSS Variables Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy CSS Tokens</span>
              </>
            )}
          </Button>

          <Link href="/booth" target="_blank">
            <Button size="sm" className="gap-1.5 text-xs h-9">
              <Camera className="h-3.5 w-3.5" />
              <span>Preview Live In Booth</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Section 1: Studio Background Theme Presets ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Palette className="h-4 w-4 text-zinc-700" />
              <span>Studio Theme Presets</span>
            </h2>
            <p className="text-xs text-zinc-500 font-mono">
              Select one of the 4 curated environmental studio aesthetics
            </p>
          </div>

          <Badge variant="outline" className="font-mono text-[10px]">
            Active: {tokens.name}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(presets).map((preset) => {
            const isActive = activePresetId === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => setPreset(preset.id)}
                className={`group cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-zinc-900 ring-2 ring-zinc-900 bg-white shadow-md'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                      {preset.isDark ? (
                        <Moon className="h-3.5 w-3.5 text-zinc-700" />
                      ) : (
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span>{preset.name}</span>
                    </span>

                    {isActive && (
                      <Badge variant="default" className="text-[9px] py-0 px-1.5">
                        Active
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-normal mb-4 min-h-[32px]">
                    {preset.description}
                  </p>

                  {/* Swatch Mini-Preview */}
                  <div className="rounded-lg border border-zinc-200 overflow-hidden shadow-2xs">
                    <div
                      className="h-10 w-full p-2 flex items-center justify-between"
                      style={{ backgroundColor: preset.bgPrimary }}
                    >
                      <div
                        className="h-6 w-14 rounded flex items-center justify-center text-[9px] font-bold font-mono"
                        style={{
                          backgroundColor: preset.cardBg,
                          color: preset.textPrimary,
                          border: `1px solid ${preset.borderColor}`,
                        }}
                      >
                        Card
                      </div>

                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: preset.accentColor }}
                        title="Accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {preset.isDark ? 'Dark Studio' : 'Light Studio'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreset(preset.id);
                    }}
                    className={`text-[11px] font-semibold transition-colors ${
                      isActive ? 'text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {isActive ? 'Current Theme' : 'Apply Preset'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Real-time Live Photobooth Studio Preview & Color Tokens ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic Color Variables Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-zinc-700" />
                  <span>Color Variables</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetToPreset()}
                  className="h-7 text-[11px] text-zinc-500 hover:text-zinc-900 gap-1 px-2"
                  title="Reset to current preset defaults"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </Button>
              </div>
              <CardDescription>
                Customize color tokens. Changes reflect immediately across the photobooth preview.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5 text-xs">
              {/* Primary Background */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Primary Background</p>
                  <p className="text-[10px] font-mono text-zinc-400">Main booth wall canvas</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.bgPrimary}
                    onChange={(e) => updateToken('bgPrimary', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.bgPrimary}
                    onChange={(e) => updateToken('bgPrimary', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Secondary Background */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Secondary Background</p>
                  <p className="text-[10px] font-mono text-zinc-400">Parchment / header tone</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.bgSecondary}
                    onChange={(e) => updateToken('bgSecondary', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.bgSecondary}
                    onChange={(e) => updateToken('bgSecondary', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Card & Panel Background */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Card &amp; Viewport</p>
                  <p className="text-[10px] font-mono text-zinc-400">Camera enclosure &amp; modals</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.cardBg}
                    onChange={(e) => updateToken('cardBg', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.cardBg}
                    onChange={(e) => updateToken('cardBg', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Primary Text */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Primary Typography</p>
                  <p className="text-[10px] font-mono text-zinc-400">Headings &amp; buttons</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.textPrimary}
                    onChange={(e) => updateToken('textPrimary', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.textPrimary}
                    onChange={(e) => updateToken('textPrimary', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Muted Text */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Muted Typography</p>
                  <p className="text-[10px] font-mono text-zinc-400">Timers &amp; subtitles</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.textMuted}
                    onChange={(e) => updateToken('textMuted', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.textMuted}
                    onChange={(e) => updateToken('textMuted', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Accent Tone</p>
                  <p className="text-[10px] font-mono text-zinc-400">CTA buttons &amp; badges</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.accentColor}
                    onChange={(e) => updateToken('accentColor', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.accentColor}
                    onChange={(e) => updateToken('accentColor', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Border Color */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800">Border Tone</p>
                  <p className="text-[10px] font-mono text-zinc-400">Dividers &amp; frames</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.borderColor}
                    onChange={(e) => updateToken('borderColor', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white"
                  />
                  <Input
                    value={tokens.borderColor}
                    onChange={(e) => updateToken('borderColor', e.target.value)}
                    className="w-24 h-7 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Interactive Photobooth Studio Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-zinc-700" />
                  <span>Live Photobooth Studio Preview</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Live View
                </Badge>
              </div>
              <CardDescription>
                Synchronized preview showing how guests experience the capture room under current tokens
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 bg-zinc-100 flex items-center justify-center">
              {/* Simulated Screen Container */}
              <div
                className="w-full max-w-lg rounded-2xl p-4 sm:p-5 shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{
                  backgroundColor: tokens.bgPrimary,
                  color: tokens.textPrimary,
                  border: `1px solid ${tokens.borderColor}`,
                }}
              >
                {/* Dot matrix background simulation */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(circle, ${tokens.accentColor} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Simulated Header */}
                <div
                  className="relative z-10 flex items-center justify-between pb-3 mb-3 border-b"
                  style={{ borderColor: tokens.borderColor }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: tokens.textPrimary, color: tokens.bgPrimary }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold tracking-wider uppercase font-mono">
                      {studioName}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border"
                    style={{
                      backgroundColor: tokens.bgSecondary,
                      borderColor: tokens.borderColor,
                      color: tokens.textMuted,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>READY</span>
                  </div>
                </div>

                {/* Simulated Viewfinder Body */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Viewfinder Camera Box (2 cols) */}
                  <div
                    className="sm:col-span-2 aspect-[4/3] rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-inner border"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: tokens.borderColor,
                    }}
                  >
                    <Camera className="h-10 w-10 opacity-30" style={{ color: tokens.textPrimary }} />
                    <span className="text-[10px] font-mono mt-1 opacity-50" style={{ color: tokens.textMuted }}>
                      Camera Viewfinder Feed
                    </span>

                    {/* Shutter Countdown Badge */}
                    <div
                      className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                      style={{
                        backgroundColor: tokens.accentColor,
                        color: tokens.isDark ? '#000000' : '#ffffff',
                      }}
                    >
                      {countdownDuration}s
                    </div>
                  </div>

                  {/* Strip Canvas Preview Box (1 col) */}
                  <div
                    className="aspect-[1/2] rounded-xl p-2 flex flex-col justify-between border shadow-sm"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: tokens.borderColor,
                    }}
                  >
                    <div className="space-y-1">
                      <div className="h-8 rounded bg-zinc-300/40" />
                      <div className="h-8 rounded bg-zinc-300/40" />
                      <div className="h-8 rounded bg-zinc-300/40" />
                    </div>
                    <div
                      className="text-center text-[8px] font-mono font-bold tracking-widest uppercase truncate"
                      style={{ color: tokens.textMuted }}
                    >
                      HALOLUNA
                    </div>
                  </div>
                </div>

                {/* Simulated Action Bottom Bar */}
                <div className="relative z-10 mt-4 flex items-center justify-between pt-2">
                  <div
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold font-mono border"
                    style={{
                      backgroundColor: tokens.bgSecondary,
                      borderColor: tokens.borderColor,
                      color: tokens.textPrimary,
                    }}
                  >
                    Classic 3x Strip
                  </div>

                  <div
                    className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                    style={{
                      backgroundColor: tokens.textPrimary,
                      color: tokens.bgPrimary,
                    }}
                  >
                    <Camera className="h-3 w-3" />
                    <span>Capture</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 3: Studio Hardware & Operational Preferences ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-700" />
            <CardTitle className="text-base">Studio Hardware &amp; Booth Preferences</CardTitle>
          </div>
          <CardDescription>
            Fine-tune photobooth capture behavior, countdown timer, and audio effects
          </CardDescription>
        </CardHeader>

        <CardContent>
          {saveSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Studio configuration saved successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Brand Display Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-800 font-mono uppercase text-[11px]">
                Studio Brand Name
              </label>
              <Input
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="HaloLuna Studio"
                className="text-xs"
              />
              <p className="text-[10px] text-zinc-400 font-mono">
                Appears on landing page header and print strip footer
              </p>
            </div>

            {/* Countdown Duration */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-800 font-mono uppercase text-[11px] flex items-center gap-1">
                <Clock className="h-3 w-3 text-zinc-500" />
                <span>Default Countdown Timer</span>
              </label>
              <div className="flex items-center gap-2">
                {['3', '5', '10'].map((sec) => (
                  <Button
                    key={sec}
                    type="button"
                    variant={countdownDuration === sec ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCountdownDuration(sec)}
                    className="flex-1 text-xs"
                  >
                    {sec} Seconds
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Delay before camera shutter triggers
              </p>
            </div>

            {/* Audio Effects Toggle */}
            <div className="flex items-center justify-between border-t md:border-t-0 pt-4 md:pt-0">
              <div className="space-y-0.5">
                <p className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Audio &amp; Shutter Sound FX</span>
                </p>
                <p className="text-[10px] text-zinc-400">
                  Play shutter sound and countdown beeps during capture
                </p>
              </div>
              <Button
                variant={soundEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-xs h-8"
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </Button>
            </div>

            {/* Mirror Viewfinder Feed */}
            <div className="flex items-center justify-between border-t md:border-t-0 pt-4 md:pt-0">
              <div className="space-y-0.5">
                <p className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Mirror Viewfinder Video</span>
                </p>
                <p className="text-[10px] text-zinc-400">
                  Flips camera horizontal axis for natural guest mirror effect
                </p>
              </div>
              <Button
                variant={mirrorCamera ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMirrorCamera(!mirrorCamera)}
                className="text-xs h-8"
              >
                {mirrorCamera ? 'Mirrored' : 'Standard'}
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-zinc-100 flex justify-end">
          <Button size="sm" onClick={handleSavePreferences} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" />
            <span>Save Preferences</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
