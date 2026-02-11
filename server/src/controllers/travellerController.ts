import type { Request, Response } from "express";
import { admin } from "../firebase/admin";
import { COLLECTIONS, TRAVELLER_FIELDS } from "../constants/db";
import { roadDistanceBetweenTwoPoints } from "../utils/controllerUtils";
import { notifyUserOfConnectionRequest } from "./notificationController";

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
        if (currentUserTravellerData[TRAVELLER_FIELDS.GROUP_REF]) {
          isUserInGroup = true;
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
      return res.json({ ok: true, data: [], isUserInGroup });
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
    return res.json({ ok: true, data: filteredResults, isUserInGroup }); // Added isUserInGroup
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

export async function requestConnection(req: Request, res: Response) {
  const { travellerUid, flightCarrier, flightNumber } = req.body;
  const requesterUid = req.auth?.uid;
  if (!requesterUid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!travellerUid) {
    return res
      .status(400)
      .json({ ok: false, error: "Traveller UID is required" });
  }

  if (!flightCarrier || !flightNumber) {
    return res
      .status(400)
      .json({ ok: false, error: "Flight details required" });
  }

  if (requesterUid === travellerUid) {
    return res
      .status(400)
      .json({ ok: false, error: "Cannot connect with yourself" });
  }

  console.log(travellerUid, flightCarrier, flightNumber, requesterUid);

  const db = admin.firestore();

  try {
    const travellerUserRef = db.collection(COLLECTIONS.USERS).doc(travellerUid);
    const requesterUserRef = db.collection(COLLECTIONS.USERS).doc(requesterUid);

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
      (fData.carrier === flightCarrier || fData.flightNumber === flightNumber)
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
