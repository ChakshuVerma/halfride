import { API_ROUTES } from "./apiRoutes"

const ERROR_REQUEST_FAILED = (status: number) => `Request failed with status ${status}`
const ERROR_HTTP_ERROR = (status: number) => `HTTP error! status: ${status}`

async function refreshSessionOnce() {
  // backend rotates refresh token + returns new access cookie
  const res = await fetch(API_ROUTES.AUTH_REFRESH, { method: "POST", credentials: "include" })
  return res.ok
}

export async function publicRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  }

  const response = await fetch(endpoint, {
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
  const isFormData = options.body instanceof FormData
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include",
  })

  if (!response.ok) {
    if (response.status === 401) {
      const refreshed = await refreshSessionOnce()
      if (refreshed) {
        const retry = await fetch(endpoint, {
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
