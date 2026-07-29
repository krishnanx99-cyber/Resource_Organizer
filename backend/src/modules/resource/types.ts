import { type Resource } from "../../../generated/prisma/client.ts";

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
  | "metadata"
  | "whySaved"
  | "openedCount"
  | "firstOpenedAt"
  | "lastOpenedAt"
  | "createdAt"
  | "updatedAt"
>;

export interface CreateResourceInput {
  url: string;
  title: string;
  description?: string;
  notes?: string;
  platform?: string;
  sourceType?: string;
  creator?: string;
  metadata?: Record<string, unknown>;
  whySaved?: string;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  notes?: string;
  platform?: string;
  sourceType?: string;
  creator?: string;
  metadata?: Record<string, unknown>;
  whySaved?: string;
}
