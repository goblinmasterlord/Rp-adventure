/**
 * Gemini AI integration using Vercel AI SDK.
 */

import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { TruthSeed, TruthSeedSchema } from '../models/narrative.js';
import { GeminiResponse, GeminiResponseSchema, createDefaultResponse } from '../models/response.js';
import { TRUTH_SEED_GENERATOR } from '../prompts/templates.js';

/**
 * Fallback truth seed when generation fails.
 */
const FALLBACK_TRUTH_SEED: TruthSeed = {
  villain: 'The Hollow Bishop - a priest whose faith died with his daughter',
  motive: 'To resurrect his child by sacrificing the souls of an entire congregation',
  plot: 'Conducting a ritual during the Feast of Shadows that will drain the life from all who attend',
  twist: "The player's recurring nightmares are memories of being the first failed vessel for the resurrection",
  location: 'The cathedral\'s hidden ossuary, beneath the altar of false saints',
  weakness: "Speaking the daughter's true name breaks the father's hold on her trapped spirit",
};

/**
 * GeminiClient handles all AI interactions via Vercel AI SDK.
 */
export class GeminiClient {
  private model;
  private fastModel;

  constructor() {
    // Use Gemini Pro for main narrative (better reasoning)
    this.model = google('gemini-1.5-pro');
    // Use Gemini Flash for summarization (faster, cheaper)
    this.fastModel = google('gemini-1.5-flash');
  }

  /**
   * Generate the mystery foundation for a new game.
   */
  async generateTruthSeed(): Promise<TruthSeed> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: TruthSeedSchema,
        prompt: TRUTH_SEED_GENERATOR,
        temperature: 0.9,
      });

      return object;
    } catch (error) {
      console.error('Truth seed generation failed:', error);
      return FALLBACK_TRUTH_SEED;
    }
  }

  /**
   * Generate a narrative response with the Consequence Engine.
   */
  async generateNarrative(
    systemPrompt: string,
    userPrompt: string
  ): Promise<GeminiResponse> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: GeminiResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.8,
      });

      return object;
    } catch (error) {
      console.error('Narrative generation failed:', error);
      return createDefaultResponse({
        narrative_text:
          'Shadows flicker at the edge of perception. Something shifts in the darkness, but the moment passes before you can understand it.',
        atmospheric_hint: 'The world holds its breath.',
      });
    }
  }

  /**
   * Generate compressed memory summary.
   */
  async generateSummary(prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.fastModel,
        prompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      return text.trim();
    } catch (error) {
      console.error('Summary generation failed:', error);
      return '[Memory fragmented - events unclear]';
    }
  }
}

/**
 * Singleton instance.
 */
let clientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!clientInstance) {
    clientInstance = new GeminiClient();
  }
  return clientInstance;
}
