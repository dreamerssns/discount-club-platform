import { randomBytes } from 'crypto';

// Simple signed token: base64(email:domain:expiry):signature
// For MVP we use a random opaque token stored as a cookie.
// The token isn't stored server-side — instead we embed the verified email+domain
// and sign it with a secret so it can't be forged.

const SECRET = process.env.SESSION_SECRET ?? 'change-me-in-production-32chars!!';

function sign(payload: string): string {
  // HMAC-SHA256 using Node's built-in crypto
  const { createHmac } = require('crypto') as typeof import('crypto');
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function createSessionToken(email: string, domain: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${email}|${domain}|${expiresAt}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

export interface SessionPayload {
  email: string;
  domain: string;
  expiresAt: number;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split('|');
    if (parts.length !== 4) return null;

    const [email, domain, expiresAtStr, sig] = parts;
    const payload = `${email}|${domain}|${expiresAtStr}`;

    if (sign(payload) !== sig) return null;

    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;

    return { email, domain, expiresAt };
  } catch {
    return null;
  }
}

export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}
