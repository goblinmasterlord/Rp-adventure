# CLAUDE.md - Infinite Adventure Project Context

> Read this first. This is a procedural text adventure game using Gemini AI with the Vercel AI SDK.

## Quick Start

```bash
npm install
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_key" > .env
npm run dev  # http://localhost:5000
```

## Core Architecture: The Rolling Context System

**This is the most important concept.** We cannot send full chat history to the LLM (token limits). Instead, we construct a synthetic prompt every turn from these blocks:

```
┌─────────────────────────────────────────────────────────┐
│ 1. THE BIBLE (Static)                                   │
│    Hidden "Truth Seed" - villain, motive, plot, twist   │
│    + Character Profile + World Context                  │
│    Never revealed to player, guides all AI responses    │
├─────────────────────────────────────────────────────────┤
│ 2. CURRENT STATE (Dynamic)                              │
│    Turn count, health, phase, clues, inventory          │
├─────────────────────────────────────────────────────────┤
│ 3. LONG-TERM MEMORY (Dynamic)                           │
│    Compressed summary of everything before last 2 turns │
│    Updated by Summarizer every 5 turns                  │
├─────────────────────────────────────────────────────────┤
│ 4. WORKING MEMORY (Dynamic)                             │
│    Raw text of last 2 exchanges only                    │
│    Kept in shortTermBuffer (max 4 entries)              │
├─────────────────────────────────────────────────────────┤
│ 5. PHASE DIRECTIVE (Dynamic)                            │
│    Rules for current story phase (Hook/Investigation/   │
│    Climax) - controls pacing and danger level           │
├─────────────────────────────────────────────────────────┤
│ 6. PLAYER INPUT                                         │
│    The sanitized player action                          │
└─────────────────────────────────────────────────────────┘
```

**Prompt assembly**: `src/prompts/builder.ts` → `buildGamePrompt()`

## Game Setup Flow

The game supports two start modes:

### Interactive Setup (Recommended)
1. Player calls `/api/setup` with their name
2. AI generates 3 character options + 3 world options
3. Player selects one of each
4. Player calls `/api/new-game` with `character` and `world` in body
5. AI generates a mystery tailored to the selection

### Quick Start (Auto-generated)
1. Player calls `/api/new-game` with just `player_name`
2. AI generates character, world, and mystery all at once

## The Three Phases

| Phase | Turns | Gate to Exit | Behavior |
|-------|-------|--------------|----------|
| **HOOK** | 1-5 | Turn ≥ 5 | High survivability, establish mystery |
| **INVESTIGATION** | 6-20 | Turn ≥ 15 AND clues ≥ 3 | "Fog of War" blocks early solutions, moderate danger |
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
- **Models**:
  - Gemini 2.5 Pro (setup/character/world generation - high creativity)
  - Gemini 2.5 Flash (narrative + summaries - fast)

## Key Files

| File | Purpose |
|------|---------|
| `src/core/gemini.ts` | Vercel AI SDK integration, `generateObject()` calls |
| `src/core/engine.ts` | Main game loop orchestrator |
| `src/core/summarizer.ts` | Memory compression every 5 turns |
| `src/prompts/builder.ts` | Rolling Context prompt assembly |
| `src/prompts/templates.ts` | All AI prompts (narrator, phases, truth seed, setup) |
| `src/models/response.ts` | Zod schema for AI responses |
| `src/models/session.ts` | Game session state management |
| `src/models/narrative.ts` | TruthSeed, CharacterProfile, WorldContext schemas |
| `src/models/mechanics.ts` | Health, inventory, clues management |
| `src/api/routes.ts` | Express API endpoints |

## Vercel AI SDK Usage

```typescript
// Structured output (narrative, truth seed, setup)
const { object } = await generateObject({
  model: google('gemini-2.5-flash'),
  schema: GeminiResponseSchema,  // Zod schema
  system: systemPrompt,
  prompt: userPrompt,
});

// Plain text (summarization)
const { text } = await generateText({
  model: google('gemini-2.5-flash'),
  prompt,
});
```

## API Endpoints

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `/api/setup` | `{ player_name }` | Generate 3 character + 3 world options |
| POST | `/api/new-game` | `{ player_name, character?, world? }` | Start game (with optional selection) |
| POST | `/api/action` | `{ session_id, action }` | Process player turn |
| GET | `/api/state/:sessionId` | - | Get current state |
| DELETE | `/api/session/:sessionId` | - | End and remove session |

## Session State Structure

```typescript
interface GameSession {
  sessionId: string;
  playerName: string;
  status: 'ACTIVE' | 'GAME_OVER' | 'VICTORY' | 'ABANDONED';
  turnCount: number;
  createdAt: Date;
  updatedAt: Date;
  mechanics: {
    health: 0-3,
    inventory: string[],
    cluesCollected: number,
    playerStatus: 'ALIVE' | 'DEAD' | 'VICTORIOUS'
  };
  narrative: {
    truthSeed: { villain, motive, plot, twist, location, weakness },
    longTermMemory: string,
    shortTermBuffer: Turn[],  // Max 4 entries (2 exchanges)
    phase: 1 | 2 | 3
  } | null;
  character?: {
    name: string,
    class: string,
    background: string,
    traits: string[],
    appearance: string
  };
  world?: {
    theme: string,
    tone: string,
    setting: string
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
- `TRUTH_SEED_GENERATOR` - Creates mystery at game start (standalone)
- `GAME_SETUP_PROMPT` - Creates character + world + mystery (auto-generated flow)
- `SETUP_OPTIONS_PROMPT` - Creates 3 character + 3 world options
- `GAME_START_FROM_SELECTION_PROMPT` - Creates mystery from player selection
- `LIBRARIAN_PROMPT` - Summarizer instructions
- `PHASE_DIRECTIVES[1|2|3]` - Phase-specific rules
- `NARRATOR_SYSTEM_PROMPT` - Core AI identity
- `OPENING_TEMPLATES` - Atmospheric game openings (legacy, now AI-generated)

## Common Tasks

**Add new phase rule**: Edit `PHASE_DIRECTIVES` in `src/prompts/templates.ts`

**Modify AI response schema**: Update Zod schema in `src/models/response.ts`, then update consequence handling in `src/core/engine.ts` → `applyConsequences()`

**Change summarization frequency**: Modify `turnsSinceSummary >= 5` check in `src/models/session.ts` → `needsSummary()`

**Add new API endpoint**: Add to `src/api/routes.ts`

**Add character/world options**: Modify `SETUP_OPTIONS_PROMPT` in `src/prompts/templates.ts`

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

## Project Structure

```
Rp-adventure/
├── src/
│   ├── server.ts           # Express server entry point
│   ├── api/
│   │   ├── routes.ts       # API endpoints
│   │   └── index.ts        # Export
│   ├── core/
│   │   ├── engine.ts       # Main game orchestrator
│   │   ├── gemini.ts       # Vercel AI SDK / Gemini integration
│   │   ├── summarizer.ts   # Memory compression worker
│   │   └── index.ts        # Export
│   ├── models/
│   │   ├── session.ts      # Game session state
│   │   ├── narrative.ts    # TruthSeed, CharacterProfile, WorldContext, Phase
│   │   ├── mechanics.ts    # Health, inventory, clues
│   │   ├── response.ts     # Gemini response schema (Zod)
│   │   └── index.ts        # Export
│   ├── prompts/
│   │   ├── builder.ts      # Rolling Context prompt assembly
│   │   ├── templates.ts    # AI prompt templates
│   │   └── index.ts        # Export
│   └── utils/
│       └── index.ts        # Utility exports
├── static/
│   ├── css/style.css       # Dark fantasy UI styles
│   └── js/game.js          # Frontend game logic
├── templates/
│   └── index.html          # Game interface
├── docs/
│   ├── CLAUDE.md           # This file
│   └── SPEC.md             # Original specification
├── package.json
├── tsconfig.json
└── .env.example
```
