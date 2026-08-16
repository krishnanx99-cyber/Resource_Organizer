import { clusterRepository } from "./repository.ts";
import { resourceRepository } from "../resource/repository.ts";
import { AppError, NotFoundError } from "../../shared/errors.ts";
import type { CreateClusterInput, SafeCluster, UpdateClusterInput } from "./types.ts";
import type { SafeResource } from "../resource/types.ts";

async function findOwnedCluster(ownerId: string, clusterId: string) {
  const cluster = await clusterRepository.findById(clusterId);
  if (!cluster || cluster.ownerId !== ownerId) {
    throw new NotFoundError("Cluster");
  }
  return cluster;
}

async function findOwnedResource(ownerId: string, resourceId: string) {
  const resource = await resourceRepository.findById(resourceId);
  if (!resource || resource.ownerId !== ownerId) {
    throw new NotFoundError("Resource");
  }
  return resource;
}

export const clusterService = {
  async create(ownerId: string, input: CreateClusterInput): Promise<SafeCluster> {
    return clusterRepository.create({ ownerId, ...input });
  },

  async findAllByOwner(ownerId: string): Promise<SafeCluster[]> {
    return clusterRepository.findAllByOwner(ownerId);
  },

  async findById(ownerId: string, clusterId: string): Promise<SafeCluster> {
    return findOwnedCluster(ownerId, clusterId);
  },

  async update(ownerId: string, clusterId: string, input: UpdateClusterInput): Promise<SafeCluster> {
    await findOwnedCluster(ownerId, clusterId);
    return clusterRepository.update(clusterId, input);
  },

  async delete(ownerId: string, clusterId: string): Promise<void> {
    await findOwnedCluster(ownerId, clusterId);
    await clusterRepository.delete(clusterId);
  },

  async addResource(ownerId: string, clusterId: string, resourceId: string): Promise<void> {
    await findOwnedCluster(ownerId, clusterId);
    await findOwnedResource(ownerId, resourceId);

    try {
      await clusterRepository.addResource(clusterId, resourceId);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new AppError(409, "Resource already exists in this cluster");
      }
      throw err;
    }
  },

  async removeResource(ownerId: string, clusterId: string, resourceId: string): Promise<void> {
    await findOwnedCluster(ownerId, clusterId);
    await findOwnedResource(ownerId, resourceId);

    const association = await clusterRepository.findResourceAssociation(clusterId, resourceId);
    if (!association) {
      throw new NotFoundError("ResourceCluster");
    }

    await clusterRepository.removeResource(clusterId, resourceId);
  },

  async findResources(ownerId: string, clusterId: string): Promise<SafeResource[]> {
    await findOwnedCluster(ownerId, clusterId);
    const associations = await clusterRepository.findResources(clusterId);
    return associations.map((a) => a.resource);
  },
};

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}