import { Router } from "express";
import { requireSession } from "../middleware/sessionAuth";
import {
  getTravellersByAirport,
  getGroupsByAirport,
  checkTravellerHasListing,
  requestConnection,
  respondToConnectionRequest,
} from "../controllers/travellerController";

export const travellerRouter = Router();

travellerRouter.get(
  "/travellers-by-airport/:airportCode",
  requireSession,
  getTravellersByAirport,
);
travellerRouter.get(
  "/groups-by-airport/:airportCode",
  requireSession,
  getGroupsByAirport,
);
travellerRouter.get("/check-listing", requireSession, checkTravellerHasListing);
travellerRouter.post("/request-connection", requireSession, requestConnection);
travellerRouter.post(
  "/respond-to-connection",
  requireSession,
  respondToConnectionRequest,
);
