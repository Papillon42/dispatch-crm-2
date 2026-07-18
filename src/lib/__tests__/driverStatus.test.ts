import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATUS_CONFIGS,
  DEFAULT_STATUS_BY_CODE,
  driverStatusForLoadStatus,
  haversineMiles,
  loadStatusForDriverStatus,
  missingRequiredFields,
  statusMeta,
  suggestStatusFromPosition,
  validateTransition,
} from '../driverStatus';

const ctxNoLoad = { hasActiveLoad: false, loadId: null };
const ctxWithLoad = { hasActiveLoad: true, loadId: 'load_1' };

describe('validateTransition — state machine', () => {
  it('allows the normal happy path Available → … → Delivered → Available', () => {
    const path = [
      'AVAILABLE', 'ASSIGNED', 'TO_PICKUP', 'AT_PICKUP', 'LOADING',
      'ON_LOAD', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'DELIVERED',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      const result = validateTransition(path[i], path[i + 1], ctxWithLoad);
      expect(result.ok, `${path[i]} → ${path[i + 1]}`).toBe(true);
    }
    // DELIVERED → AVAILABLE releases the driver (no more active load)
    expect(validateTransition('DELIVERED', 'AVAILABLE', ctxNoLoad).ok).toBe(true);
  });

  it('blocks AVAILABLE → DELIVERED as non-standard (override required)', () => {
    const result = validateTransition('AVAILABLE', 'DELIVERED', ctxWithLoad);
    expect(result.ok).toBe(false);
    expect(result.requiresOverride).toBe(true);
    expect(result.hardBlock).toBe(false);
  });

  it('hard-blocks IN_TRANSIT without an active load', () => {
    const result = validateTransition('ON_LOAD', 'IN_TRANSIT', ctxNoLoad);
    expect(result.ok).toBe(false);
    expect(result.hardBlock).toBe(true);
  });

  it('requires override for AVAILABLE while an active load remains', () => {
    const result = validateTransition('IN_TRANSIT', 'AVAILABLE', ctxWithLoad);
    expect(result.ok).toBe(false);
    expect(result.requiresOverride).toBe(true);
    expect(result.hardBlock).toBe(false);
  });

  it('rejects a no-op transition to the same status', () => {
    const result = validateTransition('AVAILABLE', 'AVAILABLE', ctxNoLoad);
    expect(result.ok).toBe(false);
    expect(result.hardBlock).toBe(true);
  });

  it('supports custom dictionary transitions (admin-added status)', () => {
    const configs = [
      { code: 'AVAILABLE', allowedNext: ['CUSTOM_HOLD'], isActive: true, requiresLoad: false },
      { code: 'CUSTOM_HOLD', allowedNext: ['AVAILABLE'], isActive: true, requiresLoad: false },
    ];
    expect(validateTransition('AVAILABLE', 'CUSTOM_HOLD', { ...ctxNoLoad, configs }).ok).toBe(true);
    expect(validateTransition('CUSTOM_HOLD', 'AVAILABLE', { ...ctxNoLoad, configs }).ok).toBe(true);
  });
});

describe('missingRequiredFields — per-status required fields', () => {
  it('TO_PICKUP requires load + origin', () => {
    expect(missingRequiredFields({ status: 'TO_PICKUP' })).toEqual(['loadId', 'origin']);
    expect(missingRequiredFields({
      status: 'TO_PICKUP',
      loadId: 'load_1',
      origin: { address: 'Chicago, IL' },
    })).toEqual([]);
  });

  it('IN_TRANSIT requires load, origin and destination', () => {
    expect(missingRequiredFields({ status: 'IN_TRANSIT', loadId: 'load_1' }))
      .toEqual(['origin', 'destination']);
  });

  it('DELIVERED requires delivery time (changedAt acceptable)', () => {
    expect(missingRequiredFields({ status: 'DELIVERED', loadId: 'l' })).toContain('deliveredAt');
    expect(missingRequiredFields({ status: 'DELIVERED', loadId: 'l', deliveredAt: '2026-07-18T18:00:00Z' })).toEqual([]);
  });

  it('INACTIVE requires a reason; MAINTENANCE requires reason + return date', () => {
    expect(missingRequiredFields({ status: 'INACTIVE' })).toEqual(['reason']);
    expect(missingRequiredFields({ status: 'MAINTENANCE' })).toEqual(['reason', 'expectedReturnAt']);
    expect(missingRequiredFields({
      status: 'MAINTENANCE', reason: 'Engine repair', expectedReturnAt: '2026-07-25T12:00:00Z',
    })).toEqual([]);
  });
});

describe('driver ↔ load status synchronization mapping', () => {
  it('maps driver statuses onto load pipeline statuses', () => {
    expect(loadStatusForDriverStatus('ASSIGNED')).toBe('ASSIGNED');
    expect(loadStatusForDriverStatus('TO_PICKUP')).toBe('EN_ROUTE_TO_PICKUP');
    expect(loadStatusForDriverStatus('ON_LOAD')).toBe('LOADED');
    expect(loadStatusForDriverStatus('IN_TRANSIT')).toBe('IN_TRANSIT');
    expect(loadStatusForDriverStatus('DELIVERED')).toBe('DELIVERED');
    expect(loadStatusForDriverStatus('OFF_DUTY')).toBeNull();
  });

  it('is consistent in both directions for the shared pipeline', () => {
    for (const driverStatus of ['ASSIGNED', 'TO_PICKUP', 'AT_PICKUP', 'ON_LOAD', 'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED']) {
      const loadStatus = loadStatusForDriverStatus(driverStatus);
      expect(loadStatus).not.toBeNull();
      expect(driverStatusForLoadStatus(loadStatus!)).toBe(driverStatus);
    }
  });
});

describe('status dictionary defaults', () => {
  it('ships all 15 system statuses from the spec', () => {
    expect(DEFAULT_STATUS_CONFIGS).toHaveLength(15);
    for (const code of [
      'AVAILABLE', 'ASSIGNED', 'TO_PICKUP', 'AT_PICKUP', 'LOADING', 'ON_LOAD', 'IN_TRANSIT',
      'AT_DELIVERY', 'UNLOADING', 'DELIVERED', 'INACTIVE', 'OFF_DUTY', 'MAINTENANCE', 'VACATION', 'SUSPENDED',
    ]) {
      expect(DEFAULT_STATUS_BY_CODE[code], code).toBeDefined();
    }
  });

  it('every allowedNext target exists in the dictionary', () => {
    for (const config of DEFAULT_STATUS_CONFIGS) {
      for (const next of config.allowedNext) {
        expect(DEFAULT_STATUS_BY_CODE[next], `${config.code} → ${next}`).toBeDefined();
      }
    }
  });

  it('statusMeta prefers DB config over defaults and falls back gracefully', () => {
    expect(statusMeta('AVAILABLE').label).toBe('Available');
    expect(statusMeta('AVAILABLE', [{ code: 'AVAILABLE', label: 'Свободен', color: '#000000' }]).label).toBe('Свободен');
    expect(statusMeta('SOMETHING_CUSTOM').label).toBe('SOMETHING CUSTOM');
  });
});

describe('geofence automation (spec §12)', () => {
  const pickup = { lat: 41.8781, lng: -87.6298 };   // Chicago
  const delivery = { lat: 32.7767, lng: -96.797 };  // Dallas

  it('suggests AT_PICKUP when a TO_PICKUP driver enters the pickup geofence', () => {
    const suggestion = suggestStatusFromPosition({
      currentStatus: 'TO_PICKUP',
      position: { lat: 41.8785, lng: -87.6295 },
      pickup, delivery,
      pickupRadiusMiles: 1, deliveryRadiusMiles: 1,
    });
    expect(suggestion?.suggestedStatus).toBe('AT_PICKUP');
  });

  it('suggests IN_TRANSIT when an ON_LOAD driver starts moving away from pickup', () => {
    const suggestion = suggestStatusFromPosition({
      currentStatus: 'ON_LOAD',
      position: { lat: 41.5, lng: -88.2 },
      speedMph: 55,
      pickup, delivery,
      pickupRadiusMiles: 1, deliveryRadiusMiles: 1,
    });
    expect(suggestion?.suggestedStatus).toBe('IN_TRANSIT');
  });

  it('suggests AT_DELIVERY when an IN_TRANSIT driver reaches the delivery geofence', () => {
    const suggestion = suggestStatusFromPosition({
      currentStatus: 'IN_TRANSIT',
      position: { lat: 32.7769, lng: -96.7973 },
      pickup, delivery,
      pickupRadiusMiles: 1, deliveryRadiusMiles: 1,
    });
    expect(suggestion?.suggestedStatus).toBe('AT_DELIVERY');
  });

  it('returns null when nothing matches', () => {
    expect(suggestStatusFromPosition({
      currentStatus: 'IN_TRANSIT',
      position: { lat: 36.0, lng: -92.0 }, // middle of the route
      pickup, delivery,
      pickupRadiusMiles: 1, deliveryRadiusMiles: 1,
    })).toBeNull();
  });

  it('haversineMiles: Chicago → Dallas ≈ 800 miles', () => {
    const distance = haversineMiles(pickup, delivery);
    expect(distance).toBeGreaterThan(750);
    expect(distance).toBeLessThan(850);
  });
});
