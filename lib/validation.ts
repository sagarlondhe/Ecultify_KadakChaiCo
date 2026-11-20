import { z } from 'zod';

export const ENTRY_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING_REVIEW: 'pending_review',
} as const;

export type EntryStatus = (typeof ENTRY_STATUS)[keyof typeof ENTRY_STATUS];

export const AI_CATEGORY = {
  FUNNY: 'funny',
  NOSTALGIC: 'nostalgic',
  WHOLESOME: 'wholesome',
  OTHER: 'other',
} as const;

export type AiCategory = (typeof AI_CATEGORY)[keyof typeof AI_CATEGORY];
export type ContactType = 'email' | 'phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_CANONICAL_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes and validates an email address.
 * Converts to lowercase and trims whitespace.
 * Returns null if invalid.
 */
export function normalizeEmail(input: string): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Normalizes and validates an Indian mobile number.
 * Supported input formats:
 * - 10-digit format: 9876543210
 * - Country code prefix: +91 98765 43210, +919876543210, 919876543210
 * - Trunk prefix: 09876543210
 * - Formatted with punctuation: +91-98765-43210, (0) 98765 43210
 *
 * Normalization algorithm:
 * 1. Strip all non-digit characters.
 * 2. If 12 digits starting with 91, strip 91 prefix.
 * 3. If 11 digits starting with 0, strip 0 prefix.
 * 4. Verify canonical 10-digit format matching /^[6-9]\d{9}$/.
 *
 * Returns 10-digit canonical string or null if invalid.
 */
export function normalizeIndianPhone(input: string): string | null {
  if (typeof input !== 'string') return null;
  
  // Step 1: Strip non-digit characters
  let digitsOnly = input.replace(/\D/g, '');

  // Step 2: Strip 91 country code if 12 digits
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    digitsOnly = digitsOnly.slice(2);
  }

  // Step 3: Strip leading 0 trunk prefix if 11 digits
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.slice(1);
  }

  // Step 4 & 5: Assert canonical 10-digit Indian mobile format
  if (INDIAN_PHONE_CANONICAL_REGEX.test(digitsOnly)) {
    return digitsOnly;
  }

  return null;
}

/**
 * Determines whether the contact is an email or Indian phone,
 * normalizes it accordingly, and returns the result or null if invalid.
 */
export function normalizeContact(
  input: string
): { type: ContactType; normalized: string } | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const normalized = normalizeEmail(trimmed);
    if (normalized) {
      return { type: 'email', normalized };
    }
    return null;
  }

  const normalizedPhone = normalizeIndianPhone(trimmed);
  if (normalizedPhone) {
    return { type: 'phone', normalized: normalizedPhone };
  }

  return null;
}

export function duplicateContactMessage(type: ContactType): string {
  return type === 'email'
    ? 'This email address is already in use. Please enter a new email address.'
    : 'This phone number is already in use. Please enter a new phone number.';
}

/**
 * Server-side Zod validation schema for story submissions.
 * Validates and normalizes all fields to prevent malformed or malicious inputs.
 */
export const submissionSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name cannot exceed 60 characters'),

  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters'),

  contact: z
    .string({ required_error: 'Contact (email or phone) is required' })
    .trim()
    .superRefine((val, ctx) => {
      const normalized = normalizeContact(val);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Please enter a valid 10-digit Indian mobile number or email address',
        });
      }
    })
    .transform((val) => {
      const normalized = normalizeContact(val);
      // Normalized is guaranteed non-null due to superRefine above
      return normalized!.normalized;
    }),

  story: z
    .string({ required_error: 'Story is required' })
    .trim()
    .min(10, 'Story must be at least 10 characters')
    .max(300, 'Story must not exceed 300 characters'),

  consent: z
    .literal(true, {
      errorMap: () => ({
        message: 'You must consent to participate in the #MyChaiBreak campaign',
      }),
    }),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
