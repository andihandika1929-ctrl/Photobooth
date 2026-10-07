'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantStyles = {
      default: 'bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/90 active:scale-[0.99]',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80 active:scale-[0.99]',
      outline:
        'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.99]',
      destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-600/90 active:scale-[0.99]',
      ghost: 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
      link: 'text-zinc-900 underline-offset-4 hover:underline',
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-lg px-8 text-base',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
