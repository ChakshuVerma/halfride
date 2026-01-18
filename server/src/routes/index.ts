import { Router } from "express";
import { healthRouter } from "./healthRoutes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);

