import { admin } from "../../config/firebase";
import {
  COLLECTIONS,
  GROUP_FIELDS,
  NOTIFICATION_FIELDS,
  TRAVELLER_FIELDS,
} from "../../core/db";
import {
  CreateNotificationPayload,
  NotificationType,
  NOTIFICATION_ACTION_TYPES,
} from "../../types/notifications";
import { roadDistanceBetweenTwoPoints } from "../../utils/controllerUtils";

const NEARBY_LISTING_MAX_DISTANCE_METERS = 5000;

export async function createNotification(payload: CreateNotificationPayload) {
  const db = admin.firestore();

  const notificationTypeValues = Object.values(NotificationType);
  if (!notificationTypeValues.includes(payload.type)) {
    return { ok: false, error: "Invalid Notification Type" };
  }

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

    if (data.groupId) {
      data.groupRef = db
        .collection(COLLECTIONS.GROUPS)
        .doc(data.groupId as string);
      delete (data as any).groupId;
    }
    if (data.actorUserId) {
      data.actorUserRef = db
        .collection(COLLECTIONS.USERS)
        .doc(data.actorUserId as string);
      delete (data as any).actorUserId;
    }

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

export async function getGroupInfo(
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

export async function getGroupDisplayName(
  db: admin.firestore.Firestore,
  groupId: string,
): Promise<string> {
  const { name } = await getGroupInfo(db, groupId);
  return name;
}

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

    if (!placeId || !flightArrival || !userRef?.id) {
      console.warn(
        `[Notification] Skipping nearby listing check for ${travellerRef.id} – missing placeId, airport or userRef.`,
      );
      return;
    }

    const airportCode = String(flightArrival).toUpperCase();
    const newUserId = userRef.id;
    const newTravellerId = travellerRef.id;

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
