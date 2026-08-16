/*
  Warnings:

  - Added the required column `ownerId` to the `Cluster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cluster" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Cluster_ownerId_idx" ON "Cluster"("ownerId");

-- CreateIndex
CREATE INDEX "Cluster_ownerId_status_idx" ON "Cluster"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ResourceCluster_clusterId_idx" ON "ResourceCluster"("clusterId");

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
