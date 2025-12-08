/**
 * The Summarizer Worker - compresses narrative memory.
 */

import { GameSession, needsSummary, markSummarized } from '../models/session.js';
import { Turn } from '../models/narrative.js';
import { buildSummaryPrompt } from '../prompts/builder.js';
import { GeminiClient } from './gemini.js';

/**
 * Maximum words for long-term memory.
 */
const MAX_MEMORY_WORDS = 200;

/**
 * Handles memory compression every 5 turns.
 */
export class SummarizerWorker {
  constructor(private client: GeminiClient) {}

  /**
   * Check if summarization is needed.
   */
  shouldRun(session: GameSession): boolean {
    return needsSummary(session);
  }

  /**
   * Execute summarization and update session.
   */
  async run(session: GameSession): Promise<string> {
    if (!session.narrative) {
      return '';
    }

    const recentTurns = session.narrative.shortTermBuffer;
    if (recentTurns.length === 0) {
      return session.narrative.longTermMemory;
    }

    // Build summarization prompt
    const summaryPrompt = buildSummaryPrompt(
      session.narrative.longTermMemory,
      recentTurns
    );

    // Generate new summary
    let newMemory = await this.client.generateSummary(summaryPrompt);

    // Enforce word limit
    const words = newMemory.split(/\s+/);
    if (words.length > MAX_MEMORY_WORDS) {
      newMemory = await this.recursiveCompress(newMemory);
    }

    // Update session
    session.narrative.longTermMemory = newMemory;
    markSummarized(session);

    return newMemory;
  }

  /**
   * Emergency compression when memory exceeds limits.
   */
  private async recursiveCompress(memory: string): Promise<string> {
    const compressPrompt = `URGENT: The following summary is too long. Compress it to under 150 words while keeping ALL [CLUE] markers and critical facts.

CURRENT SUMMARY:
${memory}

Respond with ONLY the compressed summary.`;

    let compressed = await this.client.generateSummary(compressPrompt);

    // Hard truncation as last resort
    const words = compressed.split(/\s+/);
    if (words.length > MAX_MEMORY_WORDS) {
      compressed = words.slice(0, MAX_MEMORY_WORDS).join(' ') + '...';
    }

    return compressed;
  }

  /**
   * Force an immediate summary regardless of turn count.
   */
  async forceCheckpoint(session: GameSession): Promise<string> {
    return this.run(session);
  }
}
