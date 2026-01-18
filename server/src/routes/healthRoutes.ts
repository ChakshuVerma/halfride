import { Router } from "express";
import { authenticateFirebase } from "../middleware/authenticateFirebase";
import { authedHealth, publicHealth } from "../controllers/healthController";

export const healthRouter = Router();

healthRouter.get("/public", publicHealth);
healthRouter.get("/", authenticateFirebase, authedHealth);

