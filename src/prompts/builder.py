"""Prompt assembly for the Rolling Context system.

This is the core of the architecture - constructing the synthetic
prompt that creates coherent narrative without exceeding token limits.
"""

from typing import Optional
from ..models.session import GameSession
from ..models.narrative import Phase
from .templates import (
    NARRATOR_SYSTEM_PROMPT,
    PHASE_DIRECTIVES,
    OPENING_TEMPLATES,
)
import random


class PromptBuilder:
    """Assembles the four-block Rolling Context prompt.

    Structure:
    1. System Prompt (narrator identity + rules)
    2. The Bible (truth seed - hidden foundation)
    3. Long-Term Memory (compressed history)
    4. Working Memory (last 2 turns)
    5. Phase Directive (current rules)
    6. Player Input (current action)
    """

    def __init__(self, session: GameSession):
        self.session = session

    def build_game_prompt(self, player_input: str) -> tuple[str, str]:
        """Build complete prompt for game turn.

        Returns:
            tuple: (system_prompt, user_prompt)
        """
        # Block 1: System prompt (narrator identity)
        system = NARRATOR_SYSTEM_PROMPT

        # Build the contextual user prompt
        user_parts = []

        # Block 2: The Bible (truth seed)
        user_parts.append(self._build_bible_block())

        # Block 3: Current state summary
        user_parts.append(self._build_state_block())

        # Block 4: Long-term memory
        user_parts.append(self._build_memory_block())

        # Block 5: Working memory (last 2 turns)
        user_parts.append(self._build_working_memory_block())

        # Block 6: Phase directive
        user_parts.append(self._build_phase_directive())

        # Block 7: Player input
        user_parts.append(self._build_input_block(player_input))

        user_prompt = "\n\n".join(filter(None, user_parts))

        return system, user_prompt

    def _build_bible_block(self) -> str:
        """Inject the truth seed (hidden from player, visible to AI)."""
        if not self.session.narrative:
            return ""

        ts = self.session.narrative.truth_seed
        return f"""=== THE HIDDEN TRUTH (Never reveal directly) ===
VILLAIN: {ts.villain}
MOTIVE: {ts.motive}
PLOT: {ts.plot}
TWIST: {ts.twist}
FINAL LOCATION: {ts.location}
WEAKNESS: {ts.weakness}
=== END HIDDEN TRUTH ==="""

    def _build_state_block(self) -> str:
        """Current mechanical state for AI awareness."""
        state = self.session.get_state_summary()
        inventory = ", ".join(state["inventory"]) if state["inventory"] else "nothing"

        return f"""=== CURRENT STATE ===
Turn: {state['turn']}
Health: {state['health']}/3 ({state['health_desc']})
Phase: {state['phase']}
Clues Found: {state['clues']}/3
Inventory: {inventory}
=== END STATE ==="""

    def _build_memory_block(self) -> str:
        """Long-term memory (compressed summary)."""
        if not self.session.narrative:
            return ""

        memory = self.session.narrative.long_term_memory
        if not memory or memory == "The adventure begins...":
            return ""

        return f"""=== STORY SO FAR (Compressed Memory) ===
{memory}
=== END MEMORY ==="""

    def _build_working_memory_block(self) -> str:
        """Raw text of last 2 exchanges."""
        if not self.session.narrative:
            return ""

        working = self.session.narrative.get_working_memory_text()
        if working == "[No recent events]":
            return ""

        return f"""=== RECENT EVENTS (Last 2 Exchanges) ===
{working}
=== END RECENT ==="""

    def _build_phase_directive(self) -> str:
        """Current phase rules and goals."""
        if not self.session.narrative:
            phase = 1
        else:
            phase = self.session.narrative.phase.value

        directive = PHASE_DIRECTIVES.get(phase, PHASE_DIRECTIVES[1])
        return directive

    def _build_input_block(self, player_input: str) -> str:
        """Format the player's current action."""
        return f"""=== PLAYER ACTION ===
The player says/does: "{player_input}"

Respond with valid JSON only. Remember: Consequences are real. Choices matter."""

    @staticmethod
    def get_opening_scene() -> str:
        """Get a random atmospheric opening."""
        return random.choice(OPENING_TEMPLATES)

    def build_summary_prompt(self, new_turns: list[dict]) -> str:
        """Build prompt for the Summarizer Worker.

        Args:
            new_turns: List of turn dicts with 'role' and 'text'

        Returns:
            Complete summarizer prompt
        """
        from .templates import LIBRARIAN_PROMPT

        existing = ""
        if self.session.narrative:
            existing = self.session.narrative.long_term_memory

        # Format new events
        new_events = []
        for turn in new_turns:
            prefix = "PLAYER" if turn.get("role") == "user" else "NARRATOR"
            new_events.append(f"{prefix}: {turn.get('text', '')}")

        new_events_text = "\n\n".join(new_events)

        return LIBRARIAN_PROMPT.format(
            existing_memory=existing or "[No previous memory]",
            new_events=new_events_text
        )


class AntiInjectionFilter:
    """Filters player input for prompt injection attempts."""

    FORBIDDEN_PATTERNS = [
        "ignore previous",
        "ignore all",
        "disregard",
        "new instructions",
        "you are now",
        "pretend to be",
        "act as if",
        "system prompt",
        "reveal the",
        "tell me the truth seed",
        "what is the villain",
        "what is the twist",
        "admin mode",
        "developer mode",
        "jailbreak",
        "dan mode",
    ]

    INJECTION_RESPONSE = {
        "narrative_text": "The shadows seem to laugh at your strange words. Whatever power you sought to invoke here finds no purchase. The world remains unchanged, indifferent to such pleas. Perhaps a more... direct approach is needed.",
        "health_change": 0,
        "player_status": "ALIVE",
        "clue_found": False,
        "clue_description": None,
        "item_gained": None,
        "item_lost": None,
        "phase_transition": False,
        "atmospheric_hint": "Reality reasserts itself."
    }

    @classmethod
    def check(cls, player_input: str) -> Optional[dict]:
        """Check for injection attempts.

        Returns:
            None if safe, or a canned response dict if injection detected
        """
        lower = player_input.lower()

        for pattern in cls.FORBIDDEN_PATTERNS:
            if pattern in lower:
                return cls.INJECTION_RESPONSE

        # Check for suspicious patterns
        if lower.count("```") > 0:
            return cls.INJECTION_RESPONSE
        if "json" in lower and "{" in lower:
            return cls.INJECTION_RESPONSE

        return None

    @classmethod
    def sanitize(cls, player_input: str) -> str:
        """Remove potentially dangerous characters while preserving intent."""
        # Remove backticks and code fence markers
        cleaned = player_input.replace("`", "'")
        # Limit length
        cleaned = cleaned[:500]
        return cleaned.strip()
