import type { Request, Response } from "express";
import { admin } from "../firebase/admin";
import { COLLECTIONS, TRAVELLER_FIELDS } from "../constants/db";

export async function getTravellersByAirport(req: Request, res: Response) {
  const { airportCode } = req.params; // e.g., "DEL"

  if (!airportCode) {
    return res
      .status(400)
      .json({ ok: false, message: "Airport code is required" });
  }

  const db = admin.firestore();

  try {
    // 1. Fetch all travellers associated with this airport (as the origin)
    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(
        TRAVELLER_FIELDS.FLIGHT_ARRIVAL,
        "==",
        String(airportCode).toUpperCase(),
      )
      .get();

    if (snapshot.empty) {
      return res.json({ ok: true, data: [] });
    }

    // 2. Resolve Relationships (Fetch User and Flight data for each record)
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

        // 3. Construct the response object
        return {
          id: userSnap.id, // UID from Firestore
          name: `${user?.FirstName ?? ""} ${user?.LastName ?? ""}`.trim(),
          gender: user?.isFemale ? "Female" : "Male",
          username: `@${user?.username ?? "user"}`,
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
          distanceFromUserKm: 0,
          bio: user?.bio || "No bio available.",
          tags: user?.tags || [],
          isVerified: user?.isVerified || false,
        };
      }),
    );
    return res.json({ ok: true, data: results });
  } catch (error: any) {
    console.error("Fetch Travellers Error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

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

    return res.json({ ok: true, hasListing: !snapshot.empty });
  } catch (error: any) {
    console.error("Check Listing Error:", error.message);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
