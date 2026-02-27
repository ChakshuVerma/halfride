import { Request, Response, NextFunction } from 'express';
import { admin, adminInitialized, type DecodedIdToken } from '../config/firebase';
import { unauthorized, internalServerError } from '../core/errors';

const MESSAGE_ADMIN_NOT_CONFIGURED = 'Firebase Admin SDK is not properly configured. Please check server logs.';
const MESSAGE_NO_TOKEN = 'No authorization token provided';
const MESSAGE_TOKEN_EXPIRED = 'Token has expired. Please log in again.';
const MESSAGE_ADMIN_NOT_INITIALIZED = 'Firebase Admin SDK is not initialized. Please check server configuration.';
const MESSAGE_INVALID_TOKEN = 'Invalid or expired token';

const LOG_AUTH_ADMIN_NOT_INITIALIZED = '[Auth] Firebase Admin SDK not initialized';
const LOG_AUTH_TOKEN_EXPIRED = (path: string) => `[Auth] Token expired: ${path}`;
const LOG_AUTH_VERIFICATION_FAILED = (errorInfo: string, path: string) => `[Auth] Token verification failed: ${errorInfo} ${path}`;

/**
 * Middleware to verify Firebase ID token
 * Adds decoded token to req.user
 */
export const verifyToken = async (
  req: Request & { user?: DecodedIdToken },
  res: Response,
  next: NextFunction
) => {
  if (!adminInitialized) {
    console.error(LOG_AUTH_ADMIN_NOT_INITIALIZED);
    return internalServerError(res, MESSAGE_ADMIN_NOT_CONFIGURED, 'SERVER_CONFIG');
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, MESSAGE_NO_TOKEN);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = decodedToken;
    next();
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/id-token-expired') {
      console.error(LOG_AUTH_TOKEN_EXPIRED(req.path));
      return unauthorized(res, MESSAGE_TOKEN_EXPIRED);
    }

    if (err.code === 'app/no-app') {
      console.error(LOG_AUTH_ADMIN_NOT_INITIALIZED);
      return internalServerError(res, MESSAGE_ADMIN_NOT_INITIALIZED, 'SERVER_CONFIG');
    }

    console.error(LOG_AUTH_VERIFICATION_FAILED(err.code || err.message || '', req.path));
    return unauthorized(res, err.message || MESSAGE_INVALID_TOKEN);
  }
};

// checks if user is authenticated but doesn't fail if not
export const optionalAuth = async (
  req: Request & { user?: DecodedIdToken },
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    }

    next();
  } catch (error) {
    // Silently continue if token is invalid
    next();
  }
};
