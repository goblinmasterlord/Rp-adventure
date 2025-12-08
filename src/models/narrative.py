"""Narrative data structures for the Rolling Context system."""

from pydantic import BaseModel, Field
from typing import Literal
from enum import IntEnum


class Phase(IntEnum):
    """Story phases controlling pacing and stakes."""
    HOOK = 1         # Turns 1-5: High survivability, establish mystery
    INVESTIGATION = 2  # Turns 6-20: Fog of War, clue gathering
    CLIMAX = 3       # Turn 20+: Forced confrontation, max danger


class TruthSeed(BaseModel):
    """The Bible - immutable core truth of this adventure.

    This is the hidden foundation that grounds all generated narrative.
    Never revealed to player, but guides every AI response.
    """
    villain: str = Field(description="The antagonist and their role")
    motive: str = Field(description="Why the villain does what they do")
    plot: str = Field(description="The villain's scheme/plan")
    twist: str = Field(description="The hidden revelation that changes everything")
    location: str = Field(description="Where the final confrontation occurs")
    weakness: str = Field(description="How the villain can be defeated")


class Turn(BaseModel):
    """A single exchange in the conversation."""
    role: Literal["user", "model"]
    text: str
    turn_number: int = 0


class NarrativeState(BaseModel):
    """Dynamic narrative memory for the Rolling Context system."""

    # The Bible - static, set at game start
    truth_seed: TruthSeed

    # Long-term memory - compressed summary, updated every 5 turns
    long_term_memory: str = Field(
        default="The adventure begins...",
        description="Compressed summary of all events before working memory"
    )

    # Working memory - raw text of last 2 turns
    short_term_buffer: list[Turn] = Field(
        default_factory=list,
        max_length=4,  # 2 exchanges = 4 turns (user + model each)
        description="Verbatim last 2 player-AI exchanges"
    )

    # Current phase
    phase: Phase = Phase.HOOK

    def add_turn(self, role: Literal["user", "model"], text: str, turn_number: int):
        """Add a turn to working memory, maintaining max 4 entries."""
        self.short_term_buffer.append(Turn(role=role, text=text, turn_number=turn_number))
        # Keep only last 4 turns (2 complete exchanges)
        if len(self.short_term_buffer) > 4:
            self.short_term_buffer = self.short_term_buffer[-4:]

    def get_working_memory_text(self) -> str:
        """Format working memory for prompt injection."""
        if not self.short_term_buffer:
            return "[No recent events]"

        lines = []
        for turn in self.short_term_buffer:
            prefix = "PLAYER" if turn.role == "user" else "NARRATOR"
            lines.append(f"{prefix}: {turn.text}")
        return "\n\n".join(lines)
