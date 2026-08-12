import { type Resource, ResourceType } from "../../../generated/prisma/client.ts";

export type SafeResource = Pick<
  Resource,
  | "id"
  | "ownerId"
  | "url"
  | "title"
  | "description"
  | "notes"
  | "platform"
  | "sourceType"
  | "creator"
  | "content"
  | "metadata"
  | "whySaved"
  | "type"
  | "openedCount"
  | "firstOpenedAt"
  | "lastOpenedAt"
  | "createdAt"
  | "updatedAt"
>;

export interface CreateResourceInput {
  type: ResourceType;
  url?: string;
  title: string;
  content?: string;
  description?: string;
  notes?: string;
  platform?: string;
  sourceType?: string;
  creator?: string;
  metadata?: Record<string, unknown>;
  whySaved?: string;
}

export interface UpdateResourceInput {
  type?: ResourceType;
  url?: string;
  title?: string;
  content?: string;
  description?: string;
  notes?: string;
  platform?: string;
  sourceType?: string;
  creator?: string;
  metadata?: Record<string, unknown>;
  whySaved?: string;
}

export type SearchResultItem = SafeResource & { similarity: number };

export interface SearchResult {
  items: SearchResultItem[];
  count: number;
  limit: number;
  offset: number;
}

export interface SimilarResourcesResult {
  items: SearchResultItem[];
  count: number;
  limit: number;
}
