import type { Request, Response } from "express";
import { admin } from "../firebase/admin";
import {
  COLLECTIONS,
  GROUP_FIELDS,
  GROUP_MESSAGE_FIELDS,
  GROUP_SUBCOLLECTIONS,
} from "../constants/db";
import {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalServerError,
} from "../utils/errors";

const MAX_MESSAGE_LENGTH = 4000;

function parseStringParam(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function getGroupIfMember(
  groupIdRaw: unknown,
  uid: string | undefined,
): Promise<{
  db: admin.firestore.Firestore;
  groupRef: admin.firestore.DocumentReference;
  groupData: admin.firestore.DocumentData;
} | null> {
  const groupId = parseStringParam(groupIdRaw);
  if (!groupId || !uid) return null;

  const db = admin.firestore();
  const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) return null;

  const data = groupSnap.data();
  const members: admin.firestore.DocumentReference[] =
    (data?.[GROUP_FIELDS.MEMBERS] as admin.firestore.DocumentReference[]) || [];
  const isMember = members.some((ref) => ref?.id === uid);
  if (!isMember) return null;

  return { db, groupRef, groupData: data! };
}

function buildMessagePayload(
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot,
) {
  const data = doc.data() as Record<string, unknown>;
  const createdAt = data[GROUP_MESSAGE_FIELDS.CREATED_AT] as
    | admin.firestore.Timestamp
    | undefined;

  return {
    id: doc.id,
    groupId: (data[GROUP_MESSAGE_FIELDS.GROUP_ID] as string) ?? null,
    text: (data[GROUP_MESSAGE_FIELDS.TEXT] as string) ?? "",
    senderUserId: (data[GROUP_MESSAGE_FIELDS.SENDER_ID] as string) ?? null,
    senderDisplayName:
      (data[GROUP_MESSAGE_FIELDS.SENDER_DISPLAY_NAME] as string) ?? null,
    senderPhotoURL:
      (data[GROUP_MESSAGE_FIELDS.SENDER_PHOTO_URL] as string | null) ?? null,
    createdAt: createdAt?.toDate?.().toISOString?.() ?? null,
  };
}

/** POST /groups/:groupId/messages — send a text message to a group. */
export async function sendGroupMessage(req: Request, res: Response) {
  const uid = req.auth?.uid;
  const username = req.auth?.username;
  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }

  const { text } = req.body as { text?: string };
  if (typeof text !== "string") {
    return badRequest(res, "text is required");
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return badRequest(res, "Message cannot be empty");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return badRequest(
      res,
      `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    );
  }

  try {
    const groupContext = await getGroupIfMember(req.params.groupId, uid);
    if (!groupContext) {
      const groupId = parseStringParam(req.params.groupId);
      if (!groupId) {
        return badRequest(res, "Group ID is required");
      }
      // If group exists but user is not a member, return 403; otherwise 404.
      const db = admin.firestore();
      const groupSnap = await db
        .collection(COLLECTIONS.GROUPS)
        .doc(groupId)
        .get();
      if (!groupSnap.exists) {
        return notFound(res, "Group not found");
      }
      return forbidden(res, "You are not a member of this group");
    }

    const { groupRef } = groupContext;
    const groupId = groupRef.id;
    const messagesRef = groupRef.collection(GROUP_SUBCOLLECTIONS.MESSAGES);
    const messageRef = messagesRef.doc();

    await messageRef.set({
      [GROUP_MESSAGE_FIELDS.MESSAGE_ID]: messageRef.id,
      [GROUP_MESSAGE_FIELDS.GROUP_ID]: groupId,
      [GROUP_MESSAGE_FIELDS.SENDER_ID]: uid,
      [GROUP_MESSAGE_FIELDS.SENDER_DISPLAY_NAME]:
        typeof username === "string" && username.trim().length > 0
          ? username.trim()
          : uid,
      [GROUP_MESSAGE_FIELDS.SENDER_PHOTO_URL]: null,
      [GROUP_MESSAGE_FIELDS.TEXT]: trimmed,
      [GROUP_MESSAGE_FIELDS.CREATED_AT]:
        admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return a simple payload; client can rely on Firestore listener for full data.
    return res.status(201).json({
      ok: true,
      data: {
        id: messageRef.id,
        groupId,
        text: trimmed,
        senderUserId: uid,
        senderDisplayName:
          typeof username === "string" && username.trim().length > 0
            ? username.trim()
            : uid,
        senderPhotoURL: null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Send group message error:", msg);
    return internalServerError(res);
  }
}

/** GET /groups/:groupId/messages — fetch recent messages, newest-first, with pagination. */
export async function getGroupMessages(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) {
    return unauthorized(res, "Unauthorized");
  }

  const groupId = parseStringParam(req.params.groupId);
  if (!groupId) {
    return badRequest(res, "Group ID is required");
  }

  const rawLimit = parseInt(String(req.query.limit ?? 50), 10);
  const limit = Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100);
  const beforeId =
    typeof req.query.before === "string" && req.query.before.trim()
      ? req.query.before.trim()
      : undefined;

  try {
    const db = admin.firestore();
    const groupRef = db.collection(COLLECTIONS.GROUPS).doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return notFound(res, "Group not found");
    }

    const data = groupSnap.data();
    const members: admin.firestore.DocumentReference[] =
      (data?.[GROUP_FIELDS.MEMBERS] as admin.firestore.DocumentReference[]) ||
      [];
    const isMember = members.some((ref) => ref?.id === uid);
    if (!isMember) {
      return forbidden(res, "You are not a member of this group");
    }

    let query = groupRef
      .collection(GROUP_SUBCOLLECTIONS.MESSAGES)
      .orderBy(GROUP_MESSAGE_FIELDS.CREATED_AT, "desc")
      .limit(limit);

    if (beforeId) {
      const beforeDoc = await groupRef
        .collection(GROUP_SUBCOLLECTIONS.MESSAGES)
        .doc(beforeId)
        .get();
      if (beforeDoc.exists) {
        query = query.startAfter(beforeDoc);
      }
    }

    const snapshot = await query.get();
    const messages = snapshot.docs.map((doc) => buildMessagePayload(doc));
    const hasMore = snapshot.docs.length === limit;

    return res.json({
      ok: true,
      data: messages,
      hasMore,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Get group messages error:", msg);
    return internalServerError(res);
  }
}

