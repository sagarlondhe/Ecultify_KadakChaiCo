import { ENTRY_STATUS, type EntryStatus } from '@/lib/validation';
import type { AiModerationOutcome } from './types.ts';

export function mapAiOutcomeToStatus(
  outcome: AiModerationOutcome
): EntryStatus {
  if (!outcome.success) {
    return ENTRY_STATUS.PENDING_REVIEW;
  }

  if (outcome.result.decision === 'approved') {
    return ENTRY_STATUS.APPROVED;
  }

  return ENTRY_STATUS.REJECTED;
}
