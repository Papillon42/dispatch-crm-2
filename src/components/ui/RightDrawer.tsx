'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RightDrawerTab {
  key: string;
  label: string;
  badge?: number;
}

interface RightDrawerProps {
  title: ReactNode;
  onClose: () => void;
  tabs?: RightDrawerTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}

/**
 * Shared slide-in right panel shell used by Loads/Clients/Drivers/Trucks
 * detail views: header with close button, optional tab bar, scrollable
 * body, and a footer slot for primary actions.
 */
export function RightDrawer({ title, onClose, tabs, activeTab, onTabChange, children, footer, loading }: RightDrawerProps) {
  return (
    <div className="right-panel flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2 min-w-0">{title}</div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="flex border-b border-border-subtle px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange?.(tab.key)}
              className={cn(
                'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.key ? 'border-brand text-brand-light' : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {tab.label}
              {!!tab.badge && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger/20 text-danger text-2xs">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            <div className="h-32 bg-background-hover rounded-lg animate-pulse" />
            <div className="h-24 bg-background-hover rounded-lg animate-pulse" />
          </div>
        ) : children}
      </div>

      {footer && <div className="p-3 border-t border-border-subtle space-y-2">{footer}</div>}
    </div>
  );
}
