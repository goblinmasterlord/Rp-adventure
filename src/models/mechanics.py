"""Game mechanics and player state."""

from pydantic import BaseModel, Field
from enum import StrEnum


class PlayerStatus(StrEnum):
    """Player's current life state."""
    ALIVE = "ALIVE"
    DEAD = "DEAD"
    VICTORIOUS = "VICTORIOUS"


class GameMechanics(BaseModel):
    """Mechanical state tracking for consequence enforcement."""

    health: int = Field(
        default=3,
        ge=0,
        le=3,
        description="3=Healthy, 2=Injured, 1=Critical, 0=Dead"
    )

    inventory: list[str] = Field(
        default_factory=list,
        description="Items the player carries"
    )

    clues_collected: int = Field(
        default=0,
        ge=0,
        description="Number of mystery clues found"
    )

    player_status: PlayerStatus = PlayerStatus.ALIVE

    def apply_damage(self, amount: int) -> PlayerStatus:
        """Apply damage and return resulting status."""
        self.health = max(0, self.health - amount)
        if self.health <= 0:
            self.player_status = PlayerStatus.DEAD
        return self.player_status

    def heal(self, amount: int = 1):
        """Restore health up to max."""
        self.health = min(3, self.health + amount)

    def add_item(self, item: str):
        """Add item to inventory if not present."""
        if item not in self.inventory:
            self.inventory.append(item)

    def remove_item(self, item: str) -> bool:
        """Remove item from inventory. Returns True if successful."""
        if item in self.inventory:
            self.inventory.remove(item)
            return True
        return False

    def add_clue(self):
        """Increment clue counter."""
        self.clues_collected += 1

    def get_health_description(self) -> str:
        """Human-readable health status."""
        descriptions = {
            3: "healthy and alert",
            2: "wounded but standing",
            1: "critically injured, barely conscious",
            0: "dead"
        }
        return descriptions.get(self.health, "unknown state")
