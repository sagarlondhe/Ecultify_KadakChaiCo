import { z } from 'zod';
import { NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/auth/password';
import {
  createAdminSession,
  setAdminSessionCookie,
} from '@/lib/auth/session';

const loginSchema = z
  .object({
    username: z.string().min(1).max(128),
    password: z.string().min(1).max(256),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }

  try {
    const valid = await verifyAdminCredentials(
      parsed.data.username,
      parsed.data.password
    );
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
    });
    setAdminSessionCookie(
      response,
      createAdminSession(parsed.data.username)
    );
    return response;
  } catch (error) {
    console.error('Admin authentication is unavailable:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication is unavailable' },
      { status: 500 }
    );
  }
}
