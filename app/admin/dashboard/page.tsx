import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { ModerationActions } from '@/components/admin/ModerationActions';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from '@/lib/auth/session';
import { listEntries } from '@/lib/entries/service';
import { ENTRY_STATUS } from '@/lib/validation';
import {
  ENTRY_CATEGORY_FILTERS,
  ENTRY_STATUS_FILTERS,
  isEntrySearch,
  isEntryCategoryFilter,
  isEntryStatusFilter,
  parseEntryDateRange,
} from '@/lib/entries/filters';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Moderation dashboard | Kadak Chai Co.',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;
function validStatus(value: string | string[] | undefined) {
  if (typeof value === 'string' && isEntryStatusFilter(value)) {
    return value;
  }
  return 'all';
}

function validCategory(value: string | string[] | undefined) {
  if (typeof value === 'string' && isEntryCategoryFilter(value)) {
    return value;
  }
  return 'all';
}

function validPage(value: string | string[] | undefined): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 100000 ? page : 1;
}

function validString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

function statusLabel(status: string): string {
  if (status === ENTRY_STATUS.PENDING_REVIEW) return 'Pending review';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = verifyAdminSession(
    cookies().get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!session) redirect('/admin/login?expired=1');

  const status = validStatus(searchParams?.status);
  const category = validCategory(searchParams?.category);
  const rawSearch = validString(searchParams?.search);
  const search = rawSearch.trim();
  const from = validString(searchParams?.from) || null;
  const to = validString(searchParams?.to) || null;
  const dateRange = parseEntryDateRange(from, to);
  const safeSearch = isEntrySearch(search) ? search : '';
  const safeDateRange = dateRange ?? {};
  const page = validPage(searchParams?.page);
  const result = await listEntries({
    status,
    category,
    search: safeSearch,
    ...safeDateRange,
    page,
    limit: PAGE_SIZE,
  });
  const totalPages = Math.max(1, result.pagination.totalPages);
  const exportParams = new URLSearchParams({
    status,
    category,
    ...(safeSearch ? { search: safeSearch } : {}),
    ...(from && dateRange?.startDate ? { from } : {}),
    ...(to && dateRange?.endDateExclusive ? { to } : {}),
  });

  return (
    <main className="min-h-screen bg-cream-100 px-4 py-8 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-chai-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-saffron-700">
              Kadak Chai Co. · #MyChaiBreak
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-chai-950">
              Moderation dashboard
            </h1>
            <p className="mt-1 text-sm text-chai-700">
              Signed in as {session.username}
            </p>
          </div>
          <AdminLogoutButton />
        </header>

        <section aria-label="Submission counts" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total submissions', value: result.metrics.total },
            { label: 'Pending review', value: result.metrics.pendingReview },
            { label: 'Approved', value: result.metrics.approved },
            { label: 'Rejected', value: result.metrics.rejected },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-chai-200 bg-white p-5">
              <p className="text-sm font-medium text-chai-700">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-chai-950">
                {metric.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-chai-950">Database management · Submissions</h2>
              <p className="mt-1 text-sm text-chai-700">
                Final status is controlled by moderation; AI decisions remain unchanged.
              </p>
            </div>
            <form action="/admin/dashboard" method="get" className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="search-filter" className="block text-xs font-semibold text-chai-800">
                  Search email or phone
                </label>
                <input
                  id="search-filter"
                  name="search"
                  type="search"
                  maxLength={254}
                  defaultValue={safeSearch}
                  className="mt-1 min-h-11 rounded-xl border border-chai-300 bg-white px-3 text-sm text-chai-950"
                  placeholder="Email or phone"
                />
              </div>
              <div>
                <label htmlFor="from-filter" className="block text-xs font-semibold text-chai-800">
                  Submitted from
                </label>
                <input
                  id="from-filter"
                  name="from"
                  type="date"
                  defaultValue={dateRange ? from ?? '' : ''}
                  className="mt-1 min-h-11 rounded-xl border border-chai-300 bg-white px-3 text-sm text-chai-950"
                />
              </div>
              <div>
                <label htmlFor="to-filter" className="block text-xs font-semibold text-chai-800">
                  Submitted through
                </label>
                <input
                  id="to-filter"
                  name="to"
                  type="date"
                  defaultValue={dateRange ? to ?? '' : ''}
                  className="mt-1 min-h-11 rounded-xl border border-chai-300 bg-white px-3 text-sm text-chai-950"
                />
              </div>
              <div>
                <label htmlFor="status-filter" className="block text-xs font-semibold text-chai-800">
                  Filter by final status
                </label>
                <select
                  id="status-filter"
                  name="status"
                  defaultValue={status}
                  className="mt-1 min-h-11 rounded-xl border border-chai-300 bg-white px-3 text-sm text-chai-950"
                >
                  {ENTRY_STATUS_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'all'
                        ? 'All submissions'
                        : filter === ENTRY_STATUS.PENDING_REVIEW
                          ? 'Pending review'
                          : filter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category-filter" className="block text-xs font-semibold text-chai-800">
                  Filter by AI category
                </label>
                <select
                  id="category-filter"
                  name="category"
                  defaultValue={category}
                  className="mt-1 min-h-11 rounded-xl border border-chai-300 bg-white px-3 text-sm text-chai-950"
                >
                  {ENTRY_CATEGORY_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'all' ? 'All categories' : filter}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-chai-900 px-4 text-sm font-bold text-white hover:bg-chai-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chai-700"
              >
                Apply
              </button>
              <Link
                href={`/api/admin/entries/export?${exportParams.toString()}`}
                className="inline-flex min-h-11 items-center rounded-xl border border-chai-300 bg-white px-4 text-sm font-bold text-chai-900 hover:bg-cream-200"
              >
                Export CSV
              </Link>
            </form>
          </div>

          {result.entries.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-chai-300 bg-white p-8 text-center text-sm text-chai-700">
              No submissions match these filters.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {result.entries.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-chai-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-chai-950">{entry.name}</h3>
                      <p className="text-sm text-chai-700">
                        {entry.city} · {entry.contact} · Submitted{' '}
                        {entry.createdAt.toLocaleString('en-IN')}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-chai-600">
                        Record ID: {entry.id}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      entry.status === ENTRY_STATUS.PENDING_REVIEW
                        ? 'bg-saffron-100 text-saffron-900'
                        : entry.status === ENTRY_STATUS.APPROVED
                          ? 'bg-green-100 text-green-900'
                          : 'bg-red-100 text-red-900'
                    }`}>
                      Final status: {statusLabel(entry.status)}
                    </span>
                  </div>

                  {entry.status === ENTRY_STATUS.PENDING_REVIEW && (
                    <p className="mt-3 rounded-xl bg-saffron-50 px-3 py-2 text-sm font-semibold text-saffron-900">
                      This submission is awaiting administrator review.
                    </p>
                  )}

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-chai-600">Submitted story</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-chai-900">{entry.story}</p>
                      <p className="mt-2 text-xs text-chai-600">
                        Participation consent: {entry.consent ? 'Yes' : 'No'}
                        {' · '}Last updated {entry.updatedAt.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="rounded-xl bg-cream-100 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-chai-700">
                        Original AI decision
                      </h4>
                      <p className="mt-2 text-sm text-chai-900">
                        Decision: <strong>{entry.aiDecision ?? 'Unavailable — pending review'}</strong>
                      </p>
                      <p className="mt-1 text-sm text-chai-900">Category: {entry.aiCategory ?? '—'}</p>
                      <p className="mt-1 text-sm text-chai-900">Caption: {entry.aiCaption ?? '—'}</p>
                      {entry.aiReason && (
                        <p className="mt-2 text-sm text-chai-800">
                          AI rejection reason: {entry.aiReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {entry.adminOverride && (
                    <p className="mt-4 border-l-2 border-saffron-500 pl-3 text-sm text-chai-800">
                      Admin override by {entry.adminUser ?? 'administrator'}
                      {entry.overriddenAt && ` on ${entry.overriddenAt.toLocaleString('en-IN')}`}
                      {entry.adminNotes && <> · Note: {entry.adminNotes}</>}
                    </p>
                  )}

                  <ModerationActions
                    entryId={entry.id}
                    currentStatus={entry.status}
                  />
                </article>
              ))}
            </div>
          )}

          <nav aria-label="Submission pages" className="mt-6 flex items-center justify-between gap-4">
            <span className="text-sm text-chai-700">
              Page {Math.min(page, totalPages)} of {totalPages} · {result.pagination.total} submissions
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/dashboard?${new URLSearchParams({
                    status,
                    category,
                    ...(safeSearch ? { search: safeSearch } : {}),
                    ...(from && dateRange?.startDate ? { from } : {}),
                    ...(to && dateRange?.endDateExclusive ? { to } : {}),
                    page: String(page - 1),
                  }).toString()}`}
                  className="rounded-xl border border-chai-300 bg-white px-4 py-2 text-sm font-semibold text-chai-900 hover:bg-cream-200"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/dashboard?${new URLSearchParams({
                    status,
                    category,
                    ...(safeSearch ? { search: safeSearch } : {}),
                    ...(from && dateRange?.startDate ? { from } : {}),
                    ...(to && dateRange?.endDateExclusive ? { to } : {}),
                    page: String(page + 1),
                  }).toString()}`}
                  className="rounded-xl border border-chai-300 bg-white px-4 py-2 text-sm font-semibold text-chai-900 hover:bg-cream-200"
                >
                  Next
                </Link>
              )}
            </div>
          </nav>
          <p className="mt-5 text-xs leading-5 text-chai-600">
            AI fields above are the original automated evaluation. Final status and any override audit are recorded separately.
          </p>
        </section>
      </div>
    </main>
  );
}
