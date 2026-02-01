import { Router } from 'express';
import { requireSession } from '../middleware/sessionAuth';
import { createFlightTracker, getFlightTracker, getAirports } from '../controllers/flightController';

export const flightRouter = Router();

flightRouter.get('/airports', requireSession, getAirports);
flightRouter.put('/flight-tracker', requireSession, getFlightTracker);
flightRouter.post('/new-flight-tracker', requireSession, createFlightTracker);