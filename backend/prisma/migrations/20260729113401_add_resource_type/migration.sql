-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('URL', 'TEXT');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "content" TEXT,
ADD COLUMN     "type" "ResourceType" NOT NULL DEFAULT 'URL',
ALTER COLUMN "url" DROP NOT NULL;
