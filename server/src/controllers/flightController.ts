import type { Request, Response } from "express";
import type { Firestore } from "firebase-admin/firestore";
import { admin } from "../config/firebase";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { checkUserExists } from "./userController";
import { notifyUsersNearNewListing } from "./notificationController";
import { COLLECTIONS, TRAVELLER_FIELDS } from "../core/db";
import {
  IATA_CODE_LENGTH,
  checkRoadDistance,
  isDateTodayOrTomorrow,
  isValidIataCode,
} from "../utils/controllerUtils";
import {
  ApiError,
  badRequest,
  notFound,
  internalServerError,
  sendError,
} from "../core/errors";

interface CachedAirport {
  airportCode: string;
  airportName: string;
  city?: string;
  terminals: { id: string; name: string }[];
}

/** Loaded once after server start; only the first request triggers a Firestore read. */
let airportsCache: {
  list: { airportCode: string; airportName: string; city?: string }[];
  byCode: Map<string, CachedAirport>;
} | null = null;

/** Normalize terminal items from DB (id, name; strip updatedAt etc.). */
function normalizeTerminals(raw: unknown): { id: string; name: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => ({
    id: typeof t?.id === "string" ? t.id : "",
    name: typeof t?.name === "string" ? t.name : "",
  }));
}

async function ensureAirportsCache(db: Firestore): Promise<{
  list: { airportCode: string; airportName: string; city?: string }[];
  byCode: Map<string, CachedAirport>;
}> {
  if (airportsCache) return airportsCache;
  const snapshot = await db.collection(COLLECTIONS.AIRPORTS).get();
  const list: { airportCode: string; airportName: string; city?: string }[] = [];
  const byCode = new Map<string, CachedAirport>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    // DB fields: city, country, iataCode, icaoCode, name, terminals
    const airportCode = (data.iataCode || doc.id).toString().toUpperCase();
    const airportName = data.name || data.airportName || "Unknown Airport";
    const city = typeof data.city === "string" ? data.city : undefined;
    const terminals = normalizeTerminals(data.terminals);
    list.push({ airportCode, airportName, city });
    byCode.set(airportCode, { airportCode, airportName, city, terminals });
  }
  airportsCache = { list, byCode };
  return airportsCache;
}

/**
 * TYPES & INTERFACES
 */
interface FlightDoc {
  flightId: string;
  carrier: string;
  flightNumber: string;
  flightDate: string;
  etaFetchedAt: Timestamp | FieldValue | null;
  flightData: any | null;
  updatedAt: FieldValue;
  createdAt?: FieldValue;
  status?: "active" | "completed" | "pending_initial_fetch";
}

interface FlightStatsResponse {
  data?: {
    resultHeader?: { carrier?: { name?: string } };
    ticketHeader?: { carrier?: { name?: string } };
    departureAirport?: { fs?: string; terminal?: string; gate?: string };
    arrivalAirport?: {
      fs?: string;
      terminal?: string;
      gate?: string;
      baggage?: string;
    };
    positional?: { departureAirportCode?: string; arrivalAirportCode?: string };
    schedule?: {
      scheduledDepartureUTC?: string;
      scheduledArrivalUTC?: string;
      estimatedActualArrivalUTC?: string;
      scheduledArrival?: { dateUtc: string };
      estimatedActualArrival?: { dateUtc: string };
    };
    status?: {
      status?: string;
      statusDescription?: string;
      statusCode?: string;
      delay?: { arrival?: { minutes?: number } };
    };
    flightNote?: {
      phase?: string;
      message?: string;
      landed?: boolean;
    };
  };
}

/**
 * SHARED UTILS & CONSTANTS
 */
const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
const MAX_DISTANCE = 80000;

const isStale = (etaFetchedAt: Timestamp | undefined | null): boolean => {
  if (!etaFetchedAt) return true;
  return Date.now() - etaFetchedAt.toMillis() > TEN_MINUTES_IN_MS;
};

/**
 * SHARED CORE LOGIC: Fetching and Mapping
 */
async function fetchAndMapFlightData(
  carrier: string,
  fNum: string,
  y: number,
  m: number,
  d: number,
) {
  const upstreamUrl = `https://www.flightstats.com/v2/api-next/flight-tracker/${carrier}/${fNum}/${y}/${m}/${d}`;

  const apiResponse = await fetch(upstreamUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "halfride-server/1.0",
    },
  });

  if (!apiResponse.ok)
    throw new ApiError({
      statusCode: 502,
      code: "UPSTREAM_ERROR",
      message: `Upstream API returned ${apiResponse.status}`,
    });

  const raw = (await apiResponse.json()) as FlightStatsResponse;
  const f = raw?.data;

  if (!f || (!f.status && !f.schedule)) {
    throw new ApiError({
      statusCode: 404,
      code: "FLIGHT_NOT_FOUND",
      message: "Flight not found in external tracking system",
    });
  }

  const isLanded =
    f.status?.statusCode === "L" ||
    f.status?.statusCode === "A" ||
    !!f.flightNote?.landed;
  const arrivalObj = Array.isArray(f.arrivalAirport)
    ? f.arrivalAirport[0]
    : f.arrivalAirport;
  const departureObj = Array.isArray(f.departureAirport)
    ? f.departureAirport[0]
    : f.departureAirport;

  return {
    airlineName:
      f.resultHeader?.carrier?.name || f.ticketHeader?.carrier?.name || null,
    departure: {
      airportCode:
        departureObj?.fs || f.positional?.departureAirportCode || null,
      terminal: departureObj?.terminal || null,
      gate: departureObj?.gate || null,
      scheduledTime: f.schedule?.scheduledDepartureUTC || null,
    },
    arrival: {
      airportCode: arrivalObj?.fs || f.positional?.arrivalAirportCode || null,
      terminal: arrivalObj?.terminal || null,
      gate: arrivalObj?.gate || null,
      baggage: arrivalObj?.baggage || null,
      scheduledTime:
        f.schedule?.scheduledArrivalUTC ||
        f.schedule?.scheduledArrival?.dateUtc ||
        null,
      estimatedActualTime:
        f.schedule?.estimatedActualArrivalUTC ||
        f.schedule?.estimatedActualArrival?.dateUtc ||
        null,
    },
    schedule: {
      scheduledArrival:
        f.schedule?.scheduledArrivalUTC ||
        f.schedule?.scheduledArrival?.dateUtc ||
        null,
      estimatedActualArrival:
        f.schedule?.estimatedActualArrivalUTC ||
        f.schedule?.estimatedActualArrival?.dateUtc ||
        null,
    },
    status: {
      status: f.status?.status || null,
      statusDescription: f.status?.statusDescription || null,
      statusCode: f.status?.statusCode || null,
      delayMinutes: f.status?.delay?.arrival?.minutes || 0,
    },
    flightNote: {
      phase: f.flightNote?.phase || null,
      message: f.flightNote?.message || null,
      landed: isLanded,
    },
    isLanded: isLanded,
  };
}

/**
 * ENDPOINT 1: CREATE FLIGHT ENTRY
 */
export async function createFlightTracker(req: Request, res: Response) {
  const {
    carrier: rawCarrier,
    flightNumber: rawFlightNumber,
    year,
    month,
    day,
    destination,
    userTerminal,
    airportCode,
  } = req.body;
  const uid = req.auth!.uid;

  if (!req.body || typeof req.body !== "object") {
    return badRequest(res, "Request body must be a JSON object");
  }

  if (
    !rawCarrier ||
    !rawFlightNumber ||
    year == null ||
    month == null ||
    day == null ||
    destination == null ||
    !userTerminal ||
    !airportCode
  ) {
    return badRequest(res, "Missing required parameters");
  }

  const carrier = String(rawCarrier ?? "")
    .trim()
    .toUpperCase();
  const fNum = String(rawFlightNumber ?? "").trim();
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!carrier || !fNum) {
    return badRequest(res, "carrier and flightNumber are required");
  }
  if (!isFinite(y) || !isFinite(m) || !isFinite(d)) {
    return badRequest(res, "year, month and day must be numbers");
  }
  if (
    !isDateTodayOrTomorrow(new Date(Date.UTC(y, m - 1, d)))
  ) {
    return badRequest(res, "Flight date must be today or tomorrow");
  }

  // Validate destination shape (object with optional placeId/address) when provided.
  if (typeof destination !== "object" || destination === null) {
    return badRequest(
      res,
      "destination must be an object with optional placeId and address",
    );
  }
  const destinationPlaceId =
    "placeId" in destination && typeof destination.placeId === "string"
      ? destination.placeId.trim()
      : "";
  if ("placeId" in destination && !destinationPlaceId) {
    return badRequest(res, "destination.placeId, if provided, must be a non-empty string");
  }
  if (
    "address" in destination &&
    destination.address != null &&
    typeof destination.address !== "string"
  ) {
    return badRequest(
      res,
      "destination.address, if provided, must be a string",
    );
  }

  const airportCodeStr = String(airportCode ?? "").trim().toUpperCase();
  if (!airportCodeStr) {
    return badRequest(res, "airportCode is required");
  }
  if (!isValidIataCode(airportCodeStr)) {
    return badRequest(
      res,
      `airportCode must be a ${IATA_CODE_LENGTH}-character IATA code`,
    );
  }

  const userTerminalStr = String(userTerminal ?? "").trim();
  if (!userTerminalStr) {
    return badRequest(res, "userTerminal is required");
  }
  if (userTerminalStr.length > 20) {
    return badRequest(res, "userTerminal must be at most 20 characters");
  }

  const userCheck = await checkUserExists(uid);
  if (!userCheck.ok || !userCheck.exists) {
    return badRequest(res, "User record not found");
  }

  const flightDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const db = admin.firestore();
  const flightDocId = `${carrier}_${fNum}_${flightDateStr}`;
  const flightRef = db.collection(COLLECTIONS.FLIGHT_DETAIL).doc(flightDocId);
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  try {
    let flightData;

    // 2. Fetch or Retrieve Flight Details
    const flightSnap = await flightRef.get();

    if (flightSnap.exists) {
      // If it exists, pull the existing data
      const existingDoc = flightSnap.data();
      flightData = existingDoc?.flightData;
    } else {
      // If it doesn't, fetch from external API
      flightData = await fetchAndMapFlightData(carrier, fNum, y, m, d);
    }

    const arrivalCode = flightData.arrival?.airportCode;
    if (!arrivalCode) {
      return badRequest(res, "Flight arrival airport not found");
    }

    if (airportCode && arrivalCode !== String(airportCode).toUpperCase()) {
      return badRequest(
        res,
        `This flight arrives at ${arrivalCode}, not ${airportCode}.`,
      );
    }

    if (destinationPlaceId) {
      try {
        const distance = await checkRoadDistance(
          arrivalCode,
          destinationPlaceId,
        );
        if (distance > MAX_DISTANCE) {
          return badRequest(
            res,
            `This flight is too far from ${arrivalCode}.`,
          );
        }
      } catch (error) {
        console.error("Error checking road distance:", error);
        return internalServerError(
          res,
          "Error checking road distance",
          "DISTANCE_CHECK_FAILED",
        );
      }
    }
    const { byCode } = await ensureAirportsCache(db);
    if (!byCode.has(String(arrivalCode).toUpperCase())) {
      return badRequest(
        res,
        `Arrival airport ${arrivalCode} is not supported`,
      );
    }

    // 4. Persist Flight if new
    if (!flightSnap.exists) {
      const newFlight = {
        flightId: `${carrier}_${fNum}`,
        carrier,
        flightNumber: fNum,
        flightDate: flightDateStr,
        etaFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        flightData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: flightData.isLanded ? "completed" : "active",
      };

      await flightRef.set(newFlight);
    }

    // 5. Create/Update the traveller_data record
    // We use a composite ID (uid_flightId) so a user can't track the same flight twice
    const travellerDocId = `${uid}_${flightDocId}`;

    const travellerRef = db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .doc(travellerDocId);

    // Enforce at most one active listing per user: reject if they have an active listing for a different flight
    const activeListingSnap = await db
      .collection(COLLECTIONS.TRAVELLER_DATA)
      .where(TRAVELLER_FIELDS.USER_REF, "==", userRef)
      .where(TRAVELLER_FIELDS.IS_COMPLETED, "==", false)
      .limit(2)
      .get();

    if (!activeListingSnap.empty) {
      const otherActive = activeListingSnap.docs.find((d) => d.id !== travellerRef.id);
      if (otherActive) {
        return badRequest(
          res,
          "You already have an active listing. Complete or remove it before adding another.",
        );
      }
    }

    const travellerSnap = await travellerRef.get();
    const isNewTraveller = !travellerSnap.exists;

    const travellerPayload: any = {
      [TRAVELLER_FIELDS.DATE]: flightDateStr,
      [TRAVELLER_FIELDS.FLIGHT_ARRIVAL]:
        flightData.arrival?.airportCode || "N/A",
      [TRAVELLER_FIELDS.FLIGHT_DEPARTURE]:
        flightData.departure?.airportCode || "N/A",
      [TRAVELLER_FIELDS.TERMINAL]: userTerminalStr || "N/A",
      [TRAVELLER_FIELDS.DESTINATION]: destination,
      [TRAVELLER_FIELDS.FLIGHT_REF]: flightRef,
      [TRAVELLER_FIELDS.USER_REF]: userRef,
      [TRAVELLER_FIELDS.UPDATED_AT]:
        admin.firestore.FieldValue.serverTimestamp(),
      [TRAVELLER_FIELDS.GROUP_REF]: null,
      [TRAVELLER_FIELDS.CONNECTION_REQUESTS]: [],
      [TRAVELLER_FIELDS.IS_COMPLETED]: false,
    };

    if (isNewTraveller) {
      travellerPayload[TRAVELLER_FIELDS.CREATED_AT] =
        admin.firestore.FieldValue.serverTimestamp();
    }

    await travellerRef.set(travellerPayload, { merge: true });

    if (isNewTraveller) {
      void notifyUsersNearNewListing(travellerRef, travellerPayload);
    }

    return res.status(201).json({
      ok: true,
      message: "Flight tracking initialized",
      flightId: flightDocId,
      travellerId: travellerDocId,
    });
  } catch (error: unknown) {
    console.error("Create Flight Error:", error);
    if (error instanceof ApiError) {
      return sendError(res, {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }
    return internalServerError(
      res,
      error instanceof Error ? error.message : "Failed to create flight tracker",
    );
  }
}
/**
 * ENDPOINT 2: GET FLIGHT TRACKER
 */
export async function getFlightTracker(req: Request, res: Response) {
  if (!req.body || typeof req.body !== "object") {
    return badRequest(res, "Request body must be a JSON object");
  }

  const { carrier: rawCarrier, flightNumber, year, month, day } = req.body;

  const carrier = String(rawCarrier ?? "")
    .trim()
    .toUpperCase();
  const fNum = String(flightNumber ?? "").trim();
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!carrier || !fNum) {
    return badRequest(res, "carrier and flightNumber are required");
  }
  if (!isFinite(y) || !isFinite(m) || !isFinite(d)) {
    return badRequest(res, "year, month and day must be numbers");
  }
  if (
    !isDateTodayOrTomorrow(new Date(Date.UTC(y, m - 1, d)))
  ) {
    return badRequest(res, "Flight date must be today or tomorrow");
  }

  const flightDocId = `${carrier}_${fNum}_${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const db = admin.firestore();

  const flightRef = db.collection(COLLECTIONS.FLIGHT_DETAIL).doc(flightDocId);

  try {
    const doc = await flightRef.get();
    if (!doc.exists) {
      return notFound(res, "Flight not registered");
    }

    const existing = doc.data() as FlightDoc;

    if (existing.flightData && !isStale(existing.etaFetchedAt as Timestamp)) {
      return res.json({ ok: true, valid: true, data: existing.flightData });
    }

    const flightData = await fetchAndMapFlightData(carrier, fNum, y, m, d);

    await flightRef.update({
      etaFetchedAt: FieldValue.serverTimestamp(),
      flightData,
      updatedAt: FieldValue.serverTimestamp(),
      status: flightData.isLanded ? "completed" : "active",
    });

    return res.json({ ok: true, valid: true, data: flightData });
  } catch (error: unknown) {
    console.error("Tracker Error:", error);
    if (error instanceof ApiError) {
      return sendError(res, {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }
    return internalServerError(res);
  }
}

/**
 * ENDPOINT 3: GET AIRPORTS
 * Served from in-memory cache to reduce Firestore reads (airport list is mostly static).
 */
export async function getAirports(_req: Request, res: Response) {
  try {
    const db = admin.firestore();
    const { list } = await ensureAirportsCache(db);
    return res.json({ ok: true, data: list });
  } catch (error: unknown) {
    console.error("Get Airports Error:", error);
    return internalServerError(
      res,
      error instanceof Error ? error.message : "Failed to load airports",
    );
  }
}

/**
 * ENDPOINT 4: GET TERMINALS FOR AIRPORT
 * Served from in-memory cache to avoid per-request Firestore reads.
 */
export async function getTerminals(req: Request, res: Response) {
  const { airportCode } = req.body || {};

  if (!airportCode) {
    return badRequest(res, "Airport Code is required");
  }

  const airportCodeStr = String(airportCode).trim().toUpperCase();
  if (!airportCodeStr) {
    return badRequest(res, "Airport Code is required");
  }
  if (!isValidIataCode(airportCodeStr)) {
    return badRequest(
      res,
      `Airport Code must be a ${IATA_CODE_LENGTH}-character IATA code`,
    );
  }

  const code = airportCodeStr;

  try {
    const db = admin.firestore();
    const { byCode } = await ensureAirportsCache(db);
    const cached = byCode.get(code);

    if (!cached) {
      return notFound(res, `Airport ${airportCode} not found`);
    }

    return res.json({ ok: true, data: cached.terminals });
  } catch (error: unknown) {
    console.error("Get Terminals Error:", error);
    return internalServerError(
      res,
      error instanceof Error ? error.message : "Failed to load terminals",
    );
  }
}
