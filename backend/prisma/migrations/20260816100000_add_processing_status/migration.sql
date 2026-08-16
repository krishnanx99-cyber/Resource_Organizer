-- Generalize the enrichment/processing state: the TranscriptStatus enum values
-- (PENDING/PROCESSING/COMPLETED/FAILED/UNSUPPORTED) are reused by every resource
-- enrichment pipeline (youtube transcripts, public web pages, future sources).
-- Pure column rename; all existing enum values and data are preserved.
ALTER TABLE "Resource" RENAME COLUMN "transcriptStatus" TO "processingStatus";
