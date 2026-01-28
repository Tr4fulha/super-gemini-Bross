
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameState, LevelInfo, LevelData, Player, Platform, Enemy, Coin, Goal, GameObject, PowerUp, Projectile, Star, Particle, MenuSection, Nebula, Planet, GraphicsQuality, GameSettings } from './types';
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
    V_LOG: "V2.0 - Protocolo Final",
    LOG_1: "- Sistema de inimigos corrigido.",
    LOG_2: "- Hangar de skins restaurado.",
    LOG_3: "- Física de combate recalibrada.",
    LOG_4: "- Tela de intro com branding Tr4fulha.",
    LOG_5: "- Estabilidade da UI aprimorada.",
    DEV: "Engenharia: Gemini Core",
    ART: "Design: Pixel Syndicate",
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
    V_LOG: "V2.0 - Final Protocol",
    LOG_1: "- Enemy system fixed.",
    LOG_2: "- Skin hangar restored.",
    LOG_3: "- Combat physics recalibrated.",
    LOG_4: "- Intro screen with Tr4fulha branding.",
    LOG_5: "- UI stability enhanced.",
    DEV: "Engineering: Gemini Core",
    ART: "Design: Pixel Syndicate",
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
    energy: 0, maxEnergy: 100, dashCooldown: 0, dashFrames: 0, scrapCount: 0
  });
  
  const levelData = useRef<LevelData>({ platforms: [], enemies: [], coins: [], powerUps: [], goal: { x: 0, y: 0, width: 40, height: 100 }, playerStart: { x: 50, y: 300 } });
  const projectiles = useRef<Projectile[]>([]);
  const stars = useRef<Star[]>([]);
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
      gain.gain.setValueAtTime(0.08 * vol, ctx.currentTime);
    } else if (type === 'explosion') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(10, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
    }
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  };

  const spawnWave = useCallback((wave: number) => {
    const enemies: Enemy[] = [];
    setShooterWave(wave);
    const cols = 6;
    const px = 80;
    const py = 60;
    const sx = (dims.w - (cols * px)) / 2;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < cols; c++) {
        enemies.push({
          x: sx + c * px, y: -100 - (r * 80), width: 34, height: 26, velocityX: 1.2 + (wave * 0.1), velocityY: 0.5,
          type: 'invader', range: 0, startX: 0, startY: 0, health: 1 + Math.floor(wave / 4),
          targetX: sx + c * px, targetY: 60 + r * py, phase: 'entry', sineOffset: Math.random() * 6
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
    const color = { CORE: '#22d3ee', PHANTOM: '#d946ef', STRIKER: '#ef4444' }[skin];
    
    if (quality === 'LOW') {
      ctx.fillStyle = color;
      ctx.fillRect(p.x + 5, p.y + 5, 20, 25);
      ctx.fillRect(p.x, p.y + 15, 30, 10);
    } else if (quality === 'MEDIUM') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p.x + 15, p.y);
      ctx.lineTo(p.x + 30, p.y + 30);
      ctx.lineTo(p.x + 15, p.y + 20);
      ctx.lineTo(p.x, p.y + 30);
      ctx.closePath(); ctx.fill();
    } else {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 30);
      grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.shadowBlur = 10; ctx.shadowColor = color;
      ctx.beginPath();
      ctx.moveTo(p.x + 15, p.y);
      ctx.quadraticCurveTo(p.x + 35, p.y + 35, p.x + 15, p.y + 25);
      ctx.quadraticCurveTo(p.x - 5, p.y + 35, p.x + 15, p.y);
      ctx.fill();
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
      ctx.fillStyle = e.hitFlash ? '#fff' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Glow for high quality
      if (settings.quality === 'HIGH') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      }
    });
    
    projectiles.current.forEach(pr => {
      ctx.fillStyle = pr.color; ctx.fillRect(pr.x, pr.y, pr.width, pr.height);
    });
  };

  const updateShooter = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const p = player.current;
    
    // Physics
    const moveLeft = keysPressed.current['ArrowLeft'] || keysPressed.current['a'];
    const moveRight = keysPressed.current['ArrowRight'] || keysPressed.current['d'];
    if (moveLeft) { p.velocityX = Math.max(p.velocityX - 0.7, -7); p.tilt = -0.2; }
    else if (moveRight) { p.velocityX = Math.min(p.velocityX + 0.7, 7); p.tilt = 0.2; }
    else { p.velocityX *= 0.88; p.tilt *= 0.8; }
    p.x += p.velocityX; p.x = Math.max(0, Math.min(dims.w - p.width, p.x));

    stars.current.forEach(s => { s.y += s.speed; if (s.y > dims.h) s.y = -10; });

    // Manual Fire (Space Bar)
    if (keysPressed.current[' '] && Date.now() - lastShotTime.current > 180) {
      projectiles.current.push({ x: p.x + 13, y: p.y, width: 4, height: 15, velocityX: 0, velocityY: -10, owner: 'player', color: '#5de2ef' });
      playSound('shoot'); lastShotTime.current = Date.now();
    }

    // Enemies patterns
    levelData.current.enemies.forEach((e, ei) => {
      if (e.phase === 'entry') {
        e.x += (e.targetX! - e.x) * 0.05; e.y += (e.targetY! - e.y) * 0.05;
        if (Math.abs(e.x - e.targetX!) < 3) e.phase = 'active';
      } else {
        e.sineOffset! += 0.04;
        e.x += Math.sin(e.sineOffset!) * 1.5;
        e.y += 0.2; // Slowly move down
      }

      // Check bullet hits
      projectiles.current.forEach((pr, pi) => {
        if (pr.owner === 'player' && pr.x < e.x + e.width && pr.x + pr.width > e.x && pr.y < e.y + e.height && pr.y + pr.height > e.y) {
          e.health--; e.hitFlash = 5; projectiles.current.splice(pi, 1);
          if (e.health <= 0) {
            playSound('explosion'); levelData.current.enemies.splice(ei, 1);
            setScore(s => s + 150);
          }
        }
      });
      
      // Check collision with player
      if (e.x < p.x + p.width && e.x + e.width > p.x && e.y < p.y + p.height && e.y + e.height > p.y) {
        if (p.invincibilityFrames === 0) {
          setLives(l => l - 1); p.invincibilityFrames = 100; playSound('explosion');
          if (lives <= 1) setGameState('GAME_OVER');
        }
      }

      if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;
      if (e.y > dims.h) levelData.current.enemies.splice(ei, 1);
    });

    if (levelData.current.enemies.length === 0) spawnWave(shooterWave + 1);

    projectiles.current.forEach((pr, i) => { pr.y += pr.velocityY; if (pr.y < -30 || pr.y > dims.h + 30) projectiles.current.splice(i, 1); });

    renderShooter();
    requestRef.current = requestAnimationFrame(updateShooter);
  }, [gameState, dims, shooterWave, spawnWave, lives]);

  const initShooter = () => {
    initAudio(); setGameState('PLAYING'); setGameMode('SHOOTER'); setScore(0); setLives(3); setShooterWave(1);
    setIsSelectingSkin(false);
    projectiles.current = [];
    player.current = { ...player.current, x: dims.w / 2 - 15, y: dims.h - 100, velocityX: 0, velocityY: 0 };
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

      {/* TELA DE INTRODUÇÃO */}
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

      {/* MENU PRINCIPAL */}
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

      {/* CONFIGURAÇÕES / OPÇÕES */}
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

      {/* SELEÇÃO DE MISSÃO / JOGO */}
      {menuSection === 'PLAY' && gameState === 'START' && !isSelectingSkin && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d141f]/80 backdrop-blur-xl">
          <h2 className="text-4xl font-black text-[#5de2ef] mb-12 uppercase italic tracking-tighter drop-shadow-lg">MISSÕES DISPONÍVEIS</h2>
          <div className="grid grid-cols-1 gap-6">
            <div onClick={() => setIsSelectingSkin(true)} className="w-80 h-40 bg-[#1a2e35] border-4 border-[#5de2ef] p-6 cursor-pointer hover:scale-105 transition-all flex flex-col justify-end group shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 bg-[#5de2ef] text-black font-black text-[9px] uppercase">Unlocked</div>
               <div className="text-[#5de2ef] font-black uppercase text-3xl group-hover:tracking-widest transition-all">STAR GEMINI</div>
               <div className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Ondas de Combate v2.0</div>
            </div>
          </div>
          <PixelButton label={t.BACK} onClick={() => setMenuSection('MAIN')} width="w-48" className="mt-12" />
        </div>
      )}

      {/* HANGAR DE SKINS */}
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

      {/* INTERFACE DE JOGO */}
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
              <h2 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-10 drop-shadow-2xl">PAUSA</h2>
              <PixelButton label={t.RESUME} onClick={() => setGameState('PLAYING')} />
              <PixelButton label="MENU" onClick={() => { setGameState('START'); setMenuSection('MAIN'); setIsSelectingSkin(false); }} className="mt-4 opacity-60" />
            </div>
          )}
        </>
      )}

      {/* GAME OVER */}
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
      
      {/* SCANLINES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-[300]"></div>
    </div>
  );
};

export default App;
