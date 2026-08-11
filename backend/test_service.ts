import { prisma } from "./src/shared/prisma.ts";
import { resourceService } from "./src/modules/resource/service.ts";
import { env } from "./src/config/env.ts";
import { ResourceType } from "./generated/prisma/client.ts";
async function main() {
  try {
    const user = await prisma.user.upsert({
      where: { email: "service-test@test.com" },
      create: { email: "service-test@test.com", passwordHash: "hash", name: "ServiceTest" },
      update: {},
    });
    const r = await resourceService.create(user.id, {
      type: ResourceType.URL,
      url: "https://service-test.com",
      title: "Service Test",
      whySaved: "service reason",
    });
    console.log("Keys:", Object.keys(r).join(", "));
    console.log("whySaved:", JSON.stringify(r.whySaved));
  } catch (e) {
    console.error("Error:", e);
  }
}
main();