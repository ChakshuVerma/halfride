import type { Request, Response } from "express";
import { admin } from "../firebase/admin";
import {
  COLLECTIONS,
  NOTIFICATION_FIELDS,
  NOTIFICATIONS_PAGE_SIZE,
  GROUP_FIELDS,
  TRAVELLER_FIELDS,
} from "../constants/db";
import {
  CreateNotificationPayload,
  NotificationType,
  NOTIFICATION_ACTION_TYPES,
} from "../types/notifications";

/**
 * Validates and creates a notification in Firestore.
 */
export async function createNotification(payload: CreateNotificationPayload) {
  const db = admin.firestore();

  // Check if the payload.type is a valid enum notification type
  const notificationTypeValues = Object.values(NotificationType);
  if (!notificationTypeValues.includes(payload.type)) {
    return { ok: false, error: "Invalid Notification Type" };
  }

  // Basic Validation
  if (!payload.recipientUserId) {
    return { ok: false, error: "Recipient User ID is required" };
  }

  if (!payload.title || !payload.body) {
    return { ok: false, error: "Title and Body are required" };
  }

  try {
    const userRef = db
      .collection(COLLECTIONS.USERS)
      .doc(payload.recipientUserId);
    const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();

    const data: Record<string, unknown> = { ...payload.data };

    // Convert IDs to References (action is preserved as-is for the client)
    if (data.groupId) {
      data.groupRef = db.collection(COLLECTIONS.GROUPS).doc(data.groupId as string);
      delete data.groupId;
    }
    if (data.actorUserId) {
      data.actorUserRef = db
        .collection(COLLECTIONS.USERS)
        .doc(data.actorUserId as string);
      delete data.actorUserId;
    }
    // listingId is kept as a string for the client (no ref conversion)

    await notificationRef.set({
      [NOTIFICATION_FIELDS.NOTIFICATION_ID]: notificationRef.id,
      [NOTIFICATION_FIELDS.RECIPIENT_REF]: userRef,
      [NOTIFICATION_FIELDS.TYPE]: payload.type,
      [NOTIFICATION_FIELDS.TITLE]: payload.title,
      [NOTIFICATION_FIELDS.BODY]: payload.body,
      [NOTIFICATION_FIELDS.DATA]: data,
      [NOTIFICATION_FIELDS.IS_READ]: false,
      [NOTIFICATION_FIELDS.CREATED_AT]:
        admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, id: notificationRef.id };
  } catch (error: any) {
    console.error("Create Notification Error:", error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Fetch group display name and airport code for notifications.
 * Returns stored name or "Group of N" fallback; airportCode from group doc when present.
 */
async function getGroupInfo(
  db: admin.firestore.Firestore,
  groupId: string,
): Promise<{ name: string; airportCode?: string }> {
  const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(groupId).get();
  if (!groupDoc.exists) return { name: "the group" };
  const data = groupDoc.data();
  const storedName = data?.[GROUP_FIELDS.NAME];
  const name =
    typeof storedName === "string" && storedName.trim().length > 0
      ? storedName.trim()
      : (() => {
          const members: admin.firestore.DocumentReference[] =
            data?.[GROUP_FIELDS.MEMBERS] || [];
          return `Group of ${members.length}`;
        })();
  const airportCode = data?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT] as
    | string
    | undefined;
  return { name, airportCode };
}

async function getGroupDisplayName(
  db: admin.firestore.Firestore,
  groupId: string,
): Promise<string> {
  const { name } = await getGroupInfo(db, groupId);
  return name;
}

/**
 * Use Case 1: Notify users near a new listing (traveller).
 * This should be called after a new Traveller is created.
 */
export async function notifyUsersNearNewListing(
  newTravellerId: string,
  lat: number,
  lng: number,
) {
  // Implementation note: Firestore doesn't support native geo-queries easily without Geohash.
  // For now, we stub this logic or use a simplistic approach if user locations are known.
  // Real implementation would require storing user locations and querying them.
  console.log(
    `[Notification] Checking for users near traveller ${newTravellerId} at ${lat},${lng}`,
  );
  // TODO: specialized geo-query implementation
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
 * Get notifications for the authenticated user with Pagination.
 */
export async function getMyNotifications(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  // Pagination params: max NOTIFICATIONS_PAGE_SIZE per page
  const rawLimit = parseInt(
    String(req.query.limit || NOTIFICATIONS_PAGE_SIZE),
    10,
  );
  const limit = Math.min(
    isNaN(rawLimit) ? NOTIFICATIONS_PAGE_SIZE : rawLimit,
    NOTIFICATIONS_PAGE_SIZE,
  );
  const lastId = req.query.lastId ? String(req.query.lastId) : undefined;

  const db = admin.firestore();
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

    let query = db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where(NOTIFICATION_FIELDS.RECIPIENT_REF, "==", userRef)
      .orderBy(NOTIFICATION_FIELDS.CREATED_AT, "desc")
      .limit(limit);

    if (lastId) {
      const lastDoc = await db
        .collection(COLLECTIONS.NOTIFICATIONS)
        .doc(lastId)
        .get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    // Transform Refs back to IDs for client compatibility
    const notifications = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        ...d,
        [NOTIFICATION_FIELDS.RECIPIENT_REF]: undefined, // remove ref
        recipientUserId: d[NOTIFICATION_FIELDS.RECIPIENT_REF]?.id, // add ID
        data: {
          ...d.data,
          groupRef: undefined,
          actorUserRef: undefined,
          flightRef: undefined,
          groupId: d.data?.groupRef?.id,
          actorUserId: d.data?.actorUserRef?.id,
        },
      };
    });

    const hasMore = snapshot.docs.length === limit;
    return res.json({ ok: true, data: notifications, hasMore });
  } catch (error: any) {
    console.error("Get Notifications Error:", error.message);
    // Return specific error message to help debugging (e.g. missing index)
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const db = admin.firestore();
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const snapshot = await db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where(NOTIFICATION_FIELDS.RECIPIENT_REF, "==", userRef)
      .where(NOTIFICATION_FIELDS.IS_READ, "==", false)
      .count()
      .get();

    return res.json({ ok: true, count: snapshot.data().count });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(req: Request, res: Response) {
  const uid = req.auth?.uid;
  const notificationId = String(req.params.notificationId);

  if (!uid) return res.status(401).json({ ok: false, error: "Unauthorized" });
  if (!notificationId)
    return res
      .status(400)
      .json({ ok: false, error: "Failed to mark notification as read" });

  const db = admin.firestore();
  try {
    const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
    const doc = await ref.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ ok: false, error: "Failed to mark notification as read" });
    }

    const data = doc.data();
    // Check ownership using Ref path comparison
    const recipientRef = data?.[NOTIFICATION_FIELDS.RECIPIENT_REF];
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

    if (!recipientRef || recipientRef.path !== userRef.path) {
      return res
        .status(403)
        .json({ ok: false, error: "Failed to mark notification as read" });
    }

    await ref.update({
      [NOTIFICATION_FIELDS.IS_READ]: true,
    });

    return res.json({ ok: true });
  } catch (error: any) {
    console.error("Mark Read Error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: "Unauthorized" });

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
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * SEEDER (FOR DEVELOPMENT)
 */
export async function seedDummyNotifications(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: "Unauthorized" });

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
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
