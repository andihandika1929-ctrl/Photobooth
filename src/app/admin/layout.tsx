'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '@/lib/admin/AdminAuthContext';
import { StudioThemeProvider } from '@/lib/admin/StudioThemeContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { AdminLoginGate } from '@/components/admin/AdminLoginGate';

function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, authLoading } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center text-zinc-900 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 mb-3" />
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Verifying Studio Security...
        </p>
      </div>
    );
  }

  // Auth Gate
  if (!session) {
    return <AdminLoginGate />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex font-sans antialiased">
      {/* Permanent / Collapsible Sidebar */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Top Navbar */}
        <AdminNavbar onMobileMenuToggle={() => setMobileOpen((prev) => !prev)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Global Admin Footer */}
        <footer className="border-t border-zinc-200 bg-white py-4 px-6 text-center text-xs font-mono text-zinc-400">
          <span>HALOLUNA HQ DASHBOARD • MODERN STUDIO MANAGEMENT • 2026</span>
        </footer>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <StudioThemeProvider>
        <AdminShell>{children}</AdminShell>
      </StudioThemeProvider>
    </AdminAuthProvider>
  );
}
