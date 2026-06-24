ALTER TABLE "users" ADD COLUMN "forwarding_token" TEXT;

UPDATE "users"
SET "forwarding_token" = substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
WHERE "forwarding_token" IS NULL;

CREATE UNIQUE INDEX "users_forwarding_token_key" ON "users"("forwarding_token");
