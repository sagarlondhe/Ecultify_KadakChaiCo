import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth/session';
import { exportEntries } from '@/lib/entries/service';
import {
  isEntrySearch,
  isEntryCategoryFilter,
  isEntryStatusFilter,
  parseEntryDateRange,
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
  const search = (params.get('search') ?? '').trim();
  const dateRange = parseEntryDateRange(params.get('from'), params.get('to'));
  if (
    !isEntryStatusFilter(status) ||
    !isEntryCategoryFilter(category) ||
    !isEntrySearch(search) ||
    !dateRange
  ) {
    return NextResponse.json(
      { success: false, error: 'Invalid submission filters' },
      { status: 400 }
    );
  }

  try {
    const entries = await exportEntries({
      status,
      category,
      search,
      ...dateRange,
    });
    const columns = [
      'id',
      'publicId',
      'submittedAt',
      'name',
      'city',
      'contact',
      'story',
      'consent',
      'status',
      'aiDecision',
      'aiCategory',
      'aiCaption',
      'aiReason',
      'adminOverride',
      'adminNotes',
      'adminUser',
      'overriddenAt',
      'updatedAt',
    ];
    const rows = entries.map((entry) =>
      [
        entry.id,
        entry.publicId,
        entry.createdAt,
        entry.name,
        entry.city,
        entry.contact,
        entry.story,
        entry.consent,
        entry.status,
        entry.aiDecision,
        entry.aiCategory,
        entry.aiCaption,
        entry.aiReason,
        entry.adminOverride,
        entry.adminNotes,
        entry.adminUser,
        entry.overriddenAt,
        entry.updatedAt,
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