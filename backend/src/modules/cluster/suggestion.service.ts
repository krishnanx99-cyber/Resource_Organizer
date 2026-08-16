import { z } from "zod/v4";
import OpenAI from "openai";
import { env } from "../../config/env.ts";
import { prisma } from "../../shared/prisma.ts";
import { resourceRepository } from "../resource/repository.ts";
import { EMBEDDING_DIMENSIONS } from "../embedding/embedding.service.ts";
import { AppError } from "../../shared/errors.ts";
import type { ClusterSuggestion } from "./types.ts";
import type { SearchResultItem } from "../resource/types.ts";

const SUGGESTION_MODEL = "gpt-4o-mini";
const SIMILARITY_THRESHOLD = 0.45;
const MAX_SAMPLE = 40;
const ANCHOR_LIMIT = 8;
const NEIGHBOR_LIMIT = 8;
const MAX_GROUPS = 5;
const CONTENT_EXCERPT_CHARS = 300;

type LLMBridge = (prompt: string) => Promise<string>;

interface EmbeddedResource {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  notes: string | null;
  whySaved: string | null;
  platform: string | null;
  sourceType: string | null;
  type: string;
  content: string | null;
  embedding: number[];
}

const SuggestionSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(800),
  resourceIds: z.array(z.string()).min(1),
});

function parseEmbedding(raw: string | null): number[] | null {
  if (raw == null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== EMBEDDING_DIMENSIONS ||
    parsed.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    return null;
  }
  return parsed as number[];
}

async function loadEmbeddedSample(ownerId: string): Promise<EmbeddedResource[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      url: string | null;
      description: string | null;
      notes: string | null;
      whySaved: string | null;
      platform: string | null;
      sourceType: string | null;
      type: string;
      content: string | null;
      embedding: string | null;
    }[]
  >`
    SELECT id, title, url, description, notes, "whySaved", platform, "sourceType", type, content,
           embedding::text AS embedding
    FROM "Resource"
    WHERE "ownerId" = ${ownerId}
      AND embedding IS NOT NULL
    ORDER BY "createdAt" DESC
    LIMIT ${MAX_SAMPLE}
  `;
  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      description: row.description,
      notes: row.notes,
      whySaved: row.whySaved,
      platform: row.platform,
      sourceType: row.sourceType,
      type: row.type,
      content: row.content,
      embedding: parseEmbedding(row.embedding),
    }))
    .filter((r): r is EmbeddedResource => r.embedding !== null);
}

function buildCompactText(resource: EmbeddedResource): string {
  const excerpt = (resource.content ?? "").slice(0, CONTENT_EXCERPT_CHARS);
  const lines = [
    `id: ${resource.id}`,
    `title: ${resource.title}`,
    `type: ${resource.type}`,
    resource.url ? `url: ${resource.url}` : null,
    resource.platform ? `platform: ${resource.platform}` : null,
    resource.whySaved ? `whySaved: ${resource.whySaved}` : null,
    resource.description ? `description: ${resource.description}` : null,
    excerpt ? `content excerpt: ${excerpt}` : null,
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

function buildGroupText(group: EmbeddedResource[]): string {
  return group
    .map((resource, index) => {
      const block = buildCompactText(resource);
      return `--- Resource ${index + 1} ---\n${block}`;
    })
    .join("\n\n");
}

function buildPrompt(group: EmbeddedResource[]): string {
  const resourceList = buildGroupText(group);
  return (
    `Below are semantically related resources saved by a user. ` +
    `Suggest one cluster name and description that captures their shared topic.\n\n` +
    `${resourceList}\n\n` +
    `Respond with JSON. "resourceIds" must ONLY contain ids from the list above. ` +
    `"name" must be concise (under 80 chars). "description" must explain the shared topic usefully.`
  );
}

async function requestStructuredSuggestion(prompt: string, llm: LLMBridge) {
  const content = await llm(prompt);
  const parsed: unknown = JSON.parse(content);
  return SuggestionSchema.parse(parsed);
}

async function defaultLLM(prompt: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(502, "Suggestion temporarily unavailable");
  }
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: SUGGESTION_MODEL,
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cluster_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            resourceIds: { type: "array", items: { type: "string" } },
          },
          required: ["name", "description", "resourceIds"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You suggest clusters for saved online resources. Only reference the resource IDs supplied.",
      },
      { role: "user", content: prompt },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty LLM response");
  }
  return content;
}

async function buildSuggestion(
  group: EmbeddedResource[],
  llm: LLMBridge,
): Promise<ClusterSuggestion | null> {
  if (group.length < 2) return null;

  const validIds = new Set(group.map((resource) => resource.id));
  try {
    const suggestion = await requestStructuredSuggestion(buildPrompt(group), llm);
    const resourceIds = suggestion.resourceIds.filter((id) => validIds.has(id));
    if (resourceIds.length < 2) return null;
    return { name: suggestion.name, description: suggestion.description, resourceIds };
  } catch {
    return null;
  }
}

export const suggestionService = {
  async suggestForOwner(
    ownerId: string,
    options: { llm?: LLMBridge } = {},
  ): Promise<ClusterSuggestion[]> {
    const sample = await loadEmbeddedSample(ownerId);
    if (sample.length < 2) return [];

    const llm: LLMBridge = options.llm ?? defaultLLM;

    const seenGroups = new Set<string>();
    const groups: EmbeddedResource[][] = [];

    const anchors = sample.slice(0, ANCHOR_LIMIT);
    for (const anchor of anchors) {
      let neighbors: SearchResultItem[] = [];
      try {
        neighbors = await resourceRepository.searchByEmbedding(
          ownerId,
          anchor.embedding,
          NEIGHBOR_LIMIT,
          0,
          anchor.id,
        );
      } catch {
        continue;
      }

      const byId = new Map(sample.map((resource) => [resource.id, resource]));
      const members = [anchor];
      for (const neighbor of neighbors) {
        if (neighbor.similarity >= SIMILARITY_THRESHOLD) {
          const member = byId.get(neighbor.id);
          if (member) members.push(member);
        }
      }

      if (members.length < 2) continue;
      const key = members
        .map((m) => m.id)
        .sort()
        .join("|");
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      groups.push(members);
      if (groups.length >= MAX_GROUPS) break;
    }

    const suggestions: ClusterSuggestion[] = [];
    for (const group of groups) {
      const suggestion = await buildSuggestion(group, llm);
      if (suggestion) suggestions.push(suggestion);
    }
    return suggestions;
  },
};