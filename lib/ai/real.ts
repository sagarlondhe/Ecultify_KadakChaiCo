import type { AiModerationInput, AiProvider } from './types.ts';

export interface RealAiProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

export class RealAiProvider implements AiProvider {
  private readonly config: RealAiProviderConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(
    config: RealAiProviderConfig,
    fetchImpl: typeof fetch = fetch
  ) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async moderate(input: AiModerationInput): Promise<string> {
    if (!this.config.baseUrl || !this.config.apiKey || !this.config.model) {
      throw new Error('AI_PROVIDER_CONFIGURATION_ERROR');
    }

    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 15000
    );

    try {
      const response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Moderate the chai campaign story. Respond with exactly one valid JSON object and no markdown. Required fields: decision (approved or rejected), reason (clear rejection reason or null), category (funny, nostalgic, wholesome, or other), caption (1 to 12 words). Approved decisions require reason null. Rejected decisions require a non-empty clear reason.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                name: input.name,
                city: input.city,
                story: input.story,
                consent: input.consent,
              }),
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error('AI_PROVIDER_ERROR');
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('AI_TIMEOUT');
        }
        throw new Error('AI_PROVIDER_ERROR');
      }

      const choice = (
        payload as {
          choices?: Array<{ message?: { content?: unknown } }>;
        }
      )?.choices?.[0]?.message?.content;

      if (typeof choice !== 'string') {
        throw new Error('AI_PROVIDER_ERROR');
      }

      return choice;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('AI_TIMEOUT');
        }
        if (
          error.message === 'AI_TIMEOUT' ||
          error.message === 'AI_PROVIDER_ERROR'
        ) {
          throw error;
        }
      }
      throw new Error('AI_NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  }
}
