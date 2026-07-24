-- ─────────────────────────────────────────────────────────────────────────────
-- Role-based registration & approval flow
--   * UserRole: + OWNER, CLIENT, DRIVER
--   * UserStatus: + PENDING, REJECTED
--   * User: requestedRole / approval fields / clientId / driverId bindings
--   * Driver: payPerMile for the driver's personal finance view
-- (Equivalent to `prisma db push` for teams using migrate deploy.)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CLIENT'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DRIVER'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'REJECTED'; EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "requestedRole" "UserRole",
  ADD COLUMN IF NOT EXISTS "roleRequestNote" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "driverId" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User"
  ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId")
    REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User"
  ADD CONSTRAINT "User_driverId_fkey" FOREIGN KEY ("driverId")
    REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "payPerMile" DOUBLE PRECISION;
