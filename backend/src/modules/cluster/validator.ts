import { z } from "zod/v4";
import { ClusterStatus } from "../../../generated/prisma/client.ts";
import type { CreateClusterInput, UpdateClusterInput } from "./types.ts";

export const createClusterSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
    description: z.string().optional(),
  })
  .strict() satisfies z.Schema<CreateClusterInput>;

export const updateClusterSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(200, "Name is too long").optional(),
    description: z.string().optional(),
    status: z.nativeEnum(ClusterStatus).optional(),
  })
  .strict() satisfies z.Schema<UpdateClusterInput>;