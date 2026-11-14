'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Image as ImageIcon,
  HardDrive,
  BarChart3,
  Settings,
  ExternalLink,
  Database,
  X,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Foto Mentahan (Raw)',
    href: '/admin/raw-photos',
    icon: Camera,
    badge: 'Raw',
  },
  {
    label: 'Analytics & Session Stats',
    href: '/admin/analytics',
    icon: BarChart3,
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      {/* Top Brand Header */}
      <div>
        <div className="flex items-center justify-between pb-5 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-zinc-900">
                  HaloLuna
                </span>
                <Badge variant="default" className="text-[9px] px-1 py-0 h-4 uppercase tracking-wider font-mono">
                  HQ
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono tracking-tight">Studio Admin</p>
            </div>
          </div>

          {/* Close button for mobile sheet */}
          <button
            onClick={onMobileClose}
            className="md:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            title="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="mt-5 space-y-1">
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    'group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all select-none',
                    active
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant={active ? 'secondary' : 'outline'} className="text-[10px] py-0 px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick App Shortcut */}
        <div className="mt-6 pt-5 border-t border-zinc-200">
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-2">
            Studio Interface
          </p>
          <Link
            href="/booth"
            target="_blank"
            className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-white transition-all shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-zinc-500 group-hover:text-zinc-900" />
              <span>Launch Booth Room</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600" />
          </Link>
        </div>
      </div>

      {/* Footer Sidebar: Supabase status & System version */}
      <div className="pt-4 border-t border-zinc-200 space-y-3">
        {/* Supabase Status */}
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="flex items-center gap-1.5 text-zinc-800">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium">Supabase Storage</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold text-emerald-700">Online</span>
        </div>

        {/* System Version */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
          <span>HaloLuna v2.4.0</span>
          <span>Next.js 14</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Permanent Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-zinc-200 bg-white/95 backdrop-blur-md">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-zinc-200 md:hidden transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
