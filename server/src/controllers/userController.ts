import type { RequestHandler } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { firebaseAdmin } from "../config/firebaseAdmin";

type CreateUserBody = {
  DOB: string; // "2002-09-23"
  FirstName: string;
  LastName: string;
  isFemale: boolean;
  Phone?: string;
};

export const createMe: RequestHandler = async (req, res) => {
  const uid = req.user?.uid;
  const phoneFromToken = (req.user as any)?.phone_number as string | undefined;

  if (!uid) return res.status(401).json({ ok: false, error: "Missing user context" });

  const body = req.body as Partial<CreateUserBody>;

  if (!body.DOB || !body.FirstName || !body.LastName || typeof body.isFemale !== "boolean") {
    return res.status(400).json({
      ok: false,
      error: "Invalid body. Required: DOB, FirstName, LastName, isFemale",
    });
  }

  if (body.Phone && phoneFromToken && body.Phone !== phoneFromToken) {
    return res.status(400).json({ ok: false, error: "Phone must match authenticated phone_number" });
  }

  const users = firebaseAdmin.firestore().collection("users");
  const docRef = users.doc(uid);

  const payload = {
    userID: uid, // unique + replaces your old "1234"
    DOB: body.DOB,
    FirstName: body.FirstName,
    LastName: body.LastName,
    Phone: phoneFromToken ?? body.Phone ?? null,
    isFemale: body.isFemale,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    // create() guarantees uniqueness: fails if doc already exists
    await docRef.create(payload);
    return res.status(201).json({ ok: true, uid });
  } catch (e: any) {
    if (e?.code === 6 /* ALREADY_EXISTS */) {
      return res.status(409).json({ ok: false, error: "User already exists" });
    }
    return res.status(500).json({ ok: false, error: "Failed to create user", detail: e?.message });
  }
};

export const meExists: RequestHandler = async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: "Missing user context" });

  try {
    const docRef = firebaseAdmin.firestore().collection("users").doc(uid);
    const snap = await docRef.get();

    return res.json({
      ok: true,
      exists: snap.exists,
      user: snap.exists ? snap.data() : null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Failed to check user", detail: e?.message });
  }
};

