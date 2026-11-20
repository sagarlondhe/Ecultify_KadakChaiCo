import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth/session';
import { listEntries } from '@/lib/entries/service';
import {
  isEntrySearch,
  isEntryCategoryFilter,
  isEntryStatusFilter,
  parseEntryDateRange,
} from '@/lib/entries/filters';

export const dynamic = 'force-dynamic';

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
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
    const rawSearch = params.get('search') ?? '';
    const search = rawSearch.trim();
    const dateRange = parseEntryDateRange(
      params.get('from'),
      params.get('to')
    );
    const page = parsePositiveInteger(params.get('page'), 1);
    const limit = parsePositiveInteger(params.get('limit'), 25);

    if (
      !isEntryStatusFilter(status) ||
      !isEntryCategoryFilter(category) ||
      !isEntrySearch(search) ||
      !dateRange ||
      page === null ||
      page > 100000 ||
      limit === null ||
      limit > 50
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid filter or pagination values' },
        { status: 400 }
      );
    }

    const result = await listEntries({
      status,
      category,
      search,
      ...dateRange,
      page,
      limit,
    });
    return NextResponse.json({
      success: true,
      metrics: result.metrics,
      pagination: result.pagination,
      entries: result.entries.map((entry) => ({
        id: entry.id,
        publicId: entry.publicId,
        name: entry.name,
        city: entry.city,
        contact: entry.contact,
        story: entry.story,
        consent: entry.consent,
        status: entry.status,
        aiDecision: entry.aiDecision,
        aiCategory: entry.aiCategory,
        aiCaption: entry.aiCaption,
        aiReason: entry.aiReason,
        adminOverride: entry.adminOverride,
        adminNotes: entry.adminNotes,
        adminUser: entry.adminUser,
        overriddenAt: entry.overriddenAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Unable to load admin entries:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load submissions' },
      { status: 500 }
    );
  }
}
