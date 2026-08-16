import { Router } from "express";
import { clusterController } from "./controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const suggestionRoutes = Router();

suggestionRoutes.use(authenticate);

suggestionRoutes.post("/:suggestionId/approve", clusterController.approveSuggestion);

export { suggestionRoutes };