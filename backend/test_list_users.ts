import { prisma } from "./src/shared/prisma.ts";

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, name: true, createdAt: true } });
  console.log(JSON.stringify(users, null, 1));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());