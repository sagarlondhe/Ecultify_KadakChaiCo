import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth/session';
import {
  EntryStatusUnchangedError,
  getEntryById,
  updateEntryStatus,
} from '@/lib/entries/service';

const moderationSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    adminNotes: z.string().trim().max(1000).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (
      !context.params.id ||
      context.params.id.length > 128 ||
      /[\u0000-\u001f]/.test(context.params.id)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const parsed = moderationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid moderation request' },
        { status: 400 }
      );
    }

    const existing = await getEntryById(context.params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }
    if (existing.status === parsed.data.status) {
      return NextResponse.json(
        { success: false, error: 'Submission already has that status' },
        { status: 409 }
      );
    }

    const entry = await updateEntryStatus(context.params.id, {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes || null,
      adminUser: session.username,
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        status: entry.status,
        adminOverride: entry.adminOverride,
        adminNotes: entry.adminNotes,
        adminUser: entry.adminUser,
        overriddenAt: entry.overriddenAt,
      },
    });
  } catch (error) {
    if (error instanceof EntryStatusUnchangedError) {
      return NextResponse.json(
        { success: false, error: 'Submission already has that status' },
        { status: 409 }
      );
    }
    console.error('Unable to moderate submission:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to update submission' },
      { status: 500 }
    );
  }
}
