import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  consumeRateLimit,
  getClientIp,
} from '../lib/rate-limit.ts';

describe('submission rate limiting', () => {
  it('allows the configured number of requests and returns retry timing', () => {
    const key = `rate-limit-test-${crypto.randomUUID()}`;
    const first = consumeRateLimit(key, {
      now: 1_000,
      limit: 2,
      windowMs: 10_000,
    });
    const second = consumeRateLimit(key, {
      now: 2_000,
      limit: 2,
      windowMs: 10_000,
    });
    const blocked = consumeRateLimit(key, {
      now: 3_000,
      limit: 2,
      windowMs: 10_000,
    });

    assert.deepEqual(first, {
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 10,
    });
    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 0);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 8);
  });

  it('starts a new window after the previous window expires', () => {
    const key = `rate-limit-window-test-${crypto.randomUUID()}`;
    consumeRateLimit(key, { now: 1_000, limit: 1, windowMs: 5_000 });

    assert.equal(
      consumeRateLimit(key, { now: 6_000, limit: 1, windowMs: 5_000 }).allowed,
      true
    );
  });

  it('uses the proxy-provided client address for the rate-limit key', () => {
    const request = new Request('http://localhost/api/entries', {
      headers: {
        'x-forwarded-for': '203.0.113.8, 10.0.0.1',
      },
    });
    assert.equal(getClientIp(request), '203.0.113.8');

    const trustedIpRequest = new Request('http://localhost/api/entries', {
      headers: {
        'x-real-ip': '203.0.113.9',
        'x-forwarded-for': '203.0.113.8, 10.0.0.1',
      },
    });
    assert.equal(getClientIp(trustedIpRequest), '203.0.113.9');
  });
});