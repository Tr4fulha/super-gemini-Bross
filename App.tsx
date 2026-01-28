
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject, PowerUp, Projectile, Star, Particle, MenuSection } from './types';
import { WALK_SPEED, JUMP_POWER, GRAVITY, FALL_GRAVITY_MULT, FRICTION, PREDEFINED_LEVELS } from './constants';
import MobileControls from './components/MobileControls';

type ShooterSkin = 'CORE' | 'PHANTOM' | 'STRIKER';

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [gameState, setGameState] = useState<GameState>('START');
  const [menuSection, setMenuSection] = useState<MenuSection>('MAIN');
  
  // Persistência da Skin Selecionada
  const [selectedSkin, setSelectedSkin] = useState<ShooterSkin>(() => {
    return (localStorage.getItem('gemini_selected_skin') as ShooterSkin) || 'CORE';
  });
  
  const [isSelectingSkin, setIsSelectingSkin] = useState(false);
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('gemini_highscore') || 0));
  const [lives, setLives] = useState(3);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [shooterWave, setShooterWave] = useState(1);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);

  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });

  const DURATION_SHIELD = 720;
  const DURATION_TRIPLE = 1080;
  const MAX_PARTICLES = 100; 

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const audioCtx = useRef<AudioContext | null>(null);
  
  const player = useRef<Player>({
    x: 50, y: 300, width: 30, height: 30,
    velocityX: 0, velocityY: 0,
    isJumping: false, score: 0, lives: 3,
    direction: 'right', isLarge: false, invincibilityFrames: 0,
    powerLevel: 1, shieldFrames: 0, maxShieldFrames: DURATION_SHIELD,
    hasDrone: false, droneFrames: 0, maxDroneFrames: 0,
    tripleShotFrames: 0, maxTripleShotFrames: DURATION_TRIPLE, tilt: 0,
    energy: 0, maxEnergy: 100, dashCooldown: 0, dashFrames: 0, scrapCount: 0
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
  const deathTimer = useRef<number>(0);
  const specialEffectTimer = useRef(0);

  // Sistema de Persistência: Recorde e Skin
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('gemini_highscore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    localStorage.setItem('gemini_selected_skin', selectedSkin);
  }, [selectedSkin]);

  useEffect(() => {
    const handleResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'shoot' | 'explosion' | 'powerup' | 'hit' | 'dash' | 'special') => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'shoot') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(); osc.stop(now + 0.1);
    } else if (type === 'explosion') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(); osc.stop(now + 0.3);
    } else if (type === 'powerup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(); osc.stop(now + 0.2);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(); osc.stop(now + 0.15);
    } else if (type === 'dash') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(); osc.stop(now + 0.2);
    } else if (type === 'special') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(); osc.stop(now + 0.5);
    }
  };

  const drawPowerUpIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: PowerUp['type']) => {
    ctx.save();
    ctx.translate(x, y);
    if (type === 'life') {
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.moveTo(size / 2, size / 4); ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, size / 2.5); ctx.bezierCurveTo(0, size / 1.5, size / 2, size, size / 2, size); ctx.bezierCurveTo(size / 2, size, size, size / 1.5, size, size / 2.5); ctx.bezierCurveTo(size, 0, size / 2, 0, size / 2, size / 4); ctx.fill();
    } else if (type === 'shield') {
      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(size / 2, 0); ctx.lineTo(size, size / 4); ctx.lineTo(size, size / 1.5); ctx.quadraticCurveTo(size / 2, size, 0, size / 1.5); ctx.lineTo(0, size / 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (type === 'triple_shot') {
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(0, size / 3, size / 4, size / 1.5); ctx.fillRect(size / 2.5, 0, size / 4, size); ctx.fillRect(size / 1.2, size / 3, size / 4, size / 1.5);
    } else if (type === 'scrap') {
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  };

  const createExplosion = (x: number, y: number, color: string, count: number = 8, gravity: number = 0) => {
    const pCount = Math.min(count, MAX_PARTICLES - particles.current.length);
    if (pCount <= 0) return;
    for (let i = 0; i < pCount; i++) {
      particles.current.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1.0, color, size: 1 + Math.random() * 3, gravity });
    }
  };

  const triggerDeath = () => {
    if (gameState === 'GENERATING' || gameState === 'START') return;
    setGameState('GENERATING');
    const p = player.current; p.velocityY = -10; p.velocityX = (Math.random() - 0.5) * 4; deathTimer.current = 60; playSound('hit');
  };

  const spawnPowerUp = (x: number, y: number) => {
    levelData.current.powerUps.push({ x, y, width: 14, height: 14, collected: false, type: 'scrap', velocityY: 1.0 });
    if (Math.random() < 0.15) {
      const types: PowerUp['type'][] = ['triple_shot', 'shield', 'life'];
      const type = types[Math.floor(Math.random() * types.length)];
      levelData.current.powerUps.push({ x, y: y - 20, width: 28, height: 28, collected: false, type, velocityY: 1.2 });
    }
  };

  const spawnWave = useCallback((wave: number) => {
    const enemies: Enemy[] = [];
    setShooterWave(wave);
    projectiles.current = [];
    
    if (wave > 0 && wave % 5 === 0) {
      enemies.push({ x: dims.w / 2 - 50, y: -200, targetX: dims.w / 2 - 50, targetY: 80, width: 100, height: 75, velocityX: 1.8 + (wave * 0.04), velocityY: 0, type: 'boss', range: 250, startX: dims.w / 2 - 50, startY: 80, health: 35 + (wave * 10), maxHealth: 35 + (wave * 10), phase: 'entry', sineOffset: 0 });
    } else {
      const rows = 3; const cols = 6; const px = 90; const py = 70; const sx = (dims.w - (cols * px)) / 2 + 40;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let type: Enemy['type'] = 'invader';
          if (wave >= 3 && Math.random() > 0.7) type = 'fast';
          if (wave >= 6 && Math.random() > 0.8) type = 'heavy';
          let health = 1 + Math.floor(wave / 4); let vx = 1.5 + (wave * 0.08);
          if (type === 'heavy') { health *= 4; vx *= 0.6; } else if (type === 'fast') { vx *= 1.8; health = 1; }
          enemies.push({ x: sx + c * px, y: -200 - (r * 80), targetX: sx + c * px, targetY: 60 + r * py, width: type === 'heavy' ? 48 : 34, height: type === 'heavy' ? 38 : 26, velocityX: vx, velocityY: 1, type: type, range: 0, startX: 0, startY: 0, health: health, phase: 'entry', sineOffset: Math.random() * Math.PI * 2 });
        }
      }
    }
    if (Math.random() > 0.3) {
      enemies.push({ x: Math.random() * (dims.w - 60), y: -300, width: 60, height: 60, velocityX: (Math.random() - 0.5) * 2, velocityY: 2 + Math.random() * 3, type: 'asteroid', range: 0, startX: 0, startY: 0, health: 1000, phase: 'active' });
    }
    levelData.current.enemies = enemies;
  }, [dims.w]);

  const initShooter = useCallback(() => {
    setGameState('PLAYING'); setGameMode('SHOOTER'); setIsSelectingSkin(false);
    setScore(0); setLives(3);
    projectiles.current = []; particles.current = [];
    levelData.current.enemies = []; levelData.current.powerUps = [];
    spawnWave(1);
    const s: Star[] = [];
    for (let i = 0; i < 45; i++) s.push({ x: Math.random() * dims.w, y: Math.random() * dims.h, size: 0.5 + Math.random() * 2, speed: 0.5 + Math.random() * 2.5 });
    stars.current = s;
    player.current = { ...player.current, x: dims.w / 2 - 15, y: dims.h - 80, velocityX: 0, velocityY: 0, isJumping: false, invincibilityFrames: 0, shieldFrames: 0, tripleShotFrames: 0, droneFrames: 0, tilt: 0, energy: 0, dashCooldown: 0, dashFrames: 0, scrapCount: 0, powerLevel: 1 };
  }, [spawnWave, dims.w, dims.h]);

  const updateShooter = useCallback(() => {
    if (gameState !== 'PLAYING' && gameState !== 'GENERATING') return;
    const p = player.current; const g = levelData.current;

    if (gameState === 'GENERATING') {
      p.velocityY += 0.4; p.x += p.velocityX; p.y += p.velocityY; p.tilt += 0.2; deathTimer.current--;
      if (deathTimer.current <= 0 || p.y > dims.h + 100) setGameState('GAME_OVER');
      renderShooter(); requestRef.current = requestAnimationFrame(updateShooter); return;
    }

    if (screenShake.current > 0) screenShake.current *= 0.85;
    
    // Controles de teclado robustos para PC
    const moveLeft = keysPressed.current['ArrowLeft'] || keysPressed.current['a'];
    const moveRight = keysPressed.current['ArrowRight'] || keysPressed.current['d'];
    const doDash = (keysPressed.current['Shift'] || keysPressed.current['shift']) && p.dashCooldown <= 0;
    const doSpecial = (keysPressed.current['x'] || keysPressed.current['X']) && p.energy >= 100;

    if (doDash) {
      p.dashFrames = 15; p.dashCooldown = 90; p.invincibilityFrames = 15;
      playSound('dash');
      createExplosion(p.x + p.width/2, p.y + p.height, '#fff', 10);
    }
    
    if (doSpecial) {
      p.energy = 0; specialEffectTimer.current = 40; playSound('special'); screenShake.current = 15;
      projectiles.current = projectiles.current.filter(pr => pr.owner !== 'enemy');
      g.enemies.forEach(e => { if (e.type !== 'asteroid') { e.health -= 5; e.hitFlash = 10; } });
    }

    if (p.dashFrames > 0) {
      const dashDir = moveLeft ? -1 : moveRight ? 1 : (p.velocityX < 0 ? -1 : 1);
      p.velocityX = dashDir * 15; p.dashFrames--;
    } else {
      if (moveLeft) { p.velocityX -= 0.9; p.tilt = Math.max(-0.45, p.tilt - 0.09); }
      else if (moveRight) { p.velocityX += 0.9; p.tilt = Math.min(0.45, p.tilt + 0.09); }
      else { p.velocityX *= 0.84; p.tilt *= 0.84; }
      p.velocityX = Math.max(-WALK_SPEED * 1.6, Math.min(WALK_SPEED * 1.6, p.velocityX));
    }

    if (p.dashCooldown > 0) p.dashCooldown--;
    if (specialEffectTimer.current > 0) specialEffectTimer.current--;

    p.x += p.velocityX; p.x = Math.max(0, Math.min(dims.w - p.width, p.x));

    const isShooting = keysPressed.current[' '] || keysPressed.current['ArrowUp'] || keysPressed.current['w'];
    const fireRate = 170 - (p.powerLevel * 10);
    if (isShooting && Date.now() - lastShotTime.current > Math.max(80, fireRate)) {
      screenShake.current = 0.5; playSound('shoot');
      const pColor = selectedSkin === 'PHANTOM' ? '#c026d3' : selectedSkin === 'STRIKER' ? '#ef4444' : '#38bdf8';
      projectiles.current.push({ x: p.x + p.width/2 - 2, y: p.y - 15, width: 5, height: 18, velocityY: -14, velocityX: 0, owner: 'player', color: pColor });
      if (p.tripleShotFrames > 0 || p.powerLevel >= 3) {
        projectiles.current.push({ x: p.x, y: p.y - 12, width: 4, height: 16, velocityY: -13, velocityX: -3, owner: 'player', color: '#f59e0b' });
        projectiles.current.push({ x: p.x + p.width, y: p.y - 12, width: 4, height: 16, velocityY: -13, velocityX: 3, owner: 'player', color: '#f59e0b' });
      }
      lastShotTime.current = Date.now();
    }

    stars.current.forEach(s => { s.y += s.speed; if (s.y > dims.h) s.y = 0; });
    for (let i = particles.current.length - 1; i >= 0; i--) { const part = particles.current[i]; part.x += part.vx; part.y += part.vy; part.life -= 0.045; if (part.life <= 0) particles.current.splice(i, 1); }
    
    for (let i = projectiles.current.length - 1; i >= 0; i--) { 
      const pr = projectiles.current[i]; pr.y += pr.velocityY; pr.x += pr.velocityX;
      if (pr.y < -70 || pr.y > dims.h + 70 || pr.x < -70 || pr.x > dims.w + 70) { projectiles.current.splice(i, 1); continue; }
      if (pr.owner === 'enemy' && checkCollision(pr, p) && p.invincibilityFrames === 0) {
        if (p.shieldFrames > 0) { p.shieldFrames = 0; p.invincibilityFrames = 45; createExplosion(p.x + p.width/2, p.y + p.height/2, '#3b82f6', 15); playSound('hit'); } 
        else { setLives(l => { if (l <= 1) { triggerDeath(); return 0; } return l - 1; }); p.invincibilityFrames = 90; createExplosion(p.x + p.width/2, p.y + p.height/2, '#f43f5e', 25); playSound('hit'); }
        projectiles.current.splice(i, 1);
      }
    }

    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      const pu = g.powerUps[i]; pu.y += pu.velocityY || 1.4;
      if (checkCollision(pu, p)) {
        playSound('powerup');
        if (pu.type === 'life') setLives(l => Math.min(5, l + 1));
        else if (pu.type === 'triple_shot') p.tripleShotFrames = DURATION_TRIPLE;
        else if (pu.type === 'shield') p.shieldFrames = DURATION_SHIELD;
        else if (pu.type === 'scrap') {
          p.scrapCount++; p.energy = Math.min(100, p.energy + 5);
          if (p.scrapCount >= 15) { p.scrapCount = 0; p.powerLevel = Math.min(5, p.powerLevel + 1); createExplosion(p.x, p.y, '#facc15', 30); }
        }
        createExplosion(pu.x + pu.width/2, pu.y + pu.height/2, '#fff', 20); g.powerUps.splice(i, 1);
      } else if (pu.y > dims.h + 40) g.powerUps.splice(i, 1);
    }

    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const e = g.enemies[ei];
      if (e.type === 'asteroid') {
        e.y += e.velocityY; e.x += e.velocityX; e.sineOffset! += 0.05;
        if (checkCollision(e, p) && p.invincibilityFrames === 0) { triggerDeath(); }
        if (e.y > dims.h + 100) g.enemies.splice(ei, 1);
        continue;
      }
      if (e.phase === 'entry') { e.x += (e.targetX! - e.x) * 0.06; e.y += (e.targetY! - e.y) * 0.06; if (Math.abs(e.x - e.targetX!) < 3 && Math.abs(e.y - e.targetY!) < 3) e.phase = 'active'; }
      else if (e.phase === 'active') { 
        e.sineOffset = (e.sineOffset || 0) + 0.025;
        if (e.type === 'boss') { e.x += e.velocityX; if (e.x < 30 || e.x + e.width > dims.w - 30) e.velocityX *= -1; if (Math.random() < 0.06) projectiles.current.push({ x: e.x + e.width/2, y: e.y + e.height, width: 10, height: 14, velocityY: 5.5, velocityX: (Math.random() - 0.5) * 8, owner: 'enemy', color: '#8b5cf6' }); } 
        else { 
          e.x += e.velocityX; e.y += Math.sin(e.sineOffset) * 0.7; if (e.x <= 10 || e.x + e.width >= dims.w - 10) e.velocityX *= -1;
          const shotChance = (e.type === 'fast' ? 0.015 : e.type === 'heavy' ? 0.009 : 0.007) + (shooterWave * 0.001);
          if (Math.random() < shotChance) {
            let pW = 7, pH = 12, pV = 5.5, pColor = '#f43f5e';
            if (e.type === 'fast') { pW = 4; pH = 16; pV = 9; pColor = '#10b981'; }
            if (e.type === 'heavy') { pW = 12; pH = 12; pV = 4; pColor = '#451a03'; }
            projectiles.current.push({ x: e.x + e.width/2 - pW/2, y: e.y + e.height, width: pW, height: pH, velocityY: pV, velocityX: 0, owner: 'enemy', color: pColor });
          }
        }
      }
      for (let pri = projectiles.current.length - 1; pri >= 0; pri--) {
        const pr = projectiles.current[pri];
        if (pr.owner === 'player' && checkCollision(pr, e)) {
          if (e.type === 'asteroid') { projectiles.current.splice(pri, 1); createExplosion(pr.x, pr.y, '#64748b', 5); continue; }
          e.health--; e.hitFlash = 5; projectiles.current.splice(pri, 1);
          if (e.health <= 0) { playSound('explosion'); createExplosion(e.x + e.width/2, e.y + e.height/2, e.type === 'boss' ? '#d946ef' : '#f59e0b', e.type === 'boss' ? 50 : 15); spawnPowerUp(e.x, e.y); g.enemies.splice(ei, 1); setScore(s => s + (e.type === 'boss' ? 7500 : e.type === 'heavy' ? 400 : 120)); break; }
        }
      }
      if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;
    }
    if (g.enemies.filter(en => en.type !== 'asteroid').length === 0 && gameState === 'PLAYING') spawnWave(shooterWave + 1);
    if (p.invincibilityFrames > 0) p.invincibilityFrames--;
    if (p.shieldFrames > 0) p.shieldFrames--;
    if (p.tripleShotFrames > 0) p.tripleShotFrames--;
    renderShooter(); requestRef.current = requestAnimationFrame(updateShooter);
  }, [gameState, shooterWave, spawnWave, dims.h, dims.w, selectedSkin]);

  const updatePlatformer = useCallback(() => {
    if (gameState !== 'PLAYING' && gameState !== 'GENERATING') return;
    const p = player.current; const g = levelData.current;
    if (gameState === 'GENERATING') {
      p.velocityY += 0.45; p.y += p.velocityY; p.x += p.velocityX; p.tilt += 0.15; deathTimer.current--;
      if (deathTimer.current <= 0 || p.y > dims.h + 150) setGameState('GAME_OVER');
      renderPlatformer(); requestRef.current = requestAnimationFrame(updatePlatformer); return;
    }
    const gravityValue = GRAVITY * (levelInfo?.gravity || 1.0);
    if (p.invincibilityFrames > 0) p.invincibilityFrames--;
    const moveLeft = keysPressed.current['ArrowLeft'] || keysPressed.current['a'];
    const moveRight = keysPressed.current['ArrowRight'] || keysPressed.current['d'];
    if (moveLeft) { p.velocityX = Math.max(p.velocityX - 0.75, -WALK_SPEED); p.direction = 'left'; }
    else if (moveRight) { p.velocityX = Math.min(p.velocityX + 0.75, WALK_SPEED); p.direction = 'right'; }
    else { 
      let currentFriction = FRICTION;
      for(const plat of g.platforms) { if (p.x < plat.x + plat.width && p.x + p.width > plat.x && Math.abs((p.y + p.height) - plat.y) < 5) { if (plat.type === 'grass') currentFriction = 0.92; break; } }
      p.velocityX *= currentFriction; if (Math.abs(p.velocityX) < 0.15) p.velocityX = 0; 
    }
    const jumpHeld = !!(keysPressed.current[' '] || keysPressed.current['ArrowUp'] || keysPressed.current['w']);
    if (jumpHeld && !p.isJumping) { p.velocityY = JUMP_POWER; p.isJumping = true; createExplosion(p.x + p.width / 2, p.y + p.height, '#fff', 6); }
    p.velocityY += (p.velocityY > 0 ? gravityValue * FALL_GRAVITY_MULT : gravityValue);
    if (p.velocityY > 16) p.velocityY = 16;
    p.x += p.velocityX; p.y += p.velocityY;
    let onPlatform = false;
    for (const plat of g.platforms) {
      if (checkCollision(p, plat)) {
        const oT = (p.y + p.height) - plat.y; const oB = (plat.y + plat.height) - p.y; const oL = (p.x + p.width) - plat.x; const oR = (plat.x + plat.width) - p.x;
        const minO = Math.min(oT, oB, oL, oR);
        if (minO === oT && p.velocityY >= 0) { if (p.isJumping) { screenShake.current = Math.min(4, p.velocityY / 2); createExplosion(p.x + p.width/2, plat.y, '#ffffff', 4); } p.y = plat.y - p.height; p.velocityY = 0; p.isJumping = false; onPlatform = true; }
        else if (minO === oB && p.velocityY <= 0) { p.y = plat.y + plat.height; p.velocityY = 0.5; }
        else if (minO === oL) { p.x = plat.x - p.width; p.velocityX = 0; }
        else if (minO === oR) { p.x = plat.x + plat.width; p.velocityX = 0; }
      }
    }
    if (!onPlatform && p.y + p.height < dims.h + 180) p.isJumping = true;
    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const enemy = g.enemies[ei]; enemy.x += enemy.velocityX; enemy.velocityY += gravityValue; enemy.y += enemy.velocityY;
      let enemyGrounded = false;
      for (const plat of g.platforms) {
        if (checkCollision(enemy, plat)) {
          const oT = (enemy.y + enemy.height) - plat.y; const oB = (plat.y + plat.height) - enemy.y; const oL = (enemy.x + enemy.width) - plat.x; const oR = (plat.x + plat.width) - enemy.x;
          const minO = Math.min(oT, oB, oL, oR);
          if (minO === oT && enemy.velocityY >= 0) { enemy.y = plat.y - enemy.height; enemy.velocityY = 0; enemyGrounded = true; } 
          else if (minO === oL || minO === oR) { enemy.velocityX *= -1; }
        }
      }
      if (enemyGrounded && enemy.range > 0 && Math.abs(enemy.x - enemy.startX) > enemy.range) enemy.velocityX *= -1;
      if (checkCollision(p, enemy)) {
        if (p.velocityY > 0 && (p.y + p.height) - enemy.y < 20) { createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#4c1d95', 12); g.enemies.splice(ei, 1); p.velocityY = JUMP_POWER * 0.8; setScore(s => s + 300); } 
        else if (p.invincibilityFrames === 0) { setLives(l => { if (l <= 1) { triggerDeath(); return 0; } return l - 1; }); p.invincibilityFrames = 70; p.velocityX = (p.x < enemy.x ? -WALK_SPEED * 1.8 : WALK_SPEED * 1.8); p.velocityY = JUMP_POWER * 0.5; screenShake.current = 6; }
      }
    }
    for (let i = g.powerUps.length - 1; i >= 0; i--) { const pu = g.powerUps[i]; if (checkCollision(pu, p)) { if (pu.type === 'life') setLives(l => Math.min(5, l + 1)); else if (pu.type === 'shield') p.shieldFrames = DURATION_SHIELD; createExplosion(pu.x + pu.width/2, pu.y + pu.height/2, '#fff', 18); g.powerUps.splice(i, 1); } }
    for (let i = particles.current.length - 1; i >= 0; i--) { const part = particles.current[i]; part.x += part.vx; part.y += part.vy; part.life -= 0.03; if (part.life <= 0) particles.current.splice(i, 1); }
    if (checkCollision(p, g.goal)) setGameState('WIN');
    if (p.y > dims.h + 250) triggerDeath();
    cameraX.current += (p.x - dims.w / 2.5 - cameraX.current) * 0.15;
    if (screenShake.current > 0.1) screenShake.current *= 0.88;
    if (p.shieldFrames > 0) p.shieldFrames--;
    renderPlatformer(); requestRef.current = requestAnimationFrame(updatePlatformer);
  }, [gameState, levelInfo, dims.h, dims.w]);

  const renderShooter = () => {
    const ctx = canvasRef.current?.getContext('2d') as any; if (!ctx) return;
    ctx.save(); if (screenShake.current > 0.1) ctx.translate((Math.random()-0.5)*screenShake.current, (Math.random()-0.5)*screenShake.current);
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, dims.w, dims.h);
    stars.current.forEach(s => { ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; ctx.fillRect(s.x, s.y, s.size, s.size); });
    if (specialEffectTimer.current > 0) {
      ctx.fillStyle = `rgba(139, 92, 246, ${specialEffectTimer.current / 40})`;
      ctx.beginPath(); ctx.arc(player.current.x + player.current.width/2, player.current.y + player.current.height/2, dims.w * (1 - specialEffectTimer.current / 40), 0, Math.PI * 2); ctx.fill();
    }
    const p = player.current; 
    if (p.invincibilityFrames % 10 < 5 || gameState === 'GENERATING') {
      ctx.save(); ctx.translate(p.x + p.width / 2, p.y + p.height / 2); ctx.rotate(p.tilt); ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));
      const skinColors: Record<ShooterSkin, string> = { CORE: '#38bdf8', PHANTOM: '#a21caf', STRIKER: '#ef4444' };
      ctx.fillStyle = gameState === 'GENERATING' ? '#475569' : skinColors[selectedSkin]; 
      ctx.beginPath();
      if (selectedSkin === 'PHANTOM') { ctx.moveTo(p.x + p.width/2, p.y); ctx.lineTo(p.x + p.width, p.y + p.height * 0.7); ctx.lineTo(p.x + p.width * 0.7, p.y + p.height); ctx.lineTo(p.x + p.width * 0.3, p.y + p.height); ctx.lineTo(p.x, p.y + p.height * 0.7); }
      else if (selectedSkin === 'STRIKER') { ctx.moveTo(p.x + p.width/2, p.y); ctx.lineTo(p.x + p.width, p.y + p.height); ctx.lineTo(p.x + p.width/2, p.y + p.height * 0.7); ctx.lineTo(p.x, p.y + p.height); }
      else { ctx.moveTo(p.x + p.width / 2, p.y); ctx.lineTo(p.x + p.width, p.y + p.height); ctx.lineTo(p.x, p.y + p.height); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#082f49'; ctx.fillRect(p.x + p.width / 2 - 4, p.y + 12, 8, 8);
      if (p.shieldFrames > 0 && gameState !== 'GENERATING') { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width * 1.0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    levelData.current.enemies.forEach(e => { 
      ctx.save(); if (e.hitFlash && e.hitFlash > 0) ctx.fillStyle = '#fff'; else ctx.fillStyle = e.type === 'boss' ? '#c026d3' : e.type === 'heavy' ? '#451a03' : e.type === 'fast' ? '#059669' : e.type === 'asteroid' ? '#64748b' : '#f43f5e'; 
      ctx.beginPath();
      if (e.type === 'asteroid') { ctx.translate(e.x + e.width/2, e.y + e.height/2); ctx.rotate(e.sineOffset!); ctx.translate(-(e.x + e.width/2), -(e.y + e.height/2)); ctx.moveTo(e.x+e.width*0.2, e.y); ctx.lineTo(e.x+e.width, e.y+e.height*0.3); ctx.lineTo(e.x+e.width*0.8, e.y+e.height); ctx.lineTo(e.x, e.y+e.height*0.7); }
      else if (e.type === 'boss') { ctx.moveTo(e.x + e.width / 2, e.y + e.height); ctx.lineTo(e.x + e.width, e.y + e.height / 3); ctx.lineTo(e.x + e.width * 0.8, e.y); ctx.lineTo(e.x + e.width * 0.2, e.y); ctx.lineTo(e.x, e.y + e.height / 3); }
      else if (e.type === 'fast') { ctx.moveTo(e.x + e.width / 2, e.y + e.height); ctx.lineTo(e.x + e.width, e.y); ctx.lineTo(e.x + e.width / 2, e.y + e.height / 4); ctx.lineTo(e.x, e.y); }
      else { ctx.moveTo(e.x + e.width / 2, e.y + e.height); ctx.lineTo(e.x + e.width, e.y + e.height / 4); ctx.lineTo(e.x + e.width * 0.7, e.y); ctx.lineTo(e.x + e.width * 0.3, e.y); ctx.lineTo(e.x, e.y + e.height / 4); }
      ctx.closePath(); ctx.fill();
      if (e.type !== 'asteroid') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(e.x + e.width/2 - 2, e.y + 4, 4, 6); }
      if (e.type === 'boss') { ctx.fillStyle = '#450a0a'; ctx.fillRect(e.x, e.y - 20, e.width, 10); ctx.fillStyle = '#f43f5e'; ctx.fillRect(e.x, e.y - 20, (e.health / (e.maxHealth || 1)) * e.width, 10); }
      ctx.restore();
    });
    levelData.current.powerUps.forEach(pu => drawPowerUpIcon(ctx, pu.x, pu.y, pu.width, pu.type));
    projectiles.current.forEach(pr => { ctx.fillStyle = pr.color; ctx.fillRect(pr.x, pr.y, pr.width, pr.height); });
    for (const part of particles.current) { ctx.globalAlpha = part.life; ctx.fillStyle = part.color; ctx.fillRect(part.x, part.y, part.size, part.size); }
    ctx.restore();
  };

  const renderPlatformer = () => {
    const ctx = canvasRef.current?.getContext('2d') as any; if (!ctx) return;
    ctx.save(); if (screenShake.current > 0.1) ctx.translate((Math.random()-0.5)*screenShake.current, (Math.random()-0.5)*screenShake.current);
    ctx.fillStyle = levelInfo?.color || '#0f172a'; ctx.fillRect(0, 0, dims.w, dims.h);
    ctx.translate(-Math.floor(cameraX.current), 0);
    levelData.current.platforms.forEach(pl => { ctx.fillStyle = pl.type === 'grass' ? '#065f46' : '#472111'; ctx.fillRect(pl.x, pl.y, pl.width, pl.height); ctx.strokeStyle = '#271108'; ctx.strokeRect(pl.x, pl.y, pl.width, pl.height); if (pl.type === 'grass') { ctx.fillStyle = '#10b981'; ctx.fillRect(pl.x, pl.y, pl.width, 5); } });
    levelData.current.enemies.forEach(e => { ctx.fillStyle = '#4c1d95'; ctx.beginPath(); 
      if (ctx.roundRect) ctx.roundRect(e.x, e.y, e.width, e.height, 8); 
      else ctx.rect(e.x, e.y, e.width, e.height);
      ctx.fill(); 
    });
    levelData.current.powerUps.forEach(pu => drawPowerUpIcon(ctx, pu.x, pu.y, pu.width, pu.type));
    const p = player.current; 
    if (p.invincibilityFrames % 10 < 5 || gameState === 'GENERATING') { ctx.save(); ctx.translate(p.x + p.width / 2, p.y + p.height / 2); ctx.rotate(p.tilt); ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2)); ctx.fillStyle = gameState === 'GENERATING' ? '#64748b' : '#f43f5e'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(p.x, p.y, p.width, p.height, 5); else ctx.rect(p.x, p.y, p.width, p.height); ctx.fill(); if (p.shieldFrames > 0 && gameState !== 'GENERATING') { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x+p.width/2, p.y+p.height/2, p.width*0.8, 0, Math.PI*2); ctx.stroke(); } ctx.restore(); }
    for (const part of particles.current) { ctx.globalAlpha = part.life; ctx.fillStyle = part.color; ctx.fillRect(part.x, part.y, part.size, part.size); }
    const goal = levelData.current.goal; ctx.fillStyle = '#fbbf24'; ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    ctx.restore();
  };

  const checkCollision = (a: GameObject, b: GameObject) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  const startPlatformer = (idx: number) => {
    initAudio(); const cfg = PREDEFINED_LEVELS[idx]; setGameState('PLAYING'); setGameMode('PLATFORMER'); setCurrentLevelIdx(idx); setLevelInfo(cfg); setScore(0); setLives(3);
    player.current = { ...player.current, x: 50, y: 300, velocityX: 0, velocityY: 0, isJumping: false, invincibilityFrames: 0, shieldFrames: 0, tripleShotFrames: 0, tilt: 0 };
    cameraX.current = 0;
    const platforms: Platform[] = [{ x: 0, y: 400, width: 1000, height: 70, type: 'solid' }, { x: 500, y: 300, width: 180, height: 35, type: 'grass' }, { x: 780, y: 220, width: 180, height: 35, type: 'grass' }, { x: 1100, y: 400, width: 2500, height: 70, type: 'solid' }, { x: 1400, y: 280, width: 240, height: 30, type: 'grass' }, { x: 1800, y: 200, width: 220, height: 30, type: 'grass' }];
    const enemies: Enemy[] = [{ x: 650, y: 360, width: 38, height: 38, velocityX: -1.8, velocityY: 0, type: 'patrol', range: 130, startX: 650, startY: 360, health: 1 }, { x: 1500, y: 360, width: 38, height: 38, velocityX: -2.0, velocityY: 0, type: 'patrol', range: 160, startX: 1500, startY: 360, health: 1 }];
    const powerUps: PowerUp[] = [{ x: 800, y: 170, width: 30, height: 30, collected: false, type: 'shield' }, { x: 1850, y: 150, width: 30, height: 30, collected: false, type: 'life' }];
    levelData.current = { platforms, enemies, coins: [], powerUps, goal: { x: 3300, y: 290, width: 60, height: 120 }, playerStart: { x: 50, y: 300 } };
  };

  useEffect(() => {
    if (gameState === 'PLAYING' || gameState === 'GENERATING') {
      if (gameMode === 'PLATFORMER') requestRef.current = requestAnimationFrame(updatePlatformer);
      else if (gameMode === 'SHOOTER') requestRef.current = requestAnimationFrame(updateShooter);
    }
    return () => { if (requestRef.current !== null) cancelAnimationFrame(requestRef.current); };
  }, [gameState, gameMode, updatePlatformer, updateShooter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      // Mapeamento de teclas para PC: Adicionado Shift e X explicitamente
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
      }
      const key = e.key;
      const keyLower = e.key.toLowerCase();
      keysPressed.current[key] = true;
      keysPressed.current[keyLower] = true; 

      if (e.key === 'Escape') {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.focus(); 
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const SidebarButton = ({ label, active, onClick, icon }: any) => (
    <button onClick={onClick} className={`w-full text-left px-6 py-5 md:rounded-xl flex items-center gap-4 transition-all duration-300 border-l-4 md:border-l-4 md:border-t-0 border-t-0 ${active ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5'}`}>
      <span className="text-xl md:text-2xl">{icon}</span><span className="font-bold tracking-wider uppercase text-xs md:text-sm">{label}</span>
    </button>
  );

  const ActiveBuff = ({ type, frames, max }: { type: string, frames: number, max: number }) => {
    if (frames <= 0) return null;
    const pct = (frames / max) * 100;
    const color = type === 'shield' ? 'bg-blue-500' : 'bg-amber-500';
    return (
      <div className="flex flex-col items-end gap-1"><span className="text-[10px] font-black text-white uppercase tracking-tighter">{type}</span>
        <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10"><div className={`h-full ${color} transition-all duration-100`} style={{ width: `${pct}%` }} /></div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden touch-none font-sans select-none">
      <canvas ref={canvasRef} width={dims.w} height={dims.h} className="absolute inset-0 w-full h-full block bg-black" />
      
      {gameMode === 'MENU' && (
        <div className="absolute inset-0 z-50 flex flex-col md:flex-row overflow-hidden bg-slate-950/20">
          <div className="w-full md:w-64 h-auto md:h-full bg-[#080d1a]/95 border-b md:border-b-0 md:border-r border-white/5 flex flex-col p-4 md:p-6 backdrop-blur-2xl">
            <div className="mb-4 md:mb-12"><h1 className="text-lg md:text-2xl font-black text-white italic tracking-tighter text-center md:text-left leading-tight">GEMINI <br className="hidden md:block" /><span className="text-cyan-400">ARCADE</span></h1></div>
            <nav className="flex flex-row md:flex-col flex-1 gap-1 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0">
              <SidebarButton label="Jogar" active={menuSection === 'PLAY'} onClick={() => setMenuSection('PLAY')} icon="🎮" />
              <SidebarButton label="Config" active={menuSection === 'SETTINGS'} onClick={() => setMenuSection('SETTINGS')} icon="⚙️" />
              <SidebarButton label="Perfil" active={menuSection === 'PROFILE'} onClick={() => setMenuSection('PROFILE')} icon="👤" />
            </nav>
            <div className="hidden md:block mt-auto pt-6 border-t border-white/5"><div className="bg-white/5 p-4 rounded-xl"><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Recorde de Missão</p><p className="text-lg font-bold text-white font-mono mt-1">{highScore.toString().padStart(6, '0')}</p></div></div>
          </div>
          
          <div className="flex-1 h-full p-4 md:p-12 bg-black/40 overflow-y-auto backdrop-blur-sm flex items-center justify-center">
            {menuSection === 'PLAY' && !isSelectingSkin && (
              <div className="max-w-4xl animate-in fade-in slide-in-from-right-10 duration-500 w-full py-4">
                <h2 className="text-xl md:text-4xl font-black text-white mb-6 md:mb-10 italic uppercase tracking-tighter text-center md:text-left">Selecione o Protocolo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div onClick={() => startPlatformer(0)} className="group relative h-32 md:h-56 bg-emerald-600 rounded-2xl p-6 md:p-8 flex flex-col justify-end cursor-pointer hover:border-emerald-400 border-4 border-transparent transition-all overflow-hidden shadow-2xl active:scale-95">
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/0 transition-colors" /><div className="absolute top-4 right-4 text-2xl md:text-4xl opacity-20 group-hover:opacity-100 transition-opacity">🍄</div><h3 className="text-white text-lg md:text-3xl font-black uppercase relative z-10 italic tracking-tighter">Gemini Bros</h3><p className="text-emerald-200 text-[8px] md:text-xs font-black uppercase tracking-[0.2em] relative z-10 mt-1">Plataforma tática</p>
                  </div>
                  <div onClick={() => { initAudio(); setIsSelectingSkin(true); }} className="group relative h-32 md:h-56 bg-indigo-900 rounded-2xl p-6 md:p-8 flex flex-col justify-end cursor-pointer hover:border-indigo-400 border-4 border-transparent transition-all overflow-hidden shadow-2xl active:scale-95">
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/0 transition-colors" /><div className="absolute top-4 right-4 text-2xl md:text-4xl opacity-20 group-hover:opacity-100 transition-opacity">🚀</div><h3 className="text-white text-lg md:text-3xl font-black uppercase relative z-10 italic tracking-tighter">Star Gemini</h3><p className="text-indigo-200 text-[8px] md:text-xs font-black uppercase tracking-[0.2em] relative z-10 mt-1">Intercepção Espacial</p>
                  </div>
                </div>
              </div>
            )}
            
            {isSelectingSkin && (
              <div className="max-w-5xl animate-in zoom-in duration-500 w-full text-center py-4">
                <h2 className="text-2xl md:text-5xl font-black text-white mb-2 md:mb-4 italic uppercase tracking-tighter">Hangar</h2>
                <p className="text-indigo-300 uppercase tracking-[0.4em] text-[8px] md:text-sm mb-6 md:mb-12 font-bold">Escolha seu chassi</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {[
                    { id: 'CORE' as ShooterSkin, name: 'Core Alpha', color: 'bg-cyan-500', desc: 'Equilíbrio padrão para todas missões.' },
                    { id: 'PHANTOM' as ShooterSkin, name: 'Phantom X', color: 'bg-purple-600', desc: 'Aerodinâmica furtiva e motor de dobra.' },
                    { id: 'STRIKER' as ShooterSkin, name: 'Striker Red', color: 'bg-red-600', desc: 'Fuselagem reforçada e canhões táticos.' }
                  ].map(skin => (
                    <div key={skin.id} onClick={() => setSelectedSkin(skin.id)} className={`relative p-3 md:p-6 rounded-3xl border-4 cursor-pointer transition-all hover:scale-105 active:scale-95 flex flex-row md:flex-col items-center gap-3 md:gap-0 ${selectedSkin === skin.id ? 'border-cyan-400 bg-white/10' : 'border-white/5 bg-black/40'}`}>
                      <div className={`w-10 h-10 md:w-16 md:h-16 ${skin.color} rounded-2xl md:mb-4 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex-shrink-0`} />
                      <div className="text-left md:text-center overflow-hidden">
                        <h4 className="text-white font-black uppercase italic text-sm md:text-xl md:mb-2 truncate">{skin.name}</h4>
                        <p className="text-slate-400 text-[8px] md:text-xs font-bold leading-tight line-clamp-2">{skin.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 md:mt-16 flex flex-col md:flex-row gap-4 justify-center">
                  <button onClick={() => setIsSelectingSkin(false)} className="order-2 md:order-1 px-8 py-2 md:py-4 bg-white/5 text-white font-black rounded-full italic hover:bg-white/10 text-[10px] md:text-base">VOLTAR</button>
                  <button onClick={initShooter} className="order-1 md:order-2 px-10 md:px-16 py-3 md:py-4 bg-cyan-500 text-white font-black rounded-full text-base md:text-xl shadow-xl hover:scale-110 active:scale-90 transition-all uppercase italic tracking-tight border-b-4 border-cyan-700">LANÇAR</button>
                </div>
              </div>
            )}

            {menuSection === 'MAIN' && (
              <div className="flex flex-col items-center justify-center w-full text-center animate-in zoom-in duration-1000 px-4">
                <p className="text-cyan-400 font-black uppercase tracking-[0.5em] text-[8px] md:text-sm mb-2 md:mb-4">Protocolo Ativado</p>
                <h2 className="text-3xl md:text-8xl font-black text-white italic mb-8 md:mb-12 uppercase tracking-tighter leading-none">ACEITAR <br/><span className="text-cyan-400">O DESAFIO?</span></h2>
                <button onClick={() => setMenuSection('PLAY')} className="px-10 md:px-16 py-4 md:py-5 bg-cyan-500 text-white font-black rounded-full text-lg md:text-2xl shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:scale-110 active:scale-90 transition-all uppercase italic tracking-tighter border-b-4 border-cyan-700">Iniciar Operação</button>
              </div>
            )}
          </div>
        </div>
      )}

      {gameMode !== 'MENU' && gameState !== 'GENERATING' && (
        <>
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start pointer-events-none z-30">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 md:gap-4">
                <div className="bg-[#080d1a]/90 backdrop-blur-xl p-2 md:p-3 rounded-xl border border-white/10 flex flex-col items-center shadow-2xl">
                  <div className="flex gap-1 mb-1">{[...Array(lives)].map((_, i) => (<span key={i} className="text-xs md:text-base text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">❤</span>))}</div>
                  <div className="text-[8px] md:text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">{gameMode === 'SHOOTER' ? `Onda ${shooterWave}` : levelInfo?.name}</div>
                </div>
                <button onClick={() => { initAudio(); setGameState(gameState === 'PAUSED' ? 'PLAYING' : 'PAUSED'); }} className="pointer-events-auto w-10 h-10 md:w-14 md:h-14 bg-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/10 text-white flex items-center justify-center active:scale-90 transition-all shadow-xl"><span className="text-sm md:text-2xl">{gameState === 'PAUSED' ? '▶' : '⏸'}</span></button>
              </div>
              
              {gameMode === 'SHOOTER' && (
                <div className="flex flex-col gap-2 bg-black/40 p-2 md:p-3 rounded-xl border border-white/5 backdrop-blur-md">
                   <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] md:text-[10px] font-black text-purple-400 uppercase tracking-tighter"><span>Energia Ultra</span><span>{Math.floor(player.current.energy)}%</span></div>
                      <div className="w-24 md:w-32 h-1.5 md:h-2 bg-black/50 rounded-full overflow-hidden border border-purple-500/20"><div className="h-full bg-purple-500 transition-all" style={{ width: `${player.current.energy}%` }} /></div>
                   </div>
                   <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] md:text-[10px] font-black text-yellow-400 uppercase tracking-tighter"><span>Nível {player.current.powerLevel}</span><span>{player.current.scrapCount}/15</span></div>
                      <div className="w-24 md:w-32 h-1.5 md:h-2 bg-black/50 rounded-full overflow-hidden border border-yellow-500/20"><div className="h-full bg-yellow-500 transition-all" style={{ width: `${(player.current.scrapCount/15)*100}%` }} /></div>
                   </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2 md:gap-3">
              <div className="bg-[#080d1a]/90 backdrop-blur-xl px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl border border-white/10 text-white font-mono shadow-2xl flex flex-col items-end leading-none">
                <span className="text-[8px] md:text-[11px] text-slate-500 uppercase font-black tracking-widest mb-1">Score</span>
                <span className="text-base md:text-2xl font-black tracking-tighter">{score.toString().padStart(6, '0')}</span>
                {score > 0 && score === highScore && <span className="text-[8px] text-cyan-400 font-bold animate-pulse">NOVO RECORDE!</span>}
              </div>
              <div className="flex flex-col gap-1.5"><ActiveBuff type="Escudo" frames={player.current.shieldFrames} max={DURATION_SHIELD} /><ActiveBuff type="Canhão" frames={player.current.tripleShotFrames} max={DURATION_TRIPLE} /></div>
            </div>
          </div>
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xl z-[60] flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="bg-[#080d1a] p-8 md:p-12 rounded-3xl md:rounded-[2.5rem] border border-white/10 w-64 md:w-80 text-center shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                <h2 className="text-3xl md:text-5xl font-black text-white italic mb-8 md:mb-12 uppercase tracking-tighter">Pausado</h2>
                <div className="space-y-4 md:space-y-5"><button onClick={() => { initAudio(); setGameState('PLAYING'); }} className="w-full py-4 md:py-5 bg-cyan-500 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all italic text-lg md:text-xl uppercase tracking-tight shadow-lg border-b-4 border-cyan-700">Continuar</button><button onClick={() => { setGameMode('MENU'); setGameState('START'); setMenuSection('MAIN'); setIsSelectingSkin(false); }} className="w-full py-4 md:py-5 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all italic text-lg md:text-xl uppercase tracking-tight border border-white/10">Menu</button></div>
              </div>
            </div>
          )}
        </>
      )}

      {(gameState === 'GAME_OVER' || gameState === 'WIN') && (
         <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 md:p-8 backdrop-blur-2xl animate-in zoom-in fade-in duration-500 ${gameState === 'WIN' ? 'bg-emerald-950/90' : 'bg-red-950/90'}`}>
            <h2 className="text-5xl md:text-8xl font-black text-white italic mb-4 uppercase tracking-tighter drop-shadow-2xl text-center">{gameState === 'WIN' ? 'MISSÃO CUMPRIDA' : 'NAVE ABATIDA'}</h2>
            <div className="bg-black/30 px-8 md:px-12 py-4 md:py-6 rounded-3xl mb-8 md:mb-16 border border-white/10 shadow-2xl text-center">
              <p className="text-white/60 font-black uppercase text-[10px] md:text-sm tracking-[0.4em] mb-2">SCORE FINAL</p>
              <p className="text-4xl md:text-6xl font-mono font-black text-white drop-shadow-md">{score}</p>
              {score >= highScore && score > 0 && <p className="text-cyan-400 font-bold mt-2 animate-bounce uppercase text-xs">RECORDE SALVO!</p>}
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-xs md:max-w-none justify-center">
              <button onClick={() => { setGameMode('MENU'); setGameState('START'); setMenuSection('MAIN'); setIsSelectingSkin(false); }} className="px-10 py-4 md:py-5 bg-white text-black font-black rounded-full italic hover:scale-110 active:scale-90 transition-all shadow-2xl uppercase tracking-tight text-lg md:text-xl">Menu</button>
              <button onClick={() => { initAudio(); if (gameMode === 'PLATFORMER') startPlatformer(currentLevelIdx); else initShooter(); }} className="px-10 py-4 md:py-5 bg-black/40 text-white border-2 border-white/20 font-black rounded-full italic hover:scale-110 active:scale-90 transition-all shadow-2xl uppercase tracking-tight text-lg md:text-xl">Reiniciar</button>
            </div>
         </div>
      )}

      {gameState === 'PLAYING' && <MobileControls onPress={(k, p) => { initAudio(); keysPressed.current[k] = p; keysPressed.current[k.toLowerCase()] = p; }} mode={gameMode === 'SHOOTER' ? 'SHOOTER' : 'PLATFORMER'} />}
    </div>
  );
};

export default App;
