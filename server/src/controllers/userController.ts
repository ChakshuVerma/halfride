import type { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { admin } from '../config/firebase';
import {
  COLLECTIONS,
  USER_FIELDS,
  TRAVELLER_FIELDS,
  GROUP_FIELDS,
  FLIGHT_FIELDS,
} from '../core/db';
import {
  badRequest,
  unauthorized,
  notFound,
  conflict,
  internalServerError,
} from '../core/errors';

export async function profile(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, 'Unauthorized');

  const snap = await admin.firestore().collection(COLLECTIONS.USERS).doc(uid).get();

  return res.json({ ok: true, user: snap.exists ? snap.data() : null });
}

/**
 * GET /user/profile/:username
 * Returns public profile by username (basic info, past trips, current group).
 * Requires session. If viewer is the profile owner, includes private fields and isOwnProfile: true.
 */
export async function profileByUsername(req: Request, res: Response) {
  const viewerUid = req.auth?.uid;
  if (!viewerUid) return unauthorized(res, 'Unauthorized');

  const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!username) return badRequest(res, 'Username is required');

  const db = admin.firestore();

  try {
    const userSnap = await db
      .collection(COLLECTIONS.USERS)
      .where(USER_FIELDS.USERNAME, '==', username)
      .limit(1)
      .get();

    if (userSnap.empty) {
      return notFound(res, 'User not found');
    }

    const profileDoc = userSnap.docs[0];
    const profileUid = profileDoc.id;
    const userData = profileDoc.data();
    const isOwnProfile = viewerUid === profileUid;

    const publicUser = {
      userID: profileUid,
      username: userData?.[USER_FIELDS.USERNAME] ?? username,
      FirstName: userData?.[USER_FIELDS.FIRST_NAME],
      LastName: userData?.[USER_FIELDS.LAST_NAME],
      bio: userData?.[USER_FIELDS.BIO],
      photoURL: userData?.[USER_FIELDS.PHOTO_URL] ?? null,
    };

    if (isOwnProfile) {
      (publicUser as any).Phone = userData?.[USER_FIELDS.PHONE];
      (publicUser as any).DOB = userData?.[USER_FIELDS.DOB];
      (publicUser as any).isFemale = userData?.[USER_FIELDS.IS_FEMALE];
    }

    const userRef = db.collection(COLLECTIONS.USERS).doc(profileUid);

    // Past trips (completed). No orderBy to avoid requiring a composite index; sort in memory.
    const pastTripsSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, '==', userRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, '==', true)
      .limit(30)
      .get();

    const pastTripsRaw: Array<{ trav: any; id: string }> = [];
    pastTripsSnap.docs.forEach((d) => {
      const trav = d.data();
      pastTripsRaw.push({ trav, id: d.id });
    });
    // Sort by date descending (most recent first), then take 15
    pastTripsRaw.sort((a, b) => {
      const dateA = a.trav[TRAVELLER_FIELDS.DATE] ?? '';
      const dateB = b.trav[TRAVELLER_FIELDS.DATE] ?? '';
      return dateB.localeCompare(dateA);
    });
    const pastTripsRawLimit = pastTripsRaw.slice(0, 15);

    const flightRefs: admin.firestore.DocumentReference[] = [];
    pastTripsRawLimit.forEach(({ trav }) => {
      const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF];
      if (fRef?.id) flightRefs.push(fRef);
    });

    const flightSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
    if (flightRefs.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < flightRefs.length; i += batchSize) {
        const batch = flightRefs.slice(i, i + batchSize);
        const snaps = await db.getAll(...batch);
        snaps.forEach((s) => flightSnapMap.set(s.id, s));
      }
    }

    const pastTrips = pastTripsRawLimit.map(({ trav, id }) => {
      const fRef = trav[TRAVELLER_FIELDS.FLIGHT_REF];
      const flightSnap = fRef?.id ? flightSnapMap.get(fRef.id) : null;
      const flight = flightSnap?.data();
      const dest = trav[TRAVELLER_FIELDS.DESTINATION];
      const destinationAddress =
        typeof dest === 'object' && dest?.address != null
          ? dest.address
          : typeof dest === 'string'
            ? dest
            : 'N/A';
      return {
        travellerDataId: id,
        date: trav[TRAVELLER_FIELDS.DATE],
        flightArrival: trav[TRAVELLER_FIELDS.FLIGHT_ARRIVAL],
        flightDeparture: trav[TRAVELLER_FIELDS.FLIGHT_DEPARTURE],
        destination: destinationAddress,
        terminal: trav[TRAVELLER_FIELDS.TERMINAL] || 'N/A',
        flightNumber:
          `${flight?.[FLIGHT_FIELDS.CARRIER] ?? ''} ${flight?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ''}`.trim() || '—',
      };
    });

    // Current active listing and group (if any)
    const activeSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, '==', userRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, '==', false)
      .limit(1)
      .get();

    let currentGroup: { groupId: string; name?: string; flightArrivalAirport?: string; memberCount: number } | null = null;
    let activeTrip: { flightArrival: string; flightDeparture: string; destination: string; terminal: string; flightNumber: string } | null = null;

    if (!activeSnap.empty) {
      const activeTrav = activeSnap.docs[0].data();
      const groupRef = activeTrav[TRAVELLER_FIELDS.GROUP_REF];
      const fRef = activeTrav[TRAVELLER_FIELDS.FLIGHT_REF];
      const dest = activeTrav[TRAVELLER_FIELDS.DESTINATION];
      const destinationAddress =
        typeof dest === 'object' && dest?.address != null
          ? dest.address
          : typeof dest === 'string'
            ? dest
            : 'N/A';
      let flightNumber = '—';
      if (fRef?.id) {
        const fs = await db.collection(COLLECTIONS.FLIGHT_DETAIL).doc(fRef.id).get();
        const f = fs.data();
        flightNumber =
          `${f?.[FLIGHT_FIELDS.CARRIER] ?? ''} ${f?.[FLIGHT_FIELDS.FLIGHT_NUMBER] ?? ''}`.trim() || '—';
      }
      activeTrip = {
        flightArrival: activeTrav[TRAVELLER_FIELDS.FLIGHT_ARRIVAL] || '—',
        flightDeparture: activeTrav[TRAVELLER_FIELDS.FLIGHT_DEPARTURE] || '—',
        destination: destinationAddress,
        terminal: activeTrav[TRAVELLER_FIELDS.TERMINAL] || 'N/A',
        flightNumber,
      };
      if (groupRef?.id) {
        const groupSnap = await db.collection(COLLECTIONS.GROUPS).doc(groupRef.id).get();
        if (groupSnap.exists) {
          const g = groupSnap.data();
          const members: any[] = g?.[GROUP_FIELDS.MEMBERS] || [];
          currentGroup = {
            groupId: groupRef.id,
            name: g?.[GROUP_FIELDS.NAME],
            flightArrivalAirport: g?.[GROUP_FIELDS.FLIGHT_ARRIVAL_AIRPORT],
            memberCount: members.length,
          };
        }
      }
    }

    return res.json({
      ok: true,
      user: publicUser,
      isOwnProfile,
      pastTrips,
      currentGroup,
      activeTrip,
    });
  } catch (e: unknown) {
    console.error('profileByUsername error:', e);
    if (e instanceof Error && e.stack) console.error(e.stack);
    return internalServerError(
      res,
      e instanceof Error ? e.message : 'Failed to load profile',
    );
  }
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

  if (!uid) return unauthorized(res, 'Missing user context');

  const body = (req.body ?? {}) as Partial<CreateUserBody>;

  if (!body.DOB || !body.FirstName || !body.LastName || typeof body.isFemale !== 'boolean') {
    return badRequest(res, 'Invalid body. Required: DOB, FirstName, LastName, isFemale');
  }

  if (body.Phone && phoneFromToken && body.Phone !== phoneFromToken) {
    return badRequest(res, 'Phone must match authenticated phone_number');
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
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err?.code === 6) {
      return conflict(res, 'User already exists');
    }
    return internalServerError(
      res,
      e instanceof Error ? e.message : 'Failed to create user',
    );
  }
}

export async function checkUserExists(uid: string) {
  try {
    const snap = await admin.firestore().collection(COLLECTIONS.USERS).doc(uid).get();

    return { ok: true, exists: snap.exists, data: snap.exists ? snap.data() : null };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function meExists(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, 'Missing user context');

  const result = await checkUserExists(uid);
  if (!result.ok) {
    return internalServerError(
      res,
      result.error ?? 'Failed to check user',
    );
  }

  return res.json({
    ok: true,
    exists: result.exists,
    user: result.data,
  });
}

const AVATAR_SIZE = 192;
const AVATAR_JPEG_QUALITY = 85;

/**
 * POST /user/profile/photo
 * Upload profile photo (multipart form with "photo" file). Resizes and stores as base64 in Firestore (no Storage bucket needed).
 */
export async function uploadProfilePhotoHandler(req: Request, res: Response) {
  const uid = req.auth?.uid;
  if (!uid) return unauthorized(res, 'Unauthorized');

  const file = (req as any).file;
  if (!file || !file.buffer) {
    return badRequest(res, 'No photo file provided');
  }

  try {
    const buffer = await sharp(file.buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .jpeg({ quality: AVATAR_JPEG_QUALITY })
      .toBuffer();
    const base64 = buffer.toString('base64');
    const photoURL = `data:image/jpeg;base64,${base64}`;

    await admin.firestore().collection(COLLECTIONS.USERS).doc(uid).update({
      [USER_FIELDS.PHOTO_URL]: photoURL,
      [USER_FIELDS.UPDATED_AT]: FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, photoURL });
  } catch (e: unknown) {
    console.error('uploadProfilePhoto error:', e);
    return internalServerError(
      res,
      e instanceof Error ? e.message : 'Failed to process or save photo',
    );
  }
}
