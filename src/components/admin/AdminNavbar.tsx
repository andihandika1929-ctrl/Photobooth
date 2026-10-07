'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  ChevronRight,
  Camera,
  HardDrive,
  LogOut,
  Settings,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/admin/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';

interface AdminNavbarProps {
  onMobileMenuToggle: () => void;
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/frames': 'Frame Presets & Canvas',
  '/admin/media': 'Media Logs & Storage',
  '/admin/analytics': 'Analytics & Session Stats',
  '/admin/settings': 'Studio & Theme Settings',
};

export function AdminNavbar({ onMobileMenuToggle }: AdminNavbarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAdminAuth();

  const currentTitle = BREADCRUMB_MAP[pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Area: Mobile Trigger & Dynamic Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle button */}
        <button
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:hidden transition-colors"
          title="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs">
          <Link
            href="/admin"
            className="font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Admin
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-semibold text-zinc-900">{currentTitle}</span>
        </nav>
      </div>

      {/* Right Area: Hardware Status Badges, Quick Actions, User Profile */}
      <div className="flex items-center gap-3">
        {/* Hardware Status Indicators */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Camera Status */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-2xs"
            title="Local WebCam & Capture Pipeline Ready"
          >
            <Camera className="h-3.5 w-3.5 text-emerald-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden lg:inline">Camera</span> Ready
          </div>

          {/* Storage Status */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-2xs"
            title="Supabase Storage Bucket Operational"
          >
            <HardDrive className="h-3.5 w-3.5 text-emerald-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="hidden lg:inline">Storage</span> OK
          </div>
        </div>

        {/* Quick Action: Open Booth */}
        <Link href="/booth" target="_blank">
          <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 text-xs h-8">
            <Camera className="h-3.5 w-3.5" />
            <span>Booth Mode</span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </Button>
        </Link>

        {/* User Profile Badge & Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 pr-2.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-all outline-none">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white font-mono text-xs font-semibold">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="hidden md:inline max-w-[130px] truncate text-zinc-800">
              {user?.email?.split('@')[0] || 'Admin'}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="right" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>HQ Admin Account</span>
              </div>
              <p className="font-mono text-[10px] text-zinc-400 normal-case truncate mt-0.5">
                {user?.email || 'admin@studio.com'}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <Link href="/admin/settings">
              <DropdownMenuItem>
                <Settings className="mr-2 h-3.5 w-3.5" />
                <span>Studio & Theme Settings</span>
              </DropdownMenuItem>
            </Link>

            <Link href="/booth" target="_blank">
              <DropdownMenuItem>
                <Camera className="mr-2 h-3.5 w-3.5" />
                <span>Open Photobooth Window</span>
              </DropdownMenuItem>
            </Link>

            <Link href="/">
              <DropdownMenuItem>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                <span>Studio Landing Page</span>
              </DropdownMenuItem>
            </Link>

            <DropdownMenuSeparator />

            <DropdownMenuItem destructive onClick={() => signOut()}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
