import axios from "axios";
import { ResourceType, TranscriptStatus, type Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../shared/prisma.ts";
import { logger } from "../../config/logger.ts";
import { resourceRepository } from "../resource/repository.ts";
import { chunkRepository } from "../resource/chunk.repository.ts";
import { embeddingService } from "../embedding/embedding.service.ts";
import { extractVideoId } from "./url.ts";
import { fetchVideoTranscript, type TranscriptFetchResult } from "./transcript.ts";
import { chunkTranscript } from "./chunker.ts";
import {
  YOUTUBE_CHUNK_METADATA,
  type ResourceChunkInput,
  type YoutubeMetadata,
} from "./types.ts";

const OEMBED_TIMEOUT_MS = 5000;

const UNSUPPORTED_STATUS = TranscriptStatus.UNSUPPORTED;
const COMPLETED_STATUS = TranscriptStatus.COMPLETED;

export type VideoProcessOutcome = "completed" | "unsupported";

export type SegmentFetcher = (videoId: string) => Promise<TranscriptFetchResult>;

export interface ProcessOptions {
  fetchSegments?: SegmentFetcher;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}

async function fetchOEmbed(videoId: string): Promise<YoutubeMetadata> {
  const base: YoutubeMetadata = { videoId, fetchedAt: new Date().toISOString() };
  try {
    const response = await axios.get<OEmbedResponse>(
      "https://www.youtube.com/oembed",
      {
        timeout: OEMBED_TIMEOUT_MS,
        params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: "json" },
      },
    );
    const data = response.data;
    return {
      ...base,
      ...(data.title ? { title: data.title } : {}),
      ...(data.author_name ? { authorName: data.author_name } : {}),
      ...(data.thumbnail_url ? { thumbnailUrl: data.thumbnail_url } : {}),
      ...(data.width !== undefined ? { width: data.width } : {}),
      ...(data.height !== undefined ? { height: data.height } : {}),
    };
  } catch (err) {
    logger.warn({ err, videoId }, "YouTube oEmbed fetch failed");
    return base;
  }
}

async function settleCompleted(resourceId: string, chunks: ResourceChunkInput[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await chunkRepository.replaceAll(resourceId, chunks, tx);
    await tx.resource.update({
      where: { id: resourceId },
      data: { processingStatus: COMPLETED_STATUS },
    });
  });
}

export const youtubeService = {
  async process(resourceId: string, options: ProcessOptions = {}): Promise<VideoProcessOutcome> {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      logger.warn({ resourceId }, "YouTube job skipped: resource not found");
      return "unsupported";
    }

    if (resource.type !== ResourceType.YOUTUBE || !resource.url) {
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }

    const videoId = extractVideoId(resource.url);
    if (!videoId) {
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }

    await resourceRepository.setProcessingStatus(resourceId, TranscriptStatus.PROCESSING);

    let segments;
    try {
      const fetched = await (options.fetchSegments ?? fetchVideoTranscript)(videoId);
      if (fetched.kind === "unsupported") {
        await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
        return "unsupported";
      }
      segments = fetched.segments;
    } catch (err) {
      logger.error({ err, resourceId, videoId }, "YouTube transcript fetch failed");
      await resourceRepository.setProcessingStatus(resourceId, TranscriptStatus.FAILED);
      throw err;
    }

    if (segments.length === 0) {
      await resourceRepository.setProcessingStatus(resourceId, UNSUPPORTED_STATUS);
      return "unsupported";
    }

    const chunks = chunkTranscript(segments);
    const inputs: ResourceChunkInput[] = [];
    for (const chunk of chunks) {
      const embedding = await embeddingService.generateEmbedding(chunk.text);
      inputs.push({
        index: chunk.index,
        text: chunk.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        embedding,
        metadata: { ...YOUTUBE_CHUNK_METADATA, videoId },
      });
    }

    const oembed = await fetchOEmbed(videoId);
    const existing = (resource.metadata ?? {}) as Prisma.JsonObject;
    await resourceRepository.updateMetadata(resourceId, { ...existing, youtube: oembed });

    await settleCompleted(resourceId, inputs);
    return "completed";
  },
};