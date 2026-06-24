CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "parsed" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "matched_stop_id" UUID,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_items_user_id_status_idx" ON "inventory_items"("user_id", "status");

ALTER TABLE "inventory_items"
ADD CONSTRAINT "inventory_items_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
ADD CONSTRAINT "inventory_items_matched_stop_id_fkey"
FOREIGN KEY ("matched_stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "album_overrides" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "trip_messages" ALTER COLUMN "id" DROP DEFAULT;
