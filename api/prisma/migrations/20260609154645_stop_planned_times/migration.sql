/*
  Warnings:

  - You are about to drop the column `planned_time` on the `stops` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stops" DROP COLUMN "planned_time",
ADD COLUMN     "planned_end" TEXT,
ADD COLUMN     "planned_start" TEXT;
