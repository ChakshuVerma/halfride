import type { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase/admin';

export async function profile(req: Request, res: Response) {
  const response = {
    uid: req.user?.uid,
    email: req.user?.email,
    phone: req.user?.phone_number,
    authTime: req.user?.auth_time,
    issuedAt: req.user?.iat,
    expiresAt: req.user?.exp,
  };

  return res.json(response);
}

type CreateUserBody = {
  DOB: string; // "2002-09-23"
  FirstName: string;
  LastName: string;
  isFemale: boolean;
  Phone?: string;
};

export async function createMe(req: Request, res: Response) {
  const uid = req.user?.uid;
  const phoneFromToken = req.user?.phone_number;

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

  const users = admin.firestore().collection('users');
  const docRef = users.doc(uid);

  const payload = {
    userID: uid,
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
    // Firestore gRPC ALREADY_EXISTS is code 6
    if (e?.code === 6) {
      return res.status(409).json({ ok: false, error: 'User already exists' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to create user', detail: e?.message });
  }
}

export async function meExists(req: Request, res: Response) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ ok: false, error: 'Missing user context' });

  try {
    const docRef = admin.firestore().collection('users').doc(uid);
    const snap = await docRef.get();

    return res.json({
      ok: true,
      exists: snap.exists,
      user: snap.exists ? snap.data() : null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'Failed to check user', detail: e?.message });
  }
}
