const API_BASE_URL = "/api"

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
} as const

