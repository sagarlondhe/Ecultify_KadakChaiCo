import { afterAll, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server.js';
import { GET } from '../app/api/admin/entries/route.ts';
import { PATCH } from '../app/api/admin/entries/[id]/route.ts';
import prisma from '../lib/db.ts';
import { createAdminSession, ADMIN_SESSION_COOKIE } from '../lib/auth/session.ts';
import {
  createStoryEntry,
  getPublicEntryBySlug,
} from '../lib/entries/service.ts';

const testCity = 'AdminPhase7Test';
const username = 'phase7-route-admin';
const password = 'test-password';
const sessionSecret = 'phase7-api-session-secret-with-at-least-32-chars';
let cookie = '';

function adminRequest(path: string, options: ConstructorParameters<typeof NextRequest>[1] = {}) {
  const headers = new Headers(options.headers);
  headers.set('cookie', cookie);
  return new NextRequest(`http://localhost:3000${path}`, {
    ...options,
    headers,
  });
}

describe('protected admin entries API', () => {
  beforeAll(async () => {
    process.env.ADMIN_USERNAME = username;
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash(password, 4);
    process.env.ADMIN_SESSION_SECRET = sessionSecret;
    cookie = `${ADMIN_SESSION_COOKIE}=${createAdminSession(username)}`;
    await prisma.storyEntry.deleteMany({ where: { city: testCity } });
  });

  afterAll(async () => {
    await prisma.storyEntry.deleteMany({ where: { city: testCity } });
    await prisma.$disconnect();
  });

  it('filters entries by final status and paginates authenticated results', async () => {
    await Promise.all([
      createStoryEntry({
        name: 'Pending Entry',
        city: testCity,
        contact: 'pending@example.com',
        story: 'A pending chai story waiting for its review.',
        status: 'pending_review',
      }),
      createStoryEntry({
        name: 'Approved Entry',
        city: testCity,
        contact: 'approved@example.com',
        story: 'An approved chai story from the campaign.',
        status: 'approved',
        aiCategory: 'funny',
      }),
      createStoryEntry({
        name: 'Another Approved Entry',
        city: testCity,
        contact: 'approved-two@example.com',
        story: 'Another approved campaign story for page two.',
        status: 'approved',
        aiCategory: 'nostalgic',
      }),
      createStoryEntry({
        name: 'Rejected Entry',
        city: testCity,
        contact: 'rejected@example.com',
        story: 'A rejected chai story from the campaign.',
        status: 'rejected',
      }),
    ]);

    const firstPage = await GET(
      adminRequest('/api/admin/entries?status=approved&page=1&limit=1')
    );
    const firstBody = await firstPage.json();
    assert.equal(firstPage.status, 200);
    assert.equal(firstBody.pagination.page, 1);
    assert.equal(firstBody.pagination.limit, 1);
    assert.ok(firstBody.entries.every((entry: { status: string }) => entry.status === 'approved'));
    assert.ok(firstBody.metrics.total >= 4);
    assert.equal(firstBody.entries[0].aiRawResponse, undefined);

    const secondPage = await GET(
      adminRequest('/api/admin/entries?status=approved&page=2&limit=1')
    );
    const secondBody = await secondPage.json();
    assert.equal(secondBody.pagination.page, 2);
    assert.equal(secondBody.entries.length, 1);
    assert.notEqual(firstBody.entries[0].id, secondBody.entries[0].id);

    const pending = await GET(
      adminRequest('/api/admin/entries?status=pending_review&page=1&limit=50')
    );
    const pendingBody = await pending.json();
    assert.ok(
      pendingBody.entries.some(
        (entry: { name: string; city: string }) =>
          entry.name === 'Pending Entry' && entry.city === testCity
      )
    );
    assert.equal(
      (await GET(adminRequest('/api/admin/entries?status=unknown'))).status,
      400
    );

    const funny = await GET(
      adminRequest('/api/admin/entries?category=funny&page=1&limit=50')
    );
    const funnyBody = await funny.json();
    assert.equal(funny.status, 200);
    assert.ok(
      funnyBody.entries.length > 0 &&
        funnyBody.entries.every(
          (entry: { aiCategory: string | null }) =>
            entry.aiCategory === 'funny'
        )
    );
    assert.equal(
      (await GET(adminRequest('/api/admin/entries?category=unknown'))).status,
      400
    );
  });

  it('records approval and rejection audit data without modifying original AI fields or public policy', async () => {
    const original = {
      aiDecision: 'rejected',
      aiCategory: 'nostalgic',
      aiCaption: 'Tea memories shared together.',
      aiReason: 'Original AI review reason.',
      aiRawResponse: '{"decision":"rejected"}',
    };
    const entry = await createStoryEntry({
      name: 'Override Entry',
      city: testCity,
      contact: 'override@example.com',
      story: 'A story reviewed by a human administrator.',
      status: 'rejected',
      ...original,
    });

    const approvedResponse = await PATCH(
      adminRequest(`/api/admin/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          adminNotes: 'Reviewed and approved.',
        }),
      }),
      { params: { id: entry.id } }
    );
    const approvedBody = await approvedResponse.json();
    assert.equal(approvedResponse.status, 200);
    assert.equal(approvedBody.entry.status, 'approved');
    assert.equal(approvedBody.entry.adminOverride, true);
    assert.equal(approvedBody.entry.adminNotes, 'Reviewed and approved.');
    assert.equal(approvedBody.entry.adminUser, username);
    assert.ok(approvedBody.entry.overriddenAt);
    assert.deepEqual(await getPublicEntryBySlug(entry.publicId), {
      firstName: 'Override',
      city: testCity,
      category: original.aiCategory,
      caption: original.aiCaption,
    });

    const savedAfterApproval = await prisma.storyEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    for (const [field, value] of Object.entries(original)) {
      assert.equal(savedAfterApproval[field as keyof typeof savedAfterApproval], value);
    }

    const rejectedResponse = await PATCH(
      adminRequest(`/api/admin/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      }),
      { params: { id: entry.id } }
    );
    assert.equal(rejectedResponse.status, 200);
    assert.equal(
      (await prisma.storyEntry.findUniqueOrThrow({ where: { id: entry.id } }))
        .adminNotes,
      null
    );
    assert.equal(await getPublicEntryBySlug(entry.publicId), null);
  });

  it('rejects invalid moderation input and avoids marking an unchanged status as an override', async () => {
    const entry = await createStoryEntry({
      name: 'Unchanged Entry',
      city: testCity,
      contact: 'unchanged@example.com',
      story: 'A submission that is already approved.',
      status: 'approved',
    });

    const invalid = await PATCH(
      adminRequest(`/api/admin/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'pending_review', adminNotes: 'x'.repeat(1001) }),
      }),
      { params: { id: entry.id } }
    );
    assert.equal(invalid.status, 400);

    const unchanged = await PATCH(
      adminRequest(`/api/admin/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: { id: entry.id } }
    );
    assert.equal(unchanged.status, 409);

    const saved = await prisma.storyEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    assert.equal(saved.adminOverride, false);
    assert.equal(saved.overriddenAt, null);
  });

  it('rejects malformed JSON and unexpected moderation fields safely', async () => {
    const malformed = await PATCH(
      adminRequest('/api/admin/entries/entry-id', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }),
      { params: { id: 'entry-id' } }
    );
    const unexpected = await PATCH(
      adminRequest('/api/admin/entries/entry-id', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'approved', adminUser: 'forged' }),
      }),
      { params: { id: 'entry-id' } }
    );

    assert.equal(malformed.status, 400);
    assert.equal(unexpected.status, 400);
    assert.deepEqual(await malformed.json(), {
      success: false,
      error: 'Invalid request',
    });
    assert.deepEqual(await unexpected.json(), {
      success: false,
      error: 'Invalid moderation request',
    });
  });
});
