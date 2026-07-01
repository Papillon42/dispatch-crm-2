'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import {
  Search, Plus, Bell, MessageSquare, Menu, Command,
} from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { cn, timeAgo } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin / Owner',
  SENIOR_DISPATCHER: 'Senior Dispatcher',
  DISPATCHER: 'Dispatcher',
  UPDATER: 'Updater',
  RECRUITER: 'Recruiter',
  FINANCE: 'Finance',
};

export function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: me } = usePolling<any>('/api/me', { intervalMs: 60000 });
  const { data: tasksData } = usePolling<any>('/api/tasks?mine=1&status=PENDING', { intervalMs: 20000 });
  const { data: threadsData } = usePolling<any>('/api/communications/threads', { intervalMs: 20000 });

  const tasks = tasksData?.tasks ?? [];
  const unreadMessages = (threadsData?.threads ?? []).reduce((s: number, t: any) => s + t.unreadCount, 0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') searchRef.current?.blur();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/loads?search=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="h-16 flex-shrink-0 border-b border-border bg-background-secondary flex items-center gap-3 px-4 sticky top-0 z-20">
      <button
        onClick={onToggleSidebar}
        className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-background-hover flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-4 h-4" />
      </button>

      <form onSubmit={submitSearch} className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loads, clients, drivers…"
          className="w-full pl-9 pr-14 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-2xs text-text-muted border border-border rounded px-1.5 py-0.5">
          <Command className="w-3 h-3" />K
        </span>
      </form>

      <div className="flex items-center gap-1.5 ml-auto">
        <Link
          href="/loads?new=1"
          className="w-9 h-9 flex items-center justify-center rounded-md bg-brand hover:bg-brand-dark text-white flex-shrink-0"
          aria-label="Quick add"
        >
          <Plus className="w-4 h-4" />
        </Link>

        <Link
          href="/communications"
          className="relative w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-background-hover flex-shrink-0"
          aria-label="Messages"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-background-hover flex-shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {tasks.length > 0 && (
              <span className="absolute top-1 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-danger text-white text-[9px] leading-[14px] text-center">
                {tasks.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-background-card shadow-xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border-subtle text-xs font-semibold text-text-primary">
                Pending Tasks
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
                {tasks.length === 0 && <p className="px-3 py-4 text-xs text-text-muted text-center">You&apos;re all caught up.</p>}
                {tasks.slice(0, 8).map((t: any) => (
                  <div key={t.id} className="px-3 py-2.5">
                    <p className="text-xs text-text-primary">{t.title}</p>
                    <p className="text-2xs text-text-muted">{t.priority} {t.dueAt ? `· due ${timeAgo(t.dueAt)}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ThemeSwitcher className="mx-1" />

        <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
          <UserButton afterSignOutUrl="/login" />
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-medium text-text-primary">{me?.fullName ?? '—'}</p>
            <p className="text-2xs text-text-muted">{me?.role ? ROLE_LABELS[me.role] ?? me.role : ''}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
