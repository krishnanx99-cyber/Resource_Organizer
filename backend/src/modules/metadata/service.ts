import { logger } from "../../config/logger.ts";
import { extractMetadata } from "./extractor.ts";
import { resourceRepository } from "../resource/repository.ts";

export const metadataService = {
  async extractAndUpdate(resourceId: string, url: string): Promise<void> {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      logger.warn({ url }, "Skipping metadata extraction: unsupported protocol");
      return;
    }

    try {
      const metadata = await extractMetadata(url);
      await resourceRepository.updateMetadata(resourceId, metadata);
      logger.info({ resourceId, url }, "Metadata extracted successfully");
    } catch (err) {
      logger.error({ err, url, resourceId }, "Metadata extraction failed");
    }
  },
};
