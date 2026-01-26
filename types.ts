
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
}

export interface Platform extends GameObject {
  type: 'solid' | 'grass' | 'lava';
}

export interface Enemy extends GameObject {
  velocityX: number;
  type: 'patrol' | 'fly';
  range: number;
  startX: number;
}

export interface Coin extends GameObject {
  collected: boolean;
}

export interface Goal extends GameObject {}

export interface LevelData {
  platforms: Platform[];
  enemies: Enemy[];
  coins: Coin[];
  goal: Goal;
  playerStart: { x: number; y: number };
}
