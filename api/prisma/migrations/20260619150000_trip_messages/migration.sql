-- Per-trip group chat for collaborators.
CREATE TABLE "trip_messages" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "trip_id"    UUID NOT NULL,
  "user_id"    UUID NOT NULL,
  "body"       TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "trip_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trip_messages_trip_id_created_at_idx" ON "trip_messages"("trip_id", "created_at");
ALTER TABLE "trip_messages" ADD CONSTRAINT "trip_messages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_messages" ADD CONSTRAINT "trip_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
