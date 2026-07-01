import { UserRole } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ─── PERMISSION MATRIX ────────────────────────────────────────────────────────

type Action = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve';
type Resource =
  | 'users' | 'settings'
  | 'clients' | 'client_contacts'
  | 'drivers' | 'trucks' | 'trailers'
  | 'loads' | 'load_status_operational' | 'load_status_financial'
  | 'documents' | 'communications' | 'tasks' | 'issues'
  | 'finance' | 'invoices' | 'commissions'
  | 'reports' | 'map' | 'audit_log' | 'export_requests';

type Permission = {
  [K in Action]?: 'all' | 'own' | 'team' | 'none';
};

const PERMISSIONS: Record<UserRole, Record<Resource, Permission>> = {
  ADMIN: {
    users:                    { create: 'all', read: 'all', update: 'all', delete: 'all' },
    settings:                 { create: 'all', read: 'all', update: 'all', delete: 'all' },
    clients:                  { create: 'all', read: 'all', update: 'all', delete: 'all' },
    client_contacts:          { create: 'all', read: 'all', update: 'all', delete: 'all' },
    drivers:                  { create: 'all', read: 'all', update: 'all', delete: 'all' },
    trucks:                   { create: 'all', read: 'all', update: 'all', delete: 'all' },
    trailers:                 { create: 'all', read: 'all', update: 'all', delete: 'all' },
    loads:                    { create: 'all', read: 'all', update: 'all', delete: 'all' },
    load_status_operational:  { update: 'all' },
    load_status_financial:    { update: 'all' },
    documents:                { create: 'all', read: 'all', update: 'all', delete: 'all' },
    communications:           { create: 'all', read: 'all', update: 'all', delete: 'all' },
    tasks:                    { create: 'all', read: 'all', update: 'all', delete: 'all' },
    issues:                   { create: 'all', read: 'all', update: 'all', delete: 'all' },
    finance:                  { create: 'all', read: 'all', update: 'all', delete: 'all' },
    invoices:                 { create: 'all', read: 'all', update: 'all', delete: 'all' },
    commissions:              { create: 'all', read: 'all', update: 'all', delete: 'all' },
    reports:                  { read: 'all', export: 'all' },
    map:                      { read: 'all' },
    audit_log:                { read: 'all' },
    export_requests:          { read: 'all', approve: 'all' },
  },

  SENIOR_DISPATCHER: {
    users:                    { read: 'team' },
    settings:                 { read: 'none' },
    clients:                  { create: 'all', read: 'team', update: 'team' },
    client_contacts:          { create: 'all', read: 'team', update: 'team' },
    drivers:                  { create: 'all', read: 'team', update: 'team' },
    trucks:                   { create: 'all', read: 'team', update: 'team' },
    trailers:                 { create: 'all', read: 'team', update: 'team' },
    loads:                    { create: 'all', read: 'team', update: 'team', delete: 'team' },
    load_status_operational:  { update: 'all' },
    load_status_financial:    { update: 'all' },
    documents:                { create: 'all', read: 'team', update: 'team', delete: 'team' },
    communications:           { create: 'all', read: 'team', update: 'team' },
    tasks:                    { create: 'all', read: 'team', update: 'team' },
    issues:                   { create: 'all', read: 'team', update: 'team' },
    finance:                  { read: 'team' },
    invoices:                 { read: 'team' },
    commissions:              { read: 'own' },
    reports:                  { read: 'team', export: 'none' },
    map:                      { read: 'all' },
    audit_log:                { read: 'none' },
    export_requests:          { create: 'all' },
  },

  DISPATCHER: {
    users:                    { read: 'none' },
    settings:                 { read: 'none' },
    clients:                  { create: 'all', read: 'own', update: 'own' },
    client_contacts:          { create: 'all', read: 'own', update: 'own' },
    drivers:                  { create: 'all', read: 'own', update: 'own' },
    trucks:                   { create: 'all', read: 'own', update: 'own' },
    trailers:                 { create: 'all', read: 'own', update: 'own' },
    loads:                    { create: 'all', read: 'own', update: 'own' },
    load_status_operational:  { update: 'own' },
    load_status_financial:    { update: 'none' },
    documents:                { create: 'all', read: 'own', update: 'own' },
    communications:           { create: 'all', read: 'own', update: 'own' },
    tasks:                    { create: 'all', read: 'own', update: 'own' },
    issues:                   { create: 'all', read: 'own', update: 'own' },
    finance:                  { read: 'own' },
    invoices:                 { read: 'own' },
    commissions:              { read: 'own' },
    reports:                  { read: 'own', export: 'none' },
    map:                      { read: 'own' },
    audit_log:                { read: 'none' },
    export_requests:          { create: 'all' },
  },

  UPDATER: {
    users:                    { read: 'none' },
    settings:                 { read: 'none' },
    clients:                  { read: 'all' },
    client_contacts:          { read: 'all' },
    drivers:                  { read: 'all', update: 'all' },
    trucks:                   { read: 'all' },
    trailers:                 { read: 'all' },
    loads:                    { read: 'all', update: 'all' },
    load_status_operational:  { update: 'all' },
    load_status_financial:    { update: 'none' },
    documents:                { read: 'all', update: 'all' },
    communications:           { create: 'all', read: 'own', update: 'own' },
    tasks:                    { create: 'all', read: 'own', update: 'own' },
    issues:                   { create: 'all', read: 'all', update: 'all' },
    finance:                  { read: 'none' },
    invoices:                 { read: 'none' },
    commissions:              { read: 'none' },
    reports:                  { read: 'own' },
    map:                      { read: 'all', update: 'all' },
    audit_log:                { read: 'none' },
    export_requests:          { read: 'none' },
  },

  RECRUITER: {
    users:                    { read: 'none' },
    settings:                 { read: 'none' },
    clients:                  { create: 'all', read: 'all', update: 'all' },
    client_contacts:          { create: 'all', read: 'all', update: 'all' },
    drivers:                  { create: 'all', read: 'all', update: 'all' },
    trucks:                   { create: 'all', read: 'all', update: 'all' },
    trailers:                 { create: 'all', read: 'all', update: 'all' },
    loads:                    { read: 'none' },
    load_status_operational:  { update: 'none' },
    load_status_financial:    { update: 'none' },
    documents:                { create: 'all', read: 'all' },
    communications:           { create: 'all', read: 'own', update: 'own' },
    tasks:                    { create: 'all', read: 'own', update: 'own' },
    issues:                   { read: 'none' },
    finance:                  { read: 'none' },
    invoices:                 { read: 'none' },
    commissions:              { read: 'none' },
    reports:                  { read: 'own' },
    map:                      { read: 'none' },
    audit_log:                { read: 'none' },
    export_requests:          { create: 'all' },
  },

  FINANCE: {
    users:                    { read: 'none' },
    settings:                 { read: 'all', update: 'all' },
    clients:                  { read: 'all' },
    client_contacts:          { read: 'all' },
    drivers:                  { read: 'all' },
    trucks:                   { read: 'all' },
    trailers:                 { read: 'all' },
    loads:                    { read: 'all' },
    load_status_operational:  { update: 'none' },
    load_status_financial:    { update: 'all' },
    documents:                { read: 'all' },
    communications:           { read: 'all' },
    tasks:                    { create: 'all', read: 'own', update: 'own' },
    issues:                   { read: 'all' },
    finance:                  { create: 'all', read: 'all', update: 'all', delete: 'all' },
    invoices:                 { create: 'all', read: 'all', update: 'all', delete: 'all' },
    commissions:              { create: 'all', read: 'all', update: 'all', delete: 'all' },
    reports:                  { read: 'all', export: 'all' },
    map:                      { read: 'none' },
    audit_log:                { read: 'none' },
    export_requests:          { create: 'all' },
  },
};

// ─── PERMISSION CHECKER ───────────────────────────────────────────────────────

export function can(
  role: UserRole,
  action: Action,
  resource: Resource,
): boolean {
  const perms = PERMISSIONS[role]?.[resource];
  if (!perms) return false;
  const level = perms[action];
  return level === 'all' || level === 'own' || level === 'team';
}

export function canScope(
  role: UserRole,
  action: Action,
  resource: Resource,
): 'all' | 'own' | 'team' | 'none' {
  const perms = PERMISSIONS[role]?.[resource];
  if (!perms) return 'none';
  return perms[action] ?? 'none';
}

// ─── LOAD STATUS STATE MACHINE ────────────────────────────────────────────────

import { LoadStatus } from '@prisma/client';

export const VALID_STATUS_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  NEW_LEAD:                   ['NEGOTIATING', 'CANCELLED'],
  NEGOTIATING:                ['BOOKED', 'CANCELLED'],
  BOOKED:                     ['RATE_CONFIRMATION_RECEIVED', 'CANCELLED'],
  RATE_CONFIRMATION_RECEIVED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:                   ['EN_ROUTE_TO_PICKUP', 'CANCELLED', 'PROBLEM'],
  EN_ROUTE_TO_PICKUP:         ['AT_PICKUP', 'PROBLEM', 'CANCELLED'],
  AT_PICKUP:                  ['LOADED', 'PROBLEM', 'CANCELLED'],
  LOADED:                     ['IN_TRANSIT', 'PROBLEM'],
  IN_TRANSIT:                 ['AT_DELIVERY', 'PROBLEM'],
  AT_DELIVERY:                ['DELIVERED', 'PROBLEM'],
  DELIVERED:                  ['POD_UPLOADED', 'PROBLEM'],
  POD_UPLOADED:               ['INVOICED'],
  INVOICED:                   ['PAID'],
  PAID:                       ['CLOSED'],
  CLOSED:                     [],
  CANCELLED:                  [],
  PROBLEM:                    ['EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'CANCELLED'],
};

export function isValidStatusTransition(from: LoadStatus, to: LoadStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── API ROUTE GUARD ──────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  clerkId: string;
  role: UserRole;
  isSenior: boolean;
  managerId: string | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId: clerkId } = auth();
  if (!clerkId) return null;

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, role: true, isSenior: true, managerId: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') return null;

  return {
    userId: user.id,
    clerkId: user.clerkId,
    role: user.role,
    isSenior: user.isSenior,
    managerId: user.managerId,
  };
}

type RouteHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>,
) => Promise<NextResponse>;

export function withAuth(
  handler: RouteHandler,
  requiredResource?: Resource,
  requiredAction?: Action,
) {
  return async (req: NextRequest, { params }: { params?: Record<string, string> } = {}) => {
    const ctx = await getAuthContext();

    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requiredResource && requiredAction) {
      if (!can(ctx.role, requiredAction, requiredResource)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return handler(req, ctx, params);
  };
}

// ─── ROW-LEVEL FILTER HELPERS ─────────────────────────────────────────────────

export function getDispatcherFilter(ctx: AuthContext): object {
  const scope = canScope(ctx.role, 'read', 'loads');
  if (scope === 'all') return {};
  if (scope === 'team') {
    // Senior sees their team
    return { dispatcher: { OR: [{ id: ctx.userId }, { managerId: ctx.userId }] } };
  }
  // 'own' — dispatcher sees only their own
  return { dispatcherId: ctx.userId };
}

export function getClientFilter(ctx: AuthContext): object {
  const scope = canScope(ctx.role, 'read', 'clients');
  if (scope === 'all') return {};
  if (scope === 'team') {
    return { dispatcher: { OR: [{ id: ctx.userId }, { managerId: ctx.userId }] } };
  }
  return { dispatcherId: ctx.userId };
}

export function getDriverFilter(ctx: AuthContext): object {
  const scope = canScope(ctx.role, 'read', 'drivers');
  if (scope === 'all') return {};
  if (scope === 'team') {
    return { dispatcher: { OR: [{ id: ctx.userId }, { managerId: ctx.userId }] } };
  }
  return { dispatcherId: ctx.userId };
}
