import { admin, adminInitialized } from "../config/firebase";
import { requestConnection } from "../controllers/travellerController";
import {
  COLLECTIONS,
  TRAVELLER_FIELDS,
  GROUP_FIELDS,
  USER_FIELDS,
} from "../core/db";
import { Request, Response } from "express";

// Mock Express Request and Response
const mockRequest = (body: any, auth: any) =>
  ({
    body,
    auth,
  }) as unknown as Request;

const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return res;
};

async function runTest() {
  if (!adminInitialized) {
    console.error("Firebase Admin not initialized. Exiting.");
    process.exit(1);
  }

  const db = admin.firestore();

  // Create Test Users
  const travellerUid = "test_traveller_" + Date.now();
  const requesterUid = "test_requester_" + Date.now();
  const carrier = "XX";
  const flightNumber = "123";

  console.log(
    `Creating test users: Traveller=${travellerUid}, Requester=${requesterUid}`,
  );

  try {
    await db
      .collection(COLLECTIONS.USERS)
      .doc(travellerUid)
      .set({
        [USER_FIELDS.FIRST_NAME]: "Test",
        [USER_FIELDS.LAST_NAME]: "Traveller",
        [USER_FIELDS.USERNAME]: "traveller_user",
      });

    await db
      .collection(COLLECTIONS.USERS)
      .doc(requesterUid)
      .set({
        [USER_FIELDS.FIRST_NAME]: "Test",
        [USER_FIELDS.LAST_NAME]: "Requester",
        [USER_FIELDS.USERNAME]: "requester_user",
      });

    // Create Dummy Flight
    const flightRef = db
      .collection(COLLECTIONS.FLIGHT_DETAIL)
      .doc("dummy_flight_ref");
    await flightRef.set({
      carrier: carrier,
      flightNumber: flightNumber,
      flightDate: "2025-01-01",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create Traveller Data
    console.log("Creating Traveller Data...");
    await db.collection(COLLECTIONS.TRAVELLER_DATA).add({
      [TRAVELLER_FIELDS.USER_REF]: db
        .collection(COLLECTIONS.USERS)
        .doc(travellerUid),
      [TRAVELLER_FIELDS.DESTINATION]: { address: "Test Destination" },
      [TRAVELLER_FIELDS.FLIGHT_ARRIVAL]: "JFK",
      [TRAVELLER_FIELDS.CREATED_AT]:
        admin.firestore.FieldValue.serverTimestamp(),
      [TRAVELLER_FIELDS.FLIGHT_REF]: flightRef,
    });

    // Test 1: Successful Connection Request
    console.log("Test 1: Sending Connection Request");
    const req = mockRequest(
      {
        travellerUid,
        flightCarrier: carrier,
        flightNumber: flightNumber,
      },
      { uid: requesterUid },
    );
    const res = mockResponse();

    await requestConnection(req, res);

    if (res.statusCode && res.statusCode !== 200) {
      console.error("Test 1 Failed:", res.data);
    } else {
      console.log("Test 1 Success Response:", res.data);
      if (res.data?.ok) {
        console.log("Checking DB for Group creation...");
        const groupId = res.data.groupId;
        const groupDoc = await db
          .collection(COLLECTIONS.GROUPS)
          .doc(groupId)
          .get();
        if (groupDoc.exists) {
          console.log("Group exists!");
          const data = groupDoc.data();
          const pending = data?.[GROUP_FIELDS.PENDING_REQUESTS].map(
            (r: any) => r.id,
          );
          if (pending.includes(requesterUid)) {
            console.log("Requester is in pending list!");
          } else {
            console.error("Requester NOT in pending list!");
          }
        } else {
          console.error("Group was not created!");
        }

        // Check Traveller Data Update
        console.log("Checking Traveller Data Update (connectionRequests)...");
        const tSnap = await db
          .collection(COLLECTIONS.TRAVELLER_DATA)
          .where(
            TRAVELLER_FIELDS.USER_REF,
            "==",
            db.collection(COLLECTIONS.USERS).doc(travellerUid),
          )
          .get();

        const tData = tSnap.docs[0].data();
        const cr = tData[TRAVELLER_FIELDS.CONNECTION_REQUESTS] || [];
        // Check if requesterUid is in the array of references
        const isRequestPresent = cr.some((ref: any) => ref.id === requesterUid);

        if (isRequestPresent) {
          console.log("Traveller Data updated with connectionRequests!");
        } else {
          console.error(
            "Traveller Data NOT updated correctly (connectionRequests missing):",
            tData,
          );
        }

        console.log("Checking for Notification...");
        const notifSnap = await db
          .collection(COLLECTIONS.NOTIFICATIONS)
          .where(
            "recipientRef",
            "==",
            db.collection(COLLECTIONS.USERS).doc(travellerUid),
          )
          .where("type", "==", "CONNECTION_REQUEST")
          .limit(1)
          .get();

        if (!notifSnap.empty) {
          console.log("Notification found!");
        } else {
          console.error("Notification NOT found!");
        }
      }
    }

    // Cleanup
    console.log("Cleaning up test data...");
    await db.collection(COLLECTIONS.USERS).doc(travellerUid).delete();
    await db.collection(COLLECTIONS.USERS).doc(requesterUid).delete();
    await flightRef.delete();
    // Ideally delete traveller data and group too

    console.log("Usage Test Finished.");
    process.exit(0);
  } catch (e: any) {
    console.error("Test Error:", e);
    process.exit(1);
  }
}

runTest();
