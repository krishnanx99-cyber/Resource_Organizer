import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { app } from "./src/app.ts";
import { startEmbeddingWorker, embeddingQueue } from "./src/modules/embedding/queue.ts";
import { resourceRepository } from "./src/modules/resource/repository.ts";
import { prisma } from "./src/shared/prisma.ts";
import { redis } from "./src/config/redis.ts";

const PASSWORD = "SimilarTest123!";

interface SimilarItem {
  id: string;
  ownerId: string;
  title: string;
  type: string;
  [key: string]: unknown;
}

interface SimilarResponse {
  items: SimilarItem[];
  count: number;
  limit: number;
}

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

async function waitForEmbedding(id: string, label: string) {
  await waitFor(
    async () => (await resourceRepository.getEmbeddingInfo(id))?.embedding != null,
    90_000,
    label,
  );
}

function assertNoEmbeddingExposed(items: SimilarItem[], label: string) {
  for (const item of items) {
    if ("embedding" in item) {
      throw new Error(`${label} — item ${item.id} exposed embedding`);
    }
  }
  console.log(`PASS ${label}`);
}

async function main() {
  const worker = startEmbeddingWorker();
  const server = app.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://localhost:${port}`;

  let failed = 0;
  try {
    // --- setup: register two users ---
    const emailA = `similar-a-${Date.now()}@test.com`;
    let res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Similar User A", email: emailA, password: PASSWORD }),
    });
    eq(res.status, 201, "user A register returns 201");
    const { token: tokenA } = (await res.json()) as { token: string };
    ok(tokenA, "user A register returns token");
    const authA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };

    const emailB = `similar-b-${Date.now()}@test.com`;
    res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Similar User B", email: emailB, password: PASSWORD }),
    });
    eq(res.status, 201, "user B register returns 201");
    const { token: tokenB } = (await res.json()) as { token: string };
    ok(tokenB, "user B register returns token");
    const authB = { Authorization: `Bearer ${tokenB}`, "Content-Type": "application/json" };

    const userA = await prisma.user.findUniqueOrThrow({ where: { email: emailA } });
    const userB = await prisma.user.findUniqueOrThrow({ where: { email: emailB } });

    // --- create A resources on distinct topics ---
    async function createText(auth: Record<string, string>, body: object): Promise<string> {
      res = await fetch(`${base}/api/resources`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ type: "TEXT", ...body }),
      });
      eq(res.status, 201, "TEXT create returns 201");
      const created = (await res.json()) as { id: string };
      ok(created.id, "TEXT resource has id");
      return created.id;
    }

    const react1 = await createText(authA, {
      title: "React Hooks",
      content: "useState, useEffect, useMemo and useCallback hooks for state and effects in React components.",
      whySaved: "interview prep for react",
    });
    const react2 = await createText(authA, {
      title: "React Context and Redux",
      content: "global application state management using the React Context API and Redux reducers and action creators.",
    });
    const backend = await createText(authA, {
      title: "Node.js REST API Design",
      content: "building express REST APIs with middleware, JSON schema validation and pagination.",
    });
    const recipes = await createText(authA, {
      title: "Sourdough Bread Recipes",
      content: "baking sourdough bread with live starter, autolyse, stretch and fold, and long cold fermentation.",
    });
    const nullEmb = await createText(authA, {
      title: "React memoization deep dive",
      content: "memoizing components with React.memo, useMemo and useCallback to avoid re-renders.",
    });

    await waitForEmbedding(react1, "react1 embedding populated");
    await waitForEmbedding(react2, "react2 embedding populated");
    await waitForEmbedding(backend, "backend embedding populated");
    await waitForEmbedding(recipes, "recipes embedding populated");
    await waitForEmbedding(nullEmb, "null-embedding candidate populated first");
    await prisma.$executeRaw`UPDATE "Resource" SET embedding = NULL WHERE id = ${nullEmb}`;
    await waitForQueueDrain();

    // --- user B creates a resource very close to A's react topic ---
    const bReact = await createText(authB, {
      title: "Advanced React State Management",
      content: "useReducer, zustand stores, recoil selectors and performance optimizations for complex state in React.",
    });
    await waitForEmbedding(bReact, "user B react embedding populated");

    // --- 0. auth required ---
    res = await fetch(`${base}/api/resources/${react1}/similar`);
    eq(res.status, 401, "similar without token returns 401");

    // --- 1. similar for a React resource ---
    res = await fetch(`${base}/api/resources/${react1}/similar`, { headers: authA });
    eq(res.status, 200, "similar returns 200");
    const similar = (await res.json()) as SimilarResponse;
    ok(Array.isArray(similar.items), "similar returns an items array");
    eq(similar.count, similar.items.length, "similar count equals items length");
    eq(similar.limit, 10, "similar limit defaults to 10");

    assertNoEmbeddingExposed(similar.items, "similar results do not expose embedding");

    // --- 2. owner scoping + no cross-user leak ---
    ok(
      similar.items.every((i) => i.ownerId === userA.id),
      "similar results are scoped to user A at the database level",
    );
    const similarIds = new Set(similar.items.map((i) => i.id));
    ok(!similarIds.has(bReact), "user B resource absent from user A results");

    // --- 3. source resource itself is excluded ---
    ok(!similarIds.has(react1), "source resource is excluded from its own results");

    // --- 4. semantically related rank above unrelated ---
    const similarSorted = similar.items.every(
      (item, i) => i === 0 || (similar.items[i - 1]!.similarity as number) >= (item.similarity as number),
    );
    ok(similarSorted, "similar results are ordered by similarity (descending)");
    const rankReact2 = similar.items.findIndex((i) => i.id === react2);
    const rankBackend = similar.items.findIndex((i) => i.id === backend);
    const rankRecipes = similar.items.findIndex((i) => i.id === recipes);
    ok(rankReact2 >= 0, "react2 ranks in similar results");
    ok(rankReact2 < rankBackend && rankReact2 < rankRecipes, "react sibling ranks above unrelated topics");
    ok(
      (similar.items[0]!.similarity as number) > 0.5,
      "top similar result has substantial similarity",
      `got ${similar.items[0]!.similarity}`,
    );

    // --- 5. NULL-embedding sibling is ignored ---
    ok(!similarIds.has(nullEmb), "NULL-embedding resource is ignored");

    // --- 6. limit works ---
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=2`, { headers: authA });
    eq(res.status, 200, "limit similar returns 200");
    const limited = (await res.json()) as SimilarResponse;
    eq(limited.limit, 2, "limited similar echoes limit=2");
    eq(limited.items.length, 2, "limit=2 returns exactly 2 items");
    eq(limited.items[0]!.id, similar.items[0]!.id, "limit=2 top item matches full-list top item");
    eq(limited.items[1]!.id, similar.items[1]!.id, "limit=2 second item matches full-list second item");

    // --- 7. limit=1 returns a neighbor, never the source ---
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=1`, { headers: authA });
    eq(res.status, 200, "limit=1 similar returns 200");
    const single = (await res.json()) as SimilarResponse;
    eq(single.items.length, 1, "limit=1 returns 1 item");
    ok(single.items[0]!.id !== react1, "limit=1 result is not the source resource");

    // --- 8. source resource with NULL embedding returns empty 200 ---
    res = await fetch(`${base}/api/resources/${nullEmb}/similar`, { headers: authA });
    eq(res.status, 200, "similar on NULL-embedding resource returns 200");
    const emptySource = (await res.json()) as SimilarResponse;
    eq(emptySource.items.length, 0, "NULL-embedding source returns empty items");
    eq(emptySource.count, 0, "NULL-embedding source count is 0");

    // --- 9. another user's resource id is indistinguishable from not-found ---
    res = await fetch(`${base}/api/resources/${bReact}/similar`, { headers: authA });
    eq(res.status, 404, "similar on another user's resource returns 404");
    eq(((await res.json()) as { error?: string }).error, "Resource not found", "foreign resource error body matches");

    // --- 10. nonexistent resource ---
    res = await fetch(`${base}/api/resources/doesnotexist123/similar`, { headers: authA });
    eq(res.status, 404, "similar on nonexistent resource returns 404");
    eq(((await res.json()) as { error?: string }).error, "Resource not found", "nonexistent resource error body matches");

    // --- 11. :id route still resolves (no shadowing) ---
    res = await fetch(`${base}/api/resources/${react1}`, { headers: authA });
    eq(res.status, 200, "GET /:id still returns the resource (no /:id/similar shadowing)");

    // --- 12. invalid limit rejected ---
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=51`, { headers: authA });
    eq(res.status, 400, "limit above 50 returns 400");
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=0`, { headers: authA });
    eq(res.status, 400, "limit of 0 returns 400");
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=-1`, { headers: authA });
    eq(res.status, 400, "negative limit returns 400");
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=abc`, { headers: authA });
    eq(res.status, 400, "non-numeric limit returns 400");
    res = await fetch(`${base}/api/resources/${react1}/similar?limit=51`, { headers: authA });
    eq(((await res.json()) as { error?: string }).error, "Validation failed", "invalid limit error body is a validation error");

    // --- cleanup: null embeddings scoped to test users only ---
    await prisma.$executeRaw`UPDATE "Resource" SET embedding = NULL WHERE "ownerId" IN (${userA.id}, ${userB.id})`;

    console.log("\nALL SIMILAR RESOURCES TESTS PASSED");
  } catch (err) {
    failed = 1;
    console.error("\nSIMILAR RESOURCES TEST FAILED:", err);
  } finally {
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