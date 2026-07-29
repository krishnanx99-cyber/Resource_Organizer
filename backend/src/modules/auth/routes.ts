import { Router } from "express";
import { authController } from "./controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.get("/me", authenticate, authController.me);

export { authRoutes };
