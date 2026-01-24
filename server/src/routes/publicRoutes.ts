import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { publicData } from '../controllers/publicController';

export const publicRouter = Router();

publicRouter.get('/public/data', optionalAuth, publicData);

