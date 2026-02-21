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

    // 3. Resolve Relationships (Fetch User and Flight data for each record)
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const trav = doc.data();

        const [userSnap, flightSnap] = await Promise.all([
          (trav.userRef as admin.firestore.DocumentReference).get(),
          (trav.flightRef as admin.firestore.DocumentReference).get(),
        ]);

        const user = userSnap.data();
        const flight = flightSnap.data();
        const fData = flight?.flightData;

        // Check connection status
        let connectionStatus = "SEND_REQUEST";
        if (uid) {
          // 1. Check if I sent a request to them
          const theirConnectionRequests =
            trav[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];
          const hasSentRequest = theirConnectionRequests.some(
            (ref: any) => ref.id === uid,
          );

          if (hasSentRequest) {
            connectionStatus = "REQUEST_SENT";
          } else if (currentUserTravellerData) {
            // 2. Check if they sent a request to me
            const myConnectionRequests =
              currentUserTravellerData[TRAVELLER_FIELDS.CONNECTION_REQUESTS] ||
              [];
            const hasReceivedRequest = myConnectionRequests.some(
              (ref: any) => ref.id === userSnap.id,
            );
            if (hasReceivedRequest) {
              connectionStatus = "REQUEST_RECEIVED";
            }
          }
        }

        // 4. Construct the response object
        return {
          id: userSnap.id, // UID from Firestore
          name: `${user?.FirstName ?? ""} ${user?.LastName ?? ""}`.trim(),
          gender: user?.isFemale ? "Female" : "Male",
          username: `${user?.username ?? "user"}`,
          destination: trav.destination.address || "N/A",
          flightDateTime: fData?.arrival?.estimatedActualTime
            ? new Date(fData.arrival.estimatedActualTime)
            : fData?.arrival?.scheduledTime
              ? new Date(fData.arrival.scheduledTime)
              : null,
          flightDepartureTime: fData?.departure?.scheduledTime
            ? new Date(fData.departure.scheduledTime)
            : null,

          terminal: trav.terminal || "N/A",
          flightNumber:
            `${flight?.carrier || ""} ${flight?.flightNumber || ""}`.trim(),
          flightCarrier: flight?.carrier,
          flightNumberRaw: flight?.flightNumber,
          distanceFromUserKm: await calculateDistanceFromCurrentUser(
            trav.destination.placeId,
            placeId,
          ),
          bio: user?.bio || "No bio available.",
          tags: user?.tags || [],
          isVerified: user?.isVerified || false,
          connectionStatus, // Added
        };
      }),
    );

    const filteredResults = results.filter((result) => result.id !== uid);
    return res.json({
      ok: true,
      data: filteredResults,
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
 */
export async function getGroupsByAirport(req: Request, res: Response) {
  const { airportCode } = req.params;

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

    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const members: admin.firestore.DocumentReference[] =
          data[GROUP_FIELDS.MEMBERS] || [];
        const groupSize = members.length;

        let male = 0;
        let female = 0;
        const destinations: string[] = [];

        if (members.length > 0) {
          const [userSnaps, ...travellerSnaps] = await Promise.all([
            Promise.all(
              members.map((ref: admin.firestore.DocumentReference) => ref.get()),
            ),
            ...members.map((memberRef: admin.firestore.DocumentReference) =>
              db
                .collection(COLLECTIONS.TRAVELLER_DATA)
                .where(TRAVELLER_FIELDS.USER_REF, "==", memberRef)
                .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", code)
                .limit(1)
                .get(),
            ),
          ]);

          (userSnaps as admin.firestore.DocumentSnapshot[]).forEach((snap) => {
            const userData = snap.data();
            if (userData?.[USER_FIELDS.IS_FEMALE]) female++;
            else male++;
          });

          (travellerSnaps as admin.firestore.QuerySnapshot[]).forEach(
            (tSnap) => {
              if (!tSnap.empty) {
                const tData = tSnap.docs[0].data();
                const dest = tData[TRAVELLER_FIELDS.DESTINATION];
                const addr =
                  typeof dest === "string"
                    ? dest
                    : (dest?.address ?? "N/A");
                destinations.push(addr);
              } else {
                destinations.push("N/A");
              }
            },
          );
        }

        const createdAt = data[GROUP_FIELDS.CREATED_AT];
        const createdAtISO =
          createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();

        return {
          id: doc.id,
          name: `Group of ${groupSize}`,
          airportCode: code,
          destinations,
          groupSize,
          maxUsers: 6,
          genderBreakdown: { male, female },
          createdAt: createdAtISO,
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
    typeof rawId === "string" ? rawId.trim() : Array.isArray(rawId) ? rawId[0]?.trim() ?? "" : "";

  if (!groupId) {
    return res
      .status(400)
      .json({ ok: false, message: "Group ID is required" });
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

    const memberDetails = await Promise.all(
      members.map(
        async (userRef: admin.firestore.DocumentReference) => {
          const travellerSnap = await db
            .collection(COLLECTIONS.TRAVELLER_DATA)
            .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
            .where(TRAVELLER_FIELDS.GROUP_REF, "==", groupRef)
            .limit(1)
            .get();

          if (travellerSnap.empty) {
            const userSnap = await userRef.get();
            const user = userSnap.data();
            return {
              id: userRef.id,
              name: `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim() || "Unknown",
              gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
              destination: "N/A",
              terminal: "N/A",
              flightNumber: "—",
            };
          }

          const trav = travellerSnap.docs[0].data();
          const [userSnap, flightSnap] = await Promise.all([
            (trav[TRAVELLER_FIELDS.USER_REF] as admin.firestore.DocumentReference).get(),
            (trav[TRAVELLER_FIELDS.FLIGHT_REF] as admin.firestore.DocumentReference).get(),
          ]);
          const user = userSnap.data();
          const flight = flightSnap.data();
          const dest = trav[TRAVELLER_FIELDS.DESTINATION];
          const destinationAddress =
            typeof dest === "string"
              ? dest
              : (dest?.address ?? "N/A");

          return {
            id: userRef.id,
            name: `${user?.[USER_FIELDS.FIRST_NAME] ?? ""} ${user?.[USER_FIELDS.LAST_NAME] ?? ""}`.trim() || "Unknown",
            gender: user?.[USER_FIELDS.IS_FEMALE] ? "Female" : "Male",
            destination: destinationAddress,
            terminal: trav[TRAVELLER_FIELDS.TERMINAL] || "N/A",
            flightNumber:
              `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ""} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ""}`.trim() || "—",
          };
        },
      ),
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
    return res
      .status(400)
      .json({ ok: false, error: "groupId is required" });
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
    const isMember = members.some((ref: admin.firestore.DocumentReference) => ref.id === uid);
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
