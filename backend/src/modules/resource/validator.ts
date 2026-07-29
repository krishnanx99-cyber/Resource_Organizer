import { z } from "zod/v4";
import type { CreateResourceInput, UpdateResourceInput } from "./types.ts";

export const createResourceSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  platform: z.string().optional(),
  sourceType: z.string().optional(),
  creator: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  whySaved: z.string().optional(),
}) satisfies z.Schema<CreateResourceInput>;

export const updateResourceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  platform: z.string().optional(),
  sourceType: z.string().optional(),
  creator: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  whySaved: z.string().optional(),
}) satisfies z.Schema<UpdateResourceInput>;
