import { API_ROUTES } from "./apiRoutes"
import { ApiError, parseApiErrorResponse } from "./apiErrors"

const ERROR_REQUEST_FAILED = (status: number) => `Request failed with status ${status}`

async function refreshSessionOnce() {
  const res = await fetch(API_ROUTES.AUTH_REFRESH, { method: "POST", credentials: "include" })
  return res.ok
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null)
  const { message, code, body: errorBody } = parseApiErrorResponse(
    response.status,
    body,
    ERROR_REQUEST_FAILED(response.status),
  )
  return new ApiError(response.status, message, code, errorBody)
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
    throw await parseErrorResponse(response)
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
    throw await parseErrorResponse(response)
  }

  return response.json()
}
