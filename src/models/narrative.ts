/**
 * Narrative data structures for the Rolling Context system.
 */

import { z } from 'zod';

/**
 * Story phases controlling pacing and stakes.
 */
export enum Phase {
  HOOK = 1,          // Turns 1-5: High survivability, establish mystery
  INVESTIGATION = 2, // Turns 6-20: Fog of War, clue gathering
  CLIMAX = 3,        // Turn 20+: Forced confrontation, max danger
}

/**
 * The Bible - immutable core truth of this adventure.
 * Never revealed to player, but guides every AI response.
 */
export const TruthSeedSchema = z.object({
  villain: z.string().describe('The antagonist and their role'),
  motive: z.string().describe('Why the villain does what they do'),
  plot: z.string().describe("The villain's scheme/plan"),
  twist: z.string().describe('The hidden revelation that changes everything'),
  location: z.string().describe('Where the final confrontation occurs'),
  weakness: z.string().describe('How the villain can be defeated'),
});

export type TruthSeed = z.infer<typeof TruthSeedSchema>;

/**
 * Character profile generated at game start.
 */
export const CharacterProfileSchema = z.object({
  name: z.string().describe('The character name'),
  class: z.string().describe('Character archetypal class (e.g. Occultist, Grave Robber)'),
  background: z.string().describe('Brief backstory explaining why they are here'),
  traits: z.array(z.string()).describe('3-5 key personality traits'),
  appearance: z.string().describe('Visual description'),
});

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

/**
 * World context setting the tone.
 */
export const WorldContextSchema = z.object({
  theme: z.string().describe('Core thematic elements (e.g. Cosmic Horror)'),
  tone: z.string().describe('Atmospheric descriptors'),
  setting: z.string().describe('The immediate physical setting description'),
});

export type WorldContext = z.infer<typeof WorldContextSchema>;

/**
 * Options generated for interactive setup.
 */
export const SetupOptionsSchema = z.object({
  characters: z.array(CharacterProfileSchema).describe('3 distinct character options'),
  worlds: z.array(WorldContextSchema).describe('3 distinct world settings'),
});

export type SetupOptions = z.infer<typeof SetupOptionsSchema>;

/**
 * A single exchange in the conversation.
 */
export interface Turn {
  role: 'user' | 'model';
  text: string;
  turnNumber: number;
}

/**
 * Dynamic narrative memory for the Rolling Context system.
 */
export interface NarrativeState {
  // The Bible - static, set at game start
  truthSeed: TruthSeed;

  // Long-term memory - compressed summary, updated every 5 turns
  longTermMemory: string;

  // Working memory - raw text of last 2 turns (4 entries: 2 user + 2 model)
  shortTermBuffer: Turn[];

  // Current phase
  phase: Phase;
}

/**
 * Create initial narrative state with a truth seed.
 */
export function createNarrativeState(truthSeed: TruthSeed): NarrativeState {
  return {
    truthSeed,
    longTermMemory: 'The adventure begins...',
    shortTermBuffer: [],
    phase: Phase.HOOK,
  };
}

/**
 * Add a turn to working memory, maintaining max 4 entries.
 */
export function addTurn(
  state: NarrativeState,
  role: 'user' | 'model',
  text: string,
  turnNumber: number
): void {
  state.shortTermBuffer.push({ role, text, turnNumber });
  // Keep only last 4 turns (2 complete exchanges)
  if (state.shortTermBuffer.length > 4) {
    state.shortTermBuffer = state.shortTermBuffer.slice(-4);
  }
}

/**
 * Format working memory for prompt injection.
 */
export function getWorkingMemoryText(state: NarrativeState): string {
  if (state.shortTermBuffer.length === 0) {
    return '[No recent events]';
  }

  return state.shortTermBuffer
    .map((turn) => {
      const prefix = turn.role === 'user' ? 'PLAYER' : 'NARRATOR';
      return `${prefix}: ${turn.text}`;
    })
    .join('\n\n');
}
