import type { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase/admin';
import { COLLECTIONS, USER_FIELDS } from '../constants/db';


export async function profile(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const snap = await admin.firestore().collection(COLLECTIONS.USERS).doc(uid).get();

  return res.json({ ok: true, user: snap.exists ? snap.data() : null });
}

type CreateUserBody = {
  DOB: string; // "2002-09-23"
  FirstName: string;
  LastName: string;
  isFemale: boolean;
  Phone?: string;
};

export async function createMe(req: Request, res: Response) {
  const uid = req.auth?.uid;
  const phoneFromToken = null;

  if (!uid) return res.status(401).json({ ok: false, error: 'Missing user context' });

  const body = (req.body ?? {}) as Partial<CreateUserBody>;

  if (!body.DOB || !body.FirstName || !body.LastName || typeof body.isFemale !== 'boolean') {
    return res.status(400).json({
      ok: false,
      error: 'Invalid body. Required: DOB, FirstName, LastName, isFemale',
    });
  }

  if (body.Phone && phoneFromToken && body.Phone !== phoneFromToken) {
    return res.status(400).json({ ok: false, error: 'Phone must match authenticated phone_number' });
  }

  const users = admin.firestore().collection(COLLECTIONS.USERS);

  const docRef = users.doc(uid);

  const payload = {
    [USER_FIELDS.USER_ID]: uid,
    [USER_FIELDS.DOB]: body.DOB,
    [USER_FIELDS.FIRST_NAME]: body.FirstName,
    [USER_FIELDS.LAST_NAME]: body.LastName,
    [USER_FIELDS.PHONE]: phoneFromToken ?? body.Phone ?? null,
    [USER_FIELDS.IS_FEMALE]: body.isFemale,
    [USER_FIELDS.CREATED_AT]: FieldValue.serverTimestamp(),
    [USER_FIELDS.UPDATED_AT]: FieldValue.serverTimestamp(),
  };


  try {
    // create() guarantees uniqueness: fails if doc already exists
    await docRef.create(payload);
    return res.status(201).json({ ok: true, uid });
  } catch (e: any) {
    // Firestore gRPC ALREADY_EXISTS is code 6
    if (e?.code === 6) {
      return res.status(409).json({ ok: false, error: 'User already exists' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to create user', detail: e?.message });
  }
}

export async function checkUserExists(uid: string) {
  try {
    const snap = await admin.firestore().collection(COLLECTIONS.USERS).doc(uid).get();

    return { ok: true, exists: snap.exists, data: snap.exists ? snap.data() : null };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

export async function meExists(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: 'Missing user context' });

  const result = await checkUserExists(uid);
  if (!result.ok) {
    return res.status(500).json({ ok: false, error: 'Failed to check user', detail: result.error });
  }

  return res.json({
    ok: true,
    exists: result.exists,
    user: result.data,
  });
}
