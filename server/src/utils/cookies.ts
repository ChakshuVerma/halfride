export function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return undefined;
}

export function serializeCookie(params: {
  name: string;
  value: string;
  maxAgeSeconds?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}) {
  const {
    name,
    value,
    maxAgeSeconds,
    path = '/',
    httpOnly = true,
    sameSite = 'Lax',
    secure = false,
  } = params;

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (typeof maxAgeSeconds === 'number') parts.push(`Max-Age=${maxAgeSeconds}`);
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

