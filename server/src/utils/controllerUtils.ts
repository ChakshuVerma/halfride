import { env } from "../config/env";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH_DEFAULT = 8;
const NAME_MAX_LENGTH_DEFAULT = 100;
const IATA_CODE_LENGTH = 3;

const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;

const isDateTodayOrTomorrow = (inputDate: Date): boolean => {
  const now = new Date();

  // Create UTC dates for comparison (ignoring time)
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  // Normalize input to UTC midnight
  const input = new Date(
    Date.UTC(
      inputDate.getUTCFullYear(),
      inputDate.getUTCMonth(),
      inputDate.getUTCDate(),
    ),
  );

  return (
    input.getTime() === today.getTime() ||
    input.getTime() === tomorrow.getTime()
  );
};

const checkRoadDistance = async (originCode: string, destPlaceId: string) => {
  const apiKey = env.googleMapsApiKey;

  // We use "airport" prefix to help Google geocode the IATA code correctly
  const origin = `airport ${originCode}`;
  const destination = `place_id:${destPlaceId}`;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google API responded with status: ${response.status}`);
  }

  const data = (await response.json()) as any;

  if (data.status !== "OK" || data.rows[0].elements[0].status !== "OK") {
    throw new Error(
      "Unable to calculate road distance between airport and destination.",
    );
  }

  // distance.value is in meters
  return data.rows[0].elements[0].distance.value;
};

const roadDistanceBetweenTwoPoints = async (
  originPlaceId: string,
  destPlaceId: string,
) => {
  const apiKey = env.googleMapsApiKey;
  const origin = `place_id:${originPlaceId}`;
  const destination = `place_id:${destPlaceId}`;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google API responded with status: ${response.status}`);
  }

  const data = (await response.json()) as any;

  if (data.status !== "OK" || data.rows[0].elements[0].status !== "OK") {
    throw new Error(
      "Unable to calculate road distance between airport and destination.",
    );
  }

  // distance.value is in meters
  return data.rows[0].elements[0].distance.value;
};

const DISTANCE_MATRIX_MAX_DESTINATIONS = 25;

/**
 * Road distances from one origin to many destinations (Google Distance Matrix).
 * Returns distances in meters, same order as destPlaceIds; null for failed/unavailable.
 * Batches in chunks of 25 (API limit).
 */
async function roadDistanceFromOneToMany(
  originPlaceId: string,
  destPlaceIds: string[],
): Promise<(number | null)[]> {
  if (destPlaceIds.length === 0) return [];
  const apiKey = env.googleMapsApiKey;
  const origin = `place_id:${originPlaceId}`;
  const results: (number | null)[] = [];
  for (let i = 0; i < destPlaceIds.length; i += DISTANCE_MATRIX_MAX_DESTINATIONS) {
    const chunk = destPlaceIds.slice(i, i + DISTANCE_MATRIX_MAX_DESTINATIONS);
    const destinations = chunk.map((id) => `place_id:${id}`).join("|");
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destinations)}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      chunk.forEach(() => results.push(null));
      continue;
    }
    const data = (await response.json()) as {
      status: string;
      rows?: Array<{
        elements?: Array<{ status: string; distance?: { value: number } }>;
      }>;
    };
    if (data.status !== "OK" || !data.rows?.[0]?.elements) {
      chunk.forEach(() => results.push(null));
      continue;
    }
    for (const el of data.rows[0].elements) {
      if (el.status === "OK" && el.distance?.value != null) {
        results.push(el.distance.value);
      } else {
        results.push(null);
      }
    }
  }
  return results;
}

const isValidIsoDateString = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  return true;
};

const isValidUsername = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (
    trimmed.length < USERNAME_MIN_LENGTH ||
    trimmed.length > USERNAME_MAX_LENGTH
  ) {
    return false;
  }
  return USERNAME_REGEX.test(trimmed);
};

const isValidPassword = (
  value: unknown,
  minLength: number = PASSWORD_MIN_LENGTH_DEFAULT,
): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= minLength;
};

const isValidName = (
  value: unknown,
  maxLength: number = NAME_MAX_LENGTH_DEFAULT,
): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
};

const isValidIataCode = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toUpperCase();
  if (trimmed.length !== IATA_CODE_LENGTH) return false;
  return /^[A-Z0-9]+$/.test(trimmed);
};

const OPENFLIGHTS_AIRPORTS_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";

/** Parse one line of OpenFlights CSV (handles quoted fields). Columns: 0=ID, 1=Name, 2=City, 3=Country, 4=IATA, 5=ICAO, 6=Lat, 7=Long, ... */
function parseOpenFlightsCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let end = i;
      while (end < line.length) {
        if (line[end] === '"') {
          if (line[end + 1] === '"') {
            end += 2;
            continue;
          }
          break;
        }
        end += 1;
      }
      fields.push(line.slice(i, end).replace(/""/g, '"'));
      i = end + 1;
      if (line[i] === ",") i += 1;
      continue;
    }
    const comma = line.indexOf(",", i);
    if (comma === -1) {
      fields.push(line.slice(i).trim());
      break;
    }
    fields.push(line.slice(i, comma).trim());
    i = comma + 1;
  }
  return fields;
}

let openFlightsCache: Map<string, { lat: number; lng: number }> | null = null;
let openFlightsLoadPromise: Promise<
  Map<string, { lat: number; lng: number }>
> | null = null;

/** Load OpenFlights airports dataset and build IATA -> { lat, lng } map. Cached in memory. */
async function loadOpenFlightsAirports(): Promise<
  Map<string, { lat: number; lng: number }>
> {
  if (openFlightsCache) return openFlightsCache;
  if (openFlightsLoadPromise) return openFlightsLoadPromise;

  openFlightsLoadPromise = (async () => {
    const response = await fetch(OPENFLIGHTS_AIRPORTS_URL);
    if (!response.ok) {
      throw new Error(
        `OpenFlights airports.dat fetch failed: ${response.status}`,
      );
    }
    const text = await response.text();
    const map = new Map<string, { lat: number; lng: number }>();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const fields = parseOpenFlightsCsvLine(line);
      const iata = fields[4]?.trim();
      if (!iata || iata === "\\N" || iata.length !== 3) continue;
      const lat = Number(fields[6]);
      const lng = Number(fields[7]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = iata.toUpperCase();
      if (!map.has(key)) map.set(key, { lat, lng });
    }
    openFlightsCache = map;
    return map;
  })();

  return openFlightsLoadPromise;
}

/** Geocode airport by IATA code; returns { lat, lng } or throws. Uses OpenFlights data (all airports), then Google Geocoding API if enabled. */
const geocodeAirport = async (
  iataCode: string,
): Promise<{ lat: number; lng: number }> => {
  const code = iataCode.trim().toUpperCase();
  if (code.length !== 3) {
    throw new Error(`Invalid IATA code: ${iataCode}`);
  }

  const openFlights = await loadOpenFlightsAirports();
  const fromOpenFlights = openFlights.get(code);
  if (fromOpenFlights) {
    return fromOpenFlights;
  }

  const apiKey = env.googleMapsApiKey;
  if (apiKey) {
    const queries = [
      `airport ${code}`,
      `${code} airport`,
      `${code} international airport`,
    ];
    for (const addressStr of queries) {
      const address = encodeURIComponent(addressStr);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = (await response.json()) as {
        status: string;
        results?: Array<{
          geometry?: { location?: { lat: number; lng: number } };
        }>;
      };
      if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
        const loc = data.results[0].geometry!.location!;
        const lat = typeof loc.lat === "number" ? loc.lat : Number(loc.lat);
        const lng = typeof loc.lng === "number" ? loc.lng : Number(loc.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    }
  }

  throw new Error(
    `Unable to resolve coordinates for airport ${code}. It was not found in the OpenFlights database. Ensure the IATA code is correct.`,
  );
};

/** Haversine distance in meters between two lat/lng points. */
const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export {
  isDateTodayOrTomorrow,
  checkRoadDistance,
  roadDistanceBetweenTwoPoints,
  roadDistanceFromOneToMany,
  geocodeAirport,
  haversineDistance,
  isValidIsoDateString,
  isValidUsername,
  isValidPassword,
  isValidName,
  isValidIataCode,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH_DEFAULT,
  NAME_MAX_LENGTH_DEFAULT,
  IATA_CODE_LENGTH,
};
