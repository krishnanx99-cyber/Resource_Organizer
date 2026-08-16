import { type Cluster, ClusterStatus } from "../../../generated/prisma/client.ts";

export type SafeCluster = Pick<
  Cluster,
  "id" | "ownerId" | "name" | "description" | "confidence" | "status" | "createdAt" | "updatedAt"
>;

export interface CreateClusterInput {
  name: string;
  description?: string;
}

export interface UpdateClusterInput {
  name?: string;
  description?: string;
  status?: ClusterStatus;
}

export interface ClusterSuggestion {
  name: string;
  description: string;
  resourceIds: string[];
}