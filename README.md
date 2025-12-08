# Infinite Adventure

> A procedural dark fantasy text adventure powered by Gemini AI using the Vercel AI SDK.

Where every choice echoes in shadow.

## Overview

Infinite Adventure is a text-based adventure game that generates infinite, coherent stories using AI. Unlike traditional choose-your-own-adventure games with pre-written paths, this game creates unique narratives on the fly while maintaining story consistency through a sophisticated "Rolling Context" architecture.

### Key Features

- **Procedural Mystery Generation**: Each playthrough generates a unique mystery with interconnected villain, motive, plot, and twist
- **Rolling Context System**: Solves the AI token limit problem by maintaining compressed memory
- **Consequence Engine**: Choices have real consequences—including permanent death
- **Three-Phase Pacing**: Carefully paced narrative from hook → investigation → climax
- **Dark Fantasy Aesthetic**: Atmospheric Gothic horror meets mystery

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **AI**: Vercel AI SDK with Google Gemini (1.5 Pro & Flash)
- **Validation**: Zod for schema validation and structured outputs
- **Frontend**: Vanilla HTML/CSS/JS with Gothic aesthetic

## Architecture

### The Rolling Context System

Instead of sending the full conversation history (which would exceed token limits), we construct a synthetic prompt from:

1. **The Bible** (Static): Hidden "Truth Seed" containing the mystery's core truth
2. **Long-Term Memory** (Dynamic): Compressed summary updated every 5 turns
3. **Working Memory** (Dynamic): Raw text of the last 2 exchanges
4. **Phase Directive** (Dynamic): Rules controlling current story phase

### The Phase System

- **Phase 1 (The Hook)**: Turns 1-5. High survivability. Establishes atmosphere and stakes.
- **Phase 2 (The Investigation)**: Turns 6-20. "Fog of War" prevents premature solutions. Clue gathering.
- **Phase 3 (The Climax)**: Unlocks after Turn 15 + 3 clues. All paths lead to confrontation.

### The Consequence Engine

Every AI response returns structured JSON (via Zod schema) with:
- Narrative text
- Health changes
- Player status (ALIVE/DEAD/VICTORIOUS)
- Clue discovery flags
- Inventory changes

Stupid actions have consequences. Death is permanent.

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd Rp-adventure

# Install dependencies
npm install

# Create .env file with your Gemini API key
cp .env.example .env
# Edit .env and add your API key
```

Get a Gemini API key from: https://makersuite.google.com/app/apikey

## Usage

### Development Mode

```bash
npm run dev
```

Then open http://localhost:5000 in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
Rp-adventure/
├── src/
│   ├── server.ts         # Express server entry point
│   │
│   ├── api/
│   │   └── routes.ts     # API endpoints
│   │
│   ├── core/
│   │   ├── engine.ts     # Main game orchestrator
│   │   ├── gemini.ts     # Vercel AI SDK / Gemini integration
│   │   └── summarizer.ts # Memory compression worker
│   │
│   ├── models/
│   │   ├── session.ts    # Game session state
│   │   ├── narrative.ts  # Story structures (TruthSeed, Phase)
│   │   ├── mechanics.ts  # Health, inventory, clues
│   │   └── response.ts   # Gemini response schema (Zod)
│   │
│   └── prompts/
│       ├── builder.ts    # Rolling Context prompt assembly
│       └── templates.ts  # AI prompt templates
│
├── static/
│   ├── css/style.css     # Dark fantasy UI styles
│   └── js/game.js        # Frontend game logic
│
├── templates/
│   └── index.html        # Game interface
│
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
└── .env.example          # Environment variable template
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini API key | Yes |
| `PORT` | Server port (default: 5000) | No |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/new-game` | Start a new game session |
| POST | `/api/action` | Process player action |
| GET | `/api/state/:sessionId` | Get current game state |
| DELETE | `/api/session/:sessionId` | End session |

## Design Philosophy

### Narrative
- Gothic dark fantasy with moral ambiguity
- Mysteries reward investigation
- Every choice matters
- No safety nets

### Technical
- Token-efficient through memory compression
- Structured outputs via Zod schemas ensure reliable parsing
- Phase gating prevents rushed narratives
- Anti-injection protection maintains game integrity

## Vercel AI SDK Features Used

- `generateObject()` - Structured output with Zod schemas for reliable JSON
- `generateText()` - Simple text generation for summarization
- `@ai-sdk/google` - Gemini 1.5 Pro for narrative, Flash for summaries

## Contributing

This is an MVP. Areas for expansion:
- Persistent sessions (database storage)
- Combat system
- Multiple story genres
- Multiplayer elements
- Achievement system
- Streaming responses for better UX

## License

MIT

---

*"The truth waits in shadow. Do you dare seek it?"*
