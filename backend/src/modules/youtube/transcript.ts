import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import type { TranscriptSegment } from "./types.ts";

export type TranscriptFetchResult =
  | { kind: "segments"; segments: TranscriptSegment[] }
  | { kind: "unsupported"; reason: string };

export interface FetchTranscriptOptions {
  lang?: string;
  fetch?: typeof globalThis.fetch;
}

/** Raw entries as returned by the youtube-transcript library. Offsets/durations are in MILLISECONDS. */
export interface RawTranscriptEntry {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

export const MS_PER_SECOND = 1000;

/** Convert raw library entries (ms) to internal segments (seconds), at the transcript boundary. */
export function toInternalSegments(raw: RawTranscriptEntry[]): TranscriptSegment[] {
  return raw.map((entry) => ({
    text: entry.text,
    offset: entry.offset / MS_PER_SECOND,
    duration: entry.duration / MS_PER_SECOND,
    ...(entry.lang ? { lang: entry.lang } : {}),
  }));
}

export async function fetchVideoTranscript(
  videoId: string,
  options: FetchTranscriptOptions = {},
): Promise<TranscriptFetchResult> {
  try {
    const raw: RawTranscriptEntry[] = await fetchTranscript(videoId, {
      lang: options.lang,
      fetch: options.fetch,
    });

    return { kind: "segments", segments: toInternalSegments(raw) };
  } catch (err) {
    if (
      err instanceof YoutubeTranscriptDisabledError ||
      err instanceof YoutubeTranscriptNotAvailableError ||
      err instanceof YoutubeTranscriptVideoUnavailableError
    ) {
      return { kind: "unsupported", reason: err.message ?? String(err) };
    }
    throw err;
  }
}