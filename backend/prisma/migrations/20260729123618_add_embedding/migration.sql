-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "embedding" vector(1536);
