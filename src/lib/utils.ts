import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatRpm(rpm: number | null): string {
  if (rpm === null || rpm === undefined) return '—';
  return `$${rpm.toFixed(2)}/mi`;
}

export function formatDate(date: Date | string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(date));
}

export function timeAgo(date: Date | string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
