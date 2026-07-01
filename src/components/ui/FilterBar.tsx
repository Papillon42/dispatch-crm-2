import { ReactNode } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onReset?: () => void;
  children?: ReactNode;
  className?: string;
}

/** Search box + filter controls + reset, wrapped in the standard card row used on every list page. */
export function FilterBar({ search, onSearchChange, searchPlaceholder, onReset, children, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 bg-background-card border border-border rounded-lg px-4 py-3', className)}>
      {onSearchChange && (
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search…'}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
          />
        </div>
      )}
      {children}
      {onReset && (
        <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-text-secondary hover:text-text-primary text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      )}
    </div>
  );
}
