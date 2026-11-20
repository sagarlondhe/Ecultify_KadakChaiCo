import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth/session';
import { exportEntries } from '@/lib/entries/service';
import {
  isEntryCategoryFilter,
  isEntryStatusFilter,
} from '@/lib/entries/filters';

export const dynamic = 'force-dynamic';

function csvCell(value: string | Date | boolean | null): string {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const params = new URL(request.url).searchParams;
  const status = params.get('status') ?? 'all';
  const category = params.get('category') ?? 'all';
  if (!isEntryStatusFilter(status) || !isEntryCategoryFilter(category)) {
    return NextResponse.json(
      { success: false, error: 'Invalid status or category filter' },
      { status: 400 }
    );
  }

  try {
    const entries = await exportEntries({ status, category });
    const columns = [
      'submittedAt',
      'name',
      'city',
      'contact',
      'story',
      'status',
      'aiDecision',
      'aiCategory',
      'aiCaption',
      'aiReason',
      'adminOverride',
      'adminNotes',
      'adminUser',
      'overriddenAt',
    ];
    const rows = entries.map((entry) =>
      [
        entry.createdAt,
        entry.name,
        entry.city,
        entry.contact,
        entry.story,
        entry.status,
        entry.aiDecision,
        entry.aiCategory,
        entry.aiCaption,
        entry.aiReason,
        entry.adminOverride,
        entry.adminNotes,
        entry.adminUser,
        entry.overriddenAt,
      ]
        .map(csvCell)
        .join(',')
    );
    const csv = `\uFEFF${columns.map(csvCell).join(',')}\r\n${rows.join('\r\n')}`;
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="kadak-chai-entries-${date}.csv"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Unable to export admin entries:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to export submissions' },
      { status: 500 }
    );
  }
}