// Run with: cd server && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ADMIN_TOKEN_SECRET = 'test-secret-that-is-long-enough-for-hmac-0123456789';
const { createAdminSession, passwordStamp, readAdminToken, SESSION_HOURS } = await import('../utils/adminAuth.js');

const user = { _id: '6729f1c2a1b2c3d4e51a2b3c', email: 'admin@uom.lk', password: '$2b$10$abcdefghijklmnopqrstuv' };

test('a new session is valid for 12 hours and names the user', () => {
  const now = Date.parse('2026-11-06T10:00:00Z');
  const { token, expiresAt } = createAdminSession(user, now);
  assert.equal(expiresAt, '2026-11-06T22:00:00.000Z');
  assert.equal(SESSION_HOURS, 12);

  const payload = readAdminToken(token, now + 1000);
  assert.equal(payload.sub, user._id);
  assert.equal(payload.email, 'admin@uom.lk');
  assert.equal(payload.pv, passwordStamp(user.password));
});

test('an expired session is refused', () => {
  const now = Date.parse('2026-11-06T10:00:00Z');
  const { token } = createAdminSession(user, now);
  assert.equal(readAdminToken(token, now + 12 * 60 * 60 * 1000), null);
});

test('a changed payload or signature is refused', () => {
  const { token } = createAdminSession(user);
  const [body, signature] = token.split('.');

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  const forged = Buffer.from(JSON.stringify({ ...payload, exp: payload.exp + 999999 })).toString('base64url');
  assert.equal(readAdminToken(`${forged}.${signature}`), null, 'longer expiry');

  const flipped = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
  assert.equal(readAdminToken(`${body}.${flipped}`), null, 'signature changed');
  assert.equal(readAdminToken(`${body}.${signature}.extra`), null, 'extra part');
});

test('rubbish is refused, not thrown', () => {
  for (const value of ['', 'abc', 'a.b', '..', null, undefined, '%%%.%%%']) {
    assert.equal(readAdminToken(value), null, String(value));
  }
});

test('the password stamp changes with the password', () => {
  assert.notEqual(passwordStamp('$2b$10$hashOne'), passwordStamp('$2b$10$hashTwo'));
  assert.equal(passwordStamp('$2b$10$hashOne'), passwordStamp('$2b$10$hashOne'));
  assert.equal(passwordStamp('$2b$10$hashOne').length, 16);
});
