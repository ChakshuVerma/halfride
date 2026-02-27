import type { Response } from "express";

/**
 * Standard API error shape returned by the server.
 *
 * All error responses should:
 * - Have HTTP status >= 400
 * - Use this JSON structure:
 *   {
 *     ok: false,
 *     error: string,   // human-readable or simple machine code
 *     code?: string,   // machine-friendly code, e.g. BAD_REQUEST
 *     message?: string,
 *     details?: unknown
 *   }
 */
export interface ApiErrorBody {
  ok: false;
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(options: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

type ErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

export function buildErrorBody(options: ErrorOptions): ApiErrorBody {
  const body: ApiErrorBody = {
    ok: false,
    error: options.code,
    code: options.code,
    message: options.message,
  };

  if (options.details !== undefined) {
    body.details = options.details;
  }

  return body;
}

export function sendError(res: Response, options: ErrorOptions) {
  return res.status(options.statusCode).json(buildErrorBody(options));
}

// Convenience helpers for common HTTP status codes.

export function badRequest(
  res: Response,
  message: string,
  code = "BAD_REQUEST",
  details?: unknown,
) {
  return sendError(res, { statusCode: 400, code, message, details });
}

export function unauthorized(
  res: Response,
  message: string,
  code = "UNAUTHORIZED",
  details?: unknown,
) {
  return sendError(res, { statusCode: 401, code, message, details });
}

export function forbidden(
  res: Response,
  message: string,
  code = "FORBIDDEN",
  details?: unknown,
) {
  return sendError(res, { statusCode: 403, code, message, details });
}

export function notFound(
  res: Response,
  message: string,
  code = "NOT_FOUND",
  details?: unknown,
) {
  return sendError(res, { statusCode: 404, code, message, details });
}

export function conflict(
  res: Response,
  message: string,
  code = "CONFLICT",
  details?: unknown,
) {
  return sendError(res, { statusCode: 409, code, message, details });
}

export function internalServerError(
  res: Response,
  message = "Internal Server Error",
  code = "INTERNAL_SERVER_ERROR",
  details?: unknown,
) {
  return sendError(res, { statusCode: 500, code, message, details });
}

