import type { Request, Response } from "express";
import { admin } from "../firebase/admin";
import {
  COLLECTIONS,
  FLIGHT_FIELDS,
  GROUP_FIELDS,
  TRAVELLER_FIELDS,
  USER_FIELDS,
} from "../constants/db";
import {
  ConnectionResponseAction,
  parseConnectionResponseAction,
} from "../types/connection";
import { roadDistanceBetweenTwoPoints } from "../utils/controllerUtils";
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
} from "./notificationController";

export async function getTravellersByAirport(req: Request, res: Response) {
  const { airportCode } = req.params; // e.g., "DEL"

  if (!airportCode) {
    return res
      .status(400)
      .json({ ok: false, message: "Airport code is required" });
  }

  const db = admin.firestore();
  const uid = req.auth?.uid;
  const destination = uid
    ? await getCurrentUserDestination(uid, airportCode as string)
    : null;
  const placeId = destination?.placeId;

  try {
    // 1. Fetch current user data to check if they are already in a group
    let currentUserTravellerData: any = null;
    let isUserInGroup = false;
    let userGroupId: string | null = null;

    if (uid) {
      const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
      const currentUserSnapshot = await db
        .collection(COLLECTIONS.TRAVELLER_DATA)
        .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
        .where(
          TRAVELLER_FIELDS.FLIGHT_ARRIVAL,
          "==",
          String(airportCode).toUpperCase(),
        )
        .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
        .limit(1)
        .get();

      if (!currentUserSnapshot.empty) {
        currentUserTravellerData = currentUserSnapshot.docs[0].data();
        const groupRef = currentUserTravellerData[TRAVELLER_FIELDS.GROUP_REF];
        if (groupRef?.id) {
          isUserInGroup = true;
          userGroupId = groupRef.id;
        }
      }
    }

    // 2. Fetch all travellers associated with this airport (as the origin)
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(
        TRAVELLER_FIELDS.FLIGHT_ARRIVAL,
        "==",
        String(airportCode).toUpperCase(),
      )
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .get();

    if (snapshot.empty) {
      return res.json({
        ok: true,
        data: [],
        isUserInGroup,
        userGroupId: userGroupId ?? undefined,
      });
    }

    // 3. Batch-fetch unique user and flight docs to avoid duplicate reads
    const uniqueUserRefs = new Map<string, admin.firestore.DocumentReference>();
    const uniqueFlightRefs = new Map<
      string,
      admin.firestore.DocumentReference
    >();
    for (const doc of snapshot.docs) {
      const trav = doc.data();
      const uRef = trav[
        TRAVELLER_FIELDS.USER_REF
      ] as admin.firestore.DocumentReference;
      const fRef = trav[
        TRAVELLER_FIELDS.FLIGHT_REF
      ] as admin.firestore.DocumentReference;
      if (uRef?.id) uniqueUserRefs.set(uRef.id, uRef);
      if (fRef?.id) uniqueFlightRefs.set(fRef.id, fRef);
    }
    const BATCH_SIZE = 100;
    const userRefList = Array.from(uniqueUserRefs.values());
    const flightRefList = Array.from(uniqueFlightRefs.values());
    const userSnapBatches = await Promise.all(
      Array.from(
        { length: Math.ceil(userRefList.length / BATCH_SIZE) },
        (_, i) =>
          userRefList.length
            ? db.getAll(
                ...userRefList.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
              )
            : Promise.resolve([]),
      ),
    );
    const flightSnapBatches = await Promise.all(
      Array.from(
        { length: Math.ceil(flightRefList.length / BATCH_SIZE) },
        (_, i) =>
          flightRefList.length
            ? db.getAll(
                ...flightRefList.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
              )
            : Promise.resolve([]),
      ),
    );
    const userSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
    const flightSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
    for (const batch of userSnapBatches) {
      for (const snap of batch) {
        userSnapMap.set(snap.id, snap);
      }
    }
    for (const batch of flightSnapBatches) {
      for (const snap of batch) {
        flightSnapMap.set(snap.id, snap);
      }
    }

    // 4. Build response using pre-fetched user and flight data
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const trav = doc.data();
        const uRef = trav[
          TRAVELLER_FIELDS.USER_REF
        ] as admin.firestore.DocumentReference;
        const fRef = trav[
          TRAVELLER_FIELDS.FLIGHT_REF
        ] as admin.firestore.DocumentReference;
        const userSnap = uRef?.id ? userSnapMap.get(uRef.id) : null;
        const flightSnap = fRef?.id ? flightSnapMap.get(fRef.id) : null;
        const user = userSnap?.data();
        const flight = flightSnap?.data();
        const fData = flight?.flightData;

        // Check connection status
        let connectionStatus = "SEND_REQUEST";
        const userId = userSnap?.id;
        if (uid && userId) {
          const theirConnectionRequests =
            trav[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];
          const hasSentRequest = theirConnectionRequests.some(
            (ref: any) => ref.id === uid,
          );

          if (hasSentRequest) {
            connectionStatus = "REQUEST_SENT";
          } else if (currentUserTravellerData) {
            const myConnectionRequests =
              currentUserTravellerData[TRAVELLER_FIELDS.CONNECTION_REQUESTS] ||
              [];
            const hasReceivedRequest = myConnectionRequests.some(
              (ref: any) => ref.id === userId,
            );
            if (hasReceivedRequest) {
              connectionStatus = "REQUEST_RECEIVED";
            }
          }
        }

        const dest = trav[TRAVELLER_FIELDS.DESTINATION];
        const destinationAddress =
          typeof dest === "object" && dest?.address != null
            ? dest.address
            : typeof dest === "string"
              ? dest
              : "N/A";
        return {
          id: userId ?? doc.id,
          name: `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim(),
          gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
          username: `${user?.username ?? "user"}`,
          photoURL: user?.[USER_FIELDS.PHOTO_URL] ?? null,
          destination: destinationAddress,
          flightDateTime: fData?.arrival?.estimatedActualTime
            ? new Date(fData.arrival.estimatedActualTime)
            : fData?.arrival?.scheduledTime
              ? new Date(fData.arrival.scheduledTime)
              : null,
          flightDepartureTime: fData?.departure?.scheduledTime
            ? new Date(fData.departure.scheduledTime)
            : null,

          terminal: trav[TRAVELLER_FIELDS.TERMINAL] || "N/A",
          flightNumber:
            `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ""} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ""}`.trim(),
          flightCarrier: flight?.[FLIGHT_FIELDS.CARRIER],
          flightNumberRaw: flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER],
          distanceFromUserKm: await calculateDistanceFromCurrentUser(
            typeof dest === "object" && dest?.placeId != null
              ? dest.placeId
              : undefined,
            placeId,
          ),
          bio: user?.bio || "No bio available.",
          tags: user?.tags || [],
          isVerified: user?.isVerified || false,
          connectionStatus,
          isOwnListing: uid ? userId === uid : false,
        };
      }),
    );

    return res.json({
      ok: true,
      data: results,
      isUserInGroup,
      userGroupId: userGroupId ?? undefined,
    });
  } catch (error: any) {
    console.error("Fetch Travellers Error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

const calculateDistanceFromCurrentUser = async (
  travellerPlaceId: any,
  userPlaceId: any,
) => {
  if (!userPlaceId) return 0;
  const distance = await roadDistanceBetweenTwoPoints(
    travellerPlaceId,
    userPlaceId,
  );
  return distance / 1000;
};

export async function checkTravellerHasListing(req: Request, res: Response) {
  const { airportCode } = req.query;
  const uid = req.auth?.uid;

  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!airportCode) {
    return res
      .status(400)
      .json({ ok: false, message: "Airport code is required" });
  }

  try {
    const destination = await getCurrentUserDestination(
      uid,
      airportCode as string,
    );
    return res.json({ ok: true, destinationAddress: destination?.address });
  } catch (error: any) {
    console.error("Check Listing Error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

const getCurrentUserDestination = async (uid: string, airportCode: string) => {
  const db = admin.firestore();

  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

    // Check if there is any traveller data for this user at the specified airport
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(
        TRAVELLER_FIELDS.FLIGHT_ARRIVAL,
        "==",
        String(airportCode).toUpperCase(),
      )
      .limit(1)
      .get();

    // Return the placeId
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].data().destination;
  } catch (error: any) {
    console.error("Check Listing Error:", error.message);
    return null;
  }
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const UID_MAX_LENGTH = 128;

export async function requestConnection(req: Request, res: Response) {
  const { travellerUid, flightCarrier, flightNumber } = req.body;
  const requesterUid = req.auth?.uid;
  if (!requesterUid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!isNonEmptyString(travellerUid)) {
    return res.status(400).json({
      ok: false,
      error: "Traveller UID is required and must be a non-empty string",
    });
  }
  const travellerUidTrimmed = travellerUid.trim();
  if (travellerUidTrimmed.length > UID_MAX_LENGTH) {
    return res
      .status(400)
      .json({ ok: false, error: "Traveller UID is too long" });
  }

  if (!isNonEmptyString(flightCarrier)) {
    return res.status(400).json({
      ok: false,
      error: "Flight carrier is required and must be a non-empty string",
    });
  }
  if (!isNonEmptyString(flightNumber)) {
    return res.status(400).json({
      ok: false,
      error: "Flight number is required and must be a non-empty string",
    });
  }
  const flightCarrierTrimmed = (flightCarrier as string).trim();
  const flightNumberTrimmed = (flightNumber as string).trim();

  if (requesterUid === travellerUidTrimmed) {
    return res
      .status(400)
      .json({ ok: false, error: "Cannot connect with yourself" });
  }

  console.log(
    travellerUidTrimmed,
    flightCarrierTrimmed,
    flightNumberTrimmed,
    requesterUid,
  );

  const db = admin.firestore();

  try {
    const travellerUserRef = db
      .collection(COLLECTIONS.USERS)
      .doc(travellerUidTrimmed);
    const requesterUserRef = db.collection(COLLECTIONS.USERS).doc(requesterUid);

    const travellerUserSnap = await travellerUserRef.get();
    if (!travellerUserSnap.exists) {
      return res
        .status(404)
        .json({ ok: false, error: "Traveller user not found" });
    }

    const travellerSnapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", travellerUserRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .get();

    if (travellerSnapshot.empty) {
      return res
        .status(404)
        .json({ ok: false, error: "Traveller trip not found" });
    }

    let targetTravellerDoc: admin.firestore.QueryDocumentSnapshot | null = null;
    let flightRef: admin.firestore.DocumentReference | null = null;

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
      flightRef = fRef;
    }

    if (!targetTravellerDoc) {
      return res.status(404).json({
        ok: false,
        error: "Matching flight trip not found for this traveller",
      });
    }

    // Insert into the connectionRequests field of travellerData and send a notification
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
  } catch (error: any) {
    console.error("Request Connection Error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Accept or reject a connection request received by the current user.
 * Body: { requesterUserId: string, action: ConnectionResponseAction }
 * - requesterUserId: the user who sent the connection request
 * - action: ConnectionResponseAction.ACCEPT or ConnectionResponseAction.REJECT
 */
export async function respondToConnectionRequest(req: Request, res: Response) {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res
      .status(400)
      .json({ ok: false, error: "Request body must be a JSON object" });
  }

  const { requesterUserId: rawRequesterUserId, action: rawAction } = body;
  const recipientUid = req.auth?.uid;

  if (!recipientUid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!isNonEmptyString(rawRequesterUserId)) {
    return res.status(400).json({
      ok: false,
      error: "requesterUserId is required and must be a non-empty string",
    });
  }
  const requesterUserId = (rawRequesterUserId as string).trim();

  const action = parseConnectionResponseAction(rawAction);
  if (action === null) {
    return res.status(400).json({
      ok: false,
      error: `action must be '${ConnectionResponseAction.ACCEPT}' or '${ConnectionResponseAction.REJECT}' (case-insensitive)`,
    });
  }

  if (requesterUserId === recipientUid) {
    return res
      .status(400)
      .json({ ok: false, error: "Cannot respond to your own request" });
  }

  const db = admin.firestore();
  const requesterUserRef = db
    .collection(COLLECTIONS.USERS)
    .doc(requesterUserId);
  const recipientUserRef = db.collection(COLLECTIONS.USERS).doc(recipientUid);

  try {
    const requesterUserSnap = await requesterUserRef.get();
    if (!requesterUserSnap.exists) {
      return res
        .status(404)
        .json({ ok: false, error: "Requester user not found" });
    }

    // 1. Get recipient's active traveller doc (the one who received the request)
    const recipientSnapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", recipientUserRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .limit(1)
      .get();

    if (recipientSnapshot.empty) {
      return res.status(404).json({
        ok: false,
        error: "No active traveller listing found for you",
      });
    }

    const recipientDoc = recipientSnapshot.docs[0];
    const recipientData = recipientDoc.data();
    const connectionRequests: admin.firestore.DocumentReference[] =
      recipientData[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];

    const hasRequest = connectionRequests.some(
      (ref: admin.firestore.DocumentReference) => ref.id === requesterUserId,
    );
    if (!hasRequest) {
      return res
        .status(400)
        .json({ ok: false, error: "No connection request from this user" });
    }

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

    // action === ConnectionResponseAction.ACCEPT
    const flightArrival = recipientData[TRAVELLER_FIELDS.FLIGHT_ARRIVAL];
    if (!flightArrival) {
      return res
        .status(500)
        .json({ ok: false, error: "Traveller listing missing flight arrival" });
    }

    // 2. Get requester's active traveller doc for the same airport
    const requesterSnapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", requesterUserRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", flightArrival)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", null)
      .limit(1)
      .get();

    if (requesterSnapshot.empty) {
      return res.status(404).json({
        ok: false,
        error:
          "Requester's trip not found for this airport (may have been removed)",
      });
    }

    const requesterTravellerDoc = requesterSnapshot.docs[0];

    // 3. Create group with both users. Groups can have members from different
    // flights/terminals, so we only store the airport (flightArrivalAirport) for querying.
    const groupRef = db.collection(COLLECTIONS.GROUPS).doc();
    await groupRef.set({
      [GROUP_FIELDS.GROUP_ID]: groupRef.id,
      [GROUP_FIELDS.NAME]: "New Group",
      [GROUP_FIELDS.MEMBERS]: [recipientUserRef, requesterUserRef],
      [GROUP_FIELDS.PENDING_REQUESTS]: [],
      [GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT]: flightArrival,
      [GROUP_FIELDS.CREATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
      [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Update both traveller docs: set groupRef and remove requester from recipient's connectionRequests
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
  } catch (error: any) {
    console.error("Respond to connection request error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

/**
 * GET /groups-by-airport/:airportCode
 * Returns groups at the given airport. Members can be from different flights/terminals.
 * Includes hasPendingJoinRequest when the current user has a pending join request for that group.
 */
export async function getGroupsByAirport(req: Request, res: Response) {
  const { airportCode } = req.params;
  const uid = req.auth?.uid;

  if (!airportCode) {
    return res
      .status(400)
      .json({ ok: false, message: "Airport code is required" });
  }

  const db = admin.firestore();
  const code = String(airportCode).toUpperCase();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.GROUPS)
      .where(GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT, "==", code)
      .get();

    if (snapshot.empty) {
      return res.json({ ok: true, data: [] });
    }

    // Collect unique member refs across all groups and batch-fetch user docs once
    const uniqueMemberRefs = new Map<
      string,
      admin.firestore.DocumentReference
    >();
    for (const doc of snapshot.docs) {
      const members: admin.firestore.DocumentReference[] =
        doc.data()[GROUP_FIELDS.MEMBERS] || [];
      for (const ref of members) {
        if (ref?.id) uniqueMemberRefs.set(ref.id, ref);
      }
    }
    const memberRefList = Array.from(uniqueMemberRefs.values());
    const userSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
    if (memberRefList.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < memberRefList.length; i += BATCH) {
        const chunk = memberRefList.slice(i, i + BATCH);
        const snaps = await db.getAll(...chunk);
        for (const snap of snaps) {
          userSnapMap.set(snap.id, snap);
        }
      }
    }

    const IN_QUERY_MAX = 10;
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const members: admin.firestore.DocumentReference[] =
          data[GROUP_FIELDS.MEMBERS] || [];
        const pendingRequests: admin.firestore.DocumentReference[] =
          data[GROUP_FIELDS.PENDING_REQUESTS] || [];
        const groupSize = members.length;
        const hasPendingJoinRequest =
          !!uid &&
          pendingRequests.some(
            (ref: admin.firestore.DocumentReference) => ref.id === uid,
          );

        let male = 0;
        let female = 0;
        const destinations: string[] = [];

        if (members.length > 0) {
          for (const memberRef of members) {
            const userSnap = userSnapMap.get(memberRef.id);
            if (userSnap) {
              const userData = userSnap.data();
              if (userData?.[USER_FIELDS.IS_FEMALE]) female++;
              else male++;
            }
          }
          // Fetch traveller docs in chunks of 10 (Firestore 'in' limit) to get destinations
          const travellerByUserId = new Map<
            string,
            admin.firestore.DocumentData
          >();
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
              const uRef = tData[
                TRAVELLER_FIELDS.USER_REF
              ] as admin.firestore.DocumentReference;
              if (uRef?.id) travellerByUserId.set(uRef.id, tData);
            }
          }
          for (const memberRef of members) {
            const tData = travellerByUserId.get(memberRef.id);
            if (tData) {
              const dest = tData[TRAVELLER_FIELDS.DESTINATION];
              const addr =
                typeof dest === "string" ? dest : (dest?.address ?? "N/A");
              destinations.push(addr);
            } else {
              destinations.push("N/A");
            }
          }
        }

        const createdAt = data[GROUP_FIELDS.CREATED_AT];
        const createdAtISO =
          createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
        const storedName = data[GROUP_FIELDS.NAME];
        const name =
          typeof storedName === "string" && storedName.trim().length > 0
            ? storedName.trim()
            : `Group of ${groupSize}`;

        return {
          id: doc.id,
          name,
          airportCode: code,
          destinations,
          groupSize,
          maxUsers: 6,
          genderBreakdown: { male, female },
          createdAt: createdAtISO,
          hasPendingJoinRequest,
        };
      }),
    );

    return res.json({ ok: true, data: results });
  } catch (error: any) {
    console.error("Get groups by airport error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

/**
 * GET /group-members/:groupId
 * Returns the list of group members as traveller-like objects (id, name, gender, destination, flightNumber, terminal).
 */
export async function getGroupMembers(req: Request, res: Response) {
  const rawId = req.params.groupId;
  const groupId =
    typeof rawId === "string"
      ? rawId.trim()
      : Array.isArray(rawId)
        ? (rawId[0]?.trim() ?? "")
        : "";

  if (!groupId) {
    return res.status(400).json({ ok: false, message: "Group ID is required" });
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];

    if (members.length === 0) {
      return res.json({ ok: true, data: [] });
    }

    // Single query for all traveller docs in this group (1 query, N reads)
    const travellerSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.GROUP_REF, "==", groupRef)
      .get();

    const travellerByUserId = new Map<string, admin.firestore.DocumentData>();
    const uniqueUserRefs = new Map<string, admin.firestore.DocumentReference>();
    const uniqueFlightRefs = new Map<
      string,
      admin.firestore.DocumentReference
    >();
    for (const m of members) {
      if (m?.id) uniqueUserRefs.set(m.id, m);
    }
    for (const d of travellerSnap.docs) {
      const trav = d.data();
      const uRef = trav[
        TRAVELLER_FIELDS.USER_REF
      ] as admin.firestore.DocumentReference;
      const fRef = trav[
        TRAVELLER_FIELDS.FLIGHT_REF
      ] as admin.firestore.DocumentReference;
      if (uRef?.id) {
        travellerByUserId.set(uRef.id, trav);
        uniqueUserRefs.set(uRef.id, uRef);
      }
      if (fRef?.id) uniqueFlightRefs.set(fRef.id, fRef);
    }

    const userRefList = Array.from(uniqueUserRefs.values());
    const flightRefList = Array.from(uniqueFlightRefs.values());
    const BATCH = 100;
    const userSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
    const flightSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
    for (let i = 0; i < userRefList.length; i += BATCH) {
      const snaps = await db.getAll(...userRefList.slice(i, i + BATCH));
      for (const snap of snaps) userSnapMap.set(snap.id, snap);
    }
    for (let i = 0; i < flightRefList.length; i += BATCH) {
      const snaps = await db.getAll(...flightRefList.slice(i, i + BATCH));
      for (const snap of snaps) flightSnapMap.set(snap.id, snap);
    }

    const memberDetails = members.map(
      (userRef: admin.firestore.DocumentReference) => {
        const trav = travellerByUserId.get(userRef.id);
        const userSnap = userSnapMap.get(userRef.id);
        const user = userSnap?.data();
        if (!trav) {
          return {
            id: userRef.id,
            name:
              `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim() ||
              "Unknown",
            gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
            photoURL: user?.[USER_FIELDS.PHOTO_URL] ?? null,
            username: user?.[USER_FIELDS.USERNAME] ?? null,
            destination: "N/A",
            terminal: "N/A",
            flightNumber: "—",
          };
        }
        const flightRef = trav[
          TRAVELLER_FIELDS.FLIGHT_REF
        ] as admin.firestore.DocumentReference;
        const flightSnap = flightRef?.id
          ? flightSnapMap.get(flightRef.id)
          : null;
        const flight = flightSnap?.data();
        const dest = trav[TRAVELLER_FIELDS.DESTINATION];
        const destinationAddress =
          typeof dest === "string" ? dest : (dest?.address ?? "N/A");
        return {
          id: userRef.id,
          name:
            `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim() ||
            "Unknown",
          gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
          photoURL: user?.[USER_FIELDS.PHOTO_URL] ?? null,
          username: user?.[USER_FIELDS.USERNAME] ?? null,
          destination: destinationAddress,
          terminal: trav[TRAVELLER_FIELDS.TERMINAL] || "N/A",
          flightNumber:
            `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ""} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ""}`.trim() ||
            "—",
        };
      },
    );

    return res.json({ ok: true, data: memberDetails });
  } catch (error: any) {
    console.error("Get group members error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

/**
 * Clear groupRef from a user's active traveller_data that points to the given group.
 */
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

/**
 * POST /leave-group
 * Body: { groupId: string }
 * Leaves the group, notifies other members. If size becomes 1, disbands and notifies the last member.
 */
export async function leaveGroup(req: Request, res: Response) {
  const { groupId } = req.body as { groupId?: string };
  const uid = req.auth?.uid;

  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!groupId || typeof groupId !== "string" || !groupId.trim()) {
    return res.status(400).json({ ok: false, error: "groupId is required" });
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId.trim());

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];

    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ ok: false, error: "You are not a member of this group" });
    }

    const remainingMembers = members.filter(
      (ref: admin.firestore.DocumentReference) => ref.id !== uid,
    );

    await clearUserGroupRef(db, userRef, groupRef);

    // If 0 or 1 remaining: delete group. If 1 remaining, clear their groupRef and send disband notification.
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

    await groupRef.update({
      [GROUP_FIELDS.MEMBERS]: remainingMembers,
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
  } catch (error: any) {
    console.error("Leave group error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

/**
 * POST /revoke-listing
 * Body: { airportCode: string }
 * Revokes the current user's active listing at the given airport.
 * Only allowed when the user is not in a group; otherwise use leave-group first.
 */
export async function revokeListing(req: Request, res: Response) {
  const { airportCode } = req.body as { airportCode?: string };
  const uid = req.auth?.uid;

  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!airportCode || typeof airportCode !== "string" || !airportCode.trim()) {
    return res
      .status(400)
      .json({ ok: false, error: "airportCode is required" });
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
      return res.status(404).json({
        ok: false,
        error: "No active listing found for this airport",
      });
    }

    const travellerDoc = snapshot.docs[0];

    await travellerDoc.ref.delete();

    return res.json({
      ok: true,
      message: "Listing revoked successfully",
    });
  } catch (error: any) {
    console.error("Revoke listing error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

const MAX_GROUP_USERS = 6;

/**
 * POST /request-join-group
 * Body: { groupId: string }
 * Adds current user to group's pendingRequests and notifies all existing members.
 */
export async function requestJoinGroup(req: Request, res: Response) {
  const { groupId } = req.body as { groupId?: string };
  const uid = req.auth?.uid;

  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (!groupId || typeof groupId !== "string" || !groupId.trim()) {
    return res.status(400).json({ ok: false, error: "groupId is required" });
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId.trim());
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    const pendingRequests: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.PENDING_REQUESTS] || [];
    const flightArrivalAirport = data?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as
      | string
      | undefined;

    if (
      members.some((ref: admin.firestore.DocumentReference) => ref.id === uid)
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "You are already a member of this group" });
    }
    if (
      pendingRequests.some(
        (ref: admin.firestore.DocumentReference) => ref.id === uid,
      )
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "You already have a pending join request" });
    }
    if (members.length >= MAX_GROUP_USERS) {
      return res.status(400).json({ ok: false, error: "Group is full" });
    }

    if (!flightArrivalAirport) {
      return res
        .status(400)
        .json({ ok: false, error: "Group has no airport; cannot join" });
    }

    const requesterTravellerSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", flightArrivalAirport)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .limit(1)
      .get();

    if (requesterTravellerSnap.empty) {
      return res.status(400).json({
        ok: false,
        error: "You need an active listing at this airport to join the group",
      });
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
  } catch (error: any) {
    console.error("Request join group error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

/**
 * GET /group-join-requests/:groupId
 * Returns pending join requests for the group. Only callable by a current member.
 */
export async function getGroupJoinRequests(req: Request, res: Response) {
  const rawId = req.params.groupId;
  const groupId =
    typeof rawId === "string"
      ? rawId.trim()
      : Array.isArray(rawId)
        ? (rawId[0]?.trim() ?? "")
        : "";
  const uid = req.auth?.uid;

  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (!groupId) {
    return res.status(400).json({ ok: false, message: "Group ID is required" });
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return res.status(404).json({ ok: false, error: "Group not found" });
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
      return res.status(403).json({
        ok: false,
        error: "Only group members can view join requests",
      });
    }

    if (pendingRequests.length === 0) {
      return res.json({ ok: true, data: [] });
    }

    const flightArrivalAirport = data?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as
      | string
      | undefined;
    const code = flightArrivalAirport ?? "";

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
  } catch (error: any) {
    console.error("Get group join requests error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

/**
 * POST /respond-to-join-request
 * Body: { groupId: string, requesterUserId: string, action: "accept" | "reject" }
 * Only a current member can accept or reject. Notifies requester, other members, and the decider.
 */
export async function respondToJoinRequest(req: Request, res: Response) {
  const { groupId, requesterUserId, action } = req.body as {
    groupId?: string;
    requesterUserId?: string;
    action?: string;
  };
  const uid = req.auth?.uid;

  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (
    !groupId ||
    typeof groupId !== "string" ||
    !groupId.trim() ||
    !requesterUserId ||
    typeof requesterUserId !== "string" ||
    !requesterUserId.trim()
  ) {
    return res
      .status(400)
      .json({ ok: false, error: "groupId and requesterUserId are required" });
  }
  const isAccept = action === "accept";
  const isReject = action === "reject";
  if (!isAccept && !isReject) {
    return res
      .status(400)
      .json({ ok: false, error: "action must be 'accept' or 'reject'" });
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
      return res.status(404).json({ ok: false, error: "Group not found" });
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
      return res.status(403).json({
        ok: false,
        error: "Only group members can respond to join requests",
      });
    }

    const requesterInPending = pendingRequests.some(
      (ref: admin.firestore.DocumentReference) =>
        ref.id === requesterUserId.trim(),
    );
    if (!requesterInPending) {
      return res.status(404).json({
        ok: false,
        error: "Join request not found or already handled",
      });
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

    if (isAccept) {
      if (members.length >= MAX_GROUP_USERS) {
        return res
          .status(400)
          .json({ ok: false, error: "Group is full; cannot add more members" });
      }
      if (!flightArrivalAirport) {
        return res
          .status(400)
          .json({ ok: false, error: "Group has no airport" });
      }

      const requesterTravellerSnap = await db
        .collection(COLLECTIONS.TRAVELLER_DATA)
        .where(TRAVELLER_FIELDS.USER_REF, "==", requesterUserRef)
        .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", flightArrivalAirport)
        .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
        .limit(1)
        .get();

      if (requesterTravellerSnap.empty) {
        return res.status(400).json({
          ok: false,
          error: "Requester no longer has an active listing at this airport",
        });
      }

      const newMembers = [...members, requesterUserRef];
      await groupRef.update({
        [GROUP_FIELDS.MEMBERS]: newMembers,
        [GROUP_FIELDS.PENDING_REQUESTS]: pendingRequests,
        [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
      });

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
  } catch (error: any) {
    console.error("Respond to join request error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

const GROUP_NAME_MAX_LENGTH = 50;
const GROUP_NAME_ALPHABETS_ONLY = /^[A-Za-z\s]+$/;

/**
 * PATCH /update-group-name
 * Body: { groupId: string, name: string }
 * Any group member can update the group name. Name: max 50 chars, alphabets (and spaces) only.
 */
export async function updateGroupName(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const body = req.body as { groupId?: string; name?: string };
  const groupId = typeof body?.groupId === "string" ? body.groupId.trim() : "";
  const rawName = typeof body?.name === "string" ? body.name : "";

  if (!groupId) {
    return res.status(400).json({ ok: false, error: "groupId is required" });
  }

  const name = rawName.trim();
  if (name.length === 0) {
    return res
      .status(400)
      .json({ ok: false, error: "Group name cannot be empty" });
  }
  console.log("name", name, name.length);
  if (name.length > GROUP_NAME_MAX_LENGTH) {
    return res.status(400).json({
      ok: false,
      error: `Group name must be at most ${GROUP_NAME_MAX_LENGTH} characters`,
    });
  }
  if (!GROUP_NAME_ALPHABETS_ONLY.test(name)) {
    return res.status(400).json({
      ok: false,
      error: "Group name can only contain letters (A–Z, a–z) and spaces",
    });
  }

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);

  try {
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      data?.[GROUP_FIELDS.MEMBERS] || [];
    const isMember = members.some(
      (ref: admin.firestore.DocumentReference) => ref.id === uid,
    );
    if (!isMember) {
      return res.status(403).json({
        ok: false,
        error: "Only group members can update the group name",
      });
    }

    await groupRef.update({
      [GROUP_FIELDS.NAME]: name,
      [GROUP_FIELDS.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, message: "Group name updated", name });
  } catch (error: any) {
    console.error("Update group name error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
