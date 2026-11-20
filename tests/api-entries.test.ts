import { afterAll, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { POST } from '../app/api/entries/route.ts';
import prisma from '../lib/db.ts';

describe('POST /api/entries Route Handler', () => {
  beforeAll(async () => {
    await prisma.storyEntry.deleteMany({
      where: { city: 'ApiTestCity' },
    });
  });

  afterAll(async () => {
    await prisma.storyEntry.deleteMany({
      where: { city: 'ApiTestCity' },
    });
    await prisma.$disconnect();
  });

  it('returns 400 for malformed non-JSON payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/entries', {
      method: 'POST',
      body: 'this-is-not-json{',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.1',
      },
    });

    const response = await POST(request);
    assert.equal(response.status, 400);

    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error, 'Invalid JSON payload');
  });

  it('returns 400 with details when validation fails', async () => {
    const request = new NextRequest('http://localhost:3000/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'A', // Too short
        city: '', // Empty
        contact: 'invalid-contact',
        story: 'Short', // Under 10 chars
        consent: false, // Must be true
      }),
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.2',
      },
    });

    const response = await POST(request);
    assert.equal(response.status, 400);

    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error, 'Validation failed');
    assert.ok(Array.isArray(body.details));
    assert.ok(body.details.length >= 4);
  });

  it('persists valid entry with mock moderation and returns 201 without leaking private info', async () => {
    const request = new NextRequest('http://localhost:3000/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Siddharth Patel',
        city: 'ApiTestCity',
        contact: '+91 98200 12345',
        story:
          'Roadside cutting chai in Gujarat during our university road trip.',
        consent: true,
      }),
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.3',
      },
    });

    const response = await POST(request);
    assert.equal(response.status, 201);

    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'approved');
    assert.equal(typeof body.publicId, 'string');
    assert.equal(body.message, 'Thank you! Your story was approved.');

    // Verify response privacy: no internal DB id, story, or contact
    assert.equal(body.id, undefined);
    assert.equal(body.story, undefined);
    assert.equal(body.contact, undefined);
    assert.equal(body.aiDecision, undefined);
    assert.deepEqual(Object.keys(body).sort(), [
      'message',
      'publicId',
      'status',
      'success',
    ]);

    // Verify entry was actually saved in the SQLite database
    const saved = await prisma.storyEntry.findFirst({
      where: {
        city: 'ApiTestCity',
        name: 'Siddharth Patel',
      },
    });

    assert.ok(saved);
    assert.equal(saved.contact, '9820012345'); // Correctly normalized Indian phone
    assert.equal(saved.status, 'approved');
    assert.equal(saved.aiDecision, 'approved');
    assert.equal(saved.aiCategory, 'nostalgic');
    assert.equal(saved.aiCaption, 'A memorable chai break worth sharing.');
    assert.equal(saved.publicId.length, 32);
  });

  it('preserves a submission as pending when mock AI times out', async () => {
    const request = new NextRequest('http://localhost:3000/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Failure Test',
        city: 'ApiTestCity',
        contact: '9876543218',
        story: '[MOCK_TIMEOUT] This submission must survive AI failure.',
        consent: true,
      }),
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.4',
      },
    });

    const response = await POST(request);
    assert.equal(response.status, 201);

    const body = await response.json();
    assert.equal(body.status, 'pending_review');
    assert.equal(body.publicId, null);

    const saved = await prisma.storyEntry.findFirst({
      where: {
        city: 'ApiTestCity',
        name: 'Failure Test',
      },
    });

    assert.ok(saved);
    assert.equal(saved.status, 'pending_review');
    assert.equal(saved.aiDecision, null);
    assert.equal(saved.aiCategory, null);
    assert.equal(saved.aiCaption, null);
    assert.equal(saved.aiReason, null);
    assert.equal(saved.aiRawResponse, null);
  });

  it('rejects a second submission from the same normalized contact', async () => {
    const contact = `duplicate-${Date.now()}@example.test`;
    const payload = {
      name: 'Duplicate Contact',
      city: 'ApiTestCity',
      contact,
      story: 'A story that should only be submitted once.',
      consent: true,
    };

    const firstResponse = await POST(
      new NextRequest('http://localhost:3000/api/entries', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.5',
        },
      })
    );
    const duplicateResponse = await POST(
      new NextRequest('http://localhost:3000/api/entries', {
        method: 'POST',
        body: JSON.stringify({ ...payload, contact: contact.toUpperCase() }),
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.6',
        },
      })
    );

    assert.equal(firstResponse.status, 201);
    assert.equal(duplicateResponse.status, 409);
    assert.match((await duplicateResponse.json()).error, /already in use/i);
    assert.equal(
      await prisma.storyEntry.count({ where: { contact } }),
      1
    );
  });

  it('returns 429 and Retry-After after the per-IP submission limit', async () => {
    const request = () =>
      new NextRequest('http://localhost:3000/api/entries', {
        method: 'POST',
        body: '{',
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.250',
        },
      });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await POST(request())).status, 400);
    }

    const limited = await POST(request());
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.match((await limited.json()).error, /too many submissions/i);
  });
});
