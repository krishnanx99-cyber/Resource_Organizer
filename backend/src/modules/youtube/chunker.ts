import type { Chunk } from "./types.ts";

export interface ChunkerOptions {
  targetChars?: number;
  maxChars?: number;
  minChars?: number;
  overlapChars?: number;
  /** Preferred maximum time span of a chunk (seconds). Breaks at sentence boundaries when crossed. */
  targetSpanSeconds?: number;
  /** Hard upper bound on a chunk's time span (seconds). Guaranteed by force-closing. */
  maxSpanSeconds?: number;
}

export const DEFAULT_CHUNKER_OPTIONS: Required<ChunkerOptions> = {
  targetChars: 1500,
  maxChars: 2200,
  minChars: 300,
  overlapChars: 150,
  targetSpanSeconds: 40,
  maxSpanSeconds: 75,
};

interface SegmentLike {
  text: string;
  offset: number;
  duration: number;
}

const SENTENCE_SEPARATORS = new Set([".", "!", "?", "…"]);

/** Time gap (seconds) between consecutive captions that marks a content/silence break — quote compilations park up to a few seconds between lines, longer gaps mean a new passage. */
const SILENCE_GAP_BREAK_SECONDS = 8;

function endsWithSentenceSeparator(text: string): boolean {
  const ch = text[text.length - 1];
  return ch !== undefined && SENTENCE_SEPARATORS.has(ch);
}

function cleanSegments(segments: SegmentLike[]): SegmentLike[] {
  const out: SegmentLike[] = [];
  for (const segment of segments) {
    const text = segment.text.replace(/\s+/g, " ").trim();
    if (text.length > 0) {
      out.push({ text, offset: segment.offset, duration: segment.duration });
    }
  }
  return out;
}

function splitOversizedSegment(segment: SegmentLike, maxChars: number): SegmentLike[] {
  const pieces: SegmentLike[] = [];
  let cursor = 0;
  const total = segment.text.length;
  while (cursor < total) {
    let end = Math.min(cursor + maxChars, total);
    if (end < total) {
      const space = segment.text.lastIndexOf(" ", end);
      if (space > cursor) {
        end = space;
      }
    }
    const sliceText = segment.text.slice(cursor, end).trim();
    if (sliceText.length > 0) {
      const fraction = cursor / total;
      pieces.push({
        text: sliceText,
        offset: segment.offset + segment.duration * fraction,
        duration: segment.duration * (sliceText.length / total),
      });
    }
    cursor = end;
  }
  return pieces;
}

function makeOverlapTail(segments: SegmentLike[], overlapChars: number): SegmentLike[] {
  let tail: SegmentLike[] = [];
  if (overlapChars > 0) {
    let used = 0;
    for (const seg of [...segments].reverse()) {
      const cost = seg.text.length + 1;
      if (used > 0 && used + cost > overlapChars) break;
      if (cost > overlapChars) {
        tail = [];
        break;
      }
      tail.unshift(seg);
      used += cost;
    }
  }
  return tail;
}

function charsOf(segments: SegmentLike[]): number {
  return segments.reduce((sum, s) => sum + s.text.length + 1, 0);
}

export function chunkTranscript(
  segments: SegmentLike[],
  options: ChunkerOptions = {},
): Chunk[] {
  const opts: Required<ChunkerOptions> = { ...DEFAULT_CHUNKER_OPTIONS, ...options };

  let clean = cleanSegments(segments);
  if (clean.length === 0) return [];

  if (clean.some((s) => s.text.length > opts.maxChars)) {
    clean = clean.flatMap((s) =>
      s.text.length > opts.maxChars ? splitOversizedSegment(s, opts.maxChars) : [s],
    );
  }

  const chunks: Chunk[] = [];
  let buffer: SegmentLike[] = [];
  let startTime = clean[0]!.offset;

  const currentEndTime = (): number => {
    const last = buffer[buffer.length - 1];
    return last ? last.offset + last.duration : startTime;
  };

  const currentSpan = (): number => currentEndTime() - startTime;

  const endsOnSentenceBoundary = (): boolean => {
    const last = buffer[buffer.length - 1];
    return last !== undefined && endsWithSentenceSeparator(last.text);
  };

  const flush = (nextStart: number, carryOverlap = true): void => {
    if (buffer.length === 0) return;
    const chunkSegments = buffer;
    chunks.push({
      index: chunks.length,
      text: chunkSegments.map((s) => s.text).join(" "),
      startTime,
      endTime: currentEndTime(),
    });

    buffer = carryOverlap ? makeOverlapTail(chunkSegments, opts.overlapChars) : [];
    startTime = buffer[0] ? buffer[0].offset : clean[nextStart]?.offset ?? 0;
  };

  // Hard time cap: force-close so no chunk ever spans beyond maxSpanSeconds.
  // Prefers the last sentence boundary; trims back so whole sentences stay intact.
  const flushHardCap = (nextStart: number): void => {
    if (buffer.length === 0) return;

    let boundary = -1;
    for (let k = buffer.length - 2; k >= 0; k--) {
      if (endsWithSentenceSeparator(buffer[k]!.text)) {
        const remainder = buffer.slice(k + 1);
        const closed = buffer.slice(0, k + 1);
        if (charsOf(closed) >= opts.minChars && charsOf(remainder) >= opts.minChars) {
          boundary = k;
        }
        break;
      }
    }

    if (boundary < 0) {
      flush(nextStart);
      return;
    }

    const closed = buffer.slice(0, boundary + 1);
    const rest = buffer.slice(boundary + 1);
    const closedEnd = closed[closed.length - 1]!.offset + closed[closed.length - 1]!.duration;
    chunks.push({
      index: chunks.length,
      text: closed.map((s) => s.text).join(" "),
      startTime,
      endTime: closedEnd,
    });

    const tail = makeOverlapTail(closed, opts.overlapChars);
    buffer = [...tail, ...rest];
    startTime = tail[0] ? tail[0].offset : rest[0]?.offset ?? clean[nextStart]?.offset ?? 0;
  };

  for (let i = 0; i < clean.length; i++) {
    const segment = clean[i]!;
    if (buffer.length > 0) {
      const silenceGap = segment.offset - currentEndTime();
      if (silenceGap > SILENCE_GAP_BREAK_SECONDS) {
        flush(i, false);
      } else {
        const size = charsOf(buffer);
        const wouldPushChars = size + segment.text.length + 1;
        const wouldPushSpan = currentSpan() + segment.duration;
        const bigEnough = size >= opts.minChars;
        const boundary = endsOnSentenceBoundary();

        const hardCharsExceeded = wouldPushChars > opts.maxChars && bigEnough;
        const targetCharsAtBoundary = wouldPushChars > opts.targetChars && bigEnough && boundary;
        const targetSpanAtBoundary = wouldPushSpan > opts.targetSpanSeconds && bigEnough && boundary;

        if (hardCharsExceeded || targetCharsAtBoundary || targetSpanAtBoundary) {
          flush(i);
        } else if (wouldPushSpan > opts.maxSpanSeconds && bigEnough) {
          flushHardCap(i);
        }
      }
    }
    if (buffer.length === 0) {
      startTime = segment.offset;
    }
    buffer.push(segment);
  }
  if (buffer.length > 0) {
    flush(clean.length);
  }

  return chunks;
}