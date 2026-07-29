import { ResourceType } from "../../../generated/prisma/client.ts";
import { resourceRepository } from "./repository.ts";
import { AppError } from "../../shared/errors.ts";
import { metadataQueue } from "../metadata/queue.ts";
import type { SafeResource, CreateResourceInput, UpdateResourceInput } from "./types.ts";

export const resourceService = {
  async create(ownerId: string, input: CreateResourceInput): Promise<SafeResource> {
    const resource = await resourceRepository.create({ ownerId, ...input });

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
    return resourceRepository.update(resourceId, input);
  },

  async delete(resourceId: string, ownerId: string): Promise<void> {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource || resource.ownerId !== ownerId) {
      throw new AppError(404, "Resource not found");
    }
    await resourceRepository.delete(resourceId);
  },
};
