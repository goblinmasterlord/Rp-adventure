# CLAUDE.md - Infinite Adventure Project Context

 

> Read this first. This is a procedural text adventure game using Gemini AI with the Vercel AI SDK.

 

## Quick Start

 

```bash

npm install

echo "GOOGLE_GENERATIVE_AI_API_KEY=your_key" > .env

npm run dev  # http://localhost:5000

```

 

## Core Architecture: The Rolling Context System

 

**This is the most important concept.** We cannot send full chat history to the LLM (token limits). Instead, we construct a synthetic prompt every turn from 4 blocks:

 

```

┌─────────────────────────────────────────────────────────┐

│ 1. THE BIBLE (Static)                                   │

│    Hidden "Truth Seed" - villain, motive, plot, twist   │

│    Never revealed to player, guides all AI responses    │

├─────────────────────────────────────────────────────────┤

│ 2. LONG-TERM MEMORY (Dynamic)                           │

│    Compressed summary of everything before last 2 turns │

│    Updated by Summarizer every 5 turns                  │

├─────────────────────────────────────────────────────────┤

│ 3. WORKING MEMORY (Dynamic)                             │

│    Raw text of last 2 exchanges only                    │

│    Kept in shortTermBuffer (max 4 entries)              │

├─────────────────────────────────────────────────────────┤

│ 4. PHASE DIRECTIVE (Dynamic)                            │

│    Rules for current story phase (Hook/Investigation/   │

│    Climax) - controls pacing and danger level           │

└─────────────────────────────────────────────────────────┘

```

 

**Prompt assembly**: `src/prompts/builder.ts` → `buildGamePrompt()`

 

## The Three Phases

 

| Phase | Turns | Gate to Exit | Behavior |

|-------|-------|--------------|----------|

| **HOOK** | 1-5 | Turn 5 | High survivability, establish mystery |

| **INVESTIGATION** | 6-20 | Turn ≥15 AND clues ≥3 | "Fog of War" blocks early solutions, moderate danger |

| **CLIMAX** | 20+ | Victory or death | All paths lead to confrontation, high danger |

 

**Phase logic**: `src/models/session.ts` → `checkPhaseTransition()`

 

## Consequence Engine

 

Every AI response MUST return structured JSON via Zod schema:

 

```typescript

// src/models/response.ts

{

  narrative_text: string,      // Story text shown to player

  health_change: -3 to +1,     // Damage or healing

  player_status: "ALIVE" | "DEAD" | "VICTORIOUS",

  clue_found: boolean,

  clue_description: string | null,

  item_gained: string | null,

  item_lost: string | null,

  phase_transition: boolean,

  atmospheric_hint: string | null

}

```

 

**Key rule**: Stupid actions = death. Jumping off cliff returns `player_status: "DEAD"`.

 

## Tech Stack

 

- **Runtime**: Node.js + TypeScript + Express

- **AI**: Vercel AI SDK (`ai` + `@ai-sdk/google`)

- **Validation**: Zod schemas for structured outputs

- **Models**: Gemini 1.5 Pro (narrative), Gemini 1.5 Flash (summaries)

 

## Key Files

 

| File | Purpose |

|------|---------|

| `src/core/gemini.ts` | Vercel AI SDK integration, `generateObject()` calls |

| `src/core/engine.ts` | Main game loop orchestrator |

| `src/core/summarizer.ts` | Memory compression every 5 turns |

| `src/prompts/builder.ts` | Rolling Context prompt assembly |

| `src/prompts/templates.ts` | All AI prompts (narrator, phases, truth seed generator) |

| `src/models/response.ts` | Zod schema for AI responses |

| `src/models/session.ts` | Game session state management |

| `src/api/routes.ts` | Express API endpoints |

 

## Vercel AI SDK Usage

 

```typescript

// Structured output (narrative, truth seed)

const { object } = await generateObject({

  model: google('gemini-1.5-pro'),

  schema: GeminiResponseSchema,  // Zod schema

  system: systemPrompt,

  prompt: userPrompt,

});

 

// Plain text (summarization)

const { text } = await generateText({

  model: google('gemini-1.5-flash'),

  prompt,

});

```

 

## API Endpoints

 

| Method | Endpoint | Body | Purpose |

|--------|----------|------|---------|

| POST | `/api/new-game` | `{ player_name }` | Start game, returns session_id + opening |

| POST | `/api/action` | `{ session_id, action }` | Process player turn |

| GET | `/api/state/:sessionId` | - | Get current state |

 

## Session State Structure

 

```typescript

interface GameSession {

  sessionId: string;

  playerName: string;

  status: 'ACTIVE' | 'GAME_OVER' | 'VICTORY';

  turnCount: number;

  mechanics: {

    health: 0-3,

    inventory: string[],

    cluesCollected: number,

    playerStatus: 'ALIVE' | 'DEAD' | 'VICTORIOUS'

  };

  narrative: {

    truthSeed: { villain, motive, plot, twist, location, weakness },

    longTermMemory: string,

    shortTermBuffer: Turn[],  // Max 4 entries

    phase: 1 | 2 | 3

  };

  turnsSinceSummary: number;  // Triggers summarizer at 5

}

```

 

## Important Design Decisions

 

1. **Anti-injection**: `src/prompts/builder.ts` → `AntiInjectionFilter` blocks prompt manipulation attempts

2. **Quantum Ogre**: If player wanders somewhere irrelevant, AI moves something interesting there (no empty rooms)

3. **Fog of War**: In Phase 2, if player tries to confront villain early, AI invents obstacles

4. **Memory limit**: Long-term memory capped at 200 words, recursive compression if exceeded

 

## Prompt Templates Location

 

All in `src/prompts/templates.ts`:

- `TRUTH_SEED_GENERATOR` - Creates mystery at game start

- `LIBRARIAN_PROMPT` - Summarizer instructions

- `PHASE_DIRECTIVES[1|2|3]` - Phase-specific rules

- `NARRATOR_SYSTEM_PROMPT` - Core AI identity

- `OPENING_TEMPLATES` - Atmospheric game openings

 

## Common Tasks

 

**Add new phase rule**: Edit `PHASE_DIRECTIVES` in `src/prompts/templates.ts`

 

**Modify AI response schema**: Update Zod schema in `src/models/response.ts`, then update consequence handling in `src/core/engine.ts` → `applyConsequences()`

 

**Change summarization frequency**: Modify `turnsSinceSummary >= 5` check in `src/models/session.ts` → `needsSummary()`

 

**Add new API endpoint**: Add to `src/api/routes.ts`

 

## Frontend

 

Vanilla HTML/CSS/JS in `static/` and `templates/`. Dark fantasy Gothic aesthetic with:

- Health orbs (3 max)

- Phase indicator

- Clue counter

- Inventory panel

- Atmospheric effects (vignette, particles, fog)

 

## Environment Variables

 

| Variable | Required | Description |

|----------|----------|-------------|

| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key |

| `PORT` | No | Server port (default: 5000) |