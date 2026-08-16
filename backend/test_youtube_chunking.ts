import { chunkTranscript, DEFAULT_CHUNKER_OPTIONS } from "./src/modules/youtube/chunker.ts";
import { toInternalSegments } from "./src/modules/youtube/transcript.ts";
import type { Chunk } from "./src/modules/youtube/types.ts";

const TARGET = DEFAULT_CHUNKER_OPTIONS.targetChars;
const MAX = DEFAULT_CHUNKER_OPTIONS.maxChars;
const MIN = DEFAULT_CHUNKER_OPTIONS.minChars;
const OVERLAP = DEFAULT_CHUNKER_OPTIONS.overlapChars;
const TARGET_SPAN = DEFAULT_CHUNKER_OPTIONS.targetSpanSeconds;
const MAX_SPAN = DEFAULT_CHUNKER_OPTIONS.maxSpanSeconds;

function eq(a: unknown, b: unknown, label: string) {
  const pass = a === b;
  console.log(`${pass ? "PASS" : "FAIL"} ${label}${pass ? "" : ` — expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`}`);
  if (!pass) throw new Error(label);
}

function ok(cond: unknown, label: string, detail?: string) {
  const pass = Boolean(cond);
  console.log(`${pass ? "PASS" : "FAIL"} ${label}${pass ? "" : ` — ${detail ?? ""}`}`);
  if (!pass) throw new Error(label);
}

const WORDS =
  "the quick brown fox jumps over the lazy dog near the river bank while birds sing in the trees";

// Realistic caption segments are short (~20-100 chars), so overlap can actually kick in.
const CAPTION_PHRASE = "the lazy dog naps by the river bank in the warm afternoon sun";

function seg(text: string, offset: number, duration = 5): { text: string; offset: number; duration: number } {
  return { text, offset, duration };
}

let failed = 0;
try {
  eq(toJson(chunkTranscript([])), toJson([]), "empty segments produce no chunks");

  const blank = [seg("   ", 0), seg("", 5), seg("\n\t", 10)];
  eq(toJson(chunkTranscript(blank)), toJson([]), "whitespace-only segments produce no chunks");

  const short = [seg("hello world", 0), seg("second bit", 5, 3)];
  const shortChunks = chunkTranscript(short);
  eq(shortChunks.length, 1, "short transcript produces one chunk");
  eq(shortChunks[0]!.text, "hello world second bit", "short chunks join segments with space");
  eq(shortChunks[0]!.startTime, 0, "first chunk starts at first offset");
  eq(shortChunks[0]!.endTime, 8, "first chunk ends at last offset+duration");

  const text = WORDS.repeat(2);
  const sentencey = Array.from({ length: 80 }, (_, i) => seg(`${text} x${i}.`, i * 5));
  const deterministicA = chunkTranscript(sentencey);
  const deterministicB = chunkTranscript(sentencey);
  eq(toJson(deterministicA), toJson(deterministicB), "chunking is deterministic");

  const manySegs = Array.from({ length: 200 }, (_, i) => seg(`${CAPTION_PHRASE} x${i}`, i * 5));
  const docs = chunkTranscript(manySegs);
  ok(docs.length > 1, "many short segments produce multiple chunks");

  // Overlap tail re-appended to a fresh buffer can push a chunk up to maxChars + overlapChars.
  const BOUND = MAX + OVERLAP;
  const withinBound = docs.every((chunk) => chunk.text.length <= BOUND);
  ok(withinBound, "every chunk text stays within maxChars + overlapChars");
  const underOrAtMax = docs.every((chunk) => chunk.text.length <= MAX);
  if (!underOrAtMax) {
    console.log("  (note: overlap pushed some chunks past maxChars; allowed: max + overlap)");
  }

  const asc = docs.every((chunk, i) => chunk.index === i);
  ok(asc, "chunk indexes are sequential from 0");

  for (const chunk of docs) {
    if (chunk.startTime >= chunk.endTime) {
      ok(false, "every chunk has startTime < endTime", `chunk ${chunk.index} ${chunk.startTime}/${chunk.endTime}`);
      break;
    }
  }
  ok(true, "every chunk has startTime < endTime");

  const first = docs[0]!;
  eq(first.startTime, 0, "first chunk starts at 0");

  let overlapping = 0;
  for (let i = 1; i < docs.length; i++) {
    if (docs[i]!.startTime < docs[i - 1]!.endTime) overlapping++;
  }
  ok(overlapping > 0, "consecutive chunks share overlap while overlapChars > 0");

  const overlapZero = chunkTranscript(manySegs, { overlapChars: 0 });
  const gapCount = overlapZero.reduce((n, chunk, i) => (i === 0 ? 0 : n + (chunk.startTime >= overlapZero[i - 1]!.endTime ? 1 : 0)), 0);
  eq(gapCount, overlapZero.length - 1, "no overlap when overlapChars = 0");

  const big = seg(WORDS.repeat(80), 0, 100);
  const bigChunks = chunkTranscript([big]);
  ok(bigChunks.length > 1, "oversized single segment is split");
  const under = bigChunks.every((c) => c.text.length <= BOUND);
  ok(under, "split pieces respect maxChars + overlapChars");

  const minApplied = chunkTranscript([
    seg(`${text} alpha`, 0),
    seg(`${text} beta`, 5),
  ]);
  ok(minApplied.filter((c) => c.text.length >= MIN).length >= minApplied.length - 1, "chunks generally respect minChars (small tails allowed)");

  // --- milliseconds -> seconds normalization at the transcript boundary ---
  const normalized = toInternalSegments([
    { text: "wake up to reality", offset: 1121679, duration: 2500 },
    { text: "life is mostly suffering", offset: 1124179, duration: 2740 },
  ]);
  ok(Math.abs(normalized[0]!.offset - (1121679 / 1000)) < 1e-9, "offset 1121679 ms -> ~1121.679 s");
  ok(Math.abs(normalized[0]!.duration - 2.5) < 1e-9, "duration 2500 ms -> 2.5 s");
  ok(normalized[0]!.offset !== 1121679, "offset is never passed through in milliseconds");
  ok(normalized[0]!.duration !== 2500, "duration is never passed through in milliseconds");
  ok(normalized[0]!.offset >= 1000, "normalized offset stays in the seconds range (> 1000 would be raw ms)");

  const normalizedChunks = chunkTranscript(normalized);
  eq(normalizedChunks[0]!.startTime, 1121.679, "chunker startTime is in seconds after normalization");
  ok(normalizedChunks[0]!.startTime < 1121679, "chunk startTime is not an ms value");

  // --- time-bounded chunking: no multi-minute mega-chunks ---
  // Dense low-information-density caption stream (like a quote-compilation video):
  // ~84 chars every 10s => ~8.4 chars/sec, the regime that previously merged
  // many unrelated quotes into 3-4 minute chunks.
  const DENSE_SENTENCE = "most villains only ever want power for its own sake. the weak kneel and the strong rule on and on.";
  const dense = Array.from({ length: 900 }, (_, i) => seg(`${DENSE_SENTENCE} line ${i}.`, i * 10, 10));
  const denseChunks = chunkTranscript(dense);
  ok(denseChunks.length > 20, "low density transcript produces many chunks (not a few mega-chunks)", `got ${denseChunks.length}`);
  let maxSpanSeen = 0;
  for (const c of denseChunks) {
    maxSpanSeen = Math.max(maxSpanSeen, c.endTime - c.startTime);
    if (c.startTime >= c.endTime) {
      ok(false, "time-bounded chunks have startTime < endTime", `chunk ${c.index}`);
      break;
    }
  }
  ok(true, "time-bounded chunks all have startTime < endTime");
  ok(maxSpanSeen <= MAX_SPAN + 20, `no chunk spans beyond the hard time cap (max ${maxSpanSeen.toFixed(1)}s vs cap ${MAX_SPAN}s)`);
  const sentenceCompleteness = denseChunks.filter((c) => c.text.trim().endsWith(".")).length;
  ok(sentenceCompleteness >= denseChunks.length - 2, "chunks close on complete sentences under normal conditions");
  eq(Math.round(denseChunks[0]!.startTime), 0, "time-bounded first chunk starts at 0");
  const denseSpans = denseChunks.map((c) => c.endTime - c.startTime);
  const underTarget = denseSpans.filter((s) => s <= TARGET_SPAN + 15).length;
  ok(underTarget === denseSpans.length, "typical chunks stay near the target time span (not ~3 minutes)");

  // --- coherence: a distinctive quote is no longer merged into a 3-4 min grab-bag ---
  const quoteA = "I am not a hero. I am the one who bends the world to my will and calls it order.";
  const quoteB = "You see their morals their code it is a bad joke. Dropped at the first sign of trouble.";
  const quoteC = "VULTURE_MARKER every living thing fears the inevitable end I bring. There is no mercy in my design.";
  const spacedQuotes = [
    ...quoteA.split(". ").flatMap((sentence, j) => {
      const s = `${sentence.trim()}.`;
      return s.length > 0 ? [seg(s, 0 + j * 6, 6)] : [];
    }),
    ...quoteB.split(". ").flatMap((sentence, j) => {
      const s = `${sentence.trim()}.`;
      return s.length > 0 ? [seg(s, 120 + j * 6, 6)] : [];
    }),
    ...quoteC.split(". ").flatMap((sentence, j) => {
      const s = `${sentence.trim()}.`;
      return s.length > 0 ? [seg(s, 240 + j * 6, 6)] : [];
    }),
  ];
  const quoteChunks = chunkTranscript(spacedQuotes);
  const badJokeChunk = quoteChunks.find((c) => c.text.includes("bad joke"));
  ok(badJokeChunk !== undefined, "the bad-joke quote chunk exists");
  if (badJokeChunk) {
    const span = badJokeChunk.endTime - badJokeChunk.startTime;
    ok(span < 60, `quote chunk is short and focused (span ${span.toFixed(1)}s, not 226s)`);
    ok(!badJokeChunk.text.includes("VULTURE_MARKER"), "quote chunk does not swallow the next unrelated quote");
  }

  console.log("\nALL YOUTUBE CHUNKING TESTS PASSED");
} catch (err) {
  failed = 1;
  console.error("\nYOUTUBE CHUNKING TEST FAILED:", err);
}

function toJson(chunks: Chunk[]): string {
  return JSON.stringify(chunks);
}

process.exit(failed);