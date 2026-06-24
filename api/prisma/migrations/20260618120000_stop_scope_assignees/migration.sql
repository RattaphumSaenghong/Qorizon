-- Add scope to stops (default 'shared', non-null, no data migration needed)
ALTER TABLE "stops" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'shared';

-- stop_assignees join table (multi-member assignment)
CREATE TABLE "stop_assignees" (
  "stop_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  CONSTRAINT "stop_assignees_pkey" PRIMARY KEY ("stop_id", "user_id")
);
ALTER TABLE "stop_assignees" ADD CONSTRAINT "stop_assignees_stop_id_fkey"
  FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stop_assignees" ADD CONSTRAINT "stop_assignees_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link a booking to its itinerary block
ALTER TABLE "bookings" ADD COLUMN "stop_id" UUID;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stop_id_key" UNIQUE ("stop_id");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stop_id_fkey"
  FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
