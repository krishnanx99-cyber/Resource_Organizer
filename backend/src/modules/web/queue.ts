import { Queue, Worker } from "bullmq";
import { redis } from "../../config/redis.ts";
import { logger } from "../../config/logger.ts";
import { webService } from "./service.ts";

export const webQueue = new Queue("web", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export function startWebWorker() {
  const worker = new Worker(
    "web",
    async (job) => {
      const { resourceId } = job.data as { resourceId: string };
      const outcome = await webService.process(resourceId);
      if (outcome === "unsupported") {
        logger.info({ jobId: job.id, resourceId }, "Web enrichment unsupported");
      }
    },
    { connection: redis },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, resourceId: job.data.resourceId }, "Web job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, resourceId: job?.data.resourceId, err }, "Web job failed");
  });

  return worker;
}