export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  AIRPORT: "/airport",
  AIRPORT_BY_CODE: "/airport/:airportCode",
} as const;

/** Build path for a specific airport page (e.g. /airport/DEL). Use for links and after selecting an airport. */
export function getAirportPath(airportCode: string): string {
  return `/airport/${encodeURIComponent(airportCode)}`;
}
