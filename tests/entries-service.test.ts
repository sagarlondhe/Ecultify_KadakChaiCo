import { afterAll, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import prisma from '../lib/db.ts';
import {
  generatePublicSlug,
  createStoryEntry,
  DuplicateContactError,
  getPublicEntryBySlug,
  getEntryById,
  updateEntryStatus,
  listEntries,
} from '../lib/entries/service.ts';
import { ENTRY_STATUS } from '../lib/validation.ts';

describe('Story Entry Service & Database Persistence', () => {
  beforeAll(async () => {
    // Clean up any existing test records
    await prisma.storyEntry.deleteMany({
      where: {
        city: 'Testville',
      },
    });
  });

  afterAll(async () => {
    // Clean up after tests run
    await prisma.storyEntry.deleteMany({
      where: {
        city: 'Testville',
      },
    });
    await prisma.$disconnect();
  });

  describe('generatePublicSlug', () => {
    it('generates a 32-character hexadecimal token', () => {
      const slug = generatePublicSlug();
      assert.equal(typeof slug, 'string');
      assert.equal(slug.length, 32);
      assert.match(slug, /^[0-9a-f]{32}$/);
    });

    it('generates distinct unguessable tokens on successive calls', () => {
      const tokens = new Set(Array.from({ length: 25 }, () => generatePublicSlug()));
      assert.equal(tokens.size, 25);
    });
  });

  describe('createStoryEntry', () => {
    it('creates an entry with default pending_review status in Phase 3', async () => {
      const entry = await createStoryEntry({
        name: 'Pooja Sharma',
        city: 'Testville',
        contact: 'pooja@example.com',
        story: 'Cutting chai with my college friends every monsoon afternoon.',
        consent: true,
      });

      assert.ok(entry.id);
      assert.equal(typeof entry.id, 'string');
      assert.equal(entry.publicId.length, 32);
      assert.equal(entry.name, 'Pooja Sharma');
      assert.equal(entry.city, 'Testville');
      assert.equal(entry.contact, 'pooja@example.com');
      assert.equal(entry.status, ENTRY_STATUS.PENDING_REVIEW);
      assert.equal(entry.consent, true);
      assert.equal(entry.aiDecision, null);
      assert.equal(entry.adminOverride, false);
      assert.equal(entry.overriddenAt, null);
    });

    it('enforces contact uniqueness atomically for concurrent creates', async () => {
      const input = {
        name: 'Unique Contact',
        city: 'Testville',
        contact: `unique-${Date.now()}@example.test`,
        story: 'A story that uses one normalized contact address.',
      };

      const results = await Promise.allSettled([
        createStoryEntry(input),
        createStoryEntry(input),
      ]);

      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      const failure = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      );
      assert.ok(failure);
      assert.ok(failure.reason instanceof DuplicateContactError);
    });
  });

  describe('getPublicEntryBySlug (Access Control & Privacy)', () => {
    it('returns null for nonexistent token', async () => {
      const result = await getPublicEntryBySlug('00000000000000000000000000000000');
      assert.equal(result, null);
    });

    it('returns null for malformed slugs', async () => {
      assert.equal(await getPublicEntryBySlug('not-a-public-token'), null);
    });

    it('returns null for pending_review entries (strictly inaccessible)', async () => {
      const pendingEntry = await createStoryEntry({
        name: 'Kabir Verma',
        city: 'Testville',
        contact: '9876543211',
        story: 'Chai break before the big exam.',
        status: ENTRY_STATUS.PENDING_REVIEW,
      });

      const publicView = await getPublicEntryBySlug(pendingEntry.publicId);
      assert.equal(publicView, null);
    });

    it('returns null for rejected entries (strictly inaccessible)', async () => {
      const rejectedEntry = await createStoryEntry({
        name: 'Rahul Roy',
        city: 'Testville',
        contact: '9876543212',
        story: 'Inappropriate or spam story content.',
        status: ENTRY_STATUS.REJECTED,
      });

      const publicView = await getPublicEntryBySlug(rejectedEntry.publicId);
      assert.equal(publicView, null);
    });

    it('returns ONLY safe public fields for approved entries', async () => {
      const approvedEntry = await createStoryEntry({
        name: 'Ananya Deshmukh',
        city: 'Testville',
        contact: 'ananya@example.com',
        story: 'Warm cutting chai at Marine Drive with my grandmother.',
        status: ENTRY_STATUS.APPROVED,
        aiCategory: 'nostalgic',
        aiCaption: 'Marine Drive breeze, grandmother smiles, and hot cutting chai.',
      });

      const publicView = await getPublicEntryBySlug(approvedEntry.publicId);
      assert.ok(publicView);
      assert.equal(publicView.firstName, 'Ananya'); // First name only
      assert.equal(publicView.city, 'Testville');
      assert.equal(publicView.category, 'nostalgic');
      assert.equal(
        publicView.caption,
        'Marine Drive breeze, grandmother smiles, and hot cutting chai.'
      );

      // The service projection contains only fields intended for public display.
      const rawPublicView = publicView as unknown as Record<string, unknown>;
      assert.deepEqual(Object.keys(rawPublicView).sort(), [
        'caption',
        'category',
        'city',
        'firstName',
      ]);
      assert.equal(rawPublicView.id, undefined);
      assert.equal(rawPublicView.publicId, undefined);
      assert.equal(rawPublicView.name, undefined);
      assert.equal(rawPublicView.story, undefined);
      assert.equal(rawPublicView.contact, undefined);
      assert.equal(rawPublicView.consent, undefined);
      assert.equal(rawPublicView.status, undefined);
      assert.equal(rawPublicView.aiDecision, undefined);
      assert.equal(rawPublicView.aiCategory, undefined);
      assert.equal(rawPublicView.aiCaption, undefined);
      assert.equal(rawPublicView.aiReason, undefined);
      assert.equal(rawPublicView.aiRawResponse, undefined);
      assert.equal(rawPublicView.adminNotes, undefined);
      assert.equal(rawPublicView.adminUser, undefined);
      assert.equal(rawPublicView.adminOverride, undefined);
      assert.equal(rawPublicView.overriddenAt, undefined);
    });

    it('blocks an AI-approved entry after an admin rejects it', async () => {
      const entry = await createStoryEntry({
        name: 'Meera Kapoor',
        city: 'Testville',
        contact: 'meera@example.com',
        story: 'A rainy afternoon shared over chai with my closest friends.',
        status: ENTRY_STATUS.APPROVED,
        aiDecision: 'approved',
        aiCategory: 'wholesome',
        aiCaption: 'Rainy afternoons are better with chai and friends.',
      });

      await updateEntryStatus(entry.id, {
        status: ENTRY_STATUS.REJECTED,
        adminNotes: 'Removed from public display.',
        adminUser: 'test_admin',
      });

      assert.equal(await getPublicEntryBySlug(entry.publicId), null);
    });

    it('allows an AI-rejected entry after an admin approves it', async () => {
      const entry = await createStoryEntry({
        name: 'Arjun Mehta',
        city: 'Testville',
        contact: 'arjun@example.com',
        story: 'A quiet chai break with my grandfather after a long day.',
        status: ENTRY_STATUS.REJECTED,
        aiDecision: 'rejected',
        aiCategory: 'nostalgic',
        aiCaption: 'A quiet cup brings old memories back.',
        aiReason: 'Original AI decision retained for audit.',
      });

      await updateEntryStatus(entry.id, {
        status: ENTRY_STATUS.APPROVED,
        adminNotes: 'Approved after human review.',
        adminUser: 'test_admin',
      });

      assert.deepEqual(await getPublicEntryBySlug(entry.publicId), {
        firstName: 'Arjun',
        city: 'Testville',
        category: 'nostalgic',
        caption: 'A quiet cup brings old memories back.',
      });
    });
  });

  describe('updateEntryStatus (Admin Override & Audit Trail)', () => {
    it('updates status and preserves original AI audit trail fields', async () => {
      // Create entry with simulated original AI evaluation
      const initialEntry = await createStoryEntry({
        name: 'Vikram Joshi',
        city: 'Testville',
        contact: 'vikram@example.com',
        story: 'A chai break story that AI initially flagged for manual review.',
        status: ENTRY_STATUS.PENDING_REVIEW,
        aiDecision: 'rejected',
        aiCategory: 'other',
        aiCaption: 'Pending review caption.',
        aiReason: 'Flagged for moderation check',
        aiRawResponse: '{"decision":"rejected","reason":"Flagged"}',
      });

      // Admin approves entry
      const updated = await updateEntryStatus(initialEntry.id, {
        status: ENTRY_STATUS.APPROVED,
        adminNotes: 'Reviewed manually by lead moderator; content is wholesome.',
        adminUser: 'lead_admin',
      });

      assert.equal(updated.status, ENTRY_STATUS.APPROVED);
      assert.equal(updated.adminOverride, true);
      assert.equal(
        updated.adminNotes,
        'Reviewed manually by lead moderator; content is wholesome.'
      );
      assert.equal(updated.adminUser, 'lead_admin');
      assert.ok(updated.overriddenAt instanceof Date);

      // Crucial: Original AI fields must remain 100% preserved
      assert.equal(updated.aiDecision, 'rejected');
      assert.equal(updated.aiCategory, 'other');
      assert.equal(updated.aiCaption, 'Pending review caption.');
      assert.equal(updated.aiReason, 'Flagged for moderation check');
      assert.equal(
        updated.aiRawResponse,
        '{"decision":"rejected","reason":"Flagged"}'
      );
    });
  });

  describe('listEntries', () => {
    it('returns paginated entries and status metrics', async () => {
      const result = await listEntries({ limit: 10 });
      assert.ok(Array.isArray(result.entries));
      assert.ok(result.metrics);
      assert.equal(typeof result.metrics.total, 'number');
      assert.equal(typeof result.metrics.approved, 'number');
      assert.equal(typeof result.metrics.rejected, 'number');
      assert.equal(typeof result.metrics.pendingReview, 'number');
      assert.ok(result.pagination);
    });
  });
});
