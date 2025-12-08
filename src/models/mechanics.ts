/**
 * Game mechanics and player state.
 */

/**
 * Player's current life state.
 */
export enum PlayerStatus {
  ALIVE = 'ALIVE',
  DEAD = 'DEAD',
  VICTORIOUS = 'VICTORIOUS',
}

/**
 * Mechanical state tracking for consequence enforcement.
 */
export interface GameMechanics {
  /** 3=Healthy, 2=Injured, 1=Critical, 0=Dead */
  health: number;

  /** Items the player carries */
  inventory: string[];

  /** Number of mystery clues found */
  cluesCollected: number;

  /** Current life state */
  playerStatus: PlayerStatus;
}

/**
 * Create initial game mechanics.
 */
export function createGameMechanics(): GameMechanics {
  return {
    health: 3,
    inventory: [],
    cluesCollected: 0,
    playerStatus: PlayerStatus.ALIVE,
  };
}

/**
 * Apply damage and return resulting status.
 */
export function applyDamage(mechanics: GameMechanics, amount: number): PlayerStatus {
  mechanics.health = Math.max(0, mechanics.health - amount);
  if (mechanics.health <= 0) {
    mechanics.playerStatus = PlayerStatus.DEAD;
  }
  return mechanics.playerStatus;
}

/**
 * Restore health up to max.
 */
export function heal(mechanics: GameMechanics, amount: number = 1): void {
  mechanics.health = Math.min(3, mechanics.health + amount);
}

/**
 * Add item to inventory if not present.
 */
export function addItem(mechanics: GameMechanics, item: string): void {
  if (!mechanics.inventory.includes(item)) {
    mechanics.inventory.push(item);
  }
}

/**
 * Remove item from inventory. Returns true if successful.
 */
export function removeItem(mechanics: GameMechanics, item: string): boolean {
  const index = mechanics.inventory.indexOf(item);
  if (index !== -1) {
    mechanics.inventory.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Increment clue counter.
 */
export function addClue(mechanics: GameMechanics): void {
  mechanics.cluesCollected++;
}

/**
 * Human-readable health status.
 */
export function getHealthDescription(health: number): string {
  const descriptions: Record<number, string> = {
    3: 'healthy and alert',
    2: 'wounded but standing',
    1: 'critically injured, barely conscious',
    0: 'dead',
  };
  return descriptions[health] ?? 'unknown state';
}
