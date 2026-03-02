import type { Request, Response } from "express";
import { admin } from "../config/firebase";
import {
  COLLECTIONS,
  FLIGHT_FIELDS,
  GROUP_FIELDS,
  GROUP_MESSAGE_FIELDS,
  GROUP_SUBCOLLECTIONS,
  TRAVELLER_FIELDS,
  USER_FIELDS,
} from "../core/db";
import {
  ConnectionResponseAction,
  parseConnectionResponseAction,
} from "../types/connection";
import {
  geocodeAirport,
  haversineDistance,
  IATA_CODE_LENGTH,
  isValidIataCode,
  roadDistanceBetweenTwoPoints,
  roadDistanceFromOneToMany,
} from "../utils/controllerUtils";
import {
  notifyUserOfConnectionRequest,
  notifyConnectionRequestResponded,
  notifyGroupMembersMemberLeft,
  notifyGroupDisbanded,
  notifyGroupAdminOfJoinRequest,
  notifyUserJoinAccepted,
  notifyUserJoinRejected,
  notifyOtherMembersJoinDecided,
  notifyDeciderJoinRequestDecided,
  notifyGroupMembersReadyToOnboard,
  notifyGroupRenamed,
} from "./notificationController";
import {
  badRequest,
  unauthorized,
  notFound,
  forbidden,
  internalServerError,
} from "../core/errors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BATCH_SIZE = 100;
const IN_QUERY_MAX = 10;
const MAX_GROUP_USERS = 6;
const UID_MAX_LENGTH = 128;
const GROUP_NAME_MAX_LENGTH = 50;
const GROUP_NAME_ALPHABETS_ONLY = /^[A-Za-z\s]+$/;

// ---------------------------------------------------------------------------
// Shared helpers (param parsing, data shape, Firestore batch)
// ---------------------------------------------------------------------------
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/** Normalize route param to string (handles array from express). */
function parseStringParam(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && raw[0] != null) return String(raw[0]).trim();
  return "";
}

/** Get display address from traveller destination (object or string). */
function extractDestinationAddress(dest: unknown): string {
  if (dest == null) return "N/A";
  if (typeof dest === "string") return dest;
  if (typeof dest === "object" && "address" in dest && dest.address != null)
    return String(dest.address);
  return "N/A";
}

/** Connection status for current user vs another traveller. */
function computeConnectionStatus(
  uid: string | undefined,
  currentUserTravellerData: admin.firestore.DocumentData | null,
  trav: admin.firestore.DocumentData,
  otherUserId: string | undefined,
): "SEND_REQUEST" | "REQUEST_SENT" | "REQUEST_RECEIVED" {
  if (!uid || !otherUserId) return "SEND_REQUEST";
  const theirRequests = trav[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];
  if (theirRequests.some((ref: { id: string }) => ref.id === uid))
    return "REQUEST_SENT";
  if (currentUserTravellerData) {
    const myRequests =
      currentUserTravellerData[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];
    if (myRequests.some((ref: { id: string }) => ref.id === otherUserId))
      return "REQUEST_RECEIVED";
  }
  return "SEND_REQUEST";
}

/** Batch get docs by refs; returns map id -> snapshot. */
async function batchGetAll(
  db: admin.firestore.Firestore,
  refs: admin.firestore.DocumentReference[],
  batchSize: number,
): Promise<Map<string, admin.firestore.DocumentSnapshot>> {
  const map = new Map<string, admin.firestore.DocumentSnapshot>();
  for (let i = 0; i < refs.length; i += batchSize) {
    const chunk = refs.slice(i, i + batchSize);
    const snaps = await db.getAll(...chunk);
    for (const snap of snaps) map.set(snap.id, snap);
  }
  return map;
}

/** Distance in km from current user's destination placeId (optional). */
async function distanceFromUserKm(
  travellerPlaceId: string | undefined,
  userPlaceId: string | undefined,
): Promise<number> {
  if (!userPlaceId) return 0;
  const meters = await roadDistanceBetweenTwoPoints(
    travellerPlaceId ?? "",
    userPlaceId,
  );
  return meters / 1000;
}

/** Build single traveller listing payload for API (airport listing / single traveller). */
async function buildTravellerListing(
  trav: admin.firestore.DocumentData,
  user: admin.firestore.DocumentData | undefined,
  flight: admin.firestore.DocumentData | undefined,
  opts: {
    uid?: string;
    placeId?: string;
    currentUserTravellerData?: admin.firestore.DocumentData | null;
    docId: string;
    userId?: string;
  },
): Promise<Record<string, unknown>> {
  const fData = flight?.flightData;
  const dest = trav[TRAVELLER_FIELDS.DESTINATION];
  const destPlaceId =
    typeof dest === "object" && dest != null && "placeId" in dest
      ? (dest as { placeId?: string }).placeId
      : undefined;
  const connectionStatus = computeConnectionStatus(
    opts.uid,
    opts.currentUserTravellerData ?? null,
    trav,
    opts.userId,
  );
  return {
    id: opts.userId ?? opts.docId,
    name: `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim(),
    gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
    username: `${user?.username ?? "user"}`,
    photoURL: user?.[USER_FIELDS.PHOTO_URL] ?? null,
    destination: extractDestinationAddress(dest),
    flightDateTime: fData?.arrival?.estimatedActualTime
      ? new Date(fData.arrival.estimatedActualTime)
      : fData?.arrival?.scheduledTime
        ? new Date(fData.arrival.scheduledTime)
        : null,
    flightDepartureTime: fData?.departure?.scheduledTime
      ? new Date(fData.departure.scheduledTime)
      : null,
    terminal: trav[TRAVELLER_FIELDS.TERMINAL] || "N/A",
    flightNumber: `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ""} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ""}`.trim(),
    flightCarrier: flight?.[FLIGHT_FIELDS.CARRIER],
    flightNumberRaw: flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER],
    distanceFromUserKm: await distanceFromUserKm(destPlaceId, opts.placeId),
    bio: user?.bio || "No bio available.",
    tags: user?.tags || [],
    isVerified: user?.isVerified ?? false,
    connectionStatus,
    isOwnListing: opts.uid ? opts.userId === opts.uid : false,
    readyToOnboard: trav[TRAVELLER_FIELDS.READY_TO_ONBOARD] === true,
  };
}

// ---------------------------------------------------------------------------
// Handlers: Travellers by airport
// ---------------------------------------------------------------------------

/** GET /traveller-by-airport/:airportCode — list travellers at airport (not in a group). */
export async function getTravellersByAirport(req: Request, res: Response) {
  const airportCodeRaw = req.params.airportCode;
  if (!airportCodeRaw) {
    return badRequest(res, "Airport code is required");
  }

  const airportCode = String(airportCodeRaw).trim().toUpperCase();
  if (!airportCode) {
    return badRequest(res, "Airport code is required");
  }
  if (!isValidIataCode(airportCode)) {
    return badRequest(
      res,
      `Airport code must be a ${IATA_CODE_LENGTH}-character IATA code`,
    );
  }

  const db = admin.firestore();
  const uid = req.auth?.uid;
  // Current user's destination at this airport (for distance calc).
  const destination = uid
    ? await getCurrentUserDestination(uid, airportCode)
    : null;
  const placeId = destination?.placeId;
  const code = airportCode;

  try {
    let currentUserTravellerData: admin.firestore.DocumentData | null = null;
    let isUserInGroup = false;
    let userGroupId: string | null = null;

    // If logged in, check whether they have a listing and are already in a group.
    if (uid) {
      const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
      const curSnap = await db
        .collection(COLLECTIONS.TRAVELLER_DATA)
        .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
        .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
        .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
        .limit(1)
        .get();
      if (!curSnap.empty) {
        currentUserTravellerData = curSnap.docs[0].data();
        const gr = currentUserTravellerData[TRAVELLER_FIELDS.GROUP_REF];
        if (gr?.id) {
          isUserInGroup = true;
          userGroupId = gr.id;
        }
      }
    }

    // All active travellers at this airport who are not in a group.
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .get();

    const userReadyToOnboard =
      currentUserTravellerData?.[TRAVELLER_FIELDS.READY_TO_ONBOARD] === true;

    if (snapshot.empty) {
      return res.json({
        ok: true,
        data: [],
        isUserInGroup,
        userGroupId: userGroupId ?? undefined,
        userReadyToOnboard,
      });
    }

    // Collect unique user/flight refs and batch-fetch to avoid N+1 reads.
    const uniqueUserRefs = new Map<string, admin.firestore.DocumentReference>();
    const uniqueFlightRefs = new Map<string, admin.firestore.DocumentReference>();
    for (const doc of snapshot.docs) {
      const trav = doc.data();
      const uRef = trav[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference;
      const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF] as admin.firestore.DocumentReference;
      if (uRef?.id) uniqueUserRefs.set(uRef.id, uRef);
      if (fRef?.id) uniqueFlightRefs.set(fRef.id, fRef);
    }
    const [userSnapMap, flightSnapMap] = await Promise.all([
      batchGetAll(db, Array.from(uniqueUserRefs.values()), BATCH_SIZE),
      batchGetAll(db, Array.from(uniqueFlightRefs.values()), BATCH_SIZE),
    ]);

    // Build listing payload for each traveller (connection status, distance, etc.).
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const trav = doc.data();
        const uRef = trav[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference;
        const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF] as admin.firestore.DocumentReference;
        const user = uRef?.id ? userSnapMap.get(uRef.id)?.data() : undefined;
        const flight = fRef?.id ? flightSnapMap.get(fRef.id)?.data() : undefined;
        return buildTravellerListing(trav, user, flight, {
          uid,
          placeId,
          currentUserTravellerData,
          docId: doc.id,
          userId: uRef?.id,
        });
      }),
    );

    return res.json({
      ok: true,
      data: results,
      isUserInGroup,
      userGroupId: userGroupId ?? undefined,
      userReadyToOnboard,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Fetch Travellers Error:", msg);
    return internalServerError(res);
  }
}

/** GET /traveller-by-airport/:airportCode/:userId — single traveller at airport (same shape as list item). */
export async function getTravellerByAirportAndUser(req: Request, res: Response) {
  const airportCode = parseStringParam(req.params.airportCode);
  const userId = parseStringParam(req.params.userId);
  if (!airportCode || !userId) {
    return badRequest(res, "Airport code and user ID are required");
  }

  if (!isValidIataCode(airportCode)) {
    return badRequest(
      res,
      `Airport code must be a ${IATA_CODE_LENGTH}-character IATA code`,
    );
  }
  if (userId.length > UID_MAX_LENGTH) {
    return badRequest(res, "User ID is too long");
  }

  const db = admin.firestore();
  const uid = req.auth?.uid;
  const code = airportCode.toUpperCase();
  const placeId = (uid ? await getCurrentUserDestination(uid, code) : null)?.placeId;

  try {
    // Optional: current user's listing data (for connection status).
    let currentUserTravellerData: admin.firestore.DocumentData | null = null;
    if (uid) {
      const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
      const curSnap = await db
        .collection(COLLECTIONS.TRAVELLER_DATA)
        .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
        .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
        .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
        .limit(1)
        .get();
      if (!curSnap.empty) currentUserTravellerData = curSnap.docs[0].data();
    }

    // Target user's active traveller doc at this airport.
    const targetUserRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", targetUserRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return notFound(res, "Traveller not found");
    }

    const doc = snapshot.docs[0];
    const trav = doc.data();
    const uRef = trav[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference;
    const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF] as admin.firestore.DocumentReference;
    // Load user and flight for payload.
    const [userSnap, flightSnap] = await Promise.all([
      uRef?.id ? db.collection(COLLECTIONS.USERS).doc(uRef.id).get() : null,
      fRef?.id ? db.collection(COLLECTIONS.FLIGHT_DETAIL).doc(fRef.id).get() : null,
    ]);
    const user = userSnap?.data();
    const flight = flightSnap?.data();

    const result = await buildTravellerListing(trav, user, flight, {
      uid,
      placeId,
      currentUserTravellerData,
      docId: doc.id,
      userId: userSnap?.id,
    });
    return res.json({ ok: true, data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Get traveller by airport and user error:", msg);
    return internalServerError(res);
  }
}

/** GET (query: airportCode) — whether current user has a listing at airport; returns destinationAddress. */
export async function checkTravellerHasListing(req: Request, res: Response) {
  const rawAirportCode = req.query.airportCode;
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, "Unauthorized");
  if (!rawAirportCode) {
    return badRequest(res, "Airport code is required");
  }

  const airportCode =
    typeof rawAirportCode === "string"
      ? rawAirportCode
      : Array.isArray(rawAirportCode)
        ? String(rawAirportCode[0] ?? "")
        : String(rawAirportCode);

  const normalizedCode = airportCode.trim().toUpperCase();
  if (!normalizedCode) {
    return badRequest(res, "Airport code is required");
  }
  if (!isValidIataCode(normalizedCode)) {
    return badRequest(
      res,
      `Airport code must be a ${IATA_CODE_LENGTH}-character IATA code`,
    );
  }

  try {
    const destination = await getCurrentUserDestination(
      uid,
      normalizedCode,
    );
    return res.json({ ok: true, destinationAddress: destination?.address });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Check Listing Error:", msg);
    return internalServerError(res);
  }
}

/** GET /has-active-listing — whether current user has any active listing (any airport). Used to disable "Post flight" on all airports. */
export async function hasActiveListingAnywhere(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, "Unauthorized");

  try {
    const db = admin.firestore();
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .limit(1)
      .get();
    return res.json({
      ok: true,
      hasActiveListing: !snapshot.empty,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Has Active Listing Error:", msg);
    return internalServerError(res);
  }
}

/** Current user's destination (object with address/placeId) at airport, or null. */
async function getCurrentUserDestination(
  uid: string,
  airportCode: string,
): Promise<{ address?: string; placeId?: string } | null> {
  const db = admin.firestore();
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    // Any traveller_data for this user at airport (active or not).
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", String(airportCode).toUpperCase())
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data().destination ?? null;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("getCurrentUserDestination:", msg);
    return null;
  }
}

/** POST /request-connection — send connection request to a traveller. */
export async function requestConnection(req: Request, res: Response) {
  const { travellerUid, flightCarrier, flightNumber } = req.body;
  const requesterUid = req.auth?.uid;
  if (!requesterUid) {
    return unauthorized(res, "Unauthorized");
  }

  if (!isNonEmptyString(travellerUid)) {
    return badRequest(res, "Traveller UID is required and must be a non-empty string");
  }
  const travellerUidTrimmed = travellerUid.trim();
  if (travellerUidTrimmed.length > UID_MAX_LENGTH) {
    return badRequest(res, "Traveller UID is too long");
  }

  if (!isNonEmptyString(flightCarrier)) {
    return badRequest(res, "Flight carrier is required and must be a non-empty string");
  }
  if (!isNonEmptyString(flightNumber)) {
    return badRequest(res, "Flight number is required and must be a non-empty string");
  }
  const flightCarrierTrimmed = (flightCarrier as string).trim();
  const flightNumberTrimmed = (flightNumber as string).trim();

  if (requesterUid === travellerUidTrimmed) {
    return badRequest(res, "Cannot connect with yourself");
  }

  const db = admin.firestore();

  try {
    const travellerUserRef = db
      .collection(COLLECTIONS.USERS)
      .doc(travellerUidTrimmed);
    const requesterUserRef = db.collection(COLLECTIONS.USERS).doc(requesterUid);

    const travellerUserSnap = await travellerUserRef.get();
    if (!travellerUserSnap.exists) {
      return notFound(res, "Traveller user not found");
    }
    // Target's active traveller listing (not in a group).
    const travellerSnapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", travellerUserRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .get();

    if (travellerSnapshot.empty) {
      return notFound(res, "Traveller trip not found");
    }

    // Match by carrier or flight number.
    let targetTravellerDoc: admin.firestore.QueryDocumentSnapshot | null = null;
    const inCompleteTripData = travellerSnapshot.docs[0].data();
    const fRef = inCompleteTripData[
      TRAVELLER_FIELDS.FLIGHT_REF
    ] as admin.firestore.DocumentReference;
    const fSnap = await fRef.get();
    const fData = fSnap.data();
    if (
      fData &&
      (fData.carrier === flightCarrierTrimmed ||
        fData.flightNumber === flightNumberTrimmed)
    ) {
      targetTravellerDoc = travellerSnapshot.docs[0];
    }
    if (!targetTravellerDoc) {
      return notFound(res, "Matching flight trip not found for this traveller");
    }

    // Add requester to connectionRequests and notify target.
    await Promise.all([
      targetTravellerDoc.ref.update({
        [TRAVELLER_FIELDS.CONNECTION_REQUESTS]:
          admin.firestore.FieldValue.arrayUnion(requesterUserRef),
      }),
      notifyUserOfConnectionRequest(targetTravellerDoc.id, requesterUid),
    ]);

    return res.json({
      ok: true,
      message: "Connection request sent",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Request Connection Error:", msg);
    return internalServerError(res, msg);
  }
}

/** POST /respond-to-connection-request — Body: { requesterUserId, action: "accept"|"reject" }. */
export async function respondToConnectionRequest(req: Request, res: Response) {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return badRequest(res, "Request body must be a JSON object");
  }

  const { requesterUserId: rawRequesterUserId, action: rawAction } = body;
  const recipientUid = req.auth?.uid;

  if (!recipientUid) {
    return unauthorized(res, "Unauthorized");
  }

  if (!isNonEmptyString(rawRequesterUserId)) {
    return badRequest(res, "requesterUserId is required and must be a non-empty string");
  }
  const requesterUserId = (rawRequesterUserId as string).trim();

  const action = parseConnectionResponseAction(rawAction);
  if (action === null) {
    return badRequest(
      res,
      `action must be '${ConnectionResponseAction.ACCEPT}' or '${ConnectionResponseAction.REJECT}' (case-insensitive)`,
    );
  }

  if (requesterUserId === recipientUid) {
    return badRequest(res, "Cannot respond to your own request");
  }

  const db = admin.firestore();
  const requesterUserRef = db
    .collection(COLLECTIONS.USERS)
    .doc(requesterUserId);
  const recipientUserRef = db.collection(COLLECTIONS.USERS).doc(recipientUid);

  try {
    const requesterUserSnap = await requesterUserRef.get();
    if (!requesterUserSnap.exists) {
      return notFound(res, "Requester user not found");
    }

    // Recipient's active listing (holder of the connection request).
    const recipientSnapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", recipientUserRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .limit(1)
      .get();

    if (recipientSnapshot.empty) {
      return notFound(res, "No active traveller listing found for you");
    }

    const recipientDoc = recipientSnapshot.docs[0];
    const recipientData = recipientDoc.data();
    const connectionRequests: admin.firestore.DocumentReference[] =
      recipientData[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];

    const hasRequest = connectionRequests.some(
      (ref: admin.firestore.DocumentReference) => ref.id === requesterUserId,
    );
    if (!hasRequest) {
      return badRequest(res, "No connection request from this user");
    }

    // Reject: remove from list and notify.
    if (action === ConnectionResponseAction.REJECT) {
      await recipientDoc.ref.update({
        [TRAVELLER_FIELDS.CONNECTION_REQUESTS]:
          admin.firestore.FieldValue.arrayRemove(requesterUserRef),
      });
      await notifyConnectionRequestResponded(
        requesterUserId,
        recipientUid,
        "rejected",
      );
      return res.json({
        ok: true,
        message: "Connection request rejected",
      });
    }

    // Accept: create group, link both travellers, notify.
    const flightArrival = recipientData[TRAVELLER_FIELDS.FLIGHT_ARRIVAL];
    if (!flightArrival) {
      return internalServerError(res, "Traveller listing missing flight arrival");
    }
    const requesterSnapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", requesterUserRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", flightArrival)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .limit(1)
      .get();

    if (requesterSnapshot.empty) {
      return notFound(
        res,
        "Requester's trip not found for this airport (may have been removed)",
      );
    }

    const requesterTravellerDoc = requesterSnapshot.docs[0];
    const groupRef = db.collection(COLLECTIONS.GROUPS).doc();
    const initialMembers = [recipientUserRef, requesterUserRef];
    await groupRef.set({
      [GROUP_FIELDS.GROUP_ID]: groupRef.id,
      [GROUP_FIELDS.NAME]: "New Group",
      [GROUP_FIELDS.MEMBERS]: initialMembers,
      [GROUP_FIELDS.MEMBER_UIDS]: initialMembers.map(
        (ref: admin.firestore.DocumentReference) => ref.id,
      ),
      [GROUP_FIELDS.PENDING_REQUESTS]: [],
      [GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT]: flightArrival,
      [GROUP_FIELDS.CREATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
      [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set groupRef on both; remove requester from recipient's connectionRequests.
    await Promise.all([
      recipientDoc.ref.update({
        [TRAVELLER_FIELDS.GROUP_REF]: groupRef,
        [TRAVELLER_FIELDS.CONNECTION_REQUESTS]:
          admin.firestore.FieldValue.arrayRemove(requesterUserRef),
      }),
      requesterTravellerDoc.ref.update({
        [TRAVELLER_FIELDS.GROUP_REF]: groupRef,
      }),
    ]);

    await notifyConnectionRequestResponded(
      requesterUserId,
      recipientUid,
      "accepted",
      groupRef.id,
    );

    return res.json({
      ok: true,
      message: "Connection request accepted",
      groupId: groupRef.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Respond to connection request error:", msg);
    return internalServerError(res);
  }
}

// ---------------------------------------------------------------------------
// Group helpers: member destinations, gender counts, summary payload
// ---------------------------------------------------------------------------
/** Fetch destinations for members at airport (order preserved). */
async function fetchMemberDestinations(
  db: admin.firestore.Firestore,
  code: string,
  members: admin.firestore.DocumentReference[],
): Promise<string[]> {
  if (members.length === 0) return [];
  const travellerByUserId = new Map<string, admin.firestore.DocumentData>();
  // Firestore 'in' query limited to 10.
  for (let i = 0; i < members.length; i += IN_QUERY_MAX) {
    const chunk = members.slice(i, i + IN_QUERY_MAX);
    const qSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "in", chunk)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
      .limit(IN_QUERY_MAX)
      .get();
    for (const d of qSnap.docs) {
      const tData = d.data();
      const uRef = tData[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference;
      if (uRef?.id) travellerByUserId.set(uRef.id, tData);
    }
  }
  return members.map((ref) => {
    const tData = travellerByUserId.get(ref.id);
    if (!tData) return "N/A";
    const dest = tData[TRAVELLER_FIELDS.DESTINATION];
    return typeof dest === "string" ? dest : (dest?.address ?? "N/A");
  });
}

/** Fetch destination placeIds for members at airport (order preserved). */
async function fetchMemberDestinationPlaceIds(
  db: admin.firestore.Firestore,
  code: string,
  members: admin.firestore.DocumentReference[],
): Promise<(string | null)[]> {
  if (members.length === 0) return [];
  const travellerByUserId = new Map<string, admin.firestore.DocumentData>();
  for (let i = 0; i < members.length; i += IN_QUERY_MAX) {
    const chunk = members.slice(i, i + IN_QUERY_MAX);
    const qSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "in", chunk)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
      .limit(IN_QUERY_MAX)
      .get();
    for (const d of qSnap.docs) {
      const tData = d.data();
      const uRef = tData[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference;
      if (uRef?.id) travellerByUserId.set(uRef.id, tData);
    }
  }
  return members.map((ref) => {
    const tData = travellerByUserId.get(ref.id);
    if (!tData) return null;
    const dest = tData[TRAVELLER_FIELDS.DESTINATION];
    if (typeof dest !== "object" || dest === null || !("placeId" in dest)) return null;
    const pid = (dest as { placeId?: string }).placeId;
    return typeof pid === "string" && pid.trim() ? pid.trim() : null;
  });
}

/** Count male/female from member user snaps. */
function countGender(
  members: admin.firestore.DocumentReference[],
  userSnapMap: Map<string, admin.firestore.DocumentSnapshot>,
): { male: number; female: number } {
  let male = 0;
  let female = 0;
  for (const ref of members) {
    const userData = userSnapMap.get(ref.id)?.data();
    if (userData?.[USER_FIELDS.IS_FEMALE]) female++;
    else male++;
  }
  return { male, female };
}

/** Build group summary object for API (list + single). */
function buildGroupSummary(
  docId: string,
  data: admin.firestore.DocumentData,
  code: string,
  groupSize: number,
  destinations: string[],
  genderBreakdown: { male: number; female: number },
  hasPendingJoinRequest: boolean,
  averageRoadDistanceKm?: number | null,
): Record<string, unknown> {
  const createdAt = data[GROUP_FIELDS.CREATED_AT];
  const createdAtISO = createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
  const storedName = data[GROUP_FIELDS.NAME];
  const name =
    typeof storedName === "string" && storedName.trim().length > 0
      ? storedName.trim()
      : `Group of ${groupSize}`;
  const base: Record<string, unknown> = {
    id: docId,
    name,
    airportCode: code,
    destinations,
    groupSize,
    maxUsers: MAX_GROUP_USERS,
    genderBreakdown,
    createdAt: createdAtISO,
    hasPendingJoinRequest,
  };
  if (averageRoadDistanceKm != null && Number.isFinite(averageRoadDistanceKm)) {
    base.averageRoadDistanceKm = averageRoadDistanceKm;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Handlers: Groups
// ---------------------------------------------------------------------------

/** GET /groups-by-airport/:airportCode — groups at airport; includes hasPendingJoinRequest. */
export async function getGroupsByAirport(req: Request, res: Response) {
  const airportCode = parseStringParam(req.params.airportCode);
  if (!airportCode) {
    return badRequest(res, "Airport code is required");
  }

  const db = admin.firestore();
  const uid = req.auth?.uid;
  const code = airportCode.toUpperCase();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.GROUPS)
      .where(GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT, "==", code)
      .get();
    if (snapshot.empty) return res.json({ ok: true, data: [] });

    // Batch-fetch all unique member user docs once.
    const uniqueMemberRefs = new Map<string, admin.firestore.DocumentReference>();
    for (const doc of snapshot.docs) {
      const members = doc.data()[GROUP_FIELDS.MEMBERS] || [];
      for (const ref of members) {
        if (ref?.id) uniqueMemberRefs.set(ref.id, ref);
      }
    }
    const userSnapMap = await batchGetAll(
      db,
      Array.from(uniqueMemberRefs.values()),
      BATCH_SIZE,
    );

    const userDest = uid
      ? await getCurrentUserDestination(uid, code)
      : null;

    // Per group: destinations, gender counts, and summary payload.
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const members = data[GROUP_FIELDS.MEMBERS] || [];
        const pendingRequests = data[GROUP_FIELDS.PENDING_REQUESTS] || [];
        const hasPendingJoinRequest =
          !!uid && pendingRequests.some((ref: { id: string }) => ref.id === uid);
        const destinations = await fetchMemberDestinations(db, code, members);
        const genderBreakdown = countGender(members, userSnapMap);

        let averageRoadDistanceKm: number | null = null;
        const userInGroup = !!uid && members.some((ref: { id: string }) => ref.id === uid);
        if (uid && userDest?.placeId && !userInGroup && members.length > 0) {
          try {
            const placeIds = await fetchMemberDestinationPlaceIds(db, code, members);
            const validPlaceIds = placeIds.filter((id): id is string => id != null && id.length > 0);
            if (validPlaceIds.length > 0) {
              const distancesMeters = await roadDistanceFromOneToMany(userDest.placeId, validPlaceIds);
              const validDistances = distancesMeters.filter((d): d is number => d != null && Number.isFinite(d));
              if (validDistances.length > 0) {
                const sumMeters = validDistances.reduce((a, b) => a + b, 0);
                averageRoadDistanceKm = sumMeters / validDistances.length / 1000;
              }
            }
          } catch (err) {
            console.error("[getGroupsByAirport] Average road distance error for group", doc.id, err);
          }
        }

        return buildGroupSummary(
          doc.id,
          data,
          code,
          members.length,
          destinations,
          genderBreakdown,
          hasPendingJoinRequest,
          averageRoadDistanceKm,
        );
      }),
    );
    return res.json({ ok: true, data: results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Get groups by airport error:", msg);
    return internalServerError(res);
  }
}

/** GET /group/:groupId — single group (same shape as list item). */
export async function getGroupById(req: Request, res: Response) {
  const groupId = parseStringParam(req.params.groupId);
  if (!groupId) {
    return badRequest(res, "Group ID is required");
  }

  const db = admin.firestore();
  const uid = req.auth?.uid;

  try {
    const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(groupId).get();
    if (!groupDoc.exists) {
      return notFound(res, "Group not found");
    }
    const data = groupDoc.data()!;
    const members = data[GROUP_FIELDS.MEMBERS] || [];
    const pendingRequests = data[GROUP_FIELDS.PENDING_REQUESTS] || [];
    const code = (data[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as string) || "";
    const hasPendingJoinRequest =
      !!uid && pendingRequests.some((ref: { id: string }) => ref.id === uid);
    const isCurrentUserMember =
      !!uid && members.some((ref: { id: string }) => ref.id === uid);

    // Load member users, then their destinations at this airport.
    const userSnapMap = await batchGetAll(db, members, BATCH_SIZE);
    const destinations = await fetchMemberDestinations(db, code, members);
    const genderBreakdown = countGender(members, userSnapMap);

    let averageRoadDistanceKm: number | null = null;
    if (uid && !isCurrentUserMember && members.length > 0) {
      const userDest = await getCurrentUserDestination(uid, code);
      if (userDest?.placeId) {
        try {
          const placeIds = await fetchMemberDestinationPlaceIds(db, code, members);
          const validPlaceIds = placeIds.filter((id): id is string => id != null && id.length > 0);
          if (validPlaceIds.length > 0) {
            const distancesMeters = await roadDistanceFromOneToMany(userDest.placeId, validPlaceIds);
            const validDistances = distancesMeters.filter((d): d is number => d != null && Number.isFinite(d));
            if (validDistances.length > 0) {
              const sumMeters = validDistances.reduce((a, b) => a + b, 0);
              averageRoadDistanceKm = sumMeters / validDistances.length / 1000;
            }
          }
        } catch (err) {
          console.error("[getGroupById] Average road distance error:", err);
        }
      }
    }

    const group = buildGroupSummary(
      groupDoc.id,
      data,
      code,
      members.length,
      destinations,
      genderBreakdown,
      hasPendingJoinRequest,
      averageRoadDistanceKm,
    );
    return res.json({
      ok: true,
      data: { ...group, isCurrentUserMember },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Get group by ID error:", msg);
    return internalServerError(res);
  }
}

/** GET /group-members/:groupId — members as traveller-like objects. */
export async function getGroupMembers(req: Request, res: Response) {
  const groupId = parseStringParam(req.params.groupId);
  if (!groupId) {
    return badRequest(res, "Group ID is required");
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }

    const members = groupSnap.data()?.[GROUP_FIELDS.MEMBERS] || [];
    if (members.length === 0) return res.json({ ok: true, data: [] });

    // All traveller_data for this group (one per member).
    const travellerSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", groupRef)
      .get();
    const travellerByUserId = new Map<string, admin.firestore.DocumentData>();
    const uniqueUserRefs = new Map<string, admin.firestore.DocumentReference>();
    const uniqueFlightRefs = new Map<string, admin.firestore.DocumentReference>();
    for (const m of members) {
      if (m?.id) uniqueUserRefs.set(m.id, m);
    }
    for (const d of travellerSnap.docs) {
      const trav = d.data();
      const uRef = trav[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference;
      const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF] as admin.firestore.DocumentReference;
      if (uRef?.id) {
        travellerByUserId.set(uRef.id, trav);
        uniqueUserRefs.set(uRef.id, uRef);
      }
      if (fRef?.id) uniqueFlightRefs.set(fRef.id, fRef);
    }
    const [userSnapMap, flightSnapMap] = await Promise.all([
      batchGetAll(db, Array.from(uniqueUserRefs.values()), BATCH_SIZE),
      batchGetAll(db, Array.from(uniqueFlightRefs.values()), BATCH_SIZE),
    ]);

    // Build member row: user info + destination, terminal, flight from traveller_data.
    const memberDetails = members.map((userRef: admin.firestore.DocumentReference) => {
      const trav = travellerByUserId.get(userRef.id);
      const user = userSnapMap.get(userRef.id)?.data();
      const name = `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim() || "Unknown";
      const base = {
        id: userRef.id,
        name,
        gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
        photoURL: user?.[USER_FIELDS.PHOTO_URL] ?? null,
        username: user?.[USER_FIELDS.USERNAME] ?? null,
      };
      if (!trav) {
        return {
          ...base,
          destination: "N/A",
          terminal: "N/A",
          flightNumber: "—",
          readyToOnboard: false,
        };
      }
      const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF] as admin.firestore.DocumentReference;
      const flight = fRef?.id ? flightSnapMap.get(fRef.id)?.data() : undefined;
      const flightNumber =
        `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ""} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ""}`.trim() || "—";
      return {
        ...base,
        destination: extractDestinationAddress(trav[TRAVELLER_FIELDS.DESTINATION]),
        terminal: trav[TRAVELLER_FIELDS.TERMINAL] || "N/A",
        flightNumber,
        readyToOnboard: trav[TRAVELLER_FIELDS.READY_TO_ONBOARD] === true,
      };
    });

    return res.json({ ok: true, data: memberDetails });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Get group members error:", msg);
    return internalServerError(res);
  }
}

/** Clear groupRef from user's active traveller_data for the given group. */
async function clearUserGroupRef(
  db: admin.firestore.Firestore,
  userRef: admin.firestore.DocumentReference,
  groupRef: admin.firestore.DocumentReference,
): Promise<void> {
  const snapshot = await db
    .collection(COLLECTIONS.TRAVELLER_DATA)
    .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
    .where(TRAVELLER_FIELDS.GROUP_REF, "==", groupRef)
    .limit(1)
    .get();
  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({
      [TRAVELLER_FIELDS.GROUP_REF]: null,
    });
  }
}

/** Add a system message to the group chat (e.g. "X joined/left the group"). */
async function addGroupSystemMessage(
  groupRef: admin.firestore.DocumentReference,
  text: string,
): Promise<void> {
  const messageRef = groupRef.collection(GROUP_SUBCOLLECTIONS.MESSAGES).doc();
  await messageRef.set({
    [GROUP_MESSAGE_FIELDS.MESSAGE_ID]: messageRef.id,
    [GROUP_MESSAGE_FIELDS.GROUP_ID]: groupRef.id,
    [GROUP_MESSAGE_FIELDS.TYPE]: "system",
    [GROUP_MESSAGE_FIELDS.SENDER_ID]: null,
    [GROUP_MESSAGE_FIELDS.SENDER_DISPLAY_NAME]: null,
    [GROUP_MESSAGE_FIELDS.SENDER_PHOTO_URL]: null,
    [GROUP_MESSAGE_FIELDS.TEXT]: text,
    [GROUP_MESSAGE_FIELDS.CREATED_AT]:
      admin.firestore.FieldValue.serverTimestamp(),
  });
}

/** POST /leave-group — Body: { groupId }. Notifies members; disbands if 1 left. */
export async function leaveGroup(req: Request, res: Response) {
  const { groupId } = req.body as { groupId?: string };
  const uid = req.auth?.uid;

  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }

  if (!groupId || typeof groupId !== "string" || !groupId.trim()) {
    return badRequest(res, "groupId is required");
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId.trim());

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }
    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return forbidden(res, "You are not a member of this group");
    }

    const remainingMembers = members.filter(
      (ref: admin.firestore.DocumentReference) => ref.id !== uid,
    );
    await clearUserGroupRef(db, userRef, groupRef);

    const leaverSnap = await userRef.get();
    const leaverName =
      leaverSnap.data()?.[USER_FIELDS.FIRST_NAME]?.trim() || "Someone";

    // Disband if 0 or 1 left; else update members, add system message, and notify.
    if (remainingMembers.length <= 1) {
      if (remainingMembers.length === 1) {
        const lastMemberRef = remainingMembers[0];
        await clearUserGroupRef(db, lastMemberRef, groupRef);
        await notifyGroupDisbanded(lastMemberRef.id, groupId.trim());
      }
      await groupRef.delete();
      return res.json({
        ok: true,
        message:
          remainingMembers.length === 1
            ? "Left group. Group disbanded."
            : "Left group. Group removed.",
      });
    }

    await addGroupSystemMessage(
      groupRef,
      `${leaverName} left the group`,
    );
    await groupRef.update({
      [GROUP_FIELDS.MEMBERS]: remainingMembers,
      [GROUP_FIELDS.MEMBER_UIDS]: remainingMembers.map(
        (ref: admin.firestore.DocumentReference) => ref.id,
      ),
      [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    });

    const remainingIds = remainingMembers.map(
      (ref: admin.firestore.DocumentReference) => ref.id,
    );
    await notifyGroupMembersMemberLeft(remainingIds, uid, groupId.trim());

    return res.json({
      ok: true,
      message: "Left group. Other members notified.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Leave group error:", msg);
    return internalServerError(res);
  }
}

const VERIFY_AT_TERMINAL_MAX_DISTANCE_METERS = 1000;

/** POST /verify-at-terminal — Body: { groupId, latitude, longitude }. Verifies user is at airport via GPS. */
export async function verifyAtTerminal(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }

  const { groupId, latitude, longitude } = req.body as {
    groupId?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!groupId || typeof groupId !== "string" || !groupId.trim()) {
    return badRequest(res, "groupId is required");
  }
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return badRequest(res, "latitude and longitude are required");
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId.trim());
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return forbidden(res, "You are not a member of this group");
    }

    const travellerSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", groupRef)
      .limit(1)
      .get();

    if (travellerSnap.empty) {
      return badRequest(res, "No listing found for this group");
    }

    const travellerDoc = travellerSnap.docs[0];
    const travellerData = travellerDoc.data();
    const airportCode = (travellerData[TRAVELLER_FIELDS.FLIGHT_ARRIVAL] as
      | string
      | undefined)?.trim?.()?.toUpperCase?.();

    if (!airportCode) {
      return badRequest(res, "Missing airport code");
    }

    const airportCoords = await geocodeAirport(airportCode);
    const distanceMeters = haversineDistance(
      latitude,
      longitude,
      airportCoords.lat,
      airportCoords.lng,
    );

    if (distanceMeters > VERIFY_AT_TERMINAL_MAX_DISTANCE_METERS) {
      return badRequest(
        res,
        "You must be at the airport to verify. Please ensure you are at the terminal.",
      );
    }

    await travellerDoc.ref.update({
      [TRAVELLER_FIELDS.READY_TO_ONBOARD]: true,
      [TRAVELLER_FIELDS.READY_TO_ONBOARD_AT]:
        admin.firestore.FieldValue.serverTimestamp(),
    });

    const userSnap = await userRef.get();
    const userName =
      userSnap.data()?.[USER_FIELDS.FIRST_NAME]?.trim() || "Someone";

    await addGroupSystemMessage(
      groupRef,
      `${userName} is at the terminal and ready to onboard`,
    );
    await notifyGroupMembersReadyToOnboard(groupId.trim(), uid, userName);

    return res.json({
      ok: true,
      userCoordinates: { latitude, longitude },
      terminalCoordinates: {
        airportCode,
        lat: airportCoords.lat,
        lng: airportCoords.lng,
      },
      distanceMeters: Math.round(distanceMeters),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Verify at terminal error:", msg);
    return internalServerError(res);
  }
}

/** POST /revoke-listing — Body: { airportCode }. Revokes active listing (must not be in group). */
export async function revokeListing(req: Request, res: Response) {
  const { airportCode } = req.body as { airportCode?: string };
  const uid = req.auth?.uid;

  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }

  if (!airportCode || typeof airportCode !== "string" || !airportCode.trim()) {
    return badRequest(res, "airportCode is required");
  }

  const db = admin.firestore();
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const code = String(airportCode).trim().toUpperCase();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return notFound(res, "No active listing found for this airport");
    }
    await snapshot.docs[0].ref.delete();

    return res.json({
      ok: true,
      message: "Listing revoked successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Revoke listing error:", msg);
    return internalServerError(res);
  }
}

/** POST /request-join-group — Body: { groupId }. Adds user to pendingRequests, notifies members. */
export async function requestJoinGroup(req: Request, res: Response) {
  const { groupId } = req.body as { groupId?: string };
  const uid = req.auth?.uid;

  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }
  if (!groupId || typeof groupId !== "string" || !groupId.trim()) {
    return badRequest(res, "groupId is required");
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId.trim());
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    const pendingRequests: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.PENDING_REQUESTS] || [];
    const flightArrivalAirport = data?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as
      | string
      | undefined;
    if (members.some((ref: admin.firestore.DocumentReference) => ref.id === uid)) {
      return badRequest(res, "You are already a member of this group");
    }
    if (
      pendingRequests.some(
        (ref: admin.firestore.DocumentReference) => ref.id === uid,
      )
    ) {
      return badRequest(res, "You already have a pending join request");
    }
    if (members.length >= MAX_GROUP_USERS) {
      return badRequest(res, "Group is full");
    }

    if (!flightArrivalAirport) {
      return badRequest(res, "Group has no airport; cannot join");
    }
    // Requester must have an active listing at same airport.
    const requesterTravellerSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", flightArrivalAirport)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .limit(1)
      .get();
    if (requesterTravellerSnap.empty) {
      return badRequest(
        res,
        "You need an active listing at this airport to join the group",
      );
    }

    const newPending = [...pendingRequests, userRef];
    await groupRef.update({
      [GROUP_FIELDS.PENDING_REQUESTS]: newPending,
      [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    });
    await notifyGroupAdminOfJoinRequest(groupId.trim(), uid);

    return res.json({
      ok: true,
      message: "Join request sent. Group members will be notified.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Request join group error:", msg);
    return internalServerError(res);
  }
}

/** GET /group-join-requests/:groupId — pending join requests (members only). */
export async function getGroupJoinRequests(req: Request, res: Response) {
  const groupId = parseStringParam(req.params.groupId);
  const uid = req.auth?.uid;

  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }
  if (!groupId) {
    return badRequest(res, "Group ID is required");
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    const pendingRequests: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.PENDING_REQUESTS] || [];

    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return forbidden(res, "Only group members can view join requests");
    }
    if (pendingRequests.length === 0) return res.json({ ok: true, data: [] });

    const flightArrivalAirport = data?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as
      | string
      | undefined;
    const code = flightArrivalAirport ?? "";
    // Per pending user: user + traveller + flight for display.
    const requestDetails = await Promise.all(
      pendingRequests.map(
        async (userRef: admin.firestore.DocumentReference) => {
          const userSnap = await userRef.get();
          const user = userSnap.data();
          const travellerSnap = await db
            .collection(COLLECTIONS.TRAVELLER_DATA)
            .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
            .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
            .limit(1)
            .get();

          let destination = "N/A";
          let terminal = "N/A";
          let flightNumber = "—";

          if (!travellerSnap.empty) {
            const trav = travellerSnap.docs[0].data();
            const flightRef = trav[
              TRAVELLER_FIELDS.FLIGHT_REF
            ] as admin.firestore.DocumentReference;
            const flightSnap = await flightRef.get();
            const flight = flightSnap.data();
            const dest = trav[TRAVELLER_FIELDS.DESTINATION];
            destination =
              typeof dest === "string" ? dest : (dest?.address ?? "N/A");
            terminal = trav[TRAVELLER_FIELDS.TERMINAL] || "N/A";
            flightNumber =
              `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ""} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ""}`.trim() ||
              "—";
          }

          return {
            id: userRef.id,
            name:
              `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim() ||
              "Unknown",
            gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
            photoURL: user?.[USER_FIELDS.PHOTO_URL] ?? null,
            destination,
            terminal,
            flightNumber,
          };
        },
      ),
    );

    return res.json({ ok: true, data: requestDetails });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Get group join requests error:", msg);
    return internalServerError(res);
  }
}

/** POST /respond-to-join-request — Body: { groupId, requesterUserId, action: "accept"|"reject" }. */
export async function respondToJoinRequest(req: Request, res: Response) {
  const { groupId, requesterUserId, action } = req.body as {
    groupId?: string;
    requesterUserId?: string;
    action?: string;
  };
  const uid = req.auth?.uid;

  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }
  if (
    !groupId ||
    typeof groupId !== "string" ||
    !groupId.trim() ||
    !requesterUserId ||
    typeof requesterUserId !== "string" ||
    !requesterUserId.trim()
  ) {
    return badRequest(res, "groupId and requesterUserId are required");
  }
  const isAccept = action === "accept";
  const isReject = action === "reject";
  if (!isAccept && !isReject) {
    return badRequest(res, "action must be 'accept' or 'reject'");
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId.trim());
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const requesterUserRef = db
    .collection(COLLECTIONS.USERS)
    .doc(requesterUserId.trim());

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    let pendingRequests: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.PENDING_REQUESTS] || [];
    const flightArrivalAirport = data?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as
      | string
      | undefined;

    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return forbidden(res, "Only group members can respond to join requests");
    }

    const requesterInPending = pendingRequests.some(
      (ref: admin.firestore.DocumentReference) =>
        ref.id === requesterUserId.trim(),
    );
    if (!requesterInPending) {
      return notFound(res, "Join request not found or already handled");
    }
    const [deciderSnap, requesterSnap] = await Promise.all([
      userRef.get(),
      requesterUserRef.get(),
    ]);
    const deciderName =
      deciderSnap.data()?.[USER_FIELDS.FIRST_NAME] ?? "A member";
    const requesterName =
      requesterSnap.data()?.[USER_FIELDS.FIRST_NAME] ?? "Someone";

    pendingRequests = pendingRequests.filter(
      (ref: admin.firestore.DocumentReference) =>
        ref.id !== requesterUserId.trim(),
    );

    // Accept: add to members, set groupRef on requester's traveller_data, notify all.
    if (isAccept) {
      if (members.length >= MAX_GROUP_USERS) {
      return badRequest(res, "Group is full; cannot add more members");
      }
      if (!flightArrivalAirport) {
        return badRequest(res, "Group has no airport");
      }

      const requesterTravellerSnap = await db
        .collection(COLLECTIONS.TRAVELLER_DATA)
        .where(TRAVELLER_FIELDS.USER_REF, "==", requesterUserRef)
        .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", flightArrivalAirport)
        .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
        .limit(1)
        .get();

      if (requesterTravellerSnap.empty) {
        return badRequest(
          res,
          "Requester no longer has an active listing at this airport",
        );
      }

      const newMembers = [...members, requesterUserRef];
      await groupRef.update({
        [GROUP_FIELDS.MEMBERS]: newMembers,
        [GROUP_FIELDS.MEMBER_UIDS]: newMembers.map(
          (ref: admin.firestore.DocumentReference) => ref.id,
        ),
        [GROUP_FIELDS.PENDING_REQUESTS]: pendingRequests,
        [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
      });

      await addGroupSystemMessage(
        groupRef,
        `${requesterName} joined the group`,
      );

      await requesterTravellerSnap.docs[0].ref.update({
        [TRAVELLER_FIELDS.GROUP_REF]: groupRef,
      });

      await notifyUserJoinAccepted(groupId.trim(), requesterUserId.trim());
      const memberIds = newMembers.map(
        (ref: admin.firestore.DocumentReference) => ref.id,
      );
      await notifyOtherMembersJoinDecided(
        memberIds,
        groupId.trim(),
        uid,
        deciderName,
        requesterUserId.trim(),
        requesterName,
        true,
      );
      await notifyDeciderJoinRequestDecided(
        uid,
        requesterName,
        true,
        groupId.trim(),
      );
    } else {
      // Reject: remove from pending, notify requester and members.
      await groupRef.update({
        [GROUP_FIELDS.PENDING_REQUESTS]: pendingRequests,
        [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
      });

      await notifyUserJoinRejected(
        requesterUserId.trim(),
        groupId.trim(),
        deciderName,
      );
      const memberIds = members.map(
        (ref: admin.firestore.DocumentReference) => ref.id,
      );
      await notifyOtherMembersJoinDecided(
        memberIds,
        groupId.trim(),
        uid,
        deciderName,
        requesterUserId.trim(),
        requesterName,
        false,
      );
      await notifyDeciderJoinRequestDecided(
        uid,
        requesterName,
        false,
        groupId.trim(),
      );
    }

    return res.json({
      ok: true,
      message: isAccept ? "Join request accepted." : "Join request rejected.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Respond to join request error:", msg);
    return internalServerError(res);
  }
}

/** PATCH /update-group-name — Body: { groupId, name }. Name: max 50 chars, letters and spaces only. */
export async function updateGroupName(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }

  const body = req.body as { groupId?: string; name?: string };
  const groupId = typeof body?.groupId === "string" ? body.groupId.trim() : "";
  const rawName = typeof body?.name === "string" ? body.name : "";

  if (!groupId) {
    return badRequest(res, "groupId is required");
  }

  const name = rawName.trim();
  if (name.length === 0) {
    return badRequest(res, "Group name cannot be empty");
  }
  if (name.length > GROUP_NAME_MAX_LENGTH) {
    return badRequest(
      res,
      `Group name must be at most ${GROUP_NAME_MAX_LENGTH} characters`,
    );
  }
  if (!GROUP_NAME_ALPHABETS_ONLY.test(name)) {
    return badRequest(
      res,
      "Group name can only contain letters (A–Z, a–z) and spaces",
    );
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);
  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }
    const data = groupSnap.data();
    const members = data?.[GROUP_FIELDS.MEMBERS] || [];
    const storedName = data?.[GROUP_FIELDS.NAME];
    const oldDisplayName =
      typeof storedName === "string" && storedName.trim().length > 0
        ? storedName.trim()
        : `Group of ${members.length}`;
    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return forbidden(res, "Only group members can update the group name");
    }
    await groupRef.update({
      [GROUP_FIELDS.NAME]: name,
      [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      await notifyGroupRenamed(groupId, uid, oldDisplayName, name);
    } catch (e) {
      console.error("Failed to send group renamed notification:", e);
    }

    return res.json({ ok: true, message: "Group name updated", name });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Update group name error:", msg);
    return internalServerError(res);
  }
}
