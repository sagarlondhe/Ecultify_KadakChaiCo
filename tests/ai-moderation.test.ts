import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  moderateStory,
  parseAiModerationResponse,
  MockAiProvider,
  RealAiProvider,
} from '../lib/ai/index.ts';
import { aiModerationSchema } from '../lib/ai/schema.ts';
import { mapAiOutcomeToStatus } from '../lib/ai/status.ts';
import { ENTRY_STATUS } from '../lib/validation.ts';

describe('AI moderation output validation', () => {
  it('accepts a valid approved response', () => {
    const result = parseAiModerationResponse(
      JSON.stringify({
        decision: 'approved',
        reason: null,
        category: 'nostalgic',
        caption: 'Chai memories stay warm.',
      })
    );
    assert.equal(result.success, true);
  });

  it('accepts a valid rejected response', () => {
    const result = parseAiModerationResponse(
      JSON.stringify({
        decision: 'rejected',
        reason: 'The story contains prohibited promotional content.',
        category: 'other',
        caption: 'Please share a personal chai moment.',
      })
    );
    assert.equal(result.success, true);
  });

  it('rejects invalid JSON', () => {
    assert.deepEqual(parseAiModerationResponse('{not json'), {
      success: false,
    });
  });

  it('rejects incorrect enum field values', () => {
    const result = aiModerationSchema.safeParse({
      decision: 'maybe',
      reason: null,
      category: 'funny',
      caption: 'A chai moment.',
    });
    assert.equal(result.success, false);
  });

  it('rejects missing fields', () => {
    const result = aiModerationSchema.safeParse({
      decision: 'approved',
      reason: null,
      caption: 'A chai moment.',
    });
    assert.equal(result.success, false);
  });

  it('rejects extra fields', () => {
    const result = aiModerationSchema.safeParse({
      decision: 'approved',
      reason: null,
      category: 'funny',
      caption: 'A chai moment.',
      privateDebug: 'not allowed',
    });
    assert.equal(result.success, false);
  });

  it('rejects captions exceeding 12 words', () => {
    const result = aiModerationSchema.safeParse({
      decision: 'approved',
      reason: null,
      category: 'wholesome',
      caption: 'One two three four five six seven eight nine ten eleven twelve thirteen',
    });
    assert.equal(result.success, false);
  });

  it('rejects contradictory approved reason and rejected null reason', () => {
    assert.equal(
      aiModerationSchema.safeParse({
        decision: 'approved',
        reason: 'Unexpected reason',
        category: 'funny',
        caption: 'A chai moment.',
      }).success,
      false
    );
    assert.equal(
      aiModerationSchema.safeParse({
        decision: 'rejected',
        reason: null,
        category: 'other',
        caption: 'A chai moment.',
      }).success,
      false
    );
  });
});

describe('Mock AI provider', () => {
  const input = {
    name: 'Test User',
    city: 'Test City',
    consent: true,
  };

  it('is deterministic for approved stories', async () => {
    const provider = new MockAiProvider();
    const first = await provider.moderate({
      ...input,
      story: '[MOCK_APPROVED] family chai break',
    });
    const second = await provider.moderate({
      ...input,
      story: '[MOCK_APPROVED] family chai break',
    });
    assert.equal(first, second);
  });

  it('handles trigger text case-insensitively and approves ordinary stories deterministically', async () => {
    const provider = new MockAiProvider();
    const rejected = await provider.moderate({
      ...input,
      story: '[mock_rejected] campaign story',
    });
    const ordinary = await provider.moderate({
      ...input,
      story: 'A quiet break with chai and friends.',
    });

    assert.equal(JSON.parse(rejected).decision, 'rejected');
    assert.deepEqual(JSON.parse(ordinary), {
      decision: 'approved',
      reason: null,
      category: 'nostalgic',
      caption: 'A memorable chai break worth sharing.',
    });
  });

  it('returns a deterministic rejected result', async () => {
    const outcome = await moderateStory(
      { ...input, story: '[MOCK_REJECTED] campaign story' },
      new MockAiProvider()
    );
    assert.equal(outcome.success, true);
    if (outcome.success) {
      assert.equal(outcome.result.decision, 'rejected');
      assert.ok(outcome.result.reason);
    }
  });

  it('uses the same validation pipeline and works without API keys', async () => {
    const outcome = await moderateStory(
      { ...input, story: '[MOCK_APPROVED] Friends sharing chai.' },
      new MockAiProvider()
    );
    assert.equal(outcome.success, true);
  });

  it('maps mock timeout and errors to safe failures', async () => {
    const timeout = await moderateStory(
      { ...input, story: '[MOCK_TIMEOUT]' },
      new MockAiProvider()
    );
    assert.deepEqual(timeout, {
      success: false,
      result: null,
      code: 'timeout',
    });

    const providerError = await moderateStory(
      { ...input, story: '[MOCK_ERROR]' },
      new MockAiProvider()
    );
    assert.equal(providerError.success, false);
  });
});

describe('Real AI provider error handling', () => {
  it('returns timeout for an aborted request', async () => {
    const provider = new RealAiProvider(
      {
        baseUrl: 'https://example.invalid/v1',
        apiKey: 'test-key',
        model: 'test-model',
        timeoutMs: 5,
      },
      ((_: string | URL | globalThis.Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })) as typeof fetch
    );

    const outcome = await moderateStory(
      {
        name: 'Test',
        city: 'Test',
        story: 'A quiet chai break.',
        consent: true,
      },
      provider
    );
    assert.equal(outcome.success, false);
    if (!outcome.success) {
      assert.equal(outcome.code, 'timeout');
    }
  });

  it('keeps the timeout active while reading the provider response body', async () => {
    const provider = new RealAiProvider(
      {
        baseUrl: 'https://example.invalid/v1',
        apiKey: 'test-key',
        model: 'test-model',
        timeoutMs: 5,
      },
      (async (_: string | URL | globalThis.Request, init?: RequestInit) =>
        ({
          ok: true,
          json: () =>
            new Promise<unknown>((_resolve, reject) => {
              init?.signal?.addEventListener(
                'abort',
                () => reject(new DOMException('Aborted', 'AbortError')),
                { once: true }
              );
            }),
        }) as Response) as typeof fetch
    );

    const outcome = await moderateStory(
      {
        name: 'Test',
        city: 'Test',
        story: 'A quiet chai break.',
        consent: true,
      },
      provider
    );

    assert.deepEqual(outcome, {
      success: false,
      result: null,
      code: 'timeout',
    });
  });

  it('returns provider_error for HTTP failures', async () => {
    const provider = new RealAiProvider(
      {
        baseUrl: 'https://example.invalid/v1',
        apiKey: 'test-key',
        model: 'test-model',
      },
      (async () => new Response('{}', { status: 429 })) as typeof fetch
    );

    const outcome = await moderateStory(
      {
        name: 'Test',
        city: 'Test',
        story: 'A quiet chai break.',
        consent: true,
      },
      provider
    );
    assert.equal(outcome.success, false);
    if (!outcome.success) {
      assert.equal(outcome.code, 'provider_error');
    }
  });

  it('returns provider_error for an invalid provider response body', async () => {
    const provider = new RealAiProvider(
      {
        baseUrl: 'https://example.invalid/v1',
        apiKey: 'test-key',
        model: 'test-model',
      },
      (async () => new Response('not-json', { status: 200 })) as typeof fetch
    );

    const outcome = await moderateStory(
      {
        name: 'Test',
        city: 'Test',
        story: 'A quiet chai break.',
        consent: true,
      },
      provider
    );
    assert.equal(outcome.success, false);
    if (!outcome.success) {
      assert.equal(outcome.code, 'provider_error');
    }
  });

  it('returns network for transport failures', async () => {
    const provider = new RealAiProvider(
      {
        baseUrl: 'https://example.invalid/v1',
        apiKey: 'test-key',
        model: 'test-model',
      },
      (async () => {
        throw new TypeError('network unavailable');
      }) as typeof fetch
    );

    const outcome = await moderateStory(
      {
        name: 'Test',
        city: 'Test',
        story: 'A quiet chai break.',
        consent: true,
      },
      provider
    );
    assert.equal(outcome.success, false);
    if (!outcome.success) {
      assert.equal(outcome.code, 'network');
    }
  });
});

describe('Database status mapping', () => {
  it('maps approved to approved', () => {
    assert.equal(
      mapAiOutcomeToStatus({
        success: true,
        result: {
          decision: 'approved',
          reason: null,
          category: 'wholesome',
          caption: 'Warm shared chai.',
        },
      }),
      ENTRY_STATUS.APPROVED
    );
  });

  it('maps rejected to rejected', () => {
    assert.equal(
      mapAiOutcomeToStatus({
        success: true,
        result: {
          decision: 'rejected',
          reason: 'Prohibited content.',
          category: 'other',
          caption: 'Share a personal chai moment.',
        },
      }),
      ENTRY_STATUS.REJECTED
    );
  });

  it('maps every AI failure to pending_review', () => {
    for (const code of [
      'timeout',
      'network',
      'provider_error',
      'invalid_response',
    ] as const) {
      assert.equal(
        mapAiOutcomeToStatus({
          success: false,
          result: null,
          code,
        }),
        ENTRY_STATUS.PENDING_REVIEW
      );
    }
  });
});
