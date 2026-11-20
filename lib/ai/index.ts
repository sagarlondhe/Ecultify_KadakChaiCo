import { MockAiProvider } from './mock.ts';
import { parseAiModerationResponse } from './parser.ts';
import { RealAiProvider } from './real.ts';
import type {
  AiModerationInput,
  AiModerationOutcome,
  AiProvider,
} from './types.ts';

export * from './schema.ts';
export * from './types.ts';
export * from './parser.ts';
export { MockAiProvider } from './mock.ts';
export { RealAiProvider } from './real.ts';

export function createAiProvider(
  env: NodeJS.ProcessEnv = process.env
): AiProvider {
  const provider = (env.AI_PROVIDER || 'mock').trim().toLowerCase();

  if (provider === 'mock') {
    return new MockAiProvider();
  }

  if (['groq', 'gemini', 'openrouter', 'openai'].includes(provider)) {
    return new RealAiProvider({
      baseUrl: env.AI_BASE_URL || '',
      apiKey: env.AI_API_KEY || '',
      model: env.AI_MODEL || '',
      timeoutMs: env.AI_TIMEOUT_MS
        ? Number.parseInt(env.AI_TIMEOUT_MS, 10)
        : 15000,
    });
  }

  throw new Error('AI_PROVIDER_CONFIGURATION_ERROR');
}

export async function moderateStory(
  input: AiModerationInput,
  provider?: AiProvider
): Promise<AiModerationOutcome> {
  let rawResponse: string;

  try {
    rawResponse = await (provider ?? createAiProvider()).moderate(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AI_TIMEOUT' || message === 'MOCK_TIMEOUT') {
      return { success: false, result: null, code: 'timeout' };
    }
    if (message === 'AI_NETWORK_ERROR') {
      return { success: false, result: null, code: 'network' };
    }
    if (message === 'AI_PROVIDER_ERROR') {
      return { success: false, result: null, code: 'provider_error' };
    }
    return { success: false, result: null, code: 'provider_error' };
}

  const parsed = parseAiModerationResponse(rawResponse);
  if (!parsed.success) {
    return { success: false, result: null, code: 'invalid_response' };
  }

  return { success: true, result: parsed.result };
}
