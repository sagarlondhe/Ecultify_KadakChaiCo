import { afterAll, beforeAll, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server.js';
import { POST as login } from '../app/api/admin/login/route.ts';
import { POST as logout } from '../app/api/admin/logout/route.ts';
import { GET as getAdminEntries } from '../app/api/admin/entries/route.ts';
import { PATCH as patchAdminEntry } from '../app/api/admin/entries/[id]/route.ts';
import { verifyAdminCredentials } from '../lib/auth/password.ts';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
  verifyAdminSession,
} from '../lib/auth/session.ts';

const originalEnv = {
  username: process.env.ADMIN_USERNAME,
  passwordHash: process.env.ADMIN_PASSWORD_HASH,
  sessionSecret: process.env.ADMIN_SESSION_SECRET,
};

let passwordHash = '';
const username = 'phase7-admin';
const password = 'correct-password-for-test';
const secret = 'phase7-test-session-secret-with-more-than-32-chars';

function request(
  path: string,
  options: ConstructorParameters<typeof NextRequest>[1] = {}
) {
  return new NextRequest(`http://localhost:3000${path}`, options);
}

describe('admin authentication and signed sessions', () => {
  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
    process.env.ADMIN_USERNAME = username;
    process.env.ADMIN_PASSWORD_HASH = passwordHash;
    process.env.ADMIN_SESSION_SECRET = secret;
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterAll(() => {
    if (originalEnv.username === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = originalEnv.username;
    if (originalEnv.passwordHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = originalEnv.passwordHash;
    if (originalEnv.sessionSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalEnv.sessionSecret;
    vi.unstubAllEnvs();
  });

  it('accepts valid credentials and rejects an incorrect username or password', async () => {
    assert.equal(await verifyAdminCredentials(username, password), true);
    assert.equal(await verifyAdminCredentials('wrong-user', password), false);
    assert.equal(await verifyAdminCredentials(username, 'wrong-password'), false);
  });

  it('creates a signed session that verifies only before its 8-hour expiry', () => {
    const now = Date.UTC(2026, 10, 19, 10);
    const token = createAdminSession(username, now);
    const session = verifyAdminSession(token, now);
    const [payload, signature] = token.split('.');
    const invalidSignature = `${payload}.${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`;

    assert.equal(session?.username, username);
    assert.equal(session?.role, 'admin');
    assert.equal(session?.exp! - session?.iat!, ADMIN_SESSION_TTL_SECONDS);
    assert.equal(
      verifyAdminSession(token, now + ADMIN_SESSION_TTL_SECONDS * 1000),
      null
    );
    assert.equal(verifyAdminSession(invalidSignature, now), null);
    assert.equal(verifyAdminSession('malformed.token.extra', now), null);
  });

  it('authenticates with a session cookie without returning credentials or secrets', async () => {
    const response = await login(
      request('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
    );

    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie') ?? '';
    assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\//i);
    assert.match(cookie, /Max-Age=28800/i);
    assert.doesNotMatch(cookie, /Secure/i);
    const body = await response.text();
    assert.doesNotMatch(body, new RegExp(password));
    assert.equal(body.includes(passwordHash), false);
    assert.equal(body.includes(secret), false);
  });

  it('sets the Secure cookie attribute in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await login(
      request('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
    );
    vi.stubEnv('NODE_ENV', 'test');

    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie') ?? '', /Secure/i);
  });

  it('returns the same safe unauthorized response for invalid login credentials', async () => {
    const responses = await Promise.all([
      login(
        request('/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username, password: 'wrong-password' }),
        })
      ),
      login(
        request('/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: 'wrong-user', password }),
        })
      ),
    ]);

    assert.deepEqual(responses.map((response) => response.status), [401, 401]);
    assert.deepEqual(
      await Promise.all(responses.map((response) => response.json())),
      [
        { success: false, error: 'Invalid username or password' },
        { success: false, error: 'Invalid username or password' },
      ]
    );
  });

  it('rejects unauthorized dashboard data and moderation API requests', async () => {
    const listResponse = await getAdminEntries(
      request('/api/admin/entries')
    );
    const updateResponse = await patchAdminEntry(
      request('/api/admin/entries/entry-id', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: { id: 'entry-id' } }
    );

    assert.equal(listResponse.status, 401);
    assert.equal(updateResponse.status, 401);
    assert.deepEqual(await listResponse.json(), {
      success: false,
      error: 'Authentication required',
    });
  });

  it('rejects expired and tampered sessions on every protected API route', async () => {
    const expiredToken = createAdminSession(
      username,
      Date.now() - (ADMIN_SESSION_TTL_SECONDS + 1) * 1000
    );
    const validToken = createAdminSession(username);
    const [payload, signature] = validToken.split('.');
    const tamperedToken = `${payload}.${signature.slice(0, -1)}${
      signature.endsWith('A') ? 'B' : 'A'
    }`;

    for (const token of [expiredToken, tamperedToken]) {
      const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${token}` };
      const listResponse = await getAdminEntries(
        request('/api/admin/entries', { headers })
      );
      const updateResponse = await patchAdminEntry(
        request('/api/admin/entries/entry-id', {
          method: 'PATCH',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'approved' }),
        }),
        { params: { id: 'entry-id' } }
      );

      assert.equal(listResponse.status, 401);
      assert.equal(updateResponse.status, 401);
    }
  });

  it('returns a safe client error for malformed or unexpected login bodies', async () => {
    const malformed = await login(
      request('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      })
    );
    const unexpected = await login(
      request('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, extra: 'unexpected' }),
      })
    );

    assert.equal(malformed.status, 400);
    assert.equal(unexpected.status, 400);
    assert.deepEqual(await malformed.json(), {
      success: false,
      error: 'Invalid request',
    });
    assert.deepEqual(await unexpected.json(), {
      success: false,
      error: 'Invalid request',
    });
  });

  it('clears the session on logout and treats repeated logout as successful', async () => {
    const first = await logout();
    const second = await logout();

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.match(first.headers.get('set-cookie') ?? '', /Max-Age=0/i);
    assert.match(first.headers.get('set-cookie') ?? '', /HttpOnly/i);
    assert.match(first.headers.get('set-cookie') ?? '', /SameSite=Lax/i);
    assert.deepEqual(await first.json(), {
      success: true,
      message: 'Logged out successfully',
    });
  });
});
