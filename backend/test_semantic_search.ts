import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { app } from "./src/app.ts";
import { startEmbeddingWorker, embeddingQueue } from "./src/modules/embedding/queue.ts";
import { resourceRepository } from "./src/modules/resource/repository.ts";
import { prisma } from "./src/shared/prisma.ts";
import { redis } from "./src/config/redis.ts";

const PASSWORD = "SearchTest123!";

interface SearchItem {
  id: string;
  ownerId: string;
  title: string;
  type: string;
  similarity: number;
  [key: string]: unknown;
}

interface SearchResponse {
  items: SearchItem[];
  count: number;
  limit: number;
  offset: number;
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

function assertNoEmbeddingExposed(items: SearchItem[], label: string) {
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
    const emailA = `search-a-${Date.now()}@test.com`;
    let res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Search User A", email: emailA, password: PASSWORD }),
    });
    eq(res.status, 201, "user A register returns 201");
    const { token: tokenA } = (await res.json()) as { token: string };
    ok(tokenA, "user A register returns token");
    const authA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };

    const emailB = `search-b-${Date.now()}@test.com`;
    res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Search User B", email: emailB, password: PASSWORD }),
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
      whySaved: "interview prep for react state management",
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

    await waitForEmbedding(react1, "react1 embedding populated");
    await waitForEmbedding(react2, "react2 embedding populated");
    await waitForEmbedding(backend, "backend embedding populated");
    await waitForEmbedding(recipes, "recipes embedding populated");

    // --- user B creates a resource very close to the search topic ---
    const bReact = await createText(authB, {
      title: "Advanced React State Management",
      content: "useReducer, zustand stores, recoil selectors and performance optimizations for complex state in React.",
    });
    await waitForEmbedding(bReact, "user B react embedding populated");

    // --- A creates a React-topic resource whose embedding is then dropped (simulates NULL embedding) ---
    const nullEmb = await createText(authA, {
      title: "React memoization deep dive",
      content: "memoizing components with React.memo, useMemo and useCallback to avoid re-renders.",
    });
    await waitForEmbedding(nullEmb, "null-embedding candidate populated first");
    await prisma.$executeRaw`UPDATE "Resource" SET embedding = NULL WHERE id = ${nullEmb}`;
    await waitForQueueDrain();

    // --- 1. relevant search ---
    const RELEVANT_Q = "react hooks and state management for frontend apps";
    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}`);
    eq(res.status, 401, "search without token returns 401");

    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}`, { headers: authA });
    eq(res.status, 200, "relevant search returns 200");
    const relevant = (await res.json()) as SearchResponse;
    ok(Array.isArray(relevant.items) && relevant.items.length > 0, "relevant search returns items");
    eq(relevant.count, relevant.items.length, "relevant search count equals items length");
    eq(relevant.limit, 10, "relevant search limit defaults to 10");
    eq(relevant.offset, 0, "relevant search offset defaults to 0");

    assertNoEmbeddingExposed(relevant.items, "relevant results do not expose embedding");

    const relevantSorted = relevant.items.every(
      (item, i) => i === 0 || relevant.items[i - 1]!.similarity >= item.similarity,
    );
    ok(relevantSorted, "relevant results are ordered by similarity (descending)");

    const relevantTop = relevant.items[0]!.similarity;
    ok(relevantTop > 0.55, "relevant top similarity is substantial", `got ${relevantTop}`);

    const relevantIds = new Set(relevant.items.map((i) => i.id));
    ok(relevantIds.has(react1), "react1 ranks in relevant results");
    ok(relevantIds.has(react2), "react2 ranks in relevant results");
    ok(!relevantIds.has(nullEmb), "NULL-embedding resource is ignored");

    const rankReact1 = relevant.items.findIndex((i) => i.id === react1);
    const rankReact2 = relevant.items.findIndex((i) => i.id === react2);
    const rankBackend = relevant.items.findIndex((i) => i.id === backend);
    const rankRecipes = relevant.items.findIndex((i) => i.id === recipes);
    ok(rankReact1 >= 0 && rankReact2 >= 0, "react resources have a rank");
    ok(rankReact1 < rankBackend && rankReact2 < rankRecipes, "react resources rank above unrelated topics");
    ok(
      relevant.items.every((i) => i.ownerId === userA.id),
      "relevant results are scoped to user A at the database level (ownerId matches)",
    );
    ok(!relevantIds.has(bReact), "user B resource absent from user A results (SQL owner scoping)");

    // --- 2. unrelated search: pure ranking, no hard threshold ---
    const UNRELATED_Q = "medieval falconry manuals and ancient hunting techniques";
    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(UNRELATED_Q)}`, { headers: authA });
    eq(res.status, 200, "unrelated search returns 200 (no similarity threshold)");
    const unrelated = (await res.json()) as SearchResponse;
    ok(Array.isArray(unrelated.items), "unrelated search returns a valid items array");
    assertNoEmbeddingExposed(unrelated.items, "unrelated results do not expose embedding");
    ok(
      unrelated.items.every((i) => i.ownerId === userA.id),
      "unrelated results stay scoped to user A at the database level",
    );

    const unrelatedTop = unrelated.items[0]?.similarity ?? -1;
    ok(
      relevantTop > unrelatedTop + 0.3,
      "relevant query produces substantially higher similarity than unrelated query",
      `relevantTop=${relevantTop} unrelatedTop=${unrelatedTop}`,
    );

    // --- 3. user B's similar resource must never leak ---
    ok(
      !new Set(unrelated.items.map((i) => i.id)).has(bReact) && !relevantIds.has(bReact),
      "user B resource absent from user A results (both queries)",
    );

    // --- 4. limit works ---
    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}&limit=2`, { headers: authA });
    eq(res.status, 200, "limit search returns 200");
    const limited = (await res.json()) as SearchResponse;
    eq(limited.items.length, 2, "limit=2 returns exactly 2 items");
    eq(limited.limit, 2, "limited search echoes limit=2");
    eq(limited.items[0]!.id, relevant.items[0]!.id, "limit=2 top item matches full-list top item");
    eq(limited.items[1]!.id, relevant.items[1]!.id, "limit=2 second item matches full-list second item");

    // --- 5. offset works ---
    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}&limit=10&offset=2`, { headers: authA });
    eq(res.status, 200, "offset search returns 200");
    const offset = (await res.json()) as SearchResponse;
    eq(offset.offset, 2, "offset search echoes offset=2");
    ok(
      offset.items.length === relevant.items.length - 2,
      "offset=2 returns the remaining items",
      `got ${offset.items.length} expected ${relevant.items.length - 2}`,
    );
    eq(offset.items[0]!.id, relevant.items[2]!.id, "offset page starts where full list left off");

    // --- 6. validation ---
    res = await fetch(`${base}/api/resources/search`, { headers: authA });
    eq(res.status, 400, "missing q returns 400");
    eq(((await res.json()) as { error?: string }).error, "Validation failed", "missing q body is a validation error");

    res = await fetch(`${base}/api/resources/search?q=ab`, { headers: authA });
    eq(res.status, 400, "query shorter than 3 chars returns 400");

    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent("a".repeat(201))}`, { headers: authA });
    eq(res.status, 400, "query longer than 200 chars returns 400");

    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}&limit=51`, { headers: authA });
    eq(res.status, 400, "limit above 50 returns 400");

    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}&limit=-1`, { headers: authA });
    eq(res.status, 400, "negative limit returns 400");

    // --- 7. empty behavior: zero embedded resources for the users ---
    await prisma.$executeRaw`UPDATE "Resource" SET embedding = NULL WHERE "ownerId" IN (${userA.id}, ${userB.id})`;
    await waitForQueueDrain();
    res = await fetch(`${base}/api/resources/search?q=${encodeURIComponent(RELEVANT_Q)}`, { headers: authA });
    eq(res.status, 200, "search with zero embedded resources returns 200");
    const empty = (await res.json()) as SearchResponse;
    eq(empty.items.length, 0, "search with zero embedded resources returns empty items");
    eq(empty.count, 0, "empty search count is 0");

    console.log("\nALL SEMANTIC SEARCH TESTS PASSED");
  } catch (err) {
    failed = 1;
    console.error("\nSEMANTIC SEARCH TEST FAILED:", err);
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