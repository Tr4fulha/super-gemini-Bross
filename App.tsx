
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject, PowerUp, Projectile, Star, Particle, MenuSection, GraphicsQuality, GameSettings } from './types';
import { WALK_SPEED, JUMP_POWER, GRAVITY, FALL_GRAVITY_MULT, FRICTION, PREDEFINED_LEVELS } from './constants';
import MobileControls from './components/MobileControls';

type ShooterSkin = 'CORE' | 'PHANTOM' | 'STRIKER';

const TRANSLATIONS = {
  PT: {
    PLAY: "JOGAR",
    TUTORIAL: "TUTORIAL",
    OPTIONS: "OPÇÕES",
    STORE: "LOJA",
    QUIT: "SAIR",
    SETTINGS_TITLE: "PAINEL DE CONTROLE",
    AUDIO: "ÁUDIO",
    GRAPHICS: "QUALIDADE GRÁFICA",
    LANGUAGE: "IDIOMA",
    KEYBOARD: "TECLADO",
    MOBILE: "MOBILE",
    CREDITS: "CRÉDITOS",
    CHANGELOG: "LOG DE MUDANÇAS",
    VOLUME: "MASTER",
    SFX: "EFEITOS",
    MUSIC: "MÚSICA",
    BACK: "VOLTAR",
    LAUNCH: "LANÇAR NAVE",
    SCORE: "PONTOS",
    WAVE: "ONDA",
    MISSION_COMPLETE: "VITÓRIA TÁTICA",
    VESSEL_DOWN: "CONTATO PERDIDO",
    FINAL_SCORE: "RESULTADO FINAL",
    RESTART: "REINICIAR",
    PAUSE: "PAUSAR",
    RESUME: "CONTINUAR",
    QUALITY_LOW: "8-BIT (BAIXA)",
    QUALITY_MEDIUM: "16-BIT (MÉDIA)",
    QUALITY_HIGH: "ULTRA (ALTA)",
    IN_DEV: "JOGO EM DESENVOLVIMENTO",
    CREATED_BY: "CRIADO POR TR4FULHA TEAM",
    START: "TOQUE PARA INICIAR",
    V_LOG: "V2.1 - Invasão Estelar",
    LOG_1: "- 4 naves: Scout, Interceptor, Bomber e Heavy (Mísseis).",
    LOG_2: "- 9 Power-ups: Slow-mo, EMP, Ghost, Triple Shot e mais.",
    LOG_3: "- Sistema de explosões, partículas e feedback de dano.",
    LOG_4: "- Física de voo recalibrada e novos comportamentos inimigos.",
    LOG_5: "- Designs de naves pixelados e balanceamento de dano.",
    DEV: "Engenharia: Gemini Core",
    ART: "Art: Pixel Syndicate",
    SOUND: "Frequência: Synth-8",
    SELECT_SHIP: "SELECIONE SUA NAVE"
  },
  EN: {
    PLAY: "PLAY",
    TUTORIAL: "TUTORIAL",
    OPTIONS: "OPTIONS",
    STORE: "STORE",
    QUIT: "QUIT",
    SETTINGS_TITLE: "CONTROL PANEL",
    AUDIO: "AUDIO",
    GRAPHICS: "GRAPHICS QUALITY",
    LANGUAGE: "LANGUAGE",
    KEYBOARD: "KEYBOARD",
    MOBILE: "MOBILE",
    CREDITS: "CREDITS",
    CHANGELOG: "CHANGELOG",
    VOLUME: "MASTER",
    SFX: "SFX",
    MUSIC: "MUSIC",
    BACK: "BACK",
    LAUNCH: "LAUNCH SHIP",
    SCORE: "SCORE",
    WAVE: "WAVE",
    MISSION_COMPLETE: "TACTICAL WIN",
    VESSEL_DOWN: "SIGNAL LOST",
    FINAL_SCORE: "FINAL RESULT",
    RESTART: "RESTART",
    PAUSE: "PAUSE",
    RESUME: "RESUME",
    QUALITY_LOW: "8-BIT (LOW)",
    QUALITY_MEDIUM: "16-BIT (MED)",
    QUALITY_HIGH: "ULTRA (HIGH)",
    IN_DEV: "GAME IN DEVELOPMENT",
    CREATED_BY: "CREATED BY TR4FULHA TEAM",
    START: "TOUCH TO START",
    V_LOG: "V2.1 - Stellar Invasion",
    LOG_1: "- 4 ships: Scout, Interceptor, Bomber, and Heavy (Missiles).",
    LOG_2: "- 9 Power-ups: Slow-mo, EMP, Ghost, Triple Shot, and more.",
    LOG_3: "- Explosion system, particles, and damage feedback.",
    LOG_4: "- Calibrated flight physics and new enemy AI patterns.",
    LOG_5: "- Pixel-art ship designs and damage balancing.",
    DEV: "Engineering: Gemini Core",
    ART: "Art: Pixel Syndicate",
    SOUND: "Frequency: Synth-8",
    SELECT_SHIP: "SELECT YOUR SHIP"
  }
};

const PixelButton: React.FC<{
  label: string;
  onClick: () => void;
  width?: string;
  className?: string;
}> = ({ label, onClick, width = 'w-64 md:w-80', className = '' }) => (
  <button
    onClick={onClick}
    className={`relative ${width} h-10 md:h-12 bg-[#1a2e35] border-y-2 border-[#5de2ef] group active:scale-95 transition-all mb-1 ${className}`}
    style={{ imageRendering: 'pixelated' }}
  >
    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_2px,#000_4px)]"></div>
    <div className="absolute inset-y-0 left-0 w-[2px] bg-[#5de2ef]"></div>
    <div className="absolute inset-y-0 right-0 w-[2px] bg-[#5de2ef]"></div>
    <div className="absolute -top-[2px] -left-[2px] w-3 h-3 border-t-4 border-l-4 border-[#5de2ef]"></div>
    <div className="absolute -bottom-[2px] -right-[2px] w-3 h-3 border-b-4 border-r-4 border-[#5de2ef]"></div>
    <span className="relative z-10 text-[#5de2ef] font-bold uppercase tracking-widest text-xs md:text-sm">
      {label}
    </span>
  </button>
);

const PixelIconButton: React.FC<{
  icon: string | React.ReactNode;
  onClick: () => void;
  size?: string;
  className?: string;
}> = ({ icon, onClick, size = 'w-10 h-10 md:w-12 md:h-12', className = '' }) => (
  <button
    onClick={onClick}
    className={`relative ${size} bg-[#1a2e35] border-2 border-[#5de2ef] flex items-center justify-center active:scale-90 transition-all shadow-md group ${className}`}
  >
    <span className="text-[#5de2ef] text-lg font-bold drop-shadow-md">{icon}</span>
  </button>
);

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [gameState, setGameState] = useState<GameState>('INTRO');
  const [menuSection, setMenuSection] = useState<MenuSection>('MAIN');
  
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('gemini_settings');
    return saved ? JSON.parse(saved) : {
      masterVolume: 0.8, sfxVolume: 0.6, musicVolume: 0.4,
      quality: 'HIGH', language: 'PT'
    };
  });

  const t = TRANSLATIONS[settings.language];
  const [selectedSkin, setSelectedSkin] = useState<ShooterSkin>(() => (localStorage.getItem('gemini_selected_skin') as ShooterSkin) || 'CORE');
  const [isSelectingSkin, setIsSelectingSkin] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [shooterWave, setShooterWave] = useState(1);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const audioCtx = useRef<AudioContext | null>(null);
  const musicInterval = useRef<any>(null);

  const player = useRef<Player>({
    x: dims.w / 2 - 15, y: dims.h - 100, width: 30, height: 30, velocityX: 0, velocityY: 0, isJumping: false, score: 0, lives: 3,
    direction: 'right', isLarge: false, invincibilityFrames: 0, powerLevel: 1, shieldFrames: 0, maxShieldFrames: 720,
    hasDrone: false, droneFrames: 0, maxDroneFrames: 0, tripleShotFrames: 0, maxTripleShotFrames: 1080, tilt: 0,
    energy: 0, maxEnergy: 100, dashCooldown: 0, dashFrames: 0, scrapCount: 0,
    damageBoostFrames: 0, slowMoFrames: 0, rapidFireFrames: 0, ghostFrames: 0, empCooldown: 0
  });
  
  const levelData = useRef<LevelData>({ platforms: [], enemies: [], coins: [], powerUps: [], goal: { x: 0, y: 0, width: 40, height: 100 }, playerStart: { x: 50, y: 300 } });
  const projectiles = useRef<Projectile[]>([]);
  const stars = useRef<Star[]>([]);
  const particles = useRef<Particle[]>([]);
  const lastShotTime = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('gemini_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const handleResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
  };

  const startMusic = () => {
    if (musicInterval.current) clearInterval(musicInterval.current);
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    musicInterval.current = setInterval(() => {
      if (gameState !== 'PLAYING') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const notes = [261.63, 311.13, 349.23, 392.00];
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], ctx.currentTime);
      gain.gain.setValueAtTime(settings.masterVolume * settings.musicVolume * 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }, 450);
  };

  const playSound = (type: string) => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = settings.sfxVolume * settings.masterVolume;
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'shoot') {
      osc.type = 'square'; osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.06 * vol, ctx.currentTime);
    } else if (type === 'explosion') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(10, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
    } else if (type === 'powerup') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
    }
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  };

  const spawnWave = useCallback((wave: number) => {
    const enemies: Enemy[] = [];
    setShooterWave(wave);
    const cols = Math.min(6, 4 + Math.floor(wave / 2));
    const px = 100;
    const py = 70;
    const sx = (dims.w - (cols * px)) / 2;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < cols; c++) {
        let type: Enemy['type'] = 'interceptor';
        let health = 2 + Math.floor(wave / 2);
        let vx = 1.0 + (wave * 0.1);
        let w = 34, h = 26;

        const rand = Math.random();
        if (rand < 0.25) {
          type = 'scout';
          health = 1;
          vx *= 1.8;
          w = 24; h = 20;
        } else if (rand < 0.5) {
          type = 'heavy';
          health *= 3;
          vx *= 0.6;
          w = 50; h = 40;
        } else if (rand < 0.7) {
          type = 'bomber';
          health *= 2;
          vx *= 0.8;
          w = 44; h = 34;
        }

        enemies.push({
          x: sx + c * px, y: -150 - (r * 100), width: w, height: h, velocityX: vx, velocityY: 0.4,
          type: type, range: 0, startX: 0, startY: 0, health: health,
          targetX: sx + c * px, targetY: 60 + r * py, phase: 'entry', sineOffset: Math.random() * 6,
          lastShotTime: Date.now()
        });
      }
    }
    levelData.current.enemies = enemies;
  }, [dims.w]);

  const drawShip = (ctx: CanvasRenderingContext2D, p: Player, quality: GraphicsQuality, skin: ShooterSkin) => {
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate(p.tilt);
    ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));
    
    // Status effects visuals
    if (p.ghostFrames > 0) ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 100) * 0.2;
    
    const color = { CORE: '#22d3ee', PHANTOM: '#d946ef', STRIKER: '#ef4444' }[skin];
    const mainColor = p.damageBoostFrames > 0 ? '#fbbf24' : color;

    if (quality === 'LOW') {
      ctx.fillStyle = mainColor;
      ctx.fillRect(p.x + 5, p.y + 5, 20, 25);
      ctx.fillRect(p.x, p.y + 15, 30, 10);
    } else {
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(p.x + 15, p.y);
      ctx.lineTo(p.x + 30, p.y + 30);
      ctx.lineTo(p.x + 15, p.y + 20);
      ctx.lineTo(p.x, p.y + 30);
      ctx.closePath(); ctx.fill();

      if (quality === 'HIGH') {
        ctx.shadowBlur = 12; ctx.shadowColor = mainColor;
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(p.x + 12, p.y + 8, 6, 6);
      }
    }

    if (p.shieldFrames > 0) {
      ctx.strokeStyle = '#5de2ef';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawEnemyShip = (ctx: CanvasRenderingContext2D, e: Enemy, quality: GraphicsQuality) => {
    ctx.save();
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height / 2;
    ctx.translate(cx, cy);

    ctx.fillStyle = e.hitFlash ? '#fff' : '#f43f5e';
    if (e.type === 'scout') {
      ctx.fillStyle = e.hitFlash ? '#fff' : '#10b981';
      ctx.beginPath();
      ctx.moveTo(0, 10); ctx.lineTo(10, -10); ctx.lineTo(0, -5); ctx.lineTo(-10, -10);
      ctx.closePath(); ctx.fill();
    } else if (e.type === 'interceptor') {
      ctx.fillStyle = e.hitFlash ? '#fff' : '#f43f5e';
      ctx.fillRect(-15, -12, 5, 24);
      ctx.fillRect(10, -12, 5, 24);
      ctx.fillRect(-10, -2, 20, 4);
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'heavy') {
      ctx.fillStyle = e.hitFlash ? '#fff' : '#ea580c';
      ctx.fillRect(-25, -20, 50, 30);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-10, 5, 5, 10);
      ctx.fillRect(5, 5, 5, 10);
      ctx.fillStyle = e.hitFlash ? '#fff' : '#78350f';
      ctx.fillRect(-20, -15, 40, 5);
    } else if (e.type === 'bomber') {
      ctx.fillStyle = e.hitFlash ? '#fff' : '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(0, 15); ctx.lineTo(22, -10); ctx.lineTo(10, -5); ctx.lineTo(-10, -5); ctx.lineTo(-22, -10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.arc(0, -2, 8, 0, Math.PI * 2); ctx.fill();
    }
    
    if (quality === 'HIGH') {
      ctx.shadowBlur = 8; ctx.shadowColor = ctx.fillStyle as string;
    }
    ctx.restore();
  };

  const renderShooter = () => {
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, dims.w, dims.h);
    stars.current.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${s.opacity})`; ctx.fillRect(s.x, s.y, s.size, s.size); });
    
    const p = player.current;
    if (p.invincibilityFrames % 10 < 5) drawShip(ctx, p, settings.quality, selectedSkin);
    
    levelData.current.enemies.forEach(e => {
      drawEnemyShip(ctx, e, settings.quality);
    });
    
    levelData.current.powerUps.forEach(pu => {
      ctx.save();
      const colors: Record<string, string> = {
        life: '#f43f5e', shield: '#0ea5e9', triple_shot: '#fbbf24',
        power_boost: '#f97316', slow_mo: '#8b5cf6', rapid_fire: '#d946ef',
        emp: '#ffffff', ghost: '#94a3b8', scrap: '#10b981'
      };
      ctx.fillStyle = colors[pu.type] || '#fff';
      ctx.beginPath();
      ctx.arc(pu.x + pu.width/2, pu.y + pu.height/2, pu.width/2, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    });

    projectiles.current.forEach(pr => {
      ctx.fillStyle = pr.color;
      if (pr.isMissile) {
        ctx.fillRect(pr.x - 2, pr.y, 8, 16);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(pr.x, pr.y + 16, 4, 4 + Math.random() * 8);
      } else {
        ctx.fillRect(pr.x, pr.y, pr.width, pr.height);
      }
    });

    particles.current.forEach((part, i) => {
      ctx.globalAlpha = part.life;
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.size, part.size);
      part.x += part.vx; part.y += part.vy;
      part.life -= part.decay || 0.02;
      if (part.life <= 0) particles.current.splice(i, 1);
    });
    ctx.globalAlpha = 1;
  };

  const createExplosion = (x: number, y: number, color: string, count: number = 10) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        life: 1.0, color: color, size: 2 + Math.random() * 4, decay: 0.02 + Math.random() * 0.03
      });
    }
  };

  const updateShooter = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const p = player.current;
    
    const isSlowMo = p.slowMoFrames > 0;
    const timeScale = isSlowMo ? 0.4 : 1.0;

    const moveLeft = keysPressed.current['ArrowLeft'] || keysPressed.current['a'];
    const moveRight = keysPressed.current['ArrowRight'] || keysPressed.current['d'];
    if (moveLeft) { p.velocityX = Math.max(p.velocityX - 0.7, -7); p.tilt = -0.2; }
    else if (moveRight) { p.velocityX = Math.min(p.velocityX + 0.7, 7); p.tilt = 0.2; }
    else { p.velocityX *= 0.88; p.tilt *= 0.8; }
    p.x += p.velocityX; p.x = Math.max(0, Math.min(dims.w - p.width, p.x));

    stars.current.forEach(s => { s.y += s.speed * timeScale; if (s.y > dims.h) s.y = -10; });

    const shotDelay = p.rapidFireFrames > 0 ? 80 : 200;
    if (keysPressed.current[' '] && Date.now() - lastShotTime.current > shotDelay) {
      const damage = p.damageBoostFrames > 0 ? 3 : 1;
      projectiles.current.push({ x: p.x + 13, y: p.y, width: 4, height: 15, velocityX: 0, velocityY: -10, owner: 'player', color: '#5de2ef', damage });
      if (p.tripleShotFrames > 0) {
        projectiles.current.push({ x: p.x, y: p.y + 10, width: 4, height: 15, velocityX: -2, velocityY: -9, owner: 'player', color: '#fbbf24', damage });
        projectiles.current.push({ x: p.x + 26, y: p.y + 10, width: 4, height: 15, velocityX: 2, velocityY: -9, owner: 'player', color: '#fbbf24', damage });
      }
      playSound('shoot'); lastShotTime.current = Date.now();
    }

    if (p.shieldFrames > 0) p.shieldFrames--;
    if (p.tripleShotFrames > 0) p.tripleShotFrames--;
    if (p.damageBoostFrames > 0) p.damageBoostFrames--;
    if (p.slowMoFrames > 0) p.slowMoFrames--;
    if (p.rapidFireFrames > 0) p.rapidFireFrames--;
    if (p.ghostFrames > 0) p.ghostFrames--;
    if (p.invincibilityFrames > 0) p.invincibilityFrames--;

    levelData.current.enemies.forEach((e, ei) => {
      if (e.phase === 'entry') {
        e.x += (e.targetX! - e.x) * 0.05 * timeScale; e.y += (e.targetY! - e.y) * 0.05 * timeScale;
        if (Math.abs(e.x - e.targetX!) < 3) e.phase = 'active';
      } else {
        e.sineOffset! += 0.04 * timeScale;
        e.x += Math.sin(e.sineOffset!) * 1.5 * timeScale;
        e.y += e.velocityY * timeScale;
      }

      let fireChance = 0.005;
      if (e.type === 'scout') fireChance = 0.02;
      else if (e.type === 'bomber') fireChance = 0.01;
      else if (e.type === 'heavy') fireChance = 0.003;

      if (Math.random() < fireChance * timeScale && e.y > 0) {
        if (e.type === 'heavy') {
           projectiles.current.push({ x: e.x + e.width/2, y: e.y + e.height, width: 8, height: 16, velocityX: 0, velocityY: 4, owner: 'enemy', color: '#ea580c', damage: 2, isMissile: true });
        } else {
           projectiles.current.push({ x: e.x + e.width/2, y: e.y + e.height, width: 6, height: 12, velocityX: 0, velocityY: 6, owner: 'enemy', color: '#f43f5e', damage: 1 });
        }
      }

      projectiles.current.forEach((pr, pi) => {
        if (pr.owner === 'player' && pr.x < e.x + e.width && pr.x + pr.width > e.x && pr.y < e.y + e.height && pr.y + pr.height > e.y) {
          e.health -= pr.damage; e.hitFlash = 5; projectiles.current.splice(pi, 1);
          if (e.health <= 0) {
            playSound('explosion'); createExplosion(e.x + e.width/2, e.y + e.height/2, '#f43f5e', 15);
            levelData.current.enemies.splice(ei, 1);
            setScore(s => s + (e.type === 'heavy' ? 500 : 150));
            if (Math.random() < 0.2) {
              const types: PowerUp['type'][] = ['life', 'shield', 'triple_shot', 'power_boost', 'slow_mo', 'rapid_fire', 'emp', 'ghost'];
              const type = types[Math.floor(Math.random() * types.length)];
              levelData.current.powerUps.push({ x: e.x, y: e.y, width: 20, height: 20, collected: false, type, velocityY: 1.5 });
            }
          }
        }
      });
      
      if (e.x < p.x + p.width && e.x + e.width > p.x && e.y < p.y + p.height && e.y + e.height > p.y) {
        if (p.invincibilityFrames === 0 && p.ghostFrames === 0) {
          if (p.shieldFrames > 0) { p.shieldFrames = 0; p.invincibilityFrames = 60; }
          else { setLives(l => l - 1); p.invincibilityFrames = 100; }
          playSound('explosion'); createExplosion(p.x, p.y, '#f43f5e', 20);
          if (lives <= 1 && p.shieldFrames <= 0) setGameState('GAME_OVER');
          levelData.current.enemies.splice(ei, 1);
        }
      }

      if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;
      if (e.y > dims.h) levelData.current.enemies.splice(ei, 1);
    });

    projectiles.current.forEach((pr, i) => { 
      pr.y += pr.velocityY * (pr.owner === 'enemy' ? timeScale : 1.0); 
      pr.x += pr.velocityX * (pr.owner === 'enemy' ? timeScale : 1.0); 
      
      if (pr.owner === 'enemy' && pr.x < p.x + p.width && pr.x + pr.width > p.x && pr.y < p.y + p.height && pr.y + pr.height > p.y) {
        if (p.invincibilityFrames === 0 && p.ghostFrames === 0) {
          if (p.shieldFrames > 0) { p.shieldFrames = 0; p.invincibilityFrames = 60; }
          else { setLives(l => l - pr.damage); p.invincibilityFrames = 100; }
          projectiles.current.splice(i, 1);
          playSound('explosion');
          if (lives - pr.damage <= 0 && p.shieldFrames <= 0) setGameState('GAME_OVER');
        }
      }
      if (pr.y < -50 || pr.y > dims.h + 50) projectiles.current.splice(i, 1);
    });

    levelData.current.powerUps.forEach((pu, i) => {
      pu.y += pu.velocityY * timeScale;
      if (pu.x < p.x + p.width && pu.x + pu.width > p.x && pu.y < p.y + p.height && pu.y + pu.height > p.y) {
        playSound('powerup');
        if (pu.type === 'life') setLives(l => Math.min(5, l + 1));
        else if (pu.type === 'shield') p.shieldFrames = 600;
        else if (pu.type === 'triple_shot') p.tripleShotFrames = 600;
        else if (pu.type === 'power_boost') p.damageBoostFrames = 500;
        else if (pu.type === 'slow_mo') p.slowMoFrames = 400;
        else if (pu.type === 'rapid_fire') p.rapidFireFrames = 400;
        else if (pu.type === 'ghost') p.ghostFrames = 300;
        else if (pu.type === 'emp') {
          createExplosion(dims.w/2, dims.h/2, '#fff', 50);
          projectiles.current = projectiles.current.filter(proj => proj.owner === 'player');
          levelData.current.enemies.forEach(en => { en.health -= 2; en.hitFlash = 10; });
        }
        levelData.current.powerUps.splice(i, 1);
      }
      if (pu.y > dims.h) levelData.current.powerUps.splice(i, 1);
    });

    if (levelData.current.enemies.length === 0) spawnWave(shooterWave + 1);

    renderShooter();
    requestRef.current = requestAnimationFrame(updateShooter);
  }, [gameState, dims, shooterWave, spawnWave, lives]);

  const initShooter = () => {
    initAudio(); setGameState('PLAYING'); setGameMode('SHOOTER'); setScore(0); setLives(3); setShooterWave(1);
    setIsSelectingSkin(false);
    projectiles.current = [];
    levelData.current.powerUps = [];
    player.current = { ...player.current, x: dims.w / 2 - 15, y: dims.h - 100, velocityX: 0, velocityY: 0, 
      shieldFrames: 0, tripleShotFrames: 0, damageBoostFrames: 0, slowMoFrames: 0, rapidFireFrames: 0, ghostFrames: 0, invincibilityFrames: 0 };
    const s: Star[] = []; for (let i = 0; i < 60; i++) s.push({ x: Math.random() * dims.w, y: Math.random() * dims.h, size: Math.random() * 2, speed: 1 + Math.random() * 2, opacity: Math.random() });
    stars.current = s; spawnWave(1);
    startMusic();
  };

  useEffect(() => {
    if (gameMode === 'SHOOTER' && gameState === 'PLAYING') {
      requestRef.current = requestAnimationFrame(updateShooter);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameMode, gameState, updateShooter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(e.key)) e.preventDefault();
      keysPressed.current[e.key] = true;
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' && gameState === 'PLAYING') setGameState('PAUSED');
      else if (e.key === 'Escape' && gameState === 'PAUSED') setGameState('PLAYING');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [gameState]);

  return (
    <div className="relative w-full h-screen bg-[#020617] flex items-center justify-center overflow-hidden touch-none select-none font-sans">
      <canvas ref={canvasRef} width={dims.w} height={dims.h} className="absolute inset-0 w-full h-full block" style={{ imageRendering: 'pixelated' }} />

      {gameState === 'INTRO' && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-[#020617] cursor-pointer" onClick={() => setGameState('START')}>
          <div className="animate-pulse flex flex-col items-center mb-10">
            <div className="text-8xl md:text-[12rem] font-black text-[#5de2ef] italic drop-shadow-[0_10px_0_rgba(0,0,0,0.8)] leading-none">GA</div>
            <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter -mt-4">GEMINI <span className="text-[#5de2ef]">ARCADE</span></h1>
          </div>
          <div className="text-center space-y-6 animate-in fade-in duration-1000 delay-500">
            <div className="bg-red-600/20 border-2 border-red-500/50 px-4 py-1">
              <p className="text-red-500 font-black text-[10px] md:text-xs uppercase italic tracking-[0.3em]">{t.IN_DEV}</p>
            </div>
            <p className="text-[#5de2ef] font-black text-sm tracking-[0.5em] animate-bounce uppercase">{t.START}</p>
            <p className="text-white/30 font-bold text-[10px] uppercase tracking-widest">{t.CREATED_BY}</p>
          </div>
        </div>
      )}

      {gameState === 'START' && menuSection === 'MAIN' && !isSelectingSkin && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d141f]/60 backdrop-blur-md">
          <h1 className="text-5xl md:text-8xl font-black text-[#5de2ef] italic mb-12 uppercase text-center drop-shadow-2xl">
            STAR <span className="text-white">GEMINI</span>
          </h1>
          <div className="flex flex-col items-center gap-3">
            <PixelButton label={t.PLAY} onClick={() => setMenuSection('PLAY')} />
            <PixelButton label={t.TUTORIAL} onClick={() => {}} />
            <PixelButton label={t.OPTIONS} onClick={() => setMenuSection('SETTINGS')} />
            <PixelButton label={t.STORE} onClick={() => {}} />
            <PixelButton label={t.QUIT} onClick={() => window.close()} width="w-48" className="mt-8 opacity-40 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}

      {menuSection === 'SETTINGS' && (
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a2e35] border-4 border-[#5de2ef] p-6 md:p-10 animate-in slide-in-from-right-10 duration-200 shadow-2xl z-[150]">
          <div className="flex justify-between items-center mb-8 border-b-2 border-[#5de2ef]/20 pb-4">
            <h2 className="text-2xl md:text-4xl font-black text-[#5de2ef] uppercase italic tracking-tighter">{t.SETTINGS_TITLE}</h2>
            <PixelIconButton icon="✖" onClick={() => setMenuSection('MAIN')} size="w-10 h-10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <section>
                <h3 className="text-[#5de2ef] font-black uppercase text-sm mb-4 border-l-4 border-[#5de2ef] pl-2">{t.AUDIO}</h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-white text-[10px] font-bold uppercase tracking-widest"><span>{t.VOLUME}</span><span>{Math.round(settings.masterVolume*100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.1" value={settings.masterVolume} onChange={(e) => setSettings({...settings, masterVolume: parseFloat(e.target.value)})} className="w-full accent-[#5de2ef]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-white text-[10px] font-bold uppercase tracking-widest"><span>{t.MUSIC}</span><span>{Math.round(settings.musicVolume*100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.1" value={settings.musicVolume} onChange={(e) => setSettings({...settings, musicVolume: parseFloat(e.target.value)})} className="w-full accent-[#5de2ef]" />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[#5de2ef] font-black uppercase text-sm mb-4 border-l-4 border-[#5de2ef] pl-2">{t.GRAPHICS}</h3>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map(q => (
                    <button key={q} onClick={() => setSettings({...settings, quality: q})} className={`flex-1 py-2 border-2 text-[10px] font-black transition-all ${settings.quality === q ? 'bg-[#5de2ef] text-black border-[#5de2ef]' : 'bg-transparent text-[#5de2ef] border-[#5de2ef]/30'}`}>{t[`QUALITY_${q}` as keyof typeof t]}</button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[#5de2ef] font-black uppercase text-sm mb-4 border-l-4 border-[#5de2ef] pl-2">{t.KEYBOARD}</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60 font-bold uppercase">
                  <div className="bg-black/20 p-2 border border-white/5">W/S/A/D - MOVE</div>
                  <div className="bg-black/20 p-2 border border-white/5">SPACE - FIRE</div>
                  <div className="bg-black/20 p-2 border border-white/5">SHIFT - DASH</div>
                  <div className="bg-black/20 p-2 border border-white/5">ESC - PAUSE</div>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section>
                <h3 className="text-[#5de2ef] font-black uppercase text-sm mb-4 border-l-4 border-[#5de2ef] pl-2">{t.LANGUAGE}</h3>
                <div className="flex gap-2">
                  <button onClick={() => setSettings({...settings, language: 'PT'})} className={`flex-1 py-2 border-2 font-black text-xs ${settings.language === 'PT' ? 'bg-[#5de2ef] text-black border-[#5de2ef]' : 'text-[#5de2ef] border-[#5de2ef]/30'}`}>PORTUGUÊS</button>
                  <button onClick={() => setSettings({...settings, language: 'EN'})} className={`flex-1 py-2 border-2 font-black text-xs ${settings.language === 'EN' ? 'bg-[#5de2ef] text-black border-[#5de2ef]' : 'text-[#5de2ef] border-[#5de2ef]/30'}`}>ENGLISH</button>
                </div>
              </section>

              <section>
                <h3 className="text-[#5de2ef] font-black uppercase text-sm mb-4 border-l-4 border-[#5de2ef] pl-2">{t.CHANGELOG}</h3>
                <div className="bg-black/40 p-4 border border-white/5 text-[9px] text-white/50 font-mono space-y-1 h-24 overflow-y-auto">
                  <p className="text-[#5de2ef] font-bold">{t.V_LOG}</p>
                  <p>{t.LOG_1}</p><p>{t.LOG_2}</p><p>{t.LOG_3}</p><p>{t.LOG_4}</p><p>{t.LOG_5}</p>
                </div>
              </section>

              <section>
                <h3 className="text-[#5de2ef] font-black uppercase text-sm mb-4 border-l-4 border-[#5de2ef] pl-2">{t.CREDITS}</h3>
                <div className="text-[10px] text-white/70 italic space-y-1">
                  <p>{t.DEV}</p><p>{t.ART}</p><p>{t.SOUND}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {menuSection === 'PLAY' && gameState === 'START' && !isSelectingSkin && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d141f]/80 backdrop-blur-xl">
          <h2 className="text-4xl font-black text-[#5de2ef] mb-12 uppercase italic tracking-tighter drop-shadow-lg">MISSÕES DISPONÍVEIS</h2>
          <div className="grid grid-cols-1 gap-6">
            <div onClick={() => setIsSelectingSkin(true)} className="w-80 h-40 bg-[#1a2e35] border-4 border-[#5de2ef] p-6 cursor-pointer hover:scale-105 transition-all flex flex-col justify-end group shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 bg-[#5de2ef] text-black font-black text-[9px] uppercase">Unlocked</div>
               <div className="text-[#5de2ef] font-black uppercase text-3xl group-hover:tracking-widest transition-all">STAR GEMINI</div>
               <div className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Ondas de Combate v2.1</div>
            </div>
          </div>
          <PixelButton label={t.BACK} onClick={() => setMenuSection('MAIN')} width="w-48" className="mt-12" />
        </div>
      )}

      {isSelectingSkin && (
        <div className="absolute inset-0 z-[160] flex flex-col items-center justify-center bg-[#0d141f]/95 backdrop-blur-2xl p-4">
          <h2 className="text-4xl md:text-6xl font-black text-[#5de2ef] mb-12 uppercase italic tracking-tighter">{t.SELECT_SHIP}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-5xl">
            {[
              { id: 'CORE' as ShooterSkin, name: 'Core Alpha', color: '#22d3ee', desc: 'Equilibrada' },
              { id: 'PHANTOM' as ShooterSkin, name: 'Phantom X', color: '#d946ef', desc: 'Ágil e Veloz' },
              { id: 'STRIKER' as ShooterSkin, name: 'Striker Red', color: '#ef4444', desc: 'Poder de Fogo' }
            ].map(skin => (
              <div key={skin.id} onClick={() => { setSelectedSkin(skin.id); localStorage.setItem('gemini_selected_skin', skin.id); }} 
                className={`p-6 bg-[#1a2e35] border-4 cursor-pointer transition-all hover:translate-y-[-5px] ${selectedSkin === skin.id ? 'border-[#5de2ef] bg-[#25424b]' : 'border-white/5 opacity-60 hover:opacity-100'}`}>
                <div className="w-20 h-24 mx-auto mb-6 flex items-center justify-center bg-black/40 border-2 border-white/5 relative">
                   <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle, ${skin.color} 0%, transparent 70%)` }}></div>
                   <div style={{ width: 30, height: 30, backgroundColor: skin.color, clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}></div>
                </div>
                <h4 className="text-white font-black uppercase italic text-center text-xl mb-1">{skin.name}</h4>
                <p className="text-[#5de2ef] text-[10px] font-bold uppercase text-center tracking-widest">{skin.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <PixelButton label={t.BACK} onClick={() => setIsSelectingSkin(false)} width="w-40" />
            <PixelButton label={t.LAUNCH} onClick={initShooter} width="w-64" className="bg-[#5de2ef]/10" />
          </div>
        </div>
      )}

      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <>
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start pointer-events-none z-[60] safe-area-inset">
            <div className="bg-[#1a2e35]/90 border-2 border-[#5de2ef] px-4 py-2 shadow-xl flex gap-6 backdrop-blur-md">
               <div>
                 <span className="text-[10px] text-[#5de2ef] opacity-70 uppercase font-black block leading-none mb-1">{t.SCORE}</span>
                 <span className="text-2xl font-black text-[#5de2ef] tracking-tighter leading-none">{score.toString().padStart(6, '0')}</span>
               </div>
               <div>
                 <span className="text-[10px] text-[#5de2ef] opacity-70 uppercase font-black block leading-none mb-1">{t.WAVE}</span>
                 <span className="text-2xl font-black text-[#5de2ef] leading-none">{shooterWave}</span>
               </div>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              <PixelIconButton icon={gameState === 'PAUSED' ? "▶" : "Ⅱ"} onClick={() => setGameState(g => g === 'PLAYING' ? 'PAUSED' : 'PLAYING')} size="w-12 h-12" />
              <div className="bg-[#1a2e35]/90 border-2 border-[#5de2ef] p-3 flex gap-1 backdrop-blur-md">
                 {[...Array(lives)].map((_, i) => (<span key={i} className="text-[#ff5d5d] text-xl drop-shadow-md">❤</span>))}
              </div>
            </div>
          </div>
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 z-[180] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center">
              <h2 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-10 drop-shadow-2xl">{t.PAUSE}</h2>
              <PixelButton label={t.RESUME} onClick={() => setGameState('PLAYING')} />
              <PixelButton label="MENU" onClick={() => { setGameState('START'); setMenuSection('MAIN'); setIsSelectingSkin(false); }} className="mt-4 opacity-60" />
            </div>
          )}
        </>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-[190] bg-red-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-6xl md:text-9xl font-black text-white italic uppercase tracking-tighter mb-2">{t.VESSEL_DOWN}</h2>
          <div className="bg-black/50 border-2 border-red-500 p-6 mb-10">
            <p className="text-red-500 font-black uppercase text-xs mb-2">{t.FINAL_SCORE}</p>
            <p className="text-6xl font-black text-white">{score}</p>
          </div>
          <div className="flex flex-col gap-4">
            <PixelButton label={t.RESTART} onClick={initShooter} />
            <PixelButton label="MENU" onClick={() => { setGameState('START'); setMenuSection('MAIN'); setIsSelectingSkin(false); }} className="opacity-60" />
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && <MobileControls onPress={(k, p) => { initAudio(); keysPressed.current[k] = p; keysPressed.current[k.toLowerCase()] = p; }} mode="SHOOTER" />}
      
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-[300]"></div>
    </div>
  );
};

export default App;
