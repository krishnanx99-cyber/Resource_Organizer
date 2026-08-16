import { prisma } from "./src/shared/prisma.ts";
import { authRepository } from "./src/modules/auth/repository.ts";
import { resourceRepository } from "./src/modules/resource/repository.ts";
import { resourceService } from "./src/modules/resource/service.ts";
import { ResourceType } from "./generated/prisma/client.ts";

async function main() {
  try {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'Resource' ORDER BY ordinal_position
    `;
    console.log("Resource columns:", cols.map((c) => c.column_name).join(", "));
  } catch (e) {
    console.log("info_schema query FAILED:", e);
  }
  const user = await authRepository.create({
    name: "diag",
    email: `diag${Date.now()}@example.com`,
    passwordHash: "x",
  });
  console.log("user created:", user.id);
  try {
    const list = await resourceRepository.findAllByOwner(user.id);
    console.log("findAllByOwner OK, count:", list.length);
  } catch (e) {
    console.log("findAllByOwner FAILED:", e);
  }
  try {
    const created = await resourceService.create(user.id, {
      type: ResourceType.TEXT,
      title: "diag title",
    });
    console.log("service.create OK:", created.id);
  } catch (e) {
    console.log("service.create FAILED:", e);
  }
  process.exit(0);
}

void main();