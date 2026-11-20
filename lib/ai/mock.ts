import type { AiModerationInput, AiProvider } from './types.ts';

export class MockAiProvider implements AiProvider {
  async moderate(input: AiModerationInput): Promise<string> {
    const story = input.story.toUpperCase();

    if (story.includes('[MOCK_TIMEOUT]')) {
      throw new Error('MOCK_TIMEOUT');
    }

    if (story.includes('[MOCK_ERROR]')) {
      throw new Error('MOCK_ERROR');
    }

    if (story.includes('[MOCK_REJECTED]') || /\b(SPAM|ABUSIVE|HATE)\b/.test(story)) {
      return JSON.stringify({
        decision: 'rejected',
        reason: 'The story does not meet campaign moderation guidelines.',
        category: 'other',
        caption: 'A thoughtful chai story for the community.',
      });
    }

    if (story.includes('[MOCK_APPROVED]')) {
      return JSON.stringify({
        decision: 'approved',
        reason: null,
        category: 'wholesome',
        caption: 'Warm chai and shared moments.',
      });
    }

    return JSON.stringify({
      decision: 'approved',
      reason: null,
      category: 'nostalgic',
      caption: 'A memorable chai break worth sharing.',
    });
  }
}
