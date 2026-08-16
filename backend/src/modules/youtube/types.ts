/** Internal transcript segment. `offset` and `duration` are in SECONDS throughout the system. */
export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

export interface YoutubeMetadata {
  videoId: string;
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fetchedAt: string;
}

export const YOUTUBE_CHUNK_METADATA = {
  source: "youtube-transcript",
} as const;

export type { Chunk, ResourceChunkInput, ChunkSearchItem, ChunkSearchResult } from "../chunks/types.ts";