-- ─────────────────────────────────────────────────────────────────────────────
-- Driver operational status system
--   * Driver.status enum -> TEXT (dictionary-driven via DriverStatusConfig)
--   * DriverStatusConfig  — admin-editable status dictionary
--   * DriverStatusHistory — full status change history
--   * Notification        — in-app notifications
--   * Driver/Load/Truck/Trailer/LocationUpdate/CompanySettings/AuditLog columns
--
-- NOTE: this project historically used `prisma db push`. This migration is the
-- equivalent DDL for `prisma migrate deploy`. If you keep using db push, you
-- can skip running it manually — `npx prisma db push` applies the same delta.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New enum for status-change source
DO $$ BEGIN
  CREATE TYPE "DriverStatusSource" AS ENUM ('CRM', 'APP', 'TELEGRAM', 'GPS', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Driver.status: enum -> TEXT (keeps existing values: AVAILABLE/ON_LOAD/...)
ALTER TABLE "Driver" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Driver" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Driver" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

-- 3. Driver: new status/location columns
ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusUpdatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "statusComment" TEXT,
  ADD COLUMN IF NOT EXISTS "statusReason" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedReturnAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentTrailerId" TEXT,
  ADD COLUMN IF NOT EXISTS "currentLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentLocationLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "currentLocationUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentEta" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Driver_currentLoadId_idx" ON "Driver"("currentLoadId");

ALTER TABLE "Driver"
  ADD CONSTRAINT "Driver_statusUpdatedById_fkey" FOREIGN KEY ("statusUpdatedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Driver"
  ADD CONSTRAINT "Driver_currentLoadId_fkey" FOREIGN KEY ("currentLoadId")
    REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Driver"
  ADD CONSTRAINT "Driver_currentTrailerId_fkey" FOREIGN KEY ("currentTrailerId")
    REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Load: operational timestamps + live position + trailer
ALTER TABLE "Load"
  ADD COLUMN IF NOT EXISTS "actualDepartureAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "actualDeliveryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "estimatedArrivalAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "loadedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "trailerId" TEXT;

ALTER TABLE "Load"
  ADD CONSTRAINT "Load_trailerId_fkey" FOREIGN KEY ("trailerId")
    REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Trailer: human-readable unit number
ALTER TABLE "Trailer" ADD COLUMN IF NOT EXISTS "trailerNumber" TEXT;

-- 6. LocationUpdate: GPS accuracy
ALTER TABLE "LocationUpdate" ADD COLUMN IF NOT EXISTS "accuracy" DOUBLE PRECISION;

-- 7. CompanySettings: automation + retention settings
ALTER TABLE "CompanySettings"
  ADD COLUMN IF NOT EXISTS "autoStatusEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autoStatusMode" TEXT NOT NULL DEFAULT 'SUGGEST',
  ADD COLUMN IF NOT EXISTS "pickupGeofenceRadiusMiles" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "deliveryGeofenceRadiusMiles" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "minGeofenceMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "autoInTransitOnMove" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "gpsStaleMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "locationRetentionDays" INTEGER NOT NULL DEFAULT 90;

-- 8. AuditLog: structured meta (role / source / isAutomatic / isManualOverride)
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "meta" JSONB;

-- 9. DriverStatusConfig — admin-editable dictionary
CREATE TABLE IF NOT EXISTS "DriverStatusConfig" (
  "id"             TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "label"          TEXT NOT NULL,
  "color"          TEXT NOT NULL DEFAULT '#4ade80',
  "icon"           TEXT,
  "description"    TEXT,
  "category"       TEXT NOT NULL DEFAULT 'OPERATIONAL',
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "isSystem"       BOOLEAN NOT NULL DEFAULT false,
  "requiresLoad"   BOOLEAN NOT NULL DEFAULT false,
  "requiredFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "allowedNext"    TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverStatusConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DriverStatusConfig_code_key" ON "DriverStatusConfig"("code");
CREATE INDEX IF NOT EXISTS "DriverStatusConfig_isActive_sortOrder_idx" ON "DriverStatusConfig"("isActive", "sortOrder");

-- 10. DriverStatusHistory
CREATE TABLE IF NOT EXISTS "DriverStatusHistory" (
  "id"                 TEXT NOT NULL,
  "driverId"           TEXT NOT NULL,
  "previousStatus"     TEXT,
  "newStatus"          TEXT NOT NULL,
  "loadId"             TEXT,
  "truckId"            TEXT,
  "trailerId"          TEXT,
  "originAddress"      TEXT,
  "originLat"          DOUBLE PRECISION,
  "originLng"          DOUBLE PRECISION,
  "destinationAddress" TEXT,
  "destinationLat"     DOUBLE PRECISION,
  "destinationLng"     DOUBLE PRECISION,
  "currentLat"         DOUBLE PRECISION,
  "currentLng"         DOUBLE PRECISION,
  "eta"                TIMESTAMP(3),
  "comment"            TEXT,
  "reason"             TEXT,
  "isManualOverride"   BOOLEAN NOT NULL DEFAULT false,
  "isAutomatic"        BOOLEAN NOT NULL DEFAULT false,
  "source"             "DriverStatusSource" NOT NULL DEFAULT 'CRM',
  "durationSeconds"    INTEGER,
  "changedById"        TEXT,
  "changedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DriverStatusHistory_driverId_changedAt_idx" ON "DriverStatusHistory"("driverId", "changedAt");
CREATE INDEX IF NOT EXISTS "DriverStatusHistory_loadId_idx" ON "DriverStatusHistory"("loadId");
CREATE INDEX IF NOT EXISTS "DriverStatusHistory_newStatus_idx" ON "DriverStatusHistory"("newStatus");
CREATE INDEX IF NOT EXISTS "DriverStatusHistory_changedAt_idx" ON "DriverStatusHistory"("changedAt");

ALTER TABLE "DriverStatusHistory"
  ADD CONSTRAINT "DriverStatusHistory_driverId_fkey" FOREIGN KEY ("driverId")
    REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverStatusHistory"
  ADD CONSTRAINT "DriverStatusHistory_loadId_fkey" FOREIGN KEY ("loadId")
    REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverStatusHistory"
  ADD CONSTRAINT "DriverStatusHistory_truckId_fkey" FOREIGN KEY ("truckId")
    REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverStatusHistory"
  ADD CONSTRAINT "DriverStatusHistory_changedById_fkey" FOREIGN KEY ("changedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 11. Notification
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT,
  "entityType" TEXT,
  "entityId"   TEXT,
  "metadata"   JSONB,
  "readAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. Extend the (reference-only) DriverStatus enum with the new codes
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'TO_PICKUP'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'AT_PICKUP'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'LOADING'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'AT_DELIVERY'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'UNLOADING'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'DELIVERED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'MAINTENANCE'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'VACATION'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED'; EXCEPTION WHEN others THEN NULL; END $$;
