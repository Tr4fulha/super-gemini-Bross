
export type GameState = 'START' | 'PLAYING' | 'GAME_OVER' | 'WIN' | 'GENERATING';

export interface LevelInfo {
  name: string;
  theme: string;
  color: string;
  gravity: number;
}

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends GameObject {
  velocityX: number;
  velocityY: number;
  isJumping: boolean;
  score: number;
  lives: number;
  direction: 'left' | 'right';
  isLarge: boolean;
  invincibilityFrames: number;
}

export interface Platform extends GameObject {
  type: 'solid' | 'grass' | 'lava' | 'breakable' | 'moving';
  isDestroyed?: boolean;
  velocityX?: number;
  velocityY?: number;
  range?: number;
  startX?: number;
  startY?: number;
}

export interface PowerUp extends GameObject {
  type: 'mushroom';
  collected: boolean;
}

export interface Enemy extends GameObject {
  velocityX: number;
  velocityY: number;
  type: 'patrol' | 'fly' | 'stalker' | 'jumper';
  range: number;
  startX: number;
  isAggro?: boolean;
  lastJumpTime?: number;
  isGrounded?: boolean;
}

export interface Coin extends GameObject {
  collected: boolean;
}

export interface Goal extends GameObject {}

export interface LevelData {
  platforms: Platform[];
  enemies: Enemy[];
  coins: Coin[];
  powerUps: PowerUp[];
  goal: Goal;
  playerStart: { x: number; y: number };
}
