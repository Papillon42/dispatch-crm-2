'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Link2,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Truck,
  Users,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

type DriverRow = {
  id: string;
  fullName: string;
  phone: string | null;
  status: string;
  telegramChatId: string | null;
  client: { companyName: string } | null;
};

type ClientRow = {
  id: string;
  companyName: string;
  status: string;
  contacts: Array<{ name: string; phone: string | null; telegram: string | null }>;
};

type TelegramLink = {
  id: string;
  code: string;
  entityId: string;
  entityType: 'driver' | 'client';
  used: boolean;
  expiresAt: string;
  createdAt: string;
};

type TelegramResponse = {
  configured: {
    botToken: boolean;
    webhookSecret: boolean;
  };
  webhookPath: string;
  drivers: DriverRow[];
  clients: ClientRow[];
  links: TelegramLink[];
};

type Tab = 'drivers' | 'clients';

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn('h-2 w-2 rounded-full', ok ? 'bg-green-400' : 'bg-red-400')} />
  );
}

function maskChatId(chatId: string | null) {
  if (!chatId) return 'Not linked';
  return `Linked ...${chatId.slice(-4)}`;
}

export function TelegramWorkspace() {
  const [data, setData] = useState<TelegramResponse | null>(null);
  const [tab, setTab] = useState<Tab>('drivers');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/integrations/telegram/links', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load Telegram data');
      setData(payload as TelegramResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Telegram data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.drivers ?? [];
    return (data?.drivers ?? []).filter((driver) => (
      driver.fullName.toLowerCase().includes(term)
      || driver.client?.companyName.toLowerCase().includes(term)
      || driver.phone?.toLowerCase().includes(term)
    ));
  }, [data?.drivers, search]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.clients ?? [];
    return (data?.clients ?? []).filter((client) => (
      client.companyName.toLowerCase().includes(term)
      || client.contacts[0]?.name.toLowerCase().includes(term)
      || client.contacts[0]?.phone?.toLowerCase().includes(term)
      || client.contacts[0]?.telegram?.toLowerCase().includes(term)
    ));
  }, [data?.clients, search]);

  const activeLinksByEntity = useMemo(() => {
    const links = new Map<string, TelegramLink>();
    for (const link of data?.links ?? []) {
      links.set(`${link.entityType}:${link.entityId}`, link);
    }
    return links;
  }, [data?.links]);

  async function createLink(entityType: 'driver' | 'client', entityId: string) {
    const key = `${entityType}:${entityId}`;
    setCreatingKey(key);
    setError(null);

    try {
      const res = await fetch('/api/integrations/telegram/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) throw new Error(payload?.error ?? 'Unable to create link');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create link');
    } finally {
      setCreatingKey(null);
    }
  }

  async function copyCode(code: string) {
    const text = `/start ${code}`;
    await navigator.clipboard.writeText(text);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${data?.webhookPath ?? '/api/integrations/telegram/webhook'}`;
  const linkedDrivers = (data?.drivers ?? []).filter((driver) => driver.telegramChatId).length;
  const activeLinkCount = data?.links.length ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Telegram Bot</h1>
          <p className="text-sm text-text-secondary mt-1">{linkedDrivers} linked drivers</p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
          aria-label="Refresh Telegram data"
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Bot Token</p>
            <Send className="h-4 w-4 text-brand-light" />
          </div>
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <StatusDot ok={Boolean(data?.configured.botToken)} />
            {data?.configured.botToken ? 'Configured' : 'Missing'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Webhook Secret</p>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <StatusDot ok={Boolean(data?.configured.webhookSecret)} />
            {data?.configured.webhookSecret ? 'Configured' : 'Missing'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Active Codes</p>
            <Link2 className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{activeLinkCount}</p>
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-lg p-4 flex flex-col gap-2">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Webhook URL</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 rounded-md bg-background-secondary border border-border px-3 py-2 text-xs text-text-secondary overflow-x-auto">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(webhookUrl)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover"
            aria-label="Copy webhook URL"
            title="Copy"
          >
            <Clipboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('drivers')}
              className={cn(
                'h-9 inline-flex items-center gap-2 rounded-md border px-3 text-sm transition-colors',
                tab === 'drivers' ? 'border-brand bg-brand-muted text-brand-light' : 'border-border bg-background-secondary text-text-secondary hover:text-text-primary',
              )}
            >
              <Truck className="h-4 w-4" />
              Drivers
            </button>
            <button
              type="button"
              onClick={() => setTab('clients')}
              className={cn(
                'h-9 inline-flex items-center gap-2 rounded-md border px-3 text-sm transition-colors',
                tab === 'clients' ? 'border-brand bg-brand-muted text-brand-light' : 'border-border bg-background-secondary text-text-secondary hover:text-text-primary',
              )}
            >
              <Users className="h-4 w-4" />
              Clients
            </button>
          </div>

          <div className="relative max-w-md w-full">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {tab === 'drivers' ? (
            <table className="data-table w-full min-w-[840px]">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Telegram</th>
                  <th>Active Code</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const link = activeLinksByEntity.get(`driver:${driver.id}`);
                  const key = `driver:${driver.id}`;

                  return (
                    <tr key={driver.id}>
                      <td>
                        <p className="font-medium text-text-primary">{driver.fullName}</p>
                        <p className="text-xs text-text-muted">{driver.phone ?? '—'}</p>
                      </td>
                      <td>{driver.client?.companyName ?? '—'}</td>
                      <td>{driver.status.replace(/_/g, ' ')}</td>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          {driver.telegramChatId && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                          {maskChatId(driver.telegramChatId)}
                        </span>
                      </td>
                      <td>
                        {link ? (
                          <button
                            type="button"
                            onClick={() => void copyCode(link.code)}
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-background-secondary px-2.5 py-1.5 text-xs text-text-primary hover:bg-background-hover"
                          >
                            <Clipboard className="h-3.5 w-3.5" />
                            {copied === link.code ? 'Copied' : `/start ${link.code}`}
                          </button>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void createLink('driver', driver.id)}
                          disabled={creatingKey === key}
                          className="h-9 inline-flex items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                        >
                          {creatingKey === key ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                          Generate
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredDrivers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-text-muted">No drivers found</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="data-table w-full min-w-[780px]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Primary Contact</th>
                  <th>Status</th>
                  <th>Active Code</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const contact = client.contacts[0];
                  const link = activeLinksByEntity.get(`client:${client.id}`);
                  const key = `client:${client.id}`;

                  return (
                    <tr key={client.id}>
                      <td className="font-medium text-text-primary">{client.companyName}</td>
                      <td>
                        <p>{contact?.name ?? '—'}</p>
                        <p className="text-xs text-text-muted">{contact?.phone ?? contact?.telegram ?? ''}</p>
                      </td>
                      <td>{client.status.replace(/_/g, ' ')}</td>
                      <td>
                        {link ? (
                          <button
                            type="button"
                            onClick={() => void copyCode(link.code)}
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-background-secondary px-2.5 py-1.5 text-xs text-text-primary hover:bg-background-hover"
                          >
                            <Clipboard className="h-3.5 w-3.5" />
                            {copied === link.code ? 'Copied' : `/start ${link.code}`}
                          </button>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void createLink('client', client.id)}
                          disabled={creatingKey === key}
                          className="h-9 inline-flex items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                        >
                          {creatingKey === key ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                          Generate
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredClients.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-text-muted">No clients found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {data?.links.length ? (
        <div className="bg-background-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">Active Link Codes</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {data.links.slice(0, 6).map((link) => (
              <div key={link.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{link.entityType} · {link.code}</p>
                  <p className="text-xs text-text-muted">Expires {formatDateTime(link.expiresAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyCode(link.code)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover"
                  aria-label="Copy code"
                  title="Copy"
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
