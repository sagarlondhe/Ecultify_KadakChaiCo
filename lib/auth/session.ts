import crypto from 'node:crypto';
import type { NextResponse } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'kadak_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminSession {
  username: string;
  role: 'admin';
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Admin session secret must be at least 32 characters');
  }
  return secret;
}

function getConfiguredUsername(): string {
  const username = process.env.ADMIN_USERNAME;
  if (!username) {
    throw new Error('Admin username is not configured');
  }
  return username;
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
}

export function createAdminSession(
  username: string,
  now = Date.now()
): string {
  if (!username || username !== getConfiguredUsername()) {
    throw new Error('Cannot create a session for an unconfigured administrator');
  }

  const iat = Math.floor(now / 1000);
  const session: AdminSession = {
    username,
    role: 'admin',
    iat,
    exp: iat + ADMIN_SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(session)).toString(
    'base64url'
  );

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminSession(
  token: string | null | undefined,
  now = Date.now()
): AdminSession | null {
  if (!token || token.length > 2048) return null;

  const parts = token.split('.');
  if (
    parts.length !== 2 ||
    !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[1])
  ) {
    return null;
  }

  const expected = Buffer.from(sign(parts[0]), 'base64url');
  const supplied = Buffer.from(parts[1], 'base64url');
  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    );
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<AdminSession>;
  const nowSeconds = Math.floor(now / 1000);

  if (
    typeof candidate.username !== 'string' ||
    candidate.username !== getConfiguredUsername() ||
    candidate.role !== 'admin' ||
    typeof candidate.iat !== 'number' ||
    !Number.isSafeInteger(candidate.iat) ||
    typeof candidate.exp !== 'number' ||
    !Number.isSafeInteger(candidate.exp) ||
    candidate.exp !== candidate.iat + ADMIN_SESSION_TTL_SECONDS ||
    candidate.iat > nowSeconds + 60 ||
    candidate.exp <= nowSeconds
  ) {
    return null;
  }

  return candidate as AdminSession;
}

export function getAdminSessionFromRequest(
  request: Request,
  now = Date.now()
): AdminSession | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  return verifyAdminSession(cookie?.slice(ADMIN_SESSION_COOKIE.length + 1), now);
}

export function setAdminSessionCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}
