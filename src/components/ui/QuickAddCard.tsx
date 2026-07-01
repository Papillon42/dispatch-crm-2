'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Package, Users, UserCheck, CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { label: 'Новый груз', href: '/loads?new=1', icon: Package },
  { label: 'Новый клиент', href: '/clients?new=1', icon: Users },
  { label: 'Новый драйвер', href: '/drivers?new=1', icon: UserCheck },
  { label: 'Новая задача', href: '/communications?new_task=1', icon: CheckSquare },
];

/** Sidebar footer card — matches the "Quick Add" widget from the reference mockups. */
export function QuickAddCard({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <Link
        href="/loads?new=1"
        title="Quick Add / Создать"
        className="mx-2 mb-2 flex items-center justify-center w-9 h-9 rounded-md bg-brand hover:bg-brand-dark text-white"
      >
        <Plus className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <div className="mx-3 mb-3 rounded-lg bg-background-tertiary border border-border-subtle p-3 relative">
      <p className="text-sm font-semibold text-text-primary">Quick Add</p>
      <p className="text-2xs text-text-muted mt-0.5 mb-2.5">Создать новый груз, клиента или задачу</p>

      {open && (
        <div className="mb-2 space-y-0.5 rounded-md border border-border bg-background-card p-1">
          {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-secondary hover:bg-background-hover hover:text-text-primary"
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors',
        )}
      >
        <Plus className="w-4 h-4" />
        Создать
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
