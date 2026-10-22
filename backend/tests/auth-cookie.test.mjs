import assert from 'node:assert/strict';
import { test } from 'node:test';
import { env } from '../dist/src/config/env.js';
import { clearSessionCookie, readSessionCookie, setSessionCookie, SESSION_COOKIE_NAME } from '../dist/src/utils/session-cookie.js';
import prisma from '../dist/src/config/db.js';
import { hashPassword } from '../dist/src/utils/auth.js';
import { login } from '../dist/src/controllers/common/auth.controller.js';

function stub(t, object, key, implementation) {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
}

test('session JWT cookie is HttpOnly, scoped to the API and removable with matching attributes', () => {
  let set;
  let cleared;
  setSessionCookie({ cookie: (...args) => { set = args; } }, 'signed.jwt.value');
  clearSessionCookie({ clearCookie: (...args) => { cleared = args; } });
  assert.equal(set[0], SESSION_COOKIE_NAME);
  assert.equal(set[1], 'signed.jwt.value');
  assert.deepEqual({ httpOnly: set[2].httpOnly, sameSite: set[2].sameSite, path: set[2].path, maxAge: set[2].maxAge }, {
    httpOnly: true, sameSite: 'lax', path: '/api', maxAge: env.SESSION_TTL_SECONDS * 1000,
  });
  assert.equal(typeof set[2].secure, 'boolean');
  assert.equal(cleared[0], SESSION_COOKIE_NAME);
  assert.deepEqual(cleared[1], { httpOnly: true, secure: set[2].secure, sameSite: 'lax', path: '/api' });
});

test('session cookie parsing rejects missing, malformed and duplicate credentials', () => {
  assert.equal(readSessionCookie({ headers: { authorization: 'Bearer ignored' } }), null);
  assert.equal(readSessionCookie({ headers: { cookie: 'theme=dark; judge_session=jwt%2Etoken' } }), 'jwt.token');
  assert.equal(readSessionCookie({ headers: { cookie: 'judge_session=bad%escape' } }), null);
  assert.equal(readSessionCookie({ headers: { cookie: 'judge_session=one; judge_session=two' } }), null);
});

test('login returns the public user and sets the JWT only as a cookie', async t => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111', name: 'Test User', email: 'test@example.com',
    pwd: await hashPassword('password123'), role: 'STUDENT', createdAt: new Date(),
    resetPasswordToken: null, resetPasswordExpires: null, tokenVersion: 0, deletedAt: null,
    termsAcceptedAt: new Date(), termsVersion: 'v1',
  };
  stub(t, prisma.user, 'findUnique', async () => user);
  stub(t, prisma.authSession, 'create', async () => ({}));

  let cookie;
  let status;
  let body;
  const response = {
    cookie: (...args) => { cookie = args; return response; },
    status: code => { status = code; return response; },
    json: value => { body = value; return response; },
  };
  await login({ body: { email: 'test@example.com', password: 'password123' } }, response);
  assert.equal(status, 200);
  assert.equal(cookie[0], SESSION_COOKIE_NAME);
  assert.equal(cookie[2].httpOnly, true);
  assert.ok(body.data.user.id);
  assert.equal('token' in body.data, false);
  assert.equal('pwd' in body.data.user, false);
  assert.equal('termsVersion' in body.data.user, false);
});
