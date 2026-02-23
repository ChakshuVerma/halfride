import type { NextFunction, Request, Response } from 'express';
import { readCookie } from '../utils/cookies';
import { verifyJwt, type JwtPayload } from '../utils/jwt';
import { unauthorized, internalServerError } from '../utils/errors';

const ACCESS_COOKIE = 'access_token';

export type SessionAuth = {
  uid: string;
  username: string;
};

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = readCookie(req.headers.cookie, ACCESS_COOKIE);
  if (!token) {
    return unauthorized(res, 'Missing access token');
  }

  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return internalServerError(res, 'ACCESS_TOKEN_SECRET is not set', 'SERVER_CONFIG');
  }

  const verified = verifyJwt({ token, secret });
  if (!verified.valid) {
    return unauthorized(res, verified.error);
  }

  const payload = verified.payload as JwtPayload & { username?: string };
  req.auth = {
    uid: String(payload.sub),
    username: String(payload.username ?? ''),
  };

  return next();
}

