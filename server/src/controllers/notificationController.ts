import type { Request, Response } from "express";
import { admin } from "../config/firebase";
import {
  COLLECTIONS,
  NOTIFICATION_FIELDS,
  GROUP_FIELDS,
  TRAVELLER_FIELDS,
} from "../core/db";
import {
  CreateNotificationPayload,
  NotificationType,
  NOTIFICATION_ACTION_TYPES,
} from "../types/notifications";
import {
  createNotification,
  getGroupInfo,
  getGroupDisplayName,
} from "../modules/notification/notification.service";
import { roadDistanceBetweenTwoPoints } from "../utils/controllerUtils";
import {
  badRequest,
  unauthorized,
  notFound,
  forbidden,
  internalServerError,
} from "../core/errors";

const NEARBY_LISTING_MAX_DISTANCE_METERS = 5000;

/**
 * Use Case 1: Notify users near a new listing (traveller).
 * This should be called after a new Traveller is created.
 *
 * Strategy:
 * - Use the new traveller's destination (placeId) and airport from the provided data
 *   (no extra Firestore read for the new listing itself).
 * - Find other active travellers at the same airport with a destination placeId.
 * - For each, compute road distance between the two destinations using Google Distance Matrix.
 * - If within NEARBY_LISTING_MAX_DISTANCE_METERS, send a NEW_LISTING notification
 *   to the existing traveller, with an OPEN_TRAVELLER action pointing to the new listing.
 */
export async function notifyUsersNearNewListing(
  travellerRef: admin.firestore.DocumentReference,
  travellerData: admin.firestore.DocumentData,
) {
  const db = admin.firestore();

  try {
    if (!travellerData) {
      console.warn(
        `[Notification] Missing traveller data for ${travellerRef.id} when checking nearby listings.`,
      );
      return;
    }

    const destination = travellerData[TRAVELLER_FIELDS.DESTINATION];
    const flightArrival = travellerData[TRAVELLER_FIELDS.FLIGHT_ARRIVAL] as
      | string
      | undefined;
    const userRef = travellerData[TRAVELLER_FIELDS.USER_REF] as
      | admin.firestore.DocumentReference
      | undefined;

    const placeId =
      destination &&
      typeof destination === "object" &&
      "placeId" in destination &&
      (destination as { placeId?: string }).placeId
        ? (destination as { placeId?: string }).placeId
        : undefined;

    const address =
      typeof destination === "string"
        ? destination
        : ((destination?.address as string | undefined) ?? undefined);

    if (!placeId || !flightArrival || !userRef?.id) {
      console.warn(
        `[Notification] Skipping nearby listing check for ${travellerRef.id} – missing placeId, airport or userRef.`,
      );
      return;
    }

    const airportCode = String(flightArrival).toUpperCase();
    const newUserId = userRef.id;
    const newTravellerId = travellerRef.id;

    const userSnap = await db
      .collection(COLLECTIONS.USERS)
      .doc(newUserId)
      .get();
    const ownerFirstName = userSnap.exists
      ? userSnap.data()?.["FirstName"]
      : undefined;
    const ownerDisplayName = ownerFirstName || "Another traveller";

    const snapshot = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.FLIGHT_ARRIVAL, "==", airportCode)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .get();

    if (snapshot.empty) {
      return;
    }

    const candidates = snapshot.docs.filter((doc) => doc.id !== newTravellerId);

    const notifications: Promise<unknown>[] = [];

    for (const doc of candidates) {
      const data = doc.data();
      const otherUserRef = data[TRAVELLER_FIELDS.USER_REF] as
        | admin.firestore.DocumentReference
        | undefined;
      if (!otherUserRef?.id || otherUserRef.id === newUserId) continue;

      const otherDestination = data[TRAVELLER_FIELDS.DESTINATION];
      const otherPlaceId =
        otherDestination &&
        typeof otherDestination === "object" &&
        "placeId" in otherDestination &&
        (otherDestination as { placeId?: string }).placeId
          ? (otherDestination as { placeId?: string }).placeId
          : undefined;

      if (!otherPlaceId) continue;

      let distanceMeters: number;
      try {
        distanceMeters = await roadDistanceBetweenTwoPoints(
          placeId,
          otherPlaceId,
        );
      } catch (err) {
        console.error(
          "[Notification] Failed to compute distance between destinations:",
          err,
        );
        continue;
      }

      if (distanceMeters > NEARBY_LISTING_MAX_DISTANCE_METERS) continue;

      const distanceKm = distanceMeters / 1000;

      const body = `New traveller nearby: ${distanceKm.toFixed(
        1,
      )} km from your destination.`;

      notifications.push(
        createNotification({
          recipientUserId: otherUserRef.id,
          type: NotificationType.NEW_LISTING,
          title: "New traveller near your destination",
          body,
          data: {
            listingId: newTravellerId,
            actorUserId: newUserId,
            airportCode,
            metadata: {
              distanceMeters,
            },
            action: {
              type: NOTIFICATION_ACTION_TYPES.OPEN_TRAVELLER,
              payload: {
                airportCode,
                userId: newUserId,
              },
            },
          },
        }),
      );
    }

    if (notifications.length > 0) {
      await Promise.all(notifications);
    }
  } catch (e) {
    console.error("[Notification] Error notifying users near new listing:", e);
  }
}

/**
 * Use Case 2: Join Group Request — notify all current group members (no admin).
 */
export async function notifyGroupAdminOfJoinRequest(
  groupId: string,
  requesterUserId: string,
) {
  const db = admin.firestore();
  try {
    const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(groupId).get();
    if (!groupDoc.exists) return;

    const groupData = groupDoc.data();
    const members: admin.firestore.DocumentReference[] =
      groupData?.[GROUP_FIELDS.MEMBERS] || [];
    const { name: groupName, airportCode } = await getGroupInfo(db, groupId);

    const userSnap = await db
      .collection(COLLECTIONS.USERS)
      .doc(requesterUserId)
      .get();
    const userName = userSnap.exists
      ? userSnap.data()?.["FirstName"]
      : "Someone";

    await Promise.all(
      members.map((memberRef: admin.firestore.DocumentReference) =>
        createNotification({
          recipientUserId: memberRef.id,
          type: NotificationType.GROUP_JOIN_REQUEST,
          title: "New Join Request",
          body: `${userName} wants to join your group ${groupName}.`,
          data: {
            groupId,
            actorUserId: requesterUserId,
            groupName,
            ...(airportCode && {
              airportCode,
              action: {
                type: NOTIFICATION_ACTION_TYPES.OPEN_GROUP,
                payload: { airportCode, groupId },
              },
            }),
          },
        }),
      ),
    );
  } catch (e) {
    console.error("Notify Group Members (Join Request) Error:", e);
  }
}

/**
 * Notify all other group members that a member left.
 */
export async function notifyGroupMembersMemberLeft(
  memberUserIds: string[],
  leaverUserId: string,
  groupId: string,
) {
  const db = admin.firestore();
  try {
    const groupName = await getGroupDisplayName(db, groupId);
    const leaverSnap = await db
      .collection(COLLECTIONS.USERS)
      .doc(leaverUserId)
      .get();
    const leaverName = leaverSnap.exists
      ? leaverSnap.data()?.["FirstName"]
      : "Someone";

    await Promise.all(
      memberUserIds.map((recipientId) =>
        createNotification({
          recipientUserId: recipientId,
          type: NotificationType.GROUP_MEMBER_LEFT,
          title: "Member left group",
          body: `${leaverName} left the group ${groupName}.`,
          data: { groupId, actorUserId: leaverUserId, groupName },
        }),
      ),
    );
  } catch (e) {
    console.error("Notify Group Members (Member Left) Error:", e);
  }
}

/**
 * Notify the last remaining member that the group was disbanded.
 */
export async function notifyGroupDisbanded(
  lastMemberUserId: string,
  groupId: string,
) {
  const db = admin.firestore();
  try {
    const groupName = await getGroupDisplayName(db, groupId);
    await createNotification({
      recipientUserId: lastMemberUserId,
      type: NotificationType.GROUP_DISBANDED,
      title: "Group disbanded",
      body: `The group ${groupName} has been disbanded because the other member left.`,
      data: { groupId, groupName },
    });
  } catch (e) {
    console.error("Notify Group Disbanded Error:", e);
  }
}

/**
 * Use Case 3: Join Accepted
 */
export async function notifyUserJoinAccepted(
  groupId: string,
  newMemberId: string,
) {
  const db = admin.firestore();
  const { name: groupName, airportCode } = await getGroupInfo(db, groupId);
  await createNotification({
    recipientUserId: newMemberId,
    type: NotificationType.GROUP_JOIN_ACCEPTED,
    title: "Join Request Accepted",
    body: `You have been accepted into the group ${groupName}.`,
    data: {
      groupId,
      groupName,
      ...(airportCode && {
        airportCode,
        action: {
          type: NOTIFICATION_ACTION_TYPES.OPEN_GROUP,
          payload: { airportCode, groupId },
        },
      }),
    },
  });
}

/**
 * Notify the requester that their join request was rejected.
 */
export async function notifyUserJoinRejected(
  requesterUserId: string,
  groupId: string,
  deciderName?: string,
) {
  const db = admin.firestore();
  const { name: groupName, airportCode } = await getGroupInfo(db, groupId);
  const body = deciderName
    ? `${deciderName} declined your request to join the group ${groupName}.`
    : `Your request to join the group ${groupName} was declined.`;
  await createNotification({
    recipientUserId: requesterUserId,
    type: NotificationType.GROUP_JOIN_REJECTED,
    title: "Join Request Declined",
    body,
    data: {
      groupId,
      groupName,
      ...(airportCode && {
        airportCode,
        action: {
          type: NOTIFICATION_ACTION_TYPES.OPEN_GROUP,
          payload: { airportCode, groupId },
        },
      }),
    },
  });
}

/**
 * Notify other group members (excluding decider and requester) that a join request was accepted or rejected.
 */
export async function notifyOtherMembersJoinDecided(
  memberUserIds: string[],
  groupId: string,
  deciderUserId: string,
  deciderName: string,
  requesterUserId: string,
  requesterName: string,
  accepted: boolean,
) {
  const db = admin.firestore();
  const { name: groupName, airportCode } = await getGroupInfo(db, groupId);
  const recipients = memberUserIds.filter(
    (id) => id !== deciderUserId && id !== requesterUserId,
  );
  const action = accepted ? "accepted" : "rejected";
  const title = accepted ? "Join request accepted" : "Join request declined";
  const body = `${deciderName} ${action} ${requesterName}'s request to join the group ${groupName}.`;
  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({
        recipientUserId: recipientId,
        type: NotificationType.GROUP_JOIN_REQUEST_DECIDED,
        title,
        body,
        data: {
          groupId,
          groupName,
          actorUserId: deciderUserId,
          metadata: { requesterUserId, accepted },
          ...(airportCode && {
            airportCode,
            action: {
              type: NOTIFICATION_ACTION_TYPES.OPEN_GROUP,
              payload: { airportCode, groupId },
            },
          }),
        },
      }),
    ),
  );
}

/**
 * Notify the member who accepted/rejected the request (the decider).
 */
export async function notifyDeciderJoinRequestDecided(
  deciderUserId: string,
  requesterName: string,
  accepted: boolean,
  groupId: string,
) {
  const db = admin.firestore();
  const { name: groupName, airportCode } = await getGroupInfo(db, groupId);
  const title = accepted
    ? "You accepted the join request"
    : "You declined the join request";
  const body = accepted
    ? `You accepted ${requesterName} into the group ${groupName}.`
    : `You declined ${requesterName}'s request to join the group ${groupName}.`;
  await createNotification({
    recipientUserId: deciderUserId,
    type: NotificationType.GROUP_JOIN_REQUEST_DECIDED,
    title,
    body,
    data: {
      groupId,
      groupName,
      metadata: { accepted },
      ...(airportCode && {
        airportCode,
        action: {
          type: NOTIFICATION_ACTION_TYPES.OPEN_GROUP,
          payload: { airportCode, groupId },
        },
      }),
    },
  });
}

/**
 * Use Case 4: Connection Request
 */
export async function notifyUserOfConnectionRequest(
  travellerDataId: string,
  requesterUserId: string,
) {
  const db = admin.firestore();
  try {
    const travellerDataDoc = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .doc(travellerDataId)
      .get();
    if (!travellerDataDoc.exists) return;

    const travellerData = travellerDataDoc.data();
    if (!travellerData) {
      return new Error("Traveller data not found");
    }
    const recipientRef = travellerData[TRAVELLER_FIELDS.USER_REF];
    const recipientId = recipientRef.id;
    if (!recipientId) {
      return new Error("Recipient not found");
    }
    // Fetch requester name for better message
    const userSnap = await db
      .collection(COLLECTIONS.USERS)
      .doc(requesterUserId)
      .get();
    const userName = userSnap.exists
      ? userSnap.data()?.["FirstName"]
      : "Someone";

    const airportCode = travellerData[TRAVELLER_FIELDS.FLIGHT_ARRIVAL] as
      | string
      | undefined;

    await createNotification({
      recipientUserId: recipientId,
      type: NotificationType.CONNECTION_REQUEST,
      title: "New Connection Request",
      body: `${userName} wants to connect with you.`,
      data: {
        listingId: travellerDataId,
        actorUserId: requesterUserId,
        ...(airportCode && {
          airportCode,
          action: {
            type: NOTIFICATION_ACTION_TYPES.OPEN_TRAVELLER,
            payload: { airportCode, userId: requesterUserId },
          },
        }),
      },
    });
  } catch (e) {
    console.error("Notify Connection Request Error:", e);
  }
}

/**
 * Notify the requester that their connection request was accepted or rejected.
 */
export async function notifyConnectionRequestResponded(
  requesterUserId: string,
  recipientUserId: string,
  status: "accepted" | "rejected",
  groupId?: string,
) {
  const db = admin.firestore();
  try {
    const recipientSnap = await db
      .collection(COLLECTIONS.USERS)
      .doc(recipientUserId)
      .get();
    const recipientName = recipientSnap.exists
      ? recipientSnap.data()?.["FirstName"]
      : "Someone";

    if (status === "accepted" && groupId) {
      const { name: groupName, airportCode } = await getGroupInfo(db, groupId);
      await createNotification({
        recipientUserId: requesterUserId,
        type: NotificationType.CONNECTION_ACCEPTED,
        title: "Connection request accepted",
        body: `${recipientName} accepted your connection request. You're now in a group together: ${groupName}.`,
        data: {
          groupId,
          groupName,
          actorUserId: recipientUserId,
          ...(airportCode && {
            airportCode,
            action: {
              type: NOTIFICATION_ACTION_TYPES.OPEN_GROUP,
              payload: { airportCode, groupId },
            },
          }),
        },
      });
    } else if (status === "rejected") {
      await createNotification({
        recipientUserId: requesterUserId,
        type: NotificationType.CONNECTION_REJECTED,
        title: "Connection request declined",
        body: `${recipientName} declined your connection request.`,
        data: { actorUserId: recipientUserId },
      });
    }
  } catch (e) {
    console.error("Notify connection request responded error:", e);
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(req: Request, res: Response) {
  const uid = req.auth?.uid;
  const rawNotificationId = req.params.notificationId;
  const notificationId =
    typeof rawNotificationId === "string"
      ? rawNotificationId.trim()
      : String(rawNotificationId ?? "").trim();

  if (!uid) return unauthorized(res, "Unauthorized");
  if (!notificationId) return badRequest(res, "Notification ID is required");

  const db = admin.firestore();
  try {
    const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
    const doc = await ref.get();

    if (!doc.exists) {
      return notFound(res, "Notification not found");
    }

    const data = doc.data();
    const recipientRef = data?.[NOTIFICATION_FIELDS.RECIPIENT_REF];
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

    if (!recipientRef || recipientRef.path !== userRef.path) {
      return forbidden(res, "Not allowed to mark this notification as read");
    }

    await ref.update({
      [NOTIFICATION_FIELDS.IS_READ]: true,
    });

    return res.json({ ok: true });
  } catch (error: unknown) {
    console.error("Mark Read Error:", error);
    return internalServerError(
      res,
      error instanceof Error ? error.message : "Failed to mark as read",
    );
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, "Unauthorized");

  const db = admin.firestore();
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const batch = db.batch();
    const snapshot = await db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where(NOTIFICATION_FIELDS.RECIPIENT_REF, "==", userRef)
      .where(NOTIFICATION_FIELDS.IS_READ, "==", false)
      .limit(500) // Batch limit
      .get();

    if (snapshot.empty) return res.json({ ok: true, count: 0 });

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { [NOTIFICATION_FIELDS.IS_READ]: true });
    });

    await batch.commit();
    return res.json({ ok: true, count: snapshot.size });
  } catch (error: unknown) {
    return internalServerError(
      res,
      error instanceof Error ? error.message : "Failed to mark all as read",
    );
  }
}

/**
 * SEEDER (FOR DEVELOPMENT)
 */
export async function seedDummyNotifications(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, "Unauthorized");

  try {
    const dummyData: CreateNotificationPayload[] = [
      {
        recipientUserId: uid,
        type: NotificationType.NEW_LISTING,
        title: "New Traveller Detected",
        body: "A traveller matching your criteria has arrived at JFK.",
        data: { listingId: "dummy_listing_123" },
      },
      {
        recipientUserId: uid,
        type: NotificationType.GROUP_JOIN_REQUEST,
        title: "Join Request",
        body: "John Doe wants to join your group 'Weekend Trip'.",
        data: { groupId: "dummy_group_456", actorUserId: "dummy_user_john" },
      },
      {
        recipientUserId: uid,
        type: NotificationType.GROUP_JOIN_ACCEPTED,
        title: "Request Accepted",
        body: "Your request to join 'Bali Squad' has been accepted.",
        data: { groupId: "dummy_group_789" },
      },
    ];

    const results = [];
    for (const payload of dummyData) {
      const result = await createNotification(payload);
      results.push(result);
    }

    return res.json({
      ok: true,
      message: "Seeded 3 dummy notifications",
      results,
    });
  } catch (error: unknown) {
    return internalServerError(
      res,
      error instanceof Error ? error.message : "Failed to seed notifications",
    );
  }
}
