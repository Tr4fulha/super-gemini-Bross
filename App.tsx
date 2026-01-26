
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject, PowerUp } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WALK_SPEED, JUMP_POWER, GRAVITY, FRICTION } from './constants';
import { generateLevelTheme } from './services/geminiService';
import MobileControls from './components/MobileControls';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('START');
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  const player = useRef<Player>({
    x: 50, y: 500, width: 28, height: 32,
    velocityX: 0, velocityY: 0,
    isJumping: false, score: 0, lives: 3,
    direction: 'right', isLarge: false, invincibilityFrames: 0
  });
  
  const levelData = useRef<LevelData>({
    platforms: [],
    enemies: [],
    coins: [],
    powerUps: [],
    goal: { x: 0, y: 0, width: 40, height: 100 },
    playerStart: { x: 50, y: 480 }
  });

  const cameraX = useRef(0);

  const initLevel = useCallback(async (levelIdx: number = 0) => {
    setGameState('GENERATING');
    const info = await generateLevelTheme();
    setLevelInfo(info);
    setCurrentLevelIdx(levelIdx);

    // Estrutura base de níveis (pode ser expandida via Gemini no futuro)
    let platforms: Platform[] = [];
    let coins: Coin[] = [];
    let enemies: Enemy[] = [];
    let powerUps: PowerUp[] = [];
    let goal: Goal = { x: 0, y: 0, width: 40, height: 100 };

    if (levelIdx === 0) {
      platforms = [
        { x: 0, y: 540, width: 1200, height: 60, type: 'solid' },
        { x: 400, y: 410, width: 64, height: 32, type: 'breakable' },
        { x: 464, y: 410, width: 64, height: 32, type: 'breakable' },
        { x: 528, y: 410, width: 64, height: 32, type: 'breakable' },
        { x: 1300, y: 540, width: 1000, height: 60, type: 'solid' },
        { x: 1450, y: 380, width: 120, height: 24, type: 'grass' },
        { x: 1550, y: 150, width: 300, height: 24, type: 'grass' },
        { x: 2300, y: 540, width: 1500, height: 60, type: 'solid' },
      ];
      coins = [
        { x: 415, y: 370, width: 20, height: 20, collected: false },
        { x: 1600, y: 100, width: 20, height: 20, collected: false },
      ];
      powerUps = [{ x: 480, y: 340, width: 24, height: 24, type: 'mushroom', collected: false }];
      enemies = [
        { x: 800, y: 510, width: 30, height: 30, velocityX: 2, velocityY: 0, type: 'patrol', range: 200, startX: 800 },
        { x: 1600, y: 510, width: 30, height: 30, velocityX: 1.5, velocityY: 0, type: 'stalker', range: 0, startX: 1600 },
        { x: 2600, y: 510, width: 30, height: 30, velocityX: 2, velocityY: 0, type: 'jumper', range: 200, startX: 2600 },
      ];
      goal = { x: 3600, y: 440, width: 40, height: 100 };
    } else {
      platforms = [
        { x: 0, y: 540, width: 400, height: 60, type: 'solid' },
        { x: 400, y: 580, width: 800, height: 20, type: 'lava' },
        { x: 550, y: 440, width: 120, height: 24, type: 'grass' },
        { x: 850, y: 380, width: 120, height: 24, type: 'grass' },
        { x: 1200, y: 540, width: 1200, height: 60, type: 'solid' },
        { x: 1500, y: 420, width: 192, height: 32, type: 'breakable' },
        { x: 2400, y: 580, width: 1000, height: 20, type: 'lava' },
        { x: 3400, y: 540, width: 800, height: 60, type: 'solid' },
      ];
      coins = [{ x: 1550, y: 380, width: 20, height: 20, collected: false }];
      powerUps = [{ x: 580, y: 380, width: 24, height: 24, type: 'mushroom', collected: false }];
      enemies = [
        { x: 1300, y: 510, width: 30, height: 30, velocityX: 4, velocityY: 0, type: 'patrol', range: 300, startX: 1300 },
        { x: 1800, y: 300, width: 30, height: 30, velocityX: 2, velocityY: 0, type: 'fly', range: 200, startX: 1800 },
        { x: 3500, y: 510, width: 30, height: 30, velocityX: 1.5, velocityY: 0, type: 'stalker', range: 0, startX: 3500 },
      ];
      goal = { x: 4000, y: 440, width: 40, height: 100 };
    }

    levelData.current = { platforms, coins, enemies, powerUps, goal, playerStart: { x: 50, y: 480 } };
    player.current = { ...player.current, x: 50, y: 480, velocityX: 0, velocityY: 0, isLarge: false, height: 32, invincibilityFrames: 0 };
    cameraX.current = 0;
    setGameState('PLAYING');
  }, []);

  const handleKeyPress = (key: string, pressed: boolean) => {
    keysPressed.current[key] = pressed;
  };

  const checkCollision = (a: GameObject, b: GameObject) => {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  };

  const resetAfterDeath = () => {
    const p = player.current;
    setLives(prev => {
      if (prev <= 1) {
        setGameState('GAME_OVER');
        return 0;
      }
      p.x = levelData.current.playerStart.x;
      p.y = levelData.current.playerStart.y;
      p.velocityX = 0;
      p.velocityY = 0;
      p.isLarge = false;
      p.height = 32;
      p.invincibilityFrames = 90;
      cameraX.current = 0;
      return prev - 1;
    });
  };

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const p = player.current;
    const g = levelData.current;
    const gravityValue = GRAVITY * (levelInfo?.gravity || 1.0);

    if (p.invincibilityFrames > 0) p.invincibilityFrames--;

    // Inputs
    if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) {
      p.velocityX = Math.max(p.velocityX - 0.8, -WALK_SPEED);
      p.direction = 'left';
    } else if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) {
      p.velocityX = Math.min(p.velocityX + 0.8, WALK_SPEED);
      p.direction = 'right';
    } else {
      p.velocityX *= FRICTION;
    }

    if ((keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current[' ']) && !p.isJumping) {
      p.velocityY = JUMP_POWER;
      p.isJumping = true;
    }

    p.velocityY += gravityValue;
    p.x += p.velocityX;
    p.y += p.velocityY;

    // Colisões de Plataforma
    let onPlatform = false;
    g.platforms.forEach(plat => {
      if (plat.isDestroyed) return;
      if (checkCollision(p, plat)) {
        if (plat.type === 'lava' && p.invincibilityFrames === 0) {
          resetAfterDeath();
          return;
        }

        const overlapTop = (p.y + p.height) - plat.y;
        const overlapBottom = (plat.y + plat.height) - p.y;
        const overlapLeft = (p.x + p.width) - plat.x;
        const overlapRight = (plat.x + plat.width) - p.x;

        const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

        if (minOverlap === overlapTop && p.velocityY >= 0) {
          p.y = plat.y - p.height;
          p.velocityY = 0;
          p.isJumping = false;
          onPlatform = true;
        } else if (minOverlap === overlapBottom && p.velocityY <= 0) {
          p.y = plat.y + plat.height;
          p.velocityY = 0;
          if (plat.type === 'breakable' && p.isLarge) {
            plat.isDestroyed = true;
            setScore(s => s + 200);
          }
        } else if (minOverlap === overlapLeft) {
          p.x = plat.x - p.width;
          p.velocityX = 0;
        } else if (minOverlap === overlapRight) {
          p.x = plat.x + plat.width;
          p.velocityX = 0;
        }
      }
    });

    if (!onPlatform && p.y + p.height < CANVAS_HEIGHT) p.isJumping = true;

    // PowerUps e Itens
    g.powerUps.forEach(pu => {
      if (!pu.collected && checkCollision(p, pu)) {
        pu.collected = true;
        if (pu.type === 'mushroom') {
          p.isLarge = true;
          p.y -= 16;
          p.height = 48;
          setScore(s => s + 500);
        }
      }
    });

    // Inimigos
    g.enemies.forEach(enemy => {
      if (enemy.x < -1000) return;
      if (enemy.type === 'fly') {
        enemy.y += Math.sin(Date.now() / 200) * 2;
        enemy.x += enemy.velocityX;
        if (Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;
      } else if (enemy.type === 'stalker') {
        const dist = Math.abs(p.x - enemy.x);
        if (dist < 350) {
          enemy.isAggro = true;
          enemy.velocityX = p.x > enemy.x ? 2.5 : -2.5;
        } else {
          enemy.isAggro = false;
          enemy.velocityX *= 0.95;
        }
        enemy.x += enemy.velocityX;
      } else if (enemy.type === 'jumper') {
        if (enemy.isGrounded && Math.random() < 0.02) {
          enemy.velocityY = -10;
          enemy.isGrounded = false;
        }
        enemy.x += enemy.velocityX;
      } else {
        enemy.x += enemy.velocityX;
        if (enemy.range > 0 && Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;
      }

      // Gravidade para inimigos terrestres
      if (enemy.type !== 'fly') {
        enemy.velocityY = (enemy.velocityY || 0) + gravityValue;
        enemy.y += enemy.velocityY;
        enemy.isGrounded = false;
        g.platforms.forEach(plat => {
          if (!plat.isDestroyed && plat.type !== 'lava' && checkCollision(enemy, plat)) {
            if (enemy.velocityY >= 0 && (enemy.y + enemy.height) - plat.y < 10) {
              enemy.y = plat.y - enemy.height;
              enemy.velocityY = 0;
              enemy.isGrounded = true;
            } else {
              enemy.velocityX *= -1;
            }
          }
        });
      }

      if (checkCollision(p, enemy)) {
        if (p.velocityY > 0 && (p.y + p.height) - enemy.y < 15) {
          enemy.x = -2000;
          p.velocityY = -10;
          setScore(prev => prev + 150);
        } else if (p.invincibilityFrames === 0) {
          if (p.isLarge) {
            p.isLarge = false;
            p.height = 32;
            p.y += 16;
            p.invincibilityFrames = 90;
          } else {
            resetAfterDeath();
          }
        }
      }
    });

    g.coins.forEach(coin => {
      if (!coin.collected && checkCollision(p, coin)) {
        coin.collected = true;
        setScore(prev => prev + 100);
      }
    });

    if (checkCollision(p, g.goal)) setGameState('WIN');
    if (p.y > CANVAS_HEIGHT + 100) resetAfterDeath();

    const targetCameraX = p.x - CANVAS_WIDTH / 3;
    cameraX.current += (targetCameraX - cameraX.current) * 0.1;
    cameraX.current = Math.max(0, cameraX.current);

    render();
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, levelInfo]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas || !levelInfo) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fundo sólido (Sem rastros/ghosting)
    ctx.fillStyle = '#a5f3fc';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const camX = Math.floor(cameraX.current);

    // Parallax
    // Nuvens
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const cloudX = -(camX * 0.1) % 400;
    for (let i = -1; i < (CANVAS_WIDTH / 400) + 1; i++) {
      const x = i * 400 + cloudX;
      ctx.beginPath(); ctx.arc(x + 50, 100, 30, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 80, 100, 40, 0, Math.PI * 2); ctx.fill();
    }

    // Montanhas
    ctx.fillStyle = levelInfo.color + '44';
    const hillX = -(camX * 0.3) % 600;
    for (let i = -1; i < (CANVAS_WIDTH / 600) + 1; i++) {
      const x = i * 600 + hillX;
      ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x + 300, 300); ctx.lineTo(x + 600, 600); ctx.fill();
    }

    ctx.save();
    ctx.translate(-camX, 0);

    // Mundo Principal
    levelData.current.platforms.forEach(plat => {
      if (plat.isDestroyed) return;
      ctx.fillStyle = plat.type === 'lava' ? '#f97316' : (plat.type === 'grass' ? '#16a34a' : '#713f12');
      if (plat.type === 'breakable') ctx.fillStyle = '#78350f';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    });

    levelData.current.coins.forEach(c => {
      if (!c.collected) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(c.x + 10, c.y + 10, 8, 0, Math.PI * 2); ctx.fill();
      }
    });

    levelData.current.enemies.forEach(e => {
      if (e.x < -1000) return;
      ctx.fillStyle = e.type === 'stalker' ? '#dc2626' : '#4c1d95';
      ctx.fillRect(e.x, e.y, e.width, e.height);
    });

    const goal = levelData.current.goal;
    ctx.fillStyle = '#059669'; ctx.fillRect(goal.x, goal.y, 10, goal.height);

    const p = player.current;
    if (p.invincibilityFrames % 10 < 5) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(p.direction === 'right' ? p.x + 18 : p.x + 4, p.y + 8, 6, 6);
    }

    ctx.restore();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => handleKeyPress(e.key, true);
    const handleKeyUp = (e: KeyboardEvent) => handleKeyPress(e.key, false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  return (
    <div className="relative w-full h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full max-h-full bg-white shadow-2xl rounded" />

      {gameState === 'PLAYING' && (
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl text-white border border-white/10 shadow-xl">
            <h2 className="text-xs font-black tracking-widest uppercase opacity-60 mb-1">{levelInfo?.name || `Mundo ${currentLevelIdx + 1}`}</h2>
            <div className="flex gap-1 text-xl">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={i < lives ? "opacity-100" : "opacity-20"}>❤️</span>
              ))}
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl text-white font-mono text-2xl font-bold border border-white/10 shadow-xl">
            {score.toString().padStart(6, '0')}
          </div>
        </div>
      )}

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-lg">
          <h1 className="text-7xl md:text-8xl font-black text-white mb-8 italic tracking-tighter">
            SUPER <span className="text-cyan-400">GEMINI</span> BROS
          </h1>
          <button onClick={() => initLevel(0)} className="px-16 py-6 bg-cyan-600 text-white font-black text-3xl rounded-full transition-all hover:bg-cyan-500 hover:scale-110 active:scale-95 shadow-2xl">
            JOGAR AGORA
          </button>
        </div>
      )}

      {gameState === 'GENERATING' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
          <h2 className="text-cyan-400 font-bold tracking-widest animate-pulse">CRIANDO MUNDO...</h2>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center">
          <h2 className="text-8xl font-black text-white mb-8 italic">FIM DE JOGO</h2>
          <button onClick={() => { setScore(0); setLives(3); initLevel(0); }} className="px-12 py-5 bg-white text-red-950 font-black text-xl rounded-full hover:scale-105 transition-transform">
            TENTAR NOVAMENTE
          </button>
        </div>
      )}

      {gameState === 'WIN' && (
        <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center">
          <h2 className="text-7xl font-black text-white mb-4 italic">VITÓRIA!</h2>
          <div className="text-emerald-400 font-mono text-2xl mb-12">PONTOS: {score}</div>
          <button onClick={() => currentLevelIdx === 0 ? initLevel(1) : setGameState('START')} className="px-12 py-5 bg-white text-emerald-950 font-black text-xl rounded-full">
            {currentLevelIdx === 0 ? "PRÓXIMA FASE" : "MENU PRINCIPAL"}
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && <MobileControls onPress={handleKeyPress} />}
    </div>
  );
};

export default App;
