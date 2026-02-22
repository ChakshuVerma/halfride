import { Router } from "express";
import { requireSession } from "../middleware/sessionAuth";
import {
  getTravellersByAirport,
  getGroupsByAirport,
  getGroupMembers,
  checkTravellerHasListing,
  requestConnection,
  respondToConnectionRequest,
  leaveGroup,
  revokeListing,
  requestJoinGroup,
  getGroupJoinRequests,
  respondToJoinRequest,
  updateGroupName,
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
travellerRouter.get(
  "/group-members/:groupId",
  requireSession,
  getGroupMembers,
);
travellerRouter.get("/check-listing", requireSession, checkTravellerHasListing);
travellerRouter.post("/request-connection", requireSession, requestConnection);
travellerRouter.post(
  "/respond-to-connection",
  requireSession,
  respondToConnectionRequest,
);
travellerRouter.post("/leave-group", requireSession, leaveGroup);
travellerRouter.post("/revoke-listing", requireSession, revokeListing);
travellerRouter.post("/request-join-group", requireSession, requestJoinGroup);
travellerRouter.get(
  "/group-join-requests/:groupId",
  requireSession,
  getGroupJoinRequests,
);
travellerRouter.post(
  "/respond-to-join-request",
  requireSession,
  respondToJoinRequest,
);
travellerRouter.post("/update-group-name", requireSession, updateGroupName);
