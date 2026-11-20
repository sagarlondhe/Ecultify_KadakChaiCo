import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { ENTRY_STATUS, type EntryStatus } from '@/lib/validation';

/**
 * Generates a cryptographically secure, non-sequential, unguessable public token.
 * Generates 16 random bytes (128 bits of entropy) formatted as a 32-character hex string.
 */
export function generatePublicSlug(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface CreateStoryEntryInput {
  name: string;
  city: string;
  contact: string;
  story: string;
  consent?: boolean;
  status?: EntryStatus;
  aiDecision?: string | null;
  aiCategory?: string | null;
  aiCaption?: string | null;
  aiReason?: string | null;
  aiRawResponse?: string | null;
}

export interface PublicStoryEntry {
  firstName: string;
  city: string;
  category: string | null;
  caption: string | null;
}

export interface AdminUpdateStatusInput {
  status: EntryStatus;
  adminNotes?: string | null;
  adminUser?: string | null;
}

export class EntryStatusUnchangedError extends Error {
  constructor() {
    super('Entry already has the requested status');
    this.name = 'EntryStatusUnchangedError';
  }
}

export class DuplicateContactError extends Error {
  constructor() {
    super('A submission already exists for this contact');
    this.name = 'DuplicateContactError';
  }
}

export interface ListEntriesOptions {
  status?: string;
  category?: string;
  search?: string;
  startDate?: Date;
  endDateExclusive?: Date;
  page?: number;
  limit?: number;
}

function isContactUniqueViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.some((field) => String(field).includes('contact'))
    : typeof target === 'string' && target.includes('contact');
}

/**
 * Creates and persists a new StoryEntry.
 * By default in Phase 3, entries are persisted with status 'pending_review'
 * without requiring AI moderation.
 */
export async function createStoryEntry(data: CreateStoryEntryInput) {
  const publicId = generatePublicSlug();

  try {
    return await prisma.storyEntry.create({
      data: {
        publicId,
        name: data.name.trim(),
        city: data.city.trim(),
        contact: data.contact.trim(),
        story: data.story.trim(),
        consent: data.consent ?? true,
        status: data.status ?? ENTRY_STATUS.PENDING_REVIEW,
        aiDecision: data.aiDecision ?? null,
        aiCategory: data.aiCategory ?? null,
        aiCaption: data.aiCaption ?? null,
        aiReason: data.aiReason ?? null,
        aiRawResponse: data.aiRawResponse ?? null,
      },
    });
  } catch (error) {
    if (isContactUniqueViolation(error)) {
      throw new DuplicateContactError();
    }
    throw error;
  }
}

export async function getEntryByContact(contact: string) {
  return prisma.storyEntry.findFirst({
    where: { contact },
    select: { id: true },
  });
}

/**
 * Retrieves a story entry for public display on /entry/[slug].
 * 
 * STRICT ACCESS CONTROL:
 * Only returns the record if it exists AND its operational status is 'approved'.
 * Returns null for any pending_review or rejected entry (resulting in HTTP 404).
 * 
 * STRICT PRIVACY RULE:
 * Returns ONLY firstName, city, category, and caption.
 * Full story, contact information (email/phone), internal database ID,
 * and AI audit/diagnostic fields are NEVER exposed to the public.
 */
export async function getPublicEntryBySlug(
  slug: string
): Promise<PublicStoryEntry | null> {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  const entry = await prisma.storyEntry.findUnique({
    where: { publicId: slug },
    select: {
      name: true,
      city: true,
      status: true,
      aiCategory: true,
      aiCaption: true,
    },
  });

  // Entry must exist and have status 'approved' to be publicly viewable
  if (!entry || entry.status !== ENTRY_STATUS.APPROVED) {
    return null;
  }

  // Extract first name only (e.g., "Aarav Sharma" -> "Aarav")
  const firstName = entry.name.trim().split(/\s+/)[0] || 'Friend';

  return {
    firstName,
    city: entry.city,
    category: entry.aiCategory,
    caption: entry.aiCaption,
  };
}

/**
 * Internal / Admin retrieval of a single entry by internal database ID.
 */
export async function getEntryById(id: string) {
  return prisma.storyEntry.findUnique({
    where: { id },
  });
}

/**
 * Internal / Admin retrieval of a single entry by public token.
 */
export async function getEntryByPublicId(publicId: string) {
  return prisma.storyEntry.findUnique({
    where: { publicId },
  });
}

/**
 * Admin query to list entries with optional status filtering and pagination,
 * along with dashboard status metrics.
 */
export async function listEntries(options: ListEntriesOptions = {}) {
  const {
    status,
    category,
    search,
    startDate,
    endDateExclusive,
    page = 1,
    limit = 25,
  } = options;
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

  const where = {
    ...(status && status !== 'all' ? { status } : {}),
    ...(category && category !== 'all' ? { aiCategory: category } : {}),
    ...(search
      ? { contact: { contains: search } }
      : {}),
    ...(startDate || endDateExclusive
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDateExclusive ? { lt: endDateExclusive } : {}),
          },
        }
      : {}),
  };

  const [entries, total, approvedCount, rejectedCount, pendingReviewCount] =
    await Promise.all([
      prisma.storyEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.storyEntry.count({ where }),
      prisma.storyEntry.count({ where: { status: ENTRY_STATUS.APPROVED } }),
      prisma.storyEntry.count({ where: { status: ENTRY_STATUS.REJECTED } }),
      prisma.storyEntry.count({
        where: { status: ENTRY_STATUS.PENDING_REVIEW },
      }),
    ]);

  return {
    metrics: {
      total: approvedCount + rejectedCount + pendingReviewCount,
      approved: approvedCount,
      rejected: rejectedCount,
      pendingReview: pendingReviewCount,
    },
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function exportEntries(
  options: Pick<
    ListEntriesOptions,
    'status' | 'category' | 'search' | 'startDate' | 'endDateExclusive'
  > = {}
) {
  const { status, category, search, startDate, endDateExclusive } = options;
  const where = {
    ...(status && status !== 'all' ? { status } : {}),
    ...(category && category !== 'all' ? { aiCategory: category } : {}),
    ...(search ? { contact: { contains: search } } : {}),
    ...(startDate || endDateExclusive
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDateExclusive ? { lt: endDateExclusive } : {}),
          },
        }
      : {}),
  };

  return prisma.storyEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Updates the operational status of an entry via Admin Override.
 * 
 * IMMUTABILITY RULE:
 * Preserves the original AI fields (aiDecision, aiCategory, aiCaption, aiReason, aiRawResponse).
 * Records adminOverride = true, adminNotes, adminUser, and overriddenAt timestamp.
 */
export async function updateEntryStatus(
  id: string,
  update: AdminUpdateStatusInput
) {
  const existing = await prisma.storyEntry.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error(`StoryEntry with id '${id}' not found`);
  }

  const updateResult = await prisma.storyEntry.updateMany({
    where: { id, status: { not: update.status } },
    data: {
      status: update.status,
      adminOverride: true,
      adminNotes: update.adminNotes ?? null,
      adminUser: update.adminUser ?? null,
      overriddenAt: new Date(),
      // Crucial: original AI fields are intentionally omitted from data update
    },
  });

  if (updateResult.count === 0) {
    const current = await prisma.storyEntry.findUnique({ where: { id } });
    if (!current) {
      throw new Error(`StoryEntry with id '${id}' not found`);
    }
    if (current.status === update.status) {
      throw new EntryStatusUnchangedError();
    }
    throw new Error('Unable to update story entry status');
  }

  return prisma.storyEntry.findUniqueOrThrow({ where: { id } });
}
