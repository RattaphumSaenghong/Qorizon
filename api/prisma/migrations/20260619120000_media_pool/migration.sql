-- Photo Pool: add trip_id + visibility to media; make stop_id nullable (pool photos need no stop)

-- 1. Add new columns (nullable first so backfill can run)
ALTER TABLE "media" ADD COLUMN "trip_id" UUID;
ALTER TABLE "media" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'shared';

-- 2. Backfill trip_id from the owning stop for all existing rows
UPDATE "media" m
SET "trip_id" = s."trip_id"
FROM "stops" s
WHERE m."stop_id" = s."id";

-- 3. Enforce trip_id NOT NULL (all rows now have it)
ALTER TABLE "media" ALTER COLUMN "trip_id" SET NOT NULL;

-- 4. Add FK for trip_id
ALTER TABLE "media"
  ADD CONSTRAINT "media_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Make stop_id nullable (pool photos don't need a stop)
ALTER TABLE "media" ALTER COLUMN "stop_id" DROP NOT NULL;

-- 6. Change stop_id FK from CASCADE DELETE to SET NULL
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_stop_id_fkey";
ALTER TABLE "media"
  ADD CONSTRAINT "media_stop_id_fkey"
  FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Index for pool queries
CREATE INDEX "media_trip_id_visibility_idx" ON "media"("trip_id", "visibility");
