-- CreateEnum
CREATE TYPE "ClusterSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "ClusterSuggestion" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resourceIds" TEXT[],
    "status" "ClusterSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedClusterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClusterSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClusterSuggestion_approvedClusterId_key" ON "ClusterSuggestion"("approvedClusterId");

-- CreateIndex
CREATE INDEX "ClusterSuggestion_ownerId_idx" ON "ClusterSuggestion"("ownerId");

-- CreateIndex
CREATE INDEX "ClusterSuggestion_status_idx" ON "ClusterSuggestion"("status");

-- AddForeignKey
ALTER TABLE "ClusterSuggestion" ADD CONSTRAINT "ClusterSuggestion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterSuggestion" ADD CONSTRAINT "ClusterSuggestion_approvedClusterId_fkey" FOREIGN KEY ("approvedClusterId") REFERENCES "Cluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
