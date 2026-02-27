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

const isValidIsoDateString = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
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

export {
  isDateTodayOrTomorrow,
  checkRoadDistance,
  roadDistanceBetweenTwoPoints,
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
