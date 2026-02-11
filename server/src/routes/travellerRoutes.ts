import { Router } from "express";
import { requireSession } from "../middleware/sessionAuth";
import {
  getTravellersByAirport,
  checkTravellerHasListing,
  requestConnection,
} from "../controllers/travellerController";

export const travellerRouter = Router();

travellerRouter.get(
  "/travellers-by-airport/:airportCode",
  requireSession,
  getTravellersByAirport,
);
travellerRouter.get("/check-listing", requireSession, checkTravellerHasListing);
travellerRouter.post("/request-connection", requireSession, requestConnection);
