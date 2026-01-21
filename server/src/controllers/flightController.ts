import type { Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase/admin';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const RATE_MAX = 5;

// Firestore has a ~1MB document limit. The upstream payload can be huge due to positions[].
// Cache only a small tail of positions to avoid write failures.
const MAX_POSITIONS_TO_CACHE = 25;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toFlightDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`; // YYYY-MM-DD
}

function getUid(req: Request) {
  // Most of your protected endpoints use cookie session auth (req.auth).
  // Fallback to Firebase token auth if you ever decide to protect this route with verifyToken.
  return req.auth?.uid ?? req.user?.uid ?? null;
}

function sanitizeForCache(raw: any) {
  // Avoid mutating the live response we might return.
  const copy = typeof structuredClone === 'function' ? structuredClone(raw) : JSON.parse(JSON.stringify(raw));

  const positions = copy?.data?.positional?.flexTrack?.positions;
  if (Array.isArray(positions) && positions.length > MAX_POSITIONS_TO_CACHE) {
    copy.data.positional.flexTrack.positions = positions.slice(-MAX_POSITIONS_TO_CACHE);
    copy.meta = { ...(copy.meta ?? {}), positionsTruncated: true, cachedPositions: MAX_POSITIONS_TO_CACHE };
  } else {
    copy.meta = { ...(copy.meta ?? {}), positionsTruncated: false };
  }

  return copy;
}

function deriveStoredFields(raw: any, params: { flightDate: string; carrier: string; flightNumber: string }) {
  const d = raw?.data ?? null;

  const airlineName = d?.resultHeader?.carrier?.name ?? d?.ticketHeader?.carrier?.name ?? null;

  const source =
    d?.resultHeader?.departureAirportFS ??
    d?.positional?.departureAirportCode ??
    d?.departureAirport?.fs ??
    null;

  const destination =
    d?.resultHeader?.arrivalAirportFS ??
    d?.positional?.arrivalAirportCode ??
    d?.arrivalAirport?.fs ??
    null;

  const delayMinutes =
    d?.status?.delay?.arrival?.minutes ??
    d?.status?.delay?.departure?.minutes ??
    null;

  const etaUTC =
    d?.schedule?.estimatedActualArrivalUTC ??
    d?.schedule?.scheduledArrivalUTC ??
    null;

  return {
    carrier: params.carrier,
    flightNumber: params.flightNumber,
    flightDate: params.flightDate,
    airline: airlineName,
    source,
    destination,
    delayMinutes,
    etaUTC,
  };
}

async function consumeRateLimit(uid: string) {
  const db = admin.firestore();
  const ref = db.collection('flightRateLimits').doc(uid);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, { windowStartMs: now, count: 1, updatedAt: FieldValue.serverTimestamp() });
      return;
    }

    const data = snap.data() as any;
    const windowStartMs = Number(data?.windowStartMs ?? 0);
    const count = Number(data?.count ?? 0);

    // New window
    if (!windowStartMs || now - windowStartMs >= RATE_WINDOW_MS) {
      tx.set(ref, { windowStartMs: now, count: 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }

    if (count >= RATE_MAX) {
      const err: any = new Error('Rate limit exceeded');
      err.statusCode = 429;
      throw err;
    }

    tx.set(ref, { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

async function consumeRateLimitForFlightKey(uid: string, flightKey: string) {
  const db = admin.firestore();
  const ref = db.collection('flightRateLimits').doc(uid);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    // First ever window
    if (!snap.exists) {
      tx.set(ref, {
        windowStartMs: now,
        count: 1,
        keys: [flightKey],
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const data = snap.data() as any;
    const windowStartMs = Number(data?.windowStartMs ?? 0);
    const keys = Array.isArray(data?.keys) ? (data.keys as string[]) : [];
    const count = Number(data?.count ?? keys.length ?? 0);

    // New window
    if (!windowStartMs || now - windowStartMs >= RATE_WINDOW_MS) {
      tx.set(
        ref,
        { windowStartMs: now, count: 1, keys: [flightKey], updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return;
    }

    // Same window: if this flight key was already looked up, do not count again.
    if (keys.includes(flightKey)) {
      tx.set(ref, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }

    if (count >= RATE_MAX) {
      const err: any = new Error('Rate limit exceeded');
      err.statusCode = 429;
      throw err;
    }

    tx.set(
      ref,
      {
        count: FieldValue.increment(1),
        keys: FieldValue.arrayUnion(flightKey),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function getFlightTracker(req: Request, res: Response) {
  const uid = getUid(req);
  if (!uid) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const carrier = String(req.params.carrier ?? '').trim().toUpperCase();
  const flightNumber = String(req.params.flightNumber ?? '').trim();
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  const day = Number(req.params.day);

  if (!carrier || !flightNumber || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'Invalid params' });
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'Invalid date' });
  }

  const flightDate = toFlightDateKey(year, month, day);
  const cacheKey = `${carrier}_${flightNumber}_${flightDate}`;

  const db = admin.firestore();
  const cacheRef = db.collection('flightCache').doc(cacheKey);

  // 1) Cache check (valid + invalid)
  try {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const cached = snap.data() as any;
      const fetchedAtMs = Number(cached?.fetchedAtMs ?? 0);

      if (fetchedAtMs && Date.now() - fetchedAtMs < CACHE_TTL_MS) {
        const fields = {
          carrier: cached?.carrier ?? carrier,
          flightNumber: cached?.flightNumber ?? flightNumber,
          flightDate: cached?.flightDate ?? flightDate,
          airline: cached?.airline ?? null,
          source: cached?.source ?? null,
          destination: cached?.destination ?? null,
          delayMinutes: cached?.delayMinutes ?? null,
          etaUTC: cached?.etaUTC ?? null,
        };

        if (cached?.isValid) {
          return res.json({
            ok: true,
            cached: true,
            valid: true,
            fetchedAtMs,
            ...fields,
            data: cached?.payload ?? null,
          });
        }

        return res.status(404).json({
          ok: false,
          cached: true,
          valid: false,
          fetchedAtMs,
          reason: cached?.invalidReason ?? 'not_found',
          ...fields,
          data: null,
        });
      }
    }
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'Internal Server Error', message: `Cache read failed: ${e?.message ?? 'Unknown error'}` });
  }

  // 2) Fetch upstream (FlightStats)
  // Enforce per-user rate limit only when we must hit upstream, and count unique flight keys per window.
  try {
    await consumeRateLimitForFlightKey(uid, cacheKey);
  } catch (e: any) {
    if (e?.statusCode === 429) {
      return res
        .status(429)
        .json({ ok: false, error: 'Too Many Requests', message: 'Max 5 unique flight lookups per 30 minutes' });
    }
    return res.status(500).json({ ok: false, error: 'Internal Server Error', message: e?.message ?? 'Rate limiter failed' });
  }

  const upstreamUrl = `https://www.flightstats.com/v2/api-next/flight-tracker/${encodeURIComponent(carrier)}/${encodeURIComponent(
    flightNumber
  )}/${year}/${month}/${day}`;

  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 10_000);

  let raw: any = null;
  let httpStatus: number | null = null;
  try {
    const r = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'halfride-server/1.0',
      },
      signal: abort.signal,
    });
    httpStatus = r.status;
    const text = await r.text();
    raw = text ? JSON.parse(text) : null;
    if (!r.ok) raw = null;
  } catch {
    raw = null;
  } finally {
    clearTimeout(timeout);
  }

  const isValid = !!raw?.data;
  const stored = deriveStoredFields(raw, { flightDate, carrier, flightNumber });
  const fetchedAtMs = Date.now();

  // 3) Save result (valid or invalid) + return
  try {
    if (isValid) {
      const cachedPayload = sanitizeForCache(raw);

      await cacheRef.set(
        {
          carrier,
          flightNumber,
          flightDate,
          airline: stored.airline ?? null,
          source: stored.source ?? null,
          destination: stored.destination ?? null,
          delayMinutes: stored.delayMinutes ?? null,
          etaUTC: stored.etaUTC ?? null,
          fetchedAtMs,
          fetchedAt: FieldValue.serverTimestamp(),
          isValid: true,
          invalidReason: null,
          // Store only the upstream "data" (sanitized)
          payload: cachedPayload?.data ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        cached: false,
        valid: true,
        fetchedAtMs,
        ...stored,
        data: raw.data,
      });
    }

    await cacheRef.set(
      {
        carrier,
        flightNumber,
        flightDate,
        airline: stored.airline ?? null,
        source: stored.source ?? null,
        destination: stored.destination ?? null,
        delayMinutes: stored.delayMinutes ?? null,
        etaUTC: stored.etaUTC ?? null,
        fetchedAtMs,
        fetchedAt: FieldValue.serverTimestamp(),
        isValid: false,
        invalidReason: httpStatus === 404 ? 'not_found' : 'invalid_or_unavailable',
        payload: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(404).json({
      ok: false,
      cached: false,
      valid: false,
      fetchedAtMs,
      reason: httpStatus === 404 ? 'not_found' : 'invalid_or_unavailable',
      ...stored,
      data: null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'Internal Server Error', message: `Cache write failed: ${e?.message ?? 'Unknown error'}` });
  }
}

