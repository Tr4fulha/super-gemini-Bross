
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject, PowerUp } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WALK_SPEED, JUMP_POWER, GRAVITY, FALL_GRAVITY_MULT, FRICTION, PREDEFINED_LEVELS } from './constants';
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
    x: 50, y: 300, width: 24, height: 32,
    velocityX: 0, velocityY: 0,
    isJumping: false, score: 0, lives: 3,
    direction: 'right', isLarge: false, invincibilityFrames: 0
  });
  
  const levelData = useRef<LevelData>({
    platforms: [], enemies: [], coins: [], powerUps: [],
    goal: { x: 0, y: 0, width: 40, height: 100 },
    playerStart: { x: 50, y: 300 }
  });

  const cameraX = useRef(0);

  const initLevel = useCallback(async (levelIdx: number = 0) => {
    keysPressed.current = {};
    const info = PREDEFINED_LEVELS[levelIdx] || PREDEFINED_LEVELS[0];
    setLevelInfo(info);
    setCurrentLevelIdx(levelIdx);

    let platforms: Platform[] = [];
    let coins: Coin[] = [];
    let enemies: Enemy[] = [];
    let powerUps: PowerUp[] = [];
    let goal: Goal = { x: 0, y: 0, width: 40, height: 100 };

    if (levelIdx === 0) {
      // Nível 1: Floresta Esmeralda
      platforms = [
        { x: 0, y: 400, width: 1400, height: 50, type: 'solid' },
        { x: 400, y: 280, width: 64, height: 32, type: 'breakable' },
        { x: 464, y: 280, width: 64, height: 32, type: 'breakable' },
        { x: 528, y: 280, width: 64, height: 32, type: 'breakable' },
        { x: 700, y: 180, width: 200, height: 24, type: 'grass' },
        { x: 1550, y: 400, width: 1200, height: 50, type: 'solid' },
        { x: 1400, y: 430, width: 150, height: 20, type: 'lava' },
        { x: 1800, y: 280, width: 150, height: 32, type: 'breakable' },
        { x: 2800, y: 400, width: 1000, height: 50, type: 'solid' },
      ];
      coins = [{ x: 415, y: 240, width: 20, height: 20, collected: false }];
      powerUps = [{ x: 480, y: 240, width: 24, height: 24, type: 'mushroom', collected: false }];
      enemies = [{ x: 850, y: 370, width: 30, height: 30, velocityX: 2, velocityY: 0, type: 'patrol', range: 150, startX: 850 }];
      goal = { x: 3600, y: 300, width: 40, height: 100 };
    } else if (levelIdx === 1) {
      // Nível 2: Cavernas de Lava - Ajustado para ser alcançável
      platforms = [
        { x: 0, y: 400, width: 400, height: 50, type: 'solid' },
        { x: 400, y: 430, width: 900, height: 20, type: 'lava' },
        // Plataforma móvel 1: Agora começa com velocidade negativa para vir buscar o jogador
        { x: 480, y: 330, width: 100, height: 24, type: 'moving', velocityX: -2, velocityY: 0, range: 120, startX: 480, startY: 330 },
        // Plataforma móvel 2: Ponte intermediária
        { x: 800, y: 260, width: 100, height: 24, type: 'moving', velocityX: 2, velocityY: 0, range: 100, startX: 800, startY: 260 },
        
        { x: 1200, y: 400, width: 1200, height: 50, type: 'solid' },
        { x: 2400, y: 430, width: 1100, height: 20, type: 'lava' },
        // Plataforma móvel 3: Vertical ajustada
        { x: 2550, y: 320, width: 100, height: 24, type: 'moving', velocityX: 0, velocityY: 2.5, range: 80, startX: 2550, startY: 320 },
        // Plataforma móvel 4: Horizontal final
        { x: 2900, y: 230, width: 100, height: 24, type: 'moving', velocityX: -2, velocityY: 0, range: 150, startX: 2900, startY: 230 },
        
        { x: 3500, y: 400, width: 800, height: 50, type: 'solid' },
      ];
      enemies = [{ x: 1500, y: 370, width: 30, height: 30, velocityX: 3, velocityY: 0, type: 'patrol', range: 400, startX: 1500 }];
      goal = { x: 4100, y: 300, width: 40, height: 100 };
    } else if (levelIdx === 2) {
      // Nível 3: Abismo de Safira
      platforms = [
        { x: 0, y: 400, width: 600, height: 50, type: 'solid' },
        { x: 650, y: 320, width: 100, height: 24, type: 'moving', velocityX: 0, velocityY: 2, range: 100, startX: 650, startY: 320 },
        { x: 950, y: 220, width: 100, height: 24, type: 'moving', velocityX: 2, velocityY: 0, range: 150, startX: 950, startY: 220 },
        { x: 1400, y: 400, width: 2000, height: 50, type: 'solid' },
      ];
      enemies = [{ x: 1800, y: 370, width: 30, height: 30, velocityX: 1.5, velocityY: 0, type: 'patrol', range: 300, startX: 1800 }];
      goal = { x: 3200, y: 300, width: 40, height: 100 };
    } else if (levelIdx === 3) {
      // Nível 4: Fortaleza Espectral
      platforms = [
        { x: 0, y: 400, width: 800, height: 50, type: 'solid' },
        { x: 800, y: 430, width: 600, height: 20, type: 'lava' },
        { x: 850, y: 300, width: 100, height: 24, type: 'moving', velocityX: -2, velocityY: 0, range: 100, startX: 850, startY: 300 },
        { x: 1150, y: 220, width: 100, height: 24, type: 'moving', velocityX: 2, velocityY: 0, range: 100, startX: 1150, startY: 220 },
        { x: 1400, y: 400, width: 1500, height: 50, type: 'solid' },
      ];
      enemies = [{ x: 1600, y: 370, width: 30, height: 30, velocityX: 2.5, velocityY: 0, type: 'stalker', range: 0, startX: 1600 }];
      goal = { x: 2800, y: 300, width: 40, height: 100 };
    }

    levelData.current = { platforms, coins, enemies, powerUps, goal, playerStart: { x: 50, y: 350 } };
    player.current = { ...player.current, x: 50, y: 350, velocityX: 0, velocityY: 0, isLarge: false, height: 32, invincibilityFrames: 0 };
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
      keysPressed.current = {};
      return prev - 1;
    });
  };

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const p = player.current;
    const g = levelData.current;
    const gravityValue = GRAVITY * (levelInfo?.gravity || 1.0);

    if (p.invincibilityFrames > 0) p.invincibilityFrames--;

    // 1. ATUALIZAR PLATAFORMAS MÓVEIS
    g.platforms.forEach(plat => {
      if (plat.type === 'moving' && plat.startX !== undefined && plat.startY !== undefined) {
        if (plat.velocityX) {
          plat.x += plat.velocityX;
          if (Math.abs(plat.x - plat.startX) > (plat.range || 0)) plat.velocityX *= -1;
        }
        if (plat.velocityY) {
          plat.y += plat.velocityY;
          if (Math.abs(plat.y - plat.startY) > (plat.range || 0)) plat.velocityY *= -1;
        }
      }
    });

    // 2. INPUT DO JOGADOR
    if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) {
      p.velocityX = Math.max(p.velocityX - 0.7, -WALK_SPEED);
      p.direction = 'left';
    } else if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) {
      p.velocityX = Math.min(p.velocityX + 0.7, WALK_SPEED);
      p.direction = 'right';
    } else {
      p.velocityX *= FRICTION;
      if (Math.abs(p.velocityX) < 0.1) p.velocityX = 0;
    }

    const jumpHeld = !!(keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current[' ']);
    if (jumpHeld && !p.isJumping) {
      p.velocityY = JUMP_POWER;
      p.isJumping = true;
    }
    if (!jumpHeld && p.velocityY < 0) {
      p.velocityY += gravityValue * 2.5;
    }

    const currentGravity = p.velocityY > 0 ? gravityValue * FALL_GRAVITY_MULT : gravityValue;
    p.velocityY += currentGravity;
    if (p.velocityY > 15) p.velocityY = 15;

    p.x += p.velocityX;
    p.y += p.velocityY;

    // 3. COLISÕES DE PLATAFORMA
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

          // EFEITO ESTEIRA: Mover jogador com a plataforma
          if (plat.type === 'moving' && plat.velocityX) {
            p.x += plat.velocityX;
          }
        } else if (minOverlap === overlapBottom && p.velocityY <= 0) {
          p.y = plat.y + plat.height;
          p.velocityY = 0.5;
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

    if (!onPlatform && p.y + p.height < CANVAS_HEIGHT + 100) p.isJumping = true;

    // 4. POWERUPS, INIMIGOS E MOEDAS
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

    g.enemies.forEach(enemy => {
      if (enemy.x < -1000) return;
      if (enemy.type === 'fly') {
        enemy.y += Math.sin(Date.now() / 250) * 1.5;
        enemy.x += enemy.velocityX;
        if (Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;
      } else if (enemy.type === 'stalker') {
        const dist = Math.abs(p.x - enemy.x);
        if (dist < 250) enemy.velocityX = p.x > enemy.x ? 2.0 : -2.0;
        else enemy.velocityX *= 0.95;
        enemy.x += enemy.velocityX;
      } else {
        enemy.x += enemy.velocityX;
        if (enemy.range > 0 && Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;
      }

      if (enemy.type !== 'fly') {
        enemy.velocityY = (enemy.velocityY || 0) + gravityValue;
        enemy.y += enemy.velocityY;
        g.platforms.forEach(plat => {
          if (!plat.isDestroyed && plat.type !== 'lava' && checkCollision(enemy, plat)) {
            if (enemy.velocityY >= 0 && (enemy.y + enemy.height) - plat.y < 12) {
              enemy.y = plat.y - enemy.height;
              enemy.velocityY = 0;
            } else {
              enemy.velocityX *= -1;
            }
          }
        });
      }

      if (checkCollision(p, enemy)) {
        if (p.velocityY > 0 && (p.y + p.height) - enemy.y < 15) {
          enemy.x = -2000;
          p.velocityY = JUMP_POWER * 0.7;
          setScore(prev => prev + 150);
        } else if (p.invincibilityFrames === 0) {
          if (p.isLarge) {
            p.isLarge = false;
            p.height = 32;
            p.y += 16;
            p.invincibilityFrames = 90;
          } else resetAfterDeath();
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

    const targetCameraX = p.x - CANVAS_WIDTH / 2.5;
    cameraX.current += (targetCameraX - cameraX.current) * 0.1;
    cameraX.current = Math.max(0, cameraX.current);

    render();
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, levelInfo, initLevel]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas || !levelInfo) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = levelInfo.color === '#3b82f6' ? '#082f49' : '#bae6fd'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const camX = Math.floor(cameraX.current);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const cloudX = -(camX * 0.1) % 400;
    for (let i = -1; i < (CANVAS_WIDTH / 400) + 2; i++) {
      const x = i * 400 + cloudX;
      ctx.beginPath(); ctx.arc(x + 50, 60, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 80, 60, 30, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = levelInfo.color + '33';
    const hillX = -(camX * 0.25) % 600;
    for (let i = -1; i < (CANVAS_WIDTH / 600) + 2; i++) {
      const x = i * 600 + hillX;
      ctx.beginPath(); ctx.moveTo(x, 450); ctx.lineTo(x + 300, 200); ctx.lineTo(x + 600, 450); ctx.fill();
    }

    ctx.save();
    ctx.translate(-camX, 0);

    levelData.current.platforms.forEach(plat => {
      if (plat.isDestroyed) return;
      ctx.fillStyle = plat.type === 'lava' ? '#f97316' : (plat.type === 'grass' || plat.type === 'moving' ? '#16a34a' : '#713f12');
      if (plat.type === 'breakable') ctx.fillStyle = '#78350f';
      if (plat.type === 'moving') ctx.fillStyle = '#22c55e'; // Verde mais brilhante para móveis
      
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      if (plat.type !== 'lava') {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
      }
    });

    levelData.current.coins.forEach(c => {
      if (!c.collected) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(c.x + 10, c.y + 10, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(c.x + 8, c.y + 6, 2, 8);
      }
    });

    levelData.current.enemies.forEach(e => {
      if (e.x < -1000) return;
      ctx.fillStyle = e.type === 'stalker' ? '#dc2626' : (e.type === 'fly' ? '#db2777' : '#4c1d95');
      ctx.fillRect(e.x, e.y, e.width, e.height);
      ctx.fillStyle = 'white'; ctx.fillRect(e.velocityX > 0 ? e.x + 20 : e.x + 4, e.y + 4, 6, 6);
    });

    const goal = levelData.current.goal;
    ctx.fillStyle = '#059669'; ctx.fillRect(goal.x, goal.y, 8, goal.height);
    ctx.fillStyle = '#10b981'; ctx.fillRect(goal.x - 4, goal.y, 16, 12);

    const p = player.current;
    if (p.invincibilityFrames % 10 < 5) {
      ctx.fillStyle = p.isLarge ? '#ef4444' : '#dc2626';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = 'white'; ctx.fillRect(p.direction === 'right' ? p.x + 16 : p.x + 2, p.y + 6, 6, 6);
      ctx.fillStyle = '#991b1b'; ctx.fillRect(p.x - 2, p.y, p.width + 4, 6);
    }

    ctx.restore();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => handleKeyPress(e.key, true);
    const handleKeyUp = (e: KeyboardEvent) => handleKeyPress(e.key, false);
    const handleBlur = () => { keysPressed.current = {}; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  const hasNextLevel = currentLevelIdx < PREDEFINED_LEVELS.length - 1;

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden touch-none">
      <div className="relative w-full h-full flex items-center justify-center p-0 m-0 overflow-hidden">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full max-h-full object-contain shadow-2xl bg-sky-200" style={{ width: '100vw', height: '100vh', objectFit: 'contain' }} />
        {gameState === 'PLAYING' && (
          <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-start pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl text-white border border-white/10">
              <h2 className="text-[10px] font-black uppercase tracking-tighter opacity-50">{levelInfo?.name}</h2>
              <div className="flex gap-1 text-lg">
                {[...Array(3)].map((_, i) => (<span key={i} className={i < lives ? "opacity-100" : "opacity-20"}>❤️</span>))}
              </div>
            </div>
            <div className="bg-black/40 backdrop-blur-md px-5 py-2 rounded-xl text-white font-mono text-xl font-bold border border-white/10">
              {score.toString().padStart(6, '0')}
            </div>
          </div>
        )}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <h1 className="text-5xl md:text-8xl font-black text-white mb-8 italic tracking-tighter drop-shadow-lg">SUPER <span className="text-cyan-400">GEMINI</span> BROS</h1>
            <button onClick={() => initLevel(0)} className="px-12 py-5 bg-cyan-600 text-white font-black text-2xl rounded-full transition-all hover:bg-cyan-500 hover:scale-110 active:scale-95 shadow-xl">JOGAR AGORA</button>
            <p className="mt-6 text-white/40 text-xs font-mono uppercase tracking-[0.3em]">Use WASD ou Setas para mover</p>
          </div>
        )}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-6xl md:text-8xl font-black text-white mb-8 italic">FIM DE JOGO</h2>
            <button onClick={() => { setScore(0); setLives(3); initLevel(currentLevelIdx); }} className="px-12 py-4 bg-white text-red-950 font-black text-xl rounded-full hover:scale-105">TENTAR NOVAMENTE</button>
          </div>
        )}
        {gameState === 'WIN' && (
          <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-6xl md:text-7xl font-black text-white mb-4 italic">VITÓRIA!</h2>
            <div className="text-emerald-400 font-mono text-2xl mb-12">PONTOS: {score}</div>
            <button onClick={() => hasNextLevel ? initLevel(currentLevelIdx + 1) : setGameState('START')} className="px-12 py-4 bg-white text-emerald-950 font-black text-xl rounded-full">{hasNextLevel ? "PRÓXIMA FASE" : "MENU PRINCIPAL"}</button>
          </div>
        )}
        {gameState === 'PLAYING' && <MobileControls onPress={handleKeyPress} />}
      </div>
    </div>
  );
};

export default App;
