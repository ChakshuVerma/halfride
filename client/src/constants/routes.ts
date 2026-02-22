export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  AIRPORT: "/airport",
  AIRPORT_BY_CODE: "/airport/:airportCode",
  PROFILE: "/profile/:username",
} as const;

/** Build path for a specific airport page (e.g. /airport/DEL). Use for links and after selecting an airport. */
export function getAirportPath(airportCode: string): string {
  return `/airport/${encodeURIComponent(airportCode)}`;
}

/** Build path to open a specific group at an airport (opens group modal on the airport page). */
export function getAirportGroupPath(airportCode: string, groupId: string): string {
  return `/airport/${encodeURIComponent(airportCode)}?group=${encodeURIComponent(groupId)}`;
}

/** Build path to open a specific traveller/listing at an airport (opens traveller modal on the airport page). */
export function getAirportTravellerPath(airportCode: string, userId: string): string {
  return `/airport/${encodeURIComponent(airportCode)}?traveller=${encodeURIComponent(userId)}`;
}

/** Build path for a user profile (e.g. /profile/johndoe). */
export function getProfilePath(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}
