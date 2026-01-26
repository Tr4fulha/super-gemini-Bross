
export const GRAVITY = 0.45;
export const FALL_GRAVITY_MULT = 2.2; // Gravidade mais forte ao cair
export const JUMP_POWER = -11;
export const WALK_SPEED = 4.5;
export const FRICTION = 0.85;
export const CANVAS_WIDTH = 800; // Resolução interna base
export const CANVAS_HEIGHT = 450; // Proporção 16:9 mais moderna

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
    gravity: 1.0
  },
  {
    name: "Cavernas de Lava",
    theme: "O calor aumenta nas profundezas da terra.",
    color: "#ef4444",
    gravity: 1.2
  },
  {
    name: "Abismo de Safira",
    theme: "Mergulhe em águas profundas e calmas.",
    color: "#3b82f6",
    gravity: 0.5 // Gravidade baixa para simular flutuação
  },
  {
    name: "Fortaleza Espectral",
    theme: "Enfrente os fantasmas no castelo abandonado.",
    color: "#8b5cf6",
    gravity: 1.1
  }
];
