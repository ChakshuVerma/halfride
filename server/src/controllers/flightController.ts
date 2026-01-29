import type { Request, Response } from 'express';
import { admin } from '../firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { checkUserExists } from './userController';

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
export async function createFlightTracker(req: Request, res: Response) {
  const { carrier: rawCarrier, flightNumber: rawFlightNumber, year, month, day, destination } = req.body;
  const uid = req.auth!.uid;

  // 1. Verify User record actually exists in Firestore
  const userCheck = await checkUserExists(uid);
  if (!userCheck.ok || !userCheck.exists) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'User record not found' });
  }

  const carrier = String(rawCarrier ?? '').trim().toUpperCase();
  const fNum = String(rawFlightNumber ?? '').trim();
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!carrier || !fNum || isNaN(y) || isNaN(m) || isNaN(d) || !isDateTodayOrTomorrow(new Date(y, m - 1, d))) {
    return res.status(400).json({ ok: false, error: 'Bad Request', message: 'Invalid params' });
  }

  const flightDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  const db = admin.firestore();
  const flightDocId = `${carrier}_${fNum}_${flightDateStr}`;
  const flightRef = db.collection('flightDetail').doc(flightDocId);
  const userRef = db.collection('users').doc(uid);

  try {
    let flightData;

    // 2. Fetch or Retrieve Flight Details
    const flightSnap = await flightRef.get();
    
    if (flightSnap.exists) {
      // If it exists, pull the existing data
      const existingDoc = flightSnap.data();
      flightData = existingDoc?.flightData;
    } else {
      // If it doesn't, fetch from external API and save it
      flightData = await fetchAndMapFlightData(carrier, fNum, y, m, d);
      
      const newFlight = {
        flightId: `${carrier}_${fNum}`,
        carrier,
        flightNumber: fNum,
        flightDate: flightDateStr,
        etaFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        flightData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: flightData.isLanded ? 'completed' : 'active'
      };
      
      await flightRef.set(newFlight);
    }

    // 3. Create/Update the traveller_data record
    // We use a composite ID (uid_flightId) so a user can't track the same flight twice
    const travellerDocId = `${uid}_${flightDocId}`;
    const travellerRef = db.collection('traveller_data').doc(travellerDocId);

    await travellerRef.set({
      date: flightDateStr,
      flightArrival: flightData.arrival?.airportCode || 'N/A',
      flightDeparture: flightData.departure?.airportCode || 'N/A',
      terminal: flightData.departure?.terminal || 'N/A',
      destination: destination,
      flightRef: flightRef,
      userRef: userRef,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(201).json({ 
      ok: true, 
      message: 'Flight tracking initialized', 
      flightId: flightDocId,
      travellerId: travellerDocId 
    });

  } catch (error: any) {
    console.error('Create Flight Error:', error.message);
    const code = error.message.includes('not found') ? 404 : 500;
    return res.status(code).json({ ok: false, error: 'Internal Error', message: error.message });
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