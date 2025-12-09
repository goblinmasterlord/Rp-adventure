/**
 * Structured response schema for Gemini outputs.
 */

import { z } from 'zod';
import { PlayerStatus } from './mechanics.js';

/**
 * Investigation quality levels - how well did the player investigate?
 */
export const InvestigationQuality = z.enum([
  'NONE',        // Generic action, no real investigation
  'SHALLOW',     // Basic attempt, hints at something
  'THOROUGH',    // Specific action, partial revelation
  'BREAKTHROUGH' // Clever/specific, full clue revealed
]);

export type InvestigationQualityType = z.infer<typeof InvestigationQuality>;

/**
 * Clue depth levels - how much was revealed?
 */
export const ClueDepth = z.enum([
  'HINT',    // Something is here, not clear what
  'PARTIAL', // Part of the picture revealed
  'FULL'     // Complete clue discovered
]);

/**
 * Clue revelation object - replaces simple boolean.
 */
export const ClueRevelationSchema = z.object({
  found: z.boolean().describe('Whether any clue progress was made'),
  depth: ClueDepth.describe('How much of the clue was revealed'),
  description: z.string().describe('What the player discovered'),
  connects_to: z.string().nullable().describe('What this clue points toward next')
}).nullable();

export type ClueRevelation = z.infer<typeof ClueRevelationSchema>;

/**
 * World reaction types - how does the world respond?
 */
export const WorldReactionType = z.enum([
  'NONE',       // World unchanged
  'SUBTLE',     // Minor environmental shift
  'NOTICED',    // Someone/something noticed the player
  'ESCALATION'  // Significant consequence triggered
]);

/**
 * World reaction object - the world responds to player actions.
 */
export const WorldReactionSchema = z.object({
  type: WorldReactionType.describe('How significant is the world reaction'),
  description: z.string().nullable().describe('What changed in the world')
});

export type WorldReaction = z.infer<typeof WorldReactionSchema>;

/**
 * The Fate Check response schema.
 * Every Gemini response must conform to this structure.
 */
export const GeminiResponseSchema = z.object({
  // === NARRATIVE ===
  narrative_text: z.string().describe('The story text to display to the player'),

  // === PLAYER STATE ===
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

  // === INVESTIGATION SYSTEM ===
  investigation_quality: InvestigationQuality
    .default('NONE')
    .describe('How well did the player investigate? NONE=no real attempt, SHALLOW=basic, THOROUGH=specific, BREAKTHROUGH=clever'),

  clue_revelation: ClueRevelationSchema
    .default(null)
    .describe('Details about clue discovery, null if no investigation'),

  // === DIRECTION SYSTEM ===
  current_objective: z
    .string()
    .describe('The current goal/objective the player should pursue (1 short sentence)'),

  objective_progress: z
    .string()
    .nullable()
    .default(null)
    .describe('How this action moved toward the objective, null if no progress'),

  suggested_actions: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe('2-3 contextual action suggestions for what the player could do next'),

  // === WORLD REACTION SYSTEM ===
  world_reaction: WorldReactionSchema
    .default({ type: 'NONE', description: null })
    .describe('How the world responds to the player action'),

  tension_shift: z
    .number()
    .int()
    .min(-1)
    .max(1)
    .default(0)
    .describe('Story tension change: -1=calmer, 0=same, +1=more urgent'),

  // === INVENTORY ===
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

  // === PHASE ===
  phase_transition: z
    .boolean()
    .default(false)
    .describe('Whether to advance to next phase'),

  // === ATMOSPHERE ===
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
    investigation_quality: 'NONE',
    clue_revelation: null,
    current_objective: 'Explore your surroundings',
    objective_progress: null,
    suggested_actions: ['Look around carefully', 'Search for an exit'],
    world_reaction: { type: 'NONE', description: null },
    tension_shift: 0,
    item_gained: null,
    item_lost: null,
    phase_transition: false,
    atmospheric_hint: null,
    ...overrides,
  };
}
