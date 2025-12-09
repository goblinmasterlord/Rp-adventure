/**
 * Game session management.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  NarrativeState,
  Phase,
  TruthSeed,
  CharacterProfile,
  WorldContext,
  createNarrativeState,
} from './narrative.js';
import {
  GameMechanics,
  PlayerStatus,
  createGameMechanics,
  getHealthDescription,
  getTensionDescription,
} from './mechanics.js';

/**
 * Overall session state.
 */
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  ABANDONED = 'ABANDONED',
}

/**
 * Complete game state for a single playthrough.
 */
export interface GameSession {
  sessionId: string;
  playerName: string;
  status: SessionStatus;
  turnCount: number;
  createdAt: Date;
  updatedAt: Date;
  mechanics: GameMechanics;
  narrative: NarrativeState | null;
  // Context setup
  character?: CharacterProfile;
  world?: WorldContext;
  turnsSinceSummary: number;
}

/**
 * Create a new game session.
 */
export function createGameSession(playerName: string = 'Wanderer'): GameSession {
  return {
    sessionId: uuidv4(),
    playerName,
    status: SessionStatus.ACTIVE,
    turnCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    mechanics: createGameMechanics(),
    narrative: null,
    turnsSinceSummary: 0,
  };
}

/**
 * Initialize narrative with a truth seed.
 */
export function initializeNarrative(
  session: GameSession,
  truthSeed: TruthSeed,
  character?: CharacterProfile,
  world?: WorldContext
): void {
  session.narrative = createNarrativeState(truthSeed);
  if (character) session.character = character;
  if (world) session.world = world;
}

/**
 * Check if game can continue.
 */
export function isPlayable(session: GameSession): boolean {
  return session.status === SessionStatus.ACTIVE;
}

/**
 * Increment turn counter and check triggers.
 */
export function advanceTurn(session: GameSession): void {
  session.turnCount++;
  session.turnsSinceSummary++;
  session.updatedAt = new Date();
}

/**
 * Check if summarizer should run (every 5 turns).
 */
export function needsSummary(session: GameSession): boolean {
  return session.turnsSinceSummary >= 5;
}

/**
 * Reset summary counter after summarizer runs.
 */
export function markSummarized(session: GameSession): void {
  session.turnsSinceSummary = 0;
}

/**
 * Evaluate if phase should advance based on gates.
 */
export function checkPhaseTransition(session: GameSession): boolean {
  if (!session.narrative) return false;

  const currentPhase = session.narrative.phase;

  // Phase 1 -> 2: Complete turn 5
  if (currentPhase === Phase.HOOK && session.turnCount >= 5) {
    session.narrative.phase = Phase.INVESTIGATION;
    return true;
  }

  // Phase 2 -> 3: Turn >= 15 AND clues >= 3
  if (
    currentPhase === Phase.INVESTIGATION &&
    session.turnCount >= 15 &&
    session.mechanics.cluesCollected >= 3
  ) {
    session.narrative.phase = Phase.CLIMAX;
    return true;
  }

  return false;
}

/**
 * Mark game as complete.
 */
export function endGame(session: GameSession, victory: boolean = false): void {
  if (victory) {
    session.status = SessionStatus.VICTORY;
    session.mechanics.playerStatus = PlayerStatus.VICTORIOUS;
  } else {
    session.status = SessionStatus.GAME_OVER;
    session.mechanics.playerStatus = PlayerStatus.DEAD;
  }
  session.updatedAt = new Date();
}

/**
 * State summary for UI display.
 */
export interface GameStateSummary {
  turn: number;
  health: number;
  healthDesc: string;
  phase: string;
  clues: number;
  clueHints: number;
  inventory: string[];
  status: string;
  tension: number;
  tensionDesc: string;
  currentObjective: string;
  phaseHint?: string;
}

/**
 * Get current state for UI display.
 */
export function getStateSummary(session: GameSession): GameStateSummary {
  const phaseName = session.narrative
    ? Phase[session.narrative.phase]
    : 'UNKNOWN';

  const summary: GameStateSummary = {
    turn: session.turnCount,
    health: session.mechanics.health,
    healthDesc: getHealthDescription(session.mechanics.health),
    phase: phaseName,
    clues: session.mechanics.cluesCollected,
    clueHints: session.mechanics.clueHints,
    inventory: session.mechanics.inventory,
    status: session.status,
    tension: session.mechanics.tension,
    tensionDesc: getTensionDescription(session.mechanics.tension),
    currentObjective: session.mechanics.currentObjective,
  };

  // Add phase-specific hints
  if (session.narrative) {
    switch (session.narrative.phase) {
      case Phase.HOOK:
        summary.phaseHint = 'The mystery unfolds...';
        break;
      case Phase.INVESTIGATION:
        summary.phaseHint = `Clues: ${session.mechanics.cluesCollected}/3 needed`;
        break;
      case Phase.CLIMAX:
        summary.phaseHint = 'The final confrontation awaits';
        break;
    }
  }

  return summary;
}
