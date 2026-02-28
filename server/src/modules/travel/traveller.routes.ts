import { Router } from "express";
import { requireSession } from "../../middleware/sessionAuth";
import {
  getTravellersByAirport,
  getTravellerByAirportAndUser,
  getGroupsByAirport,
  getGroupById,
  getGroupMembers,
  checkTravellerHasListing,
  requestConnection,
  respondToConnectionRequest,
  leaveGroup,
  verifyAtTerminal,
  revokeListing,
  requestJoinGroup,
  getGroupJoinRequests,
  respondToJoinRequest,
  updateGroupName,
} from "./traveller.controller";

export const travellerRouter = Router();

travellerRouter.get(
  "/travellers-by-airport/:airportCode",
  requireSession,
  getTravellersByAirport,
);
travellerRouter.get(
  "/traveller-by-airport/:airportCode/:userId",
  requireSession,
  getTravellerByAirportAndUser,
);
travellerRouter.get(
  "/groups-by-airport/:airportCode",
  requireSession,
  getGroupsByAirport,
);
travellerRouter.get("/group/:groupId", requireSession, getGroupById);
travellerRouter.get(
  "/group-members/:groupId",
  requireSession,
  getGroupMembers,
);
travellerRouter.get(
  "/check-listing",
  requireSession,
  checkTravellerHasListing,
);
travellerRouter.post(
  "/request-connection",
  requireSession,
  requestConnection,
);
travellerRouter.post(
  "/respond-to-connection",
  requireSession,
  respondToConnectionRequest,
);
travellerRouter.post("/leave-group", requireSession, leaveGroup);
travellerRouter.post("/verify-at-terminal", requireSession, verifyAtTerminal);
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
travellerRouter.post(
  "/update-group-name",
  requireSession,
  updateGroupName,
);

