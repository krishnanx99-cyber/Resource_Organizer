import { ResourceType } from "../../../generated/prisma/client.ts";
import { resourceRepository } from "./repository.ts";
import { chunkRepository } from "./chunk.repository.ts";
import { AppError } from "../../shared/errors.ts";
import { webQueue } from "../web/queue.ts";
import { embeddingQueue } from "../embedding/queue.ts";
import { youtubeQueue } from "../youtube/queue.ts";
import { embeddingService, semanticFieldsChanged } from "../embedding/embedding.service.ts";
import { deepLinkFromResourceUrl } from "../youtube/url.ts";
import type {
  SafeResource,
  SearchResult,
  SimilarResourcesResult,
  CreateResourceInput,
  UpdateResourceInput,
} from "./types.ts";
import type { ChunkSearchResult, ChunkSearchItem } from "../chunks/types.ts";

export const resourceService = {
  async create(ownerId: string, input: CreateResourceInput): Promise<SafeResource> {
    const resource = await resourceRepository.create({ ownerId, ...input });

    await embeddingQueue.add("embed", { resourceId: resource.id });

    if (resource.type === ResourceType.URL && input.url) {
      await webQueue.add("enrich", { resourceId: resource.id });
    }

    if (resource.type === ResourceType.YOUTUBE && input.url) {
      await youtubeQueue.add("process", { resourceId: resource.id });
    }

    return resource;
  },

  async findAllByOwner(ownerId: string): Promise<SafeResource[]> {
    return resourceRepository.findAllByOwner(ownerId);
  },

  async findById(resourceId: string, ownerId: string): Promise<SafeResource> {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource || resource.ownerId !== ownerId) {
      throw new AppError(404, "Resource not found");
    }
    return resource;
  },

  async update(resourceId: string, ownerId: string, input: UpdateResourceInput): Promise<SafeResource> {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource || resource.ownerId !== ownerId) {
      throw new AppError(404, "Resource not found");
    }

    const semanticChanged = semanticFieldsChanged(
      resource as unknown as Record<string, unknown>,
      input as unknown as Record<string, unknown>,
    );

    const updated = await resourceRepository.update(resourceId, input);

    if (semanticChanged) {
      await embeddingQueue.add("embed", { resourceId });
    }

    if (
      updated.type === ResourceType.YOUTUBE &&
      updated.url &&
      (updated.url !== resource.url || resource.type !== ResourceType.YOUTUBE)
    ) {
      await youtubeQueue.add("process", { resourceId });
    }

    if (
      updated.type === ResourceType.URL &&
      updated.url &&
      (updated.url !== resource.url || resource.type !== ResourceType.URL)
    ) {
      await webQueue.add("enrich", { resourceId });
    }

    return updated;
  },

  async delete(resourceId: string, ownerId: string): Promise<void> {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource || resource.ownerId !== ownerId) {
      throw new AppError(404, "Resource not found");
    }
    await resourceRepository.delete(resourceId);
  },

  async search(ownerId: string, query: string, limit: number, offset: number): Promise<SearchResult> {
    let queryEmbedding: number[];
    try {
      queryEmbedding = await embeddingService.generateEmbedding(query);
    } catch {
      throw new AppError(502, "Search temporarily unavailable");
    }

    const items = await resourceRepository.searchByEmbedding(ownerId, queryEmbedding, limit, offset);
    return { items, count: items.length, limit, offset };
  },

  async searchChunks(ownerId: string, query: string, limit: number, offset: number): Promise<ChunkSearchResult> {
    let queryEmbedding: number[];
    try {
      queryEmbedding = await embeddingService.generateEmbedding(query);
    } catch {
      throw new AppError(502, "Search temporarily unavailable");
    }

    const rows = await chunkRepository.searchByEmbedding(ownerId, queryEmbedding, limit, offset);
    const items: ChunkSearchItem[] = rows.map((row) => ({
      id: row.id,
      resourceId: row.resourceId,
      index: row.index,
      text: row.text,
      startTime: row.startTime,
      endTime: row.endTime,
      metadata: row.metadata,
      createdAt: row.createdAt,
      similarity: row.similarity,
      deepLink: deepLinkFromResourceUrl(row.url, row.startTime),
      resource: {
        id: row.resourceId,
        title: row.title,
        type: row.type,
        platform: row.platform,
        url: row.url,
      },
    }));
    return { items, count: items.length, limit, offset };
  },

  async findSimilar(
    resourceId: string,
    ownerId: string,
    limit: number,
  ): Promise<SimilarResourcesResult> {
    const source = await resourceRepository.findSourceEmbedding(resourceId);
    if (!source) {
      throw new AppError(404, "Resource not found");
    }
    if (source.ownerId !== ownerId) {
      throw new AppError(404, "Resource not found");
    }
    if (source.embedding == null) {
      return { items: [], count: 0, limit };
    }

    const items = await resourceRepository.searchByEmbedding(ownerId, source.embedding, limit, 0, resourceId);
    return { items, count: items.length, limit };
  },
};
