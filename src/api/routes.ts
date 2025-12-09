/**
 * Express API routes for the Infinite Adventure.
 */

import { Router, Request, Response } from 'express';
import { GameSession } from '../models/session.js';
import { getGameEngine } from '../core/engine.js';

const router = Router();

// In-memory session storage (use Redis/DB for production)
const gameSessions = new Map<string, GameSession>();

/**
 * POST /api/setup
 * Generate options for game start.
 */
router.post('/setup', async (req: Request, res: Response) => {
  const { player_name } = req.body ?? {};

  if (!player_name) {
    res.status(400).json({ success: false, error: 'Player name required' });
    return;
  }

  try {
    const engine = getGameEngine();
    const options = await engine.generateOptions(player_name);
    res.json({ success: true, options });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate options' });
  }
});

/**
 * POST /api/new-game
 * Start a new game session.
 */
router.post('/new-game', async (req: Request, res: Response) => {
  // If character/world provided, use selection flow.
  // Else fallback to auto-generated flow.
  const { player_name = 'Wanderer', character, world } = req.body ?? {};

  try {
    const engine = getGameEngine();
    let result;

    if (character && world) {
      result = await engine.newGameFromSelection(player_name, character, world);
    } else {
      result = await engine.newGame(player_name);
    }

    const { session, opening } = result;

    gameSessions.set(session.sessionId, session);

    // Generate initial suggested actions based on opening
    // IMPORTANT: Do not use lazy/generic actions like "search for clues"
    const initialSuggestions = [
      'Examine your surroundings',
      'Check your pockets',
      'Listen for sounds'
    ];

    res.json({
      success: true,
      session_id: session.sessionId,
      narrative: opening,
      state: engine.getGameState(session),
      suggested_actions: initialSuggestions,
    });
  } catch (error) {
    console.error('New game error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start game',
    });
  }
});

/**
 * POST /api/action
 * Process a player action.
 */
router.post('/action', async (req: Request, res: Response) => {
  const { session_id, action } = req.body ?? {};

  if (!session_id || !gameSessions.has(session_id)) {
    res.status(400).json({
      success: false,
      error: 'Invalid or expired session',
    });
    return;
  }

  if (!action || typeof action !== 'string' || !action.trim()) {
    res.status(400).json({
      success: false,
      error: 'No action provided',
    });
    return;
  }

  const session = gameSessions.get(session_id)!;

  try {
    const engine = getGameEngine();
    const { response, gameEnded } = await engine.processTurn(session, action.trim());

    res.json({
      success: true,
      narrative: response.narrative_text,
      state: engine.getGameState(session),
      game_ended: gameEnded,
      // New direction system
      suggested_actions: response.suggested_actions,
      objective_progress: response.objective_progress,
      // New clue system
      investigation_quality: response.investigation_quality,
      clue_revelation: response.clue_revelation,
      // World reaction system
      world_reaction: response.world_reaction,
      // Inventory
      item_gained: response.item_gained,
      item_lost: response.item_lost,
      // Atmosphere
      atmospheric_hint: response.atmospheric_hint,
    });
  } catch (error) {
    console.error('Action error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Action failed',
    });
  }
});

/**
 * GET /api/state/:sessionId
 * Get current game state.
 */
router.get('/state/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!gameSessions.has(sessionId)) {
    res.status(404).json({
      success: false,
      error: 'Session not found',
    });
    return;
  }

  const session = gameSessions.get(sessionId)!;
  const engine = getGameEngine();

  res.json({
    success: true,
    state: engine.getGameState(session),
  });
});

/**
 * DELETE /api/session/:sessionId
 * End and remove a session.
 */
router.delete('/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (gameSessions.has(sessionId)) {
    gameSessions.delete(sessionId);
  }

  res.json({ success: true });
});

export default router;
