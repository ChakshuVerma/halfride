import { Router } from 'express';
import { authRouter } from './authRoutes';
import { healthRouter } from './healthRoutes';
import { userRouter } from './userRoutes';
import { publicRouter } from './publicRoutes';

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(healthRouter);
apiRouter.use(userRouter);
apiRouter.use(publicRouter);
