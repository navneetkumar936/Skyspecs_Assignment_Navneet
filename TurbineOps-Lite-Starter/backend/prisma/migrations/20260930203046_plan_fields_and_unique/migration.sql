/*
  Warnings:

  - Added the required column `findingCount` to the `RepairPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxSeverity` to the `RepairPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inspection" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "RepairPlan" ADD COLUMN     "findingCount" INTEGER NOT NULL,
ADD COLUMN     "maxSeverity" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Inspection_date_idx" ON "Inspection"("date");

-- CreateIndex
CREATE INDEX "Inspection_dataSource_idx" ON "Inspection"("dataSource");
