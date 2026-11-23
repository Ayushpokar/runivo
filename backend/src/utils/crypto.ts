import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import env from '../config/env.js';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash.startsWith('scrypt:')) {
    // Fallback for legacy plain-text rows created before hashing was added
    const a = Buffer.from(password);
    const b = Buffer.from(storedHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  const parts = storedHash.split(':');
  const salt = parts[1];
  const keyHex = parts[2];
  if (!salt || !keyHex) {
    return false;
  }

  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(keyBuffer, derivedKey);
}

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signJwt(user: {
  id: number;
  username: string;
  email: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    iat: now,
    exp: now + JWT_EXPIRES_IN_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = base64UrlEncode(
    createHmac('sha256', JWT_SECRET).update(signingInput).digest()
  );

  const actualBuf = Buffer.from(encodedSignature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
