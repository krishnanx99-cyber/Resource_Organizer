import { Router } from "express";
import { clusterController } from "./controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const clusterRoutes = Router();

clusterRoutes.use(authenticate);

clusterRoutes.post("/", clusterController.create);
clusterRoutes.get("/", clusterController.findAll);
clusterRoutes.get("/suggestions", clusterController.suggest);
clusterRoutes.get("/:id", clusterController.findById);
clusterRoutes.patch("/:id", clusterController.update);
clusterRoutes.delete("/:id", clusterController.delete);
clusterRoutes.post("/:clusterId/resources/:resourceId", clusterController.addResource);
clusterRoutes.delete("/:clusterId/resources/:resourceId", clusterController.removeResource);
clusterRoutes.get("/:clusterId/resources", clusterController.findResources);

export { clusterRoutes };