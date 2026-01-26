
export const GRAVITY = 0.5;
export const JUMP_POWER = -12;
export const WALK_SPEED = 5;
export const FRICTION = 0.8;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export interface LevelConfig {
  name: string;
  theme: string;
  color: string;
  gravity: number;
}

export const PREDEFINED_LEVELS: LevelConfig[] = [
  {
    name: "Floresta Esmeralda",
    theme: "Um início vibrante em uma floresta densa.",
    color: "#10b981",
    gravity: 0.8
  },
  {
    name: "Cavernas de Lava",
    theme: "O calor aumenta nas profundezas da terra.",
    color: "#ef4444",
    gravity: 1.0
  }
];
