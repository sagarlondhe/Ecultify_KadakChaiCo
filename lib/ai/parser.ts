import { aiModerationSchema, type AiModerationOutput } from './schema.ts';

export type ParseAiModerationResult =
  | { success: true; result: AiModerationOutput }
  | { success: false };

export function parseAiModerationResponse(
  rawResponse: string
): ParseAiModerationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    return { success: false };
  }

  const validated = aiModerationSchema.safeParse(parsed);
  if (!validated.success) {
    return { success: false };
  }

  return { success: true, result: validated.data };
}