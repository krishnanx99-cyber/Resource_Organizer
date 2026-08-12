import { z } from "zod/v4";
import { ResourceType } from "../../../generated/prisma/client.ts";
import type { CreateResourceInput, UpdateResourceInput } from "./types.ts";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(3, "Query is too short").max(200, "Query is too long"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

const baseFields = {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  platform: z.string().optional(),
  sourceType: z.string().optional(),
  creator: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  whySaved: z.string().optional(),
};

export const createResourceSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseFields,
    type: z.literal(ResourceType.URL),
    url: z.string().url("Invalid URL"),
  }).strict(),
  z.object({
    ...baseFields,
    type: z.literal(ResourceType.TEXT),
    content: z.string().min(1, "Content is required"),
  }).strict(),
]) satisfies z.Schema<CreateResourceInput>;

export const updateResourceSchema = z.object({
  type: z.nativeEnum(ResourceType).optional(),
  url: z.string().url("Invalid URL").optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  platform: z.string().optional(),
  sourceType: z.string().optional(),
  creator: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  whySaved: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === ResourceType.URL) {
    if (data.content !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "content is not allowed for URL resources",
        path: ["content"],
      });
    }
    if (!data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "url is required for URL resources",
        path: ["url"],
      });
    }
  }
  if (data.type === ResourceType.TEXT) {
    if (data.url !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "url is not allowed for TEXT resources",
        path: ["url"],
      });
    }
    if (!data.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "content is required for TEXT resources",
        path: ["content"],
      });
    }
  }
}) satisfies z.Schema<UpdateResourceInput>;
