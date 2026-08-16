-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'UNSUPPORTED');

-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'YOUTUBE';

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "transcriptStatus" "TranscriptStatus";

-- CreateTable
CREATE TABLE "ResourceChunk" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION,
    "endTime" DOUBLE PRECISION,
    "embedding" vector(1536),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceChunk_resourceId_idx" ON "ResourceChunk"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceChunk_resourceId_index_key" ON "ResourceChunk"("resourceId", "index");

-- AddForeignKey
ALTER TABLE "ResourceChunk" ADD CONSTRAINT "ResourceChunk_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
