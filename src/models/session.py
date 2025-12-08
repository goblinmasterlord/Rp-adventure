"""Game session management."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import StrEnum
from datetime import datetime
import uuid

from .narrative import NarrativeState, Phase
from .mechanics import GameMechanics, PlayerStatus


class SessionStatus(StrEnum):
    """Overall session state."""
    ACTIVE = "ACTIVE"
    GAME_OVER = "GAME_OVER"
    VICTORY = "VICTORY"
    ABANDONED = "ABANDONED"


class GameSession(BaseModel):
    """Complete game state for a single playthrough."""

    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str = "Wanderer"
    status: SessionStatus = SessionStatus.ACTIVE

    turn_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    mechanics: GameMechanics = Field(default_factory=GameMechanics)
    narrative: Optional[NarrativeState] = None

    # Tracking for summarizer
    turns_since_summary: int = 0

    def is_playable(self) -> bool:
        """Check if game can continue."""
        return self.status == SessionStatus.ACTIVE

    def advance_turn(self):
        """Increment turn counter and check triggers."""
        self.turn_count += 1
        self.turns_since_summary += 1
        self.updated_at = datetime.now()

    def needs_summary(self) -> bool:
        """Check if summarizer should run (every 5 turns)."""
        return self.turns_since_summary >= 5

    def mark_summarized(self):
        """Reset summary counter after summarizer runs."""
        self.turns_since_summary = 0

    def check_phase_transition(self) -> bool:
        """Evaluate if phase should advance based on gates."""
        if not self.narrative:
            return False

        current_phase = self.narrative.phase

        # Phase 1 -> 2: Complete turn 5
        if current_phase == Phase.HOOK and self.turn_count >= 5:
            self.narrative.phase = Phase.INVESTIGATION
            return True

        # Phase 2 -> 3: Turn >= 15 AND clues >= 3
        if (current_phase == Phase.INVESTIGATION and
            self.turn_count >= 15 and
            self.mechanics.clues_collected >= 3):
            self.narrative.phase = Phase.CLIMAX
            return True

        return False

    def end_game(self, victory: bool = False):
        """Mark game as complete."""
        if victory:
            self.status = SessionStatus.VICTORY
            self.mechanics.player_status = PlayerStatus.VICTORIOUS
        else:
            self.status = SessionStatus.GAME_OVER
            self.mechanics.player_status = PlayerStatus.DEAD
        self.updated_at = datetime.now()

    def get_state_summary(self) -> dict:
        """Get current state for UI display."""
        return {
            "turn": self.turn_count,
            "health": self.mechanics.health,
            "health_desc": self.mechanics.get_health_description(),
            "phase": self.narrative.phase.name if self.narrative else "UNKNOWN",
            "clues": self.mechanics.clues_collected,
            "inventory": self.mechanics.inventory,
            "status": self.status.value
        }
