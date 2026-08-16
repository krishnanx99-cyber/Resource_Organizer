import { Router } from "express";
import { prisma } from "../shared/prisma.ts";
import { authRoutes } from "../modules/auth/routes.ts";
import { resourceRoutes } from "../modules/resource/routes.ts";
import { clusterRoutes } from "../modules/cluster/routes.ts";

const routes = Router();

routes.get("/", (_req, res) => {
  res.send("Resource Organizer API");
});

routes.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "Healthy" });
  } catch {
    res.status(503).json({ status: "Unhealthy" });
  }
});

routes.use("/api/auth", authRoutes);
routes.use("/api/resources", resourceRoutes);
routes.use("/api/clusters", clusterRoutes);

export { routes };
