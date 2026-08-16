export { webQueue, startWebWorker } from "./queue.ts";
export { webService } from "./service.ts";
export { fetchWebPage } from "./fetcher.ts";
export { extractWebPage, extractPageMetadata } from "./extractor.ts";
export { chunkWebBlocks, DEFAULT_WEB_CHUNKER_OPTIONS } from "./chunker.ts";
export type {
  WebBlock,
  ExtractedWebPage,
  WebChunkDraft,
  WebEnrichOutcome,
} from "./types.ts";
export type { WebChunkerOptions } from "./chunker.ts";
export type { FetchPageOutcome } from "./fetcher.ts";