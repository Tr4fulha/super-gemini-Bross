
export type GameMode = 'MENU' | 'PLATFORMER' | 'SHOOTER';
export type GameState = 'INTRO' | 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WIN' | 'GENERATING';
export type MenuSection = 'MAIN' | 'PLAY' | 'SETTINGS' | 'PROFILE' | 'ABOUT';
export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  quality: GraphicsQuality;
  language: 'PT' | 'EN';
}

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
  powerLevel: number;
  shieldFrames: number;
  maxShieldFrames: number;
  hasDrone: boolean;
  droneFrames: number;
  maxDroneFrames: number;
  tripleShotFrames: number;
  maxTripleShotFrames: number;
  tilt: number;
  energy: number;
  maxEnergy: number;
  dashCooldown: number;
  dashFrames: number;
  scrapCount: number;
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
  type: 'mushroom' | 'triple_shot' | 'shield' | 'drone' | 'life' | 'scrap';
  collected: boolean;
  velocityY?: number;
}

export interface Enemy extends GameObject {
  velocityX: number;
  velocityY: number;
  type: 'patrol' | 'fly' | 'stalker' | 'jumper' | 'ufo' | 'invader' | 'scout' | 'bomber' | 'boss' | 'heavy' | 'fast' | 'asteroid';
  range: number;
  startX: number;
  startY: number;
  isAggro?: boolean;
  lastJumpTime?: number;
  isGrounded?: boolean;
  health: number;
  maxHealth?: number;
  phase?: 'entry' | 'active';
  targetX?: number;
  targetY?: number;
  sineOffset?: number;
  hitFlash?: number;
  rotation?: number;
  points?: {x: number, y: number}[];
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

export interface Projectile extends GameObject {
  velocityY: number;
  velocityX: number;
  owner: 'player' | 'enemy' | 'drone';
  color: string;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export interface Nebula {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
}

export interface Planet {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  type: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  gravity?: number;
  decay?: number;
}
