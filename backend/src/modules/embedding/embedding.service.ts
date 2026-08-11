import OpenAI from "openai";
import { env } from "../../config/env.ts";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export const EMBEDDING_SEMANTIC_FIELDS = [
  "title",
  "description",
  "content",
  "notes",
  "whySaved",
  "url",
  "type",
] as const satisfies readonly string[];

export type EmbeddingSourceFields = Pick<
  ResourceFields,
  "title" | "url" | "description" | "content" | "notes" | "whySaved"
>;

interface ResourceFields {
  title: string;
  url?: string | null;
  description?: string | null;
  content?: string | null;
  notes?: string | null;
  whySaved?: string | null;
}

function getClient(): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY || undefined });
}

function buildEmbeddingText(resource: EmbeddingSourceFields): string {
  const parts = [
    resource.title,
    resource.url ?? "",
    resource.description ?? "",
    resource.content ?? "",
    resource.notes ?? "",
    resource.whySaved ?? "",
  ].filter((part) => part.trim().length > 0);

  return parts.join("\n\n");
}

export function semanticFieldsChanged(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): boolean {
  for (const field of EMBEDDING_SEMANTIC_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      if (existing[field] !== incoming[field]) {
        return true;
      }
    }
  }
  return false;
}

export const embeddingService = {
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Input text must not be empty or whitespace only");
    }

    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const response = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    const embedding = response.data[0]!.embedding;

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}`,
      );
    }

    return embedding;
  },

  async generateForResource(resource: EmbeddingSourceFields): Promise<number[]> {
    const text = buildEmbeddingText(resource);
    if (!text) {
      throw new Error(
        "Resource has no semantic content to embed (title, url, description, content, notes, whySaved)",
      );
    }

    return this.generateEmbedding(text);
  },
};