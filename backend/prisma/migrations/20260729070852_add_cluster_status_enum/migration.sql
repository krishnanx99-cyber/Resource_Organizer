/*
  Warnings:

  - You are about to drop the column `type` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Made the column `url` on table `Resource` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ClusterStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'DISMISSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Cluster" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "status" "ClusterStatus" NOT NULL DEFAULT 'PROPOSED';

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "type",
ADD COLUMN     "creator" TEXT,
ADD COLUMN     "firstOpenedAt" TIMESTAMP(3),
ADD COLUMN     "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "openedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "sourceType" TEXT,
ALTER COLUMN "url" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Cluster_status_idx" ON "Cluster"("status");

-- CreateIndex
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");

-- CreateIndex
CREATE INDEX "Resource_url_idx" ON "Resource"("url");

-- CreateIndex
CREATE INDEX "Resource_createdAt_idx" ON "Resource"("createdAt");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
