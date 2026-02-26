export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  AIRPORT: "/airport",
  AIRPORT_BY_CODE: "/airport/:airportCode",
  PROFILE: "/profile/:username",
  GROUP_CHAT: "/groups/:groupId/chat",
} as const;

/** Build path for a specific airport page (e.g. /airport/DEL). Use for links and after selecting an airport. */
export function getAirportPath(airportCode: string): string {
  return `/airport/${encodeURIComponent(airportCode)}`;
}

/** Build path for a user profile (e.g. /profile/johndoe). */
export function getProfilePath(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}

/** Build path for a specific group chat (e.g. /groups/abc123/chat). */
export function getGroupChatPath(groupId: string): string {
  return `/groups/${encodeURIComponent(groupId)}/chat`;
}
