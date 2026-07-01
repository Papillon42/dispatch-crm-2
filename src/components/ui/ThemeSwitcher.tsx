'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDay = theme === 'day';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDay ? 'Switch to night theme' : 'Switch to day theme'}
      title={isDay ? 'Switch to night theme' : 'Switch to day theme'}
      className={cn(
        'relative flex items-center w-14 h-8 rounded-full border border-border bg-background-hover px-1 transition-colors',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-background-card border border-border shadow-sm flex items-center justify-center transition-transform duration-200',
          isDay && 'translate-x-6',
        )}
      >
        {isDay ? <Sun className="w-3.5 h-3.5 text-warning" /> : <Moon className="w-3.5 h-3.5 text-brand-light" />}
      </span>
    </button>
  );
}
