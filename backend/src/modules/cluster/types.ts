import {
  type Cluster,
  type ClusterSuggestion as ClusterSuggestionRecord,
  ClusterStatus,
} from "../../../generated/prisma/client.ts";

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

export type PersistedClusterSuggestion = Pick<
  ClusterSuggestionRecord,
  "id" | "name" | "description" | "resourceIds" | "status"
>;

export interface ApproveResult {
  cluster: SafeCluster;
  created: boolean;
}