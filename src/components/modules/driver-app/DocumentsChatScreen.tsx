'use client';

import { useState } from 'react';
import { FileText, Camera, Upload, Send } from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function DocumentsChatScreen() {
  const [tab, setTab] = useState<'documents' | 'chat'>('documents');
  const { data: loadData, refresh: refreshLoad } = usePolling<any>('/api/driver-app/current-load', { intervalMs: 10000 });
  const { data: chatData, refresh: refreshChat } = usePolling<any>('/api/driver-app/chat', { intervalMs: 6000 });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = loadData?.load;
  const messages = chatData?.messages ?? [];

  async function uploadDoc(docType: 'BOL' | 'POD') {
    if (!load) return;
    setBusy(true);
    try {
      await fetch('/api/driver-app/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadId: load.id,
          docType,
          fileName: `${docType}_${load.loadCode}.jpg`,
          fileUrl: `https://storage.example.com/loads/${load.id}/${docType.toLowerCase()}.jpg`,
        }),
      });
      refreshLoad();
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;
    await fetch('/api/driver-app/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: message }),
    });
    setMessage('');
    refreshChat();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border-subtle px-4">
        <button
          onClick={() => setTab('documents')}
          className={cn('px-3 py-2.5 text-xs font-medium border-b-2 -mb-px', tab === 'documents' ? 'border-brand text-brand-light' : 'border-transparent text-text-secondary')}
        >
          Documents
        </button>
        <button
          onClick={() => setTab('chat')}
          className={cn('px-3 py-2.5 text-xs font-medium border-b-2 -mb-px', tab === 'chat' ? 'border-brand text-brand-light' : 'border-transparent text-text-secondary')}
        >
          Chat
        </button>
      </div>

      {tab === 'documents' && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy || !load} onClick={() => uploadDoc('BOL')} className="flex flex-col items-center gap-1.5 py-4 rounded-lg border border-dashed border-border text-text-secondary hover:text-text-primary disabled:opacity-50">
              <Camera className="w-5 h-5" /> <span className="text-xs">Upload BOL</span>
            </button>
            <button disabled={busy || !load} onClick={() => uploadDoc('POD')} className="flex flex-col items-center gap-1.5 py-4 rounded-lg border border-dashed border-border text-text-secondary hover:text-text-primary disabled:opacity-50">
              <Upload className="w-5 h-5" /> <span className="text-xs">Upload POD</span>
            </button>
          </div>
          <div className="space-y-1.5">
            {(load?.documents ?? []).map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-background-card border border-border">
                <FileText className="w-4 h-4 text-brand-light flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary truncate">{doc.fileName}</p>
                  <p className="text-2xs text-text-muted">{timeAgo(doc.uploadedAt)}</p>
                </div>
              </div>
            ))}
            {(!load || (load.documents ?? []).length === 0) && (
              <p className="text-xs text-text-muted text-center py-4">No documents yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {messages.length === 0 && <p className="text-xs text-text-muted text-center py-6">No messages yet.</p>}
            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex', m.direction === 'INBOUND' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%] rounded-lg px-3 py-2 text-sm', m.direction === 'INBOUND' ? 'bg-brand-muted border border-brand/30 text-text-primary' : 'bg-background-card text-text-primary')}>
                  <p>{m.body}</p>
                  <p className="text-2xs text-text-muted mt-0.5">{timeAgo(m.at)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border-subtle flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Write a message…"
              className="flex-1 px-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted"
            />
            <button onClick={sendMessage} className="w-10 h-10 rounded-md bg-brand hover:bg-brand-dark flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
