import { afterAll, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { GET as exportEntriesRoute } from '../app/api/admin/entries/export/route.ts';
import { ADMIN_SESSION_COOKIE, createAdminSession } from '../lib/auth/session.ts';
import prisma from '../lib/db.ts';
import { createStoryEntry } from '../lib/entries/service.ts';

const testCity = 'AdminExportTest';
const username = 'admin-export-test';
const sessionSecret = 'admin-export-session-secret-long-enough-for-tests';
let cookie = '';

function request(path: string, authenticated = true) {
  return new Request(`http://localhost:3000${path}`, {
    headers: authenticated
      ? { cookie }
      : undefined,
  });
}

describe('GET /api/admin/entries/export', () => {
  beforeAll(async () => {
    process.env.ADMIN_USERNAME = username;
    process.env.ADMIN_SESSION_SECRET = sessionSecret;
    cookie = `${ADMIN_SESSION_COOKIE}=${createAdminSession(username)}`;
    await prisma.storyEntry.deleteMany({ where: { city: testCity } });

    await Promise.all([
      createStoryEntry({
        name: 'Export, "One"',
        city: testCity,
        contact: `export-one-${Date.now()}@example.test`,
        story: '=HYPERLINK("https://example.test","open")',
        status: 'approved',
        aiDecision: 'approved',
        aiCategory: 'funny',
        aiCaption: 'A funny chai break.',
      }),
      createStoryEntry({
        name: 'Export Two',
        city: testCity,
        contact: `export-two-${Date.now()}@example.test`,
        story: 'A nostalgic chai story from the campaign.',
        status: 'rejected',
        aiDecision: 'rejected',
        aiCategory: 'nostalgic',
        aiReason: 'Not a campaign story.',
      }),
    ]);
  });

  afterAll(async () => {
    await prisma.storyEntry.deleteMany({ where: { city: testCity } });
    await prisma.$disconnect();
  });

  it('requires an admin session and validates filters', async () => {
    assert.equal(
      (await exportEntriesRoute(request('/api/admin/entries/export', false)))
        .status,
      401
    );
    assert.equal(
      (
        await exportEntriesRoute(
          request('/api/admin/entries/export?category=not-a-category')
        )
      ).status,
      400
    );
  });

  it('exports filtered entries as safe, properly escaped CSV', async () => {
    const response = await exportEntriesRoute(
      request(
        '/api/admin/entries/export?status=approved&category=funny'
      )
    );
    const csv = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/csv/);
    assert.match(
      response.headers.get('content-disposition') ?? '',
      /attachment; filename="kadak-chai-entries-/
    );
    assert.match(csv, /"submittedAt","name","city","contact","story"/);
    assert.match(csv, /"id","publicId","submittedAt"/);
    assert.match(csv, /"Export, ""One"""/);
    assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test"",""open""\)"/);
    assert.doesNotMatch(csv, /Export Two/);
  });

  it('applies contact and date filters to the protected CSV export', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const response = await exportEntriesRoute(
      request(
        `/api/admin/entries/export?search=export-one&from=${today}&to=${today}`
      )
    );
    const csv = await response.text();

    assert.equal(response.status, 200);
    assert.match(csv, /Export, ""One""/);
    assert.doesNotMatch(csv, /Export Two/);
  });
});
