'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error('DropdownMenuTrigger must be inside DropdownMenu');

  return (
    <button
      type="button"
      onClick={() => context.setOpen((prev) => !prev)}
      className={className}
      aria-expanded={context.open}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'right',
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const context = React.useContext(DropdownContext);
  if (!context || !context.open) return null;

  const alignStyles = {
    right: 'right-0 origin-top-right',
    left: 'left-0 origin-top-left',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  };

  return (
    <div
      role="menu"
      className={cn(
        'absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-lg animate-in fade-in zoom-in-95 duration-100',
        alignStyles[align],
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  destructive = false,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const context = React.useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    context?.setOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 text-left',
        destructive ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-zinc-700 hover:text-zinc-950',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider', className)}>
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-zinc-100', className)} />;
}
