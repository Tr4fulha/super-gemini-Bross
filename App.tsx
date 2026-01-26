
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

    let platforms: Platform[] = [];
    let coins: Coin[] = [];
    let enemies: Enemy[] = [];
    let powerUps: PowerUp[] = [];
    let goal: Goal = { x: 0, y: 0, width: 40, height: 100 };

    if (levelIdx === 0) {
      // Level 1: Sky Meadows + Secret Cloud Area
      platforms = [
        { x: 0, y: 540, width: 1200, height: 60, type: 'solid' },
        { x: 400, y: 410, width: 64, height: 32, type: 'breakable' },
        { x: 464, y: 410, width: 64, height: 32, type: 'breakable' }, // Contém Mushroom
        { x: 528, y: 410, width: 64, height: 32, type: 'breakable' },
        { x: 1300, y: 540, width: 800, height: 60, type: 'solid' },
        { x: 1450, y: 380, width: 120, height: 24, type: 'grass' },
        { x: 1550, y: 150, width: 300, height: 24, type: 'grass' }, // NUVEM SECRETA
        { x: 2200, y: 540, width: 1500, height: 60, type: 'solid' },
      ];
      coins = [
        { x: 415, y: 370, width: 20, height: 20, collected: false },
        { x: 1600, y: 100, width: 20, height: 20, collected: false },
        { x: 1700, y: 100, width: 20, height: 20, collected: false },
      ];
      powerUps = [{ x: 480, y: 340, width: 24, height: 24, type: 'mushroom', collected: false }];
      enemies = [
        { x: 800, y: 510, width: 30, height: 30, velocityX: 2, type: 'patrol', range: 150, startX: 800 },
        { x: 2500, y: 510, width: 30, height: 30, velocityX: 3, type: 'patrol', range: 300, startX: 2500 },
      ];
      goal = { x: 3400, y: 440, width: 40, height: 100 };
    } else {
      // Level 2: Magma Chambers + Hidden Path
      platforms = [
        { x: 0, y: 540, width: 400, height: 60, type: 'solid' },
        { x: 400, y: 580, width: 800, height: 20, type: 'lava' },
        { x: 550, y: 440, width: 120, height: 24, type: 'grass' },
        { x: 850, y: 380, width: 120, height: 24, type: 'grass' },
        { x: 1200, y: 540, width: 1000, height: 60, type: 'solid' },
        { x: 1500, y: 420, width: 192, height: 32, type: 'breakable' }, // Esconde atalho
        { x: 2200, y: 580, width: 1000, height: 20, type: 'lava' },
        { x: 2300, y: 420, width: 120, height: 24, type: 'grass' },
        { x: 2600, y: 420, width: 120, height: 24, type: 'grass' },
        { x: 3200, y: 540, width: 800, height: 60, type: 'solid' },
      ];
      coins = [
        { x: 1550, y: 380, width: 20, height: 20, collected: false },
        { x: 1600, y: 380, width: 20, height: 20, collected: false },
      ];
      powerUps = [{ x: 580, y: 380, width: 24, height: 24, type: 'mushroom', collected: false }];
      enemies = [
        { x: 1400, y: 510, width: 30, height: 30, velocityX: 4, type: 'patrol', range: 200, startX: 1400 },
        { x: 2400, y: 300, width: 30, height: 30, velocityX: 2, type: 'fly', range: 150, startX: 2400 },
      ];
      goal = { x: 3700, y: 440, width: 40, height: 100 };
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

    // Physics
    p.velocityY += GRAVITY * (levelInfo?.gravity || 1.0);
    p.x += p.velocityX;
    p.y += p.velocityY;

    // Platform Collisions
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

    // PowerUps
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

    // Enemies
    g.enemies.forEach(enemy => {
      if (enemy.x < -500) return;
      enemy.x += enemy.velocityX;
      if (enemy.type === 'fly') enemy.y += Math.sin(Date.now() / 200) * 2;
      if (Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;

      if (checkCollision(p, enemy)) {
        if (p.velocityY > 0 && (p.y + p.height) - enemy.y < 15) {
          enemy.x = -1000;
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

    // NO MORE GHOSTING: Solid background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#a5f3fc');
    bgGrad.addColorStop(1, levelInfo.color);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-Math.floor(cameraX.current), 0);

    // Platforms
    levelData.current.platforms.forEach(plat => {
      if (plat.isDestroyed) return;
      if (plat.type === 'lava') {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(plat.x + (Date.now() % plat.width), plat.y, 20, 4);
      } else if (plat.type === 'breakable') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(plat.x + 4, plat.y + 4, plat.width - 8, plat.height - 8);
      } else {
        ctx.fillStyle = plat.type === 'grass' ? '#16a34a' : '#713f12';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
      }
    });

    // PowerUps
    levelData.current.powerUps.forEach(pu => {
      if (!pu.collected) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(pu.x + 12, pu.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillRect(pu.x + 8, pu.y + 6, 8, 8);
      }
    });

    // Coins
    levelData.current.coins.forEach(coin => {
      if (!coin.collected) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(coin.x + 10, coin.y + 10, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Enemies
    levelData.current.enemies.forEach(enemy => {
      if (enemy.x < -500) return;
      ctx.fillStyle = enemy.type === 'fly' ? '#db2777' : '#4c1d95';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(enemy.x + 4, enemy.y + 4, 6, 6);
      ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 4, 6, 6);
    });

    // Goal
    const goal = levelData.current.goal;
    ctx.fillStyle = '#059669';
    ctx.fillRect(goal.x, goal.y, 8, goal.height);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(goal.x, goal.y);
    ctx.lineTo(goal.x + 40, goal.y + 20);
    ctx.lineTo(goal.x, goal.y + 40);
    ctx.fill();

    // Player
    const p = player.current;
    if (p.invincibilityFrames === 0 || p.invincibilityFrames % 10 < 5) {
      ctx.fillStyle = p.isLarge ? '#ef4444' : '#dc2626';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = 'white';
      const eyeX = p.direction === 'right' ? p.x + p.width - 10 : p.x + 4;
      ctx.fillRect(eyeX, p.y + 8, 6, 6);
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
            <h2 className="text-xs font-black tracking-widest uppercase opacity-60 mb-2">Mundo {currentLevelIdx + 1}</h2>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-2xl transition-all duration-300 ${i < lives ? "scale-100 opacity-100" : "scale-75 opacity-20 grayscale"}`}>❤️</span>
              ))}
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-2xl text-white font-mono text-3xl font-bold border border-white/10 shadow-xl">
            {score.toString().padStart(6, '0')}
          </div>
        </div>
      )}

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-lg">
          <h1 className="text-8xl font-black text-white mb-4 italic tracking-tighter drop-shadow-2xl">
            SUPER <span className="text-cyan-400">GEMINI</span> BROS
          </h1>
          <p className="text-cyan-200/60 mb-12 font-mono uppercase tracking-[0.5em] text-sm">Powered by Artificial Intelligence</p>
          <button onClick={() => initLevel(0)} className="group relative px-16 py-6 bg-cyan-600 text-white font-black text-3xl rounded-full transition-all hover:bg-cyan-500 hover:scale-110 active:scale-95 shadow-[0_0_50px_-10px_rgba(6,182,212,0.6)]">
            NEW ADVENTURE
          </button>
        </div>
      )}

      {gameState === 'GENERATING' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
          <div className="w-20 h-20 border-8 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-8" />
          <h2 className="text-cyan-400 font-black tracking-[0.6em] text-lg animate-pulse">GENERATING REALITY...</h2>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center backdrop-blur-xl">
          <h2 className="text-9xl font-black text-white mb-8 italic tracking-tighter">GAME OVER</h2>
          <button onClick={() => { setScore(0); setLives(3); initLevel(0); }} className="mt-4 px-16 py-5 bg-white text-red-950 font-black text-2xl rounded-full hover:scale-105 transition-transform shadow-2xl">
            RETRY MISSION
          </button>
        </div>
      )}

      {gameState === 'WIN' && (
        <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center text-center backdrop-blur-xl">
          <h2 className="text-8xl font-black text-white mb-4 italic">VICTORY!</h2>
          <div className="text-emerald-400 font-mono text-3xl mb-12">FINAL SCORE: {score}</div>
          {currentLevelIdx === 0 ? (
             <button onClick={() => initLevel(1)} className="px-16 py-6 bg-white text-emerald-950 font-black text-2xl rounded-full shadow-2xl hover:scale-110 transition-transform">
              CONTINUE TO WORLD 2
            </button>
          ) : (
            <button onClick={() => setGameState('START')} className="px-16 py-6 bg-white text-emerald-950 font-black text-2xl rounded-full">
              COMPLETE MISSION
            </button>
          )}
        </div>
      )}

      {gameState === 'PLAYING' && <MobileControls onPress={handleKeyPress} />}
    </div>
  );
};

export default App;
