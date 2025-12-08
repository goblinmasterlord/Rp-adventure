"""The Game Engine - orchestrates the entire game loop."""

from typing import Optional, Tuple
from ..models.session import GameSession, SessionStatus
from ..models.narrative import NarrativeState, Phase
from ..models.mechanics import PlayerStatus
from ..models.response import GeminiResponse
from ..prompts.builder import PromptBuilder, AntiInjectionFilter
from .gemini import GeminiClient
from .summarizer import SummarizerWorker


class GameEngine:
    """Core orchestrator for the Infinite Adventure.

    Handles:
    - New game initialization with Truth Seed
    - Turn processing with Rolling Context
    - Consequence application
    - Phase transitions
    - Memory summarization triggers
    """

    def __init__(self, api_key: Optional[str] = None):
        self.client = GeminiClient(api_key)
        self.summarizer = SummarizerWorker(self.client)

    def new_game(self, player_name: str = "Wanderer") -> Tuple[GameSession, str]:
        """Initialize a new game session.

        Returns:
            Tuple of (GameSession, opening_narrative_text)
        """
        # Create session
        session = GameSession(player_name=player_name)

        # Generate the hidden truth
        truth_seed = self.client.generate_truth_seed()

        # Initialize narrative state
        session.narrative = NarrativeState(truth_seed=truth_seed)

        # Get atmospheric opening
        opening = PromptBuilder.get_opening_scene()

        # Store opening as first model turn
        session.narrative.add_turn(
            role="model",
            text=opening,
            turn_number=0
        )

        return session, opening

    def process_turn(
        self,
        session: GameSession,
        player_input: str
    ) -> Tuple[GeminiResponse, bool]:
        """Process a single player turn.

        Args:
            session: Current game session
            player_input: What the player said/did

        Returns:
            Tuple of (GeminiResponse, game_ended)
        """
        # Check if game is playable
        if not session.is_playable():
            return GeminiResponse(
                narrative_text="The story has ended. There are no more paths to walk.",
                player_status=session.mechanics.player_status
            ), True

        # Anti-injection check
        injection_response = AntiInjectionFilter.check(player_input)
        if injection_response:
            return GeminiResponse(**injection_response), False

        # Sanitize input
        clean_input = AntiInjectionFilter.sanitize(player_input)

        # Build the Rolling Context prompt
        builder = PromptBuilder(session)
        system_prompt, user_prompt = builder.build_game_prompt(clean_input)

        # Generate narrative response
        response = self.client.generate_narrative(system_prompt, user_prompt)

        # Apply consequences
        game_ended = self._apply_consequences(session, response, clean_input)

        # Check for maintenance tasks
        if not game_ended:
            self._run_maintenance(session)

        return response, game_ended

    def _apply_consequences(
        self,
        session: GameSession,
        response: GeminiResponse,
        player_input: str
    ) -> bool:
        """Apply the Consequence Engine results to game state.

        Returns:
            True if game has ended
        """
        mechanics = session.mechanics
        narrative = session.narrative

        # Advance turn counter
        session.advance_turn()

        # Store the exchange in working memory
        if narrative:
            narrative.add_turn(
                role="user",
                text=player_input,
                turn_number=session.turn_count
            )
            narrative.add_turn(
                role="model",
                text=response.narrative_text,
                turn_number=session.turn_count
            )

        # Apply health changes
        if response.health_change != 0:
            if response.health_change < 0:
                mechanics.apply_damage(abs(response.health_change))
            else:
                mechanics.heal(response.health_change)

        # Handle player death
        if response.player_status == PlayerStatus.DEAD:
            session.end_game(victory=False)
            return True

        # Handle victory
        if response.player_status == PlayerStatus.VICTORIOUS:
            session.end_game(victory=True)
            return True

        # Handle clues
        if response.clue_found:
            mechanics.add_clue()

        # Handle inventory
        if response.item_gained:
            mechanics.add_item(response.item_gained)
        if response.item_lost:
            mechanics.remove_item(response.item_lost)

        # Check phase transitions
        if response.phase_transition or session.check_phase_transition():
            self._handle_phase_transition(session)

        return False

    def _handle_phase_transition(self, session: GameSession):
        """Handle narrative phase changes."""
        if not session.narrative:
            return

        phase = session.narrative.phase

        # Log phase transition (could trigger special events)
        phase_names = {
            Phase.HOOK: "The Hook",
            Phase.INVESTIGATION: "The Investigation",
            Phase.CLIMAX: "The Climax"
        }

        print(f"[Phase Transition] Entering: {phase_names.get(phase, 'Unknown')}")

    def _run_maintenance(self, session: GameSession):
        """Run background maintenance tasks."""
        # Summarization check
        if self.summarizer.should_run(session):
            self.summarizer.run(session)
            print(f"[Summarizer] Memory compressed at turn {session.turn_count}")

    def get_game_state(self, session: GameSession) -> dict:
        """Get current state for UI display."""
        state = session.get_state_summary()

        # Add phase-specific hints
        if session.narrative:
            phase = session.narrative.phase
            if phase == Phase.HOOK:
                state["phase_hint"] = "The mystery unfolds..."
            elif phase == Phase.INVESTIGATION:
                state["phase_hint"] = f"Clues: {session.mechanics.clues_collected}/3 needed"
            elif phase == Phase.CLIMAX:
                state["phase_hint"] = "The final confrontation awaits"

        return state

    def save_session(self, session: GameSession, filepath: str):
        """Persist session to JSON file."""
        import json
        with open(filepath, 'w') as f:
            f.write(session.model_dump_json(indent=2))

    def load_session(self, filepath: str) -> GameSession:
        """Load session from JSON file."""
        import json
        with open(filepath, 'r') as f:
            data = json.load(f)
        return GameSession.model_validate(data)
