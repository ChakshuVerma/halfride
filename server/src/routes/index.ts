import { Router } from 'express';
import { authRouter } from './authRoutes';
import { healthRouter } from './healthRoutes';
import { userRouter } from './userRoutes';
import { publicRouter } from './publicRoutes';
import { flightRouter } from './flightRoutes';
import { travellerRouter } from './travellerRoutes';

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(healthRouter);
apiRouter.use(userRouter);
apiRouter.use(publicRouter);
apiRouter.use(flightRouter);
apiRouter.use(travellerRouter);
