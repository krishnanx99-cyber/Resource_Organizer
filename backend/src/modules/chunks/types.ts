/**
 * Generic chunk types shared by every resource-enrichment pipeline
 * (youtube transcripts, public web pages, future sources).
 *
 * `startTime`/`endTime` are nullable: timed sources (youtube) fill them in seconds,
 * non-timed sources (web) leave them null.
 */

export interface Chunk {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

export interface ResourceChunkInput {
  index: number;
  text: string;
  startTime: number | null;
  endTime: number | null;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface ChunkSearchItem {
  id: string;
  resourceId: string;
  index: number;
  text: string;
  startTime: number | null;
  endTime: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  similarity: number;
  deepLink: string | null;
  resource: {
    id: string;
    title: string;
    type: string;
    platform: string | null;
    url: string | null;
  };
}

export interface ChunkSearchResult {
  items: ChunkSearchItem[];
  count: number;
  limit: number;
  offset: number;
}