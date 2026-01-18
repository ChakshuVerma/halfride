import crypto from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

export type PasswordHash = {
  saltB64: string;
  hashB64: string;
};

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return { saltB64: salt.toString('base64'), hashB64: hash.toString('base64') };
}

export async function verifyPassword(params: {
  password: string;
  saltB64: string;
  hashB64: string;
}) {
  const salt = Buffer.from(params.saltB64, 'base64');
  const expected = Buffer.from(params.hashB64, 'base64');
  const actual = await scryptAsync(params.password, salt);
  return timingSafeEqual(actual, expected);
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey as Buffer);
      }
    );
  });
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

