import { Queue, Worker } from "bullmq";
import { redis } from "../../config/redis.ts";
import { logger } from "../../config/logger.ts";
import { youtubeService } from "./service.ts";

export const youtubeQueue = new Queue("youtube", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export function startYouTubeWorker() {
  const worker = new Worker(
    "youtube",
    async (job) => {
      const { resourceId } = job.data as { resourceId: string };
      const outcome = await youtubeService.process(resourceId);
      if (outcome === "unsupported") {
        logger.info({ jobId: job.id, resourceId }, "YouTube transcript unsupported");
      }
    },
    { connection: redis },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, resourceId: job.data.resourceId }, "YouTube job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, resourceId: job?.data.resourceId, err }, "YouTube job failed");
  });

  return worker;
}