import { randomUUID } from "node:crypto";
import { prisma } from "../../shared/prisma.ts";
import { type Prisma } from "../../../generated/prisma/client.ts";
import { EMBEDDING_DIMENSIONS } from "../embedding/embedding.service.ts";
import type { ResourceChunkInput } from "../youtube/types.ts";

function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export interface ChunkSearchRow {
  id: string;
  resourceId: string;
  index: number;
  text: string;
  startTime: number | null;
  endTime: number | null;
  createdAt: Date;
  title: string;
  url: string | null;
  type: string;
  platform: string | null;
  similarity: number;
}

export const chunkRepository = {
  async replaceAll(
    resourceId: string,
    chunks: ResourceChunkInput[],
    client: Prisma.TransactionClient = prisma,
  ): Promise<void> {
    await client.$executeRaw`
      DELETE FROM "ResourceChunk"
      WHERE "resourceId" = ${resourceId}
    `;
    for (const chunk of chunks) {
      if (chunk.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Cannot store chunk embedding: expected ${EMBEDDING_DIMENSIONS} dimensions, received ${chunk.embedding.length}`,
        );
      }
      await client.$executeRaw`
        INSERT INTO "ResourceChunk"
          ("id", "resourceId", "index", "text", "startTime", "endTime", "embedding", "metadata")
        VALUES
          (${randomUUID()}, ${resourceId}, ${chunk.index}, ${chunk.text}, ${chunk.startTime}, ${chunk.endTime},
           ${vectorLiteral(chunk.embedding)}::vector, ${JSON.stringify(chunk.metadata)}::jsonb)
      `;
    }
  },

  async searchByEmbedding(
    ownerId: string,
    query: number[],
    limit: number,
    offset: number,
  ): Promise<ChunkSearchRow[]> {
    return prisma.$queryRaw<ChunkSearchRow[]>`
      SELECT
        c.id,
        c."resourceId",
        c.index,
        c.text,
        c."startTime",
        c."endTime",
        c."createdAt",
        r.title,
        r.url,
        r.type,
        r.platform,
        1 - (c.embedding <=> ${`[${query.join(",")}]`}::vector)::real AS similarity
      FROM "ResourceChunk" c
      INNER JOIN "Resource" r ON r.id = c."resourceId"
      WHERE r."ownerId" = ${ownerId}
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${`[${query.join(",")}]`}::vector
      LIMIT ${limit} OFFSET ${offset}
    `;
  },

  countByResource(resourceId: string) {
    return prisma.resourceChunk.count({ where: { resourceId } });
  },

  deleteAll(resourceId: string) {
    return prisma.resourceChunk.deleteMany({ where: { resourceId } });
  },
};