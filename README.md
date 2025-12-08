# Infinite Adventure

> A procedural dark fantasy text adventure powered by Gemini AI.

Where every choice echoes in shadow.

## Overview

Infinite Adventure is a text-based adventure game that generates infinite, coherent stories using AI. Unlike traditional choose-your-own-adventure games with pre-written paths, this game creates unique narratives on the fly while maintaining story consistency through a sophisticated "Rolling Context" architecture.

### Key Features

- **Procedural Mystery Generation**: Each playthrough generates a unique mystery with interconnected villain, motive, plot, and twist
- **Rolling Context System**: Solves the AI token limit problem by maintaining compressed memory
- **Consequence Engine**: Choices have real consequences—including permanent death
- **Three-Phase Pacing**: Carefully paced narrative from hook → investigation → climax
- **Dark Fantasy Aesthetic**: Atmospheric Gothic horror meets mystery

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

Every AI response returns structured JSON with:
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

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Get a Gemini API key from: https://makersuite.google.com/app/apikey

## Usage

### Web Interface

```bash
python app.py
```

Then open http://localhost:5000 in your browser.

### CLI Mode

```bash
python cli.py
```

Play directly in your terminal.

## Project Structure

```
Rp-adventure/
├── app.py              # Flask web application entry point
├── cli.py              # Terminal-based game client
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
│
├── src/
│   ├── api/
│   │   └── routes.py   # Flask API endpoints
│   │
│   ├── core/
│   │   ├── engine.py   # Main game orchestrator
│   │   ├── gemini.py   # Gemini API integration
│   │   └── summarizer.py # Memory compression worker
│   │
│   ├── models/
│   │   ├── session.py  # Game session state
│   │   ├── narrative.py # Story structures (TruthSeed, Phase)
│   │   ├── mechanics.py # Health, inventory, clues
│   │   └── response.py # Gemini response schema
│   │
│   └── prompts/
│       ├── builder.py  # Rolling Context prompt assembly
│       └── templates.py # AI prompt templates
│
├── static/
│   ├── css/style.css   # Dark fantasy UI styles
│   └── js/game.js      # Frontend game logic
│
└── templates/
    └── index.html      # Game interface
```

## Design Philosophy

### Narrative
- Gothic dark fantasy with moral ambiguity
- Mysteries reward investigation
- Every choice matters
- No safety nets

### Technical
- Token-efficient through memory compression
- Structured responses enable consequence tracking
- Phase gating prevents rushed narratives
- Anti-injection protection maintains game integrity

## Contributing

This is an MVP. Areas for expansion:
- Persistent sessions (database storage)
- Combat system
- Multiple story genres
- Multiplayer elements
- Achievement system

## License

MIT

---

*"The truth waits in shadow. Do you dare seek it?"*
