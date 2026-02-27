import { Router } from "express";
import { optionalAuth } from "../../middleware/auth";
import { publicData } from "./public.controller";

export const publicRouter = Router();

publicRouter.get("/public/data", optionalAuth, publicData);

