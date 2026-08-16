import { prisma } from "../../shared/prisma.ts";
import {
  ClusterSuggestionStatus,
  type Prisma,
} from "../../../generated/prisma/client.ts";

export const suggestionRepository = {
  createAll(data: {
    ownerId: string;
    name: string;
    description: string;
    resourceIds: string[];
  }[]) {
    if (data.length === 0) return Promise.resolve(0);
    return prisma.clusterSuggestion.createMany({
      data: data as Prisma.ClusterSuggestionCreateManyInput[],
    });
  },

  findAllPendingByOwner(ownerId: string) {
    return prisma.clusterSuggestion.findMany({
      where: { ownerId, status: ClusterSuggestionStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.clusterSuggestion.findUnique({ where: { id } });
  },

  markApproved(
    id: string,
    clusterId: string,
    client: Prisma.TransactionClient = prisma,
  ) {
    return client.clusterSuggestion.update({
      where: { id },
      data: {
        status: ClusterSuggestionStatus.APPROVED,
        approvedClusterId: clusterId,
      },
    });
  },
};