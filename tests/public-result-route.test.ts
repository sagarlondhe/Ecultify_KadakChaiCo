import { afterAll, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import prisma from '../lib/db.ts';
import { createStoryEntry } from '../lib/entries/service.ts';
import { GET } from '../app/entry/[slug]/route.ts';

const testCity = 'Phase8RouteTest';

function request(slug: string): Request {
  return new Request(`http://localhost:3000/entry/${encodeURIComponent(slug)}`);
}

describe('GET /entry/[slug] route handler', () => {
  beforeAll(async () => {
    await prisma.storyEntry.deleteMany({ where: { city: testCity } });
  });

  afterAll(async () => {
    await prisma.storyEntry.deleteMany({ where: { city: testCity } });
    await prisma.$disconnect();
  });

  it('returns the same generic 404 for unknown, pending, and rejected entries', async () => {
    const pending = await createStoryEntry({
      name: 'Pending Person',
      city: testCity,
      contact: 'pending@example.test',
      story: 'Pending private story must not appear.',
      status: 'pending_review',
    });
    const rejected = await createStoryEntry({
      name: 'Rejected Person',
      city: testCity,
      contact: 'rejected@example.test',
      story: 'Rejected private story must not appear.',
      status: 'rejected',
    });
    const responses = await Promise.all([
      GET(request('0'.repeat(32)), { params: { slug: '0'.repeat(32) } }),
      GET(request(pending.publicId), {
        params: { slug: pending.publicId },
      }),
      GET(request(rejected.publicId), {
        params: { slug: rejected.publicId },
      }),
    ]);

    const bodies = await Promise.all(
      responses.map((response) => response.text())
    );
    assert.deepEqual(responses.map((response) => response.status), [
      404,
      404,
      404,
    ]);
    assert.equal(bodies[0], bodies[1]);
    assert.equal(bodies[1], bodies[2]);
    assert.match(bodies[0], /We couldn&rsquo;t find that chai break/);
    assert.doesNotMatch(bodies[0], /Pending private story|Rejected private story/);
  });

  it('returns an approved public card without private fields and escapes HTML data', async () => {
    const privateStory = 'PRIVATE_ROUTE_STORY_SENTINEL';
    const privateContact = 'private.route@example.test';
    const entry = await createStoryEntry({
      name: "O'Brien<script>qa()</script> Lastname",
      city: testCity,
      contact: privateContact,
      story: privateStory,
      status: 'approved',
      aiCategory: 'wholesome',
      aiCaption: '<img src=x onerror=qa()> Safe chai caption.',
    });
    const response = await GET(request(entry.publicId), {
      params: { slug: entry.publicId },
    });
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.match(html, /&lt;script&gt;qa\(\)&lt;\/script&gt;/);
    assert.match(html, /&lt;img src=x onerror=qa\(\)&gt;/);
    assert.match(
      html,
      /<title>O&#39;Brien&lt;script&gt;qa\(\)&lt;\/script&gt;&#39;s #MyChaiBreak<\/title>/
    );
    assert.doesNotMatch(html, /&amp;#39;/);
    assert.doesNotMatch(html, /<script>qa\(\)<\/script>/);
    assert.doesNotMatch(html, /Lastname|PRIVATE_ROUTE_STORY_SENTINEL/);
    assert.doesNotMatch(html, /private\.route@example\.test/);
    assert.doesNotMatch(html, new RegExp(entry.id));
  });
});
