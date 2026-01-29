
export type GameMode = 'MENU' | 'PLATFORMER' | 'SHOOTER';
export type GameState = 'INTRO' | 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WIN' | 'DEATH_ANIM' | 'CREDITS' | 'HIGHSCORES' | 'SHOP';
export type MenuSection = 'MAIN' | 'PLAY' | 'SETTINGS' | 'CONTROLS' | 'CREDITS' | 'HIGHSCORES' | 'SHOP';
export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';
export type SpecialAbility = 'OVERDRIVE' | 'EMP_STORM' | 'CHRONO_SPHERE';
export type ShooterSkin = 'CORE' | 'PHANTOM' | 'STRIKER';

export interface KeyBinds {
  up: string;
  down: string;
  left: string;
  right: string;
  fire: string;
  dash: string;
  pause: string;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  quality: GraphicsQuality;
  language: 'PT' | 'EN';
  keyBinds: KeyBinds;
}

export interface HighScoreEntry {
  score: number;
  date: string;
  wave: number;
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
  score: number;
  lives: number;
  invincibilityFrames: number;
  shieldFrames: number;
  maxShieldFrames: number;
  tilt: number;
  dashCooldown: number;
  dashFrames: number;
  slowMoFrames: number;
  rapidFireFrames: number;
  damageBoostFrames: number;
  speedBoostFrames: number;
  magnetFrames: number;
  deathTimer: number;
  abilityCharge: number;
  scrapCount: number;
  powerLevel: number;
  // Combo System
  comboCount: number;      // Total enemies killed in current chain
  comboTimer: number;      // Frames remaining to keep combo alive
  comboMultiplier: number; // Current score multiplier (e.g. 1x, 2x, 4x)
}

// 9 Power-up types
export type PowerUpType = 
  | 'LIFE'        // Green: +1 Life
  | 'SHIELD'      // Blue: Invincibility
  | 'TRIPLE'      // Yellow: 3 bullets
  | 'DAMAGE'      // Red: 2x Damage
  | 'RAPID'       // Orange: Fast fire
  | 'SPEED'       // Cyan: Fast move
  | 'NUKE'        // Purple: Kills all screen
  | 'TIME'        // White: Slows enemies
  | 'MAGNET';     // Pink: Attracts items

export interface PowerUp extends GameObject {
  type: PowerUpType;
  velocityY: number;
  pulseOffset: number;
}

export interface Enemy extends GameObject {
  velocityX: number;
  velocityY: number;
  type: 'scout' | 'fighter' | 'heavy' | 'sniper' | 'boss';
  health: number;
  maxHealth: number;
  hitFlash: number;
  lastShotTime: number;
  isBoss?: boolean;
  behaviorTimer: number; // For AI logic
  angle: number; // For movement direction
}

export interface Projectile extends GameObject {
  velocityY: number;
  velocityX: number;
  owner: 'player' | 'enemy';
  color: string;
  damage: number;
  isMissile?: boolean;
  trail?: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  layer: number; // Parallax
  type: 'STAR' | 'NEBULA' | 'ASTEROID';
  angle: number;
  rotationSpeed: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  decay: number;
  glow: boolean;
  type?: 'spark' | 'smoke' | 'ring';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  velocityY: number;
}

export interface Mine extends GameObject {
  velocityY: number;
  rotation: number;
  active: boolean;
}

export interface Scrap extends GameObject {
  velocityY: number;
  velocityX: number;
  value: number;
  rotation: number;
}

export type UpgradeType = 'START_LIVES' | 'START_POWER' | 'MAGNET_RANGE' | 'DASH_COOLDOWN' | 'SCORE_MULT';

export interface SaveData {
  totalScrap: number;
  upgrades: Record<UpgradeType, number>;
}

export interface LevelData {
  enemies: Enemy[];
  powerUps: PowerUp[];
  particles: Particle[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  mines: Mine[];
  scraps: Scrap[];
}
