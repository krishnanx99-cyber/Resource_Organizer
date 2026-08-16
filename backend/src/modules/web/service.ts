import { ResourceType, TranscriptStatus, type Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../shared/prisma.ts";
import { logger } from "../../config/logger.ts";
import { resourceRepository } from "../resource/repository.ts";
import { chunkRepository } from "../resource/chunk.repository.ts";
import { embeddingService } from "../embedding/embedding.service.ts";
import { fetchWebPage } from "./fetcher.ts";
import { extractWebPage } from "./extractor.ts";
import { chunkWebBlocks } from "./chunker.ts";
import { WEB_CHUNK_METADATA, type WebEnrichOutcome } from "./types.ts";
import type { ResourceChunkInput } from "../chunks/types.ts";

const UNSUPPORTED_STATUS = TranscriptStatus.UNSUPPORTED;
const COMPLETED_STATUS = TranscriptStatus.COMPLETED;

async function settleCompleted(resourceId: string, chunks: ResourceChunkInput[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await chunkRepository.replaceAll(resourceId, chunks, tx);
    await tx.resource.update({
      where: { id: resourceId },
      data: { processingStatus: COMPLETED_STATUS },
    });
  });
}

export const webService = {
  async process(resourceId: string): Promise<WebEnrichOutcome> {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      logger.warn({ resourceId }, "Web job skipped: resource not found");
      return "unsupported";
    }

    if (resource.type !== ResourceType.URL || !resource.url) {
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }

    await resourceRepository.setProcessingStatus(resourceId, TranscriptStatus.PROCESSING);

    const fetched = await fetchWebPage(resource.url);
    if (fetched.kind === "unsupported") {
      logger.info({ resourceId, url: resource.url, reason: fetched.reason }, "Web page unsupported");
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }
    if (fetched.kind === "error") {
      logger.error({ resourceId, url: resource.url, message: fetched.message }, "Web page fetch failed");
      await resourceRepository.setProcessingStatus(resourceId, TranscriptStatus.FAILED);
      throw new Error(fetched.message);
    }

    const page = extractWebPage(fetched.html, fetched.finalUrl);
    if (page.blocks.length === 0) {
      logger.info({ resourceId, url: fetched.finalUrl }, "Web page yielded no readable content");
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }

    const chunkDrafts = chunkWebBlocks(page.blocks);
    if (chunkDrafts.length === 0) {
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }

    const inputs: ResourceChunkInput[] = [];
    for (let i = 0; i < chunkDrafts.length; i++) {
      const draft = chunkDrafts[i]!;
      const embedding = await embeddingService.generateEmbedding(draft.text);
      inputs.push({
        index: i,
        text: draft.text,
        startTime: null,
        endTime: null,
        embedding,
        metadata: {
          ...WEB_CHUNK_METADATA,
          url: fetched.finalUrl,
          heading: draft.heading ?? undefined,
        },
      });
    }

    const existing = (resource.metadata ?? {}) as Prisma.JsonObject;
    await resourceRepository.updateMetadata(resourceId, {
      ...existing,
      web: {
        url: fetched.finalUrl,
        fetchedAt: new Date().toISOString(),
        title: page.metadata.title,
        description: page.metadata.description,
        siteName: page.metadata.siteName,
        image: page.metadata.image,
        favicon: page.metadata.favicon,
        language: page.metadata.language,
        author: page.metadata.author,
      },
    });

    await settleCompleted(resourceId, inputs);
    return "completed";
  },
};