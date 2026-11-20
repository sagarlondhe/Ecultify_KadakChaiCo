import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { parseAiModerationResponse } from '../lib/ai/parser.ts';
import { moderateStory } from '../lib/ai/index.ts';
import { mapAiOutcomeToStatus } from '../lib/ai/status.ts';
import { ENTRY_STATUS } from '../lib/validation.ts';
import type { AiProvider } from '../lib/ai/types.ts';

const validOutput = {
  decision: 'approved',
  reason: null,
  category: 'nostalgic',
  caption: 'Warm memories over chai.',
};

const malformedResponses: { description: string; responses: string[] }[] = [
  { description: 'invalid JSON', responses: ['{not json'] },
  { description: 'empty response', responses: [''] },
  {
    description: 'missing each required field',
    responses: (['decision', 'reason', 'category', 'caption'] as const).map(
      (field) => {
        const output: Record<string, unknown> = { ...validOutput };
        delete output[field];
        return JSON.stringify(output);
      }
    ),
  },
  {
    description: 'unexpected extra fields',
    responses: [
      JSON.stringify({ ...validOutput, internalDebug: 'do not accept' }),
    ],
  },
  {
    description: 'incorrect decision values',
    responses: [JSON.stringify({ ...validOutput, decision: 'maybe' })],
  },
  {
    description: 'incorrect category values',
    responses: [JSON.stringify({ ...validOutput, category: 'excellent' })],
  },
  {
    description: 'invalid rejection reasons',
    responses: [
      JSON.stringify({ ...validOutput, reason: '  ' }),
      JSON.stringify({ ...validOutput, reason: 7 }),
    ],
  },
  {
    description: 'captions exceeding 12 words',
    responses: [
      JSON.stringify({
        ...validOutput,
        caption:
          'One two three four five six seven eight nine ten eleven twelve thirteen',
      }),
    ],
  },
  {
    description: 'incorrect field types',
    responses: [
      JSON.stringify({ ...validOutput, decision: 1 }),
      JSON.stringify({ ...validOutput, reason: false }),
      JSON.stringify({ ...validOutput, category: null }),
      JSON.stringify({ ...validOutput, caption: ['warm', 'chai'] }),
    ],
  },
  {
    description: 'semantically invalid decision and reason combinations',
    responses: [
      JSON.stringify({ ...validOutput, reason: 'Unexpected approval reason.' }),
      JSON.stringify({
        ...validOutput,
        decision: 'rejected',
        reason: null,
      }),
    ],
  },
];

describe('AI moderation parser', () => {
  it('accepts a complete schema-valid JSON response', () => {
    assert.deepEqual(
      parseAiModerationResponse(JSON.stringify(validOutput)),
      { success: true, result: validOutput }
    );
  });

  it('accepts a valid rejected decision with a reason', () => {
    const response = {
      decision: 'rejected',
      reason: 'The story does not meet the campaign guidelines.',
      category: 'other',
      caption: 'Share a personal chai moment.',
    };

    assert.deepEqual(parseAiModerationResponse(JSON.stringify(response)), {
      success: true,
      result: response,
    });
  });

  for (const { description, responses } of malformedResponses) {
    it(`rejects ${description}`, () => {
      for (const response of responses) {
        assert.deepEqual(parseAiModerationResponse(response), {
          success: false,
        });
      }
    });
  }

  it('never maps malformed provider output to approval', async () => {
    for (const response of malformedResponses.flatMap(({ responses }) => responses)) {
      const provider: AiProvider = {
        moderate: async () => response,
      };
      const outcome = await moderateStory(
        {
          name: 'Test User',
          city: 'Test City',
          story: 'A valid submission story about a chai break.',
          consent: true,
        },
        provider
      );

      assert.equal(outcome.success, false);
      assert.equal(
        mapAiOutcomeToStatus(outcome),
        ENTRY_STATUS.PENDING_REVIEW
      );
    }
  });
});
