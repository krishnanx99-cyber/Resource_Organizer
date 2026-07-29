import { resourceService } from "./src/modules/resource/service.ts";
import { prisma } from "./src/shared/prisma.ts";
async function main() {
  const user = await prisma.user.upsert({
    where: { email: "svc-match@test.com" },
    create: { email: "svc-match@test.com", passwordHash: "h", name: "Svc" },
    update: {},
  });
  const r = await resourceService.create(user.id, {
    url: "https://svc-match.com",
    title: "Svc Match",
    whySaved: "match reason",
  });
  const keys = Object.keys(r);
  console.log("has whySaved:", keys.includes("whySaved"));
  console.log("whySaved value:", r.whySaved);
}
main();