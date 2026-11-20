import { AI_CATEGORY, ENTRY_STATUS } from '@/lib/validation';

export const ENTRY_STATUS_FILTERS = [
  'all',
  ENTRY_STATUS.PENDING_REVIEW,
  ENTRY_STATUS.APPROVED,
  ENTRY_STATUS.REJECTED,
] as const;

export const ENTRY_CATEGORY_FILTERS = [
  'all',
  AI_CATEGORY.FUNNY,
  AI_CATEGORY.NOSTALGIC,
  AI_CATEGORY.WHOLESOME,
  AI_CATEGORY.OTHER,
] as const;

export type EntryStatusFilter = (typeof ENTRY_STATUS_FILTERS)[number];
export type EntryCategoryFilter = (typeof ENTRY_CATEGORY_FILTERS)[number];

export interface EntryDateRange {
  startDate?: Date;
  endDateExclusive?: Date;
}

export function isEntryStatusFilter(value: string): value is EntryStatusFilter {
  return ENTRY_STATUS_FILTERS.includes(value as EntryStatusFilter);
}

export function isEntryCategoryFilter(
  value: string
): value is EntryCategoryFilter {
  return ENTRY_CATEGORY_FILTERS.includes(value as EntryCategoryFilter);
}

export function isEntrySearch(value: string): boolean {
  return value.length <= 254 && !/[\u0000-\u001f\u007f]/.test(value);
}

function parseDate(value: string | null): Date | null {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export function parseEntryDateRange(
  from: string | null,
  to: string | null
): EntryDateRange | null {
  from = from || null;
  to = to || null;
  const startDate = parseDate(from);
  const endDate = parseDate(to);

  if ((from !== null && !startDate) || (to !== null && !endDate)) {
    return null;
  }
  if (startDate && endDate && startDate > endDate) return null;

  const endDateExclusive = endDate
    ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
    : undefined;

  return {
    ...(startDate ? { startDate } : {}),
    ...(endDateExclusive ? { endDateExclusive } : {}),
  };
}