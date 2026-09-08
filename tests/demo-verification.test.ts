import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoCode, demoRequestAllowed, secureHash, verifyDemoCode } from '../lib/demo-verification';

const secret = 'test-secret';
const email = 'person@example.com';
const code = '123456';
const record = { email_hash: secureHash(email, secret), code_hash: secureHash(`${email}:${code}`, secret), expires_at: new Date(Date.now() + 60_000).toISOString(), used_at: null };

test('creates a six-digit code', () => assert.match(createDemoCode(), /^\d{6}$/));
test('rejects a wrong code', () => assert.deepEqual(verifyDemoCode(record, email, '000000', secret), { ok: false, reason: 'invalid' }));
test('accepts the correct unexpired code', () => assert.deepEqual(verifyDemoCode(record, email, code, secret), { ok: true }));
test('rejects a reused code', () => assert.deepEqual(verifyDemoCode({ ...record, used_at: new Date().toISOString() }, email, code, secret), { ok: false, reason: 'used' }));
test('rejects an expired code', () => assert.deepEqual(verifyDemoCode({ ...record, expires_at: new Date(Date.now() - 1).toISOString() }, email, code, secret), { ok: false, reason: 'expired' }));
test('blocks the fourth hourly request', () => { assert.equal(demoRequestAllowed(2), true); assert.equal(demoRequestAllowed(3), false); });
