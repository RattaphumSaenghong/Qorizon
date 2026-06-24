-- Settle-up: track who fronted each stop's cost. Null means the stop's creator.
ALTER TABLE "stops" ADD COLUMN "paid_by" UUID;
ALTER TABLE "stops" ADD CONSTRAINT "stops_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
