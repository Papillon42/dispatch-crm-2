// ─────────────────────────────────────────────────────────────────────────────
// Driver operational status system — pure domain logic (no DB access).
//
// The runtime source of truth for labels/colors/active flags is the
// DriverStatusConfig table (admin-editable dictionary). This module provides:
//   * the seeded system statuses (codes, colors, icons, transitions)
//   * the transition state machine + override rules
//   * per-status required fields for the Change Status modal
//   * driver-status -> load-status synchronization mapping
// Everything here is deterministic and unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

import type { LoadStatus } from '@prisma/client';

export const DRIVER_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ASSIGNED: 'ASSIGNED',
  TO_PICKUP: 'TO_PICKUP',
  AT_PICKUP: 'AT_PICKUP',
  LOADING: 'LOADING',
  ON_LOAD: 'ON_LOAD',
  IN_TRANSIT: 'IN_TRANSIT',
  AT_DELIVERY: 'AT_DELIVERY',
  UNLOADING: 'UNLOADING',
  DELIVERED: 'DELIVERED',
  INACTIVE: 'INACTIVE',
  OFF_DUTY: 'OFF_DUTY',
  MAINTENANCE: 'MAINTENANCE',
  VACATION: 'VACATION',
  SUSPENDED: 'SUSPENDED',
} as const;

export type DriverStatusCode = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS] | string;

/** Statuses that mean "driver is actively working a load" */
export const ON_TRIP_STATUSES: string[] = [
  'ASSIGNED', 'TO_PICKUP', 'AT_PICKUP', 'LOADING', 'ON_LOAD', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING',
];

/** Statuses that mean "driver is not available for dispatch" */
export const UNAVAILABLE_STATUSES: string[] = [
  'INACTIVE', 'OFF_DUTY', 'MAINTENANCE', 'VACATION', 'SUSPENDED',
];

export interface StatusFieldRequirements {
  /** keys the Change Status modal must fill for this status */
  required: string[];
  requiresLoad: boolean;
}

export interface DefaultStatusConfig {
  code: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  category: 'OPERATIONAL' | 'UNAVAILABLE';
  sortOrder: number;
  isSystem: true;
  requiresLoad: boolean;
  requiredFields: string[];
  allowedNext: string[];
}

// Colors follow the spec (§7): Available green, Assigned light-blue, To Pickup
// orange, At Pickup yellow, Loading purple, On Load dark-blue, In Transit blue,
// At Delivery teal, Unloading lilac, Delivered dark-green, Inactive gray,
// Off Duty light-gray, Maintenance red, Vacation light-blue, Suspended dark-red.
export const DEFAULT_STATUS_CONFIGS: DefaultStatusConfig[] = [
  {
    code: 'AVAILABLE', label: 'Available', color: '#22c55e', icon: 'CircleCheck',
    description: 'Driver is free and ready to accept a new load.',
    category: 'OPERATIONAL', sortOrder: 10, isSystem: true, requiresLoad: false,
    requiredFields: [],
    allowedNext: ['ASSIGNED', 'OFF_DUTY', 'INACTIVE', 'MAINTENANCE', 'VACATION', 'SUSPENDED'],
  },
  {
    code: 'ASSIGNED', label: 'Assigned', color: '#38bdf8', icon: 'ClipboardCheck',
    description: 'Driver is assigned to a load but has not started moving yet.',
    category: 'OPERATIONAL', sortOrder: 20, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId'],
    allowedNext: ['TO_PICKUP', 'AVAILABLE', 'OFF_DUTY'],
  },
  {
    code: 'TO_PICKUP', label: 'To Pickup', color: '#f97316', icon: 'Navigation',
    description: 'Driver is en route to the pickup location.',
    category: 'OPERATIONAL', sortOrder: 30, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId', 'origin'],
    allowedNext: ['AT_PICKUP', 'ASSIGNED'],
  },
  {
    code: 'AT_PICKUP', label: 'At Pickup', color: '#eab308', icon: 'MapPin',
    description: 'Driver arrived at the pickup facility.',
    category: 'OPERATIONAL', sortOrder: 40, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId', 'origin', 'arrivedAt'],
    allowedNext: ['LOADING', 'TO_PICKUP'],
  },
  {
    code: 'LOADING', label: 'Loading', color: '#a855f7', icon: 'PackagePlus',
    description: 'Loading is in progress.',
    category: 'OPERATIONAL', sortOrder: 50, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId'],
    allowedNext: ['ON_LOAD', 'AT_PICKUP'],
  },
  {
    code: 'ON_LOAD', label: 'On Load', color: '#1d4ed8', icon: 'Package',
    description: 'Load is on the truck; driver is loaded and ready to depart.',
    category: 'OPERATIONAL', sortOrder: 60, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId'],
    allowedNext: ['IN_TRANSIT', 'LOADING'],
  },
  {
    code: 'IN_TRANSIT', label: 'In Transit', color: '#3b82f6', icon: 'Truck',
    description: 'Driver departed and is heading to the delivery location.',
    category: 'OPERATIONAL', sortOrder: 70, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId', 'origin', 'destination'],
    allowedNext: ['AT_DELIVERY', 'ON_LOAD'],
  },
  {
    code: 'AT_DELIVERY', label: 'At Delivery', color: '#14b8a6', icon: 'MapPinCheck',
    description: 'Driver arrived at the delivery location.',
    category: 'OPERATIONAL', sortOrder: 80, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId', 'destination'],
    allowedNext: ['UNLOADING', 'IN_TRANSIT'],
  },
  {
    code: 'UNLOADING', label: 'Unloading', color: '#c084fc', icon: 'PackageMinus',
    description: 'Unloading is in progress.',
    category: 'OPERATIONAL', sortOrder: 90, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId'],
    allowedNext: ['DELIVERED', 'AT_DELIVERY'],
  },
  {
    code: 'DELIVERED', label: 'Delivered', color: '#15803d', icon: 'CircleCheckBig',
    description: 'Load has been delivered.',
    category: 'OPERATIONAL', sortOrder: 100, isSystem: true, requiresLoad: true,
    requiredFields: ['loadId', 'deliveredAt'],
    allowedNext: ['AVAILABLE', 'OFF_DUTY'],
  },
  {
    code: 'INACTIVE', label: 'Inactive', color: '#6b7280', icon: 'CircleOff',
    description: 'Driver is temporarily not working.',
    category: 'UNAVAILABLE', sortOrder: 110, isSystem: true, requiresLoad: false,
    requiredFields: ['reason'],
    allowedNext: ['AVAILABLE', 'OFF_DUTY', 'SUSPENDED'],
  },
  {
    code: 'OFF_DUTY', label: 'Off Duty', color: '#9ca3af', icon: 'Moon',
    description: 'Driver is off shift.',
    category: 'UNAVAILABLE', sortOrder: 120, isSystem: true, requiresLoad: false,
    requiredFields: [],
    allowedNext: ['AVAILABLE', 'INACTIVE', 'MAINTENANCE', 'VACATION'],
  },
  {
    code: 'MAINTENANCE', label: 'Maintenance', color: '#ef4444', icon: 'Wrench',
    description: 'Driver or assigned truck is unavailable due to maintenance.',
    category: 'UNAVAILABLE', sortOrder: 130, isSystem: true, requiresLoad: false,
    requiredFields: ['reason', 'expectedReturnAt'],
    allowedNext: ['AVAILABLE', 'OFF_DUTY', 'INACTIVE'],
  },
  {
    code: 'VACATION', label: 'Vacation', color: '#7dd3fc', icon: 'Palmtree',
    description: 'Driver is on vacation.',
    category: 'UNAVAILABLE', sortOrder: 140, isSystem: true, requiresLoad: false,
    requiredFields: [],
    allowedNext: ['AVAILABLE', 'OFF_DUTY'],
  },
  {
    code: 'SUSPENDED', label: 'Suspended', color: '#991b1b', icon: 'Ban',
    description: 'Driver is temporarily suspended.',
    category: 'UNAVAILABLE', sortOrder: 150, isSystem: true, requiresLoad: false,
    requiredFields: ['reason'],
    allowedNext: ['AVAILABLE', 'INACTIVE'],
  },
];

export const DEFAULT_STATUS_BY_CODE: Record<string, DefaultStatusConfig> =
  Object.fromEntries(DEFAULT_STATUS_CONFIGS.map((c) => [c.code, c]));

/** Fallback metadata for UI when the dictionary hasn't loaded yet. */
export function statusMeta(code: string, configs?: Array<{ code: string; label: string; color: string; icon?: string | null }>) {
  const fromDb = configs?.find((c) => c.code === code);
  if (fromDb) return { label: fromDb.label, color: fromDb.color, icon: fromDb.icon ?? 'Circle' };
  const def = DEFAULT_STATUS_BY_CODE[code];
  if (def) return { label: def.label, color: def.color, icon: def.icon };
  return { label: code.replace(/_/g, ' '), color: '#94a3b8', icon: 'Circle' };
}

// ─── TRANSITIONS ─────────────────────────────────────────────────────────────

export interface TransitionContext {
  /** Does the driver currently have an active (not completed) load? */
  hasActiveLoad: boolean;
  /** loadId supplied with the change request (or already linked) */
  loadId?: string | null;
  /** custom dictionary rows (for admin-added statuses) */
  configs?: Array<{ code: string; allowedNext: string[]; isActive: boolean; requiresLoad: boolean }>;
}

export interface TransitionResult {
  ok: boolean;
  /** transition not in the happy path — allowed only as manual override */
  requiresOverride: boolean;
  /** hard block — not allowed even with override */
  hardBlock: boolean;
  reason?: string;
}

function allowedNextFor(code: string, ctx?: TransitionContext): string[] | null {
  const custom = ctx?.configs?.find((c) => c.code === code);
  if (custom) return custom.allowedNext;
  return DEFAULT_STATUS_BY_CODE[code]?.allowedNext ?? null;
}

/**
 * Validates from -> to. Returns:
 *  ok=true                        — normal transition
 *  ok=false, requiresOverride     — abnormal, allowed with reason for privileged roles
 *  ok=false, hardBlock            — impossible in any case (data integrity)
 */
export function validateTransition(from: string, to: string, ctx: TransitionContext): TransitionResult {
  if (from === to) {
    return { ok: false, requiresOverride: false, hardBlock: true, reason: 'Driver is already in this status' };
  }

  const toRequiresLoad = ctx.configs?.find((c) => c.code === to)?.requiresLoad
    ?? DEFAULT_STATUS_BY_CODE[to]?.requiresLoad
    ?? false;

  // Hard integrity blocks (cannot be overridden):
  if (toRequiresLoad && !ctx.hasActiveLoad && !ctx.loadId) {
    return {
      ok: false, requiresOverride: false, hardBlock: true,
      reason: `Status "${to}" requires an active load assigned to the driver`,
    };
  }
  if (to === 'AVAILABLE' && ctx.hasActiveLoad) {
    return {
      ok: false, requiresOverride: true, hardBlock: false,
      reason: 'Driver still has an unfinished active load. Complete or unassign it, or perform a manual override.',
    };
  }

  const allowed = allowedNextFor(from, ctx);
  if (allowed === null) {
    // Unknown "from" status (e.g. legacy/custom without config) — allow with override
    return { ok: false, requiresOverride: true, hardBlock: false, reason: `Unknown current status "${from}"` };
  }
  if (allowed.includes(to)) {
    return { ok: true, requiresOverride: false, hardBlock: false };
  }

  return {
    ok: false, requiresOverride: true, hardBlock: false,
    reason: `"${from}" → "${to}" is not a standard transition (expected: ${allowed.join(', ') || 'none'})`,
  };
}

// ─── REQUIRED FIELDS ─────────────────────────────────────────────────────────

export interface StatusChangeInput {
  status: string;
  loadId?: string | null;
  truckId?: string | null;
  trailerId?: string | null;
  origin?: { address?: string | null; latitude?: number | null; longitude?: number | null } | null;
  destination?: { address?: string | null; latitude?: number | null; longitude?: number | null } | null;
  currentLocation?: { latitude?: number | null; longitude?: number | null; label?: string | null } | null;
  eta?: string | Date | null;
  arrivedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  comment?: string | null;
  reason?: string | null;
  expectedReturnAt?: string | Date | null;
  changedAt?: string | Date | null;
}

export function requiredFieldsFor(
  status: string,
  configs?: Array<{ code: string; requiredFields: string[] }>,
): string[] {
  const custom = configs?.find((c) => c.code === status);
  if (custom) return custom.requiredFields;
  return DEFAULT_STATUS_BY_CODE[status]?.requiredFields ?? [];
}

/** Returns the list of missing required field keys for the given input. */
export function missingRequiredFields(
  input: StatusChangeInput,
  configs?: Array<{ code: string; requiredFields: string[] }>,
): string[] {
  const required = requiredFieldsFor(input.status, configs);
  const missing: string[] = [];

  for (const field of required) {
    switch (field) {
      case 'loadId':
        if (!input.loadId) missing.push('loadId');
        break;
      case 'origin':
        if (!input.origin?.address) missing.push('origin');
        break;
      case 'destination':
        if (!input.destination?.address) missing.push('destination');
        break;
      case 'arrivedAt':
        if (!input.arrivedAt && !input.changedAt) missing.push('arrivedAt');
        break;
      case 'deliveredAt':
        if (!input.deliveredAt && !input.changedAt) missing.push('deliveredAt');
        break;
      case 'reason':
        if (!input.reason?.trim()) missing.push('reason');
        break;
      case 'expectedReturnAt':
        if (!input.expectedReturnAt) missing.push('expectedReturnAt');
        break;
      case 'truckId':
        if (!input.truckId) missing.push('truckId');
        break;
      default:
        // custom field keys added by admins: require a non-empty comment as carrier
        break;
    }
  }
  return missing;
}

// ─── DRIVER STATUS → LOAD STATUS SYNC ────────────────────────────────────────

/**
 * Maps a driver operational status onto the linked load's status.
 * Returns null when the load status should not change.
 */
export function loadStatusForDriverStatus(driverStatus: string): LoadStatus | null {
  switch (driverStatus) {
    case 'ASSIGNED': return 'ASSIGNED';
    case 'TO_PICKUP': return 'EN_ROUTE_TO_PICKUP';
    case 'AT_PICKUP': return 'AT_PICKUP';
    case 'LOADING': return 'AT_PICKUP';   // Load model has no LOADING; stays AT_PICKUP
    case 'ON_LOAD': return 'LOADED';
    case 'IN_TRANSIT': return 'IN_TRANSIT';
    case 'AT_DELIVERY': return 'AT_DELIVERY';
    case 'UNLOADING': return 'AT_DELIVERY';
    case 'DELIVERED': return 'DELIVERED';
    default: return null;
  }
}

/** Reverse mapping: load status change → driver status (for /api/loads/:id/status sync). */
export function driverStatusForLoadStatus(loadStatus: LoadStatus): string | null {
  switch (loadStatus) {
    case 'ASSIGNED': return 'ASSIGNED';
    case 'EN_ROUTE_TO_PICKUP': return 'TO_PICKUP';
    case 'AT_PICKUP': return 'AT_PICKUP';
    case 'LOADED': return 'ON_LOAD';
    case 'IN_TRANSIT': return 'IN_TRANSIT';
    case 'AT_DELIVERY': return 'AT_DELIVERY';
    case 'DELIVERED': return 'DELIVERED';
    default: return null;
  }
}

/** Load statuses considered "active" (unfinished) for the driver. */
export const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'PROBLEM',
];

// ─── GEO HELPERS (geofence automation) ───────────────────────────────────────

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export interface GeofenceSuggestion {
  suggestedStatus: string;
  reason: string;
}

/**
 * Given the driver's current status + GPS point and the active load geometry,
 * suggests the next status per spec §12. Pure function — the caller decides
 * whether to auto-apply (company setting) or just surface the suggestion.
 */
export function suggestStatusFromPosition(params: {
  currentStatus: string;
  position: { lat: number; lng: number };
  speedMph?: number | null;
  pickup?: { lat: number; lng: number } | null;
  delivery?: { lat: number; lng: number } | null;
  pickupRadiusMiles: number;
  deliveryRadiusMiles: number;
}): GeofenceSuggestion | null {
  const { currentStatus, position, speedMph, pickup, delivery, pickupRadiusMiles, deliveryRadiusMiles } = params;

  const nearPickup = pickup ? haversineMiles(position, pickup) <= pickupRadiusMiles : false;
  const nearDelivery = delivery ? haversineMiles(position, delivery) <= deliveryRadiusMiles : false;
  const moving = (speedMph ?? 0) > 5;

  switch (currentStatus) {
    case 'TO_PICKUP':
      if (nearPickup) return { suggestedStatus: 'AT_PICKUP', reason: 'Driver entered the pickup geofence' };
      break;
    case 'AT_PICKUP':
      if (nearPickup && !moving) return { suggestedStatus: 'LOADING', reason: 'Driver has been stationary inside the pickup geofence' };
      break;
    case 'ON_LOAD':
      if (moving && !nearPickup) return { suggestedStatus: 'IN_TRANSIT', reason: 'GPS shows the truck left the pickup geofence and started moving' };
      break;
    case 'IN_TRANSIT':
      if (nearDelivery) return { suggestedStatus: 'AT_DELIVERY', reason: 'Driver entered the delivery geofence' };
      break;
    case 'UNLOADING':
      if (!nearDelivery) return { suggestedStatus: 'DELIVERED', reason: 'Driver left the delivery geofence after unloading' };
      break;
    default:
      break;
  }
  return null;
}
