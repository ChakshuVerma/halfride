import crypto from 'crypto';

export type JwtPayload = Record<string, unknown> & { exp: number; iat: number; sub: string; jti: string };

export function signJwt(params: { payload: Omit<JwtPayload, 'iat'>; secret: string }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { ...params.payload, iat: now } as JwtPayload;

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const sig = hmacSha256(signingInput, params.secret);
  return `${signingInput}.${sig}`;
}

export function verifyJwt(params: { token: string; secret: string }): { valid: true; payload: JwtPayload } | { valid: false; error: string } {
  const parts = params.token.split('.');
  if (parts.length !== 3) return { valid: false, error: 'Malformed token' };
  const [encodedHeader, encodedPayload, encodedSig] = parts;

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = hmacSha256(signingInput, params.secret);
  if (!timingSafeEqualStr(encodedSig, expectedSig)) return { valid: false, error: 'Invalid signature' };

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || now >= payload.exp) return { valid: false, error: 'Token expired' };
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid payload' };
  }
}

export function randomJti() {
  return crypto.randomBytes(16).toString('hex');
}

function hmacSha256(input: string, secret: string) {
  return base64UrlEncodeBuf(crypto.createHmac('sha256', secret).update(input).digest());
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBuf(Buffer.from(value, 'utf8'));
}

function base64UrlEncodeBuf(buf: Buffer) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const withPad = padded + '='.repeat(padLen);
  return Buffer.from(withPad, 'base64').toString('utf8');
}

function timingSafeEqualStr(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

