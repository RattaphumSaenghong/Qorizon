-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "budget" INTEGER,
ADD COLUMN     "budget_currency" TEXT NOT NULL DEFAULT 'THB',
ADD COLUMN     "destination" TEXT,
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'planning';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "real_name" TEXT;

-- CreateTable
CREATE TABLE "trip_members" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_members_user_id_status_idx" ON "trip_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_members_trip_id_user_id_key" ON "trip_members"("trip_id", "user_id");

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
