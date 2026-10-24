export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type EnemyAIState = 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'SEARCH_LOCKER' | 'STUNNED';

export interface PlayerStats {
  stamina: number;        // 0 - 100
  battery: number;        // 0 - 100
  sanity: number;         // 0 - 100
  fearLevel: number;      // 0 - 100 (increases near monster)
  isFlashlightOn: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  isHiding: boolean;
  currentLockerId: string | null;
  isHoldingBreath: boolean;
  breathRemaining: number;// 0 - 100
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'key' | 'battery' | 'adrenaline' | 'note';
}

export interface Objective {
  id: string;
  text: string;
  completed: boolean;
  current?: boolean;
}

export interface LockerObject {
  id: string;
  position: [number, number, number];
  rotationY: number;
  isOccupied: boolean;
}

export interface DoorObject {
  id: string;
  position: [number, number, number];
  rotationY: number;
  isOpen: boolean;
  isLocked: boolean;
  requiredKeyId?: string;
  name: string;
}

export interface PickupItem {
  id: string;
  type: 'key' | 'battery' | 'adrenaline' | 'note';
  name: string;
  position: [number, number, number];
  itemData?: Record<string, unknown>;
  pickedUp: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
}

export interface GameSettings {
  graphicsQuality: 'high' | 'medium' | 'low';
  sensitivity: number;
  invertedY: boolean;
  showTouchControls: boolean;
  soundEnabled: boolean;
}
