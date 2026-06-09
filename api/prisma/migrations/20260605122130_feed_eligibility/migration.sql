-- AlterTable
ALTER TABLE "stops" ADD COLUMN     "feed_eligible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_type" TEXT NOT NULL DEFAULT 'personal';
