'use client';

import { useState } from 'react';
import { Sparkles, Search, TrendingDown, Loader2 } from 'lucide-react';
import { LoadStatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils';

export function AiAssistantWorkspace() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<'search' | 'rpm' | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [rpmResult, setRpmResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (!query.trim()) return;
    setBusy('search');
    setError(null);
    setSearchResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nl_search', payload: { query } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Search failed');
      setSearchResult(json);
    } catch (e: any) {
      setError(e.message ?? 'AI search unavailable (check ANTHROPIC_API_KEY).');
    } finally {
      setBusy(null);
    }
  }

  async function runRpmAnalysis() {
    setBusy('rpm');
    setError(null);
    setRpmResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_low_rpm', payload: {} }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Analysis failed');
      setRpmResult(json);
    } catch (e: any) {
      setError(e.message ?? 'AI analysis unavailable (check ANTHROPIC_API_KEY).');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-light" /> AI Assistant
        </h1>
        <p className="text-sm text-text-secondary mt-1">Natural-language search and insights — every action requires your confirmation before it touches data (human-in-the-loop, §15)</p>
      </div>

      <div className="bg-background-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Search the CRM</h3>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder='e.g. "show all Walmart loads from May with RPM below 2.5"'
            className="flex-1 px-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted"
          />
          <button onClick={runSearch} disabled={busy === 'search'} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-50">
            {busy === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>

        {searchResult && (
          <div className="mt-4">
            <p className="text-xs text-text-muted mb-2">Interpreted filters: <code className="text-text-secondary">{JSON.stringify(searchResult.filtersApplied)}</code></p>
            <table className="w-full data-table">
              <thead><tr className="border-b border-border-subtle"><th>Load</th><th>Client</th><th>Driver</th><th>Rate</th><th>Status</th></tr></thead>
              <tbody>
                {(searchResult.result ?? []).length === 0 && <tr><td colSpan={5} className="text-center py-6 text-text-muted">No matching loads.</td></tr>}
                {(searchResult.result ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="text-brand-light">{l.loadCode}</td>
                    <td>{l.client?.companyName ?? '—'}</td>
                    <td>{l.driver?.fullName ?? '—'}</td>
                    <td>{formatCurrency(l.rate)}</td>
                    <td><LoadStatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-background-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5"><TrendingDown className="w-4 h-4 text-warning" /> Low RPM Analysis</h3>
          <button onClick={runRpmAnalysis} disabled={busy === 'rpm'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-primary text-xs font-medium hover:bg-background-hover disabled:opacity-50">
            {busy === 'rpm' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Analyze last 30 days
          </button>
        </div>
        {rpmResult && (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-text-muted">{rpmResult.analyzedLoads} loads below target RPM (${rpmResult.targetRpm}/mi)</p>
            {(rpmResult.result?.insights ?? []).map((i: string, idx: number) => <p key={idx} className="text-text-secondary">· {i}</p>)}
            {(rpmResult.result?.recommendations ?? []).map((i: string, idx: number) => <p key={idx} className="text-success">→ {i}</p>)}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
