import { Router } from 'express';
import { requireSession } from '../middleware/sessionAuth';
import { createFlightTracker, getFlightTracker } from '../controllers/flightController';

export const flightRouter = Router();

flightRouter.put('/flight-tracker', requireSession, getFlightTracker);
flightRouter.post('/new-flight-tracker', requireSession, createFlightTracker);