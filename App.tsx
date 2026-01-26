
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WALK_SPEED, JUMP_POWER, GRAVITY, FRICTION } from './constants';
import { generateLevelTheme } from './services/geminiService';
import MobileControls from './components/MobileControls';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('START');
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Game Objects Refs
  const player = useRef<Player>({
    x: 50, y: 500, width: 32, height: 32,
    velocityX: 0, velocityY: 0,
    isJumping: false, score: 0, lives: 3,
    direction: 'right'
  });
  
  const levelData = useRef<LevelData>({
    platforms: [],
    enemies: [],
    coins: [],
    goal: { x: 0, y: 0, width: 40, height: 100 },
    playerStart: { x: 50, y: 500 }
  });

  const cameraX = useRef(0);

  // Initialize Level
  const initLevel = useCallback(async () => {
    setGameState('GENERATING');
    const info = await generateLevelTheme();
    setLevelInfo(info);

    // Procedural Level Construction based on Theme
    const platforms: Platform[] = [
      { x: 0, y: 550, width: 1000, height: 50, type: 'solid' }, // Base ground
      { x: 200, y: 450, width: 150, height: 20, type: 'grass' },
      { x: 450, y: 380, width: 150, height: 20, type: 'grass' },
      { x: 700, y: 450, width: 150, height: 20, type: 'grass' },
      { x: 1000, y: 550, width: 500, height: 50, type: 'solid' },
      { x: 1200, y: 400, width: 100, height: 20, type: 'grass' },
      { x: 1400, y: 300, width: 100, height: 20, type: 'grass' },
      { x: 1700, y: 550, width: 2000, height: 50, type: 'solid' },
    ];

    const coins: Coin[] = [
      { x: 250, y: 400, width: 20, height: 20, collected: false },
      { x: 500, y: 330, width: 20, height: 20, collected: false },
      { x: 750, y: 400, width: 20, height: 20, collected: false },
      { x: 1250, y: 350, width: 20, height: 20, collected: false },
    ];

    const enemies: Enemy[] = [
      { x: 800, y: 520, width: 30, height: 30, velocityX: 2, type: 'patrol', range: 200, startX: 800 },
      { x: 1800, y: 520, width: 30, height: 30, velocityX: 3, type: 'patrol', range: 300, startX: 1800 },
    ];

    levelData.current = {
      platforms,
      coins,
      enemies,
      goal: { x: 3500, y: 450, width: 40, height: 100 },
      playerStart: { x: 50, y: 500 }
    };

    player.current = {
      ...player.current,
      x: 50, y: 500,
      velocityX: 0, velocityY: 0,
      lives: 3
    };
    setLives(3);
    setScore(0);
    cameraX.current = 0;
    setGameState('PLAYING');
  }, []);

  const handleKeyPress = (key: string, pressed: boolean) => {
    keysPressed.current[key] = pressed;
  };

  // Collision Helper (AABB)
  // Fix: GameObject type imported from types.ts to resolve "Cannot find name 'GameObject'" error.
  const checkCollision = (a: GameObject, b: GameObject) => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const p = player.current;
    const g = levelData.current;

    // Movement
    if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) {
      p.velocityX = -WALK_SPEED;
      p.direction = 'left';
    } else if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) {
      p.velocityX = WALK_SPEED;
      p.direction = 'right';
    } else {
      p.velocityX *= FRICTION;
    }

    // Jump
    if ((keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current[' ']) && !p.isJumping) {
      p.velocityY = JUMP_POWER;
      p.isJumping = true;
    }

    // Physics
    p.velocityY += levelInfo?.gravity ? (GRAVITY * levelInfo.gravity) : GRAVITY;
    p.x += p.velocityX;
    p.y += p.velocityY;

    // Platform Collision
    let onPlatform = false;
    g.platforms.forEach(plat => {
      if (checkCollision(p, plat)) {
        // Vertical Collision
        if (p.velocityY > 0 && p.y + p.height - p.velocityY <= plat.y) {
          p.y = plat.y - p.height;
          p.velocityY = 0;
          p.isJumping = false;
          onPlatform = true;
        } else if (p.velocityY < 0 && p.y - p.velocityY >= plat.y + plat.height) {
          p.y = plat.y + plat.height;
          p.velocityY = 0;
        } else {
          // Horizontal Collision
          if (p.velocityX > 0) p.x = plat.x - p.width;
          else if (p.velocityX < 0) p.x = plat.x + plat.width;
        }
      }
    });

    if (!onPlatform && p.y + p.height < CANVAS_HEIGHT) {
      p.isJumping = true;
    }

    // Enemy Collision & Logic
    g.enemies.forEach(enemy => {
      // Enemy Patrol
      enemy.x += enemy.velocityX;
      if (Math.abs(enemy.x - enemy.startX) > enemy.range) {
        enemy.velocityX *= -1;
      }

      if (checkCollision(p, enemy)) {
        // Stomp?
        if (p.velocityY > 0 && p.y + p.height - p.velocityY <= enemy.y) {
          enemy.x = -1000; // Remove enemy
          p.velocityY = -8;
          setScore(prev => prev + 100);
        } else {
          // Hit
          setLives(prev => {
            if (prev <= 1) {
              setGameState('GAME_OVER');
              return 0;
            }
            // Reset player position on hit
            p.x = Math.max(0, p.x - 100);
            p.y = 100;
            return prev - 1;
          });
        }
      }
    });

    // Coin Collection
    g.coins.forEach(coin => {
      if (!coin.collected && checkCollision(p, coin)) {
        coin.collected = true;
        setScore(prev => prev + 50);
      }
    });

    // Goal
    if (checkCollision(p, g.goal)) {
      setGameState('WIN');
    }

    // Death by falling
    if (p.y > CANVAS_HEIGHT + 100) {
      setGameState('GAME_OVER');
    }

    // Camera follow
    const targetCameraX = p.x - CANVAS_WIDTH / 2;
    cameraX.current += (targetCameraX - cameraX.current) * 0.1;
    cameraX.current = Math.max(0, cameraX.current);

    render();
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, levelInfo]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = levelInfo?.color ? `${levelInfo.color}22` : '#eef2ff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-cameraX.current, 0);

    // Draw Platforms
    levelData.current.platforms.forEach(plat => {
      ctx.fillStyle = levelInfo?.color || '#3b82f6';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      
      // Top detail
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    });

    // Draw Coins
    levelData.current.coins.forEach(coin => {
      if (!coin.collected) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.stroke();
      }
    });

    // Draw Enemies
    levelData.current.enemies.forEach(enemy => {
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      // Eyes
      ctx.fillStyle = 'white';
      ctx.fillRect(enemy.x + 5, enemy.y + 5, 5, 5);
      ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 5, 5, 5);
    });

    // Draw Goal
    const goal = levelData.current.goal;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(goal.x, goal.y, 8, goal.height); // Pole
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(goal.x, goal.y);
    ctx.lineTo(goal.x + 40, goal.y + 20);
    ctx.lineTo(goal.x, goal.y + 40);
    ctx.fill();

    // Draw Player
    const p = player.current;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(p.x, p.y, p.width, p.height);
    // Player details
    ctx.fillStyle = 'white';
    const eyeOffset = p.direction === 'right' ? 20 : 5;
    ctx.fillRect(p.x + eyeOffset, p.y + 5, 6, 6);

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

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        // Aspect ratio locked scaling could be done here
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden font-sans">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full max-h-full shadow-2xl bg-white"
      />

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm p-4 rounded-xl text-white border border-white/20">
            <h2 className="text-xl font-bold">{levelInfo?.name || 'Level 1'}</h2>
            <p className="text-sm opacity-80">{levelInfo?.theme}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/50 backdrop-blur-sm px-6 py-2 rounded-full text-white font-bold text-2xl border border-white/20">
              {score.toString().padStart(6, '0')}
            </div>
            <div className="flex gap-2">
              {[...Array(lives)].map((_, i) => (
                <div key={i} className="text-red-500 text-2xl">❤️</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-6xl font-black text-white mb-4 tracking-tighter italic">SUPER <span className="text-blue-500">GEMINI</span> BROS</h1>
          <p className="text-white/60 mb-8 max-w-md">Uma aventura de plataforma gerada por IA. Explore mundos infinitos com física responsiva.</p>
          <button
            onClick={initLevel}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-2xl rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20"
          >
            START ADVENTURE
          </button>
        </div>
      )}

      {gameState === 'GENERATING' && (
        <div className="absolute inset-0 bg-blue-900/90 flex flex-col items-center justify-center p-8 text-center z-50">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-3xl font-bold text-white mb-2 italic">GENERATING WORLD...</h2>
          <p className="text-blue-200">Gemini is crafting a unique dimension for you.</p>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center p-8 text-center z-50">
          <h2 className="text-6xl font-black text-white mb-4 italic">GAME OVER</h2>
          <p className="text-red-200 mb-8">You fell into the abyss or were caught by the void.</p>
          <div className="flex gap-4">
             <button
              onClick={initLevel}
              className="px-8 py-3 bg-white text-red-900 font-bold rounded-full hover:bg-red-100 transition-all"
            >
              TRY AGAIN
            </button>
            <button
              onClick={() => setGameState('START')}
              className="px-8 py-3 bg-red-700 text-white font-bold rounded-full hover:bg-red-600 transition-all"
            >
              MENU
            </button>
          </div>
        </div>
      )}

      {gameState === 'WIN' && (
        <div className="absolute inset-0 bg-green-600/90 flex flex-col items-center justify-center p-8 text-center z-50">
          <h2 className="text-6xl font-black text-white mb-4 italic">WORLD CLEARED!</h2>
          <p className="text-green-100 mb-8">You mastered the physics of {levelInfo?.name}.</p>
          <div className="text-4xl font-bold text-white mb-8">FINAL SCORE: {score}</div>
          <button
            onClick={initLevel}
            className="px-12 py-4 bg-white text-green-700 font-bold text-2xl rounded-full hover:bg-green-50 transition-all shadow-2xl"
          >
            NEXT WORLD
          </button>
        </div>
      )}

      {/* Mobile Controls Layer */}
      {gameState === 'PLAYING' && <MobileControls onPress={handleKeyPress} />}
    </div>
  );
};

export default App;
