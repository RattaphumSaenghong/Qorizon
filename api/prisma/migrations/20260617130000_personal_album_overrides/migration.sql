-- CreateTable
CREATE TABLE "album_overrides" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "album_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "album_overrides_trip_id_user_id_key" ON "album_overrides"("trip_id", "user_id");

-- Migrate existing trip-level overrides into per-owner rows BEFORE dropping the column.
INSERT INTO "album_overrides" ("id", "trip_id", "user_id", "data", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "user_id", "album_overrides", now(), now()
FROM "trips"
WHERE "album_overrides" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "album_overrides" ADD CONSTRAINT "album_overrides_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_overrides" ADD CONSTRAINT "album_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (drop only after the data has been migrated above)
ALTER TABLE "trips" DROP COLUMN "album_overrides";
