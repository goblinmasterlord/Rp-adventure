#!/usr/bin/env python3
"""
Infinite Adventure - CLI Mode

Play the game directly in your terminal without the web UI.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

from src.core.engine import GameEngine
from src.models.mechanics import PlayerStatus


def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')


def print_banner():
    banner = """
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     ▀█▀ █▄ █ █▀▀ ▀█▀ █▄ █ ▀█▀ ▀█▀ █▀▀                    ║
    ║      █  █ ▀█ █▀   █  █ ▀█  █   █  █▀▀                    ║
    ║                                                           ║
    ║     ▄▀█ █▀▄ █ █ █▀▀ █▄ █ ▀█▀ █ █ █▀█ █▀▀                 ║
    ║     █▀█ █▄▀ ▀▄▀ ██▄ █ ▀█  █  █▄█ █▀▄ ██▄                 ║
    ║                                                           ║
    ║        Where every choice echoes in shadow                ║
    ╚═══════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_status(state: dict):
    health_bar = "❤️ " * state['health'] + "🖤" * (3 - state['health'])
    print(f"\n┌─────────────────────────────────────────────────┐")
    print(f"│ Turn: {state['turn']:3} │ {health_bar} │ Phase: {state['phase']:12} │")
    print(f"│ Clues: {state['clues']}/3 │ Inventory: {len(state['inventory'])} items          │")
    print(f"└─────────────────────────────────────────────────┘\n")


def main():
    clear_screen()
    print_banner()

    # Check for API key
    if not os.getenv('GEMINI_API_KEY'):
        print("\n⚠️  ERROR: GEMINI_API_KEY not found!")
        print("   Create a .env file with: GEMINI_API_KEY=your_key_here")
        print("   Get a key from: https://makersuite.google.com/app/apikey\n")
        sys.exit(1)

    # Get player name
    print("\n  What name do you carry?")
    player_name = input("  > ").strip() or "Wanderer"

    print(f"\n  Welcome, {player_name}. Your journey begins...\n")
    print("  ─" * 30)

    # Initialize game
    try:
        engine = GameEngine()
        session, opening = engine.new_game(player_name)
    except Exception as e:
        print(f"\n⚠️  Failed to initialize game: {e}")
        sys.exit(1)

    # Display opening
    print(f"\n{opening}\n")
    print("  ─" * 30)

    # Game loop
    while session.is_playable():
        state = engine.get_game_state(session)
        print_status(state)

        # Get player input
        print("  What do you do?")
        player_input = input("  > ").strip()

        if not player_input:
            continue

        if player_input.lower() in ['quit', 'exit', 'q']:
            print("\n  The shadows claim you as you flee...\n")
            break

        if player_input.lower() == 'inventory':
            print("\n  Your possessions:")
            for item in state['inventory']:
                print(f"    ◆ {item}")
            if not state['inventory']:
                print("    (empty)")
            continue

        print("\n  ─" * 30)
        print("\n  The shadows shift...\n")

        # Process turn
        try:
            response, game_ended = engine.process_turn(session, player_input)
        except Exception as e:
            print(f"\n  ⚠️  Error: {e}\n")
            continue

        # Display response
        print(f"  {response.narrative_text}\n")

        if response.clue_found:
            print(f"  📜 CLUE FOUND: {response.clue_description}\n")

        if response.item_gained:
            print(f"  ◆ Acquired: {response.item_gained}\n")

        if response.health_change < 0:
            print(f"  💔 You have been wounded! ({response.health_change} health)\n")

        print("  ─" * 30)

        if game_ended:
            state = engine.get_game_state(session)
            if state['status'] == 'VICTORY':
                print("\n  ✨ VICTORY - You have unraveled the mystery!\n")
            else:
                print("\n  ☠️  GAME OVER - Your journey ends here.\n")
            print(f"  Turns: {state['turn']} | Clues Found: {state['clues']}/3\n")
            break

    print("\n  Thank you for playing Infinite Adventure.\n")


if __name__ == '__main__':
    main()
