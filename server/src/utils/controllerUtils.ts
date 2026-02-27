import { env } from "../config/env";

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

export {
  isDateTodayOrTomorrow,
  checkRoadDistance,
  roadDistanceBetweenTwoPoints,
};
