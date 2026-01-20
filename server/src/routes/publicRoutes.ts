import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { publicData, publicFlightStatus } from '../controllers/publicController';

export const publicRouter = Router();

publicRouter.get('/public/data', optionalAuth, publicData);
publicRouter.get('/public/flight-status', publicFlightStatus);

