/**
 * The Game Engine - orchestrates the entire game loop.
 */

import {
  GameSession,
  createGameSession,
  initializeNarrative,
  isPlayable,
  advanceTurn,
  checkPhaseTransition,
  endGame,
  getStateSummary,
  GameStateSummary,
} from '../models/session.js';
import { addTurn, Phase, SetupOptions, CharacterProfile, WorldContext } from '../models/narrative.js';
import {
  PlayerStatus,
  applyDamage,
  heal,
  addItem,
  removeItem,
  addClue,
} from '../models/mechanics.js';
import { GeminiResponse, createDefaultResponse } from '../models/response.js';
import { buildGamePrompt, AntiInjectionFilter } from '../prompts/builder.js';
import { getRandomOpening } from '../prompts/templates.js';
import { GeminiClient, getGeminiClient } from './gemini.js';
import { SummarizerWorker } from './summarizer.js';

/**
 * Result of processing a turn.
 */
export interface TurnResult {
  response: GeminiResponse;
  gameEnded: boolean;
}

/**
 * Core orchestrator for the Infinite Adventure.
 */
export class GameEngine {
  private client: GeminiClient;
  private summarizer: SummarizerWorker;

  constructor(client?: GeminiClient) {
    this.client = client ?? getGeminiClient();
    this.summarizer = new SummarizerWorker(this.client);
  }

  /**
   * Initialize a new game session.
   */
  async newGame(playerName: string = 'Wanderer'): Promise<{
    session: GameSession;
    opening: string;
  }> {
    // Create session
    const session = createGameSession(playerName);

    // Generate comprehensive game foundation (Pro model)
    const gameStart = await this.client.generateGameStart(playerName);

    // Initialize narrative state with all generated context
    initializeNarrative(
      session,
      gameStart.truthSeed,
      gameStart.character,
      gameStart.world
    );

    const opening = gameStart.openingNarrative;

    // Store opening as first model turn
    if (session.narrative) {
      addTurn(session.narrative, 'model', opening, 0);
    }

    return { session, opening };
  }

  /**
   * Generate setup options (3 characters, 3 worlds).
   */
  async generateOptions(playerName: string): Promise<SetupOptions> {
    return this.client.generateSetupOptions(playerName);
  }

  /**
   * Start game from specific character/world selection.
   */
  async newGameFromSelection(
    playerName: string,
    character: CharacterProfile,
    world: WorldContext
  ): Promise<{
    session: GameSession;
    opening: string;
  }> {
    const session = createGameSession(playerName);

    // Generate mystery/opening based on selection
    const gameStart = await this.client.generateGameStartFromSelection(
      playerName,
      character,
      world
    );

    initializeNarrative(
      session,
      gameStart.truthSeed,
      character,
      world
    );

    const opening = gameStart.openingNarrative;

    if (session.narrative) {
      addTurn(session.narrative, 'model', opening, 0);
    }

    return { session, opening };
  }

  /**
   * Process a single player turn.
   */
  async processTurn(
    session: GameSession,
    playerInput: string
  ): Promise<TurnResult> {
    // Check if game is playable
    if (!isPlayable(session)) {
      return {
        response: createDefaultResponse({
          narrative_text: 'The story has ended. There are no more paths to walk.',
          player_status: session.mechanics.playerStatus,
        }),
        gameEnded: true,
      };
    }

    // Anti-injection check
    const injectionResponse = AntiInjectionFilter.check(playerInput);
    if (injectionResponse) {
      return {
        response: injectionResponse,
        gameEnded: false,
      };
    }

    // Sanitize input
    const cleanInput = AntiInjectionFilter.sanitize(playerInput);

    // Build the Rolling Context prompt
    const { system, user } = buildGamePrompt(session, cleanInput);

    // Generate narrative response
    const response = await this.client.generateNarrative(system, user);

    // Apply consequences
    const gameEnded = this.applyConsequences(session, response, cleanInput);

    // Run maintenance tasks if game continues
    if (!gameEnded) {
      await this.runMaintenance(session);
    }

    return { response, gameEnded };
  }

  /**
   * Apply the Consequence Engine results to game state.
   */
  private applyConsequences(
    session: GameSession,
    response: GeminiResponse,
    playerInput: string
  ): boolean {
    const { mechanics, narrative } = session;

    // Advance turn counter
    advanceTurn(session);

    // Store the exchange in working memory
    if (narrative) {
      addTurn(narrative, 'user', playerInput, session.turnCount);
      addTurn(narrative, 'model', response.narrative_text, session.turnCount);
    }

    // Apply health changes
    if (response.health_change !== 0) {
      if (response.health_change < 0) {
        applyDamage(mechanics, Math.abs(response.health_change));
      } else {
        heal(mechanics, response.health_change);
      }
    }

    // Handle player death
    if (response.player_status === 'DEAD') {
      endGame(session, false);
      return true;
    }

    // Handle victory
    if (response.player_status === 'VICTORIOUS') {
      endGame(session, true);
      return true;
    }

    // Handle clues
    if (response.clue_found) {
      addClue(mechanics);
    }

    // Handle inventory
    if (response.item_gained) {
      addItem(mechanics, response.item_gained);
    }
    if (response.item_lost) {
      removeItem(mechanics, response.item_lost);
    }

    // Check phase transitions
    if (response.phase_transition || checkPhaseTransition(session)) {
      this.handlePhaseTransition(session);
    }

    return false;
  }

  /**
   * Handle narrative phase changes.
   */
  private handlePhaseTransition(session: GameSession): void {
    if (!session.narrative) return;

    const phaseNames: Record<Phase, string> = {
      [Phase.HOOK]: 'The Hook',
      [Phase.INVESTIGATION]: 'The Investigation',
      [Phase.CLIMAX]: 'The Climax',
    };

    console.log(
      `[Phase Transition] Entering: ${phaseNames[session.narrative.phase]}`
    );
  }

  /**
   * Run background maintenance tasks.
   */
  private async runMaintenance(session: GameSession): Promise<void> {
    // Summarization check
    if (this.summarizer.shouldRun(session)) {
      await this.summarizer.run(session);
      console.log(`[Summarizer] Memory compressed at turn ${session.turnCount}`);
    }
  }

  /**
   * Get current state for UI display.
   */
  getGameState(session: GameSession): GameStateSummary {
    return getStateSummary(session);
  }
}

/**
 * Singleton engine instance.
 */
let engineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}
