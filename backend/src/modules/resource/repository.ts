import { prisma } from "../../shared/prisma.ts";

export const resourceRepository = {
  create(data: {
    ownerId: string;
    url: string;
    title: string;
    description?: string;
    notes?: string;
    platform?: string;
    sourceType?: string;
    creator?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.resource.create({ data });
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
      title?: string;
      description?: string;
      notes?: string;
      platform?: string;
      sourceType?: string;
      creator?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return prisma.resource.update({ where: { id }, data });
  },

  updateMetadata(id: string, metadata: Record<string, unknown>) {
    return prisma.resource.update({ where: { id }, data: { metadata } });
  },

  delete(id: string) {
    return prisma.resource.delete({ where: { id } });
  },
};
