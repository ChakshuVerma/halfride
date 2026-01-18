import { Router } from "express";
import { healthRouter } from "./healthRoutes";
import { userRouter } from "./userRoutes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/users", userRouter);

