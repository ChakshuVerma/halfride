import type { Request, Response } from 'express';
import { admin } from '../firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

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
  status?: 'active' | 'completed' | 'pending_initial_fetch';
}

interface FlightStatsResponse {
  data?: {
    resultHeader?: { carrier?: { name?: string } };
    ticketHeader?: { carrier?: { name?: string } };
    departureAirport?: { fs?: string; terminal?: string; gate?: string };
    arrivalAirport?: { fs?: string; terminal?: string; gate?: string; baggage?: string };
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
const TEN_MINUTES_IN_MS = 0;

const isDateTodayOrTomorrow = (inputDate: Date): boolean => {
  const compareInput = new Date(inputDate);
  compareInput.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return (
    compareInput.getTime() === today.getTime() ||
    compareInput.getTime() === tomorrow.getTime()
  );
};

const isStale = (etaFetchedAt: Timestamp | undefined | null): boolean => {
  if (!etaFetchedAt) return true;
  return Date.now() - etaFetchedAt.toMillis() > TEN_MINUTES_IN_MS;
};

/**
 * SHARED CORE LOGIC: Fetching and Mapping
 */
async function fetchAndMapFlightData(carrier: string, fNum: string, y: number, m: number, d: number) {
  const upstreamUrl = `https://www.flightstats.com/v2/api-next/flight-tracker/${carrier}/${fNum}/${y}/${m}/${d}`;
  console.log(upstreamUrl);
  
  const apiResponse = await fetch(upstreamUrl, {
    headers: { 'accept': 'application/json', 'user-agent': 'halfride-server/1.0' }
  });

  if (!apiResponse.ok) throw new Error(`Upstream API returned ${apiResponse.status}`);

  const raw = (await apiResponse.json()) as FlightStatsResponse;
  const f = raw?.data;

  if (!f || (!f.status && !f.schedule)) {
    throw new Error('Flight not found in external tracking system');
  }

  const isLanded = f.status?.statusCode === 'L' || f.status?.statusCode === 'A' || !!f.flightNote?.landed;

  return {
    airlineName: f.resultHeader?.carrier?.name || f.ticketHeader?.carrier?.name || null,
    
    departure: {
      airportCode: f.departureAirport?.fs || f.positional?.departureAirportCode || null,
      terminal: f.departureAirport?.terminal || null,
      gate: f.departureAirport?.gate || null,
      scheduledTime: f.schedule?.scheduledDepartureUTC || null,
    },

    arrival: {
      airportCode: f.arrivalAirport?.fs || f.positional?.arrivalAirportCode || null,
      terminal: f.arrivalAirport?.terminal || null,
      gate: f.arrivalAirport?.gate || null,
      baggage: f.arrivalAirport?.baggage || null,
      scheduledTime: f.schedule?.scheduledArrivalUTC || f.schedule?.scheduledArrival?.dateUtc || null,
      estimatedActualTime: f.schedule?.estimatedActualArrivalUTC || f.schedule?.estimatedActualArrival?.dateUtc || null,
    },

    schedule: {
      scheduledArrival: f.schedule?.scheduledArrivalUTC || f.schedule?.scheduledArrival?.dateUtc || null,
      estimatedActualArrival: f.schedule?.estimatedActualArrivalUTC || f.schedule?.estimatedActualArrival?.dateUtc || null,
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
    isLanded: isLanded
  };
}

/**
 * ENDPOINT 1: CREATE FLIGHT ENTRY
 */
export async function createFlightEntry(req: Request, res: Response) {
  const { carrier: rawCarrier, flightNumber: rawFlightNumber, year, month, day } = req.body;

  const carrier = String(rawCarrier ?? '').trim().toUpperCase();
  const fNum = String(rawFlightNumber ?? '').trim();
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!carrier || !fNum || isNaN(y) || isNaN(m) || isNaN(d)) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'Invalid params' });
  }

  if (!isDateTodayOrTomorrow(new Date(y, m - 1, d))) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'Only today/tomorrow allowed' });
  }

  const flightDocId = `${carrier}_${fNum}_${y}-${m}-${d}`;
  const db = admin.firestore();
  const flightRef = db.collection('flightDetail').doc(flightDocId);

  try {
    const doc = await flightRef.get();
    if (doc.exists) {
      return res.status(200).json({ ok: true, message: 'Flight already exists', flightId: flightDocId });
    }

    const flightData = await fetchAndMapFlightData(carrier, fNum, y, m, d);

    const newFlight: FlightDoc = {
      flightId: `${carrier}_${fNum}`,
      carrier,
      flightNumber: fNum,
      flightDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      etaFetchedAt: FieldValue.serverTimestamp(),
      flightData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: flightData.isLanded ? 'completed' : 'active'
    };

    await flightRef.set(newFlight);
    return res.status(201).json({ ok: true, message: 'Flight registered', flightId: flightDocId });

  } catch (error: any) {
    console.error('Create Flight Error:', error.message);
    return res.status(404).json({ ok: false, error: 'Not Found', message: error.message });
  }
}

/**
 * ENDPOINT 2: GET FLIGHT TRACKER
 */
export async function getFlightTracker(req: Request, res: Response) {
  const { carrier: rawCarrier, flightNumber, year, month, day } = req.body;
  
  const carrier = String(rawCarrier ?? '').trim().toUpperCase();
  const fNum = String(flightNumber ?? '').trim();
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!isDateTodayOrTomorrow(new Date(y, m - 1, d))) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'Only today/tomorrow allowed' });
  }

  const flightDocId = `${carrier}_${fNum}_${y}-${m}-${d}`;
  const db = admin.firestore();
  const flightRef = db.collection('flightDetail').doc(flightDocId);
  
  try {
    const doc = await flightRef.get();
    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: 'Not Found', message: 'Flight not registered' });
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
      status: flightData.isLanded ? 'completed' : 'active'
    });

    return res.json({ ok: true, valid: true, data: flightData });
  } catch (error: any) {
    console.error('Tracker Error:', error.message);
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}

/**
 * CLEANUP SCRIPT
 */
export async function cleanupOldFlights() {
  const db = admin.firestore();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const snapshot = await db.collection('flightDetail')
      .where('status', '==', 'completed')
      .where('updatedAt', '<', twentyFourHoursAgo)
      .get();

    if (snapshot.empty) return { deleted: 0 };

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return { deleted: snapshot.size };
  } catch (error) {
    console.error('Cleanup Error:', error);
    throw error;
  }
}