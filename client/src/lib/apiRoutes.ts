const API_BASE_URL = "/api";

export const API_ROUTES = {
  // Auth routes
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_SIGNUP_COMPLETE: `${API_BASE_URL}/auth/signup/complete`,
  AUTH_FORGOT_PASSWORD_COMPLETE: `${API_BASE_URL}/auth/forgot-password/complete`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
  AUTH_REFRESH: `${API_BASE_URL}/auth/refresh`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,

  // User routes
  USER_PROFILE: `${API_BASE_URL}/user/profile`,
  USER_ME: `${API_BASE_URL}/user/me`,

  // Health routes
  HEALTH: `${API_BASE_URL}/health`,

  // Flight tracker routes
  FLIGHT_TRACKER: `${API_BASE_URL}/flight-tracker`,
  NEW_FLIGHT_TRACKER: `${API_BASE_URL}/new-flight-tracker`,

  // Traveller routes
  TRAVELLERS_BY_AIRPORT: `${API_BASE_URL}/travellers-by-airport`,
  GROUPS_BY_AIRPORT: `${API_BASE_URL}/groups-by-airport`,
  GROUP_MEMBERS: `${API_BASE_URL}/group-members`,
  CHECK_LISTING: `${API_BASE_URL}/check-listing`,
  REQUEST_CONNECTION: `${API_BASE_URL}/request-connection`,
  RESPOND_TO_CONNECTION: `${API_BASE_URL}/respond-to-connection`,
  LEAVE_GROUP: `${API_BASE_URL}/leave-group`,

  // Airport routes
  AIRPORTS: `${API_BASE_URL}/airports`,
  GET_TERMINALS: `${API_BASE_URL}/terminals`,

  // Notification routes
  NOTIFICATIONS_SEED: `${API_BASE_URL}/notifications/seed`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATIONS_UNREAD: `${API_BASE_URL}/notifications/unread-count`,
  NOTIFICATIONS_READ_ALL: `${API_BASE_URL}/notifications/read-all`,
} as const;
