
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject, PowerUp, Projectile, Star, Particle } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WALK_SPEED, JUMP_POWER, GRAVITY, FALL_GRAVITY_MULT, FRICTION, PREDEFINED_LEVELS } from './constants';
import MobileControls from './components/MobileControls';

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [gameState, setGameState] = useState<GameState>('START');
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [shooterWave, setShooterWave] = useState(1);
  
  // Duração dos Power-ups em frames (60fps)
  const DURATION_SHIELD = 720; // 12 segundos
  const DURATION_TRIPLE = 1080; // 18 segundos
  const DURATION_DRONE = 1500; // 25 segundos
  const MAX_PARTICLES = 150; // Limite para evitar lag

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  const player = useRef<Player>({
    x: 50, y: 300, width: 24, height: 32,
    velocityX: 0, velocityY: 0,
    isJumping: false, score: 0, lives: 3,
    direction: 'right', isLarge: false, invincibilityFrames: 0,
    powerLevel: 1, shieldFrames: 0, maxShieldFrames: DURATION_SHIELD,
    hasDrone: false, droneFrames: 0, maxDroneFrames: DURATION_DRONE,
    tripleShotFrames: 0, maxTripleShotFrames: DURATION_TRIPLE, tilt: 0
  });
  
  const levelData = useRef<LevelData>({
    platforms: [], enemies: [], coins: [], powerUps: [],
    goal: { x: 0, y: 0, width: 40, height: 100 },
    playerStart: { x: 50, y: 300 }
  });

  const projectiles = useRef<Projectile[]>([]);
  const stars = useRef<Star[]>([]);
  const particles = useRef<Particle[]>([]);
  const lastShotTime = useRef<number>(0);
  const cameraX = useRef(0);
  const screenShake = useRef(0);

  const createExplosion = (x: number, y: number, color: string, count: number = 8, gravity: number = 0) => {
    if (particles.current.length > MAX_PARTICLES) return;
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0, color,
        size: 1 + Math.random() * 3,
        gravity
      });
    }
  };

  const createThruster = (x: number, y: number, color?: string) => {
    if (particles.current.length >= MAX_PARTICLES) return;
    particles.current.push({
      x, y,
      vx: (Math.random() - 0.5) * 1,
      vy: 1.5 + Math.random() * 1.5,
      life: 0.4,
      color: color || (Math.random() > 0.6 ? '#f87171' : '#fbbf24'),
      size: 1 + Math.random() * 1.5
    });
  };

  const initStars = () => {
    const s: Star[] = [];
    for (let i = 0; i < 50; i++) {
      s.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 0.5 + Math.random() * 1.2,
        speed: 0.2 + Math.random() * 2
      });
    }
    stars.current = s;
  };

  const spawnWave = useCallback((wave: number) => {
    const enemies: Enemy[] = [];
    setShooterWave(wave);
    projectiles.current = [];

    if (wave === 1) {
      const rows = 3;
      const cols = 6;
      const paddingX = 85;
      const paddingY = 65;
      const startX = (CANVAS_WIDTH - (cols * paddingX)) / 2 + 40;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          enemies.push({
            x: startX + c * paddingX, y: -200 - (r * 60),
            targetX: startX + c * paddingX, targetY: 60 + r * paddingY,
            width: 32, height: 24, velocityX: 1.2, velocityY: 1.2,
            type: 'invader', range: 0, startX: 0, startY: 0, health: 1, maxHealth: 1, phase: 'entry',
            sineOffset: Math.random() * Math.PI * 2
          });
        }
      }
    } else if (wave % 2 === 0) {
      const count = Math.min(15, 8 + wave);
      for (let i = 0; i < count; i++) {
        const fromLeft = i % 2 === 0;
        enemies.push({
          x: fromLeft ? -100 - (i * 40) : CANVAS_WIDTH + 100 + (i * 40),
          y: 40 + (i * 35) % 200,
          targetX: fromLeft ? 100 + (i * 30) : CANVAS_WIDTH - 100 - (i * 30),
          targetY: 80 + (i * 15),
          width: 28, height: 20, velocityX: fromLeft ? 1.8 : -1.8, velocityY: 0.4,
          type: 'scout', range: 100, startX: 0, startY: 0, health: 1, maxHealth: 1, phase: 'entry',
          sineOffset: Math.random() * Math.PI * 2
        });
      }
    } else {
      const count = Math.min(5, 1 + Math.floor(wave / 2));
      for (let i = 0; i < count; i++) {
        enemies.push({
          x: (CANVAS_WIDTH / (count + 1)) * (i + 1),
          y: -150 - (i * 80),
          targetX: (CANVAS_WIDTH / (count + 1)) * (i + 1),
          targetY: 100 + (i % 2 * 40),
          width: 50, height: 38, velocityX: 0.6, velocityY: 0.6,
          type: 'bomber', range: 60, startX: 0, startY: 0, health: 3 + wave, maxHealth: 3 + wave, phase: 'entry',
          sineOffset: Math.random() * Math.PI * 2
        });
      }
    }
    levelData.current.enemies = [...levelData.current.enemies, ...enemies];
  }, []);

  const initShooter = useCallback(() => {
    setGameState('PLAYING');
    setScore(0);
    setLives(3);
    initStars();
    projectiles.current = [];
    particles.current = [];
    levelData.current.powerUps = [];
    levelData.current.enemies = [];
    keysPressed.current = {};
    
    player.current = {
      x: CANVAS_WIDTH / 2 - 15,
      y: CANVAS_HEIGHT - 60,
      width: 30, height: 30, velocityX: 0, velocityY: 0,
      isJumping: false, score: 0, lives: 3,
      direction: 'right', isLarge: false, invincibilityFrames: 0,
      powerLevel: 1, shieldFrames: 0, maxShieldFrames: DURATION_SHIELD,
      hasDrone: false, droneFrames: 0, maxDroneFrames: DURATION_DRONE,
      tripleShotFrames: 0, maxTripleShotFrames: DURATION_TRIPLE, tilt: 0
    };

    spawnWave(1);
  }, [spawnWave]);

  const handleKeyPress = (key: string, pressed: boolean) => {
    if (gameState === 'PLAYING') {
      keysPressed.current[key] = pressed;
    } else {
      keysPressed.current = {};
    }
  };

  const checkCollision = (a: GameObject, b: GameObject) => {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  };

  const spawnPowerUp = (x: number, y: number) => {
    if (Math.random() < 0.28) {
      const types: PowerUp['type'][] = ['triple_shot', 'shield', 'drone', 'life'];
      const type = types[Math.floor(Math.random() * types.length)];
      levelData.current.powerUps.push({
        x, y, width: 26, height: 26, collected: false, type, velocityY: 1.2
      });
    }
  };

  const updateShooter = useCallback(() => {
    if (gameState !== 'PLAYING') {
       keysPressed.current = {};
       return;
    }

    const p = player.current;
    const g = levelData.current;

    if (screenShake.current > 0) screenShake.current *= 0.82;

    const moveLeft = keysPressed.current['ArrowLeft'] || keysPressed.current['a'];
    const moveRight = keysPressed.current['ArrowRight'] || keysPressed.current['d'];
    const accel = 1.1;
    const maxSpeed = WALK_SPEED * 1.5;
    const friction = 0.82;

    if (moveLeft) { p.velocityX -= accel; p.tilt = Math.max(-0.4, p.tilt - 0.08); }
    else if (moveRight) { p.velocityX += accel; p.tilt = Math.min(0.4, p.tilt + 0.08); }
    else { p.velocityX *= friction; p.tilt *= 0.85; }
    
    p.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, p.velocityX));
    p.x += p.velocityX;
    p.x = Math.max(0, Math.min(CANVAS_WIDTH - p.width, p.x));

    const now = Date.now();
    const isShooting = keysPressed.current[' '] || keysPressed.current['ArrowUp'] || keysPressed.current['w'];
    if (isShooting && now - lastShotTime.current > 175) {
      screenShake.current = 1.0;
      const shotY = p.y - 12;
      const color = '#38bdf8';
      
      if (p.tripleShotFrames > 0) {
        projectiles.current.push({ x: p.x + p.width / 2 - 2, y: shotY, width: 4, height: 16, velocityY: -12, velocityX: 0, owner: 'player', color });
        projectiles.current.push({ x: p.x, y: shotY, width: 4, height: 16, velocityY: -11, velocityX: -2.0, owner: 'player', color });
        projectiles.current.push({ x: p.x + p.width - 4, y: shotY, width: 4, height: 16, velocityY: -11, velocityX: 2.0, owner: 'player', color });
      } else {
        projectiles.current.push({ x: p.x + p.width / 2 - 2, y: shotY, width: 4, height: 16, velocityY: -12, velocityX: 0, owner: 'player', color });
      }
      
      if (p.droneFrames > 0) {
         projectiles.current.push({ x: p.x - 35, y: p.y + 12, width: 4, height: 10, velocityY: -14, velocityX: 0, owner: 'drone', color: '#60a5fa' });
         projectiles.current.push({ x: p.x + p.width + 31, y: p.y + 12, width: 4, height: 10, velocityY: -14, velocityX: 0, owner: 'drone', color: '#60a5fa' });
      }
      lastShotTime.current = now;
    }

    stars.current.forEach(s => { s.y += s.speed; if (s.y > CANVAS_HEIGHT) s.y = 0; });

    createThruster(p.x + 8, p.y + p.height - 2);
    createThruster(p.x + p.width - 12, p.y + p.height - 2);
    if (p.droneFrames > 0) {
      createThruster(p.x - 30, p.y + 24, '#60a5fa');
      createThruster(p.x + p.width + 26, p.y + 24, '#60a5fa');
    }

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const part = particles.current[i];
      part.x += part.vx;
      part.y += part.vy;
      if (part.gravity) part.vy += part.gravity;
      part.life -= 0.03;
      if (part.life <= 0) particles.current.splice(i, 1);
    }

    for (let i = projectiles.current.length - 1; i >= 0; i--) {
      const proj = projectiles.current[i];
      proj.y += proj.velocityY;
      proj.x += proj.velocityX;
      if (proj.y < -50 || proj.y > CANVAS_HEIGHT + 50 || proj.x < -50 || proj.x > CANVAS_WIDTH + 50) {
        projectiles.current.splice(i, 1);
      }
    }

    let hitEdge = false;
    const lowerBound = CANVAS_HEIGHT - 130;
    g.enemies.forEach(e => {
      if (e.phase === 'entry' && e.targetX !== undefined && e.targetY !== undefined) {
        e.x += (e.targetX - e.x) * 0.04; e.y += (e.targetY - e.y) * 0.04;
        if (Math.abs(e.x - e.targetX) < 4 && Math.abs(e.y - e.targetY) < 4) e.phase = 'active';
      } else if (e.phase === 'active') {
        e.sineOffset = (e.sineOffset || 0) + 0.02;
        if (e.type === 'invader') {
          e.x += e.velocityX;
          if (e.x <= 15 || e.x + e.width >= CANVAS_WIDTH - 15) hitEdge = true;
          if (e.y > lowerBound) e.y -= 0.5;
        } else if (e.type === 'scout') {
          e.x += e.velocityX; e.y += Math.cos(e.sineOffset * 2.5) * 1.5;
          if (e.x <= 15 || e.x + e.width >= CANVAS_WIDTH - 15) e.velocityX *= -1;
          if (e.y > lowerBound) e.y -= 0.6;
        } else if (e.type === 'bomber') {
          e.x += Math.sin(e.sineOffset) * 1.4;
          if (e.y < lowerBound - 40) e.y += 0.3; else e.y -= 0.3;
        }
        if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;
        const shootChance = (e.type === 'bomber' ? 0.012 : 0.003) * (1 + shooterWave * 0.1);
        if (Math.random() < shootChance) {
          projectiles.current.push({ x: e.x + e.width / 2 - 2, y: e.y + e.height, width: 6, height: 10, velocityY: 4.5, velocityX: 0, owner: 'enemy', color: '#ef4444' });
        }
      }
    });

    if (hitEdge) {
      g.enemies.forEach(e => {
        if (e.type === 'invader' && e.phase === 'active') {
          e.velocityX *= -1;
          if (e.y < lowerBound - 20) e.y += 15; else e.y -= 5;
        }
      });
    }

    if (g.enemies.length === 0) { spawnWave(shooterWave + 1); }

    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      const pu = g.powerUps[i];
      pu.y += pu.velocityY || 1.4;
      if (checkCollision(p, pu)) {
        screenShake.current = 4;
        createExplosion(pu.x + pu.width/2, pu.y + pu.height/2, '#fff', 10);
        if (pu.type === 'triple_shot') { p.tripleShotFrames = DURATION_TRIPLE; p.maxTripleShotFrames = DURATION_TRIPLE; }
        if (pu.type === 'shield') { p.shieldFrames = DURATION_SHIELD; p.maxShieldFrames = DURATION_SHIELD; }
        if (pu.type === 'drone') { p.droneFrames = DURATION_DRONE; p.maxDroneFrames = DURATION_DRONE; p.hasDrone = true; }
        if (pu.type === 'life') setLives(l => Math.min(5, l + 1));
        g.powerUps.splice(i, 1);
        continue;
      }
      if (pu.y > CANVAS_HEIGHT) g.powerUps.splice(i, 1);
    }

    projectiles.current.forEach((proj, pi) => {
      if (proj.owner === 'player' || proj.owner === 'drone') {
        for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
          const enemy = g.enemies[ei];
          if (checkCollision(proj, enemy)) {
            enemy.health -= 1;
            enemy.hitFlash = 4;
            projectiles.current.splice(pi, 1);
            if (enemy.health <= 0) {
              screenShake.current = 2;
              createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#fbbf24', 12);
              spawnPowerUp(enemy.x, enemy.y);
              g.enemies.splice(ei, 1);
              setScore(s => s + (enemy.type === 'bomber' ? 500 : 100));
            }
            break;
          }
        }
      } else {
        if (p.invincibilityFrames === 0 && checkCollision(proj, p)) {
          projectiles.current.splice(pi, 1);
          if (p.shieldFrames > 0) {
            p.shieldFrames = 0; p.invincibilityFrames = 40;
            createExplosion(p.x + p.width/2, p.y + p.height/2, '#60a5fa', 15);
          } else {
            screenShake.current = 8;
            createExplosion(p.x + p.width/2, p.y + p.height/2, '#ef4444', 20, 0.1);
            p.invincibilityFrames = 100;
            setLives(l => { if (l <= 1) { setGameState('GAME_OVER'); return 0; } return l - 1; });
          }
        }
      }
    });

    if (p.invincibilityFrames > 0) p.invincibilityFrames--;
    if (p.shieldFrames > 0) p.shieldFrames--;
    if (p.tripleShotFrames > 0) p.tripleShotFrames--;
    if (p.droneFrames > 0) p.droneFrames--;

    renderShooter();
    requestRef.current = requestAnimationFrame(updateShooter);
  }, [gameState, shooterWave, spawnWave]);

  const renderShooter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (screenShake.current > 0) { ctx.translate((Math.random() - 0.5) * screenShake.current, (Math.random() - 0.5) * screenShake.current); }
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    stars.current.forEach(s => { ctx.fillRect(s.x, s.y, s.size, s.size); });

    levelData.current.powerUps.forEach(pu => {
      const colors = { triple_shot: '#ef4444', shield: '#3b82f6', drone: '#10b981', life: '#ec4899' };
      ctx.fillStyle = colors[pu.type] || '#fff';
      ctx.beginPath(); ctx.roundRect(pu.x, pu.y, pu.width, pu.height, 8); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px Arial';
      let icon = '?';
      if (pu.type === 'life') icon = '❤';
      if (pu.type === 'shield') icon = '🛡';
      if (pu.type === 'triple_shot') icon = '⚡';
      if (pu.type === 'drone') icon = '🤖';
      ctx.fillText(icon, pu.x + pu.width/2, pu.y + pu.height/2 + 5);
    });

    for (const part of particles.current) {
      ctx.globalAlpha = part.life;
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.size, part.size);
    }
    ctx.globalAlpha = 1.0;

    const p = player.current;
    if (p.invincibilityFrames % 10 < 5) {
      ctx.save();
      ctx.translate(p.x + p.width/2, p.y + p.height/2); ctx.rotate(p.tilt); ctx.translate(-(p.x + p.width/2), -(p.y + p.height/2));
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.moveTo(p.x + p.width/2, p.y); ctx.lineTo(p.x + p.width, p.y + p.height); ctx.lineTo(p.x + p.width/2, p.y + p.height - 6); ctx.lineTo(p.x, p.y + p.height); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(p.x + p.width/2 - 5, p.y + 14, 10, 8);
      if (p.shieldFrames > 0) {
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + p.width/2, p.y + p.height/2, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.1; ctx.fillStyle = '#60a5fa'; ctx.fill(); ctx.globalAlpha = 1.0;
      }
      if (p.droneFrames > 0) {
        const droneY = p.y + 15 + Math.sin(Date.now() / 150) * 4;
        ctx.fillStyle = '#475569'; ctx.fillRect(p.x - 35, droneY, 14, 14); ctx.fillRect(p.x + p.width + 21, droneY, 14, 14);
        ctx.fillStyle = '#60a5fa'; ctx.fillRect(p.x - 30, droneY + 4, 4, 4); ctx.fillRect(p.x + p.width + 26, droneY + 4, 4, 4);
      }
      ctx.restore();
    }

    levelData.current.enemies.forEach(e => {
      ctx.save();
      if (e.hitFlash && e.hitFlash > 0) { ctx.filter = 'brightness(2.5)'; }
      const enemyColors = { bomber: '#8b5cf6', scout: '#0ea5e9', invader: '#fbbf24' };
      ctx.fillStyle = enemyColors[e.type] || '#fff';
      ctx.beginPath(); ctx.roundRect(e.x, e.y, e.width, e.height, 6); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(e.x + 6, e.y + 6, 4, 4); ctx.fillRect(e.x + e.width - 10, e.y + 6, 4, 4);
      if (e.type === 'bomber') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x, e.y - 12, e.width, 4);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x, e.y - 12, (e.health / (e.maxHealth || 3)) * e.width, 4);
      }
      ctx.restore();
    });

    projectiles.current.forEach(proj => {
      ctx.fillStyle = proj.color; ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
    });

    let uiY = CANVAS_HEIGHT - 30;
    const drawBadgeUI = (label: string, icon: string, current: number, max: number, color: string) => {
      if (current <= 0) return;
      const barWidth = 90;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(10, uiY - 20, barWidth + 40, 24, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
      ctx.fillText(icon + ' ' + label, 20, uiY - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(80, uiY - 14, barWidth - 35, 6);
      ctx.fillStyle = color; ctx.fillRect(80, uiY - 14, (current / max) * (barWidth - 35), 6);
      uiY -= 30;
    };
    drawBadgeUI('AMIGOS', '🤖', p.droneFrames, p.maxDroneFrames, '#10b981');
    drawBadgeUI('RAIO', '⚡', p.tripleShotFrames, p.maxTripleShotFrames, '#ef4444');
    drawBadgeUI('ESCUDO', '🛡', p.shieldFrames, p.maxShieldFrames, '#3b82f6');

    ctx.restore();
  };

  const updatePlatformer = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const p = player.current;
    const g = levelData.current;
    const gravityValue = GRAVITY * (levelInfo?.gravity || 1.0);
    if (p.invincibilityFrames > 0) p.invincibilityFrames--;
    
    g.platforms.forEach(plat => {
      if (plat.type === 'moving' && plat.startX !== undefined) {
        if (plat.velocityX) { plat.x += plat.velocityX; if (Math.abs(plat.x - plat.startX) > (plat.range || 0)) plat.velocityX *= -1; }
        if (plat.velocityY) { plat.y += plat.velocityY; if (Math.abs(plat.y - plat.startY!) > (plat.range || 0)) plat.velocityY *= -1; }
      }
    });

    if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) { p.velocityX = Math.max(p.velocityX - 0.7, -WALK_SPEED); p.direction = 'left'; }
    else if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) { p.velocityX = Math.min(p.velocityX + 0.7, WALK_SPEED); p.direction = 'right'; }
    else { p.velocityX *= FRICTION; if (Math.abs(p.velocityX) < 0.1) p.velocityX = 0; }
    
    const jumpHeld = !!(keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current[' ']);
    if (jumpHeld && !p.isJumping) { p.velocityY = JUMP_POWER; p.isJumping = true; }
    if (!jumpHeld && p.velocityY < 0) p.velocityY += gravityValue * 2.5;
    
    p.velocityY += (p.velocityY > 0 ? gravityValue * FALL_GRAVITY_MULT : gravityValue);
    if (p.velocityY > 15) p.velocityY = 15;
    p.x += p.velocityX; p.y += p.velocityY;
    
    let onPlatform = false;
    for (const plat of g.platforms) {
      if (plat.isDestroyed) continue;
      if (checkCollision(p, plat)) {
        if (plat.type === 'lava' && p.invincibilityFrames === 0) {
          setLives(l => { if (l <= 1) { setGameState('GAME_OVER'); return 0; } p.x = g.playerStart.x; p.y = g.playerStart.y; p.velocityX = 0; p.velocityY = 0; cameraX.current = 0; return l - 1; }); break;
        }
        const overlapTop = (p.y + p.height) - plat.y; const overlapBottom = (plat.y + plat.height) - p.y;
        const overlapLeft = (p.x + p.width) - plat.x; const overlapRight = (plat.x + plat.width) - p.x;
        const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);
        if (minOverlap === overlapTop && p.velocityY >= 0) { p.y = plat.y - p.height; p.velocityY = 0; p.isJumping = false; onPlatform = true; if (plat.type === 'moving' && plat.velocityX) p.x += plat.velocityX; }
        else if (minOverlap === overlapBottom && p.velocityY <= 0) { p.y = plat.y + plat.height; p.velocityY = 0.5; }
        else if (minOverlap === overlapLeft) { p.x = plat.x - p.width; p.velocityX = 0; }
        else if (minOverlap === overlapRight) { p.x = plat.x + plat.width; p.velocityX = 0; }
      }
    }
    if (!onPlatform && p.y + p.height < CANVAS_HEIGHT + 100) p.isJumping = true;

    for (const enemy of g.enemies) {
      if (enemy.x < -1000) continue;
      enemy.x += enemy.velocityX; if (enemy.range > 0 && Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;
      enemy.velocityY = (enemy.velocityY || 0) + gravityValue; enemy.y += enemy.velocityY;
      for (const plat of g.platforms) { if (!plat.isDestroyed && plat.type !== 'lava' && checkCollision(enemy, plat)) { if (enemy.velocityY >= 0 && (enemy.y + enemy.height) - plat.y < 12) { enemy.y = plat.y - enemy.height; enemy.velocityY = 0; } else enemy.velocityX *= -1; } }
      if (checkCollision(p, enemy)) { if (p.velocityY > 0 && (p.y + p.height) - enemy.y < 15) { enemy.x = -2000; p.velocityY = JUMP_POWER * 0.7; setScore(s => s + 150); } else if (p.invincibilityFrames === 0) { setLives(l => { if (l <= 1) { setGameState('GAME_OVER'); return 0; } p.x = g.playerStart.x; p.y = g.playerStart.y; return l - 1; }); } }
    }

    if (checkCollision(p, g.goal)) setGameState('WIN');
    if (p.y > CANVAS_HEIGHT + 100) setGameState('GAME_OVER');
    const targetCameraX = p.x - CANVAS_WIDTH / 2.5; cameraX.current += (targetCameraX - cameraX.current) * 0.1; cameraX.current = Math.max(0, cameraX.current);
    renderPlatformer();
    requestRef.current = requestAnimationFrame(updatePlatformer);
  }, [gameState, levelInfo]);

  const renderPlatformer = () => {
    const canvas = canvasRef.current; if (!canvas || !levelInfo) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = levelInfo.color === '#3b82f6' ? '#082f49' : '#bae6fd'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const camX = Math.floor(cameraX.current); ctx.save(); ctx.translate(-camX, 0);
    levelData.current.platforms.forEach(plat => { ctx.fillStyle = plat.type === 'lava' ? '#f97316' : (plat.type === 'moving' ? '#22c55e' : '#713f12'); ctx.fillRect(plat.x, plat.y, plat.width, plat.height); });
    levelData.current.enemies.forEach(e => { ctx.fillStyle = '#4c1d95'; ctx.fillRect(e.x, e.y, e.width, e.height); });
    const p = player.current; ctx.fillStyle = '#dc2626'; ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.restore();
  };

  const initPlatformerLevel = useCallback((idx: number) => {
    const config = PREDEFINED_LEVELS[idx]; if (!config) return;
    setLevelInfo(config); setGameState('PLAYING'); setScore(0); setLives(3);
    player.current = { ...player.current, x: 50, y: 300, velocityX: 0, velocityY: 0, isJumping: false, invincibilityFrames: 0, lives: 3, score: 0 };
    cameraX.current = 0;
    const platforms: Platform[] = [ { x: 0, y: 400, width: 800, height: 50, type: 'solid' }, { x: 450, y: 320, width: 150, height: 30, type: 'solid' }, { x: 700, y: 240, width: 150, height: 30, type: 'solid' }, { x: 1000, y: 300, width: 200, height: 30, type: 'moving', startX: 1000, startY: 300, velocityX: 2, range: 150 }, { x: 1300, y: 400, width: 1000, height: 50, type: 'solid' }, { x: 1500, y: 380, width: 120, height: 40, type: 'lava' }, { x: 1800, y: 300, width: 150, height: 20, type: 'grass' }, { x: 2100, y: 220, width: 150, height: 20, type: 'grass' }, { x: 2400, y: 400, width: 1200, height: 50, type: 'solid' }, ];
    const enemies: Enemy[] = [ { x: 600, y: 370, width: 30, height: 30, velocityX: -1.5, velocityY: 0, type: 'patrol', range: 100, startX: 600, startY: 370, health: 1 }, { x: 1400, y: 370, width: 30, height: 30, velocityX: -1.8, velocityY: 0, type: 'patrol', range: 120, startX: 1400, startY: 370, health: 1 }, { x: 2600, y: 370, width: 30, height: 30, velocityX: -2.2, velocityY: 0, type: 'patrol', range: 200, startX: 2600, startY: 370, health: 1 }, ];
    levelData.current = { platforms, enemies, coins: [], powerUps: [], goal: { x: 3400, y: 300, width: 40, height: 100 }, playerStart: { x: 50, y: 300 } };
  }, []);

  const initPlatformer = useCallback((idx: number) => { setCurrentLevelIdx(idx); initPlatformerLevel(idx); }, [initPlatformerLevel]);

  useEffect(() => {
    if (gameMode === 'PLATFORMER') { requestRef.current = requestAnimationFrame(updatePlatformer); }
    else if (gameMode === 'SHOOTER') { requestRef.current = requestAnimationFrame(updateShooter); }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameMode, updatePlatformer, updateShooter]);

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden touch-none font-sans">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="max-w-full max-h-full object-contain shadow-2xl bg-black" 
          style={{ width: '100vw', height: '100vh', objectFit: 'contain', imageRendering: 'pixelated' }} 
        />

        {gameMode === 'MENU' && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 backdrop-blur-md z-40">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-8 md:mb-12 tracking-tighter italic">GEMINI <span className="text-cyan-400">ARCADE</span></h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-4xl">
              <div onClick={() => { setGameMode('PLATFORMER'); initPlatformer(0); }} className="group relative h-32 md:h-64 bg-emerald-600 rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer border-4 border-transparent hover:border-emerald-400 transition-all active:scale-95 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6 flex flex-col justify-end"><h2 className="text-white text-xl md:text-3xl font-black uppercase">Super Gemini Bros</h2><p className="text-emerald-300 font-bold text-xs md:text-base">Plataforma Clássica</p></div>
              </div>
              <div onClick={() => { setGameMode('SHOOTER'); initShooter(); }} className="group relative h-32 md:h-64 bg-indigo-900 rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer border-4 border-transparent hover:border-indigo-400 transition-all active:scale-95 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6 flex flex-col justify-end"><h2 className="text-white text-xl md:text-3xl font-black uppercase">Star Gemini</h2><p className="text-indigo-300 font-bold text-xs md:text-base">Arcade Shooter Retro</p></div>
              </div>
            </div>
          </div>
        )}

        {gameMode !== 'MENU' && gameState === 'PLAYING' && (
          <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-start pointer-events-none z-30">
            <div className="bg-black/50 backdrop-blur-xl p-2 md:p-3 rounded-xl text-white border border-white/10 flex flex-col gap-1 shadow-lg">
              <div className="flex gap-1 text-lg">{[...Array(5)].map((_, i) => (<span key={i} className={i < lives ? "opacity-100" : "opacity-20"}>❤</span>))}</div>
              {gameMode === 'SHOOTER' && ( <div className="text-[10px] md:text-xs font-bold uppercase text-indigo-300 tracking-widest">ONDA {shooterWave}</div> )}
            </div>
            <div className="bg-black/50 backdrop-blur-xl px-4 md:px-5 py-1 md:py-2 rounded-xl text-white font-mono text-lg md:text-xl font-bold border border-white/10 shadow-lg">{score.toString().padStart(6, '0')}</div>
          </div>
        )}

        {gameMode !== 'MENU' && gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center p-6 text-center z-[100] backdrop-blur-sm">
            <h2 className="text-5xl md:text-8xl font-black text-white mb-6 md:mb-8 italic animate-pulse">FIM DE JOGO</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => gameMode === 'PLATFORMER' ? initPlatformer(currentLevelIdx) : initShooter()} className="px-8 py-4 bg-white text-red-950 font-black text-xl rounded-full hover:scale-105 transition-all shadow-xl">REINICIAR</button>
              <button onClick={() => { setGameMode('MENU'); setGameState('START'); }} className="px-8 py-4 bg-red-800 text-white font-black text-xl rounded-full hover:scale-105 transition-all shadow-xl">MENU</button>
            </div>
          </div>
        )}

        {gameMode !== 'MENU' && gameState === 'WIN' && (
          <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-6 text-center z-[100] backdrop-blur-sm">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4 italic">VITÓRIA!</h2>
            <div className="text-emerald-400 font-mono text-2xl mb-8 md:mb-12">PONTOS: {score}</div>
            <button onClick={() => { setGameMode('MENU'); setGameState('START'); }} className="px-12 py-4 bg-white text-emerald-950 font-black text-xl rounded-full hover:scale-105 transition-all shadow-xl">SAIR</button>
          </div>
        )}

        {gameMode !== 'MENU' && gameState === 'PLAYING' && ( <MobileControls onPress={handleKeyPress} mode={gameMode === 'SHOOTER' ? 'SHOOTER' : 'PLATFORMER'} /> )}
      </div>
    </div>
  );
};

export default App;
