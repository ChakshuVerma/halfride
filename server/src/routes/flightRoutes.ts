import { Router } from 'express';
import { requireSession } from '../middleware/sessionAuth';
import { getFlightTracker } from '../controllers/flightController';

export const flightRouter = Router();

// Mirrors the upstream path style:
// https://www.flightstats.com/v2/api-next/flight-tracker/:carrier/:flightNumber/:year/:month/:day
flightRouter.get('/flight-tracker/:carrier/:flightNumber/:year/:month/:day', requireSession, getFlightTracker);

