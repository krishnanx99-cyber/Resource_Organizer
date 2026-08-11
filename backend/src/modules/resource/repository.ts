import { prisma } from "../../shared/prisma.ts";
import { ResourceType, type Prisma } from "../../../generated/prisma/client.ts";
import { EMBEDDING_DIMENSIONS } from "../embedding/embedding.service.ts";

export const resourceRepository = {
  create(data: {
    ownerId: string;
    type: ResourceType;
    url?: string;
    title: string;
    content?: string;
    description?: string;
    notes?: string;
    platform?: string;
    sourceType?: string;
    creator?: string;
    metadata?: Record<string, unknown>;
    whySaved?: string;
  }) {
    return prisma.resource.create({ data: data as Prisma.ResourceUncheckedCreateInput });
  },

  findAllByOwner(ownerId: string) {
    return prisma.resource.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.resource.findUnique({ where: { id } });
  },

  update(
    id: string,
    data: {
      type?: ResourceType;
      url?: string;
      title?: string;
      content?: string;
      description?: string;
      notes?: string;
      platform?: string;
      sourceType?: string;
      creator?: string;
      metadata?: Record<string, unknown>;
      whySaved?: string;
    },
  ) {
    return prisma.resource.update({
      where: { id },
      data: data as Prisma.ResourceUncheckedUpdateInput,
    });
  },

  updateMetadata(id: string, metadata: object) {
    return prisma.resource.update({
      where: { id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  },

  async updateEmbedding(id: string, vector: number[]) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Cannot store embedding: expected ${EMBEDDING_DIMENSIONS} dimensions, received ${vector.length}`,
      );
    }
    await prisma.$executeRaw`
      UPDATE "Resource"
      SET embedding = ${`[${vector.join(",")}]`}::vector
      WHERE id = ${id}
    `;
  },

  async getEmbeddingInfo(id: string): Promise<{
    embedding: string | null;
    dimension: number | null;
  } | null> {
    const rows = await prisma.$queryRaw<{ embedding: string | null; dimension: number | null }[]>`
      SELECT embedding::text AS embedding,
             (length(embedding::text) - length(replace(embedding::text, ',', ''))) + 1 AS dimension
      FROM "Resource"
      WHERE id = ${id}
    `;
    const row = rows[0];
    return row ? { embedding: row.embedding, dimension: row.dimension } : null;
  },

  delete(id: string) {
    return prisma.resource.delete({ where: { id } });
  },
};
