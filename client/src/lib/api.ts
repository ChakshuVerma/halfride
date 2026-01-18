const API_BASE_URL = "/api"

const ERROR_NOT_AUTHENTICATED = "Not authenticated. Please log in."
const ERROR_AUTH_FAILED = "Authentication failed. Please log in again."
const ERROR_REQUEST_FAILED = (status: number) => `Request failed with status ${status}`
const ERROR_HTTP_ERROR = (status: number) => `HTTP error! status: ${status}`
const ERROR_UNKNOWN = "Unknown error"

async function refreshSessionOnce() {
  // backend rotates refresh token + returns new access cookie
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" })
  return res.ok
}

export async function publicRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: ERROR_HTTP_ERROR(response.status)
    }))
    throw new Error(error.message || ERROR_REQUEST_FAILED(response.status))
  }

  return response.json()
}

/**
 * Authenticated request using ONLY the backend session cookie (no Bearer token).
 * Uses access/refresh cookies and auto-refreshes once on 401.
 */
export async function sessionRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  })

  if (!response.ok) {
    if (response.status === 401) {
      const refreshed = await refreshSessionOnce()
      if (refreshed) {
        const retry = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: "include",
        })
        if (retry.ok) return retry.json()
      }
    }
    const error = await response.json().catch(() => ({
      message: ERROR_HTTP_ERROR(response.status),
    }))
    throw new Error(error.message || ERROR_REQUEST_FAILED(response.status))
  }

  return response.json()
}
