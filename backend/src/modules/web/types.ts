import type { ExtractedMetadata } from "../metadata/types.ts";

export type WebBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string };

export interface ExtractedWebPage {
  metadata: ExtractedMetadata;
  blocks: WebBlock[];
}

export const WEB_CHUNK_METADATA = {
  source: "web",
} as const;

export interface WebChunkDraft {
  text: string;
  heading: string | null;
}

export type WebEnrichOutcome = "completed" | "unsupported";