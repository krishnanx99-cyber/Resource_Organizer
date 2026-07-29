import { Queue, Worker } from "bullmq";
import { redis } from "../../config/redis.ts";
import { logger } from "../../config/logger.ts";
import { metadataService } from "./service.ts";

export const metadataQueue = new Queue("metadata", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export function startMetadataWorker() {
  const worker = new Worker(
    "metadata",
    async (job) => {
      const { resourceId, url } = job.data as { resourceId: string; url: string };
      await metadataService.extractAndUpdate(resourceId, url);
    },
    { connection: redis },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, resourceId: job.data.resourceId }, "Metadata job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, resourceId: job?.data.resourceId, err },
      "Metadata job failed",
    );
  });

  return worker;
}
