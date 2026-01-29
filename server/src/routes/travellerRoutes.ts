import { Router } from 'express';
import { requireSession } from '../middleware/sessionAuth';
import { getTravellersByAirport } from '../controllers/travellerController';

export const travellerRouter = Router();

travellerRouter.get('/travellers-by-airport/:airportCode', requireSession, getTravellersByAirport);
