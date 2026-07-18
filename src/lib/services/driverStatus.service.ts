// ─────────────────────────────────────────────────────────────────────────────
// updateDriverOperationalStatus() — the single server-side entry point for all
// driver status changes (CRM UI, driver app, Telegram, GPS automation).
//
// Executes atomically:
//   permission check → driver check → transition check → required fields →
//   active-load / truck / tenant checks → BEGIN TX → update driver → update
//   load → update truck → history row → audit log → activity → notifications
//   → COMMIT → realtime event → return synced entities.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma, type LoadStatus } from '@prisma/client';
import { db } from '@/lib/db';
// Actor performing the change. AuthContext is compatible; internal/system
// callers (driver app, Telegram, GPS automation) pass { userId: null, role: 'SYSTEM' }.
export interface ActorContext {
  userId: string | null;
  role: string;
}
import {
  ACTIVE_LOAD_STATUSES,
  DEFAULT_STATUS_CONFIGS,
  loadStatusForDriverStatus,
  driverStatusForLoadStatus,
  missingRequiredFields,
  statusMeta,
  validateTransition,
  type StatusChangeInput,
} from '@/lib/driverStatus';
import { publishRealtimeEvent } from '@/lib/realtime';

export class StatusChangeError extends Error {
  constructor(
    message: string,
    public httpStatus: number = 422,
    public code: string = 'INVALID_STATUS_CHANGE',
    public details?: unknown,
  ) {
    super(message);
  }
}

// Roles allowed to change operational driver statuses at all
const STATUS_CHANGE_ROLES = ['ADMIN', 'SENIOR_DISPATCHER', 'DISPATCHER', 'UPDATER'] as const;
// Roles allowed to perform manual overrides (non-standard transitions)
const OVERRIDE_ROLES = ['ADMIN', 'SENIOR_DISPATCHER'] as const;
// Updater may only move drivers along the operational pipeline
const UPDATER_ALLOWED_STATUSES = [
  'TO_PICKUP', 'AT_PICKUP', 'LOADING', 'ON_LOAD', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'DELIVERED',
];

export interface UpdateStatusOptions {
  source?: 'CRM' | 'APP' | 'TELEGRAM' | 'GPS' | 'SYSTEM';
  isAutomatic?: boolean;
  /** explicit user confirmation of a non-standard transition */
  manualOverride?: boolean;
  ip?: string | null;
  /** skip transition validation entirely (internal sync from load pipeline) */
  trustedSync?: boolean;
}

/** Loads the status dictionary, seeding the system defaults on first call. */
export async function getDriverStatusConfigs(onlyActive = false) {
  let configs = await db.driverStatusConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  if (configs.length === 0) {
    await db.driverStatusConfig.createMany({
      data: DEFAULT_STATUS_CONFIGS.map((c) => ({
        code: c.code,
        label: c.label,
        color: c.color,
        icon: c.icon,
        description: c.description,
        category: c.category,
        sortOrder: c.sortOrder,
        isSystem: true,
        requiresLoad: c.requiresLoad,
        requiredFields: c.requiredFields,
        allowedNext: c.allowedNext,
      })),
      skipDuplicates: true,
    });
    configs = await db.driverStatusConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  return onlyActive ? configs.filter((c) => c.isActive) : configs;
}

const DRIVER_INCLUDE = {
  client: { select: { id: true, companyName: true } },
  dispatcher: { select: { id: true, fullName: true } },
  updater: { select: { id: true, fullName: true } },
  statusUpdatedBy: { select: { id: true, fullName: true } },
  currentTruck: { select: { id: true, truckNumber: true, trailerType: true, clientId: true, maintenanceStatus: true } },
  currentTrailer: { select: { id: true, trailerNumber: true, type: true, plate: true } },
  currentLoad: {
    select: {
      id: true, loadCode: true, status: true, clientId: true, truckId: true, trailerId: true,
      pickupAddress: true, pickupCity: true, pickupState: true, pickupLat: true, pickupLng: true, pickupAt: true,
      deliveryAddress: true, deliveryCity: true, deliveryState: true, deliveryLat: true, deliveryLng: true, deliveryAt: true,
      estimatedArrivalAt: true, actualDepartureAt: true, actualDeliveryAt: true, loadedAt: true,
    },
  },
} satisfies Prisma.DriverInclude;

function assertCanChange(ctx: ActorContext, newStatus: string, needsOverride: boolean) {
  if (!STATUS_CHANGE_ROLES.includes(ctx.role as (typeof STATUS_CHANGE_ROLES)[number])) {
    throw new StatusChangeError('Your role cannot change driver operational statuses', 403, 'FORBIDDEN');
  }
  if (ctx.role === 'UPDATER' && !UPDATER_ALLOWED_STATUSES.includes(newStatus)) {
    throw new StatusChangeError(`Updater role cannot set status "${newStatus}"`, 403, 'FORBIDDEN_STATUS');
  }
  if (needsOverride && !OVERRIDE_ROLES.includes(ctx.role as (typeof OVERRIDE_ROLES)[number])) {
    throw new StatusChangeError('This non-standard transition requires a senior dispatcher or admin', 403, 'OVERRIDE_FORBIDDEN');
  }
}

export async function updateDriverOperationalStatus(
  ctx: ActorContext,
  driverId: string,
  input: StatusChangeInput,
  opts: UpdateStatusOptions = {},
) {
  const source = opts.source ?? 'CRM';
  const newStatus = input.status;
  const changedAt = input.changedAt ? new Date(input.changedAt) : new Date();

  // 1-2. Driver existence (+ everything needed for validation)
  const driver = await db.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    include: {
      ...DRIVER_INCLUDE,
      loads: {
        where: { status: { in: ACTIVE_LOAD_STATUSES } },
        select: { id: true, loadCode: true, status: true, clientId: true },
      },
    },
  });
  if (!driver) throw new StatusChangeError('Driver not found', 404, 'NOT_FOUND');

  // Row-level scope: dispatcher can only touch own drivers, senior — team
  if (ctx.role === 'DISPATCHER' && driver.dispatcherId !== ctx.userId) {
    throw new StatusChangeError('Driver is outside of your scope', 403, 'FORBIDDEN');
  }

  const configs = await getDriverStatusConfigs();
  const statusConfig = configs.find((c) => c.code === newStatus);
  if (!statusConfig || !statusConfig.isActive) {
    throw new StatusChangeError(`Unknown or disabled status "${newStatus}"`, 422, 'UNKNOWN_STATUS');
  }

  const activeLoads = driver.loads;
  const currentActiveLoad = driver.currentLoad && ACTIVE_LOAD_STATUSES.includes(driver.currentLoad.status)
    ? driver.currentLoad
    : activeLoads[0] ?? null;
  const targetLoadId = input.loadId ?? currentActiveLoad?.id ?? null;

  // 3. Transition validation (state machine) — unless internal trusted sync
  let isManualOverride = false;
  if (!opts.trustedSync) {
    const transition = validateTransition(driver.status, newStatus, {
      hasActiveLoad: Boolean(currentActiveLoad),
      loadId: targetLoadId,
      configs: configs.map((c) => ({
        code: c.code, allowedNext: c.allowedNext, isActive: c.isActive, requiresLoad: c.requiresLoad,
      })),
    });

    if (!transition.ok && transition.hardBlock) {
      throw new StatusChangeError(transition.reason ?? 'Transition not allowed', 422, 'HARD_BLOCK');
    }
    if (!transition.ok) {
      // Non-standard transition: requires privileged role + explicit confirmation + reason
      assertCanChange(ctx, newStatus, true);
      if (!opts.manualOverride) {
        throw new StatusChangeError(
          transition.reason ?? 'Non-standard transition requires confirmation',
          409,
          'OVERRIDE_REQUIRED',
          { requiresOverride: true, reason: transition.reason },
        );
      }
      if (!input.reason?.trim()) {
        throw new StatusChangeError('A reason is required for a manual override', 422, 'REASON_REQUIRED');
      }
      isManualOverride = true;
    } else {
      assertCanChange(ctx, newStatus, false);
    }

    // 4. Required fields per status
    const missing = missingRequiredFields(
      { ...input, loadId: targetLoadId },
      configs.map((c) => ({ code: c.code, requiredFields: c.requiredFields })),
    );
    if (missing.length > 0) {
      throw new StatusChangeError(
        `Missing required fields for status "${newStatus}": ${missing.join(', ')}`,
        422,
        'MISSING_FIELDS',
        { missing },
      );
    }
  }

  // 5. Active load checks + tenant isolation
  let targetLoad: { id: string; loadCode: string; status: LoadStatus; clientId: string } | null = null;
  if (targetLoadId) {
    const load = await db.load.findUnique({
      where: { id: targetLoadId },
      select: { id: true, loadCode: true, status: true, clientId: true, driverId: true, truckId: true },
    });
    if (!load) throw new StatusChangeError('Linked load not found', 404, 'LOAD_NOT_FOUND');
    if (load.clientId !== driver.clientId) {
      throw new StatusChangeError('Load belongs to a different company than the driver', 422, 'TENANT_MISMATCH');
    }
    // Second active load guard
    const otherActive = activeLoads.find((l) => l.id !== load.id);
    if (otherActive && newStatus === 'ASSIGNED' && !isManualOverride) {
      throw new StatusChangeError(
        `Driver already has an active load ${otherActive.loadCode}. Finish it first or use a manual override (multi-stop).`,
        409,
        'SECOND_ACTIVE_LOAD',
      );
    }
    if (load.driverId && load.driverId !== driver.id) {
      throw new StatusChangeError('Load is assigned to a different driver', 422, 'DRIVER_MISMATCH');
    }
    targetLoad = load;
  }

  // 6. Truck / trailer checks (tenant isolation)
  const targetTruckId = input.truckId ?? driver.currentTruckId ?? null;
  if (input.truckId) {
    const truck = await db.truck.findUnique({
      where: { id: input.truckId },
      select: { id: true, clientId: true, deletedAt: true },
    });
    if (!truck || truck.deletedAt) throw new StatusChangeError('Truck not found', 404, 'TRUCK_NOT_FOUND');
    if (truck.clientId !== driver.clientId) {
      throw new StatusChangeError('Truck belongs to a different company than the driver', 422, 'TENANT_MISMATCH');
    }
  }
  const targetTrailerId = input.trailerId ?? driver.currentTrailerId ?? null;
  if (input.trailerId) {
    const trailer = await db.trailer.findUnique({
      where: { id: input.trailerId },
      select: { id: true, truck: { select: { clientId: true } } },
    });
    if (!trailer) throw new StatusChangeError('Trailer not found', 404, 'TRAILER_NOT_FOUND');
    if (trailer.truck && trailer.truck.clientId !== driver.clientId) {
      throw new StatusChangeError('Trailer belongs to a different company than the driver', 422, 'TENANT_MISMATCH');
    }
  }

  const previousStatus = driver.status;
  const durationSeconds = driver.statusUpdatedAt
    ? Math.max(0, Math.floor((changedAt.getTime() - driver.statusUpdatedAt.getTime()) / 1000))
    : null;
  const eta = input.eta ? new Date(input.eta) : null;
  const releasingLoad = newStatus === 'AVAILABLE' || newStatus === 'OFF_DUTY';
  const nextLoadStatus = targetLoad ? loadStatusForDriverStatus(newStatus) : null;

  // ── 7-14. Atomic transaction ───────────────────────────────────────────────
  const result = await db.$transaction(async (tx) => {
    // 8. Update driver
    const updatedDriver = await tx.driver.update({
      where: { id: driver.id },
      data: {
        status: newStatus,
        statusUpdatedAt: changedAt,
        statusUpdatedById: ctx.userId,
        statusComment: input.comment?.trim() || null,
        statusReason: input.reason?.trim() || (isManualOverride ? driver.statusReason : null),
        expectedReturnAt: input.expectedReturnAt ? new Date(input.expectedReturnAt) : null,
        currentLoadId: releasingLoad ? null : (targetLoadId ?? driver.currentLoadId),
        currentTruckId: targetTruckId,
        currentTrailerId: targetTrailerId,
        currentEta: eta ?? (releasingLoad ? null : driver.currentEta),
        ...(input.currentLocation?.latitude != null && input.currentLocation?.longitude != null
          ? {
            currentLat: input.currentLocation.latitude,
            currentLng: input.currentLocation.longitude,
            currentLocationLabel: input.currentLocation.label ?? null,
            currentLocationUpdatedAt: changedAt,
          }
          : {}),
      },
      include: DRIVER_INCLUDE,
    });

    // 9. Update the linked load (status + route + timestamps)
    let updatedLoad = null;
    if (targetLoad) {
      const loadData: Prisma.LoadUpdateInput = {};
      if (nextLoadStatus && nextLoadStatus !== targetLoad.status) {
        loadData.status = nextLoadStatus;
      }
      if (newStatus === 'ASSIGNED') {
        loadData.driver = { connect: { id: driver.id } };
        if (targetTruckId) loadData.truck = { connect: { id: targetTruckId } };
        if (targetTrailerId) loadData.trailer = { connect: { id: targetTrailerId } };
      }
      if (input.origin?.address) {
        loadData.pickupAddress = input.origin.address;
        if (input.origin.latitude != null) loadData.pickupLat = input.origin.latitude;
        if (input.origin.longitude != null) loadData.pickupLng = input.origin.longitude;
      }
      if (input.destination?.address) {
        loadData.deliveryAddress = input.destination.address;
        if (input.destination.latitude != null) loadData.deliveryLat = input.destination.latitude;
        if (input.destination.longitude != null) loadData.deliveryLng = input.destination.longitude;
      }
      if (newStatus === 'ON_LOAD') loadData.loadedAt = changedAt;
      if (newStatus === 'IN_TRANSIT') loadData.actualDepartureAt = changedAt;
      if (newStatus === 'DELIVERED') {
        loadData.actualDeliveryAt = input.deliveredAt ? new Date(input.deliveredAt) : changedAt;
      }
      if (eta) loadData.estimatedArrivalAt = eta;
      if (input.currentLocation?.latitude != null && input.currentLocation?.longitude != null) {
        loadData.currentLat = input.currentLocation.latitude;
        loadData.currentLng = input.currentLocation.longitude;
      }

      if (Object.keys(loadData).length > 0) {
        updatedLoad = await tx.load.update({ where: { id: targetLoad.id }, data: loadData });
      } else {
        updatedLoad = await tx.load.findUnique({ where: { id: targetLoad.id } });
      }

      // Load status history for the synced change
      if (nextLoadStatus && nextLoadStatus !== targetLoad.status) {
        await tx.loadStatusHistory.create({
          data: {
            loadId: targetLoad.id,
            fromStatus: targetLoad.status,
            toStatus: nextLoadStatus,
            changedById: ctx.userId,
            source: source === 'APP' ? 'APP' : source === 'TELEGRAM' ? 'TELEGRAM' : 'CRM',
            notes: `Synced from driver status ${previousStatus} → ${newStatus}`,
          },
        });
      }
    }

    // 10. Update truck
    let updatedTruck = null;
    if (targetTruckId) {
      const truckData: Prisma.TruckUpdateInput = {};
      if (targetLoad && !releasingLoad) truckData.currentLoadId = targetLoad.id;
      if (releasingLoad) truckData.currentLoadId = null;
      if (newStatus === 'MAINTENANCE') truckData.maintenanceStatus = 'IN_PROGRESS';
      if (previousStatus === 'MAINTENANCE' && newStatus !== 'MAINTENANCE') truckData.maintenanceStatus = 'OK';
      if (Object.keys(truckData).length > 0) {
        updatedTruck = await tx.truck.update({ where: { id: targetTruckId }, data: truckData });
      }
    }

    // 11. Driver status history
    const historyEntry = await tx.driverStatusHistory.create({
      data: {
        driverId: driver.id,
        previousStatus,
        newStatus,
        loadId: targetLoad?.id ?? null,
        truckId: targetTruckId,
        trailerId: targetTrailerId,
        originAddress: input.origin?.address ?? updatedDriver.currentLoad?.pickupAddress ?? null,
        originLat: input.origin?.latitude ?? updatedDriver.currentLoad?.pickupLat ?? null,
        originLng: input.origin?.longitude ?? updatedDriver.currentLoad?.pickupLng ?? null,
        destinationAddress: input.destination?.address ?? updatedDriver.currentLoad?.deliveryAddress ?? null,
        destinationLat: input.destination?.latitude ?? updatedDriver.currentLoad?.deliveryLat ?? null,
        destinationLng: input.destination?.longitude ?? updatedDriver.currentLoad?.deliveryLng ?? null,
        currentLat: input.currentLocation?.latitude ?? driver.currentLat,
        currentLng: input.currentLocation?.longitude ?? driver.currentLng,
        eta,
        comment: input.comment?.trim() || null,
        reason: input.reason?.trim() || null,
        isManualOverride,
        isAutomatic: opts.isAutomatic ?? false,
        source,
        durationSeconds,
        changedById: opts.isAutomatic ? null : ctx.userId,
        changedAt,
      },
    });

    // Optional location snapshot supplied with the change
    if (input.currentLocation?.latitude != null && input.currentLocation?.longitude != null) {
      await tx.locationUpdate.create({
        data: {
          driverId: driver.id,
          loadId: targetLoad?.id ?? null,
          lat: input.currentLocation.latitude,
          lng: input.currentLocation.longitude,
          label: input.currentLocation.label ?? null,
          source: source === 'GPS' ? 'GPS' : 'MANUAL',
          eta,
          updatedById: opts.isAutomatic ? null : ctx.userId,
          at: changedAt,
        },
      });
    }

    // 12. Audit log (inside the TX so a rollback never leaves a phantom entry)
    await tx.auditLog.create({
      data: {
        actorId: opts.isAutomatic ? null : ctx.userId,
        action: 'driver_status_change',
        entityType: 'Driver',
        entityId: driver.id,
        before: { status: previousStatus, loadId: driver.currentLoadId, truckId: driver.currentTruckId } as object,
        after: {
          status: newStatus,
          loadId: targetLoad?.id ?? null,
          truckId: targetTruckId,
          trailerId: targetTrailerId,
          comment: input.comment ?? null,
          reason: input.reason ?? null,
        } as object,
        ip: opts.ip ?? null,
        meta: {
          role: ctx.role,
          source,
          isAutomatic: opts.isAutomatic ?? false,
          isManualOverride,
        } as object,
      },
    });

    // Human-readable activity feed
    await tx.activityLog.create({
      data: {
        actorId: opts.isAutomatic ? null : ctx.userId,
        entityType: 'Driver',
        entityId: driver.id,
        action: 'status_changed',
        title: `${driver.fullName}: ${statusMeta(previousStatus).label} → ${statusMeta(newStatus).label}`,
        description: input.comment ?? input.reason ?? null,
        metadata: {
          previousStatus, newStatus,
          loadCode: targetLoad?.loadCode ?? null,
          isManualOverride,
          isAutomatic: opts.isAutomatic ?? false,
        } as object,
      },
    });

    // 13. In-app notifications (dispatcher / updater / admins)
    const notifyUserIds = new Set<string>();
    if (updatedDriver.dispatcher?.id) notifyUserIds.add(updatedDriver.dispatcher.id);
    if (updatedDriver.updater?.id) notifyUserIds.add(updatedDriver.updater.id);
    const admins = await tx.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    admins.forEach((a) => notifyUserIds.add(a.id));
    if (ctx.userId) notifyUserIds.delete(ctx.userId); // don't notify the actor

    const notificationTitle = notificationTitleFor(newStatus, driver.fullName, targetLoad?.loadCode);
    if (notificationTitle && notifyUserIds.size > 0) {
      await tx.notification.createMany({
        data: Array.from(notifyUserIds).map((userId) => ({
          userId,
          type: 'driver.status.updated',
          title: notificationTitle,
          body: input.comment ?? input.reason ?? null,
          entityType: 'Driver',
          entityId: driver.id,
          metadata: { previousStatus, newStatus, loadId: targetLoad?.id ?? null } as object,
        })),
      });
    }

    return { updatedDriver, updatedLoad, updatedTruck, historyEntry };
  });

  // 15. Realtime event (after successful commit)
  publishRealtimeEvent({
    event: 'driver.status.updated',
    driverId: driver.id,
    loadId: targetLoad?.id ?? null,
    truckId: targetTruckId,
    clientId: driver.clientId,
    dispatcherId: result.updatedDriver.dispatcher?.id ?? null,
    payload: {
      driverId: driver.id,
      previousStatus,
      newStatus,
      loadId: targetLoad?.id ?? null,
      truckId: targetTruckId,
      trailerId: targetTrailerId,
      origin: input.origin ?? null,
      destination: input.destination ?? null,
      currentLocation: input.currentLocation ?? null,
      updatedAt: changedAt.toISOString(),
      updatedBy: ctx.userId,
      isManualOverride,
      isAutomatic: opts.isAutomatic ?? false,
    },
  });

  return {
    driver: result.updatedDriver,
    load: result.updatedLoad,
    truck: result.updatedTruck,
    history: result.historyEntry,
    previousStatus,
    isManualOverride,
  };
}

function notificationTitleFor(status: string, driverName: string, loadCode?: string | null): string | null {
  const load = loadCode ? ` (${loadCode})` : '';
  switch (status) {
    case 'ON_LOAD': return `${driverName} is loaded and ready to depart${load}`;
    case 'IN_TRANSIT': return `${driverName} started the trip${load}`;
    case 'AT_PICKUP': return `${driverName} arrived at pickup${load}`;
    case 'AT_DELIVERY': return `${driverName} arrived at delivery${load}`;
    case 'DELIVERED': return `Load delivered by ${driverName}${load}`;
    case 'INACTIVE': return `${driverName} became inactive`;
    case 'MAINTENANCE': return `${driverName} is in maintenance`;
    case 'SUSPENDED': return `${driverName} was suspended`;
    default: return `${driverName}: status changed to ${statusMeta(status).label}${load}`;
  }
}

// ─── LOAD → DRIVER SYNC ──────────────────────────────────────────────────────
// Called from /api/loads/:id/status so the pipeline stays consistent both ways.

export async function syncDriverFromLoadStatus(
  ctx: ActorContext,
  loadId: string,
  newLoadStatus: LoadStatus,
  opts: { ip?: string | null } = {},
) {
  const mapped = driverStatusForLoadStatus(newLoadStatus);
  if (!mapped) return null;

  const load = await db.load.findUnique({
    where: { id: loadId },
    select: { id: true, driverId: true, truckId: true, trailerId: true },
  });
  if (!load?.driverId) return null;

  const driver = await db.driver.findUnique({
    where: { id: load.driverId },
    select: { id: true, status: true },
  });
  if (!driver || driver.status === mapped) return null;

  try {
    return await updateDriverOperationalStatus(
      ctx,
      driver.id,
      {
        status: mapped,
        loadId: load.id,
        truckId: load.truckId,
        trailerId: load.trailerId,
        comment: `Synced from load status change (${newLoadStatus})`,
      },
      { source: 'SYSTEM', trustedSync: true, ip: opts.ip },
    );
  } catch (err) {
    // Sync failure must not break the load update — log and continue
    console.error('[DriverStatusSync] failed:', err);
    return null;
  }
}

// ─── GPS / LOCATION UPDATES ──────────────────────────────────────────────────

export interface LocationInput {
  latitude: number;
  longitude: number;
  label?: string | null;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  eta?: string | Date | null;
  etaLabel?: string | null;
  loadId?: string | null;
  source?: 'MANUAL' | 'GPS' | 'ELD';
}

export async function recordDriverLocation(
  ctx: ActorContext | null,
  driverId: string,
  input: LocationInput,
) {
  const driver = await db.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    select: {
      id: true, clientId: true, status: true, currentLoadId: true, dispatcherId: true, fullName: true,
      currentLoad: {
        select: {
          id: true, status: true,
          pickupLat: true, pickupLng: true, deliveryLat: true, deliveryLng: true,
        },
      },
    },
  });
  if (!driver) throw new StatusChangeError('Driver not found', 404, 'NOT_FOUND');

  const at = new Date();
  const eta = input.eta ? new Date(input.eta) : null;
  const loadId = input.loadId ?? driver.currentLoadId ?? null;

  const [locationUpdate] = await db.$transaction([
    db.locationUpdate.create({
      data: {
        driverId,
        loadId,
        lat: input.latitude,
        lng: input.longitude,
        label: input.label ?? null,
        speed: input.speed ?? null,
        heading: input.heading ?? null,
        accuracy: input.accuracy ?? null,
        source: input.source ?? 'MANUAL',
        eta,
        etaLabel: input.etaLabel ?? null,
        updatedById: ctx?.userId ?? null,
        at,
      },
    }),
    db.driver.update({
      where: { id: driverId },
      data: {
        currentLat: input.latitude,
        currentLng: input.longitude,
        currentLocationLabel: input.label ?? null,
        currentLocationUpdatedAt: at,
        ...(eta ? { currentEta: eta } : {}),
      },
    }),
    ...(loadId
      ? [db.load.update({
        where: { id: loadId },
        data: {
          currentLat: input.latitude,
          currentLng: input.longitude,
          ...(eta ? { estimatedArrivalAt: eta } : {}),
        },
      })]
      : []),
  ]);

  // Geofence-based suggestion (spec §12) — computed but only auto-applied when
  // the company settings allow it.
  let suggestion: { suggestedStatus: string; reason: string } | null = null;
  let autoApplied = false;
  const settings = await db.companySettings.findFirst({
    select: {
      autoStatusEnabled: true, autoStatusMode: true,
      pickupGeofenceRadiusMiles: true, deliveryGeofenceRadiusMiles: true,
    },
  });

  if (settings?.autoStatusEnabled && driver.currentLoad) {
    const { suggestStatusFromPosition } = await import('@/lib/driverStatus');
    const pickup = driver.currentLoad.pickupLat != null && driver.currentLoad.pickupLng != null
      ? { lat: driver.currentLoad.pickupLat, lng: driver.currentLoad.pickupLng }
      : null;
    const delivery = driver.currentLoad.deliveryLat != null && driver.currentLoad.deliveryLng != null
      ? { lat: driver.currentLoad.deliveryLat, lng: driver.currentLoad.deliveryLng }
      : null;

    suggestion = suggestStatusFromPosition({
      currentStatus: driver.status,
      position: { lat: input.latitude, lng: input.longitude },
      speedMph: input.speed ?? null,
      pickup,
      delivery,
      pickupRadiusMiles: settings.pickupGeofenceRadiusMiles,
      deliveryRadiusMiles: settings.deliveryGeofenceRadiusMiles,
    });

    if (suggestion && settings.autoStatusMode === 'AUTO' && ctx) {
      try {
        await updateDriverOperationalStatus(
          ctx,
          driverId,
          { status: suggestion.suggestedStatus, loadId, reason: suggestion.reason, comment: 'Automatic geofence status change' },
          { source: 'GPS', isAutomatic: true, trustedSync: true },
        );
        autoApplied = true;
      } catch (err) {
        console.error('[GeofenceAuto] failed to auto-apply status:', err);
      }
    }
  }

  publishRealtimeEvent({
    event: 'driver.location.updated',
    driverId,
    loadId,
    clientId: driver.clientId,
    dispatcherId: driver.dispatcherId,
    payload: {
      driverId,
      latitude: input.latitude,
      longitude: input.longitude,
      label: input.label ?? null,
      speed: input.speed ?? null,
      heading: input.heading ?? null,
      eta: eta?.toISOString() ?? null,
      recordedAt: at.toISOString(),
      suggestion: autoApplied ? null : suggestion,
    },
  });

  return { locationUpdate, suggestion, autoApplied };
}
