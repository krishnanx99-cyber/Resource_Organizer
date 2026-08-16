import { prisma } from "../../shared/prisma.ts";
import { ClusterStatus, type Prisma } from "../../../generated/prisma/client.ts";

export const clusterRepository = {
  create(
    data: { ownerId: string; name: string; description?: string; status?: ClusterStatus },
    client: Prisma.TransactionClient = prisma,
  ) {
    return client.cluster.create({ data: data as Prisma.ClusterUncheckedCreateInput });
  },

  findAllByOwner(ownerId: string) {
    return prisma.cluster.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.cluster.findUnique({ where: { id } });
  },

  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: ClusterStatus;
    },
  ) {
    return prisma.cluster.update({
      where: { id },
      data: data as Prisma.ClusterUncheckedUpdateInput,
    });
  },

  delete(id: string) {
    return prisma.cluster.delete({ where: { id } });
  },

  addResource(
    clusterId: string,
    resourceId: string,
    client: Prisma.TransactionClient = prisma,
  ) {
    return client.resourceCluster.create({
      data: { clusterId, resourceId },
    });
  },

  removeResource(clusterId: string, resourceId: string) {
    return prisma.resourceCluster.delete({
      where: { resourceId_clusterId: { resourceId, clusterId } },
    });
  },

  findResourceAssociation(clusterId: string, resourceId: string) {
    return prisma.resourceCluster.findUnique({
      where: { resourceId_clusterId: { resourceId, clusterId } },
    });
  },

  findResources(clusterId: string) {
    return prisma.resourceCluster.findMany({
      where: { clusterId },
      include: { resource: true },
    });
  },
};