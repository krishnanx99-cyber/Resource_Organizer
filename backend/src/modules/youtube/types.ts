/** Internal transcript segment. `offset` and `duration` are in SECONDS throughout the system. */
export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

export interface Chunk {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

export interface ResourceChunkInput {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  embedding: number[];
  metadata: Record<string, unknown>;
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

export interface ChunkSearchItem {
  id: string;
  resourceId: string;
  index: number;
  text: string;
  startTime: number | null;
  endTime: number | null;
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