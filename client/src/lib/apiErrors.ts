/**
 * Standard API error shape returned by the server.
 * All error responses use: { ok: false, error: string, code?: string, message?: string, details?: unknown }
 */
export interface ApiErrorBody {
  ok: false
  error: string
  code?: string
  message?: string
  details?: unknown
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ApiErrorBody).ok === false &&
    typeof (value as ApiErrorBody).error === "string"
  )
}

/**
 * Error class for API failures. message is the user-facing string (from server message or error).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly body?: ApiErrorBody

  constructor(status: number, message: string, code?: string, body?: ApiErrorBody) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.body = body
  }
}

/**
 * Parse a failed response body and return a user-facing message and optional code.
 * Prefers server message, then error (code label), then fallback.
 */
export function parseApiErrorResponse(
  status: number,
  body: unknown,
  fallbackMessage: string
): { message: string; code?: string; body?: ApiErrorBody } {
  if (isApiErrorBody(body)) {
    const message =
      body.message && body.message.trim()
        ? body.message.trim()
        : body.error && body.error.trim()
          ? body.error.trim()
          : fallbackMessage
    return {
      message,
      code: body.code,
      body,
    }
  }
  return { message: fallbackMessage }
}
