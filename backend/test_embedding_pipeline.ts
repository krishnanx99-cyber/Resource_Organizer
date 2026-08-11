import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { app } from "./src/app.ts";
import { startEmbeddingWorker, embeddingQueue } from "./src/modules/embedding/queue.ts";
import { resourceRepository } from "./src/modules/resource/repository.ts";
import { prisma } from "./src/shared/prisma.ts";
import { redis } from "./src/config/redis.ts";
import { env } from "./src/config/env.ts";

const PASSWORD = "PipelineTest123!";

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

async function waitFor(cb: () => Promise<boolean>, timeoutMs: number, label: string) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cb()) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`TIMEOUT waiting for ${label}`);
}

async function waitForQueueDrain(timeoutMs = 15_000) {
  const drain = async () => {
    const counts = await embeddingQueue.getJobCounts("waiting", "active", "delayed");
    return counts.waiting + counts.active + counts.delayed === 0;
  };
  await waitFor(drain, timeoutMs, `embedding queue drain (${await embeddingQueue.getJobCounts("waiting", "active", "delayed").then((c) => JSON.stringify(c))})`);
}

async function main() {
  const originalOpenAIKey = env.OPENAI_API_KEY;
  const worker = startEmbeddingWorker();
  const server = app.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://localhost:${port}`;

  let failed = 0;
  try {
    // --- setup: register + login ---
    const email = `pipeline-${Date.now()}@test.com`;
    let res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Pipeline Test", email, password: PASSWORD }),
    });
    eq(res.status, 201, "register returns 201");
    const { token } = (await res.json()) as { token: string };
    ok(token, "register returns token");

    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // --- 1. POST /api/resources (TEXT) → created immediately, embedding async ---
    res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        type: "TEXT",
        title: "React hooks reference",
        content: "React useMemo, useCallback, useEffect semantics and when to use each hook.",
        whySaved: "prepare for React interview",
      }),
    });
    eq(res.status, 201, "TEXT create returns 201");
    const textRes = (await res.json()) as { id: string; type: string };
    ok(textRes.id, "TEXT resource has id");
    ok(!("embedding" in textRes), "TEXT response does not expose embedding");

    await waitFor(
      async () => (await resourceRepository.getEmbeddingInfo(textRes.id))?.embedding != null,
      60_000,
      "TEXT embedding populated",
    );
    const textInfo = await resourceRepository.getEmbeddingInfo(textRes.id);
    ok(textInfo?.embedding, "TEXT embedding stored");
    eq(textInfo!.dimension, 1536, "TEXT embedding dimension is 1536");

    // --- 2. POST /api/resources (URL) → same flow ---
    res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        type: "URL",
        url: "https://example.com",
        title: "Example domain",
        description: "The example.com documentation page.",
      }),
    });
    eq(res.status, 201, "URL create returns 201");
    const urlRes = (await res.json()) as { id: string };
    await waitFor(
      async () => (await resourceRepository.getEmbeddingInfo(urlRes.id))?.embedding != null,
      60_000,
      "URL embedding populated",
    );
    eq((await resourceRepository.getEmbeddingInfo(urlRes.id))!.dimension, 1536, "URL embedding dimension is 1536");

    // --- 3. Semantic update regenerates embedding ---
    await waitForQueueDrain();
    const beforeRegen = (await resourceRepository.getEmbeddingInfo(textRes.id))!.embedding!;
    res = await fetch(`${base}/api/resources/${textRes.id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({
        content: "Semantic search with pgvector, cosine similarity, and hybrid ranking strategies.",
      }),
    });
    eq(res.status, 200, "semantic PATCH returns 200");
    await waitFor(
      async () => (await resourceRepository.getEmbeddingInfo(textRes.id))?.embedding !== beforeRegen,
      60_000,
      "embedding regenerated after semantic update",
    );
    ok(true, "semantic update changed embedding");

    // --- 4. Non-semantic update does NOT regenerate ---
    await waitForQueueDrain();
    const afterSemantic = (await resourceRepository.getEmbeddingInfo(textRes.id))!.embedding!;
    res = await fetch(`${base}/api/resources/${textRes.id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ platform: "manual-import", sourceType: "blog" }),
    });
    eq(res.status, 200, "non-semantic PATCH returns 200");
    await waitForQueueDrain();
    const afterNonSemantic = (await resourceRepository.getEmbeddingInfo(textRes.id))!.embedding!;
    eq(afterNonSemantic, afterSemantic, "embedding unchanged after non-semantic update");

    // --- 5. Embedding failure does not delete the resource ---
    await waitForQueueDrain();
    const failedBefore = (await embeddingQueue.getJobCounts("failed")).failed;
    env.OPENAI_API_KEY = "";
    res = await fetch(`${base}/api/resources`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        type: "TEXT",
        title: "Will fail embedding",
        content: "This resource is created while the OpenAI key is temporarily unavailable.",
      }),
    });
    eq(res.status, 201, "failure-case TEXT create returns 201");
    const failRes = (await res.json()) as { id: string };
    await waitFor(
      async () => (await embeddingQueue.getJobCounts("failed")).failed > failedBefore,
      40_000,
      "embedding job failed after retries exhausted",
    );
    env.OPENAI_API_KEY = originalOpenAIKey;

    const afterFail = await resourceRepository.getEmbeddingInfo(failRes.id);
    ok(afterFail?.embedding == null, "failed resource has no embedding");
    res = await fetch(`${base}/api/resources/${failRes.id}`, { headers: auth });
    eq(res.status, 200, "resource still exists after embedding failure");

    console.log("\nALL PIPELINE TESTS PASSED");
  } catch (err) {
    failed = 1;
    console.error("\nPIPELINE TEST FAILED:", err);
  } finally {
    env.OPENAI_API_KEY = originalOpenAIKey;
    try {
      await worker.close();
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