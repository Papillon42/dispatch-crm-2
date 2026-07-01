'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Phone, Mail, Send, MessageSquare, Search, Sparkles, RefreshCw,
  Plus, CheckSquare, Link2, PhoneMissed, Clock,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';

const CHANNEL_ICONS: Record<string, any> = {
  RINGCENTRAL: Phone,
  GMAIL: Mail,
  TELEGRAM: Send,
  SMS: MessageSquare,
  INTERNAL: MessageSquare,
};

const CHANNEL_LABELS: Record<string, string> = {
  RINGCENTRAL: 'RingCentral', GMAIL: 'Gmail', TELEGRAM: 'Telegram', SMS: 'SMS', INTERNAL: 'Internal',
};

const QUICK_TEMPLATES = [
  { title: 'ETA Confirmation', body: "Hello! Your load is confirmed. Current ETA is on schedule." },
  { title: 'Delay Notice', body: 'We apologize for the delay. Updated ETA to follow shortly.' },
  { title: 'Arrival', body: 'Driver has arrived at the pickup location.' },
];

export function CommunicationsWorkspace() {
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [replyTab, setReplyTab] = useState<'reply' | 'internal'>('reply');
  const [replyText, setReplyText] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string; actionItems: string[] } | null>(null);

  const { data: threadsData, lastUpdatedAt, refresh: refreshThreads } = usePolling<any>(
    `/api/communications/threads?${new URLSearchParams({ ...(channelFilter !== 'ALL' ? { channel: channelFilter } : {}), ...(search ? { search } : {}) }).toString()}`,
    { intervalMs: 10000 },
  );

  const { data: msgData, refresh: refreshMessages } = usePolling<any>(
    selected ? `/api/communications?counterpart=${encodeURIComponent(selected)}` : null,
    { intervalMs: 8000 },
  );

  const threads = threadsData?.threads ?? [];
  const messages = msgData?.messages ?? [];
  const activeThread = threads.find((t: any) => t.counterpart === selected);
  const lastMsg = messages[messages.length - 1];

  useEffect(() => { setAiSummary(null); }, [selected]);

  const totalToday = threads.length;
  const unreadCount = threads.reduce((s: number, t: any) => s + t.unreadCount, 0);
  const callsToday = messages.length; // demo proxy

  async function sendReply() {
    if (!replyText.trim() || !selected || !activeThread) return;
    await fetch('/api/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counterpart: selected,
        channel: activeThread.channel,
        body: replyText,
        relatedClientId: activeThread.relatedClientId,
      }),
    });
    setReplyText('');
    refreshMessages();
    refreshThreads();
  }

  async function runAiSummary() {
    if (!lastMsg) return;
    setSummarizing(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize_communication',
          payload: { body: messages.map((m: any) => m.body).filter(Boolean).join('\n'), channel: activeThread?.channel },
        }),
      });
      const json = await res.json();
      if (json.result?.summary) {
        setAiSummary(json.result);
      } else {
        setAiSummary({ summary: 'AI summary unavailable (no ANTHROPIC_API_KEY configured in this environment).', actionItems: [] });
      }
    } catch {
      setAiSummary({ summary: 'AI summary unavailable right now.', actionItems: [] });
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Communications</h1>
          <p className="text-sm text-text-secondary mt-1">Unified inbox — calls, email, Telegram, SMS</p>
        </div>
        <LiveBadge lastUpdatedAt={lastUpdatedAt} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Conversations" value={totalToday} icon={<MessageSquare className="w-4 h-4 text-brand-light" />} />
        <KpiCard label="Unread" value={unreadCount} icon={<Mail className="w-4 h-4 text-amber-400" />} iconColor="bg-amber-500/15" />
        <KpiCard label="Active Threads" value={threads.length} icon={<Clock className="w-4 h-4 text-cyan-400" />} iconColor="bg-cyan-500/15" />
        <KpiCard label="Avg Response Time" value="2m 47s" icon={<RefreshCw className="w-4 h-4 text-violet-400" />} iconColor="bg-violet-500/15" />
        <KpiCard label="Missed Calls" value={0} icon={<PhoneMissed className="w-4 h-4 text-red-400" />} iconColor="bg-red-500/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4 h-[640px]">
        {/* Left: thread list */}
        <div className="bg-background-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border-subtle space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-8 pr-2 py-1.5 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'RINGCENTRAL', 'GMAIL', 'TELEGRAM', 'SMS'].map((c) => (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={cn(
                    'px-2 py-1 rounded-md text-2xs border',
                    channelFilter === c ? 'bg-brand-muted border-brand text-brand-light' : 'border-border text-text-secondary hover:text-text-primary',
                  )}
                >
                  {c === 'ALL' ? 'All' : CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {threads.length === 0 && (
              <p className="text-sm text-text-muted text-center py-8">No conversations yet.</p>
            )}
            {threads.map((t: any) => {
              const Icon = CHANNEL_ICONS[t.channel] ?? MessageSquare;
              return (
                <button
                  key={t.counterpart}
                  onClick={() => setSelected(t.counterpart)}
                  className={cn(
                    'w-full text-left px-3 py-3 hover:bg-background-hover transition-colors',
                    selected === t.counterpart && 'bg-background-hover',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="text-sm font-medium text-text-primary truncate">{t.displayName}</span>
                    </div>
                    <span className="text-2xs text-text-muted flex-shrink-0">{timeAgo(t.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-text-secondary truncate">{t.lastMessage}</p>
                    {t.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 w-4 h-4 rounded-full bg-brand text-white text-2xs flex items-center justify-center">{t.unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: conversation */}
        <div className="bg-background-card border border-border rounded-lg overflow-hidden flex flex-col">
          {!selected && (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select a conversation to view messages
            </div>
          )}
          {selected && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{activeThread?.displayName ?? selected}</p>
                  <p className="text-2xs text-text-muted">{selected}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand hover:bg-brand-dark text-white text-xs font-medium">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-primary text-xs font-medium hover:bg-background-hover">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m: any) => (
                  <div key={m.id} className={cn('flex', m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-lg px-3 py-2',
                      m.direction === 'OUTBOUND' ? 'bg-brand-muted border border-brand/30' : 'bg-background-hover',
                    )}>
                      <p className="text-2xs text-text-muted mb-0.5">
                        {m.direction === 'OUTBOUND' ? (m.createdBy?.fullName ?? 'You') : activeThread?.displayName} · {CHANNEL_LABELS[m.channel]} · {timeAgo(m.at)}
                      </p>
                      {m.subject && <p className="text-sm font-medium text-text-primary">{m.subject}</p>}
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{m.body}</p>
                      {m.duration != null && (
                        <p className="text-2xs text-text-muted mt-1">Call · {Math.floor(m.duration / 60)}:{String(m.duration % 60).padStart(2, '0')}</p>
                      )}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-8">No messages yet in this thread.</p>
                )}
              </div>

              {/* AI Summary */}
              <div className="mx-4 mb-3 rounded-lg border border-brand/30 bg-brand-muted/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-light">
                    <Sparkles className="w-3.5 h-3.5" /> AI Summary
                  </span>
                  <button onClick={runAiSummary} disabled={summarizing || messages.length === 0} className="text-2xs text-text-secondary hover:text-text-primary disabled:opacity-50 flex items-center gap-1">
                    <RefreshCw className={cn('w-3 h-3', summarizing && 'animate-spin')} /> Refresh
                  </button>
                </div>
                <p className="text-xs text-text-secondary">{aiSummary?.summary ?? 'Click Refresh to generate an AI summary of this conversation.'}</p>
                {aiSummary?.actionItems && aiSummary.actionItems.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {aiSummary.actionItems.map((item, i) => (
                      <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                        <span className="text-brand-light">·</span> {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-border-subtle">
                <div className="flex gap-3 mb-2 text-xs">
                  <button onClick={() => setReplyTab('reply')} className={cn('font-medium', replyTab === 'reply' ? 'text-brand-light' : 'text-text-muted')}>Reply</button>
                  <button onClick={() => setReplyTab('internal')} className={cn('font-medium', replyTab === 'internal' ? 'text-brand-light' : 'text-text-muted')}>Internal Note</button>
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={replyTab === 'reply' ? 'Type a message…' : 'Add an internal note…'}
                  rows={2}
                  className="w-full rounded-md bg-background-hover border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-border-focus"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5">
                    {QUICK_TEMPLATES.map((t) => (
                      <button key={t.title} onClick={() => setReplyText(t.body)} className="px-2 py-1 rounded-md border border-border text-2xs text-text-secondary hover:text-text-primary hover:bg-background-hover">
                        {t.title}
                      </button>
                    ))}
                  </div>
                  <button onClick={sendReply} disabled={!replyText.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: related context */}
        <div className="bg-background-card border border-border rounded-lg overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Related Context</h3>
          {!activeThread && <p className="text-xs text-text-muted">Select a conversation to see related client, load and driver context.</p>}
          {activeThread?.relatedClientId && (
            <div className="rounded-md bg-background-hover p-3">
              <p className="text-2xs text-text-muted mb-1">Client</p>
              <p className="text-sm font-medium text-text-primary">{activeThread.displayName}</p>
            </div>
          )}
          <TasksPanel />
        </div>
      </div>
    </div>
  );
}

function TasksPanel() {
  const { data, refresh } = usePolling<any>('/api/tasks?mine=1', { intervalMs: 15000 });
  const [creating, setCreating] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new_task') === '1') setCreating(true);
  }, [searchParams]);
  const [title, setTitle] = useState('');
  const tasks = data?.tasks ?? [];

  async function createTask() {
    if (!title.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: 'MEDIUM' }),
    });
    setTitle('');
    setCreating(false);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-primary">Tasks</h3>
        <button onClick={() => setCreating((v) => !v)} className="text-text-muted hover:text-text-primary">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {creating && (
        <div className="flex gap-1.5 mb-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task…"
            className="flex-1 px-2 py-1.5 rounded-md bg-background-hover border border-border text-xs text-text-primary"
          />
          <button onClick={createTask} className="px-2 py-1.5 rounded-md bg-brand text-white text-xs">Add</button>
        </div>
      )}
      <div className="space-y-1.5">
        {tasks.length === 0 && <p className="text-xs text-text-muted">No tasks yet.</p>}
        {tasks.map((t: any) => (
          <div key={t.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-background-hover">
            <CheckSquare className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-text-primary truncate">{t.title}</p>
              <p className="text-2xs text-text-muted">{t.priority} {t.dueAt ? `· ${timeAgo(t.dueAt)}` : ''}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-md border border-border text-text-secondary hover:text-text-primary text-xs">
        <Link2 className="w-3.5 h-3.5" /> Link to Load
      </button>
    </div>
  );
}
