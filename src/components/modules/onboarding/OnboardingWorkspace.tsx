'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Headset,
  Truck,
  UserSearch,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type OnboardingState = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | string;
  requestedRole: string | null;
  roleRequestNote: string | null;
  rejectedReason: string | null;
  clientId: string | null;
  driverId: string | null;
};

const ROLE_CARDS = [
  {
    role: 'DISPATCHER',
    title: 'Dispatcher',
    icon: Headset,
    description: 'Book loads, assign drivers, manage daily operations for your clients.',
  },
  {
    role: 'CLIENT',
    title: 'Client (Truck Owner)',
    icon: Building2,
    description: 'Read-only portal: your trucks, your drivers, your loads and their live positions.',
  },
  {
    role: 'DRIVER',
    title: 'Driver',
    icon: Truck,
    description: 'Your trips, statuses, documents and personal finance — miles, rate per mile, earnings.',
  },
  {
    role: 'RECRUITER',
    title: 'Recruiter',
    icon: UserSearch,
    description: 'Onboard new drivers, companies and trucks. No access to loads or finance.',
  },
  {
    role: 'OWNER',
    title: 'Owner',
    icon: Crown,
    description: 'Full control of the company: approvals, finance, settings, every module.',
  },
] as const;

function homeForRole(role: string): string {
  if (role === 'CLIENT') return '/portal';
  if (role === 'DRIVER') return '/driver-app';
  return '/dashboard';
}

export function OnboardingWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding', { cache: 'no-store' });
      if (!res.ok) throw new Error('Unable to load your registration state');
      const payload = (await res.json()) as OnboardingState;
      setState(payload);
      if (payload.status === 'ACTIVE') {
        router.replace(homeForRole(payload.role));
        return;
      }
      setFullName((current) => current || payload.fullName || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  // While waiting for approval, poll so the user gets in the moment the Owner approves
  const waiting = Boolean(state && state.status === 'PENDING' && state.requestedRole);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  async function submit() {
    if (!selectedRole) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          companyName: companyName.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to submit your request');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your request');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'h-11 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">Dispatch CRM</p>
            <p className="text-xs text-text-muted">Account setup</p>
          </div>
        </div>

        {state?.status === 'REJECTED' && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-5 mb-6">
            <div className="flex items-center gap-2 text-red-300 font-medium">
              <XCircle className="h-5 w-5" /> Your registration was declined
            </div>
            {state.rejectedReason && <p className="text-sm text-red-300/80 mt-2">Reason: {state.rejectedReason}</p>}
            <p className="text-sm text-text-secondary mt-2">You can submit a new request below.</p>
          </div>
        )}

        {waiting && state ? (
          <div className="rounded-lg border border-border bg-background-card p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
              <Clock className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Waiting for approval</h1>
            <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
              Your request for the <span className="font-medium text-text-primary">{state.requestedRole}</span> role
              has been sent to the company Owner. You will get access the moment it is approved —
              this page checks automatically.
            </p>
            <p className="text-xs text-text-muted mt-4">{state.email}</p>
            <button
              type="button"
              onClick={() => { setState({ ...state, requestedRole: null }); }}
              className="mt-6 text-xs text-text-secondary hover:text-text-primary underline underline-offset-4"
            >
              Change requested role
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-background-card p-6 md:p-8">
            <h1 className="text-xl font-bold text-text-primary">Choose your role</h1>
            <p className="text-sm text-text-secondary mt-1">
              The company Owner reviews every registration and approves the role. Pick the one that matches how you will use the system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              {ROLE_CARDS.map(({ role, title, icon: Icon, description }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    'text-left rounded-lg border p-4 transition-colors',
                    selectedRole === role
                      ? 'border-brand bg-brand-muted'
                      : 'border-border bg-background-secondary hover:bg-background-hover',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0',
                      selectedRole === role ? 'bg-brand text-white' : 'bg-background-hover text-text-secondary',
                    )}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <p className="font-medium text-text-primary">{title}</p>
                    {selectedRole === role && <CheckCircle2 className="h-4 w-4 text-brand-light ml-auto" />}
                  </div>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{description}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Full Name</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 ..." className={inputCls} />
              </label>
              {(selectedRole === 'CLIENT' || selectedRole === 'DRIVER') && (
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Company Name {selectedRole === 'DRIVER' && '(who do you drive for?)'}
                  </span>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ABC Logistics LLC" className={inputCls} />
                </label>
              )}
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Note for the Owner (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Anything that helps identify you — truck number, dispatcher name, MC#…"
                  className="w-full rounded-md border border-border bg-background-secondary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!selectedRole || submitting}
              className="mt-6 h-11 w-full rounded-md bg-brand text-sm font-medium text-white hover:bg-brand-dark transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send request to the Owner'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
