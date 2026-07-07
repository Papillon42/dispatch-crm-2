'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Minimal, dependency-free toast system. Introduced because several actions
 * across the app (assign driver, close load, delete X) were failing silently
 * on error — no visible feedback when a fetch returned non-2xx. This gives
 * every module a consistent way to surface success/error/info without
 * pulling in a new UI library.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => setToasts((current) => current.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2',
              t.variant === 'success' && 'bg-success/10 border-success/30 text-success',
              t.variant === 'error' && 'bg-danger/10 border-danger/30 text-danger',
              t.variant === 'info' && 'bg-background-card border-border text-text-primary',
            )}
          >
            {t.variant === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {t.variant === 'error' && <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {t.variant === 'info' && <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p className="text-sm flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft rather than crash the page if a component renders outside the
    // provider (e.g. in isolation/tests) — falls back to a no-op + console.
    return { showToast: (message, variant) => console.warn(`[toast:${variant ?? 'info'}]`, message) };
  }
  return ctx;
}
