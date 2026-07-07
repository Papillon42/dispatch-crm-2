// Client-safe mirror of the resource `read` column from PERMISSIONS in
// rbac.ts, scoped to just the resources that back a Sidebar nav item.
// This file must NOT import rbac.ts directly — rbac.ts pulls in
// `@clerk/nextjs/server` + Prisma, which cannot be bundled into a
// 'use client' component. Keep this in sync if PERMISSIONS changes.
//
// Purpose: hide nav items a role has zero read access to, so e.g. an
// Updater doesn't see a "Финансы" link that 403s the moment they click it.
// Server-side RBAC in each API route remains the real enforcement layer —
// this is UX only.

export type NavResource =
  | 'clients' | 'drivers' | 'trucks' | 'loads' | 'map'
  | 'communications' | 'finance' | 'reports' | 'documents'
  | 'settings' | 'audit_log';

const HIDDEN_FOR_ROLE: Record<string, NavResource[]> = {
  ADMIN: [],
  FINANCE: ['map'],
  SENIOR_DISPATCHER: ['settings', 'audit_log'],
  DISPATCHER: ['settings', 'audit_log'],
  UPDATER: ['finance', 'settings', 'audit_log'],
  RECRUITER: ['loads', 'map', 'finance', 'settings', 'audit_log'],
};

export function canSeeNavResource(role: string | null | undefined, resource: NavResource): boolean {
  if (!role) return true; // fail-open while role hasn't loaded yet, avoids nav flicker
  const hidden = HIDDEN_FOR_ROLE[role] ?? [];
  return !hidden.includes(resource);
}
