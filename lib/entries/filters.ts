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

export function isEntryStatusFilter(value: string): value is EntryStatusFilter {
  return ENTRY_STATUS_FILTERS.includes(value as EntryStatusFilter);
}

export function isEntryCategoryFilter(
  value: string
): value is EntryCategoryFilter {
  return ENTRY_CATEGORY_FILTERS.includes(value as EntryCategoryFilter);
}