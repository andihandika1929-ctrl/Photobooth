'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, KeyRound, AlertTriangle, ArrowLeft, ShieldCheck, Camera } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';

export function AdminLoginGate() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const result = await signIn(email, password);
    if (!result.success && result.error) {
      setErrorMsg(result.error || 'Invalid admin credentials. Access restricted.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col items-center justify-center p-4 relative">
      {/* Subtle Dot Matrix Texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #71717a 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-zinc-200 shadow-lg bg-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold tracking-tight text-zinc-900">
              HaloLuna HQ Admin
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 font-mono">
              Photobooth Studio Management Console
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider font-mono">
                  Admin Email
                </label>
                <Input
                  type="email"
                  required
                  placeholder="admin@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider font-mono">
                  Password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-50/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                {!isSubmitting && <KeyRound className="mr-2 h-4 w-4" />}
                Sign In to Console
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-zinc-100 pt-4 text-xs text-zinc-500">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-medium hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Photobooth</span>
            </Link>

            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span>Supabase Auth</span>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
