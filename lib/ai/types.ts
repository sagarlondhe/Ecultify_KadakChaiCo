import type { AiModerationOutput } from './schema.ts';

export interface AiModerationInput {
  name: string;
  city: string;
  story: string;
  consent: boolean;
}

export interface AiProvider {
  moderate(input: AiModerationInput): Promise<string>;
}

export interface AiModerationSuccess {
  success: true;
  result: AiModerationOutput;
}

export interface AiModerationFailure {
  success: false;
  result: null;
  code: 'timeout' | 'network' | 'provider_error' | 'invalid_response';
}

export type AiModerationOutcome =
  | AiModerationSuccess
  | AiModerationFailure;