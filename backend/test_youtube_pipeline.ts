import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { app } from "./src/app.ts";
import { startEmbeddingWorker } from "./src/modules/embedding/queue.ts";
import { youtubeService } from "./src/modules/youtube/service.ts";
import { toInternalSegments, type RawTranscriptEntry } from "./src/modules/youtube/transcript.ts";
import { DEFAULT_CHUNKER_OPTIONS } from "./src/modules/youtube/chunker.ts";
import { youtubeQueue } from "./src/modules/youtube/queue.ts";
import { embeddingQueue } from "./src/modules/embedding/queue.ts";
import { chunkRepository } from "./src/modules/resource/chunk.repository.ts";
import { resourceRepository } from "./src/modules/resource/repository.ts";
import { prisma } from "./src/shared/prisma.ts";
import { redis } from "./src/config/redis.ts";
import { TranscriptStatus } from "./generated/prisma/client.ts";
import type { TranscriptSegment } from "./src/modules/youtube/types.ts";

const PASSWORD = "YoutubePipeTest123!";
const VIDEO_ID = "dQw4w9WgXcQ";

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

// --- mock "photosynthesis" lecture transcript (deterministic, never touches youtube.com) ---
function buildMockSegments(): TranscriptSegment[] {
  const blocks: [number, string[]][] = [
    [0, [
      "welcome to this short lecture on photosynthesis",
      "today we explore how plants convert light into chemical energy",
      "photosynthesis happens inside tiny structures called chloroplasts",
      "chloroplasts are found mostly in the cells of green leaves",
      "the pigment chlorophyll absorbs light in the red and blue parts of the spectrum",
      "chlorophyll gives leaves their green color",
      "plants capture energy from sunlight all day long",
      "this captured energy is stored in chemical bonds",
      "those bonds later power growth and reproduction",
      "every living thing on the planet depends on this process in some way",
      "even animals that eat only meat depend on plant consumers",
      "photosynthesis is the foundation of nearly every food web",
    ]],
    [30, [
      "the whole process has two major stages",
      "the first stage is called the light dependent reactions",
      "the second stage is known as the calvin cycle",
      "light reactions occur in the thylakoid membranes of the chloroplast",
      "when light strikes chlorophyll it energizes electrons",
      "these energized electrons move through a chain of proteins",
      "water molecules are split apart during this stage",
      "splitting water releases oxygen gas as a byproduct",
      "the oxygen gas leaves the leaf through tiny pores called stomata",
      "this is the source of nearly all the oxygen in our atmosphere",
      "almost every breath you take contains oxygen from green leaves",
      "the electrons released from water replace the ones that left chlorophyll",
      "hydrogen ions build up across the membrane creating a charge difference",
      "that charge difference drives atp synthase like a tiny motor",
      "atp synthase spins and attaches phosphate groups to create atp",
    ]],
    [95, [
      "the energy captured in the light reactions is stored in atp",
      "another carrier molecule called nadph also captures electrons",
      "atp and nadph move to the stroma where the calvin cycle runs",
      "the calvin cycle fixes carbon dioxide from the air",
      "carbon dioxide combines with a five carbon sugar called rubp",
      "enzymes guide each step of the cycle",
      "eventually the cycle builds molecules of glucose",
      "glucose is a sugar that stores energy in its chemical bonds",
      "some glucose is used immediately by the plant",
      "some glucose is stored as starch for later use",
      "some glucose becomes cellulose which builds cell walls",
      "rubisco is the most abundant enzyme on the planet",
      "the calvin cycle runs three times to build one molecule of glucose",
      "each turn of the cycle adds one carbon atom from carbon dioxide",
      "without carbon dioxide the whole cycle grinds to a halt",
      "at night the calvin cycle pauses because no atp is being made",
    ]],
    [165, [
      "plants also need water and mineral nutrients from the soil",
      "roots draw water up through the xylem to the leaves",
      "transpiration pulls water from root to leaf",
      "if a plant lacks water the stomata close to conserve it",
      "closing stomata also limits carbon dioxide uptake",
      "that is why plants wilt and slow down in droughts",
      "temperature and light intensity control the overall rate",
      "more light usually means faster photosynthesis up to a point",
      "each species has its own optimal conditions",
      "too much heat can damage the enzymes that run the cycle",
      "crops rely on these same principles for their yield",
      "farmers monitor light water and nutrients to keep plants healthy",
      "to summarize photosynthesis powers almost every food chain on earth",
      "thank you for listening and stay curious about plants",
    ]],
  ];
  const segments: TranscriptSegment[] = [];
  for (const [startOffset, lines] of blocks) {
    for (let i = 0; i < lines.length; i++) {
      segments.push({
        text: lines[i]!,
        offset: startOffset + i * 4,
        duration: 4,
      });
    }
  }
  return segments;
}

const MOCK_RAW_MS: RawTranscriptEntry[] = buildMockSegments().map((s) => ({
  text: s.text,
  offset: s.offset * 1000,
  duration: s.duration * 1000,
}));

// Mock quote-compilation "villain quotes" transcript: short distinct quotes parked
// ~90s apart (music gaps), the regime that previously merged them into 3-4 minute chunks.
function buildVillainMock(): TranscriptSegment[] {
  const blocks: [number, string[]][] = [
    [
      0,
      [
        "Power is the only currency that ever mattered.",
        "The strong take what they want and the weak only kneel and weep.",
        "Builders toil so that conquerors may reap and that is the natural order.",
      ],
    ],
    [
      90,
      [
        "Heroes are a myth the masses invented to feel safe at night.",
        "In the end every savior is just a corpse waiting to be forgotten by the crowd.",
      ],
    ],
    [
      150,
      [
        "Listen to me carefully you fool.",
        "Their morals their code it is a bad joke.",
        "Dropped at the first sign of trouble and replaced with looting.",
      ],
    ],
    [
      240,
      [
        "Wake up to reality.",
        "Life is mostly suffering and nothing truly has any meaning.",
        "Every dream withers and every hope rots away in this cursed world.",
      ],
    ],
    [
      330,
      ["VULTURE_SPOILER I feed on your fear and grow strong on despair."],
    ],
  ];
  const segments: TranscriptSegment[] = [];
  for (const [startOffset, lines] of blocks) {
    for (let i = 0; i < lines.length; i++) {
      segments.push({
        text: lines[i]!,
        offset: startOffset + i * 3,
        duration: 3,
      });
    }
  }
  return segments;
}

const VILLAIN_RAW_MS: RawTranscriptEntry[] = buildVillainMock().map((s) => ({
  text: s.text,
  offset: s.offset * 1000,
  duration: s.duration * 1000,
}));

const VILLAIN_SEGMENTS = toInternalSegments(VILLAIN_RAW_MS);

const MAX_SPAN = DEFAULT_CHUNKER_OPTIONS.maxSpanSeconds;

// The boundary normalization the app applies to raw library output (ms -> seconds).
const MOCK_SEGMENTS = toInternalSegments(MOCK_RAW_MS);

async function register(base: string, suffix: string): Promise<string> {
  const res = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Youtube ${suffix}`,
      email: `youtube-${suffix}-${Date.now()}@test.com`,
      password: PASSWORD,
    }),
  });
  eq(res.status, 201, `register ${suffix} returns 201`);
  const body = (await res.json()) as { token: string };
  ok(body.token, `register ${suffix} returns token`);
  return body.token;
}

async function main() {
  const worker = startEmbeddingWorker();
  const server = app.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://localhost:${port}`;

  let failed = 0;
  try {
    const tokenA = await register(base, "A");
    const authA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };

    // --- 1. create YOUTUBE resource ---
    let res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        type: "YOUTUBE",
        url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        title: "Photosynthesis explained simply",
        description: "A short lecture about how plants make food.",
      }),
    });
    eq(res.status, 201, "YOUTUBE create returns 201");
    const created = (await res.json()) as { id: string; type: string; transcriptStatus: string | null };
    eq(created.type, "YOUTUBE", "created resource type is YOUTUBE");
    eq(created.transcriptStatus, null, "transcriptStatus null before processing");

    // --- 2. process with injected mock segments ---
    const outcome = await youtubeService.process(created.id, {
      fetchSegments: async () => ({ kind: "segments", segments: MOCK_SEGMENTS }),
    });
    eq(outcome, "completed", "process returns completed");

    const count = await chunkRepository.countByResource(created.id);
    ok(count > 1, "multiple chunks persisted");

    const demoNormalized = toInternalSegments([{ text: "wake up to reality", offset: 1121679, duration: 2500 }]);
    ok(Math.abs(demoNormalized[0]!.offset - (1121679 / 1000)) < 1e-9, "pipeline normalization: 1121679 ms -> 1121.679 s");
    ok(Math.abs(demoNormalized[0]!.duration - 2.5) < 1e-9, "pipeline normalization: duration 2500 ms -> 2.5 s");

    res = await fetch(`${base}/api/resources/${created.id}`, { headers: authA });
    eq(res.status, 200, "GET resource returns 200");
    const resourceBody = (await res.json()) as { transcriptStatus: string; metadata: { youtube?: { videoId: string } } };
    eq(resourceBody.transcriptStatus, "COMPLETED", "transcriptStatus is COMPLETED");
    eq(resourceBody.metadata?.youtube?.videoId, VIDEO_ID, "metadata.youtube.videoId persisted");

    // --- 3. semantic chunk search: query does NOT repeat chunk wording ---
    res = await fetch(
      `${base}/api/resources/search/chunks?q=${encodeURIComponent("what gas do green plants release for animals to breathe")}`,
      { headers: authA },
    );
    eq(res.status, 200, "chunk search returns 200");
    const searchBody = (await res.json()) as {
      items: {
        text: string;
        similarity: number;
        startTime: number | null;
        endTime: number | null;
        deepLink: string | null;
        resourceId: string;
        resource: { title: string; url: string | null };
      }[];
      count: number;
    };
    ok(searchBody.items.length > 0, "chunk search returns results");
    const top = searchBody.items[0]!;
    ok(top.text.toLowerCase().includes("oxygen"), "top chunk is about oxygen (query never said 'oxygen')");
    ok(top.resourceId === created.id, "top chunk belongs to created resource");
    eq(top.resource.title, "Photosynthesis explained simply", "chunk carries resource summary");
    ok(top.startTime != null && top.similarity > 0, "chunk carries startTime and similarity");
    ok(top.startTime < 1000, "returned startTime is SECONDS, not raw ms (< 1000 proves no ms leakage)");
    ok(top.endTime == null || top.endTime < 1000, "returned endTime is SECONDS, not raw ms");
    const expectedDeepLink =
      top.startTime && top.startTime > 0
        ? `https://youtu.be/${VIDEO_ID}?t=${Math.floor(top.startTime)}`
        : `https://youtu.be/${VIDEO_ID}`;
    eq(top.deepLink, expectedDeepLink, "chunk carries exact deep link for its startTime");

    // --- 4. replace-all idempotency: reprocess yields identical chunk set ---
    const beforeIds = new Set(
      (await prisma.resourceChunk.findMany({ where: { resourceId: created.id }, select: { id: true } })).map((r) => r.id),
    );
    const outcome2 = await youtubeService.process(created.id, {
      fetchSegments: async () => ({ kind: "segments", segments: MOCK_SEGMENTS }),
    });
    eq(outcome2, "completed", "reprocess returns completed");
    const afterCount = await chunkRepository.countByResource(created.id);
    eq(afterCount, count, "reprocess keeps same chunk count (replace-all)");
    const afterIds = new Set(
      (await prisma.resourceChunk.findMany({ where: { resourceId: created.id }, select: { id: true } })).map((r) => r.id),
    );
    ok(beforeIds.size === afterIds.size, "replace-all produces same number of chunk rows");

    // --- 5. owner scoping: second user cannot see user A chunks ---
    const tokenB = await register(base, "B");
    const authB = { Authorization: `Bearer ${tokenB}`, "Content-Type": "application/json" };
    res = await fetch(
      `${base}/api/resources/search/chunks?q=${encodeURIComponent("what gas do green plants release for animals to breathe")}`,
      { headers: authB },
    );
    eq(res.status, 200, "user B chunk search returns 200");
    const otherBody = (await res.json()) as { items: unknown[] };
    eq(otherBody.items.length, 0, "user B sees zero chunks from user A (owner scoping)");

    // --- 5b. precision: distinct quotes stay isolated AND rank near the top ---
    res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        type: "YOUTUBE",
        url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        title: "Quotes from villains",
      }),
    });
    eq(res.status, 201, "villain-quotes YOUTUBE create returns 201");
    const villainRes = (await res.json()) as { id: string };
    const villainOutcome = await youtubeService.process(villainRes.id, {
      fetchSegments: async () => ({ kind: "segments", segments: VILLAIN_SEGMENTS }),
    });
    eq(villainOutcome, "completed", "villain-quotes process returns completed");

    const villainChunks = await prisma.resourceChunk.findMany({
      where: { resourceId: villainRes.id },
      select: { text: true, startTime: true, endTime: true },
    });
    ok(villainChunks.length >= 4, "villain quotes produce multiple distinct chunks", `got ${villainChunks.length}`);
    const badJokeRows = villainChunks.filter((c) => c.text.includes("bad joke"));
    eq(badJokeRows.length, 1, "the bad-joke quote exists in exactly one chunk");
    if (badJokeRows[0]) {
      const span = badJokeRows[0].endTime! - badJokeRows[0].startTime!;
      ok(span < 60, `bad-joke quote chunk is focused, not a 3-4 min grab-bag (span ${span.toFixed(1)}s)`);
      ok(!badJokeRows[0].text.includes("VULTURE_SPOILER"), "bad-joke chunk does not swallow the unrelated later quote");
    }
    ok(
      villainChunks.every((c) => (c.endTime! - c.startTime!) <= MAX_SPAN + 30),
      "every villain-quote chunk respects the hard time cap",
    );

    res = await fetch(
      `${base}/api/resources/search/chunks?q=${encodeURIComponent("morals are bad joke")}`,
      { headers: authA },
    );
    eq(res.status, 200, "villain bad-joke search returns 200");
    const jokeSearch = (await res.json()) as {
      items: { text: string; similarity: number; startTime: number | null }[];
    };
    const jokeRank = jokeSearch.items.findIndex((i) => i.text.toLowerCase().includes("bad joke"));
    ok(jokeRank >= 0 && jokeRank < 3, `bad-joke quote retrieves in top-3 (ranked #${jokeRank + 1})`, `rank ${jokeRank}, total ${jokeSearch.items.length}`);
    ok(jokeSearch.items.every((i) => i.startTime == null || i.startTime < 1000), "bad-joke results are in seconds, never ms");

    res = await fetch(
      `${base}/api/resources/search/chunks?q=${encodeURIComponent("a villain explaining that life is mostly suffering and nothing has meaning")}`,
      { headers: authA },
    );
    eq(res.status, 200, "suffering-quote search returns 200");
    const suffering = (await res.json()) as { items: { text: string; similarity: number }[] };
    const sufferingRank = suffering.items.findIndex((i) => i.text.toLowerCase().includes("suffering"));
    ok(sufferingRank >= 0 && sufferingRank < 3, `suffering/madara quote retrieves in top-3 (ranked #${sufferingRank + 1})`, `rank ${sufferingRank}`);

    // --- 5c. photosynthesis chunks also respect the time cap ---
    const phWaterChunks = await prisma.resourceChunk.findMany({
      where: { resourceId: created.id },
      select: { startTime: true, endTime: true },
    });
    ok(
      phWaterChunks.every((c) => (c.endTime! - c.startTime!) <= MAX_SPAN + 30),
      "photosynthesis chunks respect the hard time cap",
    );

    // --- 6. UNSUPPORTED video is terminal, not an error ---
    res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        type: "YOUTUBE",
        url: `https://youtu.be/12345678901`,
        title: "Video without captions",
      }),
    });
    eq(res.status, 201, "unsupported-case YOUTUBE create returns 201");
    const unsupportedRes = (await res.json()) as { id: string };
    const unsupportedOutcome = await youtubeService.process(unsupportedRes.id, {
      fetchSegments: async () => ({ kind: "unsupported", reason: "no captions available" }),
    });
    eq(unsupportedOutcome, "unsupported", "process reports unsupported");
    const unsupportedInfo = await resourceRepository.findById(unsupportedRes.id);
    eq(unsupportedInfo?.transcriptStatus, TranscriptStatus.UNSUPPORTED, "transcriptStatus is UNSUPPORTED");
    eq(await chunkRepository.countByResource(unsupportedRes.id), 0, "no chunks stored for unsupported video");

    // --- 7. unexpected failure surfaces as FAILED ---
    res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        type: "YOUTUBE",
        url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        title: "Video that fails mid-processing",
      }),
    });
    eq(res.status, 201, "failure-case YOUTUBE create returns 201");
    const failRes = (await res.json()) as { id: string };
    let threw = false;
    try {
      await youtubeService.process(failRes.id, {
        fetchSegments: async () => {
          throw new Error("boom");
        },
      });
    } catch {
      threw = true;
    }
    ok(threw, "process throws on unexpected failure");
    const failInfo = await resourceRepository.findById(failRes.id);
    eq(failInfo?.transcriptStatus, TranscriptStatus.FAILED, "transcriptStatus is FAILED after unexpected error");

    console.log("\nALL YOUTUBE PIPELINE TESTS PASSED");
  } catch (err) {
    failed = 1;
    console.error("\nYOUTUBE PIPELINE TEST FAILED:", err);
  } finally {
    try {
      await worker.close();
    } catch {}
    try {
      await youtubeQueue.drain();
    } catch {}
    try {
      await embeddingQueue.drain();
    } catch {}
    server.close();
    try {
      await prisma.$disconnect();
    } catch {}
    try {
      await Promise.race([redis.quit(), new Promise((r) => setTimeout(r, 1000))]);
    } catch {
      try {
        redis.disconnect();
      } catch {}
    }
    process.exit(failed);
  }
}

void main();