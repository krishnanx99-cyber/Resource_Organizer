import { Router } from "express";
import { resourceController } from "./controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const resourceRoutes = Router();

resourceRoutes.use(authenticate);

resourceRoutes.post("/", resourceController.create);
resourceRoutes.get("/", resourceController.findAll);
resourceRoutes.get("/search", resourceController.search);
resourceRoutes.get("/:id", resourceController.findById);
resourceRoutes.get("/:id/similar", resourceController.findSimilar);
resourceRoutes.patch("/:id", resourceController.update);
resourceRoutes.delete("/:id", resourceController.delete);

export { resourceRoutes };
