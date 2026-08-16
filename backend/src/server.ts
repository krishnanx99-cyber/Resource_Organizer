import { app } from "./app.ts";
import { env, logger } from "./config/index.ts";
import { redis } from "./config/redis.ts";
import { prisma } from "./shared/prisma.ts";
import { startMetadataWorker } from "./modules/metadata/queue.ts";
import { startEmbeddingWorker } from "./modules/embedding/queue.ts";
import { startYouTubeWorker } from "./modules/youtube/queue.ts";
import { startWebWorker } from "./modules/web/queue.ts";

try {
  await prisma.$queryRaw`SELECT 1`;
  logger.info("Database connected");
} catch (err) {
  logger.error({ err }, "Database connection failed");
  process.exit(1);
}

try {
  await redis.ping();
  logger.info("Redis connected");
} catch (err) {
  logger.error({ err }, "Redis connection failed");
  process.exit(1);
}

startMetadataWorker();
logger.info("Metadata worker started");

startEmbeddingWorker();
logger.info("Embedding worker started");

startYouTubeWorker();
logger.info("YouTube worker started");

startWebWorker();
logger.info("Web worker started");

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
