
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player, Enemy, Star, Particle, Projectile, LevelData, KeyBinds, GameSettings, SpecialAbility, MenuSection, ShooterSkin, PowerUp, PowerUpType, HighScoreEntry } from './types';
import MobileControls from './components/MobileControls';

// --- CONSTANTS ---
const DEFAULT_BINDS: KeyBinds = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: ' ', dash: 'Shift', pause: 'Escape' };
const FRICTION = 0.92;
const ACCELERATION = 0.8;
const DASH_POWER = 2.5;
const MAX_PARTICLES = 100; // Performance limit
const COMBO_TIME_LIMIT = 180; // 3 seconds at 60fps

const TRANSLATIONS = {
  PT: {
    PLAY: "INICIAR MISSÃO", OPTIONS: "OPÇÕES", CREDITS: "CRÉDITOS", QUIT: "SAIR",
    BACK: "VOLTAR", LAUNCH: "LANÇAR NAVE", SCORE: "PONTOS", WAVE: "ONDA",
    GAME_OVER: "FALHA NA MISSÃO", RESTART: "TENTAR NOVAMENTE", PAUSE: "SISTEMA PAUSADO",
    RESUME: "RETOMAR", START: "CLIQUE PARA INICIAR", SELECT_SHIP: "ESCOLHA SUA NAVE",
    HIGHSCORES: "HALL DA FAMA", CONTROLS: "CONTROLES",
    TXT_BOSS: "ALERTA: NAVE MÃE DETECTADA", TXT_WAVE_CLR: "ONDA COMPLETADA"
  },
  EN: {
    PLAY: "START MISSION", OPTIONS: "OPTIONS", CREDITS: "CREDITS", QUIT: "QUIT",
    BACK: "BACK", LAUNCH: "LAUNCH SHIP", SCORE: "SCORE", WAVE: "WAVE",
    GAME_OVER: "MISSION FAILED", RESTART: "RETRY", PAUSE: "SYSTEM PAUSED",
    RESUME: "RESUME", START: "CLICK TO START", SELECT_SHIP: "SELECT SHIP",
    HIGHSCORES: "HALL OF FAME", CONTROLS: "CONTROLS",
    TXT_BOSS: "WARNING: MOTHERSHIP DETECTED", TXT_WAVE_CLR: "WAVE CLEARED"
  }
};

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>('INTRO');
  const [menuSection, setMenuSection] = useState<MenuSection>('MAIN');
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('sg_settings');
      return saved ? JSON.parse(saved) : { masterVolume: 0.8, sfxVolume: 0.6, musicVolume: 0.4, quality: 'HIGH', language: 'PT', keyBinds: DEFAULT_BINDS };
    } catch {
      return { masterVolume: 0.8, sfxVolume: 0.6, musicVolume: 0.4, quality: 'HIGH', language: 'PT', keyBinds: DEFAULT_BINDS };
    }
  });
  
  const [highScores, setHighScores] = useState<HighScoreEntry[]>(() => {
    try {
      const saved = localStorage.getItem('sg_highscores');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [selectedSkin, setSelectedSkin] = useState<ShooterSkin>('CORE');
  const [selectedAbility, setSelectedAbility] = useState<SpecialAbility>('OVERDRIVE');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [message, setMessage] = useState<string | null>(null);

  // --- REFS (Mutable Game State) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const audioCtx = useRef<AudioContext | null>(null);
  const shake = useRef(0);
  const difficultyMult = useRef(1.0);
  const lastTime = useRef(0);

  // Entities
  const player = useRef<Player>({
    x: 0, y: 0, width: 32, height: 32, velocityX: 0, velocityY: 0, score: 0, lives: 3,
    invincibilityFrames: 0, shieldFrames: 0, maxShieldFrames: 600, tilt: 0,
    dashCooldown: 0, dashFrames: 0, slowMoFrames: 0, rapidFireFrames: 0,
    damageBoostFrames: 0, speedBoostFrames: 0, magnetFrames: 0, deathTimer: 0,
    abilityCharge: 0, scrapCount: 0, powerLevel: 1,
    comboCount: 0, comboTimer: 0, comboMultiplier: 1
  });
  
  const levelData = useRef<LevelData>({ enemies: [], powerUps: [], projectiles: [], particles: [] });
  const stars = useRef<Star[]>([]);

  const t = TRANSLATIONS[settings.language];

  // --- AUDIO ENGINE ---
  const playSound = (type: string) => {
    if (!audioCtx.current) return;
    try {
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const vol = settings.sfxVolume * settings.masterVolume;
      osc.connect(gain); gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'shoot') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1 * vol, now); osc.stop(now + 0.1);
      } else if (type === 'explosion') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(10, now + 0.3);
        gain.gain.setValueAtTime(0.2 * vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.stop(now + 0.3);
      } else if (type === 'powerup') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.1 * vol, now); osc.stop(now + 0.2);
      } else if (type === 'dash') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.1 * vol, now); osc.stop(now + 0.2);
      } else if (type === 'combo') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.05 * vol, now); osc.stop(now + 0.1);
      }
      osc.start();
    } catch (e) {
      // Ignore audio errors to prevent crash
    }
  };

  // --- PERSISTENCE ---
  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sg_settings', JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }, [settings]);

  // --- RESIZE HANDLER ---
  useEffect(() => {
    const handleResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- KEYBOARD LISTENERS ---
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight', ' '].includes(e.key)) e.preventDefault();
      
      if (e.key === settings.keyBinds.pause) {
        setGameState(prev => {
          if (prev === 'PLAYING') return 'PAUSED';
          if (prev === 'PAUSED') return 'PLAYING';
          return prev;
        });
      }
      if ((e.key === 'x' || e.key === 'X') && gameState === 'PLAYING') useSpecial();
    };
    
    const handleUp = (e: KeyboardEvent) => keys.current[e.key] = false;
    
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [settings.keyBinds, gameState]);

  // --- GAME LOGIC ---
  const spawnParticle = (x: number, y: number, color: string, type: Particle['type'] = 'spark', count = 1) => {
    // Limit particles to prevent lag
    if (levelData.current.particles.length > MAX_PARTICLES) return;

    for(let i=0; i<count; i++) {
      levelData.current.particles.push({
        x, y, 
        vx: (Math.random() - 0.5) * (type === 'spark' ? 10 : 4), 
        vy: (Math.random() - 0.5) * (type === 'spark' ? 10 : 4),
        life: 1.0, color, size: Math.random() * 3 + 1, decay: Math.random() * 0.03 + 0.02, 
        glow: settings.quality === 'HIGH', type
      });
    }
  };

  const useSpecial = () => {
    const p = player.current;
    if (p.abilityCharge < 100) return;
    p.abilityCharge = 0;
    playSound('powerup');
    
    if (selectedAbility === 'OVERDRIVE') {
      p.rapidFireFrames = 300; p.shieldFrames = 300;
      spawnParticle(p.x, p.y, '#f59e0b', 'ring', 20);
    } else if (selectedAbility === 'EMP_STORM') {
      levelData.current.projectiles = levelData.current.projectiles.filter(pr => pr.owner === 'player');
      levelData.current.enemies.forEach(e => { e.health -= 20; e.hitFlash = 10; });
      shake.current = 20;
      spawnParticle(dims.w/2, dims.h/2, '#0ea5e9', 'ring', 50);
    } else if (selectedAbility === 'CHRONO_SPHERE') {
      p.slowMoFrames = 400;
    }
  };

  const spawnPowerUp = (x: number, y: number) => {
    const rand = Math.random();
    let type: PowerUpType | null = null;
    
    if (rand < 0.05) type = 'LIFE';
    else if (rand < 0.15) type = 'SHIELD';
    else if (rand < 0.25) type = 'TRIPLE';
    else if (rand < 0.35) type = 'DAMAGE';
    else if (rand < 0.50) type = 'RAPID';
    else if (rand < 0.60) type = 'SPEED';
    else if (rand < 0.70) type = 'MAGNET';
    else if (rand < 0.75) type = 'TIME';
    else if (rand < 0.77) type = 'NUKE';

    if (type) {
      levelData.current.powerUps.push({
        x, y, width: 20, height: 20, type, velocityY: 1, pulseOffset: Math.random() * 10
      });
    }
  };

  const spawnWave = useCallback((w: number) => {
    setWave(w);
    const isBoss = w % 5 === 0;
    const diff = difficultyMult.current;
    
    if (isBoss) {
      setMessage(t.TXT_BOSS);
      setTimeout(() => setMessage(null), 3000);
      const hp = 300 * diff * (w / 5);
      levelData.current.enemies.push({
        x: dims.w / 2 - 60, y: -100, width: 120, height: 100, velocityX: 2, velocityY: 1,
        type: 'boss', health: hp, maxHealth: hp, hitFlash: 0, lastShotTime: 0, 
        behaviorTimer: 0, angle: 0, isBoss: true
      });
    } else {
      const count = Math.min(20, 5 + Math.floor(w * 1.5));
      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let type: Enemy['type'] = 'scout';
        let hp = 2 * diff;
        let w = 30, h = 30;
        
        if (rand < 0.5) { type = 'scout'; hp = 1 * diff; w=25; h=25; } 
        else if (rand < 0.8) { type = 'fighter'; hp = 3 * diff; w=35; h=35; } 
        else if (rand < 0.95) { type = 'heavy'; hp = 8 * diff; w=50; h=50; } 
        else { type = 'sniper'; hp = 2 * diff; w=30; h=40; } 

        levelData.current.enemies.push({
          x: Math.random() * (dims.w - 100) + 50,
          y: -50 - (i * 80), // Spawn above screen
          width: w, height: h, velocityX: 0, velocityY: 2,
          type, health: hp, maxHealth: hp, hitFlash: 0, lastShotTime: 0,
          behaviorTimer: Math.random() * 100, angle: Math.PI / 2
        });
      }
    }
  }, [dims.w, t.TXT_BOSS]);

  const update = useCallback((time: number) => {
    if (gameState !== 'PLAYING' && gameState !== 'DEATH_ANIM') {
      lastTime.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }
    
    const p = player.current;
    const timeScale = p.slowMoFrames > 0 ? 0.3 : 1.0;
    
    // --- DEATH ANIMATION ---
    if (gameState === 'DEATH_ANIM') {
      p.deathTimer++;
      if (p.deathTimer % 5 === 0) {
        spawnParticle(p.x + p.width/2, p.y + p.height/2, '#ef4444', 'smoke', 5);
        playSound('explosion');
      }
      if (p.deathTimer > 120) {
        try {
          const newScores = [...highScores, { score, date: new Date().toLocaleDateString(), wave }].sort((a,b) => b.score - a.score).slice(0, 10);
          setHighScores(newScores);
          localStorage.setItem('sg_highscores', JSON.stringify(newScores));
        } catch (e) {
          console.error("Save failed", e);
        }
        setGameState('GAME_OVER');
      }
      draw();
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const { up, down, left, right, fire, dash } = settings.keyBinds;
    
    // --- PHYSICS (PLAYER - GREEN ZONE) ---
    let ax = 0, ay = 0;
    if (keys.current[left]) ax -= 1;
    if (keys.current[right]) ax += 1;
    if (keys.current[up]) ay -= 1;
    if (keys.current[down]) ay += 1;

    if (keys.current[dash] && p.dashCooldown <= 0) {
      p.dashFrames = 15;
      p.dashCooldown = 60; 
      const boostDirX = ax !== 0 ? ax : 0;
      const boostDirY = ay !== 0 ? ay : (ax === 0 ? -1 : 0);
      p.velocityX += boostDirX * DASH_POWER * 5;
      p.velocityY += boostDirY * DASH_POWER * 5;
      playSound('dash');
      shake.current = 5;
    }

    let speed = (p.speedBoostFrames > 0 ? 1.5 : 1.0) * (selectedSkin === 'PHANTOM' ? 1.2 : 1.0);
    if (p.dashFrames > 0) speed = 0;

    p.velocityX += ax * ACCELERATION * speed;
    p.velocityY += ay * ACCELERATION * speed;
    p.velocityX *= FRICTION;
    p.velocityY *= FRICTION;
    p.x += p.velocityX;
    p.y += p.velocityY;

    // ZONE RESTRICTION: PLAYER (BOTTOM 50%)
    const safeZoneTop = dims.h * 0.5;
    if (p.x < 0) { p.x = 0; p.velocityX = 0; }
    if (p.x > dims.w - p.width) { p.x = dims.w - p.width; p.velocityX = 0; }
    if (p.y < safeZoneTop) { p.y = safeZoneTop; p.velocityY = 0; } 
    if (p.y > dims.h - p.height) { p.y = dims.h - p.height; p.velocityY = 0; }

    p.tilt = p.velocityX * 0.05;

    if (p.dashFrames > 0) p.dashFrames--;
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.invincibilityFrames > 0) p.invincibilityFrames--;
    if (p.rapidFireFrames > 0) p.rapidFireFrames--;
    if (p.damageBoostFrames > 0) p.damageBoostFrames--;
    if (p.speedBoostFrames > 0) p.speedBoostFrames--;
    if (p.slowMoFrames > 0) p.slowMoFrames--;
    if (p.magnetFrames > 0) p.magnetFrames--;
    if (p.shieldFrames > 0) p.shieldFrames--;
    if (p.abilityCharge < 100) p.abilityCharge += 0.1;
    
    // --- COMBO LOGIC ---
    if (p.comboTimer > 0) {
      p.comboTimer -= timeScale;
      if (p.comboTimer <= 0) {
        p.comboCount = 0;
        p.comboMultiplier = 1;
        p.comboTimer = 0;
      }
    }

    if (p.dashFrames > 0 && p.dashFrames % 3 === 0) {
      spawnParticle(p.x + p.width/2, p.y + p.height/2, '#5de2ef', 'smoke', 1);
    }

    // --- SHOOTING ---
    const fireRate = p.rapidFireFrames > 0 ? 60 : (selectedSkin === 'PHANTOM' ? 140 : 200);
    const damage = (selectedSkin === 'STRIKER' ? 2 : 1) * (p.damageBoostFrames > 0 ? 2 : 1);
    
    if (keys.current[fire] && Date.now() - lastTime.current > fireRate) {
      const projectiles = levelData.current.projectiles;
      const mid = p.x + p.width/2;
      
      projectiles.push({ x: mid - 2, y: p.y, width: 4, height: 14, velocityX: 0, velocityY: -15, owner: 'player', color: '#5de2ef', damage });
      
      if (p.powerLevel > 1) {
        projectiles.push({ x: mid - 10, y: p.y + 5, width: 3, height: 12, velocityX: -2, velocityY: -13, owner: 'player', color: '#5de2ef', damage });
        projectiles.push({ x: mid + 10, y: p.y + 5, width: 3, height: 12, velocityX: 2, velocityY: -13, owner: 'player', color: '#5de2ef', damage });
      }
      
      playSound('shoot');
      lastTime.current = Date.now();
    }

    // --- ENEMIES AI & BOSS ---
    const enemyZoneBottom = dims.h * 0.5;

    levelData.current.enemies.forEach(e => {
      e.behaviorTimer++;
      
      let speed = 2 * difficultyMult.current * timeScale;
      
      if (e.isBoss) {
        // BOSS MOVEMENT & ATTACKS
        // Enter arena
        if (e.y < 80) {
          e.y += speed * 0.5;
        } else {
          // Hover Pattern: Figure-8 or Sine
          e.x += Math.cos(e.behaviorTimer * 0.02) * 2 * timeScale;
          e.y += Math.sin(e.behaviorTimer * 0.03) * 1 * timeScale;
          
          // Clamp X to stay on screen
          if (e.x < 50) e.x = 50;
          if (e.x > dims.w - e.width - 50) e.x = dims.w - e.width - 50;
        }

        // BOSS ATTACK LOGIC
        // Every ~3 seconds (at 60fps)
        if (e.behaviorTimer % 180 === 0) {
          const bossLevel = Math.floor(wave / 5);
          
          // Even Bosses (Wave 10, 20): Homing Missiles
          if (bossLevel % 2 === 0) {
            for(let k=0; k<3; k++) {
              levelData.current.projectiles.push({
                x: e.x + e.width/2 + (k-1)*20, y: e.y + e.height,
                width: 8, height: 16, velocityX: (Math.random()-0.5)*2, velocityY: 3,
                owner: 'enemy', color: '#f97316', damage: 1, isMissile: true
              });
            }
          } 
          // Odd Bosses (Wave 5, 15): Shotgun Spread
          else {
            for(let k=-2; k<=2; k++) {
              levelData.current.projectiles.push({
                x: e.x + e.width/2, y: e.y + e.height,
                width: 6, height: 12, velocityX: k * 2, velocityY: 5,
                owner: 'enemy', color: '#fbbf24', damage: 1
              });
            }
          }
        }
      } else {
        // STANDARD ENEMY AI
        if (e.y < 50) {
          e.y += speed; // Enter screen
        } else {
          // ZONING LOGIC
          if (e.type === 'scout') {
             e.y += Math.sin(e.behaviorTimer * 0.05) * speed; 
             e.x += Math.sin(e.behaviorTimer * 0.1) * 3 * timeScale;
          } else if (e.type === 'fighter') {
             e.y += Math.cos(e.behaviorTimer * 0.02) * speed * 0.5;
             if (e.x < p.x) e.x += 0.5 * timeScale;
             if (e.x > p.x) e.x -= 0.5 * timeScale;
          } else {
             e.y += Math.sin(e.behaviorTimer * 0.02) * speed * 0.2;
          }

          // Hard Clamp to Red Zone
          if (e.y > enemyZoneBottom - e.height) {
             e.y = enemyZoneBottom - e.height;
          }
        }

        // Standard Shooting
        const shotChance = (e.type === 'sniper' ? 0.02 : 0.005) * difficultyMult.current * timeScale;
        if (Math.random() < shotChance && e.y > 0) {
          const pSpeed = e.type === 'sniper' ? 8 : 5;
          levelData.current.projectiles.push({
            x: e.x + e.width/2, y: e.y + e.height, width: 6, height: 12,
            velocityX: 0, velocityY: pSpeed, owner: 'enemy', color: '#f43f5e', damage: 1
          });
        }
      }
    });

    // --- COLLISIONS (OPTIMIZED REVERSE LOOP) ---
    const projectiles = levelData.current.projectiles;
    const enemies = levelData.current.enemies;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      
      // Homing Logic for Missiles
      if (pr.isMissile && pr.owner === 'enemy') {
         const dx = (p.x + p.width/2) - pr.x;
         const dy = (p.y + p.height/2) - pr.y;
         const angle = Math.atan2(dy, dx);
         // Turn slowly towards player
         pr.velocityX = pr.velocityX * 0.95 + Math.cos(angle) * 0.2;
         pr.velocityY = pr.velocityY * 0.95 + Math.sin(angle) * 0.2;
         
         // Smoke trail
         if (Math.random() < 0.2) {
            spawnParticle(pr.x + pr.width/2, pr.y, '#f97316', 'smoke', 1);
         }
      }

      pr.x += pr.velocityX * timeScale;
      pr.y += pr.velocityY * timeScale;

      let removed = false;

      // Cleanup
      if (pr.y < -50 || pr.y > dims.h + 50 || pr.x < -50 || pr.x > dims.w + 50) {
        projectiles.splice(i, 1);
        continue;
      }

      if (pr.owner === 'player') {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (checkRectCollide(pr, e)) {
            e.health -= pr.damage;
            e.hitFlash = 5;
            spawnParticle(pr.x, pr.y, '#5de2ef', 'spark', 2);
            projectiles.splice(i, 1);
            removed = true;

            if (e.health <= 0) {
              playSound('explosion');
              spawnParticle(e.x + e.width/2, e.y + e.height/2, e.isBoss ? '#fbbf24' : '#f43f5e', 'smoke', e.isBoss ? 20 : 8);
              enemies.splice(j, 1);
              
              // --- COMBO UPDATE ---
              p.comboCount++;
              p.comboTimer = COMBO_TIME_LIMIT;
              const prevMulti = p.comboMultiplier;
              p.comboMultiplier = Math.min(8, 1 + Math.floor(p.comboCount / 5));
              
              if (p.comboMultiplier > prevMulti) {
                 playSound('combo'); // Sound for multiplier increase
              }

              const baseScore = (e.isBoss ? 5000 : (e.type === 'heavy' ? 500 : 100));
              setScore(s => s + (baseScore * p.comboMultiplier));
              
              spawnPowerUp(e.x + e.width/2, e.y + e.height/2);
              shake.current = e.isBoss ? 20 : 5;
              
              if (e.isBoss) {
                difficultyMult.current *= 2;
                setMessage(t.TXT_WAVE_CLR);
                setTimeout(() => setMessage(null), 2000);
              }
            }
            break; // Bullet hit something, stop checking enemies
          }
        }
      } else {
        // Enemy bullet vs Player
        if (checkRectCollide(pr, p) && p.invincibilityFrames <= 0) {
          if (p.shieldFrames > 0) {
            p.shieldFrames = 0;
            p.invincibilityFrames = 60;
            playSound('dash');
          } else {
            p.lives--; // Update reference for logic
            setLives(p.lives); // Sync state for UI
            
            // --- RESET COMBO ON HIT ---
            p.comboCount = 0;
            p.comboTimer = 0;
            p.comboMultiplier = 1;

            p.invincibilityFrames = 90;
            playSound('explosion');
            shake.current = 15;
            
            if (p.lives <= 0) setGameState('DEATH_ANIM');
          }
          projectiles.splice(i, 1);
          removed = true;
        }
      }
    }

    // PowerUps
    const powerUps = levelData.current.powerUps;
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += pu.velocityY * timeScale;
      
      if (p.magnetFrames > 0) {
        const dx = (p.x + p.width/2) - pu.x;
        const dy = (p.y + p.height/2) - pu.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 300) {
          pu.x += (dx / dist) * 5 * timeScale;
          pu.y += (dy / dist) * 5 * timeScale;
        }
      }

      if (checkRectCollide(pu, p)) {
        playSound('powerup');
        applyPowerUp(pu.type);
        powerUps.splice(i, 1);
        setScore(s => s + 50);
      } else if (pu.y > dims.h) {
        powerUps.splice(i, 1);
      }
    }

    // --- PARTICLE UPDATES ---
    const particles = levelData.current.particles;
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * timeScale; pt.y += pt.vy * timeScale; pt.life -= pt.decay;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    if (levelData.current.enemies.length === 0 && wave > 0) {
      spawnWave(wave + 1);
    }

    draw();
    requestRef.current = requestAnimationFrame(() => update(performance.now()));
  }, [gameState, wave, settings.keyBinds, dims]);

  // --- DRAWING ENGINE ---
  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, dims.w, dims.h);
    
    // Safety check for NaN shake values causing black screens
    if (shake.current > 0 && !isNaN(shake.current)) {
      const s = shake.current;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      shake.current *= 0.9;
      if (shake.current < 0.5) shake.current = 0;
    } else {
      shake.current = 0;
    }

    // Visualizing Zones (Optional debug style, subtle background hint)
    // Red Zone (Top)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.02)';
    ctx.fillRect(0, 0, dims.w, dims.h * 0.5);
    // Green Zone (Bottom)
    ctx.fillStyle = 'rgba(0, 255, 0, 0.02)';
    ctx.fillRect(0, dims.h * 0.5, dims.w, dims.h * 0.5);

    stars.current.forEach(s => {
      ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    levelData.current.powerUps.forEach(pu => {
      ctx.save();
      ctx.translate(pu.x + 10, pu.y + 10);
      const color = getPowerUpColor(pu.type);
      ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pu.type[0], 0, 1);
      ctx.restore();
    });

    levelData.current.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x + e.width/2, e.y + e.height/2);
      if (e.isBoss) ctx.scale(1.5, 1.5);
      
      const color = e.hitFlash > 0 ? '#fff' : (e.type === 'heavy' ? '#a78bfa' : e.type === 'boss' ? '#fbbf24' : '#f43f5e');
      if (settings.quality === 'HIGH') { ctx.shadowBlur = 10; ctx.shadowColor = color; }
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      if (e.type === 'scout') { 
        ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(10, -10); ctx.lineTo(-10, -10); ctx.fill();
      } else if (e.type === 'fighter') { 
        ctx.fillRect(-5, -15, 10, 30); ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(15, -5); ctx.lineTo(-15, -5); ctx.fill();
      } else if (e.type === 'heavy') { 
        ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = '#000'; ctx.fillRect(-5, -5, 10, 10);
      } else if (e.type === 'boss') { 
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-40, -10, 80, 20);
      } else { 
         ctx.fillRect(-2, -20, 4, 40); ctx.fillRect(-10, 0, 20, 5);
      }
      
      if (e.hitFlash > 0) e.hitFlash--;
      ctx.restore();
    });

    const p = player.current;
    if (gameState !== 'DEATH_ANIM' && p.invincibilityFrames % 10 < 5) {
      ctx.save();
      ctx.translate(p.x + p.width/2, p.y + p.height/2);
      ctx.rotate(p.tilt);
      
      const pColor = selectedSkin === 'PHANTOM' ? '#d946ef' : (selectedSkin === 'STRIKER' ? '#ef4444' : '#22d3ee');
      if (settings.quality === 'HIGH') { ctx.shadowBlur = p.dashFrames > 0 ? 25 : 15; ctx.shadowColor = pColor; }
      ctx.fillStyle = pColor;
      
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, 14); ctx.lineTo(0, 8); ctx.lineTo(-14, 14); ctx.fill();
      
      if (p.shieldFrames > 0) {
        ctx.strokeStyle = `rgba(14, 165, 233, ${Math.random() * 0.5 + 0.5})`;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }

    levelData.current.projectiles.forEach(pr => {
      ctx.fillStyle = pr.color;
      if (settings.quality === 'HIGH') { ctx.shadowBlur = 8; ctx.shadowColor = pr.color; }
      ctx.fillRect(pr.x, pr.y, pr.width, pr.height);
      ctx.shadowBlur = 0;
    });

    levelData.current.particles.forEach(pt => {
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      if (pt.type === 'ring') {
        ctx.strokeStyle = pt.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (2 - pt.life), 0, Math.PI*2); ctx.stroke();
      } else {
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
    });
    ctx.globalAlpha = 1.0;

    // --- HUD: COMBO SYSTEM ---
    if (p.comboMultiplier > 1 && gameState === 'PLAYING') {
      ctx.save();
      ctx.resetTransform(); // Draw in screen coordinates
      const rightX = dims.w - 20;
      const topY = 120;
      
      ctx.textAlign = 'right';
      
      // Multiplier Text
      const pulse = Math.sin(Date.now() / 100) * 0.1 + 1; // Pulse effect
      ctx.translate(rightX, topY);
      ctx.scale(pulse, pulse);
      ctx.font = 'italic 900 48px sans-serif';
      ctx.fillStyle = '#facc15'; // Yellow
      ctx.shadowColor = 'rgba(250, 204, 21, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(`${p.comboMultiplier}x`, 0, 0);
      
      // Label
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 0;
      ctx.fillText('COMBO', 0, 15);
      
      // Bar Background
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-100, 25, 100, 6);
      
      // Bar Progress
      ctx.fillStyle = '#facc15';
      const width = (p.comboTimer / COMBO_TIME_LIMIT) * 100;
      ctx.fillRect(-width, 25, width, 6);

      ctx.restore();
    }
  };

  const checkRectCollide = (r1: {x: number, y: number, width: number, height: number}, r2: {x: number, y: number, width: number, height: number}) => {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
  };

  const applyPowerUp = (type: PowerUpType) => {
    const p = player.current;
    switch(type) {
      case 'LIFE': 
        p.lives++;
        setLives(p.lives);
        break;
      case 'SHIELD': p.shieldFrames = 600; break;
      case 'TRIPLE': p.powerLevel = 2; break; 
      case 'DAMAGE': p.damageBoostFrames = 600; break;
      case 'RAPID': p.rapidFireFrames = 400; break;
      case 'SPEED': p.speedBoostFrames = 600; break;
      case 'MAGNET': p.magnetFrames = 900; break;
      case 'TIME': p.slowMoFrames = 300; break;
      case 'NUKE': 
        levelData.current.enemies.forEach(e => {
          e.health = 0; 
          spawnParticle(e.x, e.y, '#fff', 'ring', 5);
        }); 
        shake.current = 30;
        break;
    }
  };

  const getPowerUpColor = (t: PowerUpType) => {
    switch(t) {
      case 'LIFE': return '#22c55e';
      case 'SHIELD': return '#3b82f6';
      case 'TRIPLE': return '#eab308';
      case 'DAMAGE': return '#ef4444';
      case 'RAPID': return '#f97316';
      case 'SPEED': return '#06b6d4';
      case 'MAGNET': return '#d946ef';
      case 'TIME': return '#ffffff';
      case 'NUKE': return '#a855f7';
      default: return '#fff';
    }
  };

  const initGame = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    
    setGameState('PLAYING'); setScore(0); setLives(3); setWave(1); difficultyMult.current = 1.0;
    
    // Explicitly reset lives in the ref to match the state
    player.current = { 
      ...player.current, 
      x: dims.w/2, 
      y: dims.h - 100, 
      velocityX:0, 
      velocityY:0, 
      shieldFrames: 0, 
      powerLevel: 1, 
      abilityCharge: 0,
      lives: 3,
      comboCount: 0,
      comboTimer: 0,
      comboMultiplier: 1
    };
    
    levelData.current = { enemies: [], powerUps: [], projectiles: [], particles: [] };
    
    stars.current = [];
    for(let i=0; i<60; i++) stars.current.push({ x: Math.random()*dims.w, y: Math.random()*dims.h, size: Math.random()*2, speed: 1+Math.random()*2, opacity: Math.random(), layer: 1 });
    
    spawnWave(1);
    lastTime.current = performance.now();
  };

  useEffect(() => {
     if (gameState === 'PLAYING' || gameState === 'DEATH_ANIM') requestRef.current = requestAnimationFrame((t) => update(t));
     return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, update]);

  return (
    <div className="w-full h-full bg-black relative overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} width={dims.w} height={dims.h} className="block w-full h-full" />

      {/* PAUSE OVERLAY */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl text-[#5de2ef] font-black italic mb-8">{t.PAUSE}</h2>
          <button onClick={() => setGameState('PLAYING')} className="w-64 py-3 bg-[#1a2e35] border-y-2 border-[#5de2ef] text-[#5de2ef] font-bold mb-4">{t.RESUME}</button>
          <button onClick={() => setGameState('START')} className="text-white/60 hover:text-white">{t.QUIT}</button>
        </div>
      )}

      {/* MAIN MENU */}
      {(gameState === 'INTRO' || gameState === 'START') && menuSection === 'MAIN' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/80">
          <div className="mb-12 text-center">
             <h1 className="text-8xl font-black text-[#5de2ef] italic drop-shadow-[0_0_15px_rgba(93,226,239,0.5)]">SG</h1>
             <p className="text-white tracking-[0.5em] text-sm opacity-80 mt-2">STAR GEMINI ARCADE</p>
          </div>
          {gameState === 'INTRO' ? (
            <button onClick={() => setGameState('START')} className="animate-pulse text-white text-xl font-bold tracking-widest">{t.START}</button>
          ) : (
            <div className="flex flex-col gap-3">
              <button onClick={() => setMenuSection('PLAY')} className="w-72 py-4 bg-[#1a2e35] border-y-2 border-[#5de2ef] text-[#5de2ef] font-black tracking-widest hover:scale-105 transition-transform">{t.PLAY}</button>
              <button onClick={() => setMenuSection('SETTINGS')} className="w-72 py-3 border-y border-white/20 text-white font-bold tracking-wide hover:bg-white/10">{t.OPTIONS}</button>
              <button onClick={() => setMenuSection('HIGHSCORES')} className="w-72 py-3 border-y border-white/20 text-white font-bold tracking-wide hover:bg-white/10">{t.HIGHSCORES}</button>
              <button onClick={() => setMenuSection('CREDITS')} className="w-72 py-3 border-y border-white/20 text-white font-bold tracking-wide hover:bg-white/10">{t.CREDITS}</button>
            </div>
          )}
        </div>
      )}

      {/* PLAY SETUP */}
      {gameState === 'START' && menuSection === 'PLAY' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50">
          <h2 className="text-3xl font-black text-[#5de2ef] mb-8 italic">{t.SELECT_SHIP}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {(['CORE', 'PHANTOM', 'STRIKER'] as ShooterSkin[]).map(s => (
              <button key={s} onClick={() => setSelectedSkin(s)} 
                className={`p-6 border-2 transition-all ${selectedSkin === s ? 'border-[#5de2ef] bg-[#5de2ef]/10 scale-110' : 'border-white/20 opacity-60'}`}>
                <div className={`w-12 h-12 mx-auto mb-2 ${s==='CORE'?'bg-cyan-400':s==='PHANTOM'?'bg-fuchsia-500':'bg-red-500'}`} style={{clipPath: 'polygon(50% 0, 100% 100%, 0 100%)'}} />
                <span className="text-white font-bold">{s}</span>
              </button>
            ))}
          </div>
          <button onClick={initGame} className="w-72 py-4 bg-[#5de2ef] text-black font-black text-xl tracking-widest hover:brightness-110 shadow-[0_0_20px_rgba(93,226,239,0.4)]">{t.LAUNCH}</button>
          <button onClick={() => setMenuSection('MAIN')} className="mt-6 text-white/50 hover:text-white">{t.BACK}</button>
        </div>
      )}

      {/* HIGHSCORES */}
      {menuSection === 'HIGHSCORES' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 text-white">
          <h2 className="text-4xl text-[#fbbf24] font-black mb-8">{t.HIGHSCORES}</h2>
          <div className="w-full max-w-md bg-white/5 p-6 rounded-lg mb-8">
            {highScores.length === 0 ? <p className="text-center opacity-50">NO DATA</p> : highScores.map((h, i) => (
              <div key={i} className="flex justify-between border-b border-white/10 py-2">
                <span className="text-[#5de2ef] font-bold">#{i+1}</span>
                <span>{h.score.toString().padStart(6, '0')}</span>
                <span className="opacity-50 text-sm">WAVE {h.wave}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setMenuSection('MAIN')} className="text-white/50 hover:text-white">{t.BACK}</button>
        </div>
      )}
      
       {/* SETTINGS */}
       {menuSection === 'SETTINGS' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 text-white">
          <h2 className="text-4xl text-[#5de2ef] font-black mb-8">{t.OPTIONS}</h2>
          <div className="flex flex-col gap-6 w-80">
            <div>
              <label className="text-xs font-bold opacity-70">MASTER VOLUME</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full accent-[#5de2ef]" value={settings.masterVolume} onChange={e => setSettings({...settings, masterVolume: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-xs font-bold opacity-70">GRAPHICS</label>
              <div className="flex gap-2 mt-1">
                {['LOW', 'HIGH'].map((q) => (
                  <button key={q} onClick={() => setSettings({...settings, quality: q as any})} className={`flex-1 py-1 border ${settings.quality === q ? 'bg-[#5de2ef] text-black border-[#5de2ef]' : 'border-white/30'}`}>{q}</button>
                ))}
              </div>
            </div>
             <div>
              <label className="text-xs font-bold opacity-70">LANGUAGE</label>
              <button onClick={() => setSettings({...settings, language: settings.language === 'PT' ? 'EN' : 'PT'})} className="w-full py-2 border border-white/30 mt-1">{settings.language === 'PT' ? 'PORTUGUÊS' : 'ENGLISH'}</button>
            </div>
          </div>
          <button onClick={() => setMenuSection('MAIN')} className="mt-10 text-white/50 hover:text-white">{t.BACK}</button>
        </div>
      )}

      {/* CREDITS */}
      {menuSection === 'CREDITS' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 text-white text-center">
          <h2 className="text-4xl text-[#5de2ef] font-black mb-12">{t.CREDITS}</h2>
          <p className="mb-2 font-bold text-xl">TR4FULHA TEAM</p>
          <p className="opacity-60 mb-8">Development & Design</p>
          <p className="mb-2 font-bold text-xl">MUSIC & SFX</p>
          <p className="opacity-60 mb-12">Generated / Retro Synthesis</p>
          <button onClick={() => setMenuSection('MAIN')} className="text-white/50 hover:text-white">{t.BACK}</button>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <h2 className="text-6xl font-black text-white italic mb-4">{t.GAME_OVER}</h2>
          <div className="text-3xl text-[#5de2ef] font-bold mb-12">{t.SCORE}: {score}</div>
          <button onClick={initGame} className="w-72 py-4 bg-white text-black font-black tracking-widest mb-4 hover:bg-gray-200">{t.RESTART}</button>
          <button onClick={() => setGameState('START')} className="text-white/50 hover:text-white">MENU</button>
        </div>
      )}

      {/* HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start pointer-events-none z-20">
          <div>
            <div className="text-[#5de2ef] font-black text-xl md:text-2xl drop-shadow-md">{score.toString().padStart(6, '0')}</div>
            <div className="text-white/60 font-bold text-xs">WAVE {wave}</div>
          </div>
          {message && <div className="absolute top-20 left-1/2 -translate-x-1/2 text-red-500 font-black animate-pulse text-xl whitespace-nowrap">{message}</div>}
          <div className="flex flex-col items-end gap-2">
             <div className="flex gap-1">
               {[...Array(Math.max(0, lives))].map((_, i) => <span key={i} className="text-[#f43f5e] text-2xl drop-shadow-md">❤</span>)}
             </div>
             <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden border border-white/20">
               <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${Math.min(100, player.current.abilityCharge)}%` }} />
             </div>
          </div>
        </div>
      )}

      {/* MOBILE CONTROLS */}
      {gameState === 'PLAYING' && (
        <MobileControls mode="SHOOTER" onPress={(k, p) => { 
          keys.current[k] = p; 
          if(k==='x' && p) useSpecial();
        }} />
      )}
    </div>
  );
};

export default App;
