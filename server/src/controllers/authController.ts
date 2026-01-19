import type { Request, Response } from 'express';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { admin, adminInitialized } from '../firebase/admin';
import { serializeCookie, readCookie } from '../utils/cookies';
import { hashPassword, verifyPassword } from '../utils/password';
import { randomJti, signJwt, verifyJwt } from '../utils/jwt';

const ERROR_SERVER_CONFIG = 'Server Configuration Error';
const ERROR_BAD_REQUEST = 'Bad Request';
const ERROR_UNAUTHORIZED = 'Unauthorized';

const MESSAGE_ADMIN_NOT_CONFIGURED =
  'Firebase Admin SDK is not properly configured. Please check server logs.';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const ACCESS_TTL_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function requireSecrets() {
  const accessSecret = process.env.ACCESS_TOKEN_SECRET?.trim();
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET?.trim();
  if (!accessSecret || !refreshSecret) {
    throw new Error(
      'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set (check server/.env for exact variable names)'
    );
  }
  return { accessSecret, refreshSecret };
}

function hashRefreshJti(jti: string) {
  return crypto.createHash('sha256').update(jti).digest('hex');
}

export async function signupComplete(req: Request, res: Response) {
  if (!adminInitialized) {
    return res.status(500).json({ error: ERROR_SERVER_CONFIG, message: MESSAGE_ADMIN_NOT_CONFIGURED });
  }

  const { accessSecret, refreshSecret } = requireSecrets();

  const firebaseIdToken = req.body?.firebaseIdToken as string | undefined;
  const username = (req.body?.username as string | undefined)?.trim();
  const password = req.body?.password as string | undefined;

  const DOB = req.body?.DOB as string | undefined;
  const FirstName = req.body?.FirstName as string | undefined;
  const LastName = req.body?.LastName as string | undefined;
  const isFemale = req.body?.isFemale as boolean | undefined;

  if (!firebaseIdToken || !username || !password) {
    return res
      .status(400)
      .json({ error: ERROR_BAD_REQUEST, message: 'firebaseIdToken, username, password are required' });
  }
  if (!DOB || !FirstName || !LastName || typeof isFemale !== 'boolean') {
    return res
      .status(400)
      .json({ error: ERROR_BAD_REQUEST, message: 'DOB, FirstName, LastName, isFemale are required' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    const uid = decoded.uid;
    const phone = decoded.phone_number ?? null;

    if (!phone) {
      return res.status(400).json({ error: ERROR_BAD_REQUEST, message: 'Phone number missing in token' });
    }

    // Enforce unique username
    const existingByUsername = await admin
      .firestore()
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    if (!existingByUsername.empty) {
      return res.status(409).json({ error: 'Conflict', message: 'Username already taken' });
    }

    const users = admin.firestore().collection('users');
    const docRef = users.doc(uid);

    const pwd = await hashPassword(password);
    const refreshJti = randomJti();

    // create() guarantees uniqueness for uid doc
    await docRef.create({
      userID: uid,
      username,
      passwordSalt: pwd.saltB64,
      passwordHash: pwd.hashB64,
      refreshJtiHash: hashRefreshJti(refreshJti),
      refreshUpdatedAt: FieldValue.serverTimestamp(),
      DOB,
      FirstName,
      LastName,
      Phone: phone,
      isFemale,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const now = Math.floor(Date.now() / 1000);
    const accessToken = signJwt({
      secret: accessSecret,
      payload: {
        sub: uid,
        jti: randomJti(),
        exp: now + ACCESS_TTL_SECONDS,
        username,
      },
    });
    const refreshToken = signJwt({
      secret: refreshSecret,
      payload: {
        sub: uid,
        jti: refreshJti,
        exp: now + REFRESH_TTL_SECONDS,
        username,
      },
    });

    const secure = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      serializeCookie({ name: ACCESS_COOKIE, value: accessToken, maxAgeSeconds: ACCESS_TTL_SECONDS, secure }),
      serializeCookie({ name: REFRESH_COOKIE, value: refreshToken, maxAgeSeconds: REFRESH_TTL_SECONDS, secure }),
    ]);
    return res.status(201).json({ ok: true, uid });
  } catch (e: any) {
    return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: e?.message ?? 'Invalid token' });
  }
}

export async function login(req: Request, res: Response) {
  const { accessSecret, refreshSecret } = requireSecrets();

  const username = (req.body?.username as string | undefined)?.trim();
  const password = req.body?.password as string | undefined;
  if (!username || !password) {
    return res.status(400).json({ error: ERROR_BAD_REQUEST, message: 'username and password are required' });
  }

  const qs = await admin.firestore().collection('users').where('username', '==', username).limit(1).get();
  if (qs.empty) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Invalid credentials' });

  const doc = qs.docs[0];
  const data = doc.data() as any;
  if (!data.passwordSalt || !data.passwordHash) {
    return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Password login not enabled for this user' });
  }

  const ok = await verifyPassword({ password, saltB64: data.passwordSalt, hashB64: data.passwordHash });
  if (!ok) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Invalid credentials' });

  const refreshJti = randomJti();
  await doc.ref.set(
    { refreshJtiHash: hashRefreshJti(refreshJti), refreshUpdatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt({
    secret: accessSecret,
    payload: { sub: doc.id, jti: randomJti(), exp: now + ACCESS_TTL_SECONDS, username },
  });
  const refreshToken = signJwt({
    secret: refreshSecret,
    payload: { sub: doc.id, jti: refreshJti, exp: now + REFRESH_TTL_SECONDS, username },
  });

  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', [
    serializeCookie({ name: ACCESS_COOKIE, value: accessToken, maxAgeSeconds: ACCESS_TTL_SECONDS, secure }),
    serializeCookie({ name: REFRESH_COOKIE, value: refreshToken, maxAgeSeconds: REFRESH_TTL_SECONDS, secure }),
  ]);
  return res.json({ ok: true });
}

export async function refresh(req: Request, res: Response) {
  const { accessSecret, refreshSecret } = requireSecrets();

  const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE);
  if (!refreshToken) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Missing refresh token' });

  const verified = verifyJwt({ token: refreshToken, secret: refreshSecret });
  if (!verified.valid) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: verified.error });

  const uid = String(verified.payload.sub);
  const refreshJti = String(verified.payload.jti);
  const username = String((verified.payload as any).username ?? '');

  const docRef = admin.firestore().collection('users').doc(uid);
  const snap = await docRef.get();
  if (!snap.exists) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Invalid session' });

  const data = snap.data() as any;
  if (!data.refreshJtiHash || data.refreshJtiHash !== hashRefreshJti(refreshJti)) {
    return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Refresh token revoked' });
  }

  // rotate refresh token
  const newRefreshJti = randomJti();
  await docRef.set(
    { refreshJtiHash: hashRefreshJti(newRefreshJti), refreshUpdatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt({
    secret: accessSecret,
    payload: { sub: uid, jti: randomJti(), exp: now + ACCESS_TTL_SECONDS, username },
  });
  const newRefreshToken = signJwt({
    secret: refreshSecret,
    payload: { sub: uid, jti: newRefreshJti, exp: now + REFRESH_TTL_SECONDS, username },
  });

  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', [
    serializeCookie({ name: ACCESS_COOKIE, value: accessToken, maxAgeSeconds: ACCESS_TTL_SECONDS, secure }),
    serializeCookie({ name: REFRESH_COOKIE, value: newRefreshToken, maxAgeSeconds: REFRESH_TTL_SECONDS, secure }),
  ]);
  return res.json({ ok: true });
}

export async function logout(req: Request, res: Response) {
  // Best-effort: revoke refresh token server-side if we can identify user
  try {
    const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE);
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (refreshToken && refreshSecret) {
      const verified = verifyJwt({ token: refreshToken, secret: refreshSecret });
      if (verified.valid) {
        const uid = String(verified.payload.sub);
        await admin.firestore().collection('users').doc(uid).set(
          { refreshJtiHash: null, refreshUpdatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
    }
  } catch {
    // ignore
  }

  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', [
    serializeCookie({ name: ACCESS_COOKIE, value: '', maxAgeSeconds: 0, secure }),
    serializeCookie({ name: REFRESH_COOKIE, value: '', maxAgeSeconds: 0, secure }),
  ]);
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const accessToken = readCookie(req.headers.cookie, ACCESS_COOKIE);
  if (!accessToken) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Missing access token' });

  const accessSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!accessSecret) {
    return res.status(500).json({ error: ERROR_SERVER_CONFIG, message: 'ACCESS_TOKEN_SECRET is not set' });
  }

  const verified = verifyJwt({ token: accessToken, secret: accessSecret });
  if (!verified.valid) return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: verified.error });

  return res.json({
    ok: true,
    uid: String(verified.payload.sub),
    username: String((verified.payload as any).username ?? ''),
  });
}

export async function forgotPasswordComplete(req: Request, res: Response) {
  if (!adminInitialized) {
    return res.status(500).json({ error: ERROR_SERVER_CONFIG, message: MESSAGE_ADMIN_NOT_CONFIGURED });
  }

  const firebaseIdToken = req.body?.firebaseIdToken as string | undefined;
  const username = (req.body?.username as string | undefined)?.trim();
  const newPassword = req.body?.newPassword as string | undefined;

  if (!firebaseIdToken || !username || !newPassword) {
    return res.status(400).json({
      error: ERROR_BAD_REQUEST,
      message: 'firebaseIdToken, username, newPassword are required',
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    const phoneFromToken = decoded.phone_number ?? null;
    if (!phoneFromToken) {
      return res.status(400).json({ error: ERROR_BAD_REQUEST, message: 'Phone number missing in token' });
    }

    const qs = await admin.firestore().collection('users').where('username', '==', username).limit(1).get();
    if (qs.empty) {
      // Avoid username enumeration: return generic error
      return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Invalid verification' });
    }

    const doc = qs.docs[0];
    const data = doc.data() as any;
    const storedPhone = data.Phone ?? null;
    if (!storedPhone || storedPhone !== phoneFromToken) {
      return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Invalid verification' });
    }

    const pwd = await hashPassword(newPassword);
    await doc.ref.set(
      {
        passwordSalt: pwd.saltB64,
        passwordHash: pwd.hashB64,
        refreshJtiHash: null, // revoke all refresh tokens
        refreshUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Clear cookies (forces re-login)
    const secure = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      serializeCookie({ name: ACCESS_COOKIE, value: '', maxAgeSeconds: 0, secure }),
      serializeCookie({ name: REFRESH_COOKIE, value: '', maxAgeSeconds: 0, secure }),
    ]);

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: e?.message ?? 'Invalid token' });
  }
}

