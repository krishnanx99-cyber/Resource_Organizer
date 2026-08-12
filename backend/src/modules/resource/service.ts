import { ResourceType } from "../../../generated/prisma/client.ts";
import { resourceRepository } from "./repository.ts";
import { AppError } from "../../shared/errors.ts";
import { metadataQueue } from "../metadata/queue.ts";
import { embeddingQueue } from "../embedding/queue.ts";
import { embeddingService, semanticFieldsChanged } from "../embedding/embedding.service.ts";
import type {
  SafeResource,
  SearchResult,
  SimilarResourcesResult,
  CreateResourceInput,
  UpdateResourceInput,
} from "./types.ts";

export const resourceService = {
  async create(ownerId: string, input: CreateResourceInput): Promise<SafeResource> {
    const resource = await resourceRepository.create({ ownerId, ...input });

    await embeddingQueue.add("embed", { resourceId: resource.id });

    if (resource.type === ResourceType.URL) {
      await metadataQueue.add("extract", {
        resourceId: resource.id,
        url: input.url!,
      });
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
