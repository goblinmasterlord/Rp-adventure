/**
 * Prompt assembly for the Rolling Context system.
 */

import { GameSession, getStateSummary } from '../models/session.js';
import { Phase, getWorkingMemoryText, Turn } from '../models/narrative.js';
import {
  NARRATOR_SYSTEM_PROMPT,
  PHASE_DIRECTIVES,
  LIBRARIAN_PROMPT,
} from './templates.js';

/**
 * Build the complete game prompt for a turn.
 */
export function buildGamePrompt(
  session: GameSession,
  playerInput: string
): { system: string; user: string } {
  const parts: string[] = [];

  // Block 1: The Bible (truth seed)
  parts.push(buildBibleBlock(session));

  // Block 2: Current state summary
  parts.push(buildStateBlock(session));

  // Block 3: Long-term memory
  const memoryBlock = buildMemoryBlock(session);
  if (memoryBlock) parts.push(memoryBlock);

  // Block 4: Working memory (last 2 turns)
  const workingBlock = buildWorkingMemoryBlock(session);
  if (workingBlock) parts.push(workingBlock);

  // Block 5: Phase directive
  parts.push(buildPhaseDirective(session));

  // Block 6: Player input
  parts.push(buildInputBlock(playerInput));

  return {
    system: NARRATOR_SYSTEM_PROMPT,
    user: parts.filter(Boolean).join('\n\n'),
  };
}

function buildBibleBlock(session: GameSession): string {
  if (!session.narrative) return '';

  const ts = session.narrative.truthSeed;
  const world = session.world;
  const char = session.character;

  let context = '';
  if (world) {
    context += `=== WORLD CONTEXT ===
THEME: ${world.theme}
TONE: ${world.tone}
SETTING: ${world.setting}
=== END WORLD ===\n\n`;
  }

  if (char) {
    context += `=== CHARACTER PROFILE ===
NAME: ${char.name}
CLASS: ${char.class}
BACKGROUND: ${char.background}
TRAITS: ${char.traits.join(', ')}
APPEARANCE: ${char.appearance}
=== END CHARACTER ===\n\n`;
  }

  return `${context}=== THE HIDDEN TRUTH (Never reveal directly) ===
VILLAIN: ${ts.villain}
MOTIVE: ${ts.motive}
PLOT: ${ts.plot}
TWIST: ${ts.twist}
FINAL LOCATION: ${ts.location}
WEAKNESS: ${ts.weakness}
=== END HIDDEN TRUTH ===`;
}

function buildStateBlock(session: GameSession): string {
  const state = getStateSummary(session);
  const inventory = state.inventory.length > 0 ? state.inventory.join(', ') : 'nothing';

  return `=== CURRENT STATE ===
Turn: ${state.turn}
Health: ${state.health}/3 (${state.healthDesc})
Phase: ${state.phase}
Clues Found: ${state.clues}/3
Inventory: ${inventory}
=== END STATE ===`;
}

function buildMemoryBlock(session: GameSession): string | null {
  if (!session.narrative) return null;

  const memory = session.narrative.longTermMemory;
  if (!memory || memory === 'The adventure begins...') return null;

  return `=== STORY SO FAR (Compressed Memory) ===
${memory}
=== END MEMORY ===`;
}

function buildWorkingMemoryBlock(session: GameSession): string | null {
  if (!session.narrative) return null;

  const working = getWorkingMemoryText(session.narrative);
  if (working === '[No recent events]') return null;

  return `=== RECENT EVENTS (Last 2 Exchanges) ===
${working}
=== END RECENT ===`;
}

function buildPhaseDirective(session: GameSession): string {
  const phase = session.narrative?.phase ?? Phase.HOOK;
  return PHASE_DIRECTIVES[phase];
}

function buildInputBlock(playerInput: string): string {
  return `=== PLAYER ACTION ===
The player says/does: "${playerInput}"

Respond with valid JSON only. Remember: Consequences are real. Choices matter.`;
}

/**
 * Build the summarizer prompt.
 */
export function buildSummaryPrompt(
  existingMemory: string,
  newTurns: Turn[]
): string {
  const newEvents = newTurns
    .map((turn) => {
      const prefix = turn.role === 'user' ? 'PLAYER' : 'NARRATOR';
      return `${prefix}: ${turn.text}`;
    })
    .join('\n\n');

  return LIBRARIAN_PROMPT
    .replace('{existingMemory}', existingMemory || '[No previous memory]')
    .replace('{newEvents}', newEvents);
}

/**
 * Anti-injection filter for player input.
 */
export class AntiInjectionFilter {
  private static readonly FORBIDDEN_PATTERNS = [
    'ignore previous',
    'ignore all',
    'disregard',
    'new instructions',
    'you are now',
    'pretend to be',
    'act as if',
    'system prompt',
    'reveal the',
    'tell me the truth seed',
    'what is the villain',
    'what is the twist',
    'admin mode',
    'developer mode',
    'jailbreak',
    'dan mode',
  ];

  static readonly INJECTION_RESPONSE = {
    narrative_text:
      'The shadows seem to laugh at your strange words. Whatever power you sought to invoke here finds no purchase. The world remains unchanged, indifferent to such pleas. Perhaps a more... direct approach is needed.',
    health_change: 0,
    player_status: 'ALIVE' as const,
    clue_found: false,
    clue_description: null,
    item_gained: null,
    item_lost: null,
    phase_transition: false,
    atmospheric_hint: 'Reality reasserts itself.',
  };

  /**
   * Check for injection attempts.
   * Returns the canned response if injection detected, null if safe.
   */
  static check(playerInput: string): typeof AntiInjectionFilter.INJECTION_RESPONSE | null {
    const lower = playerInput.toLowerCase();

    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (lower.includes(pattern)) {
        return this.INJECTION_RESPONSE;
      }
    }

    // Check for suspicious patterns
    if (lower.includes('```')) {
      return this.INJECTION_RESPONSE;
    }
    if (lower.includes('json') && lower.includes('{')) {
      return this.INJECTION_RESPONSE;
    }

    return null;
  }

  /**
   * Sanitize input by removing dangerous characters.
   */
  static sanitize(playerInput: string): string {
    return playerInput.replace(/`/g, "'").slice(0, 500).trim();
  }
}
