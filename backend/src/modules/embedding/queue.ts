import { Queue, Worker } from "bullmq";
import { redis } from "../../config/redis.ts";
import { logger } from "../../config/logger.ts";
import { embeddingService } from "./embedding.service.ts";
import { resourceRepository } from "../resource/repository.ts";

export const embeddingQueue = new Queue("embedding", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export function startEmbeddingWorker() {
  const worker = new Worker(
    "embedding",
    async (job) => {
      const { resourceId } = job.data as { resourceId: string };

      const resource = await resourceRepository.findById(resourceId);
      if (!resource) {
        logger.warn({ jobId: job.id, resourceId }, "Embedding job skipped: resource not found");
        return;
      }

      const embedding = await embeddingService.generateForResource(resource);
      await resourceRepository.updateEmbedding(resourceId, embedding);
    },
    { connection: redis },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, resourceId: job.data.resourceId }, "Embedding job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, resourceId: job?.data.resourceId, err },
      "Embedding job failed",
    );
  });

  return worker;
}