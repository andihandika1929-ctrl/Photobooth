'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80',
    secondary: 'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80',
    outline: 'text-zinc-900 border-zinc-200 hover:bg-zinc-50',
    destructive: 'border-transparent bg-red-100 text-red-700 border-red-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
