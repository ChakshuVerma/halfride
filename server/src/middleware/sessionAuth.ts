import type { NextFunction, Request, Response } from 'express';
import { readCookie } from '../utils/cookies';
import { verifyJwt, type JwtPayload } from '../utils/jwt';

const ACCESS_COOKIE = 'access_token';

const ERROR_UNAUTHORIZED = 'Unauthorized';

export type SessionAuth = {
  uid: string;
  username: string;
};

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = readCookie(req.headers.cookie, ACCESS_COOKIE);
  if (!token) {
    return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: 'Missing access token' });
  }

  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server Configuration Error', message: 'ACCESS_TOKEN_SECRET is not set' });
  }

  const verified = verifyJwt({ token, secret });
  if (!verified.valid) {
    return res.status(401).json({ error: ERROR_UNAUTHORIZED, message: verified.error });
  }

  const payload = verified.payload as JwtPayload & { username?: string };
  req.auth = {
    uid: String(payload.sub),
    username: String(payload.username ?? ''),
  };

  return next();
}

