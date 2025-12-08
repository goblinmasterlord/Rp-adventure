"""Structured response schema for Gemini outputs."""

from pydantic import BaseModel, Field
from typing import Optional
from .mechanics import PlayerStatus


class GeminiResponse(BaseModel):
    """The Fate Check response schema.

    Every Gemini response must conform to this structure to enable
    the Consequence Engine to properly update game state.
    """

    narrative_text: str = Field(
        description="The story text to display to the player"
    )

    health_change: int = Field(
        default=0,
        ge=-3,
        le=1,
        description="Health delta: negative=damage, 0=safe, +1=heal"
    )

    player_status: PlayerStatus = Field(
        default=PlayerStatus.ALIVE,
        description="ALIVE, DEAD, or VICTORIOUS"
    )

    clue_found: bool = Field(
        default=False,
        description="Whether this turn reveals a clue"
    )

    clue_description: Optional[str] = Field(
        default=None,
        description="Description of clue if found"
    )

    item_gained: Optional[str] = Field(
        default=None,
        description="New item acquired this turn"
    )

    item_lost: Optional[str] = Field(
        default=None,
        description="Item removed from inventory"
    )

    phase_transition: bool = Field(
        default=False,
        description="Whether to advance to next phase"
    )

    atmospheric_hint: Optional[str] = Field(
        default=None,
        description="Subtle environmental detail for immersion"
    )
