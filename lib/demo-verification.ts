import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const DEMO_CODE_TTL_MS = 10 * 60 * 1000;
export const DEMO_REQUEST_LIMIT = 3;

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function normalizePhone(phone: string) { return phone.replace(/[\s()-]/g, ''); }

export function validDemoIdentity(email: string, phone: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)) && /^\+[1-9]\d{7,14}$/.test(normalizePhone(phone));
}

export function createDemoCode() { return randomInt(0, 1_000_000).toString().padStart(6, '0'); }

export function secureHash(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type VerificationRecord = { code_hash: string; email_hash: string; expires_at: string; used_at: string | null };

export function verifyDemoCode(record: VerificationRecord, email: string, code: string, secret: string, now = Date.now()) {
  if (record.used_at) return { ok: false as const, reason: 'used' as const };
  if (new Date(record.expires_at).getTime() <= now) return { ok: false as const, reason: 'expired' as const };
  const emailHash = secureHash(normalizeEmail(email), secret);
  const codeHash = secureHash(`${normalizeEmail(email)}:${code}`, secret);
  if (!hashesMatch(record.email_hash, emailHash) || !hashesMatch(record.code_hash, codeHash)) {
    return { ok: false as const, reason: 'invalid' as const };
  }
  return { ok: true as const };
}

export function demoRequestAllowed(recentRequests: number) {
  return recentRequests < DEMO_REQUEST_LIMIT;
}
