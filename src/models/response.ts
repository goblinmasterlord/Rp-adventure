/**
 * Structured response schema for Gemini outputs.
 */

import { z } from 'zod';
import { PlayerStatus } from './mechanics.js';

/**
 * The Fate Check response schema.
 * Every Gemini response must conform to this structure.
 */
export const GeminiResponseSchema = z.object({
  narrative_text: z.string().describe('The story text to display to the player'),

  health_change: z
    .number()
    .int()
    .min(-3)
    .max(1)
    .default(0)
    .describe('Health delta: negative=damage, 0=safe, +1=heal'),

  player_status: z
    .enum(['ALIVE', 'DEAD', 'VICTORIOUS'])
    .default('ALIVE')
    .describe('ALIVE, DEAD, or VICTORIOUS'),

  clue_found: z.boolean().default(false).describe('Whether this turn reveals a clue'),

  clue_description: z
    .string()
    .nullable()
    .default(null)
    .describe('Description of clue if found'),

  item_gained: z
    .string()
    .nullable()
    .default(null)
    .describe('New item acquired this turn'),

  item_lost: z
    .string()
    .nullable()
    .default(null)
    .describe('Item removed from inventory'),

  phase_transition: z
    .boolean()
    .default(false)
    .describe('Whether to advance to next phase'),

  atmospheric_hint: z
    .string()
    .nullable()
    .default(null)
    .describe('Optional flavor detail for immersion'),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

/**
 * Create a default/fallback response.
 */
export function createDefaultResponse(overrides: Partial<GeminiResponse> = {}): GeminiResponse {
  return {
    narrative_text:
      'The moment stretches, uncertain. Reality seems to hesitate, as if deciding what comes next.',
    health_change: 0,
    player_status: 'ALIVE',
    clue_found: false,
    clue_description: null,
    item_gained: null,
    item_lost: null,
    phase_transition: false,
    atmospheric_hint: null,
    ...overrides,
  };
}
