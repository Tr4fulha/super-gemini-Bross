
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player, Enemy, Star, Particle, Projectile, LevelData, KeyBinds, GameSettings, SpecialAbility, MenuSection, ShooterSkin, PowerUp, PowerUpType, HighScoreEntry, Mine, Scrap, SaveData, UpgradeType } from './types';
import MobileControls from './components/MobileControls';

// --- CONSTANTS ---
const DEFAULT_BINDS: KeyBinds = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: ' ', dash: 'Shift', pause: 'Escape' };
const FRICTION = 0.92;
const ACCELERATION = 0.8;
const DASH_POWER = 2.5;
const MAX_PARTICLES = 100; // Performance limit
const COMBO_TIME_LIMIT = 180; // 3 seconds at 60fps

// --- MUSIC CONFIG ---
const BPM = 125;
const LOOKAHEAD = 0.1; // Seconds to schedule ahead
const SCHEDULE_AHEAD_TIME = 0.1; // How far ahead to schedule

// --- SHOP CONFIGURATION ---
const UPGRADES_DEF: Record<UpgradeType, { name: string; desc: string; cost: (lvl: number) => number; max: number }> = {
  'START_LIVES': { name: 'REINFORCED HULL', desc: 'Start mission with +1 Life.', cost: (l) => 500 * (l + 1), max: 3 },
  'START_POWER': { name: 'WEAPON PRE-HEAT', desc: 'Start with higher weapon power.', cost: (l) => 1000 * (l + 1), max: 2 },
  'MAGNET_RANGE': { name: 'GRAVITY WELL', desc: 'Increase item collection range.', cost: (l) => 300 * (l + 1), max: 5 },
  'DASH_COOLDOWN': { name: 'THRUSTER COOLANT', desc: 'Reduce Dash cooldown time.', cost: (l) => 400 * (l + 1), max: 4 },
  'SCORE_MULT': { name: 'DATA MINING', desc: 'Increase score gain by 10%.', cost: (l) => 600 * (l + 1), max: 5 },
};

// --- BIOME CONFIGURATION ---
const BIOMES = [
  { 
    name: 'DEEP_SPACE', 
    bgColor: [2, 6, 23], // #020617 (Dark Blue)
    starConfig: { colors: ['#ffffff', '#94a3b8', '#60a5fa'], typeDist: { STAR: 1.0, NEBULA: 0, ASTEROID: 0 } }
  }, 
  { 
    name: 'NEBULA', 
    bgColor: [46, 16, 101], // #2e1065 (Dark Purple)
    starConfig: { colors: ['#d8b4fe', '#f0abfc', '#818cf8'], typeDist: { STAR: 0.9, NEBULA: 0.1, ASTEROID: 0 } }
  }, 
  { 
    name: 'ASTEROID_FIELD', 
    bgColor: [28, 25, 23], // #1c1917 (Dark Stone)
    starConfig: { colors: ['#a8a29e', '#78716c', '#d6d3d1'], typeDist: { STAR: 0.85, NEBULA: 0, ASTEROID: 0.15 } }
  }, 
];

const TRANSLATIONS = {
  PT: {
    PLAY: "INICIAR MISSÃO", OPTIONS: "OPÇÕES", CREDITS: "CRÉDITOS", QUIT: "SAIR",
    BACK: "VOLTAR", LAUNCH: "LANÇAR NAVE", SCORE: "PONTOS", WAVE: "ONDA",
    GAME_OVER: "FALHA NA MISSÃO", RESTART: "TENTAR NOVAMENTE", PAUSE: "SISTEMA PAUSADO",
    RESUME: "RETOMAR", START: "CLIQUE PARA INICIAR", SELECT_SHIP: "ESCOLHA SUA NAVE",
    HIGHSCORES: "HALL DA FAMA", CONTROLS: "CONTROLES", SHOP: "HANGAR / LOJA",
    TXT_BOSS: "ALERTA: NAVE MÃE DETECTADA", TXT_WAVE_CLR: "ONDA COMPLETADA",
    SCRAP: "SUCATA", BUY: "COMPRAR", MAX: "MAX", COST: "CUSTO"
  },
  EN: {
    PLAY: "START MISSION", OPTIONS: "OPTIONS", CREDITS: "CREDITS", QUIT: "QUIT",
    BACK: "BACK", LAUNCH: "LAUNCH SHIP", SCORE: "SCORE", WAVE: "WAVE",
    GAME_OVER: "MISSION FAILED", RESTART: "RETRY", PAUSE: "SYSTEM PAUSED",
    RESUME: "RESUME", START: "CLICK TO START", SELECT_SHIP: "SELECT SHIP",
    HIGHSCORES: "HALL OF FAME", CONTROLS: "CONTROLS", SHOP: "HANGAR / SHOP",
    TXT_BOSS: "WARNING: MOTHERSHIP DETECTED", TXT_WAVE_CLR: "WAVE CLEARED",
    SCRAP: "SCRAP", BUY: "BUY", MAX: "MAX", COST: "COST"
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
  
  // Persistent Save Data (Roguelite)
  const [saveData, setSaveData] = useState<SaveData>(() => {
    try {
      const saved = localStorage.getItem('sg_savedata');
      return saved ? JSON.parse(saved) : { totalScrap: 0, upgrades: { 'START_LIVES': 0, 'START_POWER': 0, 'MAGNET_RANGE': 0, 'DASH_COOLDOWN': 0, 'SCORE_MULT': 0 } };
    } catch {
      return { totalScrap: 0, upgrades: { 'START_LIVES': 0, 'START_POWER': 0, 'MAGNET_RANGE': 0, 'DASH_COOLDOWN': 0, 'SCORE_MULT': 0 } };
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
  
  // Audio Refs
  const audioCtx = useRef<AudioContext | null>(null);
  const noiseBuffer = useRef<AudioBuffer | null>(null);
  const nextNoteTime = useRef(0);
  const current16thNote = useRef(0);
  
  const shake = useRef(0);
  const difficultyMult = useRef(1.0);
  const lastTime = useRef(0);
  const bgRGB = useRef([2, 6, 23]); // Start with deep space color

  // Entities
  const player = useRef<Player>({
    x: 0, y: 0, width: 32, height: 32, velocityX: 0, velocityY: 0, score: 0, lives: 3,
    invincibilityFrames: 0, shieldFrames: 0, maxShieldFrames: 600, tilt: 0,
    dashCooldown: 0, dashFrames: 0, slowMoFrames: 0, rapidFireFrames: 0,
    damageBoostFrames: 0, speedBoostFrames: 0, magnetFrames: 0, deathTimer: 0,
    abilityCharge: 0, scrapCount: 0, powerLevel: 1,
    comboCount: 0, comboTimer: 0, comboMultiplier: 1
  });
  
  const levelData = useRef<LevelData>({ enemies: [], powerUps: [], projectiles: [], particles: [], floatingTexts: [], mines: [], scraps: [] });
  const stars = useRef<Star[]>([]);

  const t = TRANSLATIONS[settings.language];

  // --- AUDIO ENGINE ---
  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create White Noise Buffer for Hi-Hats and Snares
      const bufferSize = audioCtx.current.sampleRate * 2; // 2 seconds
      const buffer = audioCtx.current.createBuffer(1, bufferSize, audioCtx.current.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseBuffer.current = buffer;
      nextNoteTime.current = audioCtx.current.currentTime + 0.1;
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

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
      } else if (type === 'scrap') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(1200, now); osc.frequency.linearRampToValueAtTime(1800, now + 0.05);
        gain.gain.setValueAtTime(0.05 * vol, now); osc.stop(now + 0.05);
      } else if (type === 'buy') {
         osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.2);
         gain.gain.setValueAtTime(0.2 * vol, now); osc.stop(now + 0.2);
      } else if (type === 'dash') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.1 * vol, now); osc.stop(now + 0.2);
      } else if (type === 'combo') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.05 * vol, now); osc.stop(now + 0.1);
      } else if (type === 'mine_beep') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gain.gain.setValueAtTime(0.05 * vol, now); osc.stop(now + 0.05);
      }
      osc.start();
    } catch (e) {
      // Ignore audio errors
    }
  };

  // --- MUSIC SYNTHESIZER ---
  const scheduleMusic = () => {
    if (!audioCtx.current || !noiseBuffer.current) return;
    const ctx = audioCtx.current;
    const vol = settings.musicVolume * settings.masterVolume;
    if (vol <= 0) return;

    // Schedule up to lookahead
    while (nextNoteTime.current < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
       scheduleNote(current16thNote.current, nextNoteTime.current, vol);
       nextNote(vol);
    }
  };

  const nextNote = (vol: number) => {
    const secondsPerBeat = 60.0 / BPM;
    nextNoteTime.current += 0.25 * secondsPerBeat; // 16th notes
    current16thNote.current = (current16thNote.current + 1) % 16;
  };

  const scheduleNote = (beat: number, time: number, vol: number) => {
    const ctx = audioCtx.current!;
    
    // 1. KICK (Beats 0, 4, 8, 12 - Four on the floor)
    if (beat % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(0.8 * vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time); osc.stop(time + 0.5);
    }

    // 2. SNARE (Beats 4, 12)
    if (beat % 8 === 4) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer.current;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      const noiseGain = ctx.createGain();
      noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.4 * vol, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      noiseSrc.start(time);
    }

    // 3. HI-HAT (Every off-beat 16th)
    if (beat % 2 !== 0) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer.current;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 5000;
      const noiseGain = ctx.createGain();
      noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.1 * vol, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      noiseSrc.start(time);
    }

    // 4. BASS (Synthwave Rolling Bass - Offbeats or 16ths)
    // Pattern: A minor -> F major -> C major -> G major
    // 16 beats per bar. 4 bars loop = 64 beats total logic if we wanted full song.
    // Simplified: 2 Bars loop. Am (0-15), F (16-31)
    
    // Calculate global beat for progression (resetting regularly)
    const measure = Math.floor(time / (60/BPM * 4)); // Crude measure counter
    let rootFreq = 55; // A1
    if (measure % 4 === 1) rootFreq = 43.65; // F1
    if (measure % 4 === 2) rootFreq = 65.41; // C2
    if (measure % 4 === 3) rootFreq = 49.00; // G1

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time); // Low cut for bassy feel
    const gain = ctx.createGain();
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    
    // Rolling bass: Octave jump on off-beats often used, or just steady 16ths
    const freq = (beat % 2 === 0) ? rootFreq : rootFreq * 1.01; // Slight detune or same note
    osc.frequency.setValueAtTime(freq, time);
    
    // Envelope
    gain.gain.setValueAtTime(0.3 * vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15); // Short pluck
    
    // Filter Envelope (Wub)
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.15);

    osc.start(time); osc.stop(time + 0.15);

    // 5. ARPEGGIO (Simple bells/leads)
    if (beat % 4 === 2) { // Sparse melody
       const arpOsc = ctx.createOscillator();
       arpOsc.type = 'square';
       const arpGain = ctx.createGain();
       arpOsc.connect(arpGain); arpGain.connect(ctx.destination);
       // Simple Pentatonic notes
       const notes = [440, 523.25, 659.25, 783.99]; // A C E G
       const note = notes[Math.floor(Math.random()*notes.length)];
       arpOsc.frequency.setValueAtTime(note, time);
       arpGain.gain.setValueAtTime(0.05 * vol, time);
       arpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
       arpOsc.start(time); arpOsc.stop(time + 0.3);
    }
  };

  // --- PERSISTENCE ---
  useEffect(() => {
    try {
      localStorage.setItem('sg_settings', JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('sg_savedata', JSON.stringify(saveData));
    } catch (e) {
      console.error("Error saving game data:", e);
    }
  }, [saveData]);

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
  
  const spawnScrap = (x: number, y: number, amount: number) => {
    for(let i=0; i<amount; i++) {
      levelData.current.scraps.push({
        x, y, width: 8, height: 8,
        velocityX: (Math.random() - 0.5) * 5,
        velocityY: (Math.random() * -3) - 2, // Explode upwards initially
        value: 1,
        rotation: Math.random() * Math.PI
      });
    }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string, size: number) => {
    if (levelData.current.floatingTexts.length > 30) return;
    levelData.current.floatingTexts.push({
      x, y, text, color, size, life: 1.0, velocityY: -1 - Math.random()
    });
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
      levelData.current.enemies.forEach(e => { 
        const damage = 20;
        e.health -= damage; e.hitFlash = 10; 
        spawnFloatingText(e.x + e.width/2, e.y, damage.toString(), '#facc15', 24);
      });
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
  
  const spawnMine = () => {
    if (levelData.current.mines.length > 5) return;
    levelData.current.mines.push({
      x: Math.random() * (dims.w - 40), y: -50, width: 32, height: 32,
      velocityY: 1.5, rotation: 0, active: true
    });
  };
  
  const triggerMineExplosion = (mine: Mine) => {
    playSound('explosion');
    spawnParticle(mine.x + mine.width/2, mine.y + mine.height/2, '#ef4444', 'smoke', 30);
    spawnParticle(mine.x + mine.width/2, mine.y + mine.height/2, '#fbbf24', 'ring', 10);
    shake.current = 20;
    
    const centerX = mine.x + mine.width/2;
    const centerY = mine.y + mine.height/2;
    const radius = 150;
    
    levelData.current.enemies.forEach(e => {
       const dx = (e.x + e.width/2) - centerX;
       const dy = (e.y + e.height/2) - centerY;
       const dist = Math.sqrt(dx*dx + dy*dy);
       if (dist < radius) {
         e.health -= 50; e.hitFlash = 10;
         spawnFloatingText(e.x + e.width/2, e.y, "BOOM!", '#ef4444', 30);
         if (e.health <= 0) {
            setScore(s => s + 200);
            spawnScrap(e.x, e.y, 5); // Mines also drop scrap
         }
       }
    });
    
    const p = player.current;
    const dx = (p.x + p.width/2) - centerX;
    const dy = (p.y + p.height/2) - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < radius * 0.6 && p.invincibilityFrames <= 0 && p.shieldFrames <= 0) {
       p.lives--;
       setLives(p.lives);
       p.invincibilityFrames = 90;
       if (p.lives <= 0) setGameState('DEATH_ANIM');
       spawnFloatingText(p.x, p.y, "OUCH!", '#ef4444', 20);
    }
  };

  const createStar = (y: number, biomeIndex: number): Star => {
    const biome = BIOMES[biomeIndex];
    const rand = Math.random();
    let type: Star['type'] = 'STAR';
    let size = Math.random() * 2;
    let opacity = Math.random();
    let speed = 1 + Math.random() * 2;
    let color = biome.starConfig.colors[Math.floor(Math.random() * biome.starConfig.colors.length)];

    if (rand > 1 - biome.starConfig.typeDist.ASTEROID) {
      type = 'ASTEROID'; size = 10 + Math.random() * 15; speed = 0.5 + Math.random() * 1.5; opacity = 1;
    } else if (rand > 1 - biome.starConfig.typeDist.ASTEROID - biome.starConfig.typeDist.NEBULA) {
      type = 'NEBULA'; size = 50 + Math.random() * 100; speed = 0.2 + Math.random() * 0.5; opacity = 0.05 + Math.random() * 0.1;
    }

    return {
      x: Math.random() * dims.w, y: y, size, speed, opacity, layer: 1, type,
      angle: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.05, color
    };
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
        type: 'boss', health: hp, maxHealth: hp, hitFlash: 0, lastShotTime: 0, behaviorTimer: 0, angle: 0, isBoss: true
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
          y: -50 - (i * 80), width: w, height: h, velocityX: 0, velocityY: 2,
          type, health: hp, maxHealth: hp, hitFlash: 0, lastShotTime: 0,
          behaviorTimer: Math.random() * 100, angle: Math.PI / 2
        });
      }
    }
  }, [dims.w, t.TXT_BOSS]);

  // --- BUY UPGRADE HANDLER ---
  const buyUpgrade = (type: UpgradeType) => {
    const lvl = saveData.upgrades[type];
    const def = UPGRADES_DEF[type];
    if (lvl >= def.max) return;
    
    const cost = def.cost(lvl);
    if (saveData.totalScrap >= cost) {
      setSaveData(prev => ({
        ...prev,
        totalScrap: prev.totalScrap - cost,
        upgrades: { ...prev.upgrades, [type]: lvl + 1 }
      }));
      playSound('buy');
    }
  };

  const update = useCallback((time: number) => {
    if (gameState !== 'PLAYING' && gameState !== 'DEATH_ANIM') {
      lastTime.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    // Schedule Music
    if (gameState === 'PLAYING') {
      scheduleMusic();
    }
    
    const p = player.current;
    const timeScale = p.slowMoFrames > 0 ? 0.3 : 1.0;
    const biomeIndex = Math.floor((wave - 1) / 5) % BIOMES.length;
    const targetBg = BIOMES[biomeIndex].bgColor;
    
    bgRGB.current = bgRGB.current.map((c, i) => {
      const diff = targetBg[i] - c;
      return Math.abs(diff) < 0.5 ? targetBg[i] : c + diff * 0.01;
    });

    stars.current.forEach(s => {
      s.y += s.speed * (p.speedBoostFrames > 0 ? 3 : 1) * timeScale;
      if (s.type === 'ASTEROID') s.angle += s.rotationSpeed * timeScale;
      if (s.y > dims.h) {
        const newStar = createStar(-20, biomeIndex);
        Object.assign(s, newStar);
      }
    });

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
          
          // SAVE SCRAP
          setSaveData(prev => ({ ...prev, totalScrap: prev.totalScrap + p.scrapCount }));
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
    let ax = 0, ay = 0;
    if (keys.current[left]) ax -= 1; if (keys.current[right]) ax += 1;
    if (keys.current[up]) ay -= 1; if (keys.current[down]) ay += 1;

    if (keys.current[dash] && p.dashCooldown <= 0) {
      const dashLevel = saveData.upgrades['DASH_COOLDOWN'] || 0;
      p.dashFrames = 15;
      p.dashCooldown = Math.max(20, 60 - (dashLevel * 10)); // Upgrade Effect
      const boostDirX = ax !== 0 ? ax : 0;
      const boostDirY = ay !== 0 ? ay : (ax === 0 ? -1 : 0);
      p.velocityX += boostDirX * DASH_POWER * 5;
      p.velocityY += boostDirY * DASH_POWER * 5;
      playSound('dash');
      shake.current = 5;
    }

    let speed = (p.speedBoostFrames > 0 ? 1.5 : 1.0) * (selectedSkin === 'PHANTOM' ? 1.2 : 1.0);
    if (p.dashFrames > 0) speed = 0;

    p.velocityX += ax * ACCELERATION * speed; p.velocityY += ay * ACCELERATION * speed;
    p.velocityX *= FRICTION; p.velocityY *= FRICTION;
    p.x += p.velocityX; p.y += p.velocityY;

    const safeZoneTop = dims.h * 0.5;
    if (p.x < 0) { p.x = 0; p.velocityX = 0; }
    if (p.x > dims.w - p.width) { p.x = dims.w - p.width; p.velocityX = 0; }
    if (p.y < safeZoneTop) { p.y = safeZoneTop; p.velocityY = 0; } 
    if (p.y > dims.h - p.height) { p.y = dims.h - p.height; p.velocityY = 0; }

    p.tilt = p.velocityX * 0.05;

    if (p.dashFrames > 0) p.dashFrames--; if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.invincibilityFrames > 0) p.invincibilityFrames--; if (p.rapidFireFrames > 0) p.rapidFireFrames--;
    if (p.damageBoostFrames > 0) p.damageBoostFrames--; if (p.speedBoostFrames > 0) p.speedBoostFrames--;
    if (p.slowMoFrames > 0) p.slowMoFrames--; if (p.magnetFrames > 0) p.magnetFrames--;
    if (p.shieldFrames > 0) p.shieldFrames--; if (p.abilityCharge < 100) p.abilityCharge += 0.1;
    
    if (Math.random() < 0.003 * timeScale) spawnMine();
    
    if (p.comboTimer > 0) {
      p.comboTimer -= timeScale;
      if (p.comboTimer <= 0) {
        p.comboCount = 0; p.comboMultiplier = 1; p.comboTimer = 0;
      }
    }

    if (p.dashFrames > 0 && p.dashFrames % 3 === 0) spawnParticle(p.x + p.width/2, p.y + p.height/2, '#5de2ef', 'smoke', 1);

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
      playSound('shoot'); lastTime.current = Date.now();
    }

    const enemyZoneBottom = dims.h * 0.5;
    levelData.current.enemies.forEach(e => {
      e.behaviorTimer++;
      let speed = 2 * difficultyMult.current * timeScale;
      
      if (e.isBoss) {
        if (e.y < 80) e.y += speed * 0.5;
        else {
          e.x += Math.cos(e.behaviorTimer * 0.02) * 2 * timeScale;
          e.y += Math.sin(e.behaviorTimer * 0.03) * 1 * timeScale;
          if (e.x < 50) e.x = 50; if (e.x > dims.w - e.width - 50) e.x = dims.w - e.width - 50;
        }

        if (e.behaviorTimer % 180 === 0) {
          const bossLevel = Math.floor(wave / 5);
          if (bossLevel % 2 === 0) {
            for(let k=0; k<3; k++) {
              levelData.current.projectiles.push({
                x: e.x + e.width/2 + (k-1)*20, y: e.y + e.height, width: 8, height: 16, velocityX: (Math.random()-0.5)*2, velocityY: 3,
                owner: 'enemy', color: '#f97316', damage: 1, isMissile: true
              });
            }
          } else {
            for(let k=-2; k<=2; k++) {
              levelData.current.projectiles.push({
                x: e.x + e.width/2, y: e.y + e.height, width: 6, height: 12, velocityX: k * 2, velocityY: 5, owner: 'enemy', color: '#fbbf24', damage: 1
              });
            }
          }
        }
      } else {
        if (e.y < 50) e.y += speed;
        else {
          if (e.type === 'scout') { e.y += Math.sin(e.behaviorTimer * 0.05) * speed; e.x += Math.sin(e.behaviorTimer * 0.1) * 3 * timeScale; }
          else if (e.type === 'fighter') { e.y += Math.cos(e.behaviorTimer * 0.02) * speed * 0.5; if (e.x < p.x) e.x += 0.5 * timeScale; if (e.x > p.x) e.x -= 0.5 * timeScale; }
          else { e.y += Math.sin(e.behaviorTimer * 0.02) * speed * 0.2; }
          if (e.y > enemyZoneBottom - e.height) e.y = enemyZoneBottom - e.height;
        }
        const shotChance = (e.type === 'sniper' ? 0.02 : 0.005) * difficultyMult.current * timeScale;
        if (Math.random() < shotChance && e.y > 0) {
          const pSpeed = e.type === 'sniper' ? 8 : 5;
          levelData.current.projectiles.push({
            x: e.x + e.width/2, y: e.y + e.height, width: 6, height: 12, velocityX: 0, velocityY: pSpeed, owner: 'enemy', color: '#f43f5e', damage: 1
          });
        }
      }
    });

    const projectiles = levelData.current.projectiles;
    const enemies = levelData.current.enemies;
    const mines = levelData.current.mines;

    for(let i = mines.length - 1; i >= 0; i--) {
       const m = mines[i]; m.y += m.velocityY * timeScale; m.rotation += 0.05 * timeScale;
       if (checkRectCollide(m, p)) { triggerMineExplosion(m); mines.splice(i, 1); continue; }
       if (m.y > dims.h) mines.splice(i, 1);
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      if (pr.isMissile && pr.owner === 'enemy') {
         const dx = (p.x + p.width/2) - pr.x; const dy = (p.y + p.height/2) - pr.y; const angle = Math.atan2(dy, dx);
         pr.velocityX = pr.velocityX * 0.95 + Math.cos(angle) * 0.2; pr.velocityY = pr.velocityY * 0.95 + Math.sin(angle) * 0.2;
         if (Math.random() < 0.2) spawnParticle(pr.x + pr.width/2, pr.y, '#f97316', 'smoke', 1);
      }
      pr.x += pr.velocityX * timeScale; pr.y += pr.velocityY * timeScale;
      let removed = false;
      if (pr.y < -50 || pr.y > dims.h + 50 || pr.x < -50 || pr.x > dims.w + 50) { projectiles.splice(i, 1); continue; }
      
      if (!removed && pr.owner === 'player') {
         for (let k = mines.length - 1; k >= 0; k--) {
            const m = mines[k];
            if (checkRectCollide(pr, m)) { triggerMineExplosion(m); mines.splice(k, 1); projectiles.splice(i, 1); removed = true; break; }
         }
      }

      if (!removed && pr.owner === 'player') {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (checkRectCollide(pr, e)) {
            e.health -= pr.damage; e.hitFlash = 5;
            spawnParticle(pr.x, pr.y, '#5de2ef', 'spark', 2);
            projectiles.splice(i, 1); removed = true;

            const isCrit = p.damageBoostFrames > 0 || e.type === 'boss';
            const dmgText = pr.damage.toFixed(0);
            spawnFloatingText(e.x + e.width/2, e.y, dmgText, isCrit ? '#facc15' : '#fff', isCrit ? 20 : 12);

            if (e.health <= 0) {
              playSound('explosion');
              spawnParticle(e.x + e.width/2, e.y + e.height/2, e.isBoss ? '#fbbf24' : '#f43f5e', 'smoke', e.isBoss ? 20 : 8);
              enemies.splice(j, 1);
              
              p.comboCount++; p.comboTimer = COMBO_TIME_LIMIT;
              const prevMulti = p.comboMultiplier;
              p.comboMultiplier = Math.min(8, 1 + Math.floor(p.comboCount / 5));
              if (p.comboMultiplier > prevMulti) playSound('combo');

              const multLvl = saveData.upgrades['SCORE_MULT'] || 0;
              const baseScore = (e.isBoss ? 5000 : (e.type === 'heavy' ? 500 : 100));
              const finalScore = baseScore * p.comboMultiplier * (1 + (multLvl * 0.1));
              setScore(s => s + Math.floor(finalScore));
              
              spawnPowerUp(e.x + e.width/2, e.y + e.height/2);
              spawnScrap(e.x + e.width/2, e.y + e.height/2, e.isBoss ? 50 : (e.type === 'heavy' ? 5 : 2));
              shake.current = e.isBoss ? 20 : 5;
              
              if (e.isBoss) { difficultyMult.current *= 2; setMessage(t.TXT_WAVE_CLR); setTimeout(() => setMessage(null), 2000); }
            }
            break;
          }
        }
      } else if (!removed) {
        if (checkRectCollide(pr, p) && p.invincibilityFrames <= 0) {
          if (p.shieldFrames > 0) { p.shieldFrames = 0; p.invincibilityFrames = 60; playSound('dash'); }
          else {
            p.lives--; setLives(p.lives); p.comboCount = 0; p.comboTimer = 0; p.comboMultiplier = 1;
            p.invincibilityFrames = 90; playSound('explosion'); shake.current = 15;
            if (p.lives <= 0) setGameState('DEATH_ANIM');
          }
          projectiles.splice(i, 1); removed = true;
        }
      }
    }

    const powerUps = levelData.current.powerUps;
    const scraps = levelData.current.scraps;
    
    // Magnet / Collection Logic Shared
    const magnetRange = 300 + ((saveData.upgrades['MAGNET_RANGE'] || 0) * 50);

    for (let i = scraps.length - 1; i >= 0; i--) {
      const s = scraps[i];
      s.x += s.velocityX * timeScale;
      s.y += s.velocityY * timeScale;
      s.velocityY += 0.1 * timeScale; // Gravity
      s.rotation += 0.1 * timeScale;

      const dx = (p.x + p.width/2) - s.x; const dy = (p.y + p.height/2) - s.y; const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Auto magnet if close OR if powerup active
      if (p.magnetFrames > 0 || dist < 100) {
         const force = p.magnetFrames > 0 ? 8 : 4;
         s.x += (dx / dist) * force * timeScale; s.y += (dy / dist) * force * timeScale;
      }

      if (checkRectCollide(s, p)) {
        p.scrapCount += s.value;
        playSound('scrap');
        scraps.splice(i, 1);
      } else if (s.y > dims.h) {
        scraps.splice(i, 1);
      }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += pu.velocityY * timeScale;
      
      if (p.magnetFrames > 0) {
        const dx = (p.x + p.width/2) - pu.x; const dy = (p.y + p.height/2) - pu.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < magnetRange) { pu.x += (dx / dist) * 5 * timeScale; pu.y += (dy / dist) * 5 * timeScale; }
      }

      if (checkRectCollide(pu, p)) {
        playSound('powerup'); applyPowerUp(pu.type); powerUps.splice(i, 1); setScore(s => s + 50);
      } else if (pu.y > dims.h) powerUps.splice(i, 1);
    }

    const particles = levelData.current.particles;
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i]; pt.x += pt.vx * timeScale; pt.y += pt.vy * timeScale; pt.life -= pt.decay; if (pt.life <= 0) particles.splice(i, 1);
    }
    
    const texts = levelData.current.floatingTexts;
    for(let i = texts.length - 1; i >= 0; i--) {
       const ft = texts[i]; ft.y += ft.velocityY * timeScale; ft.life -= 0.03 * timeScale; if(ft.life <= 0) texts.splice(i, 1);
    }

    if (levelData.current.enemies.length === 0 && wave > 0) spawnWave(wave + 1);
    draw();
    requestRef.current = requestAnimationFrame(() => update(performance.now()));
  }, [gameState, wave, settings.keyBinds, dims, saveData]);

  // --- DRAWING ENGINE ---
  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    const [r, g, b] = bgRGB.current.map(c => Math.round(c));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, dims.w, dims.h);
    
    if (shake.current > 0 && !isNaN(shake.current)) {
      const s = shake.current; ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      shake.current *= 0.9; if (shake.current < 0.5) shake.current = 0;
    } else shake.current = 0;

    // Zones
    ctx.fillStyle = 'rgba(255, 0, 0, 0.02)'; ctx.fillRect(0, 0, dims.w, dims.h * 0.5);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.02)'; ctx.fillRect(0, dims.h * 0.5, dims.w, dims.h * 0.5);

    stars.current.forEach(s => {
      ctx.save(); ctx.globalAlpha = s.opacity; ctx.fillStyle = s.color;
      if (s.type === 'NEBULA') { ctx.shadowBlur = 40; ctx.shadowColor = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); }
      else if (s.type === 'ASTEROID') {
        ctx.translate(s.x, s.y); ctx.rotate(s.angle); ctx.beginPath();
        ctx.moveTo(s.size, 0); ctx.lineTo(s.size * 0.5, s.size * 0.8); ctx.lineTo(-s.size * 0.5, s.size * 0.6);
        ctx.lineTo(-s.size, -s.size * 0.2); ctx.lineTo(-s.size * 0.4, -s.size * 0.8); ctx.lineTo(s.size * 0.6, -s.size * 0.7);
        ctx.closePath(); ctx.fill();
      } else ctx.fillRect(s.x, s.y, s.size, s.size);
      ctx.restore();
    });
    
    // Draw Mines
    levelData.current.mines.forEach(m => {
       ctx.save(); ctx.translate(m.x + m.width/2, m.y + m.height/2); ctx.rotate(m.rotation);
       ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
       for(let k=0; k<6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(18, 0); ctx.lineTo(10, 3); ctx.fill(); }
       const pulse = Math.abs(Math.sin(Date.now() / 200));
       ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.5})`; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10 * pulse;
       ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
       ctx.restore();
    });

    // Draw Scrap
    levelData.current.scraps.forEach(s => {
      ctx.save(); ctx.translate(s.x + 4, s.y + 4); ctx.rotate(s.rotation);
      ctx.fillStyle = '#94a3b8'; // Light Grey
      ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeStyle = '#facc15'; // Yellow tint border
      ctx.strokeRect(-3, -3, 6, 6);
      ctx.restore();
    });

    levelData.current.powerUps.forEach(pu => {
      ctx.save(); ctx.translate(pu.x + 10, pu.y + 10);
      const color = getPowerUpColor(pu.type);
      ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pu.type[0], 0, 1);
      ctx.restore();
    });

    levelData.current.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.x + e.width/2, e.y + e.height/2);
      if (e.isBoss) ctx.scale(1.5, 1.5);
      const color = e.hitFlash > 0 ? '#fff' : (e.type === 'heavy' ? '#a78bfa' : e.type === 'boss' ? '#fbbf24' : '#f43f5e');
      if (settings.quality === 'HIGH') { ctx.shadowBlur = 10; ctx.shadowColor = color; }
      ctx.fillStyle = color; ctx.strokeStyle = color;
      if (e.type === 'scout') { ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(10, -10); ctx.lineTo(-10, -10); ctx.fill(); }
      else if (e.type === 'fighter') { ctx.fillRect(-5, -15, 10, 30); ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(15, -5); ctx.lineTo(-15, -5); ctx.fill(); }
      else if (e.type === 'heavy') { ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = '#000'; ctx.fillRect(-5, -5, 10, 10); }
      else if (e.type === 'boss') { ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-40, -10, 80, 20); }
      else { ctx.fillRect(-2, -20, 4, 40); ctx.fillRect(-10, 0, 20, 5); }
      if (e.hitFlash > 0) e.hitFlash--;
      ctx.restore();
    });

    const p = player.current;
    if (gameState !== 'DEATH_ANIM' && p.invincibilityFrames % 10 < 5) {
      ctx.save(); ctx.translate(p.x + p.width/2, p.y + p.height/2); ctx.rotate(p.tilt);
      const pColor = selectedSkin === 'PHANTOM' ? '#d946ef' : (selectedSkin === 'STRIKER' ? '#ef4444' : '#22d3ee');
      if (settings.quality === 'HIGH') { ctx.shadowBlur = p.dashFrames > 0 ? 25 : 15; ctx.shadowColor = pColor; }
      ctx.fillStyle = pColor;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, 14); ctx.lineTo(0, 8); ctx.lineTo(-14, 14); ctx.fill();
      if (p.shieldFrames > 0) { ctx.strokeStyle = `rgba(14, 165, 233, ${Math.random() * 0.5 + 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI*2); ctx.stroke(); }
      ctx.restore();
    }

    levelData.current.projectiles.forEach(pr => {
      ctx.fillStyle = pr.color; if (settings.quality === 'HIGH') { ctx.shadowBlur = 8; ctx.shadowColor = pr.color; }
      ctx.fillRect(pr.x, pr.y, pr.width, pr.height); ctx.shadowBlur = 0;
    });

    levelData.current.particles.forEach(pt => {
      ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color;
      if (pt.type === 'ring') { ctx.strokeStyle = pt.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (2 - pt.life), 0, Math.PI*2); ctx.stroke(); }
      else ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    });

    levelData.current.floatingTexts.forEach(ft => {
       ctx.globalAlpha = ft.life; ctx.fillStyle = ft.color; ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
       ctx.font = `italic 900 ${ft.size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y); ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1.0;

    if (p.comboMultiplier > 1 && gameState === 'PLAYING') {
      ctx.save(); ctx.resetTransform(); const rightX = dims.w - 20; const topY = 120; ctx.textAlign = 'right';
      const pulse = Math.sin(Date.now() / 100) * 0.1 + 1;
      ctx.translate(rightX, topY); ctx.scale(pulse, pulse);
      ctx.font = 'italic 900 48px sans-serif'; ctx.fillStyle = '#facc15'; ctx.shadowColor = 'rgba(250, 204, 21, 0.5)'; ctx.shadowBlur = 10;
      ctx.fillText(`${p.comboMultiplier}x`, 0, 0);
      ctx.font = '700 12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 0; ctx.fillText('COMBO', 0, 15);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-100, 25, 100, 6);
      ctx.fillStyle = '#facc15'; const width = (p.comboTimer / COMBO_TIME_LIMIT) * 100; ctx.fillRect(-width, 25, width, 6);
      ctx.restore();
    }
  };

  const checkRectCollide = (r1: {x: number, y: number, width: number, height: number}, r2: {x: number, y: number, width: number, height: number}) => {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
  };

  const applyPowerUp = (type: PowerUpType) => {
    const p = player.current;
    switch(type) {
      case 'LIFE': p.lives++; setLives(p.lives); spawnFloatingText(p.x + 16, p.y, "+1UP", "#22c55e", 20); break;
      case 'SHIELD': p.shieldFrames = 600; break;
      case 'TRIPLE': p.powerLevel = 2; break; 
      case 'DAMAGE': p.damageBoostFrames = 600; spawnFloatingText(p.x + 16, p.y, "MAX PWR", "#ef4444", 20); break;
      case 'RAPID': p.rapidFireFrames = 400; break;
      case 'SPEED': p.speedBoostFrames = 600; break;
      case 'MAGNET': p.magnetFrames = 900; break;
      case 'TIME': p.slowMoFrames = 300; break;
      case 'NUKE': levelData.current.enemies.forEach(e => { e.health = 0; spawnParticle(e.x, e.y, '#fff', 'ring', 5); }); shake.current = 30; break;
    }
  };

  const getPowerUpColor = (t: PowerUpType) => {
    switch(t) {
      case 'LIFE': return '#22c55e'; case 'SHIELD': return '#3b82f6'; case 'TRIPLE': return '#eab308'; case 'DAMAGE': return '#ef4444';
      case 'RAPID': return '#f97316'; case 'SPEED': return '#06b6d4'; case 'MAGNET': return '#d946ef'; case 'TIME': return '#ffffff'; case 'NUKE': return '#a855f7'; default: return '#fff';
    }
  };

  const initGame = () => {
    initAudio(); // Ensure audio context is ready
    if (audioCtx.current) {
        nextNoteTime.current = audioCtx.current.currentTime + 0.5; // Reset music timer
        current16thNote.current = 0;
    }

    setGameState('PLAYING'); setScore(0); setWave(1); difficultyMult.current = 1.0;
    
    // Apply Roguelite Upgrades
    const startLives = 3 + (saveData.upgrades['START_LIVES'] || 0);
    const startPower = 1 + (saveData.upgrades['START_POWER'] || 0);
    
    setLives(startLives);
    
    player.current = { 
      ...player.current, x: dims.w/2, y: dims.h - 100, velocityX:0, velocityY:0, 
      shieldFrames: 0, powerLevel: startPower, abilityCharge: 0, lives: startLives,
      comboCount: 0, comboTimer: 0, comboMultiplier: 1, scrapCount: 0
    };
    
    levelData.current = { enemies: [], powerUps: [], projectiles: [], particles: [], floatingTexts: [], mines: [], scraps: [] };
    stars.current = [];
    for(let i=0; i<60; i++) stars.current.push(createStar(Math.random()*dims.h, 0));
    spawnWave(1); lastTime.current = performance.now();
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
              <button onClick={() => setMenuSection('SHOP')} className="w-72 py-3 bg-yellow-900/30 border-y border-yellow-500/50 text-yellow-400 font-bold tracking-wide hover:bg-yellow-800/40">{t.SHOP}</button>
              <button onClick={() => setMenuSection('SETTINGS')} className="w-72 py-3 border-y border-white/20 text-white font-bold tracking-wide hover:bg-white/10">{t.OPTIONS}</button>
              <button onClick={() => setMenuSection('HIGHSCORES')} className="w-72 py-3 border-y border-white/20 text-white font-bold tracking-wide hover:bg-white/10">{t.HIGHSCORES}</button>
              <button onClick={() => setMenuSection('CREDITS')} className="w-72 py-3 border-y border-white/20 text-white font-bold tracking-wide hover:bg-white/10">{t.CREDITS}</button>
            </div>
          )}
        </div>
      )}
      
      {/* SHOP */}
      {menuSection === 'SHOP' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 text-white">
          <div className="w-full max-w-4xl p-8">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
               <h2 className="text-4xl text-[#facc15] font-black italic">{t.SHOP}</h2>
               <div className="text-right">
                  <div className="text-sm opacity-50">{t.SCRAP}</div>
                  <div className="text-3xl font-bold font-mono text-[#facc15]">{saveData.totalScrap.toString().padStart(6, '0')}</div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
               {Object.entries(UPGRADES_DEF).map(([key, def]) => {
                 const type = key as UpgradeType;
                 const lvl = saveData.upgrades[type] || 0;
                 const cost = def.cost(lvl);
                 const isMax = lvl >= def.max;
                 const canAfford = saveData.totalScrap >= cost;
                 
                 return (
                   <div key={key} className="bg-white/5 border border-white/10 p-4 rounded flex justify-between items-center hover:bg-white/10 transition-colors">
                      <div>
                        <div className="text-[#5de2ef] font-bold text-lg">{def.name}</div>
                        <div className="text-xs text-white/60 mb-2">{def.desc}</div>
                        <div className="flex gap-1">
                          {[...Array(def.max)].map((_, i) => (
                            <div key={i} className={`w-4 h-1 rounded-full ${i < lvl ? 'bg-[#facc15]' : 'bg-white/20'}`} />
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => buyUpgrade(type)}
                        disabled={isMax || !canAfford}
                        className={`px-4 py-2 font-bold text-sm min-w-[100px] border ${
                          isMax ? 'border-green-500 text-green-500 opacity-50' : 
                          canAfford ? 'bg-[#facc15] text-black border-[#facc15] hover:brightness-110' : 'border-white/20 text-white/20'
                        }`}
                      >
                        {isMax ? t.MAX : <>{t.COST}: {cost}<br/>{t.BUY}</>}
                      </button>
                   </div>
                 );
               })}
            </div>
            
            <div className="mt-8 text-center">
               <button onClick={() => setMenuSection('MAIN')} className="text-white/50 hover:text-white px-8 py-2">{t.BACK}</button>
            </div>
          </div>
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
              <label className="text-xs font-bold opacity-70">MUSIC VOLUME</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full accent-[#5de2ef]" value={settings.musicVolume} onChange={e => setSettings({...settings, musicVolume: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-xs font-bold opacity-70">SFX VOLUME</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full accent-[#5de2ef]" value={settings.sfxVolume} onChange={e => setSettings({...settings, sfxVolume: parseFloat(e.target.value)})} />
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
          <div className="text-3xl text-[#5de2ef] font-bold mb-4">{t.SCORE}: {score}</div>
          <div className="text-xl text-[#facc15] font-bold font-mono mb-12">{t.SCRAP} COLLECTED: {player.current.scrapCount}</div>
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
            <div className="flex items-center gap-2 mt-1">
               <div className="w-2 h-2 bg-[#facc15] rounded-full animate-pulse" />
               <div className="text-[#facc15] font-bold font-mono text-sm">{player.current.scrapCount}</div>
            </div>
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
